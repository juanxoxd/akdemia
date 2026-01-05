import { apiClient, uploadFile, withRetry } from './apiClient';
import { mockProcessingApi } from '../mocks';
import { useExamStore } from '../../store';
import { SubmitAttemptResponse, ExamAttempt } from '../../domain/entities';
import { ENV } from '../../config/env';

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

    console.log('[API] submitAnswerSheet called with:', {
      examId,
      studentId,
      imageUri: imageUri.substring(0, 50) + '...',
    });

    if (!studentId) {
      throw new Error('studentId is required but was undefined');
    }

    const formData = new FormData();
    const filename = `answer_sheet_${Date.now()}.jpg`;

    // Get current exam settings from store to send to backend
    const { selectedExam } = useExamStore.getState();
    const totalQuestions = selectedExam?.totalQuestions || 20;
    const optionsPerQuestion = selectedExam?.answersPerQuestion || 5;

    // Check if running on web or native
    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

    if (
      isWeb &&
      (imageUri.startsWith('data:') || imageUri.startsWith('blob:') || imageUri.startsWith('http'))
    ) {
      // Web: Convert URI to Blob
      console.log('[API] Web mode: Converting URI to Blob', imageUri.substring(0, 30));
      const fetchResponse = await fetch(imageUri);
      const blob = await fetchResponse.blob();

      // Basic file object for the FormData
      formData.append('file', blob, filename);
    } else {
      // React Native: Use the native format
      console.log('[API] Native mode: Using RN file format');
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      } as any);
    }

    // Add required fields for ProcessingController
    formData.append('totalQuestions', String(totalQuestions));
    formData.append('optionsPerQuestion', String(optionsPerQuestion));

    return withRetry(async () => {
      // Correct endpoint: /exams/${examId}/students/${studentId}/submit
      const response = await uploadFile(
        `/exams/${examId}/students/${studentId}/submit`,
        formData,
        onProgress
      );
      console.log('[API] submitAnswerSheet response:', response);
      return response as SubmitAttemptResponse;
    });
  },

  // Get processing results (polling)
  getResults: async (examId: string, studentId: string): Promise<ExamAttempt> => {
    if (useMock) {
      return mockProcessingApi.getResults(examId, studentId);
    }
    const response = await apiClient.get<any>(`/exams/${examId}/students/${studentId}/result`);

    // Normalize data for domain compatibility
    const data = response.data;
    const normalizedStatus = (data.status || '').toUpperCase();

    // Derive totals if backend doesn't provide them explicitly
    const totalCorrect = data.totalCorrect || 0;
    const totalIncorrect = data.totalIncorrect || 0;
    const totalBlank = data.totalBlank || 0;
    const derivedTotal = totalCorrect + totalIncorrect + totalBlank;
    const derivedPercentage = derivedTotal > 0 ? (totalCorrect / derivedTotal) * 100 : 0;

    // Map answers if they exist
    const answers = data.answers
      ? data.answers.map((a: any) => ({
          ...a,
          status: a.isCorrect ? 'correct' : a.selectedOption === null ? 'blank' : 'incorrect',
          confidenceScore: a.confidenceScore !== undefined ? parseFloat(a.confidenceScore) : 1.0,
        }))
      : [];

    return {
      ...data,
      status: normalizedStatus,
      score: data.score ? parseFloat(data.score) : totalCorrect,
      totalQuestions: data.totalQuestions || derivedTotal,
      percentage: data.percentage !== undefined ? parseFloat(data.percentage) : derivedPercentage,
      answers,
    } as ExamAttempt;
  },

  // Polling helper
  getAttemptResults: async (examId: string, studentId: string): Promise<ExamAttempt> => {
    if (useMock) {
      return mockProcessingApi.getResults(examId, studentId);
    }
    const response = await apiClient.get<any>(`/exams/${examId}/students/${studentId}/result`);

    // Normalize data
    const data = response.data;
    const normalizedStatus = (data.status || '').toUpperCase();

    // Derive totals
    const totalCorrect = data.totalCorrect || 0;
    const totalIncorrect = data.totalIncorrect || 0;
    const totalBlank = data.totalBlank || 0;
    const derivedTotal = totalCorrect + totalIncorrect + totalBlank;
    const derivedPercentage = derivedTotal > 0 ? (totalCorrect / derivedTotal) * 100 : 0;

    // Map answers if they exist
    const answers = data.answers
      ? data.answers.map((a: any) => ({
          ...a,
          status: a.isCorrect ? 'correct' : a.selectedOption === null ? 'blank' : 'incorrect',
          confidenceScore: a.confidenceScore !== undefined ? parseFloat(a.confidenceScore) : 1.0,
        }))
      : [];

    return {
      ...data,
      status: normalizedStatus,
      score: data.score ? parseFloat(data.score) : totalCorrect,
      totalQuestions: data.totalQuestions || derivedTotal,
      percentage: data.percentage !== undefined ? parseFloat(data.percentage) : derivedPercentage,
      answers,
    } as ExamAttempt;
  },

  // Admin: Upload Answer Key
  uploadAnswerKey: async (
    examId: string,
    imageUri: string,
    totalQuestions: number,
    optionsPerQuestion: number = 5,
    onProgress?: (progress: number) => void
  ): Promise<any> => {
    if (useMock) {
      return mockProcessingApi.uploadAnswerKey(
        examId,
        imageUri,
        totalQuestions,
        optionsPerQuestion,
        onProgress
      );
    }

    const formData = new FormData();
    const filename = `answer_key_${Date.now()}.jpg`;

    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

    if (isWeb) {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('file', blob, filename);
    } else {
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      } as any);
    }

    formData.append('totalQuestions', String(totalQuestions));
    formData.append('optionsPerQuestion', String(optionsPerQuestion));

    const response = await uploadFile(`/exams/${examId}/answer-key`, formData, onProgress);
    return response;
  },

  // Admin: Confirm Answer Key
  confirmAnswerKey: async (examId: string, confirmedAnswers: number[][]): Promise<any> => {
    if (useMock) {
      return mockProcessingApi.confirmAnswerKey(examId, confirmedAnswers);
    }
    const response = await apiClient.post(`/exams/${examId}/answer-key/confirm`, {
      confirmedAnswers,
    });
    return response.data;
  },
};
