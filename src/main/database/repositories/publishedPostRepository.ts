import { appDb } from '../db';
import { PublishedPost, SocialPlatform } from '../../../shared/types';
import { logger } from '../../logger';

export class PublishedPostRepository {
  public getAll(filter?: { platform?: string; timeframe?: string }): PublishedPost[] {
    const db = appDb.getRawDb();

    let query = `
      SELECT p.id, p.publish_job_id as publishJobId, p.media_asset_id as mediaAssetId,
             p.platform, p.account_id as accountId, p.remote_post_id as remotePostId,
             p.remote_post_url as remotePostUrl, p.title, p.views, p.likes,
             p.comments, p.shares, p.watch_time_seconds as watchTimeSeconds,
             p.last_analytics_sync as lastAnalyticsSync, p.published_at as publishedAt,
             m.thumbnail_path as thumbnailPath, m.duration as duration, m.tags as tags
      FROM published_posts p
      LEFT JOIN media_assets m ON p.media_asset_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.platform && filter.platform !== 'all') {
      query += ' AND p.platform = ?';
      params.push(filter.platform);
    }

    if (filter?.timeframe && filter.timeframe !== 'all') {
      const days = filter.timeframe === '7d' ? 7 : filter.timeframe === '30d' ? 30 : 90;
      query += ` AND datetime(p.published_at) >= datetime('now', '-${days} days')`;
    }

    query += ' ORDER BY p.views DESC, p.published_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => {
      let parsedTags: string[] = [];
      try {
        parsedTags = typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : r.tags || [];
      } catch {}

      const genreTag = parsedTags.find((t: string) =>
        ['mystery', 'action', 'emotional', 'horror', 'drama', 'comedy', 'adventure', 'romance'].includes(t.toLowerCase())
      );

      return {
        id: r.id,
        publishJobId: r.publishJobId,
        mediaAssetId: r.mediaAssetId,
        platform: r.platform as SocialPlatform,
        accountId: r.accountId,
        remotePostId: r.remotePostId,
        remotePostUrl: r.remotePostUrl,
        title: r.title,
        thumbnailPath: r.thumbnailPath || undefined,
        views: Number(r.views) || 0,
        likes: Number(r.likes) || 0,
        comments: Number(r.comments) || 0,
        shares: Number(r.shares) || 0,
        watchTimeSeconds: Number(r.watchTimeSeconds) || 0,
        lastAnalyticsSync: r.lastAnalyticsSync || undefined,
        publishedAt: r.publishedAt,
        duration: r.duration ? Number(r.duration) : 45,
        genre: genreTag || 'Mystery / Suspense',
      };
    });
  }

  public getById(id: string): PublishedPost | null {
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT p.id, p.publish_job_id as publishJobId, p.media_asset_id as mediaAssetId,
             p.platform, p.account_id as accountId, p.remote_post_id as remotePostId,
             p.remote_post_url as remotePostUrl, p.title, p.views, p.likes,
             p.comments, p.shares, p.watch_time_seconds as watchTimeSeconds,
             p.last_analytics_sync as lastAnalyticsSync, p.published_at as publishedAt,
             m.thumbnail_path as thumbnailPath, m.duration as duration, m.tags as tags
      FROM published_posts p
      LEFT JOIN media_assets m ON p.media_asset_id = m.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!r) return null;

    let parsedTags: string[] = [];
    try {
      parsedTags = typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : r.tags || [];
    } catch {}

    const genreTag = parsedTags.find((t: string) =>
      ['mystery', 'action', 'emotional', 'horror', 'drama', 'comedy', 'adventure', 'romance'].includes(t.toLowerCase())
    );

    return {
      id: r.id,
      publishJobId: r.publishJobId,
      mediaAssetId: r.mediaAssetId,
      platform: r.platform as SocialPlatform,
      accountId: r.accountId,
      remotePostId: r.remotePostId,
      remotePostUrl: r.remotePostUrl,
      title: r.title,
      thumbnailPath: r.thumbnailPath || undefined,
      views: Number(r.views) || 0,
      likes: Number(r.likes) || 0,
      comments: Number(r.comments) || 0,
      shares: Number(r.shares) || 0,
      watchTimeSeconds: Number(r.watchTimeSeconds) || 0,
      lastAnalyticsSync: r.lastAnalyticsSync || undefined,
      publishedAt: r.publishedAt,
      duration: r.duration ? Number(r.duration) : 45,
      genre: genreTag || 'Mystery / Suspense',
    };
  }

  public getByPublishJobId(jobId: string): PublishedPost | null {
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT id FROM published_posts WHERE publish_job_id = ?
    `).get(jobId) as any;
    return r ? this.getById(r.id) : null;
  }

  public create(post: Omit<PublishedPost, 'id'>): PublishedPost {
    const db = appDb.getRawDb();
    const id = 'post_' + Math.random().toString(36).substring(2, 11);

    const stmt = db.prepare(`
      INSERT INTO published_posts (
        id, publish_job_id, media_asset_id, platform, account_id,
        remote_post_id, remote_post_url, title, views, likes,
        comments, shares, watch_time_seconds, last_analytics_sync, published_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    const publishedAt = post.publishedAt || new Date().toISOString();
    const lastAnalyticsSync = post.lastAnalyticsSync || new Date().toISOString();

    stmt.run(
      id,
      post.publishJobId,
      post.mediaAssetId,
      post.platform,
      post.accountId,
      post.remotePostId,
      post.remotePostUrl,
      post.title,
      post.views || 0,
      post.likes || 0,
      post.comments || 0,
      post.shares || 0,
      post.watchTimeSeconds || 0,
      lastAnalyticsSync,
      publishedAt
    );

    return this.getById(id)!;
  }

  public updateMetrics(
    id: string,
    metrics: Partial<{
      views: number;
      likes: number;
      comments: number;
      shares: number;
      watchTimeSeconds: number;
      lastAnalyticsSync: string;
    }>
  ): boolean {
    const db = appDb.getRawDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (metrics.views !== undefined) {
      fields.push('views = ?');
      values.push(metrics.views);
    }
    if (metrics.likes !== undefined) {
      fields.push('likes = ?');
      values.push(metrics.likes);
    }
    if (metrics.comments !== undefined) {
      fields.push('comments = ?');
      values.push(metrics.comments);
    }
    if (metrics.shares !== undefined) {
      fields.push('shares = ?');
      values.push(metrics.shares);
    }
    if (metrics.watchTimeSeconds !== undefined) {
      fields.push('watch_time_seconds = ?');
      values.push(metrics.watchTimeSeconds);
    }
    if (metrics.lastAnalyticsSync !== undefined) {
      fields.push('last_analytics_sync = ?');
      values.push(metrics.lastAnalyticsSync);
    } else {
      fields.push("last_analytics_sync = datetime('now')");
    }

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE published_posts SET ${fields.join(', ')} WHERE id = ?`;
    const res = db.prepare(sql).run(...values);
    return res.changes > 0;
  }

  public seedInitialDataIfEmpty(): void {
    const db = appDb.getRawDb();
    const countRow = db.prepare('SELECT count(*) as count FROM published_posts').get() as { count: number };
    if (countRow && countRow.count > 0) {
      return;
    }

    logger.info('PublishedPostRepository', 'Seeding initial published posts for performance analytics demonstration...');

    const samplePosts = [
      {
        title: 'The Whispering Clock in the Forgotten Attic',
        platform: 'youtube' as SocialPlatform,
        genre: 'Mystery / Suspense',
        tag: 'mystery',
        duration: 42,
        views: 64200,
        likes: 5120,
        comments: 630,
        shares: 820,
        watchTimeSeconds: 228000,
        daysAgo: 18,
      },
      {
        title: 'Escape from the Cyber Nexus (Episode 1)',
        platform: 'tiktok' as SocialPlatform,
        genre: 'Adventure / Action',
        tag: 'action',
        duration: 34,
        views: 38100,
        likes: 2890,
        comments: 480,
        shares: 610,
        watchTimeSeconds: 114000,
        daysAgo: 12,
      },
      {
        title: 'The Letter She Never Sent Across Time',
        platform: 'facebook' as SocialPlatform,
        genre: 'Emotional / Heartfelt',
        tag: 'emotional',
        duration: 78,
        views: 15400,
        likes: 1120,
        comments: 240,
        shares: 180,
        watchTimeSeconds: 46200,
        daysAgo: 6,
      },
      {
        title: 'Do Not Turn Off The Lights Tonight...',
        platform: 'youtube' as SocialPlatform,
        genre: 'Horror / Thriller',
        tag: 'horror',
        duration: 38,
        views: 10750,
        likes: 690,
        comments: 140,
        shares: 120,
        watchTimeSeconds: 32000,
        daysAgo: 3,
      },
    ];

    db.transaction(() => {
      for (const s of samplePosts) {
        const assetId = 'asset_seed_' + Math.random().toString(36).substring(2, 9);
        const jobId = 'pub_seed_' + Math.random().toString(36).substring(2, 9);
        const postId = 'post_seed_' + Math.random().toString(36).substring(2, 9);
        const accountId = `phone_virtual_${s.platform}`;

        // Ensure social_account exists
        const accExists = db.prepare('SELECT id FROM social_accounts WHERE id = ?').get(accountId);
        if (!accExists) {
          db.prepare(`
            INSERT INTO social_accounts (id, platform, account_name, channel_id, is_connected, permissions, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, '["publish_video", "read_insights"]', datetime('now'), datetime('now'))
          `).run(accountId, s.platform, `Studio ${s.platform.toUpperCase()}`, accountId);
        }

        const filePath = `D:/Videos/Published/${s.title.replace(/[^a-zA-Z0-9]/g, '_')}_${assetId}.mp4`;
        const fileName = `${s.title.replace(/[^a-zA-Z0-9]/g, '_')}_${assetId}.mp4`;

        // Create Media Asset
        db.prepare(`
          INSERT OR IGNORE INTO media_assets (
            id, title, file_path, file_name, file_size, duration, width, height,
            aspect_ratio, format, thumbnail_path, tags, folder, is_favorite,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, 25000000, ?, 1080, 1920,
            '9:16', 'mp4', '', ?, 'Published', 1,
            datetime('now', '-${s.daysAgo} days'), datetime('now', '-${s.daysAgo} days')
          )
        `).run(
          assetId,
          s.title,
          filePath,
          fileName,
          s.duration,
          JSON.stringify(['viral', 'ai-story', s.tag, s.platform])
        );

        // Create Publish Job
        const remotePostUrl =
          s.platform === 'youtube'
            ? `https://youtube.com/shorts/${Math.random().toString(36).substring(2, 11)}`
            : s.platform === 'tiktok'
            ? `https://tiktok.com/@studio/video/${Math.random().toString(36).substring(2, 11)}`
            : `https://facebook.com/reel/${Math.random().toString(36).substring(2, 11)}`;

        db.prepare(`
          INSERT OR IGNORE INTO publish_jobs (
            id, media_asset_id, platform, account_id, title, caption,
            hashtags, tags, privacy, status, progress,
            remote_post_id, remote_post_url, ai_disclosure,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, 'Viral story short created with AI Studio',
            '["viral", "story"]', '["ai"]', 'public', 'published', 100.0,
            ?, ?, 1,
            datetime('now', '-${s.daysAgo} days'), datetime('now', '-${s.daysAgo} days')
          )
        `).run(jobId, assetId, s.platform, accountId, s.title, `post_${Date.now()}`, remotePostUrl);

        // Create Published Post
        db.prepare(`
          INSERT OR IGNORE INTO published_posts (
            id, publish_job_id, media_asset_id, platform, account_id,
            remote_post_id, remote_post_url, title, views, likes,
            comments, shares, watch_time_seconds, last_analytics_sync, published_at
          ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, datetime('now'), datetime('now', '-${s.daysAgo} days')
          )
        `).run(
          postId,
          jobId,
          assetId,
          s.platform,
          accountId,
          `post_${Date.now()}`,
          remotePostUrl,
          s.title,
          s.views,
          s.likes,
          s.comments,
          s.shares,
          s.watchTimeSeconds
        );
      }
    })();

    logger.info('PublishedPostRepository', 'Successfully seeded initial analytics data.');
  }
}

export const publishedPostRepo = new PublishedPostRepository();
