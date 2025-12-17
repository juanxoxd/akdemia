import { uploadFile, withRetry, apiClient } from './apiClient';
import { ExamAttempt, SubmitAttemptResponse } from '../../domain/entities';

export const processingApi = {
  // Submit answer sheet image for processing
  submitAnswerSheet: async (
    examId: string,
    studentId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<SubmitAttemptResponse> => {
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
    const response = await apiClient.get<ExamAttempt>(
      `/processing/exams/${examId}/students/${studentId}/attempts/${attemptId}`
    );
    return response.data;
  },
};
