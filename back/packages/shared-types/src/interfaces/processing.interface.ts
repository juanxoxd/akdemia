import { ProcessingStatus, ImageQualityLevel, AnswerStatus } from '../enums';

// ============================================
// Processing Request/Response
// ============================================

export interface IProcessingRequest {
  imageUrl: string;
  examId: string;
  studentId?: string;
  isAnswerKey: boolean;
  totalQuestions: number;
  optionsPerQuestion: number;
}

export interface IProcessingResponse {
  success: boolean;
  status: ProcessingStatus;
  data?: IProcessingResult;
  error?: IProcessingError;
}

export interface IProcessingResult {
  detectedAnswers: IDetectedAnswer[];
  confidenceScore: number;
  qualityScore: number;
  qualityLevel: ImageQualityLevel;
  processedImageUrl?: string;
  processingTimeMs: number;
  warnings: string[];
}

export interface IDetectedAnswer {
  questionNumber: number;
  selectedOption?: number;
  confidenceScore: number;
  status: AnswerStatus;
  boundingBox?: IBoundingBox;
}

export interface IProcessingError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Image Analysis
// ============================================

export interface IImageAnalysis {
  width: number;
  height: number;
  dpi?: number;
  format: string;
  colorSpace: string;
  qualityScore: number;
  blurScore: number;
  contrastScore: number;
  brightnessScore: number;
  isValid: boolean;
  validationErrors: string[];
}

export interface IBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IRegionOfInterest {
  name: string;
  boundingBox: IBoundingBox;
  type: 'header' | 'questions' | 'timing_marks' | 'student_info';
}

// ============================================
// Processing Log
// ============================================

export interface IProcessingLog {
  id: string;
  attemptId: string;
  startedAt: Date;
  completedAt?: Date;
  status: ProcessingStatus;
  confidenceScore?: number;
  qualityScore?: number;
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  processingSteps: IProcessingStep[];
}

export interface IProcessingStep {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  details?: Record<string, unknown>;
}

// ============================================
// Validation
// ============================================

export interface IValidationResult {
  isValid: boolean;
  errors: IValidationError[];
  warnings: IValidationWarning[];
}

export interface IValidationError {
  code: string;
  field?: string;
  message: string;
}

export interface IValidationWarning {
  code: string;
  field?: string;
  message: string;
  suggestion?: string;
}
