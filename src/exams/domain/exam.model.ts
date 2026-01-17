import { ExamStatus } from '@omr/shared-types';

export class ExamModel {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  answersPerQuestion: number;
  examDate: Date;
  status: ExamStatus;
  answerKey?: {
    answers: Array<{
      questionNumber: number;
      correctOption: number;
      confidenceScore: number;
    }>;
  };
  answerKeyImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ExamModel>) {
    Object.assign(this, partial);
  }
}
