// Mock data for testing without backend
import { Exam, Student, ExamAttempt, Answer } from '../../domain/entities';

// Helper to generate UUIDs
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

// Mock Exams
export const mockExams: Exam[] = [
  {
    examId: 'exam-001',
    title: 'Examen Parcial - Matemáticas I',
    totalQuestions: 20,
    date: '2025-12-28',
    status: 'active',
  },
  {
    examId: 'exam-002',
    title: 'Examen Final - Física General',
    totalQuestions: 30,
    date: '2025-12-30',
    status: 'active',
  },
  {
    examId: 'exam-003',
    title: 'Quiz - Química Orgánica',
    totalQuestions: 15,
    date: '2025-12-25',
    status: 'closed',
  },
  {
    examId: 'exam-004',
    title: 'Examen Parcial - Historia del Perú',
    totalQuestions: 25,
    date: '2025-12-29',
    status: 'active',
  },
];

// Extended exam data (what backend returns)
export interface ExamExtended {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  answersPerQuestion: number;
  examDate: string;
  status: 'draft' | 'active' | 'closed';
  hasAnswerKey: boolean;
  studentCount: number;
  processedCount: number;
  createdAt: string;
  updatedAt: string;
  answerKey?: number[][];
}

export const mockExamsExtended: ExamExtended[] = [
  {
    id: 'exam-001',
    title: 'Examen Parcial - Matemáticas I',
    description: 'Primer parcial del curso de Matemáticas I - Cálculo Diferencial',
    totalQuestions: 20,
    answersPerQuestion: 5,
    examDate: '2025-12-28',
    status: 'active',
    hasAnswerKey: true,
    studentCount: 35,
    processedCount: 12,
    createdAt: '2025-12-20T10:00:00.000Z',
    updatedAt: '2025-12-27T15:30:00.000Z',
    answerKey: [
      [0], [1], [2], [3], [4], // 1-5
      [0], [1], [2], [3], [4], // 6-10
      [0], [1], [2], [3], [4], // 11-15
      [0], [1], [2], [3], [4], // 16-20
    ],
  },
  {
    id: 'exam-002',
    title: 'Examen Final - Física General',
    description: 'Examen final que cubre todos los temas del semestre',
    totalQuestions: 30,
    answersPerQuestion: 5,
    examDate: '2025-12-30',
    status: 'active',
    hasAnswerKey: true,
    studentCount: 42,
    processedCount: 0,
    createdAt: '2025-12-15T09:00:00.000Z',
    updatedAt: '2025-12-27T10:00:00.000Z',
    answerKey: Array(30).fill([0]).map((_, i) => [i % 5]),
  },
  {
    id: 'exam-003',
    title: 'Quiz - Química Orgánica',
    description: 'Quiz sorpresa de química orgánica',
    totalQuestions: 15,
    answersPerQuestion: 4,
    examDate: '2025-12-25',
    status: 'closed',
    hasAnswerKey: true,
    studentCount: 28,
    processedCount: 28,
    createdAt: '2025-12-24T08:00:00.000Z',
    updatedAt: '2025-12-25T16:00:00.000Z',
    answerKey: Array(15).fill([0]).map((_, i) => [i % 4]),
  },
  {
    id: 'exam-004',
    title: 'Examen Parcial - Historia del Perú',
    description: 'Parcial sobre la época republicana',
    totalQuestions: 25,
    answersPerQuestion: 5,
    examDate: '2025-12-29',
    status: 'active',
    hasAnswerKey: false,
    studentCount: 0,
    processedCount: 0,
    createdAt: '2025-12-26T14:00:00.000Z',
    updatedAt: '2025-12-26T14:00:00.000Z',
  },
];

