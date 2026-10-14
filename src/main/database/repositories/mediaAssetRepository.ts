import { appDb } from '../db';
import { MediaAsset } from '../../../shared/types';

export class MediaAssetRepository {
  public getAll(filter?: { folder?: string; query?: string; favorite?: boolean }): MediaAsset[] {
    const db = appDb.getRawDb();
    let query = `
      SELECT id, title, file_path as filePath, file_name as fileName, file_size as fileSize,
             duration, width, height, aspect_ratio as aspectRatio, format, thumbnail_path as thumbnailPath,
             tags, folder, is_favorite as isFavorite, project_id as projectId,
             created_at as createdAt, updated_at as updatedAt
      FROM media_assets
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.folder && filter.folder !== 'all') {
      query += ' AND folder = ?';
      params.push(filter.folder);
    }
    if (filter?.favorite !== undefined) {
      query += ' AND is_favorite = ?';
      params.push(filter.favorite ? 1 : 0);
    }
    if (filter?.query && filter.query.trim().length > 0) {
      query += ' AND (title LIKE ? OR file_name LIKE ? OR tags LIKE ?)';
      const wildcard = `%${filter.query.trim()}%`;
      params.push(wildcard, wildcard, wildcard);
    }

    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => ({
      ...r,
      isFavorite: Boolean(r.isFavorite),
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : [],
    }));
  }

  public getById(id: string): MediaAsset | null {
    const db = appDb.getRawDb();
    const row = db.prepare(`
      SELECT id, title, file_path as filePath, file_name as fileName, file_size as fileSize,
             duration, width, height, aspect_ratio as aspectRatio, format, thumbnail_path as thumbnailPath,
             tags, folder, is_favorite as isFavorite, project_id as projectId,
             created_at as createdAt, updated_at as updatedAt
      FROM media_assets
      WHERE id = ?
    `).get(id) as any;

    if (!row) return null;
    return {
      ...row,
      isFavorite: Boolean(row.isFavorite),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : [],
    };
  }

  public getByFilePath(filePath: string): MediaAsset | null {
    const db = appDb.getRawDb();
    const row = db.prepare(`
      SELECT id, title, file_path as filePath, file_name as fileName, file_size as fileSize,
             duration, width, height, aspect_ratio as aspectRatio, format, thumbnail_path as thumbnailPath,
             tags, folder, is_favorite as isFavorite, project_id as projectId,
             created_at as createdAt, updated_at as updatedAt
      FROM media_assets
      WHERE file_path = ?
    `).get(filePath) as any;

    if (!row) return null;
    return {
      ...row,
      isFavorite: Boolean(row.isFavorite),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : [],
    };
  }

  public create(asset: Partial<MediaAsset> & { title: string; filePath: string }): MediaAsset {
    const db = appDb.getRawDb();
    const id = asset.id || `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const stmt = db.prepare(`
      INSERT INTO media_assets (
        id, title, file_path, file_name, file_size, duration, width, height,
        aspect_ratio, format, thumbnail_path, tags, folder, is_favorite, project_id,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `);

    stmt.run(
      id,
      asset.title,
      asset.filePath,
      asset.fileName || '',
      asset.fileSize || 0,
      asset.duration || 0,
      asset.width || 0,
      asset.height || 0,
      asset.aspectRatio || '9:16',
      asset.format || 'mp4',
      asset.thumbnailPath || '',
      JSON.stringify(asset.tags || []),
      asset.folder || 'Drafts',
      asset.isFavorite ? 1 : 0,
      asset.projectId || null
    );

    return this.getById(id)!;
  }

  public update(id: string, updates: Partial<MediaAsset>): MediaAsset {
    const db = appDb.getRawDb();
    const current = this.getById(id);
    if (!current) throw new Error(`MediaAsset not found: ${id}`);

    const newObj = { ...current, ...updates, updatedAt: new Date().toISOString() };
    const stmt = db.prepare(`
      UPDATE media_assets
      SET title = ?, folder = ?, tags = ?, is_favorite = ?, thumbnail_path = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      newObj.title,
      newObj.folder,
      JSON.stringify(newObj.tags || []),
      newObj.isFavorite ? 1 : 0,
      newObj.thumbnailPath,
      id
    );

    return this.getById(id)!;
  }

  public delete(id: string): boolean {
    const db = appDb.getRawDb();
    const res = db.prepare('DELETE FROM media_assets WHERE id = ?').run(id);
    return res.changes > 0;
  }
}

export const mediaAssetRepo = new MediaAssetRepository();
