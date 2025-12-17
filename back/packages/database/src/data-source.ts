import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { DATABASE_CONSTANTS } from '@omr/shared-types';
import { Exam, Student, ExamAttempt, Answer, ProcessingLog } from './entities';

const getDataSourceOptions = (): DataSourceOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || DATABASE_CONSTANTS.DEFAULT_HOST,
  port: parseInt(process.env.DB_PORT || String(DATABASE_CONSTANTS.DEFAULT_PORT), 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || DATABASE_CONSTANTS.DEFAULT_DATABASE,
  entities: [Exam, Student, ExamAttempt, Answer, ProcessingLog],
  migrations: ['dist/migrations/*.js'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.DB_LOGGING === 'true',
  connectTimeoutMS: DATABASE_CONSTANTS.CONNECTION_TIMEOUT,
  poolSize: DATABASE_CONSTANTS.MAX_CONNECTIONS,
});

export const AppDataSource = new DataSource(getDataSourceOptions());

export const createDataSource = (options?: Partial<DataSourceOptions>): DataSource => {
  return new DataSource({
    ...getDataSourceOptions(),
    ...options,
  } as DataSourceOptions);
};

export { DataSourceOptions };
