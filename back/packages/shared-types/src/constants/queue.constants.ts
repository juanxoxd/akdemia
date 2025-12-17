// ============================================
// Queue Names
// ============================================

export const QUEUE_NAMES = {
  OMR_PROCESSING: 'omr.processing',
  OMR_RESULTS: 'omr.results',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
} as const;

// ============================================
// Exchange Names (RabbitMQ)
// ============================================

export const EXCHANGE_NAMES = {
  OMR_EVENTS: 'omr.events',
  EXAM_EVENTS: 'exam.events',
} as const;

// ============================================
// Routing Keys
// ============================================

export const ROUTING_KEYS = {
  // Answer Key Processing
  ANSWER_KEY_UPLOADED: 'answer-key.uploaded',
  ANSWER_KEY_PROCESSED: 'answer-key.processed',
  ANSWER_KEY_FAILED: 'answer-key.failed',

  // Student Answer Processing
  STUDENT_ANSWER_UPLOADED: 'student-answer.uploaded',
  STUDENT_ANSWER_PROCESSED: 'student-answer.processed',
  STUDENT_ANSWER_FAILED: 'student-answer.failed',

  // Exam Events
  EXAM_CREATED: 'exam.created',
  EXAM_COMPLETED: 'exam.completed',
  EXAM_GRADED: 'exam.graded',
} as const;

// ============================================
// Job Types
// ============================================

export const JOB_TYPES = {
  PROCESS_ANSWER_KEY: 'process-answer-key',
  PROCESS_STUDENT_ANSWER: 'process-student-answer',
  GENERATE_REPORT: 'generate-report',
  SEND_NOTIFICATION: 'send-notification',
} as const;

// ============================================
// Job Options
// ============================================

export const JOB_OPTIONS = {
  DEFAULT_ATTEMPTS: 3,
  DEFAULT_BACKOFF: 5000,
  PROCESSING_TIMEOUT: 60000, // 1 minute
  PRIORITY: {
    HIGH: 1,
    MEDIUM: 5,
    LOW: 10,
  },
} as const;
