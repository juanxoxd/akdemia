export type ExamStatus = 'active' | 'closed';

export interface Exam {
  examId: string;
  title: string;
  totalQuestions: number;
  date: string;
  status: ExamStatus;
}

export interface ExamListResponse {
  exams: Exam[];
}
