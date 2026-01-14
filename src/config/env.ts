// Environment configuration for OMR Scanner
// Change these values based on your environment

// Using explicit type to allow number operations
export const ENV: { [key: string]: string | number | boolean } & {
  API_BASE_URL: string;
  ENABLE_LOGS: boolean;
  MOCK_CAMERA: boolean;
  MOCK_API: boolean;
  POLLING_INTERVAL: number;
  MAX_POLLING_ATTEMPTS: number;
  UPLOAD_TIMEOUT: number;
  MAX_RETRY_ATTEMPTS: number;
  MAX_IMAGE_SIZE_MB: number;
  AUTO_CAPTURE_CONFIDENCE: number;
  OVERLAY_CONFIDENCE_THRESHOLD: number;
  DETECTION_TIMEOUT: number;
  STABILITY_DURATION: number;
  DETECTION_UPDATE_INTERVAL: number;
  DETECTION_MIN_CONFIDENCE: number;
  DETECTION_STABLE_THRESHOLD: number;
  DETECTION_DELTA_BIAS: number;
  DETECTION_DELTA_RANGE: number;
  DETECTION_STABLE_VARIANCE: number;
  FRAME_MARGIN_HORIZONTAL: number;
  FRAME_MARGIN_TOP: number;
  FRAME_MARGIN_BOTTOM: number;
  OUTPUT_WIDTH: number;
  OUTPUT_HEIGHT: number;
  JPEG_QUALITY: number;
  MIN_IMAGE_WIDTH: number;
  MIN_IMAGE_HEIGHT: number;
} = {
  // API Configuration
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  
  // Feature Flags
  ENABLE_LOGS: process.env.EXPO_PUBLIC_ENABLE_LOGS === 'true' || __DEV__,
  MOCK_CAMERA: process.env.EXPO_PUBLIC_MOCK_CAMERA === 'true' || false,
  
  // Use mock API - set EXPO_PUBLIC_MOCK_API=true to enable mocks
  MOCK_API: process.env.EXPO_PUBLIC_MOCK_API === 'true' || (process.env.EXPO_PUBLIC_MOCK_API !== 'false' && __DEV__),
  
  // Polling Configuration
  POLLING_INTERVAL: parseInt(process.env.EXPO_PUBLIC_POLLING_INTERVAL || '2000', 10),
  MAX_POLLING_ATTEMPTS: parseInt(process.env.EXPO_PUBLIC_MAX_POLLING_ATTEMPTS || '30', 10),
  
  // Upload Configuration
  UPLOAD_TIMEOUT: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  MAX_IMAGE_SIZE_MB: 5,
  
  // Detection Configuration
  AUTO_CAPTURE_CONFIDENCE: 0.9,
  OVERLAY_CONFIDENCE_THRESHOLD: 0.5,
  DETECTION_TIMEOUT: 10000,
  STABILITY_DURATION: 1000,
  
  // Detection Simulation (for mock mode)
  DETECTION_UPDATE_INTERVAL: 200,
  DETECTION_MIN_CONFIDENCE: 0.3,
  DETECTION_STABLE_THRESHOLD: 0.85,
  DETECTION_DELTA_BIAS: -0.3,
  DETECTION_DELTA_RANGE: 0.15,
  DETECTION_STABLE_VARIANCE: 0.1,
  
  // Frame margins for detection overlay
  FRAME_MARGIN_HORIZONTAL: 0.1,
  FRAME_MARGIN_TOP: 0.15,
  FRAME_MARGIN_BOTTOM: 0.15,
  
  // Image Configuration
  OUTPUT_WIDTH: 800,
  OUTPUT_HEIGHT: 1131,
  JPEG_QUALITY: 0.9,
  MIN_IMAGE_WIDTH: 800,
  MIN_IMAGE_HEIGHT: 600,
};

export type Environment = typeof ENV;


