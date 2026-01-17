// ============================================
// Exam DTOs
// ============================================

export interface CreateExamDto {
  examTitle: string;
  description?: string;
  totalQuestions: number;
  answersPerQuestion: number;
  examDate: string;
}

export interface UpdateExamDto {
  examTitle?: string;
  description?: string;
  totalQuestions?: number;
  answersPerQuestion?: number;
  examDate?: string;
}

export interface ExamResponseDto {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  answersPerQuestion: number;
  examDate: string;
  status: string;
  hasAnswerKey: boolean;
  studentCount: number;
  processedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerKeyResponseDto {
  examId: string;
  answers: AnswerItemDto[];
  imageUrl?: string;
  confidenceScore: number;
  processedAt: string;
}

export interface AnswerItemDto {
  questionNumber: number;
  correctOption: number;
  correctOptionLabel: string;
  confidenceScore: number;
}

export interface AnswerKeyPreviewDto {
  examId: string;
  previewImageUrl: string;
  detectedAnswers: AnswerItemDto[];
  overallConfidence: number;
  warnings: string[];
  needsReview: boolean;
}

export interface ConfirmAnswerKeyDto {
  examId: string;
  corrections?: AnswerCorrectionDto[];
}

export interface AnswerCorrectionDto {
  questionNumber: number;
  correctOption: number;
}
