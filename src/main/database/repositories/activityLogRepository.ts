import crypto from 'crypto';
import { appDb } from '../db';
import { ActivityLog } from '../../../shared/types';

export class ActivityLogRepository {
  public create(log: Partial<ActivityLog> & { level: 'info' | 'warn' | 'error' | 'debug'; category: string; message: string }): ActivityLog {
    const db = appDb.getRawDb();
    const id = log.id || crypto.randomUUID();
    const createdAt = log.createdAt || new Date().toISOString();
    const details = log.details !== undefined ? log.details : null;

    const stmt = db.prepare(`
      INSERT INTO activity_logs (id, level, category, message, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, log.level, log.category, log.message, details, createdAt);

    return {
      id,
      level: log.level,
      category: log.category,
      message: log.message,
      details: log.details,
      createdAt,
    };
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

  public clear(): boolean {
    const db = appDb.getRawDb();
    db.prepare('DELETE FROM activity_logs').run();
    return true;
  }
}

export const activityLogRepo = new ActivityLogRepository();
