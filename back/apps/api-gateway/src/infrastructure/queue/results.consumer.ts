import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '@omr/shared-types';

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

  constructor(private readonly configService: ConfigService) {}

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

    if (result.success) {
      this.logger.log(
        `✅ Procesamiento exitoso - Score: ${result.score}/${result.totalQuestions} (${result.percentage}%)`,
      );

      // TODO: Actualizar ExamAttempt en PostgreSQL
      // await this.examAttemptRepository.update(result.attemptId, {
      //   status: 'COMPLETED',
      //   score: result.score,
      //   totalCorrect: result.totalCorrect,
      //   totalIncorrect: result.totalIncorrect,
      //   totalBlank: result.totalBlank,
      //   confidenceScore: result.confidenceScore,
      //   processedAt: new Date(result.processedAt),
      // });

      // TODO: Guardar respuestas individuales en Answer entities
      // for (const answer of result.answers || []) {
      //   await this.answerRepository.create({
      //     attemptId: result.attemptId,
      //     questionNumber: answer.questionNumber,
      //     selectedOption: answer.selectedOption,
      //     correctOption: answer.correctOption,
      //     isCorrect: answer.isCorrect,
      //     status: answer.status,
      //     confidenceScore: answer.confidenceScore,
      //   });
      // }

      // TODO: Cache en Redis para consultas rápidas
      // await this.redisService.set(
      //   `result:${result.examId}:${result.studentId}`,
      //   JSON.stringify(result),
      //   3600, // TTL 1 hora
      // );
    } else {
      this.logger.error(
        `❌ Procesamiento fallido - Error: ${result.error?.code} - ${result.error?.message}`,
      );

      // TODO: Actualizar status a FAILED
      // await this.examAttemptRepository.update(result.attemptId, {
      //   status: 'FAILED',
      //   errorCode: result.error?.code,
      //   errorMessage: result.error?.message,
      // });
    }

    this.logger.log(`📝 Resultado procesado para attempt: ${result.attemptId}`);
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
    this.logger.log('Desconectado de RabbitMQ');
  }
}
