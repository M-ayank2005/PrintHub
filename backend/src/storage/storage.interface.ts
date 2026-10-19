export interface PresignUploadResult {
  url: string;
  storageKey: string;
  headers?: Record<string, string>;
}

export interface HeadResult {
  size: number;
  contentType: string;
  versionId?: string;
}

export interface StorageProvider {
  /**
   * Generates a presigned URL allowing the client to upload an object via HTTP PUT.
   */
  presignUpload(key: string, contentType: string, maxBytes: number, ttlSec: number): Promise<PresignUploadResult>;

  /**
   * Generates a short-lived presigned URL (e.g. 60s) allowing the agent to download the document.
   */
  presignDownload(key: string, ttlSec: number): Promise<string>;

  /**
   * Checks whether the object exists and returns size and metadata.
   */
  headObject(key: string): Promise<HeadResult>;

  /**
   * Permanently deletes the object (including versionId if versioned).
   */
  deleteObject(key: string, versionId?: string): Promise<void>;

  /**
   * Deletes all objects with the specified prefix (e.g. jobs/<jobId>/).
   */
  deletePrefix(prefix: string): Promise<void>;

  /**
   * Reads raw bytes (optionally first N bytes for magic header validation).
   */
  getObjectBytes(key: string, maxBytes?: number): Promise<Buffer>;
}
