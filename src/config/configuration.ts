import { SERVICE_PORTS, MINIO_CONSTANTS, REDIS_CONSTANTS, DATABASE_CONSTANTS } from '@omr/shared-types';

export default () => ({
  // Server
  port: parseInt(process.env.PORT || String(SERVICE_PORTS.API_GATEWAY), 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Services
  services: {
    examService: {
      host: process.env.EXAM_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.EXAM_SERVICE_PORT || String(SERVICE_PORTS.EXAM_SERVICE), 10),
    },
    omrProcessor: {
      host: process.env.OMR_PROCESSOR_HOST || 'localhost',
      port: parseInt(process.env.OMR_PROCESSOR_PORT || String(SERVICE_PORTS.OMR_PROCESSOR), 10),
      baseUrl: process.env.OMR_PROCESSOR_URL || `http://localhost:${SERVICE_PORTS.OMR_PROCESSOR}`,
    },
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || REDIS_CONSTANTS.DEFAULT_HOST,
    port: parseInt(process.env.REDIS_PORT || String(REDIS_CONSTANTS.DEFAULT_PORT), 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // RabbitMQ
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  },

  // MinIO
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || MINIO_CONSTANTS.DEFAULT_HOST,
    port: parseInt(process.env.MINIO_PORT || String(MINIO_CONSTANTS.DEFAULT_PORT), 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || MINIO_CONSTANTS.DEFAULT_BUCKET,
  },

  // Database
  database: {
    host: process.env.DB_HOST || DATABASE_CONSTANTS.DEFAULT_HOST,
    port: parseInt(process.env.DB_PORT || String(DATABASE_CONSTANTS.DEFAULT_PORT), 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || DATABASE_CONSTANTS.DEFAULT_DATABASE,
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.DB_LOGGING === 'true',
  },
});
