import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../infrastructure/storage/s3.service';
import {
  RabbitMQService,
  ProcessStudentAnswerMessage,
} from '../infrastructure/queue/rabbitmq.service';
import {
  MINIO_CONSTANTS,
  PROCESSING_MESSAGES,
  ProcessingStatus,
  PROCESSING_CONSTANTS,
} from '@omr/shared-types';

interface AnswerKeyProcessingResult {
  success: boolean;
  detected_answers: Array<{
    question_number: number;
    selected_option: number | null;
    selected_option_label: string | null;
    confidence_score: number;
    status: string;
  }>;
  confidence_score: number;
  quality_score: number;
  quality_level: string;
  processing_time_ms: number;
  warnings: string[];
}

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);
  private readonly omrProcessorUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    this.omrProcessorUrl = this.configService.get<string>(
      'OMR_PROCESSOR_URL',
      'http://localhost:8000',
    );
  }

  /**
   * FLUJO 1: Procesar Answer Key - HTTP SÍNCRONO
   * Cliente -> NestJS -> FastAPI (síncrono) -> respuesta inmediata
   */
  async processAnswerKey(
    examId: string,
    file: Express.Multer.File,
    totalQuestions: number,
    optionsPerQuestion: number = 5,
  ) {
    this.logger.log(`Procesando answer key para examen ${examId}`);

    // 1. Subir imagen a S3/MinIO
    const key = `${MINIO_CONSTANTS.ANSWER_KEYS_PREFIX}/${examId}/${Date.now()}-${file.originalname}`;
    const uploadResult = await this.s3Service.uploadFile(file, key);
    this.logger.log(`Answer key subido a ${uploadResult.url}`);

    // 2. Llamada HTTP SÍNCRONA a FastAPI OMR Service
    try {
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('file', blob, file.originalname);
      formData.append('exam_id', examId);
      formData.append('total_questions', totalQuestions.toString());
      formData.append('options_per_question', optionsPerQuestion.toString());

      const response = await fetch(`${this.omrProcessorUrl}/api/processing/answer-key`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { detail?: string };
        throw new HttpException(errorData.detail || 'Error procesando answer key', response.status);
      }

      const result = (await response.json()) as AnswerKeyProcessingResult;

      // 4. Validar confidence score (debe ser >95%)
      const minConfidence = PROCESSING_CONSTANTS.MIN_CONFIDENCE_SCORE;
      if (result.confidence_score < minConfidence) {
        return {
          success: false,
          examId,
          imageUrl: uploadResult.url,
          status: ProcessingStatus.NEEDS_REVIEW,
          message: `Confidence score (${(result.confidence_score * 100).toFixed(1)}%) es menor al mínimo requerido (${minConfidence * 100}%). Por favor, suba una imagen de mejor calidad.`,
          detectedAnswers: result.detected_answers,
          confidenceScore: result.confidence_score,
          qualityScore: result.quality_score,
          qualityLevel: result.quality_level,
          warnings: result.warnings,
          needsReview: true,
        };
      }

      // 5. Log formatted answers for debugging
      this.logger.log('═'.repeat(70));
      this.logger.log(`ANSWER KEY PROCESADO - Examen: ${examId}`);
      this.logger.log('═'.repeat(70));

      // Format answers in groups of 10
      const answersPerRow = 10;
      for (let i = 0; i < result.detected_answers.length; i += answersPerRow) {
        const rowAnswers = result.detected_answers.slice(i, i + answersPerRow);
        const formatted = rowAnswers
          .map(a => `${a.question_number}:${a.selected_option_label || '-'}`)
          .join(' | ');
        this.logger.log(formatted);
      }

      this.logger.log('═'.repeat(70));
      this.logger.log(
        `Total: ${result.detected_answers.length} respuestas | ` +
          `Confidence: ${(result.confidence_score * 100).toFixed(1)}% | ` +
          `Time: ${result.processing_time_ms}ms`,
      );
      this.logger.log('═'.repeat(70));

      // 6. Responder con preview para confirmación del docente
      return {
        success: true,
        examId,
        imageUrl: uploadResult.url,
        status: ProcessingStatus.COMPLETED,
        message: PROCESSING_MESSAGES.ANSWER_KEY_PROCESSED,
        detectedAnswers: result.detected_answers,
        confidenceScore: result.confidence_score,
        qualityScore: result.quality_score,
        qualityLevel: result.quality_level,
        processingTimeMs: result.processing_time_ms,
        warnings: result.warnings,
        needsReview: false,
        // Matriz de respuestas para guardar
        answerMatrix: result.detected_answers.map(a => a.selected_option),
      };
    } catch (error) {
      this.logger.error(`Error procesando answer key: ${error}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'No se pudo conectar con el servicio de procesamiento OMR',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Confirmar Answer Key después de revisión del docente
   */
  async confirmAnswerKey(examId: string, confirmedAnswers?: number[][]) {
    this.logger.log(`Confirmando answer key para examen ${examId}`);

    // TODO: Guardar en base de datos el answerKey confirmado
    return {
      examId,
      confirmed: true,
      message: 'Answer key confirmado exitosamente',
      answerKey: confirmedAnswers,
    };
  }

  /**
   * FLUJO 2: Procesar Respuesta de Estudiante - ASÍNCRONO con RabbitMQ
   * Cliente -> NestJS -> S3 -> RabbitMQ (cola) -> FastAPI consume -> resultado
   */
  async submitStudentAnswer(
    examId: string,
    studentId: string,
    file: Express.Multer.File,
    answerKey: number[][],
    totalQuestions: number,
    optionsPerQuestion: number = 5,
  ) {
    this.logger.log(`Enviando respuesta de estudiante ${studentId} para examen ${examId}`);

    // 1. Validar archivo
    if (!file || !file.buffer) {
      throw new BadRequestException('No se proporcionó archivo');
    }

    // 2. Generar attemptId único
    const attemptId = crypto.randomUUID();

    // 3. Subir imagen a S3/MinIO
    const key = `${MINIO_CONSTANTS.STUDENT_ANSWERS_PREFIX}/${examId}/${studentId}/${attemptId}-${file.originalname}`;
    const uploadResult = await this.s3Service.uploadFile(file, key);
    this.logger.log(`Respuesta de estudiante subida a ${uploadResult.url}`);

    // 4. Encolar mensaje en RabbitMQ para procesamiento ASÍNCRONO
    const message: ProcessStudentAnswerMessage = {
      attemptId,
      examId,
      studentId,
      imageUrl: uploadResult.url,
      answerKey,
      totalQuestions,
      optionsPerQuestion,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.rabbitMQService.queueStudentAnswerProcessing(message);
      this.logger.log(`Mensaje encolado para procesamiento: ${attemptId}`);
    } catch (error) {
      this.logger.error(`Error encolando mensaje: ${error}`);
      // Si falla el encolado, aún así retornamos el attemptId
      // El procesamiento se puede reintentar manualmente
    }

    // 5. Responder inmediatamente (no bloqueamos al cliente)
    return {
      attemptId,
      examId,
      studentId,
      imageUrl: uploadResult.url,
      status: ProcessingStatus.PENDING,
      message: PROCESSING_MESSAGES.STARTED,
      estimatedProcessingTime: '5-10 segundos',
    };
  }

  /**
   * Consultar estado de procesamiento
   */
  async getProcessingStatus(attemptId: string) {
    this.logger.log(`Consultando estado para attempt ${attemptId}`);

    // TODO: Consultar estado en base de datos
    return {
      attemptId,
      status: ProcessingStatus.PENDING,
      progress: 0,
      message: 'En cola de procesamiento',
    };
  }

  /**
   * Obtener resultado de procesamiento
   */
  async getProcessingResult(examId: string, studentId: string) {
    this.logger.log(`Obteniendo resultado para estudiante ${studentId} en examen ${examId}`);

    // TODO: Consultar resultado en base de datos
    return {
      examId,
      studentId,
      status: ProcessingStatus.PENDING,
      message: 'Resultado no disponible aún',
    };
  }
}
