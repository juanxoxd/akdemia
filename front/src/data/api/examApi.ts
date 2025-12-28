import { apiClient } from './apiClient';
import { Exam, StudentRegistrationRequest, StudentRegistrationResponse } from '../../domain/entities';
import { ENV } from '../../config/env';
import { mockExamApi } from '../mocks';

// Use mock API if enabled
const useMock = ENV.MOCK_API;

export const examApi = {
  // Get list of available exams
  getExams: async (): Promise<Exam[]> => {
    if (useMock) {
      return mockExamApi.getExams();
    }
    const response = await apiClient.get<Exam[]>('/exams');
    return response.data;
  },

  // Get single exam by ID
  getExam: async (examId: string): Promise<Exam> => {
    if (useMock) {
      return mockExamApi.getExam(examId);
    }
    const response = await apiClient.get<Exam>(`/exams/${examId}`);
    return response.data;
  },

  // Register student for an exam
  registerStudent: async (
    examId: string,
    data: StudentRegistrationRequest
  ): Promise<StudentRegistrationResponse> => {
    if (useMock) {
      return mockExamApi.registerStudent(examId, data);
    }
    const response = await apiClient.post<StudentRegistrationResponse>(
      `/exams/${examId}/students`,
      data
    );
    return response.data;
  },

  // Create new exam (admin)
  createExam: async (data: {
    examTitle: string;
    description?: string;
    totalQuestions: number;
    answersPerQuestion: number;
    examDate: string;
  }) => {
    if (useMock) {
      return mockExamApi.createExam(data);
    }
    const response = await apiClient.post('/exams/start', data);
    return response.data;
  },

  // Get exam statistics
  getStatistics: async (examId: string) => {
    if (useMock) {
      return mockExamApi.getStatistics(examId);
    }
    const response = await apiClient.get(`/exams/${examId}/statistics`);
    return response.data;
  },

  // Get students for an exam
  getStudents: async (examId: string) => {
    if (useMock) {
      return mockExamApi.getStudents(examId);
    }
    const response = await apiClient.get(`/exams/${examId}/students`);
    return response.data;
  },
};

