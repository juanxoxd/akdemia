import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Exam, ExamAttempt, Answer } from '@omr/database';
import { S3Service } from '../infrastructure/storage/s3.service';
import {
  MINIO_CONSTANTS,
  ProcessingStatus,
  ExamStatus,
  AnswerStatus,
} from '@omr/shared-types';
import { DetectedAnswerDto } from './dto/processing.dto';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    private readonly s3Service: S3Service,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
  ) {}

  /**
   * Generar URL presignada para subir imágenes directamente a S3
   */
  async getUploadUrl(
    examId: string,
    fileName: string,
    fileType: string,
    purpose: 'answer-key' | 'student-answer',
    studentId?: string,
  ) {
    let key: string;
    const timestamp = Date.now();

    if (purpose === 'answer-key') {
      key = `${MINIO_CONSTANTS.ANSWER_KEYS_PREFIX}/${examId}/${timestamp}-${fileName}`;
    } else {
      if (!studentId) {
        throw new BadRequestException('Student ID requerido para subir respuesta de estudiante');
      }
      key = `${MINIO_CONSTANTS.STUDENT_ANSWERS_PREFIX}/${examId}/${studentId}/${timestamp}-${fileName}`;
    }

    const url = await this.s3Service.getPresignedUploadUrl(key, fileType);

    this.logger.log(`Generada URL de subida para ${purpose} - Examen: ${examId} - Key: ${key}`);

    return {
      uploadUrl: url,
      key: key,
      expiresIn: 3600,
    };
  }

  /**
   * Guardar Answer Key enviado por el Frontend (ya procesado)
   */
  async submitAnswerKeyScan(
    examId: string,
    imageKey: string,
    answers: DetectedAnswerDto[],
    _totalQuestions: number,
  ) {
    this.logger.log(`Guardando Answer Key para examen ${examId}`);

    const exam = await this.examRepository.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Convertir DetectedAnswerDto a formato de almacenamiento
    // { answers: [{ questionNumber, correctOption, confidenceScore }] }
    // Asumimos que el front manda la respuesta CORRECTA detectada en la hoja maestra
    const formattedAnswers = answers.map((a) => ({
      questionNumber: a.questionNumber,
      correctOption: a.selectedOption, // La opción detectada en el master es la correcta
      confidenceScore: a.confidenceScore || 1.0,
    }));

    // Verificar si la imagen existe en S3 (validación básica)
    const fileExists = await this.s3Service.fileExists(imageKey);
    if (!fileExists) {
        this.logger.warn(`La imagen ${imageKey} no fue encontrada en S3 al guardar answer key`);
    }

    // Actualizar Examen
    exam.answerKey = { answers: formattedAnswers };
    exam.answerKeyProcessedAt = new Date();
    exam.status = ExamStatus.ACTIVE; // Ya está listo para usarse
    // Opcional: Guardar referencia a la imagen del answer key si el esquema lo permite
    // exam.answerKeyImageUrl = imageKey; 

    await this.examRepository.save(exam);

    this.logger.log(`Answer Key guardado exitosamente para examen ${examId}`);

    return {
      success: true,
      examId,
      message: 'Answer Key guardado y examen activado',
    };
  }

  /**
   * Procesar respuesta de estudiante enviada por el Frontend
   * - Validar contra Answer Key
   * - Calcular nota
   * - Guardar
   */
  async submitStudentScan(
    examId: string,
    studentId: string,
    imageKey: string,
    answers: DetectedAnswerDto[],
    _totalQuestions: number,
  ) {
    this.logger.log(`Procesando scan de estudiante ${studentId} para examen ${examId}`);

    // 1. Obtener Examen y Answer Key
    const exam = await this.examRepository.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (!exam.answerKey || !exam.answerKey.answers) {
      throw new BadRequestException('El examen no tiene Answer Key configurado');
    }

    // 2. Buscar o Crear Attempt
    let attempt = await this.attemptRepository.findOne({
      where: { examId, studentId },
    });

    if (!attempt) {
      attempt = this.attemptRepository.create({
        examId,
        studentId,
        status: ProcessingStatus.PENDING,
      });
    }

    // 3. Procesar Calificación
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalBlank = 0;
    let needsReview = false;

    // Mapa para búsqueda rápida de respuestas correctas
    // key: questionNumber, value: correctOption
    const answerKeyMap = new Map<number, number>();
    exam.answerKey.answers.forEach((a: any) => {
        if (a.correctOption !== null && a.correctOption !== undefined) {
            answerKeyMap.set(a.questionNumber, a.correctOption);
        }
    });

    // Validar imagen
    // Guardamos el KEY en lugar de la URL completa para facilitar la generación de URLs firmadas posteriormente
    // const imageUrl = await this.s3Service.getFileUrl(imageKey); 
    
    // Preparar entidades Answer
    const answerEntities: Answer[] = [];

    for (const detected of answers) {
      const correctOption = answerKeyMap.get(detected.questionNumber);
      let isCorrect = false;
      let status = AnswerStatus.DETECTED;

      // Lógica de calificación
      if (detected.selectedOption === null || detected.selectedOption === undefined) {
        totalBlank++;
        status = AnswerStatus.BLANK;
      } else if (correctOption !== undefined && detected.selectedOption === correctOption) {
        totalCorrect++;
        isCorrect = true;
      } else {
        totalIncorrect++;
      }

      // Detectar necesidad de revisión
      // Si la confianza es baja (ej. < 0.8) o si el front marcó ambigüedad (no soportado en DTO simple aún, pero preparamos lógica)
      if (detected.confidenceScore && detected.confidenceScore < 0.8) {
          status = AnswerStatus.AMBIGUOUS;
          needsReview = true;
      }

      answerEntities.push(
        this.answerRepository.create({
          attemptId: attempt.id, // Se asignará tras guardar attempt si es nuevo (pero TypeORM maneja cascades si configurado, aquí lo haremos secuencial)
          questionNumber: detected.questionNumber,
          selectedOption: detected.selectedOption ?? undefined,
          isCorrect,
          confidenceScore: detected.confidenceScore || 1.0,
          status,
        })
      );
    }

    // Calcular Score (Simple: 1 punto por correcta, o proporcional)
    // Asumiremos que score es simplemente número de correctas por ahora, o sobre 20
    // Si queremos sobre 20: (correctas / totalQuestions) * 20
    const rawScore = totalCorrect; 
    
    // 4. Actualizar Attempt
    attempt.imageUrl = imageKey; // GUARDAMOS EL KEY DIRECTAMENTE
    
    attempt.score = rawScore;
    attempt.totalCorrect = totalCorrect;
    attempt.totalIncorrect = totalIncorrect;
    attempt.totalBlank = totalBlank;
    attempt.confidenceScore = 1.0; // Del proceso general
    attempt.status = needsReview ? ProcessingStatus.NEEDS_REVIEW : ProcessingStatus.COMPLETED;
    attempt.processedAt = new Date();

    const savedAttempt = await this.attemptRepository.save(attempt);

    // 5. Guardar Respuestas
    // Borrar anteriores si es reintento
    await this.answerRepository.delete({ attemptId: savedAttempt.id });
    
    // Asignar ID actualizado
    answerEntities.forEach(a => a.attemptId = savedAttempt.id);
    await this.answerRepository.save(answerEntities);

    this.logger.log(`Scan procesado para estudiante ${studentId}. Score: ${rawScore}. Status: ${attempt.status}`);

    return {
      attemptId: savedAttempt.id,
      status: attempt.status,
      score: rawScore,
      totalCorrect,
      message: needsReview 
        ? 'Procesado con advertencias (requiere revisión)' 
        : 'Procesado exitosamente',
    };
  }

  /**
   * Obtener URL temporal para ver la imagen del examen
   */
  async getAttemptImage(attemptId: string) {
      const attempt = await this.attemptRepository.findOne({ where: { id: attemptId } });
      if (!attempt) throw new NotFoundException('Attempt not found');

      // Ahora attempt.imageUrl contiene el KEY directamente
      const key = attempt.imageUrl;
      
      try {
        const url = await this.s3Service.getPresignedUrl(key);
        return { url };
      } catch (e: any) {
          this.logger.error(`Error generando presigned url para key ${key}: ${e.message}`);
          throw new NotFoundException('No se pudo generar la imagen');
      }
  }

  // --- Métodos de Lectura (Queries) ---

  async getProcessingStatus(attemptId: string) {
    const attempt = await this.attemptRepository.findOne({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }

  async getProcessingResult(examId: string, studentId: string) {
    const attempt = await this.attemptRepository.findOne({
      where: { examId, studentId },
      relations: ['student'],
    });

    if (!attempt) throw new NotFoundException('Result not found');

    const answers = await this.answerRepository.find({
      where: { attemptId: attempt.id },
      order: { questionNumber: 'ASC' },
    });

    return {
      ...attempt,
      answers: answers.map((a: Answer) => ({
        questionNumber: a.questionNumber,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
      })),
    };
  }

  async getExamResults(examId: string, page: number, limit: number, sortOrder: 'ASC' | 'DESC') {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { examId, status: ProcessingStatus.COMPLETED },
      order: { score: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['student'],
    });

    const results = await Promise.all(
      attempts.map(async (attempt) => {
        let imageUrl: string | null = null;
        if (attempt.imageUrl) {
          try {
             // Reutilizamos lógica de presigned simple
             let key = attempt.imageUrl;
             const bucketUrlPart = `${MINIO_CONSTANTS.DEFAULT_BUCKET}/`;
             if (key.includes(bucketUrlPart)) {
               key = key.split(bucketUrlPart)[1];
             }
             imageUrl = await this.s3Service.getPresignedUrl(key);
          } catch (e: any) {
             this.logger.warn(`No se pudo firmar URL para attempt ${attempt.id}`);
          }
        }

        return {
          attemptId: attempt.id,
          student: attempt.student, // Asumimos que incluimos datos del estudiante
          score: attempt.score,
          totalCorrect: attempt.totalCorrect,
          totalIncorrect: attempt.totalIncorrect,
          totalBlank: attempt.totalBlank,
          processedAt: attempt.processedAt,
          imageUrl: imageUrl, // Evidencia
        };
      }),
    );

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
