import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { BulkCreateStudentsDto } from './dto/bulk-create-students.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('students')
@ApiBearerAuth()
@Controller('exams/:examId/students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a student for an exam' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Student registered successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Exam not found' })
  async registerStudent(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() createStudentDto: CreateStudentDto,
  ): Promise<StudentResponseDto> {
    return this.studentsService.registerStudent(examId, createStudentDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk register students for an exam' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Students registered successfully',
  })
  async bulkRegisterStudents(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() bulkDto: BulkCreateStudentsDto,
  ) {
    return this.studentsService.bulkRegisterStudents(examId, bulkDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all students for an exam' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of students',
  })
  async findAll(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.studentsService.findAllByExam(examId, query);
  }

  @Get(':studentId')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student details',
    type: StudentResponseDto,
  })
  async findOne(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<StudentResponseDto> {
    return this.studentsService.findOne(examId, studentId);
  }

  @Put(':studentId')
  @ApiOperation({ summary: 'Update student' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student updated',
    type: StudentResponseDto,
  })
  async update(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    return this.studentsService.update(examId, studentId, updateStudentDto);
  }

  @Delete(':studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove student from exam' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Student removed' })
  async remove(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<void> {
    return this.studentsService.remove(examId, studentId);
  }

  @Get(':studentId/result')
  @ApiOperation({ summary: 'Get student exam result' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student exam result',
  })
  async getResult(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.studentsService.getResult(examId, studentId);
  }
}
