import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '2020-0001' })
  code: string;

  @ApiProperty({ example: 'Juan Pérez' })
  fullName: string;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  email?: string;

  @ApiProperty({ example: 'registered' })
  status: string;

  @ApiProperty({ example: '2025-12-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-12-01T10:00:00.000Z' })
  updatedAt: string;

  // Attempt Details (Optional, only present when querying within an exam context)
  @ApiPropertyOptional({ example: 'completed' })
  attemptStatus?: string;

  @ApiPropertyOptional({ example: 18.5 })
  score?: number;

  @ApiPropertyOptional({ example: 18.2 })
  clientScore?: number;

  @ApiPropertyOptional({ example: 'https://minio...' })
  imageUrl?: string;
}
