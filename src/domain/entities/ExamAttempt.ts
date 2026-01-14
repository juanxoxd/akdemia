import { Answer } from './Answer';

export type AttemptStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PENDING_REVIEW';

export interface ExamAttempt {
  attemptId: string;
  status: AttemptStatus;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  totalCorrect?: number;
  totalIncorrect?: number;
  totalBlank?: number;
  confidenceScore?: number;
  answers?: Answer[];
  processedAt?: string;
  imageUrl?: string;
}

export interface SubmitAttemptResponse {
  attemptId: string;
  status: 'PENDING';
  message: string;
}
