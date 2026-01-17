import { AnswerStatus } from '@omr/shared-types';

export class AnswerModel {
  id: string;
  attemptId: string;
  questionNumber: number;
  selectedOption?: number;
  isCorrect?: boolean;
  confidenceScore: number;
  status: AnswerStatus;

  constructor(partial: Partial<AnswerModel>) {
    Object.assign(this, partial);
  }
}
