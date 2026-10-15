import { publishJobRepo } from '../database/repositories/publishJobRepository';
import { mediaAssetRepo } from '../database/repositories/mediaAssetRepository';
import { socialAccountRepo } from '../database/repositories/socialAccountRepository';
import { deviceRepo } from '../database/repositories/deviceRepository';
import { appInstallationService } from './appInstallationService';
import { videoTransferService } from './videoTransferService';
import { youtubeAdapter } from './adapters/youtubeAdapter';
import { tiktokAdapter } from './adapters/tiktokAdapter';
import { facebookAdapter } from './adapters/facebookAdapter';
import { activityLogService } from './activityLogService';
import { analyticsService } from './analyticsService';
import {
  PublishJob,
  VideoWorkflowStage,
  PublishConfirmationRequest,
  DashboardMobileStats,
} from '../../shared/types';

export class PublishingQueueService {
  public getAllJobs(filter?: { status?: string; platform?: string; workflowStage?: string }): PublishJob[] {
    return publishJobRepo.getAll(filter);
  }

  public getJobById(id: string): PublishJob | null {
    return publishJobRepo.getById(id);
  }

  /**
   * Create a new publishing task in the queue
   */
  public createJob(jobData: {
    mediaAssetId: string;
    platform: 'youtube' | 'tiktok' | 'facebook';
    accountId: string;
    title: string;
    caption: string;
    hashtags?: string[];
    tags?: string[];
    privacy?: 'public' | 'unlisted' | 'private';
    scheduledFor?: string;
    selectedPageId?: string;
    selectedPageName?: string;
    associatedEmail?: string;
  }): PublishJob {
    const asset = mediaAssetRepo.getById(jobData.mediaAssetId);
    if (!asset) {
      throw new Error(`MediaAsset not found: ${jobData.mediaAssetId}`);
    }

    // Determine initial workflow stage
    let initialStage: VideoWorkflowStage = 'ready';
    if (asset.transferStatus === 'transferred' && asset.phonePath) {
      initialStage = 'on_phone';
    }

    const created = publishJobRepo.create({
      mediaAssetId: jobData.mediaAssetId,
      platform: jobData.platform,
      accountId: jobData.accountId,
      title: jobData.title,
      caption: jobData.caption,
      hashtags: jobData.hashtags || [],
      tags: jobData.tags || [],
      privacy: jobData.privacy || 'public',
      scheduledFor: jobData.scheduledFor,
      aiDisclosure: true,
      workflowStage: initialStage,
      selectedPageId: jobData.selectedPageId,
      selectedPageName: jobData.selectedPageName,
      associatedEmail: jobData.associatedEmail,
    });

    activityLogService.log(
      'info',
      'PublishingQueue',
      `Queued publishing task "${created.title}" for ${created.platform}`,
      { jobId: created.id, stage: initialStage }
    );

    return created;
  }

  /**
   * Start / advance publishing workflow on connected phone
   */
  public async advanceJobToPhone(
    jobId: string,
    deviceId?: string
  ): Promise<{ success: boolean; message: string; stage: VideoWorkflowStage }> {
    const job = publishJobRepo.getById(jobId);
    if (!job) throw new Error(`Publish job not found: ${jobId}`);

    // Check duplicate post prevention
    if (job.status === 'published' && job.remotePostId) {
      return {
        success: true,
        message: 'This video has already been published. Duplicate post prevented.',
        stage: 'published',
      };
    }

    const asset = mediaAssetRepo.getById(job.mediaAssetId);
    if (!asset) throw new Error(`Media asset not found: ${job.mediaAssetId}`);

    const targetDeviceId = deviceId || (job.accountId.startsWith('phone_') ? job.accountId.replace('phone_', '') : undefined);
    const devices = deviceRepo.getAll().filter((d) => d.status === 'connected');
    const selectedDev = targetDeviceId
      ? devices.find((d) => d.id === targetDeviceId || d.serial === targetDeviceId)
      : devices[0];

    if (!selectedDev) {
      throw new Error('No connected Android device found. Please connect your phone via USB or Wireless ADB.');
    }

    let phonePath = asset.phonePath;

    // Stage 1: Transfer video if not already on phone
    if (!asset.phonePath || asset.transferStatus !== 'transferred') {
      publishJobRepo.update(job.id, { workflowStage: 'transferring', status: 'publishing', progress: 30 });
      const transferRecord = await videoTransferService.transferVideo({
        mediaAssetId: asset.id,
        deviceId: selectedDev.id,
      });
      phonePath = transferRecord.destinationPath;
    }

    publishJobRepo.update(job.id, {
      workflowStage: 'on_phone',
      phoneDestinationPath: phonePath,
      progress: 60,
    });

    // Stage 2: Launch platform mobile app and prepare metadata
    publishJobRepo.update(job.id, { workflowStage: 'awaiting_review', progress: 85 });

    let launchResult: { success: boolean; message: string; formattedText: string };
    switch (job.platform) {
      case 'youtube':
        launchResult = await youtubeAdapter.launchUploadOnPhone(selectedDev.id, phonePath!, job);
        break;
      case 'tiktok':
        launchResult = await tiktokAdapter.launchUploadOnPhone(selectedDev.id, phonePath!, job);
        break;
      case 'facebook':
        launchResult = await facebookAdapter.launchUploadOnPhone(selectedDev.id, phonePath!, job);
        break;
      default:
        throw new Error(`Unsupported platform: ${job.platform}`);
    }

    activityLogService.log(
      'info',
      'PublishingQueue',
      `Advanced job "${job.title}" to awaiting_review on ${selectedDev.model}`,
      { jobId: job.id, platform: job.platform }
    );

    return {
      success: launchResult.success,
      message: launchResult.message,
      stage: 'awaiting_review',
    };
  }

