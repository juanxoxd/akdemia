import {
  Entity,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { ExamStatus } from '@omr/shared-types';
import { BaseEntity } from './base.entity';
import { ExamAttempt } from './exam-attempt.entity';

@Entity('exams')
export class Exam extends BaseEntity {
  @Column({ length: 255 })
  @Index()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'total_questions', type: 'int' })
  totalQuestions!: number;

  @Column({ name: 'answers_per_question', type: 'int', default: 5 })
  answersPerQuestion!: number;

  @Column({ name: 'exam_date', type: 'date' })
  @Index()
  examDate!: Date;

  @Column({
    type: 'enum',
    enum: ExamStatus,
    default: ExamStatus.DRAFT,
  })
  @Index()
  status!: ExamStatus;

  @Column({ name: 'answer_key', type: 'jsonb', nullable: true })
  answerKey?: AnswerKeyData;

  @Column({ name: 'answer_key_image_url', nullable: true, length: 500 })
  answerKeyImageUrl?: string;

  @Column({ name: 'answer_key_confidence', type: 'decimal', precision: 5, scale: 4, nullable: true })
  answerKeyConfidence?: number;

  @Column({ name: 'answer_key_processed_at', type: 'timestamp', nullable: true })
  answerKeyProcessedAt?: Date;

  @OneToMany(() => ExamAttempt, attempt => attempt.exam)
  attempts!: ExamAttempt[];
}

// Answer Key JSON structure
export interface AnswerKeyData {
  answers: Array<{
    questionNumber: number;
    correctOption: number;
    confidenceScore: number;
  }>;
}
