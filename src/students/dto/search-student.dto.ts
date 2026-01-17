import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProcessingStatus } from '@omr/shared-types';

export class SearchStudentDto {
  @ApiPropertyOptional({ description: 'Student code (exact match)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Student name (partial match)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Student email (exact match)' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Processing status', enum: ProcessingStatus })
  @IsOptional()
  @IsEnum(ProcessingStatus)
  status?: ProcessingStatus;
}
