import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ProcessingService } from './processing.service';
import {
  GetUploadUrlDto,
  SubmitAnswerKeyScanDto,
  SubmitStudentScanDto,
  GetExamResultsDto,
} from './dto/processing.dto';

@ApiTags('processing')
@ApiBearerAuth()
@Controller('processing')
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  @Get('upload-url')
  @ApiOperation({ summary: 'Get presigned URL for direct image upload' })
  @ApiQuery({ name: 'examId', type: 'string' })
  @ApiQuery({ name: 'studentId', type: 'string', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Presigned URL generated',
  })
  async getUploadUrl(
    @Query('examId', ParseUUIDPipe) examId: string,
    @Query() query: GetUploadUrlDto,
    @Query('studentId') studentId?: string,
  ) {
    return this.processingService.getUploadUrl(
      examId,
      query.fileName,
      query.fileType,
      query.purpose,
      studentId,
    );
  }

  @Post('exams/:examId/answer-key')
  @ApiOperation({ summary: 'Submit processed answer key (JSON from Frontend)' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiBody({ type: SubmitAnswerKeyScanDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Answer key saved successfully',
  })
  async submitAnswerKey(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() body: SubmitAnswerKeyScanDto,
  ) {
    return this.processingService.submitAnswerKeyScan(
      examId,
      body.imageKey,
      body.answers,
      body.totalQuestions,
    );
  }

  @Post('exams/:examId/students/:studentId/submit')
  @ApiOperation({ summary: 'Submit processed student answer (JSON from Frontend)' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiBody({ type: SubmitStudentScanDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student answer processed and graded',
  })
  async submitStudentAnswer(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() body: SubmitStudentScanDto,
  ) {
    return this.processingService.submitStudentScan(
      examId,
      studentId,
      body.imageKey,
      body.answers,
      body.totalQuestions,
    );
  }

  @Get('attempts/:attemptId/image')
  @ApiOperation({ summary: 'Get temporary URL to view attempt image' })
  @ApiParam({ name: 'attemptId', description: 'Attempt ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image URL retrieved',
  })
  async getAttemptImage(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    return this.processingService.getAttemptImage(attemptId);
  }

  @Get('exams/:examId/results')
  @ApiOperation({ summary: 'Get paginated exam results (Merit Order)' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated results with merit order',
  })
  async getExamResults(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Query() query: GetExamResultsDto,
  ) {
    return this.processingService.getExamResults(
      examId,
      query.page || 1,
      query.limit || 20,
      query.sortOrder || 'DESC',
    );
  }
}
