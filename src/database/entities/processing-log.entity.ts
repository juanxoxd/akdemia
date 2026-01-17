import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ProcessingStatus } from '@omr/shared-types';

@Entity('processing_logs')
export class ProcessingLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'attempt_id', type: 'uuid', unique: true })
  attemptId!: string;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.PENDING,
  })
  status!: ProcessingStatus;

  @CreateDateColumn({ name: 'started_at' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs?: number;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 4, nullable: true })
  confidenceScore?: number;

  @Column({ name: 'quality_score', type: 'decimal', precision: 5, scale: 4, nullable: true })
  qualityScore?: number;

  @Column({ name: 'error_code', length: 50, nullable: true })
  errorCode?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'error_details', type: 'jsonb', nullable: true })
  errorDetails?: Record<string, unknown>;

  @Column({ name: 'processing_steps', type: 'jsonb', nullable: true })
  processingSteps?: ProcessingStepData[];

  @OneToOne('ExamAttempt', 'processingLog', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt!: unknown;
}

export interface ProcessingStepData {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  details?: Record<string, unknown>;
}
