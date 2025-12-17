import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthModule } from './health/health.module';
import { ExamsModule } from './exams/exams.module';
import { StudentsModule } from './students/students.module';
import { ProcessingModule } from './processing/processing.module';
import { S3Module } from './infrastructure/storage/s3.module';
import { RabbitMQModule } from './infrastructure/queue/rabbitmq.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    TerminusModule,
    S3Module,
    RabbitMQModule,
    HealthModule,
    ExamsModule,
    StudentsModule,
    ProcessingModule,
  ],
})
export class AppModule {}
