import { ProcessingStatus } from '@omr/shared-types';
import { StudentModel } from '../../students/domain/student.model';
import { AnswerModel } from './answer.model';

export class ExamAttemptModel {
  id: string;
  examId: string;
  studentId: string;
  student?: StudentModel;
  imageUrl: string;
  processedImageUrl?: string;
  status: ProcessingStatus;
  processedAt?: Date;
  score?: number;
  totalCorrect?: number;
  totalIncorrect?: number;
  totalBlank?: number;
  confidenceScore?: number;
  clientScore?: number;
  answers?: AnswerModel[];
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ExamAttemptModel>) {
    Object.assign(this, partial);
  }
}
