import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, PresignUploadResult, HeadResult } from './storage.interface';
import { config } from '../config';
import { logger } from '../logger';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = config.storage.s3.bucket;
    this.client = new S3Client({
      endpoint: config.storage.s3.endpoint,
      region: config.storage.s3.region,
      credentials: {
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async presignUpload(key: string, contentType: string, maxBytes: number, ttlSec: number): Promise<PresignUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: maxBytes,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: ttlSec });
    return {
      url,
      storageKey: key,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(maxBytes),
      },
    };
  }

  async presignDownload(key: string, ttlSec: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn: ttlSec });
  }

  async headObject(key: string): Promise<HeadResult> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      versionId: response.VersionId,
    };
  }

  async deleteObject(key: string, versionId?: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
      VersionId: versionId,
    });

    await this.client.send(command);
    logger.info({ key, versionId }, 'S3 Object permanently deleted');
  }

  async deletePrefix(prefix: string): Promise<void> {
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    const listRes = await this.client.send(listCommand);
    if (!listRes.Contents || listRes.Contents.length === 0) {
      return;
    }

    for (const item of listRes.Contents) {
      if (item.Key) {
        await this.deleteObject(item.Key);
      }
    }
    logger.info({ prefix, count: listRes.Contents.length }, 'S3 Prefix objects deleted');
  }

  async getObjectBytes(key: string, maxBytes?: number): Promise<Buffer> {
    const range = maxBytes && maxBytes > 0 ? `bytes=0-${maxBytes - 1}` : undefined;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Range: range,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Failed to retrieve object bytes for ${key}`);
    }

    const stream = response.Body as unknown as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async checkHealth(): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({ Bucket: this.bucket });
      await this.client.send(command);
      return true;
    } catch (err) {
      logger.error({ err, bucket: this.bucket }, 'S3 storage health check failed');
      return false;
    }
  }
}

