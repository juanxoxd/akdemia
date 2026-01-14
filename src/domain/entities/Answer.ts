export type AnswerStatus = 'correct' | 'incorrect' | 'blank';

export interface Answer {
  questionNumber: number;
  selectedOption: number | null;
  correctOption: number;
  isCorrect: boolean;
  status: AnswerStatus;
  confidenceScore: number;
}
