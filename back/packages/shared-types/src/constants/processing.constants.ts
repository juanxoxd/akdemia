// ============================================
// OMR Processing Constants
// ============================================

export const PROCESSING_CONSTANTS = {
  // Image dimensions
  MIN_IMAGE_WIDTH: 800,
  MIN_IMAGE_HEIGHT: 1000,
  MAX_IMAGE_WIDTH: 4000,
  MAX_IMAGE_HEIGHT: 5000,
  OPTIMAL_DPI: 300,

  // Detection thresholds
  MARK_DETECTION_THRESHOLD: 0.65,
  CONFIDENCE_THRESHOLD: 0.85,
  AMBIGUITY_THRESHOLD: 0.4,
  MIN_CONTRAST_RATIO: 0.3,

  // Bubble/Mark configuration
  DEFAULT_OPTIONS_PER_QUESTION: 5,
  MAX_OPTIONS_PER_QUESTION: 10,
  MIN_QUESTIONS: 1,
  MAX_QUESTIONS: 200,

  // Error margins
  ALIGNMENT_ERROR_MARGIN: 0.02, // 2%
  PERSPECTIVE_CORRECTION_THRESHOLD: 5, // degrees

  // Quality validation
  MIN_QUALITY_SCORE: 0.7,
  MIN_CONFIDENCE_SCORE: 0.95, // 95% minimum for answer key
  BLUR_THRESHOLD: 100,
  NOISE_THRESHOLD: 0.1,
} as const;

// ============================================
// Answer Options
// ============================================

export const ANSWER_OPTIONS = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
} as const;

export const ANSWER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;

// ============================================
// Processing Status Messages
// ============================================

export const PROCESSING_MESSAGES = {
  STARTED: 'Processing started',
  PREPROCESSING: 'Preprocessing image',
  DETECTING_ROI: 'Detecting regions of interest',
  DETECTING_MARKS: 'Detecting marks',
  VALIDATING: 'Validating results',
  COMPLETED: 'Processing completed',
  FAILED: 'Processing failed',
  ANSWER_KEY_PROCESSED: 'Answer key processed successfully',
  STUDENT_ANSWER_QUEUED: 'Student answer queued for processing',
} as const;

// ============================================
// Validation Error Codes
// ============================================

export const VALIDATION_ERRORS = {
  IMAGE_TOO_SMALL: 'IMAGE_TOO_SMALL',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  LOW_QUALITY: 'LOW_QUALITY',
  ALIGNMENT_FAILED: 'ALIGNMENT_FAILED',
  NO_MARKS_DETECTED: 'NO_MARKS_DETECTED',
  MULTIPLE_MARKS: 'MULTIPLE_MARKS',
  INVALID_FORMAT: 'INVALID_FORMAT',
  TIMING_MARKS_NOT_FOUND: 'TIMING_MARKS_NOT_FOUND',
} as const;
