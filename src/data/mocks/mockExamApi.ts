// Mock API for exams - simulates backend responses
import { Exam, Student, StudentRegistrationRequest, StudentRegistrationResponse } from '../../domain/entities';
import { mockExams, mockExamsExtended, mockStudents, generateMockStatistics, ExamExtended } from './mockData';
import { mockDelay } from './mockDelay';

// In-memory storage for new data created during session
let examsStore = [...mockExamsExtended];
let studentsStore = { ...mockStudents };

// Helper to generate UUID
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

export const mockExamApi = {
  // Get list of available exams
  getExams: async (): Promise<Exam[]> => {
    await mockDelay();
    console.log('[MockAPI] GET /exams');
    return examsStore.map(e => ({
      examId: e.id,
      title: e.title,
      totalQuestions: e.totalQuestions,
      date: e.examDate,
      status: e.status === 'draft' ? 'active' : e.status as 'active' | 'closed',
    }));
  },

  // Get single exam by ID
  getExam: async (examId: string): Promise<Exam> => {
    await mockDelay();
    console.log(`[MockAPI] GET /exams/${examId}`);
    const exam = examsStore.find(e => e.id === examId);
    if (!exam) {
      throw new Error('Exam not found');
    }
    return {
      examId: exam.id,
      title: exam.title,
      totalQuestions: exam.totalQuestions,
      date: exam.examDate,
      status: exam.status === 'draft' ? 'active' : exam.status as 'active' | 'closed',
    };
  },

  // Get exam with extended details
  getExamExtended: async (examId: string): Promise<ExamExtended> => {
    await mockDelay();
    console.log(`[MockAPI] GET /exams/${examId} (extended)`);
    const exam = examsStore.find(e => e.id === examId);
    if (!exam) {
      throw new Error('Exam not found');
    }
    return exam;
  },

  // Create new exam
  createExam: async (data: {
    examTitle: string;
    description?: string;
    totalQuestions: number;
    answersPerQuestion: number;
    examDate: string;
  }): Promise<ExamExtended> => {
    await mockDelay(500, 1000);
    console.log('[MockAPI] POST /exams/start', data);
    
    const newExam: ExamExtended = {
      id: uuid(),
      title: data.examTitle,
      description: data.description,
      totalQuestions: data.totalQuestions,
      answersPerQuestion: data.answersPerQuestion,
      examDate: data.examDate,
      status: 'draft',
      hasAnswerKey: false,
      studentCount: 0,
      processedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    examsStore.push(newExam);
    studentsStore[newExam.id] = [];
    
    return newExam;
  },

  // Update exam
  updateExam: async (examId: string, data: Partial<ExamExtended>): Promise<ExamExtended> => {
    await mockDelay();
    console.log(`[MockAPI] PUT /exams/${examId}`, data);
    
    const index = examsStore.findIndex(e => e.id === examId);
    if (index === -1) {
      throw new Error('Exam not found');
    }
    
    examsStore[index] = {
      ...examsStore[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    return examsStore[index];
  },

  // Delete exam
  deleteExam: async (examId: string): Promise<void> => {
    await mockDelay();
    console.log(`[MockAPI] DELETE /exams/${examId}`);
    examsStore = examsStore.filter(e => e.id !== examId);
    delete studentsStore[examId];
  },

  // Get exam statistics
  getStatistics: async (examId: string) => {
    await mockDelay();
    console.log(`[MockAPI] GET /exams/${examId}/statistics`);
    return generateMockStatistics(examId);
  },

  // Register student for an exam
  registerStudent: async (
    examId: string,
    data: StudentRegistrationRequest
  ): Promise<StudentRegistrationResponse> => {
    await mockDelay(300, 600);
    console.log(`[MockAPI] POST /exams/${examId}/students`, data);
    
    const studentId = uuid();
    const newStudent: Student = {
      studentId,
      examId,
      studentCode: data.studentCode,
      fullName: data.fullName,
      email: data.email,
    };
    
    if (!studentsStore[examId]) {
      studentsStore[examId] = [];
    }
    studentsStore[examId].push(newStudent);
    
    // Update student count
    const examIndex = examsStore.findIndex(e => e.id === examId);
    if (examIndex !== -1) {
      examsStore[examIndex].studentCount++;
    }
    
    return { studentId, examId };
  },

  // Get students for an exam
  getStudents: async (examId: string): Promise<Student[]> => {
    await mockDelay();
    console.log(`[MockAPI] GET /exams/${examId}/students`);
    return studentsStore[examId] || [];
  },

  // Get student by ID
  getStudent: async (examId: string, studentId: string): Promise<Student> => {
    await mockDelay();
    console.log(`[MockAPI] GET /exams/${examId}/students/${studentId}`);
    const student = studentsStore[examId]?.find(s => s.studentId === studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    return student;
  },

  // Reset mock data (for testing)
  resetMockData: () => {
    examsStore = [...mockExamsExtended];
    studentsStore = { ...mockStudents };
  },
};
