import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { PROCESSING_CONSTANTS } from '@omr/shared-types';

export class CreateExamDto {
  @ApiProperty({
    description: 'Title of the exam',
    example: 'Examen Parcial Matemáticas',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  examTitle: string;

  @ApiPropertyOptional({
    description: 'Description of the exam',
    example: 'Primer parcial del curso de matemáticas',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Total number of questions',
    example: 50,
    minimum: PROCESSING_CONSTANTS.MIN_QUESTIONS,
    maximum: PROCESSING_CONSTANTS.MAX_QUESTIONS,
  })
  @IsInt()
  @Min(PROCESSING_CONSTANTS.MIN_QUESTIONS)
  @Max(PROCESSING_CONSTANTS.MAX_QUESTIONS)
  totalQuestions: number;

  @ApiProperty({
    description: 'Number of answer options per question',
    example: 5,
    minimum: 2,
    maximum: PROCESSING_CONSTANTS.MAX_OPTIONS_PER_QUESTION,
  })
  @IsInt()
  @Min(2)
  @Max(PROCESSING_CONSTANTS.MAX_OPTIONS_PER_QUESTION)
  answersPerQuestion: number;

  @ApiProperty({
    description: 'Date of the exam',
    example: '2025-12-15',
  })
  @IsDateString()
  examDate: string;
}
