import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadExamStudentsEvent } from '../../domain/events/upload-exam-students.event';
import { RedisRepository, RedisRepositoryPort } from '../../../shared/interfaces/redis.repository.port';
import { Student } from '../../../database/entities/student.entity';
import { ExamAttempt } from '../../../database/entities/exam-attempt.entity';
import { Exam } from '../../../database/entities/exam.entity';
import { StudentStatus, ProcessingStatus } from '@omr/shared-types';

interface ProcessedExamStudentRow {
    code: string;
    fullName: string;
    email?: string;
}

@Injectable()
export class UploadExamStudentsSubscriber {
  private readonly logger = new Logger(UploadExamStudentsSubscriber.name);
  constructor(
    @Inject(RedisRepository)
    private readonly redisRepositoryPort: RedisRepositoryPort,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(ExamAttempt)
    private readonly examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
  ) {}

  @OnEvent(UploadExamStudentsEvent.name)
  async handleUploadExamStudentsEvent(event: UploadExamStudentsEvent): Promise<void> {
    const { examId, redisKey } = event;

    try {
      this.logger.log(`Handling UploadExamStudentsEvent for exam ${examId}`);

      const exam = await this.examRepository.findOneBy({ id: examId });
      if (!exam) {
          this.logger.error(`Exam ${examId} not found`);
          return;
      }

      const pattern = `${redisKey}:*`;
      const rowKeys = await this.redisRepositoryPort.scanKeys(pattern);
      
      const processedStudents: ProcessedExamStudentRow[] = [];

      // Fetch from Redis
      for (const key of rowKeys) {
        const row = await this.redisRepositoryPort.get<ProcessedExamStudentRow>(key);
        if (row) {
            processedStudents.push(typeof row === 'string' ? JSON.parse(row) : row);
        }
      }

      for (const studentData of processedStudents) {
          try {
              await this.processStudent(studentData, examId);
          } catch (error) {
              this.logger.error(`Error processing student ${studentData.code}: ${error.message}`);
          }
      }

      this.logger.log(`Completed processing Excel upload for exam ${examId}`);

    } catch (error) {
      this.logger.error(
        `Error in handleUploadExamStudentsEvent: ${error.message}`,
      );
    }
  }

  private async processStudent(
    studentData: ProcessedExamStudentRow,
    examId: string,
  ): Promise<void> {
    // 1. Find or Create Student
    let student = await this.studentRepository.findOneBy({ code: studentData.code });

    if (!student) {
        student = this.studentRepository.create({
            code: studentData.code,
            fullName: studentData.fullName,
            email: studentData.email,
            status: StudentStatus.REGISTERED,
        });
        await this.studentRepository.save(student);
        this.logger.log(`Created new student: ${student.code}`);
    } else {
        // Update name if needed? For now, we assume existing student data is source of truth or we skip update
        // We could update null fields
        if (!student.email && studentData.email) {
            student.email = studentData.email;
            await this.studentRepository.save(student);
        }
    }

    // 2. Create ExamAttempt (Enrollment)
    const existingAttempt = await this.examAttemptRepository.findOneBy({
        examId: examId,
        studentId: student.id,
    });

    if (!existingAttempt) {
        const attempt = this.examAttemptRepository.create({
            examId: examId,
            studentId: student.id,
            status: ProcessingStatus.PENDING,
            imageUrl: '', // Or undefined since we made it nullable, but type definition might strict check
            // Note: DB column is nullable, but TS property might need optional modifier if not set
        });
        
        // Explicitly handle the nullable imageUrl if TS complains or runtime issues
        // Since we made it optional in entity, we can omit it. 
        // If TypeORM create method complains, we verify entity definition.
        
        await this.examAttemptRepository.save(attempt);
        this.logger.log(`Enrolled student ${student.code} in exam ${examId}`);
    } else {
        this.logger.log(`Student ${student.code} already enrolled in exam ${examId}`);
    }
  }
}
