import { Injectable, NotFoundException, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { BulkCreateStudentsDto } from './dto/bulk-create-students.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { HTTP_MESSAGES, StudentStatus } from '@omr/shared-types';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  // constructor(private readonly _configService: ConfigService) {}

  async registerStudent(
    examId: string,
    createStudentDto: CreateStudentDto,
  ): Promise<StudentResponseDto> {
    this.logger.log(`Registering student ${createStudentDto.studentCode} for exam ${examId}`);

    // TODO: Forward to exam-service
    const studentId = crypto.randomUUID();
    const now = new Date().toISOString();

    return {
      id: studentId,
      code: createStudentDto.studentCode,
      fullName: createStudentDto.fullName,
      email: createStudentDto.email,
      status: StudentStatus.REGISTERED,
      createdAt: now,
      updatedAt: now,
    };
  }

  async bulkRegisterStudents(examId: string, bulkDto: BulkCreateStudentsDto) {
    this.logger.log(`Bulk registering ${bulkDto.students.length} students for exam ${examId}`);

    // TODO: Forward to exam-service
    return {
      created: bulkDto.students.length,
      failed: 0,
      errors: [],
    };
  }

  async findAllByExam(examId: string, query: PaginationQueryDto) {
    this.logger.log(`Finding all students for exam ${examId}`);

    // TODO: Forward to exam-service
    return {
      items: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: query.limit,
        totalPages: 0,
        currentPage: query.page,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  async findOne(examId: string, studentId: string): Promise<StudentResponseDto> {
    this.logger.log(`Finding student ${studentId} for exam ${examId}`);

    // TODO: Forward to exam-service
    throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
  }

  async update(
    examId: string,
    studentId: string,
    _updateStudentDto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    this.logger.log(`Updating student ${studentId} for exam ${examId}`);

    // TODO: Forward to exam-service
    throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
  }

  async remove(examId: string, studentId: string): Promise<void> {
    this.logger.log(`Removing student ${studentId} from exam ${examId}`);

    // TODO: Forward to exam-service
    throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
  }

  async getResult(examId: string, studentId: string) {
    this.logger.log(`Getting result for student ${studentId} in exam ${examId}`);

    // TODO: Forward to exam-service
    throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
  }
}
