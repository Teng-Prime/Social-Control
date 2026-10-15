import { mediaAssetRepo } from '../database/repositories/mediaAssetRepository';
import { ffmpegService } from './ffmpegService';
import { storageService } from './storageService';
import { activityLogService } from './activityLogService';
import { MediaAsset, VideoWorkflowStage } from '../../shared/types';
import fs from 'fs';
import path from 'path';

export class VideoLibraryService {
  public getAllVideos(filter?: {
    folder?: string;
    query?: string;
    favorite?: boolean;
    workflowStatus?: string;
  }): MediaAsset[] {
    return mediaAssetRepo.getAll(filter);
  }

  public getVideoById(id: string): MediaAsset | null {
    return mediaAssetRepo.getById(id);
  }

  public async importVideo(
    filePath: string,
    targetFolder: 'Drafts' | 'ReadyToPublish' | 'Published' = 'Drafts'
  ): Promise<MediaAsset> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const baseName = path.basename(filePath);
    const title = baseName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const destination = path.join(storageService.getFolder(`Videos/${targetFolder}`), baseName);

    // Copy to studio library directory if not already inside it
    if (path.resolve(filePath) !== path.resolve(destination)) {
      fs.copyFileSync(filePath, destination);
    }

    const stats = fs.statSync(destination);
    let duration = 60;
    let width = 1080;
    let height = 1920;
    let aspectRatio = '9:16';

    try {
      const probe = await ffmpegService.probeMedia(destination);
      if (probe && probe.duration > 0) {
        duration = Math.round(probe.duration);
        width = probe.width || 1080;
        height = probe.height || 1920;
        aspectRatio = width > height ? '16:9' : width === height ? '1:1' : '9:16';
      }
    } catch {}

    let thumbnailPath = '';
    try {
      thumbnailPath = await ffmpegService.generateThumbnail(destination);
    } catch {}

    const asset = mediaAssetRepo.create({
      title,
      filePath: destination,
      fileName: baseName,
      fileSize: stats.size,
      duration,
      width,
      height,
      aspectRatio,
      format: path.extname(destination).replace('.', '') || 'mp4',
      thumbnailPath,
      folder: targetFolder,
      workflowStatus: targetFolder === 'ReadyToPublish' ? 'ready' : 'draft',
      transferStatus: 'not_transferred',
    });

    activityLogService.log('info', 'VideoLibrary', `Imported video asset "${asset.title}"`, {
      assetId: asset.id,
      filePath: asset.filePath,
    });

    return asset;
  }

  public updateVideo(id: string, updates: Partial<MediaAsset>): MediaAsset {
    return mediaAssetRepo.update(id, updates);
  }

  public batchUpdateVideos(ids: string[], updates: Partial<MediaAsset>): MediaAsset[] {
    return mediaAssetRepo.batchUpdate(ids, updates);
  }

  public deleteVideo(id: string, deletePhysicalFile: boolean = false): boolean {
    const asset = mediaAssetRepo.getById(id);
    if (!asset) return false;

    if (deletePhysicalFile && fs.existsSync(asset.filePath)) {
      try {
        fs.unlinkSync(asset.filePath);
      } catch (err: any) {
        activityLogService.log('warn', 'VideoLibrary', `Failed to delete physical file: ${err.message}`);
      }
    }

    const deleted = mediaAssetRepo.delete(id);
    if (deleted) {
      activityLogService.log('info', 'VideoLibrary', `Deleted video asset "${asset.title}"`);
    }
    return deleted;
  }

  public batchDeleteVideos(ids: string[], deletePhysicalFiles: boolean = false): number {
    let count = 0;
    for (const id of ids) {
      if (this.deleteVideo(id, deletePhysicalFiles)) {
        count++;
      }
    }
    return count;
  }

  public setWorkflowStatus(id: string, workflowStatus: VideoWorkflowStage): MediaAsset {
    return mediaAssetRepo.update(id, { workflowStatus });
  }
}

export const videoLibraryService = new VideoLibraryService();
