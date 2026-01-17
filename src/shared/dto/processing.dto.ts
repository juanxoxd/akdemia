// ============================================
// Processing Request DTOs
// ============================================

export interface ProcessAnswerKeyRequestDto {
  examId: string;
  totalQuestions: number;
  optionsPerQuestion: number;
}

export interface ProcessStudentAnswerRequestDto {
  examId: string;
  studentId: string;
  totalQuestions: number;
  optionsPerQuestion: number;
}

// ============================================
// Processing Response DTOs
// ============================================

export interface ProcessingResultDto {
  success: boolean;
  status: string;
  processedImageUrl?: string;
  detectedAnswers: DetectedAnswerDto[];
  confidenceScore: number;
  qualityScore: number;
  qualityLevel: string;
  processingTimeMs: number;
  warnings: string[];
}

export interface DetectedAnswerDto {
  questionNumber: number;
  selectedOption?: number;
  selectedOptionLabel?: string;
  confidenceScore: number;
  status: string;
}

export interface ProcessingErrorDto {
  success: false;
  status: string;
  errorCode: string;
  errorMessage: string;
  details?: Record<string, unknown>;
}

// ============================================
// Image Validation DTOs
// ============================================

export interface ImageValidationDto {
  isValid: boolean;
  width: number;
  height: number;
  format: string;
  qualityScore: number;
  errors: string[];
  warnings: string[];
}

export interface ImageUploadResponseDto {
  url: string;
  key: string;
  bucket: string;
  size: number;
  mimetype: string;
}

// ============================================
// Processing Log DTOs
// ============================================

export interface ProcessingLogDto {
  id: string;
  attemptId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  confidenceScore?: number;
  qualityScore?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface ProcessingStepDto {
  step: string;
  status: string;
  durationMs?: number;
  details?: Record<string, unknown>;
}
