import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({
    description: 'Student code/ID',
    example: '2020-0001',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message: 'Student code can only contain alphanumeric characters, hyphens, and underscores',
  })
  studentCode: string;

  @ApiProperty({
    description: 'Full name of the student',
    example: 'Juan Pérez',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @ApiPropertyOptional({
    description: 'Student email address',
    example: 'juan@example.com',
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;
}
