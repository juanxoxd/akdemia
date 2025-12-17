import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { CreateStudentDto } from './create-student.dto';

export class BulkCreateStudentsDto {
  @ApiProperty({
    description: 'Array of students to register',
    type: [CreateStudentDto],
    minItems: 1,
    maxItems: 500,
  })
  @ValidateNested({ each: true })
  @Type(() => CreateStudentDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  students: CreateStudentDto[];
}
