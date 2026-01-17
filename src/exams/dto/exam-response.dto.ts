import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Examen Parcial Matemáticas' })
  title: string;

  @ApiPropertyOptional({ example: 'Primer parcial del curso de matemáticas' })
  description?: string;

  @ApiProperty({ example: 50 })
  totalQuestions: number;

  @ApiProperty({ example: 5 })
  answersPerQuestion: number;

  @ApiProperty({ example: '2025-12-15' })
  examDate: string;

  @ApiProperty({ example: 'draft' })
  status: string;

  @ApiProperty({ example: false })
  hasAnswerKey: boolean;

  @ApiProperty({ example: 30 })
  studentCount: number;

  @ApiProperty({ example: 25 })
  processedCount: number;

  @ApiProperty({ example: '2025-12-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-12-01T10:00:00.000Z' })
  updatedAt: string;
}