  /**
   * Manual confirmation of published post
   * User confirms completion on phone and optionally enters post URL / ID
   */
  public confirmPublished(request: PublishConfirmationRequest): PublishJob {
    const job = publishJobRepo.getById(request.jobId);
    if (!job) throw new Error(`Publish job not found: ${request.jobId}`);

    const now = new Date().toISOString();
    const postId = request.remotePostId || `pub_${job.platform}_${Date.now()}`;
    const postUrl = request.remotePostUrl || (job.phoneDestinationPath ? `Phone: ${job.phoneDestinationPath}` : `https://${job.platform}.com`);

    const updated = publishJobRepo.update(job.id, {
      status: 'published',
      workflowStage: 'published',
      progress: 100,
      remotePostId: postId,
      remotePostUrl: postUrl,
      confirmedPublishedAt: now,
      errorMessage: undefined,
    });

    // Mark asset as Published
    mediaAssetRepo.update(job.mediaAssetId, {
      folder: 'Published',
      workflowStatus: 'published',
    });

    // Record in analytics
    try {
      const asset = mediaAssetRepo.getById(job.mediaAssetId);
      analyticsService.recordPublishedPost(job, postId, postUrl, asset || undefined);
    } catch {}

    activityLogService.log(
      'info',
      'PublishingQueue',
      `Confirmed publication of "${job.title}" on ${job.platform}`,
      { jobId: job.id, postId, postUrl }
    );

    return updated;
  }

  /**
   * Cancel or remove job from queue
   */
  public cancelJob(jobId: string): boolean {
    const job = publishJobRepo.getById(jobId);
    if (!job) return false;

    publishJobRepo.update(jobId, { status: 'failed', errorMessage: 'Cancelled by user.' });
    activityLogService.log('info', 'PublishingQueue', `Cancelled publishing task "${job.title}"`);
    return true;
  }

  /**
   * Retry a failed job
   */
  public retryJob(jobId: string): PublishJob {
    const job = publishJobRepo.getById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    return publishJobRepo.update(jobId, {
      status: 'draft',
      workflowStage: 'ready',
      progress: 0,
      errorMessage: undefined,
    });
  }

  /**
   * Aggregate statistics for dashboard
   */
  public async getDashboardMobileStats(): Promise<DashboardMobileStats> {
    const allAssets = mediaAssetRepo.getAll();
    const allJobs = publishJobRepo.getAll();
    const allAccounts = socialAccountRepo.getAll().filter((a) => a.isConnected);
    const connectedDevices = deviceRepo.getAll().filter((d) => d.status === 'connected');

    const totalGeneratedVideos = allAssets.length;
    const videosReadyToPublish = allAssets.filter(
      (a) => a.folder === 'ReadyToPublish' || a.workflowStatus === 'ready'
    ).length;
    const videosTransferredToPhone = allAssets.filter(
      (a) => a.transferStatus === 'transferred' || a.workflowStatus === 'on_phone'
    ).length;
    const successfullyPublishedVideos = allJobs.filter((j) => j.status === 'published').length;
    const failedPublishingTasks = allJobs.filter((j) => j.status === 'failed').length;
    const pendingPublishingTasks = allJobs.filter(
      (j) => j.status === 'draft' || j.status === 'scheduled' || j.status === 'publishing'
    ).length;

    let installedAppsCount = 0;
    try {
      if (connectedDevices.length > 0) {
        const apps = await appInstallationService.getAppStatus(connectedDevices[0].id);
        installedAppsCount = apps.filter((a) => a.isInstalled).length;
      }
    } catch {}

    const recentPublishingActivity = allJobs.slice(0, 8);

    return {
      totalGeneratedVideos,
      videosReadyToPublish,
      videosTransferredToPhone,
      successfullyPublishedVideos,
      failedPublishingTasks,
      pendingPublishingTasks,
      connectedDevicesCount: connectedDevices.length,
      installedAppsCount,
      connectedAccountsCount: allAccounts.length,
      recentPublishingActivity,
    };
  }
}

export const publishingQueueService = new PublishingQueueService();
