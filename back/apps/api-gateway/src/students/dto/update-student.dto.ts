import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class UpdateStudentDto {
  @ApiPropertyOptional({
    description: 'Full name of the student',
    example: 'Juan Pérez García',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Student email address',
    example: 'juan.perez@example.com',
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;
}
