import { ExamStatus } from '../enums';

// ============================================
// Exam Interfaces
// ============================================

export interface IExam {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  answersPerQuestion: number;
  examDate: Date;
  status: ExamStatus;
  answerKey?: IAnswerKey;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnswerKey {
  examId: string;
  answers: ICorrectAnswer[];
  imageUrl?: string;
  processedAt?: Date;
  confidenceScore?: number;
}

export interface ICorrectAnswer {
  questionNumber: number;
  correctOption: number;
  confidenceScore: number;
}

export interface IExamSummary {
  id: string;
  title: string;
  totalQuestions: number;
  examDate: Date;
  status: ExamStatus;
  totalStudents: number;
  processedCount: number;
  averageScore?: number;
}

export interface IExamStatistics {
  examId: string;
  totalStudents: number;
  processedStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  standardDeviation: number;
  questionStatistics: IQuestionStatistic[];
}

export interface IQuestionStatistic {
  questionNumber: number;
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  correctPercentage: number;
  optionDistribution: Record<number, number>;
}
