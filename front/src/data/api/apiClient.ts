import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { ENV } from '../../config/env';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Create axios instance with default configuration
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: ENV.API_BASE_URL,
    timeout: ENV.UPLOAD_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      if (ENV.ENABLE_LOGS) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => {
      if (ENV.ENABLE_LOGS) {
        console.log(`[API] Response ${response.status}:`, response.data);
      }
      return response;
    },
    (error: AxiosError) => {
      if (ENV.ENABLE_LOGS) {
        console.error('[API] Error:', error.response?.data || error.message);
      }

      if (error.response) {
        throw new ApiError(
          error.response.status,
          (error.response.data as { message?: string })?.message || 'Request failed',
          error.response.data
        );
      } else if (error.request) {
        throw new ApiError(0, 'Network error - no response received');
      } else {
        throw new ApiError(0, error.message);
      }
    }
  );

  return client;
};

export const apiClient = createApiClient();

// Helper for multipart/form-data requests
export const uploadFile = async (
  url: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<unknown> => {
  const config: AxiosRequestConfig = {
    headers: {
      // On Web, we MUST set Content-Type to undefined.
      // This forces the browser to set it to multipart/form-data
      // AND include the crucial 'boundary' parameter.
      ...(Platform.OS === 'web'
        ? { 'Content-Type': undefined }
        : { 'Content-Type': 'multipart/form-data' }),
    },
    // Ensure axios doesn't try to stringify the FormData as JSON
    transformRequest: [(data) => data],
    timeout: ENV.UPLOAD_TIMEOUT,
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  };

  const response = await apiClient.post(url, formData, config);
  return response.data;
};

// Retry wrapper for failed requests
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = ENV.MAX_RETRY_ATTEMPTS
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (ENV.ENABLE_LOGS) {
        console.log(`[Retry] Attempt ${attempt}/${maxAttempts} failed`);
      }

      // Don't retry on client errors (4xx)
      if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError;
};
