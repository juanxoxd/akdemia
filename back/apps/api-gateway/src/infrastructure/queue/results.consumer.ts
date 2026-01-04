import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, ProcessingStatus, AnswerStatus } from '@omr/shared-types';
import { ExamAttempt, Answer } from '@omr/database';

export interface ProcessingResult {
  attemptId: string;
  examId: string;
  studentId: string;
  success: boolean;
  score?: number;
  totalCorrect?: number;
  totalIncorrect?: number;
  totalBlank?: number;
  totalQuestions?: number;
  percentage?: number;
  confidenceScore?: number;
  answers?: Array<{
    questionNumber: number;
    selectedOption: number | null;
    correctOption: number;
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
export class ResultsConsumer implements OnModuleInit {
  private readonly logger = new Logger(ResultsConsumer.name);
  private connection: any = null;
  private channel: any = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
  ) {}

  async onModuleInit() {
    // Iniciar conexión en background para no bloquear el startup
    this.connect().catch((err) => {
      this.logger.warn(`No se pudo conectar a RabbitMQ al inicio: ${err.message}`);
    });
  }

  private async connect(): Promise<void> {
    try {
      // Dynamic import para evitar problemas si amqplib no está disponible
      const amqp = await import('amqplib');
      
      const rabbitmqUrl = this.configService.get<string>(
        'RABBITMQ_URL',
        'amqp://guest:guest@localhost:5672',
      );

      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declarar cola de resultados
      await this.channel.assertQueue(QUEUE_NAMES.OMR_RESULTS, {
        durable: true,
      });

      this.logger.log(`✅ Conectado a RabbitMQ - Escuchando: ${QUEUE_NAMES.OMR_RESULTS}`);

      // Consumir mensajes
      await this.channel.consume(
        QUEUE_NAMES.OMR_RESULTS,
        async (msg: any) => {
          if (msg) {
            try {
              const result: ProcessingResult = JSON.parse(msg.content.toString());
              await this.handleResult(result);
              this.channel?.ack(msg);
            } catch (error) {
              this.logger.error(`Error procesando mensaje: ${error}`);
              // Rechazar mensaje y reencolar
              this.channel?.nack(msg, false, true);
            }
          }
        },
        { noAck: false },
      );
    } catch (error: any) {
      this.logger.warn(`⚠️ No se pudo conectar a RabbitMQ: ${error.message}`);
      // Reintentar conexión en 5 segundos
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async handleResult(result: ProcessingResult): Promise<void> {
    this.logger.log(`📥 Resultado recibido para attempt: ${result.attemptId}`);

    try {
      if (result.success) {
        this.logger.log(
          `✅ Procesamiento exitoso - Score: ${result.score}/${result.totalQuestions} (${result.percentage}%)`,
        );

        // Actualizar ExamAttempt en PostgreSQL
        await this.attemptRepository.update(result.attemptId, {
          status: ProcessingStatus.COMPLETED,
          score: result.score,
          totalCorrect: result.totalCorrect,
          totalIncorrect: result.totalIncorrect,
          totalBlank: result.totalBlank,
          confidenceScore: result.confidenceScore,
          processedAt: new Date(result.processedAt),
        });

        this.logger.log(`📊 Attempt ${result.attemptId} actualizado con score=${result.score}`);

        // Guardar respuestas individuales en Answer entities
        if (result.answers && result.answers.length > 0) {
          // Eliminar respuestas anteriores si existen (para reintentos)
          await this.answerRepository.delete({ attemptId: result.attemptId });

          for (const answerData of result.answers) {
            const answer = this.answerRepository.create({
              attemptId: result.attemptId,
              questionNumber: answerData.questionNumber,
              selectedOption: answerData.selectedOption ?? undefined,
              isCorrect: answerData.isCorrect,
              confidenceScore: answerData.confidenceScore,
              status: answerData.status as AnswerStatus,
            });
            await this.answerRepository.save(answer);
          }

          this.logger.log(`📝 ${result.answers.length} respuestas guardadas para attempt ${result.attemptId}`);
        }
      } else {
        this.logger.error(
          `❌ Procesamiento fallido - Error: ${result.error?.code} - ${result.error?.message}`,
        );

        // Actualizar status a FAILED
        await this.attemptRepository.update(result.attemptId, {
          status: ProcessingStatus.FAILED,
        });

        this.logger.log(`⚠️ Attempt ${result.attemptId} marcado como FAILED`);
      }

      this.logger.log(`✅ Resultado persistido para attempt: ${result.attemptId}`);
    } catch (error) {
      this.logger.error(`❌ Error persistiendo resultado para attempt ${result.attemptId}:`, error);
      throw error; // Re-throw para que el mensaje se reencole
    }
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
    this.logger.log('Desconectado de RabbitMQ');
  }
}
