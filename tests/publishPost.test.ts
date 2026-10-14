import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { socialPublisher } from '../src/main/services/social/socialPublisher';
import { publishJobRepo } from '../src/main/database/repositories/publishJobRepository';
import { mediaAssetRepo } from '../src/main/database/repositories/mediaAssetRepository';
import { deviceRepo } from '../src/main/database/repositories/deviceRepository';
import { storageService } from '../src/main/services/storageService';

describe('Publish Post Platform Readiness & Phone Destination Engine', () => {
  let testAssetId: string;
  let testFilePath: string;
  let testDeviceId: string;

  beforeEach(() => {
    // Create a mock video asset
    const draftsFolder = storageService.getFolder('Videos/Drafts');
    testFilePath = path.join(draftsFolder, `test_publish_${Date.now()}.mp4`);
    fs.writeFileSync(testFilePath, 'mock-video-binary-content');

    const asset = mediaAssetRepo.create({
      id: 'asset_pub_' + Date.now(),
      title: 'Echoes of the Void: Episode 1',
      filePath: testFilePath,
      fileName: path.basename(testFilePath),
      fileSize: 1024 * 1024 * 5, // 5MB
      duration: 35.0,
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      format: 'mp4',
      thumbnailPath: '',
      tags: ['ai-story', 'mystery'],
      folder: 'ReadyToPublish',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    testAssetId = asset.id;

    // Register a test Android phone
    const device = deviceRepo.upsertDevice({
      serial: 'TEST_PIXEL_7_ADB',
      model: 'Pixel 7 Pro',
      androidVersion: 'Android 14',
      status: 'connected',
      batteryLevel: 92,
      availableStorageMb: 45000,
      totalStorageMb: 128000,
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
    testDeviceId = device.id;
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

  it('Platform Update & Check We Can Post: should validate test queries and verify platform limits', async () => {
    // 1. YouTube Shorts check
    const ytCheck = await socialPublisher.checkPostReadiness({
      platform: 'youtube',
      deviceId: testDeviceId,
      mediaAssetId: testAssetId,
      checkQuery: 'Mindblowing mystery revealed! Can she decipher the transmission? #shorts #ai',
      title: 'Mindblowing Mystery Episode 1',
      caption: 'Full mystery revealed in 30 seconds.',
    });

    expect(ytCheck.platform).toBe('youtube');
    expect(ytCheck.platformLimits.maxTitleLength).toBe(100);
    expect(ytCheck.platformLimits.maxDurationSeconds).toBe(60);
    expect(ytCheck.canPost).toBe(true);

    const ytPhoneCheck = ytCheck.checks.find((c) => c.name.includes('Phone Connection'));
    expect(ytPhoneCheck?.passed).toBe(true);

    const ytAppCheck = ytCheck.checks.find((c) => c.name.includes('YouTube App'));
    expect(ytAppCheck?.passed).toBe(true);

    // 2. TikTok check with query length validation
    const ttCheck = await socialPublisher.checkPostReadiness({
      platform: 'tiktok',
      deviceId: testDeviceId,
      mediaAssetId: testAssetId,
      checkQuery: 'Short test hook #viral',
    });

    expect(ttCheck.platform).toBe('tiktok');
    expect(ttCheck.platformLimits.maxTitleLength).toBe(150);
    expect(ttCheck.canPost).toBe(true);

    // 3. Excessively long title check triggers warning/recommendation
    const longTitle = 'A'.repeat(120);
    const overflowCheck = await socialPublisher.checkPostReadiness({
      platform: 'youtube',
      deviceId: testDeviceId,
      mediaAssetId: testAssetId,
      title: longTitle,
    });

    const titleCheckItem = overflowCheck.checks.find((c) => c.name === 'Title Character Count');
    expect(titleCheckItem?.passed).toBe(false);
    expect(titleCheckItem?.severity).toBe('warn');
  });

  it('Phone Destination Publishing: should stage video to phone and launch target app', async () => {
    // Create a publish job targeting phone
    const job = publishJobRepo.create({
      mediaAssetId: testAssetId,
      platform: 'tiktok',
      accountId: `phone_${testDeviceId}`,
      title: 'Elena in the Rift',
      caption: 'What happened when she pressed the switch? Follow for part 2!',
      hashtags: ['#viral', '#mystery', '#storytime'],
      tags: ['studio'],
      privacy: 'public',
      aiDisclosure: true,
    });

    expect(job.id).toBeDefined();
    expect(job.accountId).toBe(`phone_${testDeviceId}`);

    // Execute phone publish
    const result = await socialPublisher.publish(job.id);
    expect(result.success).toBe(true);
    expect(result.remotePostUrl).toContain('Phone:');
    expect(result.message).toContain('Video transferred');

    // Verify job updated to published
    const updatedJob = publishJobRepo.getById(job.id);
    expect(updatedJob?.status).toBe('published');
    expect(updatedJob?.progress).toBe(100);

    // Verify asset moved to Published folder
    const updatedAsset = mediaAssetRepo.getById(testAssetId);
    expect(updatedAsset?.folder).toBe('Published');

    // Clean up job
    try {
      publishJobRepo.delete(job.id);
    } catch {}
  });
});
