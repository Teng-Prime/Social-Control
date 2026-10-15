import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { videoStudioService } from '../src/main/services/videoStudioService';
import { videoLibraryService } from '../src/main/services/videoLibraryService';
import { appInstallationService } from '../src/main/services/appInstallationService';
import { videoTransferService } from '../src/main/services/videoTransferService';
import { accountService } from '../src/main/services/accountService';
import { emailVerificationService } from '../src/main/services/emailVerificationService';
import { publishingQueueService } from '../src/main/services/publishingQueueService';
import { storageService } from '../src/main/services/storageService';
import { deviceRepo } from '../src/main/database/repositories/deviceRepository';
import { mediaAssetRepo } from '../src/main/database/repositories/mediaAssetRepository';
import { publishJobRepo } from '../src/main/database/repositories/publishJobRepository';
import { socialAccountRepo } from '../src/main/database/repositories/socialAccountRepository';

describe('Mobile Publishing Suite: PC Video Studio → Phone → Social Media Publishing', () => {
  let testAssetId: string;
  let testFilePath: string;
  let testDeviceId: string;

  beforeEach(() => {
    // 1. Create a mock video file on PC
    const draftsFolder = storageService.getFolder('Videos/Drafts');
    testFilePath = path.join(draftsFolder, `suite_video_${Date.now()}.mp4`);
    fs.writeFileSync(testFilePath, 'suite-video-sample-binary-payload-data');

    // 2. Register mock Android device
    const dev = deviceRepo.upsertDevice({
      serial: 'TEST_PHONE_STUDIO_SUITE',
      model: 'Samsung Galaxy S24 Ultra',
      androidVersion: 'Android 14',
      status: 'connected',
      batteryLevel: 98,
      availableStorageMb: 85000,
      totalStorageMb: 256000,
      installedApps: [
        {
          packageName: 'com.google.android.youtube',
          appName: 'YouTube',
          isInstalled: true,
          playStoreUrl: '',
        },
        {
          packageName: 'com.zhiliaoapp.musically',
          appName: 'TikTok',
          isInstalled: true,
          playStoreUrl: '',
        },
        {
          packageName: 'com.facebook.katana',
          appName: 'Facebook',
          isInstalled: true,
          playStoreUrl: '',
        },
      ],
    });
    testDeviceId = dev.id;
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      try {
        fs.unlinkSync(testFilePath);
      } catch {}
    }
    if (testAssetId) {
      try {
        mediaAssetRepo.delete(testAssetId);
      } catch {}
    }
  });

  it('1. Video Studio: should save video to library with full metadata and workflow status', async () => {
    const asset = await videoStudioService.saveVideoToLibrary({
      filePath: testFilePath,
      title: 'Neon Odyssey: Episode 1',
      targetPlatform: 'youtube',
      captionText: 'Lost in the quantum grid. What happens when the core awakens? #shorts #scifi',
      hashtagsText: ['#shorts', '#scifi', '#neon'],
      workflowStatus: 'ready',
    });

    testAssetId = asset.id;
    expect(asset.id).toBeDefined();
    expect(asset.title).toBe('Neon Odyssey: Episode 1');
    expect(asset.workflowStatus).toBe('ready');
    expect(asset.transferStatus).toBe('not_transferred');
    expect(asset.folder).toBe('ReadyToPublish');

    // Update workflow status
    const updated = videoStudioService.updateWorkflowStatus(asset.id, 'awaiting_review');
    expect(updated.workflowStatus).toBe('awaiting_review');
  });

  it('2. App Installation: should query supported social apps and handle Play Store verification', async () => {
    const apps = await appInstallationService.getAppStatus(testDeviceId);
    expect(apps.length).toBeGreaterThanOrEqual(4);

    const ytApp = apps.find((a) => a.packageName === 'com.google.android.youtube');
    expect(ytApp).toBeDefined();
    expect(ytApp?.appName).toBe('YouTube');

    const verify = await appInstallationService.verifyInstalled(testDeviceId, 'com.google.android.youtube');
    expect(verify.isInstalled).toBe(true);

    const playStore = await appInstallationService.openPlayStoreListing(testDeviceId, 'com.google.android.youtube');
    expect(playStore.success).toBe(true);
  });

  it('3. Video Transfer: should transfer video to phone, verify size/checksum, and update status', async () => {
    const asset = await videoStudioService.saveVideoToLibrary({
      filePath: testFilePath,
      title: 'Rift Runner Part 2',
      workflowStatus: 'ready',
    });
    testAssetId = asset.id;

    const record = await videoTransferService.transferVideo({
      mediaAssetId: asset.id,
      deviceId: testDeviceId,
      destinationFolder: '/sdcard/Movies/MyVideoStudio',
    });

    expect(record.status).toBe('completed');
    expect(record.destinationPath).toContain('/sdcard/Movies/MyVideoStudio');
    expect(record.isVerified).toBe(true);
    expect(record.mediaScanTriggered).toBe(true);

    // Verify asset metadata updated
    const updatedAsset = mediaAssetRepo.getById(asset.id);
    expect(updatedAsset?.transferStatus).toBe('transferred');
    expect(updatedAsset?.workflowStatus).toBe('on_phone');
    expect(updatedAsset?.phonePath).toBe(record.destinationPath);

    // Verify history records
    const records = videoTransferService.getTransferRecords(testDeviceId);
    expect(records.length).toBeGreaterThan(0);
    expect(records[0].fileName).toBe(path.basename(testFilePath));
  });

  it('4. Account & Email: should associate email with account, handle OTP verification without storing passwords, and manage Facebook Pages', async () => {
    // 1. Create Facebook Account
    const fbAccount = accountService.createOrUpdateAccount({
      platform: 'facebook',
      accountName: 'TechVanguard Creator',
      email: 'creator@techvanguard.ai',
    });

    expect(fbAccount.id).toBeDefined();
    expect(fbAccount.platform).toBe('facebook');

    // 2. Associate & verify email
    const emailInfo = emailVerificationService.associateEmail({
      accountId: fbAccount.id,
      email: 'creator@techvanguard.ai',
      platform: 'facebook',
      notes: 'Official primary publishing email',
    });
    expect(emailInfo.email).toBe('creator@techvanguard.ai');
    expect(emailInfo.isVerified).toBe(false);

    // 3. Submit manual OTP
    const otpResult = emailVerificationService.verifyOtp({
      accountId: fbAccount.id,
      email: 'creator@techvanguard.ai',
      otpCode: '849201',
      platform: 'facebook',
    });
    expect(otpResult.success).toBe(true);

    const verifiedEmail = emailVerificationService.getAccountEmail(fbAccount.id);
    expect(verifiedEmail?.isVerified).toBe(true);

    // 4. Update Facebook Page assignment
    const updatedPage = accountService.updateSelectedPage(
      fbAccount.id,
      'page_1092837465',
      'TechVanguard Official Page'
    );
    expect(updatedPage).toBe(true);

    const updatedAccount = socialAccountRepo.getById(fbAccount.id);
    expect(updatedAccount?.selectedPageId).toBe('page_1092837465');
    expect(updatedAccount?.selectedPageName).toBe('TechVanguard Official Page');
  });

  it('5. Publishing Queue: should advance workflow, prevent duplicate posts, and support manual completion confirmation', async () => {
    const asset = await videoStudioService.saveVideoToLibrary({
      filePath: testFilePath,
      title: 'Cosmic Encounter Short',
      workflowStatus: 'ready',
    });
    testAssetId = asset.id;

    // 1. Create queue job
    const job = publishingQueueService.createJob({
      mediaAssetId: asset.id,
      platform: 'tiktok',
      accountId: `phone_${testDeviceId}`,
      title: 'Cosmic Encounter',
      caption: 'Look at what was detected at 3 AM! #fyp #mystery',
      hashtags: ['#fyp', '#viral'],
    });

    expect(job.id).toBeDefined();
    expect(job.workflowStage).toBe('ready');

    // 2. Advance to phone (transfers & launches app)
    const advanceRes = await publishingQueueService.advanceJobToPhone(job.id, testDeviceId);
    expect(advanceRes.success).toBe(true);
    expect(advanceRes.stage).toBe('awaiting_review');

    const jobInReview = publishingQueueService.getJobById(job.id);
    expect(jobInReview?.workflowStage).toBe('awaiting_review');
    expect(jobInReview?.phoneDestinationPath).toBeDefined();

    // 3. User completes on phone and confirms publication
    const confirmedJob = publishingQueueService.confirmPublished({
      jobId: job.id,
      remotePostUrl: 'https://www.tiktok.com/@creator/video/9876543210',
      remotePostId: 'tt_9876543210',
    });

    expect(confirmedJob.status).toBe('published');
    expect(confirmedJob.workflowStage).toBe('published');
    expect(confirmedJob.remotePostId).toBe('tt_9876543210');
    expect(confirmedJob.confirmedPublishedAt).toBeDefined();

    // 4. Duplicate post prevention: advancing already published job is rejected safely
    const duplicateAttempt = await publishingQueueService.advanceJobToPhone(job.id, testDeviceId);
    expect(duplicateAttempt.stage).toBe('published');
    expect(duplicateAttempt.message).toContain('Duplicate post prevented');
  });

  it('6. Mobile Dashboard Stats: should aggregate real metrics across generated, ready, transferred, and published', async () => {
    const stats = await publishingQueueService.getDashboardMobileStats();
    expect(stats.totalGeneratedVideos).toBeGreaterThanOrEqual(0);
    expect(stats.connectedDevicesCount).toBeGreaterThanOrEqual(1);
    expect(stats.installedAppsCount).toBeGreaterThanOrEqual(1);
    expect(stats.recentPublishingActivity).toBeDefined();
  });
});
