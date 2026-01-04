import { uploadFile, withRetry, apiClient } from './apiClient';
import { ExamAttempt, SubmitAttemptResponse } from '../../domain/entities';
import { ENV } from '../../config/env';
import { mockProcessingApi } from '../mocks';

// Use mock API if enabled
const useMock = ENV.MOCK_API;

export const processingApi = {
  // Submit answer sheet image for processing
  submitAnswerSheet: async (
    examId: string,
    studentId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<SubmitAttemptResponse> => {
    if (useMock) {
      return mockProcessingApi.submitAnswerSheet(examId, studentId, imageUri, onProgress);
    }

    const formData = new FormData();

    // Create file blob from URI
    const filename = `answer_sheet_${Date.now()}.jpg`;
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: filename,
    } as unknown as Blob);

    return withRetry(async () => {
      const response = await uploadFile(
        `/processing/exams/${examId}/students/${studentId}/submit`,
        formData,
        onProgress
      );
      return response as SubmitAttemptResponse;
    });
  },

  // Get processing results (polling)
  getResults: async (examId: string, studentId: string): Promise<ExamAttempt> => {
    if (useMock) {
      return mockProcessingApi.getResults(examId, studentId);
    }
    const response = await apiClient.get<ExamAttempt>(
      `/processing/exams/${examId}/students/${studentId}/results`
    );
    return response.data;
  },

  // Get specific attempt results
  getAttemptResults: async (
    examId: string,
    studentId: string,
    attemptId: string
  ): Promise<ExamAttempt> => {
    if (useMock) {
      return mockProcessingApi.getAttemptResults(examId, studentId, attemptId);
    }
    const response = await apiClient.get<ExamAttempt>(
      `/processing/exams/${examId}/students/${studentId}/attempts/${attemptId}`
    );
    return response.data;
  },

  // Upload and process answer key (admin)
  uploadAnswerKey: async (
    examId: string,
    imageUri: string,
    totalQuestions: number,
    optionsPerQuestion?: number,
    onProgress?: (progress: number) => void
  ) => {
    if (useMock) {
      return mockProcessingApi.uploadAnswerKey(
        examId,
        imageUri,
        totalQuestions,
        optionsPerQuestion,
        onProgress
      );
    }

    console.log('[API] uploadAnswerKey called with:', {
      examId,
      imageUri: imageUri.substring(0, 100) + '...',
      totalQuestions,
      optionsPerQuestion,
    });

    const formData = new FormData();
    const filename = `answer_key_${Date.now()}.jpg`;

    // Check if running on web or native
    // On web, we need to convert the URI to a Blob
    // On native (React Native), we use the special {uri, type, name} format
    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
    console.log(
      '[API] Platform detection - isWeb:',
      isWeb,
      'imageUri prefix:',
      imageUri.substring(0, 20)
    );

    if (isWeb) {
      // Web: Always try to convert URI to Blob
      console.log('[API] Web mode: Converting URI to Blob');
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        console.log('[API] Blob created successfully, size:', blob.size, 'type:', blob.type);
        formData.append('file', blob, filename);
      } catch (error) {
        console.error('[API] Error fetching image, trying alternative method:', error);
        // Fallback: try to create File from base64 if it's a data URI
        if (imageUri.startsWith('data:')) {
          const arr = imageUri.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          console.log('[API] Created Blob from base64, size:', blob.size);
          formData.append('file', blob, filename);
        } else {
          throw error;
        }
      }
    } else {
      // React Native: Use the native format
      console.log('[API] Native mode: Using RN file format');
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      } as unknown as Blob);
    }

    // Append as strings (FormData requires string values)
    formData.append('totalQuestions', String(totalQuestions));
    if (optionsPerQuestion) {
      formData.append('optionsPerQuestion', String(optionsPerQuestion));
    }

    console.log('[API] Sending FormData to:', `/exams/${examId}/answer-key`);

    const response = await uploadFile(`/exams/${examId}/answer-key`, formData, onProgress);
    console.log('[API] uploadAnswerKey response:', response);
    return response;
  },

  // Confirm answer key
  confirmAnswerKey: async (examId: string, confirmedAnswers: number[][]) => {
    if (useMock) {
      return mockProcessingApi.confirmAnswerKey(examId, confirmedAnswers);
    }
    const response = await apiClient.post(`/exams/${examId}/answer-key/confirm`, {
      confirmedAnswers,
    });
    return response.data;
  },
};
