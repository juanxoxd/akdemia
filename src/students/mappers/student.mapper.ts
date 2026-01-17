import { Student } from '@omr/database';
import { StudentModel } from '../domain/student.model';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { StudentResponseDto } from '../dto/student-response.dto';

export class StudentMapper {
  static toDomain(entity: Student): StudentModel {
    return new StudentModel({
      id: entity.id,
      code: entity.code,
      fullName: entity.fullName,
      email: entity.email,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toCreatePersistence(dto: CreateStudentDto): Partial<Student> {
    return {
      code: dto.studentCode,
      fullName: dto.fullName,
      email: dto.email,
    };
  }

  static toUpdatePersistence(dto: UpdateStudentDto): Partial<Student> {
    const partial: Partial<Student> = {};
    if (dto.fullName) partial.fullName = dto.fullName;
    if (dto.email) partial.email = dto.email;
    return partial;
  }

  static toPresentation(domain: StudentModel): StudentResponseDto {
    const dto = new StudentResponseDto();
    dto.id = domain.id;
    dto.code = domain.code;
    dto.fullName = domain.fullName;
    dto.email = domain.email;
    dto.status = domain.status;
    dto.createdAt = domain.createdAt instanceof Date ? domain.createdAt.toISOString() : String(domain.createdAt);
    dto.updatedAt = domain.updatedAt instanceof Date ? domain.updatedAt.toISOString() : String(domain.updatedAt);
    return dto;
  }
}
