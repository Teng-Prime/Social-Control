import { describe, it, expect, beforeEach } from 'vitest';
import { analyticsService } from '../src/main/services/analyticsService';
import { publishedPostRepo } from '../src/main/database/repositories/publishedPostRepository';
import { publishJobRepo } from '../src/main/database/repositories/publishJobRepository';
import { mediaAssetRepo } from '../src/main/database/repositories/mediaAssetRepository';
import { appDb } from '../src/main/database/db';

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
    const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const assetId = 'asset_test_' + uniqueSuffix;
    const asset = mediaAssetRepo.create({
      id: assetId,
      title: 'The AI Paradox in Cyber City',
      filePath: `/tmp/test_paradox_${uniqueSuffix}.mp4`,
      fileName: `test_paradox_${uniqueSuffix}.mp4`,
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

  it('should return honest zero metrics and empty breakdowns when no posts exist without auto-seeding', async () => {
    // Purge posts to simulate fresh state
    const rawDb = appDb.getRawDb();
    rawDb.exec('DELETE FROM published_posts; DELETE FROM publish_jobs;');

    const summary = await analyticsService.getSummary('all', '30d');
    expect(summary.totalPosts).toBe(0);
    expect(summary.totalViews).toBe(0);
    expect(summary.totalLikes).toBe(0);
    expect(summary.totalComments).toBe(0);
    expect(summary.totalShares).toBe(0);
    expect(summary.totalWatchTimeHours).toBe(0);
    expect(summary.viewsGrowthPercent).toBe(0);
    expect(summary.avgRetentionPercent).toBe(0);
    expect(summary.genreBreakdown).toHaveLength(0);
    expect(summary.topPosts).toHaveLength(0);
    expect(summary.isAuditedLive).toBe(false);
    expect(summary.platformBreakdown.youtube.postsCount).toBe(0);
    expect(summary.platformBreakdown.youtube.views).toBe(0);
    expect(summary.platformBreakdown.youtube.avgRetentionPercent).toBe(0);
    expect(summary.durationBreakdown.every((d) => d.count === 0 && d.avgViews === 0 && d.retentionPercent === 0)).toBe(true);

    const syncRes = await analyticsService.syncLiveMetrics();
    expect(syncRes.success).toBe(false);
    expect(syncRes.updatedCount).toBe(0);
    expect(syncRes.message).toContain('No published posts found');
  });
});
