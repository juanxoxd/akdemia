import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProcessingService } from './processing.service';
import { MINIO_CONSTANTS } from '@omr/shared-types';
import {
  UploadAnswerKeyDto,
  ConfirmAnswerKeyDto,
  SubmitStudentAnswerDto,
} from './dto/processing.dto';

@ApiTags('processing')
@ApiBearerAuth()
@Controller('exams/:examId')
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  @Post('answer-key')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and process answer key image' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'totalQuestions'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Answer key image file',
        },
        totalQuestions: {
          type: 'integer',
          description: 'Total number of questions',
          example: 50,
        },
        optionsPerQuestion: {
          type: 'integer',
          description: 'Options per question (default: 5)',
          example: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Answer key processed successfully',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid image' })
  async uploadAnswerKey(
    @Param('examId', ParseUUIDPipe) examId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MINIO_CONSTANTS.MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|tiff)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadAnswerKeyDto,
  ) {
    return this.processingService.processAnswerKey(
      examId,
      file,
      body.totalQuestions,
      body.optionsPerQuestion,
    );
  }

  @Post('answer-key/confirm')
  @ApiOperation({ summary: 'Confirm processed answer key' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Answer key confirmed',
  })
  async confirmAnswerKey(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() body: ConfirmAnswerKeyDto,
  ) {
    return this.processingService.confirmAnswerKey(examId, body.confirmedAnswers);
  }

  @Post('students/:studentId/submit')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit student answer sheet' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'totalQuestions'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Student answer sheet image',
        },
        totalQuestions: {
          type: 'integer',
          description: 'Total number of questions',
          example: 50,
        },
        optionsPerQuestion: {
          type: 'integer',
          description: 'Options per question (default: 5)',
          example: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Answer sheet submitted for processing',
  })
  async submitStudentAnswer(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MINIO_CONSTANTS.MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|tiff)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: SubmitStudentAnswerDto,
  ) {
    // Obtener el answer key REAL de la base de datos
    const answerKey = await this.processingService.getAnswerKeyForProcessing(
      examId,
      body.totalQuestions,
    );
    
    return this.processingService.submitStudentAnswer(
      examId,
      studentId,
      file,
      answerKey,
      body.totalQuestions,
      body.optionsPerQuestion,
    );
  }
}
