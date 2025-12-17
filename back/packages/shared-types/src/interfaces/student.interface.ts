import { StudentStatus } from '../enums';

// ============================================
// Student Interfaces
// ============================================

export interface IStudent {
  id: string;
  code: string;
  fullName: string;
  email?: string;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  imageUrl: string;
  processedImageUrl?: string;
  processedAt?: Date;
  score?: number;
  totalCorrect?: number;
  totalIncorrect?: number;
  totalBlank?: number;
  confidenceScore?: number;
  answers?: IStudentAnswer[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentAnswer {
  id: string;
  attemptId: string;
  questionNumber: number;
  selectedOption?: number;
  isCorrect?: boolean;
  confidenceScore: number;
  status: string;
}

export interface IStudentResult {
  student: IStudent;
  attempt: IExamAttempt;
  answers: IStudentAnswer[];
  score: number;
  percentage: number;
  rank?: number;
}

export interface IStudentGradeReport {
  studentId: string;
  studentCode: string;
  studentName: string;
  examTitle: string;
  examDate: Date;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  blankAnswers: number;
  score: number;
  percentage: number;
  grade?: string;
  detailedResults: IDetailedAnswer[];
}

export interface IDetailedAnswer {
  questionNumber: number;
  selectedOption?: string;
  correctOption: string;
  isCorrect: boolean;
  status: string;
}
