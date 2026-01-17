// ============================================
// API Response
// ============================================

export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: IApiError;
  meta?: IResponseMeta;
}

export interface IApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface IResponseMeta {
  timestamp: Date;
  requestId?: string;
  version?: string;
}

// ============================================
// Pagination
// ============================================

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IPaginatedResponse<T> {
  items: T[];
  meta: IPaginationMeta;
}

export interface IPaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================
// File Upload
// ============================================

export interface IFileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface IUploadedFile {
  url: string;
  bucket: string;
  key: string;
  size: number;
  mimetype: string;
  originalName: string;
}

// ============================================
// Health Check
// ============================================

export interface IHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: IServiceHealth[];
  uptime: number;
  version: string;
}

export interface IServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  details?: Record<string, unknown>;
}

// ============================================
// Configuration
// ============================================

export interface IDatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize?: boolean;
  logging?: boolean;
}

export interface IRedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface IMinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export interface IRabbitMQConfig {
  url: string;
  queue: string;
  exchange?: string;
}
