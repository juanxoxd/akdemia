import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { APP_CONSTANTS } from '@omr/shared-types';

import { CustomLogger } from './infrastructure/adapters/custom.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security
  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  logger.log(`🌍 Environment: ${nodeEnv}`);
  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle(APP_CONSTANTS.NAME)
    .setDescription(APP_CONSTANTS.DESCRIPTION)
    .setVersion(APP_CONSTANTS.VERSION)
    .addBearerAuth()
    .addTag('exams', 'Exam management endpoints')
    .addTag('students', 'Student management endpoints')
    .addTag('processing', 'OMR processing endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
  logger.log(`📚 Swagger documentation available at /api/docs`);

  await app.listen(port);
  logger.log(`🚀 ${APP_CONSTANTS.NAME} is running on port ${port}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

bootstrap();
