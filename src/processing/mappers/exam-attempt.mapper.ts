import { ExamAttempt } from '@omr/database';
import { ExamAttemptModel } from '../domain/exam-attempt.model';
import { StudentMapper } from '../../students/mappers/student.mapper';
import { AnswerMapper } from './answer.mapper';

export class ExamAttemptMapper {
  static toDomain(entity: ExamAttempt): ExamAttemptModel {
    return new ExamAttemptModel({
      id: entity.id,
      examId: entity.examId,
      studentId: entity.studentId,
      student: entity.student ? StudentMapper.toDomain(entity.student) : undefined,
      imageUrl: entity.imageUrl,
      processedImageUrl: entity.processedImageUrl,
      status: entity.status,
      processedAt: entity.processedAt,
      score: entity.score,
      totalCorrect: entity.totalCorrect,
      totalIncorrect: entity.totalIncorrect,
      totalBlank: entity.totalBlank,
      confidenceScore: entity.confidenceScore,
      answers: entity.answers ? entity.answers.map(a => AnswerMapper.toDomain(a)) : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  // toCreatePersistence is usually handled directly by service logic (create object with IDs), 
  // but if we had a domain object to save, we'd map it back.
  // Implementing dummy/partial here as required by pattern:
  static toPersistence(domain: ExamAttemptModel): Partial<ExamAttempt> {
      return {
          id: domain.id,
          examId: domain.examId,
          studentId: domain.studentId,
          imageUrl: domain.imageUrl,
          status: domain.status,
          score: domain.score,
          totalCorrect: domain.totalCorrect,
            // ... other fields
      };
  }

  // Presentation logic for Attempt is currently custom JSON in controller, 
  // but we can standardize it here if we had a generic AttemptResponseDto.
  // For now leaving as TODO or implementing a generic structure.
  static toPresentation(domain: ExamAttemptModel, signedImageUrl?: string): any {
      return {
          attemptId: domain.id,
          status: domain.status,
          score: domain.score,
          clientScore: domain.clientScore, // Frontend's score
          totalCorrect: domain.totalCorrect,
          imageUrl: signedImageUrl || domain.imageUrl, // Use signed URL if provided, else fallback (e.g. key)
          student: domain.student ? StudentMapper.toPresentation(domain.student) : undefined,
          answers: domain.answers ? domain.answers.map(a => AnswerMapper.toPresentation(a)) : undefined
      };
  }
}
