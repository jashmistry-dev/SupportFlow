import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { config } from '../config.ts';

export interface IStorageService {
  saveFile(buffer: Buffer, originalName: string, mimeType: string): Promise<{
    storedName: string;
    filePath: string;
    fileUrl: string;
    size: number;
  }>;
  deleteFile(storedName: string): Promise<boolean>;
  getFilePath(storedName: string): string;
}

export class LocalDiskStorageService implements IStorageService {
  private baseDir: string;

  constructor(baseDir: string = config.uploadDir) {
    this.baseDir = baseDir;
    if (!fsSync.existsSync(this.baseDir)) {
      fsSync.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  // Prevent path traversal
  private sanitizeFilename(fileName: string): string {
    const basename = path.basename(fileName);
    return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  getFilePath(storedName: string): string {
    const safeName = path.basename(storedName);
    return path.join(this.baseDir, safeName);
  }

  async saveFile(buffer: Buffer, originalName: string, mimeType: string) {
    const ext = path.extname(originalName).toLowerCase() || '.bin';
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const storedName = `${timestamp}-${randomSuffix}${ext}`;
    const destinationPath = this.getFilePath(storedName);

    await fs.writeFile(destinationPath, buffer);

    return {
      storedName,
      filePath: destinationPath,
      fileUrl: `/uploads/${storedName}`,
      size: buffer.length,
    };
  }

  async deleteFile(storedName: string): Promise<boolean> {
    try {
      const destinationPath = this.getFilePath(storedName);
      await fs.unlink(destinationPath);
      return true;
    } catch (err) {
      console.warn(`Failed to delete stored file ${storedName}:`, err);
      return false;
    }
  }
}

export const storageService = new LocalDiskStorageService();
