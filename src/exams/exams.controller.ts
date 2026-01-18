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
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommandBus } from '@nestjs/cqrs';
import { UploadExamStudentsCommand } from './application/commands/upload-exam-students.command';
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
import { ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('exams')
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly commandBus: CommandBus,
  ) {}

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

  @Post(':id/students/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload students to exam via Excel' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Students uploaded successfully',
  })
  async uploadStudents(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(spreadsheet|excel|csv|vnd.openxmlformats-officedocument.spreadsheetml.sheet)/, 
        })
        .addMaxSizeValidator({
          maxSize: 1024 * 1024 * 10, // 10MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.commandBus.execute(
      new UploadExamStudentsCommand({ content: file.buffer }, id),
    );
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
