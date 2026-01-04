import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam, ExamAttempt } from '@omr/database';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamResponseDto } from './dto/exam-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { HTTP_MESSAGES, ExamStatus } from '@omr/shared-types';

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepository: Repository<ExamAttempt>,
  ) {}

  async create(createExamDto: CreateExamDto): Promise<ExamResponseDto> {
    this.logger.log(`Creating exam: ${createExamDto.examTitle}`);

    const exam = this.examRepository.create({
      title: createExamDto.examTitle,
      description: createExamDto.description,
      totalQuestions: createExamDto.totalQuestions,
      answersPerQuestion: createExamDto.answersPerQuestion,
      examDate: new Date(createExamDto.examDate),
      status: ExamStatus.DRAFT,
    });

    const savedExam = await this.examRepository.save(exam);
    this.logger.log(`Exam created with ID: ${savedExam.id}`);

    return this.mapToResponseDto(savedExam);
  }

  async findAll(query: PaginationQueryDto) {
    this.logger.log(`Finding all exams with pagination: page=${query.page}, limit=${query.limit}`);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.examRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: items.map(exam => this.mapToResponseDto(exam)),
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

  async findOne(id: string): Promise<ExamResponseDto> {
    this.logger.log(`Finding exam: ${id}`);

    const exam = await this.examRepository.findOne({
      where: { id },
      relations: ['attempts'],
    });

    if (!exam) {
      throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
    }

    return this.mapToResponseDto(exam);
  }

  async update(id: string, updateExamDto: UpdateExamDto): Promise<ExamResponseDto> {
    this.logger.log(`Updating exam: ${id}`);

    const exam = await this.examRepository.findOne({ where: { id } });

    if (!exam) {
      throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
    }

    // Update entity fields directly
    if (updateExamDto.examTitle) exam.title = updateExamDto.examTitle;
    if (updateExamDto.description !== undefined) exam.description = updateExamDto.description;
    if (updateExamDto.totalQuestions) exam.totalQuestions = updateExamDto.totalQuestions;
    if (updateExamDto.answersPerQuestion) exam.answersPerQuestion = updateExamDto.answersPerQuestion;
    if (updateExamDto.examDate) exam.examDate = new Date(updateExamDto.examDate);

    const updatedExam = await this.examRepository.save(exam);
    return this.mapToResponseDto(updatedExam);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing exam: ${id}`);

    const exam = await this.examRepository.findOne({ where: { id } });

    if (!exam) {
      throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
    }

    await this.examRepository.delete(id);
    this.logger.log(`Exam ${id} deleted successfully`);
  }

  async getStatistics(id: string) {
    this.logger.log(`Getting statistics for exam: ${id}`);

    const exam = await this.examRepository.findOne({
      where: { id },
      relations: ['attempts'],
    });

    if (!exam) {
      throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
    }

    const attempts = await this.attemptRepository.find({
      where: { examId: id },
    });

    const processedAttempts = attempts.filter((a: ExamAttempt) => a.score !== null && a.score !== undefined);
    const scores = processedAttempts.map((a: ExamAttempt) => Number(a.score));

    const totalStudents = attempts.length;
    const processedStudents = processedAttempts.length;
    const averageScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    // Calculate median
    const sortedScores = [...scores].sort((a: number, b: number) => a - b);
    const medianScore = sortedScores.length > 0
      ? sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
        : sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;

    // Calculate standard deviation
    const variance = scores.length > 0
      ? scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length
      : 0;
    const standardDeviation = Math.sqrt(variance);

    return {
      examId: id,
      totalStudents,
      processedStudents,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore,
      lowestScore,
      medianScore: Math.round(medianScore * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      questionStatistics: [], // TODO: Calculate per-question stats from Answer entities
    };
  }

  async updateAnswerKey(id: string, answerKey: { answers: Array<{ questionNumber: number; correctOption: number; confidenceScore: number }> }, imageUrl?: string, confidence?: number): Promise<ExamResponseDto> {
    this.logger.log(`Updating answer key for exam: ${id}`);

    const exam = await this.examRepository.findOne({ where: { id } });

    if (!exam) {
      throw new NotFoundException(HTTP_MESSAGES.NOT_FOUND);
    }

    exam.answerKey = answerKey;
    if (imageUrl) exam.answerKeyImageUrl = imageUrl;
    if (confidence) exam.answerKeyConfidence = confidence;
    exam.answerKeyProcessedAt = new Date();
    exam.status = ExamStatus.ACTIVE;

    const savedExam = await this.examRepository.save(exam);
    return this.mapToResponseDto(savedExam);
  }

  private mapToResponseDto(exam: Exam): ExamResponseDto {
    const studentCount = exam.attempts?.length || 0;
    const processedCount = exam.attempts?.filter((a: ExamAttempt) => a.processedAt !== null).length || 0;

    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      totalQuestions: exam.totalQuestions,
      answersPerQuestion: exam.answersPerQuestion,
      examDate: exam.examDate instanceof Date ? exam.examDate.toISOString().split('T')[0] : String(exam.examDate),
      status: exam.status,
      hasAnswerKey: !!exam.answerKey,
      studentCount,
      processedCount,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
    };
  }
}
