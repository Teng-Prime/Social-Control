import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';

export class StorageService {
  private baseDirectory: string;

  constructor(customDirectory?: string) {
    if (customDirectory && fs.existsSync(customDirectory)) {
      this.baseDirectory = customDirectory;
    } else {
      // Default to user's home directory or app documents
      const homeDir = app ? app.getPath('documents') : path.join(os.homedir(), 'Documents');
      this.baseDirectory = path.join(homeDir, 'SocialEarningsStudio');
    }
    this.ensureDirectoryStructure();
  }

  public getBaseDirectory(): string {
    return this.baseDirectory;
  }

  public setBaseDirectory(newDir: string): void {
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }
    this.baseDirectory = newDir;
    this.ensureDirectoryStructure();
  }

  public getFolder(subfolder: string): string {
    const target = path.join(this.baseDirectory, subfolder);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    return target;
  }

  public getAllFolders(): Record<string, string> {
    return {
      root: this.baseDirectory,
      characters: this.getFolder('Characters'),
      projects: this.getFolder('Projects'),
      videosDrafts: this.getFolder('Videos/Drafts'),
      videosReady: this.getFolder('Videos/ReadyToPublish'),
      videosPublished: this.getFolder('Videos/Published'),
      thumbnails: this.getFolder('Thumbnails'),
      audio: this.getFolder('Audio'),
      captions: this.getFolder('Captions'),
      exports: this.getFolder('Exports'),
      logs: this.getFolder('Logs'),
    };
  }

  public ensureDirectoryStructure(): void {
    const folders = [
      '',
      'Characters',
      'Projects',
      'Videos',
      'Videos/Drafts',
      'Videos/ReadyToPublish',
      'Videos/Published',
      'Thumbnails',
      'Audio',
      'Captions',
      'Exports',
      'Logs',
      'Data',
    ];

    for (const folder of folders) {
      const fullPath = path.join(this.baseDirectory, folder);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  public async getDiskSpace(): Promise<{ freeBytes: number; totalBytes: number; usedBytes: number }> {
    try {
      if (typeof fs.promises.statfs === 'function') {
        const stats = await fs.promises.statfs(this.baseDirectory);
        const free = stats.bfree * stats.bsize;
        const total = stats.blocks * stats.bsize;
        return {
          freeBytes: free,
          totalBytes: total,
          usedBytes: total - free,
        };
      }
    } catch {
      // Fallback estimate if statfs fails
    }
    return {
      freeBytes: 100 * 1024 * 1024 * 1024,
      totalBytes: 500 * 1024 * 1024 * 1024,
      usedBytes: 400 * 1024 * 1024 * 1024,
    };
  }

  public isSafePath(filePath: string): boolean {
    const resolved = path.resolve(filePath);
    return !resolved.includes('..') && fs.existsSync(resolved);
  }
}

export const storageService = new StorageService();
