import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { OMR_QUEUE_CLIENT } from './constants';
import { ROUTING_KEYS } from '@omr/shared-types';

export interface ProcessStudentAnswerMessage {
  attemptId: string;
  examId: string;
  studentId: string;
  imageUrl: string;
  answerKey: number[][];
  totalQuestions: number;
  optionsPerQuestion: number;
  timestamp: string;
}

export interface ProcessingResultMessage {
  attemptId: string;
  examId: string;
  studentId: string;
  success: boolean;
  score?: number;
  totalCorrect?: number;
  totalIncorrect?: number;
  totalBlank?: number;
  confidenceScore?: number;
  answers?: Array<{
    questionNumber: number;
    selectedOption?: number;
    isCorrect: boolean;
    status: string;
    confidenceScore: number;
  }>;
  error?: {
    code: string;
    message: string;
  };
  processedAt: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(
    @Inject(OMR_QUEUE_CLIENT) private readonly client: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Conectado a RabbitMQ');
    } catch (error) {
      this.logger.warn('No se pudo conectar a RabbitMQ (se reintentará automáticamente)');
    }
  }

  /**
   * Encola un mensaje para procesar respuesta de estudiante (async)
   */
  async queueStudentAnswerProcessing(message: ProcessStudentAnswerMessage): Promise<void> {
    this.logger.log(`Encolando procesamiento para attempt: ${message.attemptId}`);

    await firstValueFrom(
      this.client.emit(ROUTING_KEYS.STUDENT_ANSWER_UPLOADED, message).pipe(
        timeout(5000),
        catchError(err => {
          this.logger.error(`Error encolando mensaje: ${err.message}`);
          throw err;
        }),
      ),
    );

    this.logger.log(`Mensaje encolado exitosamente: ${message.attemptId}`);
  }

  /**
   * Publica resultado de procesamiento
   */
  async publishProcessingResult(result: ProcessingResultMessage): Promise<void> {
    const routingKey = result.success
      ? ROUTING_KEYS.STUDENT_ANSWER_PROCESSED
      : ROUTING_KEYS.STUDENT_ANSWER_FAILED;

    await firstValueFrom(
      this.client.emit(routingKey, result).pipe(
        timeout(5000),
        catchError(err => {
          this.logger.error(`Error publicando resultado: ${err.message}`);
          throw err;
        }),
      ),
    );
  }

  /**
   * Health check de RabbitMQ
   */
  async isHealthy(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.client.emit('health-check', { timestamp: new Date().toISOString() }).pipe(
          timeout(3000),
          catchError(() => of(false)),
        ),
      );
      return true;
    } catch {
      return false;
    }
  }
}
