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
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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

  @ApiProperty({
    description: 'List of correct answers (Answer Key)',
    example: [
      { questionNumber: 1, correctOption: 0, confidenceScore: 1 },
      { questionNumber: 2, correctOption: 2, confidenceScore: 1 }
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerDto)
  answers: CreateAnswerDto[];
}

export class CreateAnswerDto {
  @ApiProperty({ description: 'Question number (1-based)', example: 1 })
  @IsInt()
  @Min(1)
  questionNumber: number;

  @ApiProperty({ description: 'Correct option index (0-based: 0=A, 1=B, etc.)', example: 0 })
  @IsInt()
  @Min(0)
  correctOption: number;
}
