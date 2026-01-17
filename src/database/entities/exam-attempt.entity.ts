import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProcessingStatus } from '@omr/shared-types';
import { BaseEntity } from './base.entity';
import { Exam } from './exam.entity';
import { Student } from './student.entity';
import { Answer } from './answer.entity';
import { ProcessingLog } from './processing-log.entity';

@Entity('exam_attempts')
@Index(['examId', 'studentId'], { unique: true })
export class ExamAttempt extends BaseEntity {
  @Column({ name: 'exam_id', type: 'uuid' })
  examId!: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId!: string;

  @Column({ name: 'image_url', length: 500 })
  imageUrl!: string;

  @Column({ name: 'processed_image_url', length: 500, nullable: true })
  processedImageUrl?: string;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.PENDING,
  })
  @Index()
  status!: ProcessingStatus;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score?: number;

  @Column({ name: 'total_correct', type: 'int', nullable: true })
  totalCorrect?: number;

  @Column({ name: 'total_incorrect', type: 'int', nullable: true })
  totalIncorrect?: number;

  @Column({ name: 'total_blank', type: 'int', nullable: true })
  totalBlank?: number;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 4, nullable: true })
  confidenceScore?: number;

  @ManyToOne(() => Exam, exam => exam.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam!: Exam;

  @ManyToOne(() => Student, student => student.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @OneToMany(() => Answer, answer => answer.attempt)
  answers!: Answer[];

  @OneToOne(() => ProcessingLog, log => log.attempt)
  processingLog?: ProcessingLog;
}
