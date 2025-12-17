import { Module, Global } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '@omr/shared-types';
import { OMR_QUEUE_CLIENT } from './constants';
import { RabbitMQService } from './rabbitmq.service';
import { ResultsConsumer } from './results.consumer';

// Re-export para compatibilidad
export { OMR_QUEUE_CLIENT } from './constants';

@Global()
@Module({
  providers: [
    {
      provide: OMR_QUEUE_CLIENT,
      useFactory: (configService: ConfigService) => {
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: QUEUE_NAMES.OMR_PROCESSING,
            queueOptions: {
              durable: true,
            },
          },
        });
      },
      inject: [ConfigService],
    },
    RabbitMQService,
    ResultsConsumer,
  ],
  exports: [OMR_QUEUE_CLIENT, RabbitMQService],
})
export class RabbitMQModule {}
