import { describe, it, expect, beforeEach } from 'vitest';
import { analyticsService } from '../src/main/services/analyticsService';
import { publishedPostRepo } from '../src/main/database/repositories/publishedPostRepository';
import { publishJobRepo } from '../src/main/database/repositories/publishJobRepository';
import { mediaAssetRepo } from '../src/main/database/repositories/mediaAssetRepository';

describe('Performance & Content Analytics Engine', () => {
  beforeEach(() => {
    publishedPostRepo.seedInitialDataIfEmpty();
  });

  it('should seed and retrieve initial published posts with metrics', () => {
    const posts = publishedPostRepo.getAll();
    expect(posts.length).toBeGreaterThanOrEqual(4);

    const first = posts[0];
    expect(first.title).toBeDefined();
    expect(first.views).toBeGreaterThan(0);
    expect(first.likes).toBeGreaterThan(0);
    expect(first.platform).toMatch(/youtube|tiktok|facebook/);
  });

  it('should calculate comprehensive analytics summary across all platforms', async () => {
    const summary = await analyticsService.getSummary('all', '30d');

    expect(summary.totalPosts).toBeGreaterThanOrEqual(4);
    expect(summary.totalViews).toBeGreaterThan(50000);
    expect(summary.totalLikes).toBeGreaterThan(1000);
    expect(summary.totalWatchTimeHours).toBeGreaterThan(10);
    expect(summary.likeToViewRatio).toBeGreaterThan(0);
    expect(summary.isAuditedLive).toBe(true);

    // Platform breakdown
    expect(summary.platformBreakdown.youtube).toBeDefined();
    expect(summary.platformBreakdown.youtube.views).toBeGreaterThan(0);
    expect(summary.platformBreakdown.tiktok).toBeDefined();
    expect(summary.platformBreakdown.tiktok.views).toBeGreaterThan(0);
    expect(summary.platformBreakdown.facebook).toBeDefined();
    expect(summary.platformBreakdown.facebook.views).toBeGreaterThan(0);

    // Genre & Duration breakdown
    expect(summary.genreBreakdown.length).toBeGreaterThan(0);
    expect(summary.durationBreakdown.length).toBe(3);
    expect(summary.topPosts.length).toBeGreaterThan(0);
  });

  it('should accurately filter analytics by platform', async () => {
    const ytSummary = await analyticsService.getSummary('youtube', '30d');
    expect(ytSummary.platformFilter).toBe('youtube');
    expect(ytSummary.topPosts.every((p) => p.platform === 'youtube')).toBe(true);

    const ttSummary = await analyticsService.getSummary('tiktok', '30d');
    expect(ttSummary.platformFilter).toBe('tiktok');
    expect(ttSummary.topPosts.every((p) => p.platform === 'tiktok')).toBe(true);
  });

  it('should synchronize live metrics and update views and engagement', async () => {
    const initialSummary = await analyticsService.getSummary('all', '30d');
    const initialViews = initialSummary.totalViews;

    const syncResult = await analyticsService.syncLiveMetrics();
    expect(syncResult.success).toBe(true);
    expect(syncResult.updatedCount).toBeGreaterThan(0);

    const updatedSummary = await analyticsService.getSummary('all', '30d');
    expect(updatedSummary.totalViews).toBeGreaterThan(initialViews);
    expect(updatedSummary.totalLikes).toBeGreaterThanOrEqual(initialSummary.totalLikes);
  });

  it('should record newly published posts and include them in analytics', async () => {
    const assetId = 'asset_test_' + Date.now();
    const asset = mediaAssetRepo.create({
      id: assetId,
      title: 'The AI Paradox in Cyber City',
      filePath: '/tmp/test_paradox.mp4',
      fileName: 'test_paradox.mp4',
      fileSize: 12000000,
      duration: 32,
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      format: 'mp4',
      thumbnailPath: '',
      tags: ['ai-story', 'mystery'],
      folder: 'Published',
      isFavorite: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const job = publishJobRepo.create({
      mediaAssetId: asset.id,
      platform: 'youtube',
      accountId: 'phone_test_dev',
      title: 'The AI Paradox in Cyber City',
      caption: 'What happens when machines dream?',
      hashtags: ['#viral', '#ai'],
      tags: ['mystery'],
      privacy: 'public',
      aiDisclosure: true,
    });

    const recorded = analyticsService.recordPublishedPost(
      job,
      'yt_remote_123',
      'https://youtube.com/shorts/yt_remote_123',
      asset
    );

    expect(recorded).toBeDefined();
    expect(recorded.title).toBe('The AI Paradox in Cyber City');
    expect(recorded.views).toBeGreaterThan(0);

    const postInRepo = publishedPostRepo.getByPublishJobId(job.id);
    expect(postInRepo).toBeDefined();
    expect(postInRepo?.remotePostId).toBe('yt_remote_123');
  });
});
