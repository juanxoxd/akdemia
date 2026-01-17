// ============================================
// Student DTOs
// ============================================

export interface CreateStudentDto {
  studentCode: string;
  fullName: string;
  email?: string;
}

export interface UpdateStudentDto {
  fullName?: string;
  email?: string;
}

export interface StudentResponseDto {
  id: string;
  code: string;
  fullName: string;
  email?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkCreateStudentsDto {
  students: CreateStudentDto[];
}

export interface BulkCreateStudentsResponseDto {
  created: number;
  failed: number;
  errors?: BulkStudentError[];
}

export interface BulkStudentError {
  studentCode: string;
  error: string;
}

// ============================================
// Exam Attempt DTOs
// ============================================

export interface ExamAttemptResponseDto {
  id: string;
  examId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  imageUrl: string;
  processedImageUrl?: string;
  status: string;
  score?: number;
  totalCorrect?: number;
  totalIncorrect?: number;
  totalBlank?: number;
  percentage?: number;
  confidenceScore?: number;
  processedAt?: string;
  createdAt: string;
}

export interface StudentResultDto {
  student: StudentResponseDto;
  examTitle: string;
  examDate: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  blankAnswers: number;
  score: number;
  percentage: number;
  grade?: string;
  rank?: number;
  answers: StudentAnswerDto[];
}

export interface StudentAnswerDto {
  questionNumber: number;
  selectedOption?: string;
  correctOption: string;
  isCorrect: boolean;
  status: string;
  confidenceScore: number;
}

// ============================================
// Grade Report DTOs
// ============================================

export interface GradeReportDto {
  examId: string;
  examTitle: string;
  examDate: string;
  totalStudents: number;
  processedStudents: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  students: StudentGradeSummaryDto[];
}

export interface StudentGradeSummaryDto {
  studentId: string;
  studentCode: string;
  studentName: string;
  score: number;
  percentage: number;
  rank: number;
  status: string;
}
