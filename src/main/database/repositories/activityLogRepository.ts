import { appDb } from '../db';
import { ActivityLog } from '../../../shared/types';

export class ActivityLogRepository {
  public create(log: ActivityLog): void {
    const db = appDb.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO activity_logs (id, level, category, message, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(log.id, log.level, log.category, log.message, log.details || null, log.createdAt);
  }

  public getRecent(limit = 50, level?: string): ActivityLog[] {
    const db = appDb.getRawDb();
    if (level && level !== 'all') {
      return db.prepare(`
        SELECT id, level, category, message, details, created_at as createdAt
        FROM activity_logs
        WHERE level = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(level, limit) as ActivityLog[];
    }
    return db.prepare(`
      SELECT id, level, category, message, details, created_at as createdAt
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as ActivityLog[];
  }

  public clear(): void {
    const db = appDb.getRawDb();
    db.prepare('DELETE FROM activity_logs').run();
  }
}

export const activityLogRepo = new ActivityLogRepository();
