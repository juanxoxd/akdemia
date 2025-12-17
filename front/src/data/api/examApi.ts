import { apiClient } from './apiClient';
import { Exam, StudentRegistrationRequest, StudentRegistrationResponse } from '../../domain/entities';

export const examApi = {
  // Get list of available exams
  getExams: async (): Promise<Exam[]> => {
    const response = await apiClient.get<Exam[]>('/exams');
    return response.data;
  },

  // Get single exam by ID
  getExam: async (examId: string): Promise<Exam> => {
    const response = await apiClient.get<Exam>(`/exams/${examId}`);
    return response.data;
  },

  // Register student for an exam
  registerStudent: async (
    examId: string,
    data: StudentRegistrationRequest
  ): Promise<StudentRegistrationResponse> => {
    const response = await apiClient.post<StudentRegistrationResponse>(
      `/exams/${examId}/students`,
      data
    );
    return response.data;
  },
};
