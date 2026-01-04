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