// Mock Students
export const mockStudents: Record<string, Student[]> = {
  'exam-001': [
    { studentId: 'student-001', examId: 'exam-001', studentCode: '20210001', fullName: 'Juan Carlos Pérez López', email: 'juan.perez@universidad.edu' },
    { studentId: 'student-002', examId: 'exam-001', studentCode: '20210002', fullName: 'María Elena García Rodríguez', email: 'maria.garcia@universidad.edu' },
    { studentId: 'student-003', examId: 'exam-001', studentCode: '20210003', fullName: 'Carlos Alberto Mendoza Silva', email: 'carlos.mendoza@universidad.edu' },
  ],
  'exam-002': [
    { studentId: 'student-004', examId: 'exam-002', studentCode: '20210004', fullName: 'Ana Sofía Ramírez Torres', email: 'ana.ramirez@universidad.edu' },
  ],
  'exam-003': [
    { studentId: 'student-005', examId: 'exam-003', studentCode: '20210005', fullName: 'Pedro José Castillo Vega', email: 'pedro.castillo@universidad.edu' },
  ],
};

// Mock Answers generator
export const generateMockAnswers = (totalQuestions: number, correctAnswers: number[][]): Answer[] => {
  return Array.from({ length: totalQuestions }, (_, i) => {
    const correctOption = correctAnswers[i]?.[0] ?? 0;
    const selectedOption = Math.random() > 0.2 ? correctOption : Math.floor(Math.random() * 5);
    const isCorrect = selectedOption === correctOption;
    const isBlank = Math.random() < 0.05;

    return {
      questionNumber: i + 1,
      selectedOption: isBlank ? null : selectedOption,
      correctOption,
      isCorrect: isBlank ? false : isCorrect,
      status: isBlank ? 'blank' : (isCorrect ? 'correct' : 'incorrect'),
      confidenceScore: 0.85 + Math.random() * 0.15,
    };
  });
};

// Mock Exam Attempt generator
export const generateMockAttempt = (examId: string, studentId: string): ExamAttempt => {
  const exam = mockExamsExtended.find(e => e.id === examId);
  const totalQuestions = exam?.totalQuestions ?? 20;
  const answerKey = exam?.answerKey ?? Array(totalQuestions).fill([0]);
  const answers = generateMockAnswers(totalQuestions, answerKey);
  
  const totalCorrect = answers.filter(a => a.status === 'correct').length;
  const totalIncorrect = answers.filter(a => a.status === 'incorrect').length;
  const totalBlank = answers.filter(a => a.status === 'blank').length;
  const percentage = Math.round((totalCorrect / totalQuestions) * 100);

  return {
    attemptId: uuid(),
    status: 'COMPLETED',
    score: totalCorrect,
    totalQuestions,
    percentage,
    totalCorrect,
    totalIncorrect,
    totalBlank,
    confidenceScore: 0.92,
    answers,
    processedAt: new Date().toISOString(),
    imageUrl: 'https://picsum.photos/800/1131',
  };
};

// Mock Statistics
export interface ExamStatistics {
  examId: string;
  totalStudents: number;
  processedCount: number;
  pendingCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  questionStats: {
    questionNumber: number;
    correctCount: number;
    incorrectCount: number;
    blankCount: number;
    correctPercentage: number;
  }[];
}

export const generateMockStatistics = (examId: string): ExamStatistics => {
  const exam = mockExamsExtended.find(e => e.id === examId);
  const totalQuestions = exam?.totalQuestions ?? 20;
  
  return {
    examId,
    totalStudents: exam?.studentCount ?? 0,
    processedCount: exam?.processedCount ?? 0,
    pendingCount: (exam?.studentCount ?? 0) - (exam?.processedCount ?? 0),
    averageScore: 14.5,
    highestScore: 19,
    lowestScore: 8,
    passRate: 78.5,
    questionStats: Array.from({ length: totalQuestions }, (_, i) => ({
      questionNumber: i + 1,
      correctCount: Math.floor(Math.random() * 30) + 5,
      incorrectCount: Math.floor(Math.random() * 10),
      blankCount: Math.floor(Math.random() * 3),
      correctPercentage: 60 + Math.random() * 35,
    })),
  };
};
