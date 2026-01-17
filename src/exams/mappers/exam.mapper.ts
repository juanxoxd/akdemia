import { Exam } from '@omr/database';
import { ExamModel } from '../domain/exam.model';
import { CreateExamDto } from '../dto/create-exam.dto';
import { ExamResponseDto } from '../dto/exam-response.dto';
import { UpdateExamDto } from '../dto/update-exam.dto';
import { ExamStatus } from '@omr/shared-types';

export class ExamMapper {
  static toDomain(entity: Exam): ExamModel {
    return new ExamModel({
      id: entity.id,
      title: entity.title,
      description: entity.description,
      totalQuestions: entity.totalQuestions,
      answersPerQuestion: entity.answersPerQuestion,
      examDate: entity.examDate,
      status: entity.status,
      answerKey: entity.answerKey,
      answerKeyImageUrl: entity.answerKeyImageUrl,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toCreatePersistence(dto: CreateExamDto): Partial<Exam> {
    return {
      title: dto.examTitle,
      description: dto.description,
      totalQuestions: dto.totalQuestions,
      answersPerQuestion: dto.answersPerQuestion,
      examDate: dto.examDate ? new Date(dto.examDate) : new Date(),
      status: ExamStatus.ACTIVE, // Exam is active immediately as it has answers
      answerKey: {
        answers: dto.answers.map(a => ({
          questionNumber: a.questionNumber,
          correctOption: a.correctOption,
          confidenceScore: 1.0 // Manual entry implies 100% confidence
        }))
      },
      answerKeyProcessedAt: new Date(),
      answerKeyConfidence: 1.0
    };
  }

  static toUpdatePersistence(dto: UpdateExamDto): Partial<Exam> {
    const partial: Partial<Exam> = {};
    if (dto.examTitle) partial.title = dto.examTitle;
    if (dto.description) partial.description = dto.description;
    if (dto.totalQuestions) partial.totalQuestions = dto.totalQuestions;
    if (dto.answersPerQuestion) partial.answersPerQuestion = dto.answersPerQuestion;
    if (dto.examDate) partial.examDate = new Date(dto.examDate);
    return partial;
  }

  static toPresentation(domain: ExamModel): ExamResponseDto {
    const dto = new ExamResponseDto();
    dto.id = domain.id;
    dto.title = domain.title;
    dto.description = domain.description;
    dto.totalQuestions = domain.totalQuestions;
    dto.answersPerQuestion = domain.answersPerQuestion;
    dto.examDate = domain.examDate instanceof Date ? domain.examDate.toISOString().split('T')[0] : String(domain.examDate);
    dto.status = domain.status;
    dto.createdAt = domain.createdAt instanceof Date ? domain.createdAt.toISOString() : String(domain.createdAt);
    dto.updatedAt = domain.updatedAt instanceof Date ? domain.updatedAt.toISOString() : String(domain.updatedAt);
    // Map answer key info if needed or leave out restricted fields
    return dto;
  }
}
