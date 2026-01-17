import { Answer } from '@omr/database';
import { AnswerModel } from '../domain/answer.model';

export class AnswerMapper {
  static toDomain(entity: Answer): AnswerModel {
    return new AnswerModel({
      id: entity.id,
      attemptId: entity.attemptId,
      questionNumber: entity.questionNumber,
      selectedOption: entity.selectedOption,
      isCorrect: entity.isCorrect,
      confidenceScore: entity.confidenceScore,
      status: entity.status,
    });
  }

  static toPresentation(domain: AnswerModel): any {
    return {
      q: domain.questionNumber,
      o: domain.selectedOption,
      s: domain.isCorrect,
    };
  }
}
