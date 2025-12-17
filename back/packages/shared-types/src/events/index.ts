// ============================================
// Event Payloads for Message Queue
// ============================================

export interface AnswerKeyUploadedEvent {
  eventType: 'answer-key.uploaded';
  timestamp: Date;
  payload: {
    examId: string;
    imageUrl: string;
    totalQuestions: number;
    optionsPerQuestion: number;
  };
}

export interface AnswerKeyProcessedEvent {
  eventType: 'answer-key.processed';
  timestamp: Date;
  payload: {
    examId: string;
    success: boolean;
    answers?: Array<{
      questionNumber: number;
      correctOption: number;
      confidenceScore: number;
    }>;
    error?: {
      code: string;
      message: string;
    };
  };
}

export interface StudentAnswerUploadedEvent {
  eventType: 'student-answer.uploaded';
  timestamp: Date;
  payload: {
    examId: string;
    studentId: string;
    attemptId: string;
    imageUrl: string;
    totalQuestions: number;
    optionsPerQuestion: number;
  };
}

export interface StudentAnswerProcessedEvent {
  eventType: 'student-answer.processed';
  timestamp: Date;
  payload: {
    examId: string;
    studentId: string;
    attemptId: string;
    success: boolean;
    result?: {
      score: number;
      totalCorrect: number;
      totalIncorrect: number;
      totalBlank: number;
      confidenceScore: number;
      answers: Array<{
        questionNumber: number;
        selectedOption?: number;
        isCorrect: boolean;
        status: string;
      }>;
    };
    error?: {
      code: string;
      message: string;
    };
  };
}

export interface ExamCompletedEvent {
  eventType: 'exam.completed';
  timestamp: Date;
  payload: {
    examId: string;
    totalStudents: number;
    processedStudents: number;
    averageScore: number;
  };
}

export type OMREvent =
  | AnswerKeyUploadedEvent
  | AnswerKeyProcessedEvent
  | StudentAnswerUploadedEvent
  | StudentAnswerProcessedEvent
  | ExamCompletedEvent;
