import { Injectable, NotFoundException, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamResponseDto } from './dto/exam-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { HTTP_MESSAGES, ExamStatus } from '@omr/shared-types';

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  // constructor(private readonly _configService: ConfigService) {}

  async create(createExamDto: CreateExamDto): Promise<ExamResponseDto> {
    this.logger.log(`Creating exam: ${createExamDto.examTitle}`);

    // TODO: Forward to exam-service via microservice communication
    // For now, return a mock response
    const examId = crypto.randomUUID();
    const now = new Date().toISOString();

    return {
      id: examId,
      title: createExamDto.examTitle,
      description: createExamDto.description,
      totalQuestions: createExamDto.totalQuestions,
      answersPerQuestion: createExamDto.answersPerQuestion,
      examDate: createExamDto.examDate,
      status: ExamStatus.DRAFT,
      hasAnswerKey: false,
      studentCount: 0,
      processedCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findAll(query: PaginationQueryDto) {
    this.logger.log(`Finding all exams with pagination: page=${query.page}, limit=${query.limit}`);

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

  async findOne(id: string): Promise<ExamResponseDto> {
    this.logger.log(`Finding exam: ${id}`);

    // TODO: Forward to exam-service
    throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
  }

  async update(id: string, _updateExamDto: UpdateExamDto): Promise<ExamResponseDto> {
    this.logger.log(`Updating exam: ${id}`);

    // TODO: Forward to exam-service
    throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing exam: ${id}`);

    // TODO: Forward to exam-service
    throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
  }

  async getStatistics(id: string) {
    this.logger.log(`Getting statistics for exam: ${id}`);

    // TODO: Forward to exam-service
    return {
      examId: id,
      totalStudents: 0,
      processedStudents: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      medianScore: 0,
      standardDeviation: 0,
      questionStatistics: [],
    };
  }
}
