import { apiClient } from './apiClient';
import {
  Exam,
  Student,
  StudentRegistrationRequest,
  StudentRegistrationResponse,
} from '../../domain/entities';
import { ENV } from '../../config/env';
import { mockExamApi } from '../mocks';

// Use mock API if enabled
const useMock = ENV.MOCK_API;

// API response type for Exam (what the backend actually returns)
interface ApiExam {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  answersPerQuestion: number;
  examDate: string;
  status: 'active' | 'closed' | 'draft';
  hasAnswerKey?: boolean;
  studentCount?: number;
  processedCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// API response type for Student (what the backend actually returns)
interface ApiStudent {
  id: string;
  code: string;
  fullName: string;
  email: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  attemptId?: string;
  attemptStatus?: string;
  score?: number | null;
}

// Map API response to frontend Exam interface
const mapApiExamToExam = (apiExam: ApiExam): Exam => ({
  examId: apiExam.id,
  title: apiExam.title,
  description: apiExam.description,
  totalQuestions: apiExam.totalQuestions,
  answersPerQuestion: apiExam.answersPerQuestion,
  date: apiExam.examDate,
  status: apiExam.status,
  hasAnswerKey: apiExam.hasAnswerKey,
  studentCount: apiExam.studentCount,
  processedCount: apiExam.processedCount,
  createdAt: apiExam.createdAt,
  updatedAt: apiExam.updatedAt,
});

// Map API response to frontend Student interface
const mapApiStudentToStudent = (apiStudent: ApiStudent, examId: string): Student => ({
  studentId: apiStudent.id,
  examId: examId,
  studentCode: apiStudent.code,
  fullName: apiStudent.fullName,
  email: apiStudent.email,
});

export const examApi = {
  // Get list of available exams
  getExams: async (): Promise<Exam[]> => {
    if (useMock) {
      return mockExamApi.getExams();
    }
    const response = await apiClient.get<{ items: ApiExam[]; meta: any }>('/exams');
    // Backend returns { items: [...], meta: {...} }, extract and map the array
    const apiExams = response.data?.items || [];
    return apiExams.map(mapApiExamToExam);
  },

  // Get single exam by ID
  getExam: async (examId: string): Promise<Exam> => {
    if (useMock) {
      return mockExamApi.getExam(examId);
    }
    const response = await apiClient.get<ApiExam>(`/exams/${examId}`);
    return mapApiExamToExam(response.data);
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
  getStudents: async (examId: string): Promise<Student[]> => {
    if (useMock) {
      return mockExamApi.getStudents(examId);
    }
    const response = await apiClient.get<{ items: ApiStudent[]; meta: any }>(
      `/exams/${examId}/students`
    );
    // Backend returns { items: [...], meta: {...} }, extract and map the array
    const apiStudents = response.data?.items || [];
    return apiStudents.map((s) => mapApiStudentToStudent(s, examId));
  },
};
