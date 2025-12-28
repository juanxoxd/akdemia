// Mock API for processing - simulates OMR processing backend
import { ExamAttempt, SubmitAttemptResponse } from '../../domain/entities';
import { generateMockAttempt, mockExamsExtended } from './mockData';
import { mockDelay } from './mockDelay';

// Store for attempts
const attemptsStore: Record<string, ExamAttempt> = {};

// Helper to generate UUID
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

export const mockProcessingApi = {
  // Submit answer sheet image for processing
  submitAnswerSheet: async (
    examId: string,
    studentId: string,
    _imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<SubmitAttemptResponse> => {
    console.log(`[MockAPI] POST /processing/exams/${examId}/students/${studentId}/submit`);
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await mockDelay(50, 100);
      onProgress?.(i);
    }
    
    const attemptId = uuid();
    
    // Start "processing" in background
    setTimeout(() => {
      const attempt = generateMockAttempt(examId, studentId);
      attempt.attemptId = attemptId;
      attemptsStore[`${examId}-${studentId}-${attemptId}`] = attempt;
    }, 2000);
    
    // Store pending attempt
    attemptsStore[`${examId}-${studentId}-${attemptId}`] = {
      attemptId,
      status: 'PROCESSING',
    };
    
    return {
      attemptId,
      status: 'PENDING',
      message: 'Hoja de respuestas enviada para procesamiento',
    };
  },

  // Get processing results (polling)
  getResults: async (examId: string, studentId: string): Promise<ExamAttempt> => {
    await mockDelay(200, 400);
    console.log(`[MockAPI] GET /processing/exams/${examId}/students/${studentId}/results`);
    
    // Find latest attempt for this student
    const keys = Object.keys(attemptsStore).filter(k => k.startsWith(`${examId}-${studentId}`));
    if (keys.length === 0) {
      throw new Error('No attempts found');
    }
    
    const latestKey = keys[keys.length - 1];
    return attemptsStore[latestKey];
  },

  // Get specific attempt results
  getAttemptResults: async (
    examId: string,
    studentId: string,
    attemptId: string
  ): Promise<ExamAttempt> => {
    await mockDelay(200, 400);
    console.log(`[MockAPI] GET /processing/exams/${examId}/students/${studentId}/attempts/${attemptId}`);
    
    const key = `${examId}-${studentId}-${attemptId}`;
    const attempt = attemptsStore[key];
    
    if (!attempt) {
      throw new Error('Attempt not found');
    }
    
    return attempt;
  },

  // Upload and process answer key
  uploadAnswerKey: async (
    examId: string,
    _imageUri: string,
    totalQuestions: number,
    optionsPerQuestion: number = 5,
    onProgress?: (progress: number) => void
  ): Promise<{
    detectedAnswers: number[][];
    confidence: number;
    imageUrl: string;
  }> => {
    console.log(`[MockAPI] POST /exams/${examId}/answer-key`);
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await mockDelay(100, 200);
      onProgress?.(i);
    }
    
    // Generate mock detected answers
    const detectedAnswers = Array.from({ length: totalQuestions }, () => [
      Math.floor(Math.random() * optionsPerQuestion)
    ]);
    
    return {
      detectedAnswers,
      confidence: 0.85 + Math.random() * 0.1,
      imageUrl: 'https://picsum.photos/800/1131',
    };
  },

  // Confirm answer key
  confirmAnswerKey: async (
    examId: string,
    confirmedAnswers: number[][]
  ): Promise<{ success: boolean; message: string }> => {
    await mockDelay(300, 500);
    console.log(`[MockAPI] POST /exams/${examId}/answer-key/confirm`, confirmedAnswers);
    
    // Update the exam with the answer key
    const examIndex = mockExamsExtended.findIndex(e => e.id === examId);
    if (examIndex !== -1) {
      mockExamsExtended[examIndex].answerKey = confirmedAnswers;
      mockExamsExtended[examIndex].hasAnswerKey = true;
      mockExamsExtended[examIndex].status = 'active';
    }
    
    return {
      success: true,
      message: 'Answer key confirmed successfully',
    };
  },
};
