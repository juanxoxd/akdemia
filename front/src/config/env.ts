// Environment configuration for OMR Scanner
// Change these values based on your environment

export const ENV = {
  // API Configuration
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  
  // Feature Flags
  ENABLE_LOGS: process.env.EXPO_PUBLIC_ENABLE_LOGS === 'true' || __DEV__,
  MOCK_CAMERA: process.env.EXPO_PUBLIC_MOCK_CAMERA === 'true' || false,
  
  // Polling Configuration
  POLLING_INTERVAL: parseInt(process.env.EXPO_PUBLIC_POLLING_INTERVAL || '2000', 10),
  MAX_POLLING_ATTEMPTS: parseInt(process.env.EXPO_PUBLIC_MAX_POLLING_ATTEMPTS || '30', 10),
  
  // Upload Configuration
  UPLOAD_TIMEOUT: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  MAX_IMAGE_SIZE_MB: 5,
  
  // Detection Configuration
  AUTO_CAPTURE_CONFIDENCE: 0.9, // 90%
  OVERLAY_CONFIDENCE_THRESHOLD: 0.5, // 50%
  DETECTION_TIMEOUT: 10000, // 10 seconds
  STABILITY_DURATION: 1000, // 1 second for auto-capture
  
  // Image Configuration
  OUTPUT_WIDTH: 800,
  OUTPUT_HEIGHT: 1131, // A4 ratio 1:1.414
  JPEG_QUALITY: 0.9,
  MIN_IMAGE_WIDTH: 800,
  MIN_IMAGE_HEIGHT: 600,
} as const;

export type Environment = typeof ENV;
