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
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamResponseDto } from './dto/exam-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('exams')
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new exam' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Exam created successfully',
    type: ExamResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async createExam(@Body() createExamDto: CreateExamDto): Promise<ExamResponseDto> {
    return this.examsService.create(createExamDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all exams with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of exams',
  })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.examsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam by ID' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Exam details',
    type: ExamResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Exam not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ExamResponseDto> {
    return this.examsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Exam updated successfully',
    type: ExamResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Exam not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExamDto: UpdateExamDto,
  ): Promise<ExamResponseDto> {
    return this.examsService.update(id, updateExamDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Exam deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Exam not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.examsService.remove(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get exam statistics' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Exam statistics',
  })
  async getStatistics(@Param('id', ParseUUIDPipe) id: string) {
    return this.examsService.getStatistics(id);
  }
}
