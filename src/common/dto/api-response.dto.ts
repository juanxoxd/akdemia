import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional({ example: 'Operation completed successfully' })
  message?: string;

  @ApiPropertyOptional()
  error?: ApiErrorDto;
}

export class ApiErrorDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiPropertyOptional()
  details?: Record<string, unknown>;
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}
