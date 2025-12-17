import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MINIO_CONSTANTS } from '@omr/shared-types';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
}

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client;
  private bucket: string;
  private endpoint: string;
  private port: number;
  private useSSL: boolean;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>('minio.endPoint') ?? MINIO_CONSTANTS.DEFAULT_HOST;
    this.port = this.configService.get<number>('minio.port', MINIO_CONSTANTS.DEFAULT_PORT);
    this.useSSL = this.configService.get<boolean>('minio.useSSL', false);
    this.bucket = this.configService.get<string>('minio.bucket') ?? MINIO_CONSTANTS.DEFAULT_BUCKET;

    const protocol = this.useSSL ? 'https' : 'http';
    const endpointUrl = `${protocol}://${this.endpoint}:${this.port}`;

    this.client = new S3Client({
      endpoint: endpointUrl,
      region: 'us-east-1', // MinIO ignora esto pero es requerido
      credentials: {
        accessKeyId: this.configService.get<string>('minio.accessKey', 'minioadmin'),
        secretAccessKey: this.configService.get<string>('minio.secretKey', 'minioadmin'),
      },
      forcePathStyle: true, // Importante para MinIO
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket '${this.bucket}' ya existe`);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        try {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
          this.logger.log(`Bucket '${this.bucket}' creado exitosamente`);
        } catch (createError) {
          this.logger.error(`Error creando bucket: ${createError}`);
        }
      } else {
        this.logger.warn(`No se pudo verificar bucket (MinIO puede no estar disponible): ${error.message}`);
      }
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    key: string,
  ): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        'original-name': encodeURIComponent(file.originalname),
      },
    });

    await this.client.send(command);

    const url = this.getFileUrl(key);
    this.logger.log(`Archivo subido: ${key}`);

    return {
      url,
      key,
      bucket: this.bucket,
      size: file.size,
    };
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.client.send(command);

    const url = this.getFileUrl(key);
    this.logger.log(`Buffer subido: ${key}`);

    return {
      url,
      key,
      bucket: this.bucket,
      size: buffer.length,
    };
  }

  async getFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    const stream = response.Body as Readable;

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
    this.logger.log(`Archivo eliminado: ${key}`);
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  getFileUrl(key: string): string {
    const protocol = this.useSSL ? 'https' : 'http';
    return `${protocol}://${this.endpoint}:${this.port}/${this.bucket}/${key}`;
  }

  async listFiles(prefix?: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    const response = await this.client.send(command);
    return response.Contents?.map((obj: { Key?: string }) => obj.Key!).filter(Boolean) || [];
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }
}
