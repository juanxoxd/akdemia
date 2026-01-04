export type ExamStatus = 'active' | 'closed' | 'draft';

export interface Exam {
  examId: string; // Mapped from 'id' in API response
  title: string;
  description?: string;
  totalQuestions: number;
  answersPerQuestion: number;
  date: string; // Mapped from 'examDate' in API response
  status: ExamStatus;
  hasAnswerKey?: boolean;
  studentCount?: number;
  processedCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamListResponse {
  items: Exam[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
