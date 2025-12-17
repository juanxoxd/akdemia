// ============================================
// Exam Status
// ============================================

export enum ExamStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

// ============================================
// Processing Status
// ============================================

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  NEEDS_REVIEW = 'needs_review',
}

// ============================================
// Student Status
// ============================================

export enum StudentStatus {
  REGISTERED = 'registered',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
}

// ============================================
// Answer Status
// ============================================

export enum AnswerStatus {
  DETECTED = 'detected',
  AMBIGUOUS = 'ambiguous',
  BLANK = 'blank',
  MULTIPLE = 'multiple',
  INVALID = 'invalid',
}

// ============================================
// Image Quality Level
// ============================================

export enum ImageQualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  ACCEPTABLE = 'acceptable',
  POOR = 'poor',
  UNACCEPTABLE = 'unacceptable',
}

// ============================================
// Notification Type
// ============================================

export enum NotificationType {
  EXAM_CREATED = 'exam_created',
  PROCESSING_COMPLETE = 'processing_complete',
  PROCESSING_FAILED = 'processing_failed',
  GRADES_AVAILABLE = 'grades_available',
}

// ============================================
// User Role
// ============================================

export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}
