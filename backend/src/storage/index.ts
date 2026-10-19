import { config } from '../config';
import { StorageProvider } from './storage.interface';
import { LocalDiskStorageProvider } from './local-storage';
import { S3StorageProvider } from './s3-storage';
import { logger } from '../logger';

export * from './storage.interface';
export * from './local-storage';
export * from './s3-storage';

let storageInstance: StorageProvider;

export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    if (config.storage.driver === 's3' && config.storage.s3.accessKeyId) {
      logger.info('Initializing S3/B2 Storage Provider');
      storageInstance = new S3StorageProvider();
    } else {
      logger.info('Initializing Local Disk Storage Provider');
      storageInstance = new LocalDiskStorageProvider();
    }
  }
  return storageInstance;
}

export function setStorageProvider(customProvider: StorageProvider): void {
  storageInstance = customProvider;
}
