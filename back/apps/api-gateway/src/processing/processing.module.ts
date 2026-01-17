import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam, ExamAttempt, Answer } from '@omr/database';
import { ProcessingController } from './processing.controller';
import { ProcessingService } from './processing.service';
import { S3Module } from '../infrastructure/storage/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, ExamAttempt, Answer]),
    S3Module,
  ],
  controllers: [ProcessingController],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
