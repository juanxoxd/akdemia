import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Student, ExamAttempt, Exam, Answer } from '@omr/database';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { BulkCreateStudentsDto } from './dto/bulk-create-students.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { SearchStudentDto } from './dto/search-student.dto';
import { HTTP_MESSAGES, StudentStatus, ProcessingStatus } from '@omr/shared-types';
import { StudentMapper } from './mappers/student.mapper';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    private readonly dataSource: DataSource,
  ) {}

  async registerStudent(
    examId: string,
    createStudentDto: CreateStudentDto,
  ): Promise<StudentResponseDto> {
    this.logger.log(`Registering student ${createStudentDto.studentCode} for exam ${examId}`);

    // Verify exam exists
    const exam = await this.examRepository.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Check if student with code already exists
    let student = await this.studentRepository.findOne({
      where: { code: createStudentDto.studentCode },
    });

    if (!student) {
      // Create new student
      student = this.studentRepository.create({
        code: createStudentDto.studentCode,
        fullName: createStudentDto.fullName,
        email: createStudentDto.email,
        status: StudentStatus.REGISTERED,
      });
      student = await this.studentRepository.save(student);
      this.logger.log(`Created new student with ID: ${student.id}`);
    }

    // Check if attempt already exists for this exam
    const existingAttempt = await this.attemptRepository.findOne({
      where: { examId, studentId: student.id },
    });

    if (existingAttempt) {
      throw new ConflictException('Student already registered for this exam');
    }

    // Create exam attempt (placeholder for when student submits answer sheet)
    const attempt = this.attemptRepository.create({
      examId,
      studentId: student.id,
      imageUrl: '', // Will be set when student uploads answer sheet
      status: ProcessingStatus.PENDING,
    });
    await this.attemptRepository.save(attempt);

    return StudentMapper.toPresentation(StudentMapper.toDomain(student));
  }

  async bulkRegisterStudents(examId: string, bulkDto: BulkCreateStudentsDto) {
    this.logger.log(`Bulk registering ${bulkDto.students.length} students for exam ${examId}`);

    // Verify exam exists
    const exam = await this.examRepository.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const results = {
      created: 0,
      failed: 0,
      errors: [] as Array<{ studentCode: string; error: string }>,
    };

    // Use transaction for bulk insert
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const studentDto of bulkDto.students) {
        try {
          // Check if student exists
          let student = await queryRunner.manager.findOne(Student, {
            where: { code: studentDto.studentCode },
          });

          if (!student) {
            student = queryRunner.manager.create(Student, {
              code: studentDto.studentCode,
              fullName: studentDto.fullName,
              email: studentDto.email,
              status: StudentStatus.REGISTERED,
            });
            student = await queryRunner.manager.save(student);
          }

          // Check if already registered
          const existingAttempt = await queryRunner.manager.findOne(ExamAttempt, {
            where: { examId, studentId: student.id },
          });

          if (!existingAttempt) {
            const attempt = queryRunner.manager.create(ExamAttempt, {
              examId,
              studentId: student.id,
              imageUrl: '',
              status: ProcessingStatus.PENDING,
            });
            await queryRunner.manager.save(attempt);
            results.created++;
          } else {
            results.errors.push({
              studentCode: studentDto.studentCode,
              error: 'Already registered for this exam',
            });
            results.failed++;
          }
        } catch (error) {
          results.errors.push({
            studentCode: studentDto.studentCode,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          results.failed++;
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return results;
  }

  async findAllByExam(examId: string, query: PaginationQueryDto) {
    this.logger.log(`Finding all students for exam ${examId}`);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Get attempts for this exam with student relation
    const [attempts, totalItems] = await this.attemptRepository.findAndCount({
      where: { examId },
      relations: ['student'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    const items = attempts.map(attempt => {
        const studentDomain = StudentMapper.toDomain(attempt.student);
        const studentDto = StudentMapper.toPresentation(studentDomain);
        return {
            ...studentDto,
            attemptId: attempt.id,
            attemptStatus: attempt.status,
            score: attempt.score,
            processedAt: attempt.processedAt?.toISOString(),
        }
    });

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(examId: string, studentId: string): Promise<StudentResponseDto> {
    this.logger.log(`Finding student ${studentId} for exam ${examId}`);

    const attempt = await this.attemptRepository.findOne({
      where: { examId, studentId },
      relations: ['student'],
    });

    if (!attempt) {
      throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
    }

    return StudentMapper.toPresentation(StudentMapper.toDomain(attempt.student));
  }

  async update(
    examId: string,
    studentId: string,
    updateStudentDto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    this.logger.log(`Updating student ${studentId} for exam ${examId}`);

    const student = await this.studentRepository.findOne({ where: { id: studentId } });

    if (!student) {
      throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
    }

    // Update fields
    if (updateStudentDto.fullName) student.fullName = updateStudentDto.fullName;
    if (updateStudentDto.email !== undefined) student.email = updateStudentDto.email;

    const updatedStudent = await this.studentRepository.save(student);
    return StudentMapper.toPresentation(StudentMapper.toDomain(updatedStudent));
  }

  async remove(examId: string, studentId: string): Promise<void> {
    this.logger.log(`Removing student ${studentId} from exam ${examId}`);

    const attempt = await this.attemptRepository.findOne({
      where: { examId, studentId },
    });

    if (!attempt) {
      throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
    }

    // Delete the attempt (student remains in database for other exams)
    await this.attemptRepository.delete(attempt.id);
    this.logger.log(`Student ${studentId} removed from exam ${examId}`);
  }

  async getResult(examId: string, studentId: string) {
    this.logger.log(`Getting result for student ${studentId} in exam ${examId}`);

    const attempt = await this.attemptRepository.findOne({
      where: { examId, studentId },
      relations: ['student', 'answers'],
    });

    if (!attempt) {
      throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
    }

    const studentDomain = StudentMapper.toDomain(attempt.student);

    return {
      examId,
      studentId,
      attemptId: attempt.id,
      student: StudentMapper.toPresentation(studentDomain),
      status: attempt.status,
      score: attempt.score,
      totalCorrect: attempt.totalCorrect,
      totalIncorrect: attempt.totalIncorrect,
      totalBlank: attempt.totalBlank,
      confidenceScore: attempt.confidenceScore,
      processedAt: attempt.processedAt?.toISOString(),
      answers: attempt.answers?.map((a: Answer) => ({
        questionNumber: a.questionNumber,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
      })) || [],
    };
  }

  /**
   * Search students by criteria
   */
  async searchStudents(examId: string, searchDto: SearchStudentDto) {
    this.logger.log(`Searching students for exam ${examId} with criteria: ${JSON.stringify(searchDto)}`);

    // Build query with joins
    const queryBuilder = this.attemptRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.student', 'student')
      .where('attempt.examId = :examId', { examId });

    // Apply filters
    if (searchDto.code) {
      queryBuilder.andWhere('student.code = :code', { code: searchDto.code });
    }

    if (searchDto.name) {
      queryBuilder.andWhere('student.fullName ILIKE :name', { name: `%${searchDto.name}%` });
    }

    if (searchDto.email) {
      queryBuilder.andWhere('student.email = :email', { email: searchDto.email });
    }

    if (searchDto.status) {
      queryBuilder.andWhere('attempt.status = :status', { status: searchDto.status });
    }

    const attempts = await queryBuilder.getMany();

    return {
      count: attempts.length,
      items: attempts.map(attempt => {
        const studentDomain = StudentMapper.toDomain(attempt.student);
        const studentDto = StudentMapper.toPresentation(studentDomain);
        return {
            ...studentDto,
            attemptId: attempt.id,
            attemptStatus: attempt.status,
            score: attempt.score,
            processedAt: attempt.processedAt?.toISOString(),
        }
      }),
    };
  }
}
