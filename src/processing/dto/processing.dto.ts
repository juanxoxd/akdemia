import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min, Max, IsArray, Allow } from 'class-validator';
import { PROCESSING_CONSTANTS } from '@omr/shared-types';

export class UploadAnswerKeyDto {
  // Allow 'file' property to pass validation - it's handled by FileInterceptor
  @Allow()
  file?: any;

  @ApiProperty({
    description: 'Total number of questions',
    example: 50,
    minimum: 1,
    maximum: 200,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(PROCESSING_CONSTANTS.MIN_QUESTIONS)
  @Max(PROCESSING_CONSTANTS.MAX_QUESTIONS)
  totalQuestions: number;

  @ApiPropertyOptional({
    description: 'Number of options per question (default: 5)',
    example: 5,
    minimum: 2,
    maximum: 10,
  })
  @Transform(({ value }) => (value ? parseInt(value, 10) : 5))
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(PROCESSING_CONSTANTS.MAX_OPTIONS_PER_QUESTION)
  optionsPerQuestion?: number = 5;
}

export class ConfirmAnswerKeyDto {
  @ApiPropertyOptional({
    description: 'Confirmed answers matrix (if modified by teacher)',
    example: [[0], [2], [1], [3], [0]],
  })
  @IsOptional()
  @IsArray()
  confirmedAnswers?: number[][];
}

export class SubmitStudentAnswerDto {
  // Allow 'file' property to pass validation - it's handled by FileInterceptor
  @Allow()
  file?: any;

  @ApiProperty({
    description: 'Total number of questions',
    example: 50,
    minimum: 1,
    maximum: 200,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(PROCESSING_CONSTANTS.MIN_QUESTIONS)
  @Max(PROCESSING_CONSTANTS.MAX_QUESTIONS)
  totalQuestions: number;

  @ApiPropertyOptional({
    description: 'Number of options per question (default: 5)',
    example: 5,
    minimum: 2,
    maximum: 10,
  })
  @Transform(({ value }) => (value ? parseInt(value, 10) : 5))
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(PROCESSING_CONSTANTS.MAX_OPTIONS_PER_QUESTION)
  optionsPerQuestion?: number = 5;
}

export class GetUploadUrlDto {
  @ApiProperty({
    description: 'File name (e.g., scan_page1.jpg)',
    example: 'scan_student_123.jpg',
  })
  fileName: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'image/jpeg',
  })
  fileType: string;

  @ApiProperty({
    description: 'Purpose of upload (answer-key or student-answer)',
    enum: ['answer-key', 'student-answer'],
    example: 'student-answer',
  })
  purpose: 'answer-key' | 'student-answer';
}

export class DetectedAnswerDto {
  @ApiProperty({
    description: 'Question number (1-based)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  questionNumber: number;

  @ApiProperty({
    description: 'Selected option (0-based index: 0=A, 1=B, etc.) or null if blank',
    example: 0,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  selectedOption: number | null;

  @ApiPropertyOptional({
    description: 'Confidence score (0.0 to 1.0)',
    example: 0.98,
  })
  @IsOptional()
  confidenceScore?: number;
}

export class SubmitAnswerKeyScanDto {
  @ApiProperty({
    description: 'S3 Key of the uploaded image',
    example: 'answer-keys/exam-123/scan.jpg',
  })
  imageKey: string;

  @ApiProperty({
    description: 'List of detected answers',
    type: [DetectedAnswerDto],
  })
  @IsArray()
  answers: DetectedAnswerDto[];

  @ApiProperty({
    description: 'Total questions detected',
    example: 50,
  })
  @IsInt()
  totalQuestions: number;
}

export class SubmitStudentScanDto {
  @ApiProperty({
    description: 'S3 Key of the uploaded image',
    example: 'student-answers/exam-123/student-456/scan.jpg',
  })
  imageKey: string;

  @ApiProperty({
    description: 'List of detected answers',
    type: [DetectedAnswerDto],
  })
  @IsArray()
  answers: DetectedAnswerDto[];

  @ApiProperty({
    description: 'Total questions',
    example: 50,
  })
  @IsInt()
  totalQuestions: number;
}

export class GetExamResultsDto {
  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page (default: 20)',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort order by score (ASC or DESC)',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
