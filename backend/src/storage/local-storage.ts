import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StorageProvider, PresignUploadResult, HeadResult } from './storage.interface';
import { config } from '../config';
import { logger } from '../logger';

export class LocalDiskStorageProvider implements StorageProvider {
  private baseDir: string;
  private secret: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || config.storage.localUploadDir;
    this.secret = config.jwt.accessSecret;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    // Prevent path traversal: resolve and ensure path stays inside baseDir
    const resolvedBase = path.resolve(this.baseDir);
    const resolvedPath = path.resolve(this.baseDir, key);
    if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
      throw new Error(`Path traversal detected for key: ${key}`);
    }
    return resolvedPath;
  }

  private generateToken(key: string, expiresAt: number, action: 'upload' | 'download'): string {
    const payload = `${action}:${key}:${expiresAt}`;
    return crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  public verifyToken(key: string, expiresAt: number, action: 'upload' | 'download', token: string): boolean {
    if (Date.now() > expiresAt) {
      return false;
    }
    const expected = this.generateToken(key, expiresAt, action);
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }

  async presignUpload(key: string, contentType: string, maxBytes: number, ttlSec: number): Promise<PresignUploadResult> {
    const expiresAt = Date.now() + ttlSec * 1000;
    const token = this.generateToken(key, expiresAt, 'upload');
    const baseUrl = config.publicApiUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/storage/local/upload?key=${encodeURIComponent(
      key
    )}&expires=${expiresAt}&token=${token}&contentType=${encodeURIComponent(contentType)}`;

    return {
      url,
      storageKey: key,
      headers: {
        'Content-Type': contentType,
      },
    };
  }

  async presignDownload(key: string, ttlSec: number): Promise<string> {
    const expiresAt = Date.now() + ttlSec * 1000;
    const token = this.generateToken(key, expiresAt, 'download');
    const baseUrl = config.publicApiUrl.replace(/\/+$/, '');
    return `${baseUrl}/storage/local/download?key=${encodeURIComponent(
      key
    )}&expires=${expiresAt}&token=${token}`;
  }

  async headObject(key: string): Promise<HeadResult> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Object not found: ${key}`);
    }
    const stat = await fs.promises.stat(filePath);
    return {
      size: stat.size,
      contentType: key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
    };
  }

  async deleteObject(key: string, _versionId?: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.info({ key, filePath }, 'Local storage file deleted');
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    const dirPath = this.getFilePath(prefix);
    if (fs.existsSync(dirPath)) {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
      logger.info({ prefix, dirPath }, 'Local storage prefix deleted');
    }
  }

  async getObjectBytes(key: string, maxBytes?: number): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Object not found: ${key}`);
    }

    if (maxBytes && maxBytes > 0) {
      const fd = await fs.promises.open(filePath, 'r');
      try {
        const buffer = Buffer.alloc(maxBytes);
        const { bytesRead } = await fd.read(buffer, 0, maxBytes, 0);
        return buffer.subarray(0, bytesRead);
      } finally {
        await fd.close();
      }
    }

    return await fs.promises.readFile(filePath);
  }

  async saveObjectBytes(key: string, data: Buffer): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, data);
  }

  async checkHealth(): Promise<boolean> {
    try {
      await fs.promises.access(this.baseDir, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}

