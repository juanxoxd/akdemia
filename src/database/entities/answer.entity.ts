import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AnswerStatus } from '@omr/shared-types';

@Entity('answers')
@Index(['attemptId', 'questionNumber'], { unique: true })
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId!: string;

  @Column({ name: 'question_number', type: 'int' })
  questionNumber!: number;

  @Column({ name: 'selected_option', type: 'int', nullable: true })
  selectedOption?: number;

  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect?: boolean;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 4, default: 0 })
  confidenceScore!: number;

  @Column({
    type: 'enum',
    enum: AnswerStatus,
    default: AnswerStatus.DETECTED,
  })
  status!: AnswerStatus;

  @ManyToOne('ExamAttempt', 'answers', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt!: unknown;
}
