import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { HealthModule } from './health/health.module';
import { ExamsModule } from './exams/exams.module';
import { StudentsModule } from './students/students.module';
import { ProcessingModule } from './processing/processing.module';
import { S3Module } from './infrastructure/storage/s3.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { Exam, Student, ExamAttempt, Answer, ProcessingLog } from '@omr/database';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [Exam, Student, ExamAttempt, Answer, ProcessingLog],
        synchronize: true,
        logging: configService.get<boolean>('database.logging'),
      }),
      inject: [ConfigService],
    }),
    TerminusModule,
    S3Module,
    HealthModule,
    ExamsModule,
    StudentsModule,
    ProcessingModule,
  ],
})
export class AppModule {}
