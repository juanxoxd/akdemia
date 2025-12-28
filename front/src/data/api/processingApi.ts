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
      return mockProcessingApi.uploadAnswerKey(examId, imageUri, totalQuestions, optionsPerQuestion, onProgress);
    }

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `answer_key_${Date.now()}.jpg`,
    } as unknown as Blob);
    formData.append('totalQuestions', totalQuestions.toString());
    if (optionsPerQuestion) {
      formData.append('optionsPerQuestion', optionsPerQuestion.toString());
    }

    const response = await uploadFile(`/exams/${examId}/answer-key`, formData, onProgress);
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

