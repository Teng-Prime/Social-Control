import { appDb } from '../db';
import { PublishJob } from '../../../shared/types';

export class PublishJobRepository {
  public getAll(filter?: { status?: string; platform?: string; workflowStage?: string }): PublishJob[] {
    const db = appDb.getRawDb();
    let query = `
      SELECT p.id, p.media_asset_id as mediaAssetId, p.platform, p.account_id as accountId,
             sa.account_name as accountName, p.title, p.caption, p.hashtags, p.tags,
             p.privacy, p.scheduled_for as scheduledFor, p.status, p.progress,
             p.remote_post_id as remotePostId, p.remote_post_url as remotePostUrl,
             p.error_message as errorMessage, p.ai_disclosure as aiDisclosure,
             p.workflow_stage as workflowStage, p.phone_destination_path as phoneDestinationPath,
             p.confirmed_published_at as confirmedPublishedAt, p.selected_page_id as selectedPageId,
             p.selected_page_name as selectedPageName, p.associated_email as associatedEmail,
             p.created_at as createdAt, p.updated_at as updatedAt
      FROM publish_jobs p
      LEFT JOIN social_accounts sa ON p.account_id = sa.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.status && filter.status !== 'all') {
      query += ' AND p.status = ?';
      params.push(filter.status);
    }
    if (filter?.workflowStage && filter.workflowStage !== 'all') {
      query += ' AND p.workflow_stage = ?';
      params.push(filter.workflowStage);
    }
    if (filter?.platform && filter.platform !== 'all') {
      query += ' AND p.platform = ?';
      params.push(filter.platform);
    }

    query += ' ORDER BY p.created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => ({
      ...r,
      hashtags: typeof r.hashtags === 'string' ? JSON.parse(r.hashtags || '[]') : [],
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : [],
      aiDisclosure: Boolean(r.aiDisclosure),
      workflowStage: r.workflowStage || (r.status === 'published' ? 'published' : 'draft'),
    }));
  }

  public getById(id: string): PublishJob | null {
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT p.id, p.media_asset_id as mediaAssetId, p.platform, p.account_id as accountId,
             sa.account_name as accountName, p.title, p.caption, p.hashtags, p.tags,
             p.privacy, p.scheduled_for as scheduledFor, p.status, p.progress,
             p.remote_post_id as remotePostId, p.remote_post_url as remotePostUrl,
             p.error_message as errorMessage, p.ai_disclosure as aiDisclosure,
             p.workflow_stage as workflowStage, p.phone_destination_path as phoneDestinationPath,
             p.confirmed_published_at as confirmedPublishedAt, p.selected_page_id as selectedPageId,
             p.selected_page_name as selectedPageName, p.associated_email as associatedEmail,
             p.created_at as createdAt, p.updated_at as updatedAt
      FROM publish_jobs p
      LEFT JOIN social_accounts sa ON p.account_id = sa.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!r) return null;
    return {
      ...r,
      hashtags: typeof r.hashtags === 'string' ? JSON.parse(r.hashtags || '[]') : [],
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : [],
      aiDisclosure: Boolean(r.aiDisclosure),
      workflowStage: r.workflowStage || (r.status === 'published' ? 'published' : 'draft'),
    };
  }

  public create(job: Omit<PublishJob, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'status'> & { workflowStage?: string }): PublishJob {
    const db = appDb.getRawDb();
    const id = 'pub_' + Math.random().toString(36).substring(2, 11);

    // If accountId is phone-based, ensure social_accounts has a record for it so foreign keys stay valid
    if (job.accountId.startsWith('phone_')) {
      const existing = db.prepare('SELECT id FROM social_accounts WHERE id = ?').get(job.accountId);
      if (!existing) {
        db.prepare(`
          INSERT INTO social_accounts (id, platform, account_name, channel_id, is_connected, permissions, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, '["phone_direct_push"]', datetime('now'), datetime('now'))
        `).run(job.accountId, job.platform, 'Authorized Phone Device', job.accountId);
      }
    }

    const stmt = db.prepare(`
      INSERT INTO publish_jobs (
        id, media_asset_id, platform, account_id, title, caption,
        hashtags, tags, privacy, scheduled_for, status, progress,
        remote_post_id, remote_post_url, error_message, ai_disclosure,
        workflow_stage, phone_destination_path, confirmed_published_at,
        selected_page_id, selected_page_name, associated_email,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, 'draft', 0.0,
        NULL, NULL, NULL, ?,
        ?, ?, ?,
        ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `);

    stmt.run(
      id,
      job.mediaAssetId,
      job.platform,
      job.accountId,
      job.title,
      job.caption,
      JSON.stringify(job.hashtags || []),
      JSON.stringify(job.tags || []),
      job.privacy || 'public',
      job.scheduledFor || null,
      job.aiDisclosure ? 1 : 0,
      job.workflowStage || 'draft',
      job.phoneDestinationPath || null,
      job.confirmedPublishedAt || null,
      job.selectedPageId || null,
      job.selectedPageName || null,
      job.associatedEmail || null
    );

    return this.getById(id)!;
  }

  public update(id: string, updates: Partial<PublishJob>): PublishJob {
    const db = appDb.getRawDb();
    const current = this.getById(id);
    if (!current) throw new Error(`PublishJob not found: ${id}`);

    const newObj = { ...current, ...updates };
    const stmt = db.prepare(`
      UPDATE publish_jobs
      SET title = ?, caption = ?, hashtags = ?, tags = ?, privacy = ?,
          scheduled_for = ?, status = ?, progress = ?, remote_post_id = ?,
          remote_post_url = ?, error_message = ?, ai_disclosure = ?,
          workflow_stage = ?, phone_destination_path = ?, confirmed_published_at = ?,
          selected_page_id = ?, selected_page_name = ?, associated_email = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      newObj.title,
      newObj.caption,
      JSON.stringify(newObj.hashtags || []),
      JSON.stringify(newObj.tags || []),
      newObj.privacy,
      newObj.scheduledFor || null,
      newObj.status,
      newObj.progress,
      newObj.remotePostId || null,
      newObj.remotePostUrl || null,
      newObj.errorMessage || null,
      newObj.aiDisclosure ? 1 : 0,
      newObj.workflowStage || current.workflowStage || 'draft',
      newObj.phoneDestinationPath || current.phoneDestinationPath || null,
      newObj.confirmedPublishedAt || current.confirmedPublishedAt || null,
      newObj.selectedPageId || current.selectedPageId || null,
      newObj.selectedPageName || current.selectedPageName || null,
      newObj.associatedEmail || current.associatedEmail || null,
      id
    );

    // If published, record in published_posts
    if (newObj.status === 'published' && newObj.remotePostId) {
      db.prepare(`
        INSERT OR IGNORE INTO published_posts (
          id, publish_job_id, media_asset_id, platform, account_id,
          remote_post_id, remote_post_url, title, published_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
        )
      `).run(
        'post_' + Math.random().toString(36).substring(2, 11),
        id,
        newObj.mediaAssetId,
        newObj.platform,
        newObj.accountId,
        newObj.remotePostId,
        newObj.remotePostUrl || '',
        newObj.title
      );
    }

    return this.getById(id)!;
  }

  public delete(id: string): boolean {
    const db = appDb.getRawDb();
    const res = db.prepare('DELETE FROM publish_jobs WHERE id = ?').run(id);
    return res.changes > 0;
  }
}

export const publishJobRepo = new PublishJobRepository();
