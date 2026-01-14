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
  score?: string | number | null;
  processedAt?: string;
}

// Response from /exams/{examId}/students/search endpoint
interface StudentSearchResponse {
  count: number;
  items: ApiStudent[];
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

    // Backend response type
    interface ApiStudentRegistrationResponse {
      id?: string;
      studentId?: string;
      examId?: string;
      code?: string;
      fullName?: string;
      email?: string;
      attemptId?: string;
    }

    const response = await apiClient.post<ApiStudentRegistrationResponse>(
      `/exams/${examId}/students`,
      data
    );

    console.log('[API] registerStudent response:', response.data);

    // Map API response to frontend format
    // Backend might return 'id' instead of 'studentId'
    return {
      studentId: response.data.id || response.data.studentId || '',
      examId: response.data.examId || examId,
    };
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

  // Find student by code
  findStudentByCode: async (studentCode: string): Promise<Student | null> => {
    if (useMock) return null;

    try {
      console.log('[API] Searching student by code:', studentCode);
      const response = await apiClient.get<ApiStudent>(
        `/students/search?code=${encodeURIComponent(studentCode)}`
      );

      const found = response.data;
      return {
        studentId: found.id,
        examId: '',
        studentCode: found.code,
        fullName: found.fullName,
        email: found.email,
      };
    } catch (error) {
      console.log('[API] Student not found or error:', error);
      return null;
    }
  },

  // Get student by ID
  getStudentById: async (studentId: string): Promise<Student | null> => {
    if (useMock) return null;

    try {
      console.log('[API] Getting student by ID:', studentId);
      const response = await apiClient.get<ApiStudent>(`/students/${studentId}`);
      const found = response.data;

      return {
        studentId: found.id,
        examId: '',
        studentCode: found.code,
        fullName: found.fullName,
        email: found.email,
      };
    } catch (error) {
      console.log('[API] Student not found:', error);
      return null;
    }
  },

  // NEW: Get all attempts for a student
  getStudentAttempts: async (studentId: string) => {
    if (useMock) return [];
    const response = await apiClient.get<any[]>(`/students/${studentId}/attempts`);
    return response.data;
  },

  // Search student in a specific exam by code - returns score, attemptId, etc.
  searchStudentInExam: async (examId: string, studentCode: string): Promise<ApiStudent | null> => {
    if (useMock) return null;

    try {
      console.log('[API] Searching student in exam:', { examId, studentCode });
      const response = await apiClient.get<StudentSearchResponse>(
        `/exams/${examId}/students/search?code=${encodeURIComponent(studentCode)}`
      );

      if (response.data.count > 0 && response.data.items.length > 0) {
        return response.data.items[0];
      }
      return null;
    } catch (error) {
      console.log('[API] Student not found in exam:', error);
      return null;
    }
  },

  // Search student across all exams and return all their results
  searchStudentResultsAcrossExams: async (studentCode: string): Promise<any[]> => {
    if (useMock) return [];

    try {
      // 1. Get all exams
      const examsResponse = await apiClient.get<{ items: ApiExam[]; meta: any }>('/exams');
      const exams = examsResponse.data?.items || [];

      // 2. Search for student in each exam
      const results: any[] = [];
      for (const exam of exams) {
        try {
          const response = await apiClient.get<StudentSearchResponse>(
            `/exams/${exam.id}/students/search?code=${encodeURIComponent(studentCode)}`
          );

          if (response.data.count > 0 && response.data.items.length > 0) {
            const student = response.data.items[0];
            // Only include if there's an attempt
            if (student.attemptId) {
              results.push({
                examId: exam.id,
                examTitle: exam.title,
                studentId: student.id,
                code: student.code,
                fullName: student.fullName,
                attemptId: student.attemptId,
                status: student.attemptStatus,
                score: student.score,
                processedAt: student.processedAt,
                createdAt: student.createdAt,
              });
            }
          }
        } catch (err) {
          // Ignore errors for individual exams
          console.log(`[API] Error searching in exam ${exam.id}:`, err);
        }
      }

      return results;
    } catch (error) {
      console.error('[API] Error searching student across exams:', error);
      return [];
    }
  },
};
