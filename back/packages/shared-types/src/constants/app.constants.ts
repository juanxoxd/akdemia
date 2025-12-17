// ============================================
// Application Constants
// ============================================

export const APP_CONSTANTS = {
  NAME: 'OMR System',
  VERSION: '1.0.0',
  DESCRIPTION: 'Sistema de Reconocimiento Óptico de Marcas',
} as const;

// ============================================
// Service Ports
// ============================================

export const SERVICE_PORTS = {
  API_GATEWAY: 3000,
  EXAM_SERVICE: 3001,
  OMR_PROCESSOR: 8000,
} as const;

// ============================================
// Service Names
// ============================================

export const SERVICE_NAMES = {
  API_GATEWAY: 'api-gateway',
  EXAM_SERVICE: 'exam-service',
  OMR_PROCESSOR: 'omr-processor',
} as const;

// ============================================
// Database Constants
// ============================================

export const DATABASE_CONSTANTS = {
  DEFAULT_PORT: 5432,
  DEFAULT_HOST: 'localhost',
  DEFAULT_DATABASE: 'omr_db',
  CONNECTION_TIMEOUT: 30000,
  MAX_CONNECTIONS: 20,
} as const;

// ============================================
// Redis Constants
// ============================================

export const REDIS_CONSTANTS = {
  DEFAULT_PORT: 6379,
  DEFAULT_HOST: 'localhost',
  DEFAULT_TTL: 3600,
} as const;

// ============================================
// MinIO Constants
// ============================================

export const MINIO_CONSTANTS = {
  DEFAULT_PORT: 9000,
  CONSOLE_PORT: 9001,
  DEFAULT_HOST: 'localhost',
  DEFAULT_BUCKET: 'omr-images',
  ANSWER_KEYS_PREFIX: 'answer-keys',
  STUDENT_ANSWERS_PREFIX: 'student-answers',
  PROCESSED_PREFIX: 'processed',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/tiff'] as readonly string[],
} as const;

// ============================================
// Pagination Constants
// ============================================

export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// ============================================
// HTTP Status Messages
// ============================================

export const HTTP_MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  INTERNAL_ERROR: 'Internal server error',
} as const;
