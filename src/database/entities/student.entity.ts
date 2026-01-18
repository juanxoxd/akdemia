import {
  Entity,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { StudentStatus } from '@omr/shared-types';
import { BaseEntity } from './base.entity';
import { ExamAttempt } from './exam-attempt.entity';

@Entity('students')
export class Student extends BaseEntity {
  @Column({ length: 50, unique: true })
  @Index()
  code: string;

  @Column({ name: 'full_name', length: 255 })
  @Index()
  fullName: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.REGISTERED,
  })
  status: StudentStatus;

  @OneToMany(() => ExamAttempt, attempt => attempt.student)
  attempts!: ExamAttempt[];
}
