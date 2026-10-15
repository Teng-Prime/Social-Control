import { mediaAssetRepo } from '../database/repositories/mediaAssetRepository';
import { projectRepo } from '../database/repositories/projectRepository';
import { ffmpegService } from './ffmpegService';
import { flowService } from './flowService';
import { activityLogService } from './activityLogService';
import {
  MediaAsset,
  VideoWorkflowStage,
  SocialPlatform,
  CaptionGenerationRequest,
} from '../../shared/types';
import fs from 'fs';
import path from 'path';

export class VideoStudioService {
  /**
   * Save or register a generated video MP4 in the local video library
   * Initial status: draft or ready, transferStatus: not_transferred
   */
  public async saveVideoToLibrary(params: {
    filePath: string;
    title: string;
    projectId?: string;
    targetPlatform?: SocialPlatform;
    captionText?: string;
    hashtagsText?: string[];
    workflowStatus?: VideoWorkflowStage;
  }): Promise<MediaAsset> {
    if (!fs.existsSync(params.filePath)) {
      throw new Error(`Video file does not exist: ${params.filePath}`);
    }

    const stats = fs.statSync(params.filePath);
    let duration = 60;
    let width = 1080;
    let height = 1920;
    let aspectRatio = '9:16';

    try {
      const probe = await ffmpegService.probeMedia(params.filePath);
      if (probe && probe.duration > 0) {
        duration = Math.round(probe.duration);
        width = probe.width || 1080;
        height = probe.height || 1920;
        aspectRatio = width > height ? '16:9' : width === height ? '1:1' : '9:16';
      }
    } catch {}

    let thumbnailPath = '';
    try {
      thumbnailPath = await ffmpegService.generateThumbnail(params.filePath);
    } catch {}

    const asset = mediaAssetRepo.create({
      title: params.title.trim(),
      filePath: params.filePath,
      fileName: path.basename(params.filePath),
      fileSize: stats.size,
      duration,
      width,
      height,
      aspectRatio,
      format: path.extname(params.filePath).replace('.', '') || 'mp4',
      thumbnailPath,
      folder: params.workflowStatus === 'ready' ? 'ReadyToPublish' : 'Drafts',
      projectId: params.projectId,
      workflowStatus: params.workflowStatus || 'draft',
      transferStatus: 'not_transferred',
      targetPlatform: params.targetPlatform || 'tiktok',
      captionText: params.captionText || '',
      hashtagsText: params.hashtagsText || [],
    });

    activityLogService.log(
      'info',
      'VideoStudio',
      `Saved video "${asset.title}" to library with status ${asset.workflowStatus}`,
      { assetId: asset.id, path: asset.filePath }
    );

    return asset;
  }

  /**
   * Generate AI titles, captions, descriptions, and hashtags for a video
   */
  public async generateVideoMetadata(req: CaptionGenerationRequest): Promise<{
    title: string;
    caption: string;
    description: string;
    hashtags: string[];
  }> {
    const res = await flowService.generateCaptions(req);
    const top = res.variations && res.variations.length > 0 ? res.variations[0] : null;
    return {
      title: top?.title || req.videoTitle || 'Untitled Video',
      caption: top?.caption || '',
      description: top?.caption || '',
      hashtags: top?.hashtags || [],
    };
  }

  /**
   * Transition video workflow status
   */
  public updateWorkflowStatus(assetId: string, status: VideoWorkflowStage): MediaAsset {
    const asset = mediaAssetRepo.getById(assetId);
    if (!asset) {
      throw new Error(`MediaAsset not found: ${assetId}`);
    }

    const folder =
      status === 'published'
        ? 'Published'
        : status === 'ready' || status === 'on_phone' || status === 'awaiting_review'
        ? 'ReadyToPublish'
        : 'Drafts';

    const updated = mediaAssetRepo.update(assetId, {
      workflowStatus: status,
      folder,
    });

    activityLogService.log(
      'info',
      'VideoStudio',
      `Updated video workflow stage for "${asset.title}" to ${status}`
    );

    return updated;
  }
}

export const videoStudioService = new VideoStudioService();
