import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from '../../../database/entities/exam.entity';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ExcelAdapter } from '../../../infrastructure/adapters/excel.adapter';
import { ExcelPort } from '../../../shared/interfaces/excel.port';
import { RedisRepository, RedisRepositoryPort } from '../../../shared/interfaces/redis.repository.port';
import { UploadExamStudentsEvent } from '../../domain/events/upload-exam-students.event';
import { EventBus } from '@nestjs/cqrs';

export class UploadExamStudentsCommand {
  constructor(
    public readonly file: { content: Buffer },
    public readonly examId: string,
  ) {}
}

export interface UploadExamStudentRow {
  CODE: string;
  FULL_NAME: string;
  EMAIL?: string;
}

@CommandHandler(UploadExamStudentsCommand)
export class UploadExamStudentsCommandHandler
  implements ICommandHandler<UploadExamStudentsCommand, void>
{
  private readonly headers = ['CODE', 'FULL_NAME'];
  private readonly logger = new Logger(UploadExamStudentsCommandHandler.name);

  constructor(
    @Inject(ExcelAdapter)
    private readonly excelPort: ExcelPort,
    @Inject(RedisRepository)
    private readonly redisRepositoryPort: RedisRepositoryPort,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UploadExamStudentsCommand) {
    this.logger.log(`Processing Excel upload for exam: ${command.examId}`);
    
    // 0. Validate Exam Exists
    const exam = await this.examRepository.findOneBy({ id: command.examId });
    if (!exam) {
        throw new NotFoundException(`Exam with ID ${command.examId} not found`);
    }

    // 1. Read Excel
    const worksheet = this.excelPort.readExcel(command.file.content);
    const rows = this.excelPort.convertSheetExcelToJson<UploadExamStudentRow>(
      worksheet,
      0,
    );

    // 2. Initial Validations
    if (rows.length === 0) {
      throw new BadRequestException('Excel file is empty or contains no data rows');
    }

    this.excelPort.validateNumberOfRows(rows, 2000);
    this.excelPort.validateHeaders(
      this.headers,
      Object.keys(rows[0]),
    );
    this.excelPort.validateValuesByColumn(rows, 'CODE');
    this.excelPort.validateValuesByColumn(rows, 'FULL_NAME');
    this.excelPort.validateDuplicatesByColumn(rows, 'CODE');

    this.logger.log(`Rows to process: ${rows.length}`);

    // 3. Store in Redis
    const timestamp = Date.now();
    const redisKey = `exam:${command.examId}:students:${timestamp}`;
    
    // Normalize and store
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const normalizedRow = {
            code: row.CODE?.trim(),
            fullName: row.FULL_NAME?.trim().toUpperCase(),
            email: row.EMAIL?.trim().toLowerCase(),
        };
        const rowKey = `${redisKey}:${i}`;
        await this.redisRepositoryPort.set(rowKey, JSON.stringify(normalizedRow), 3600); // 1 hour TTL
    }

    // 4. Emit Event for Async Processing
    const event = new UploadExamStudentsEvent(command.examId, redisKey);
    this.eventBus.publish(event);

    this.logger.log(
      `Rows stored in Redis with key pattern: ${redisKey}. Event emitted.`,
    );
  }
}
