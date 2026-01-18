import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam, ExamAttempt, Answer } from '@omr/database';
import { Student } from '../database/entities/student.entity';
import { CqrsModule } from '@nestjs/cqrs';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { UploadExamStudentsCommandHandler } from './application/commands/upload-exam-students.command';
import { UploadExamStudentsSubscriber } from './application/events/upload-exam-students.subscriber';
import { ExcelAdapter } from '../infrastructure/adapters/excel.adapter';
import { RedisRepository } from '../shared/interfaces/redis.repository.port';
import { RedisRepositoryAdapter } from '../infrastructure/adapters/redis.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Exam, ExamAttempt, Answer, Student]),
  ],
  controllers: [ExamsController],
  providers: [
    ExamsService,
    UploadExamStudentsCommandHandler,
    UploadExamStudentsSubscriber,
    {
      provide: ExcelAdapter,
      useClass: ExcelAdapter,
    },
    {
      provide: RedisRepository,
      useClass: RedisRepositoryAdapter,
    },
  ],
  exports: [ExamsService],
})
export class ExamsModule {}

