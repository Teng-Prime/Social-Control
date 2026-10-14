import { appDb } from '../db';
import { TaskQueueItem, TaskStatus } from '../../../shared/types';

export class TaskQueueRepository {
  public getAll(filter?: { status?: TaskStatus }): TaskQueueItem[] {
    const db = appDb.getRawDb();
    let query = `
      SELECT id, type, title, payload, status, progress, priority,
             retry_count as retryCount, max_retries as maxRetries, error,
             created_at as createdAt, started_at as startedAt, completed_at as completedAt
      FROM task_queue
    `;
    const params: any[] = [];
    if (filter?.status) {
      query += ' WHERE status = ?';
      params.push(filter.status);
    }
    query += ' ORDER BY priority DESC, created_at ASC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => ({
      ...r,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload || '{}') : {},
    }));
  }

  public getById(id: string): TaskQueueItem | null {
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT id, type, title, payload, status, progress, priority,
             retry_count as retryCount, max_retries as maxRetries, error,
             created_at as createdAt, started_at as startedAt, completed_at as completedAt
      FROM task_queue
      WHERE id = ?
    `).get(id) as any;

    if (!r) return null;
    return {
      ...r,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload || '{}') : {},
    };
  }

  public create(task: {
    type: TaskQueueItem['type'];
    title: string;
    payload?: Record<string, any>;
    priority?: number;
    maxRetries?: number;
  }): TaskQueueItem {
    const db = appDb.getRawDb();
    const id = 'task_' + Math.random().toString(36).substring(2, 11);

    const stmt = db.prepare(`
      INSERT INTO task_queue (
        id, type, title, payload, status, progress, priority,
        retry_count, max_retries, error, created_at
      ) VALUES (
        ?, ?, ?, ?, 'pending', 0.0, ?,
        0, ?, NULL, datetime('now')
      )
    `);

    stmt.run(
      id,
      task.type,
      task.title,
      JSON.stringify(task.payload || {}),
      task.priority ?? 0,
      task.maxRetries ?? 3
    );

    return this.getById(id)!;
  }

  public update(id: string, updates: Partial<TaskQueueItem>): TaskQueueItem {
    const db = appDb.getRawDb();
    const current = this.getById(id);
    if (!current) throw new Error(`TaskQueueItem not found: ${id}`);

    const newObj = { ...current, ...updates };
    const stmt = db.prepare(`
      UPDATE task_queue
      SET status = ?, progress = ?, retry_count = ?, error = ?,
          started_at = CASE WHEN ? = 'running' AND started_at IS NULL THEN datetime('now') ELSE started_at END,
          completed_at = CASE WHEN ? IN ('completed', 'failed', 'cancelled') THEN datetime('now') ELSE completed_at END
      WHERE id = ?
    `);

    stmt.run(
      newObj.status,
      newObj.progress,
      newObj.retryCount,
      newObj.error || null,
      newObj.status,
      newObj.status,
      id
    );

    return this.getById(id)!;
  }

  public getNextPendingTask(): TaskQueueItem | null {
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT id, type, title, payload, status, progress, priority,
             retry_count as retryCount, max_retries as maxRetries, error,
             created_at as createdAt, started_at as startedAt, completed_at as completedAt
      FROM task_queue
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
    `).get() as any;

    if (!r) return null;
    return {
      ...r,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload || '{}') : {},
    };
  }

  public getSummary(): { pending: number; running: number; failed: number; completed: number } {
    const db = appDb.getRawDb();
    const rows = db.prepare('SELECT status, count(*) as count FROM task_queue GROUP BY status').all() as any[];
    const summary = { pending: 0, running: 0, failed: 0, completed: 0 };
    for (const r of rows) {
      if (r.status in summary) {
        summary[r.status as keyof typeof summary] = r.count;
      }
    }
    return summary;
  }

  public delete(id: string): boolean {
    const db = appDb.getRawDb();
    const res = db.prepare('DELETE FROM task_queue WHERE id = ?').run(id);
    return res.changes > 0;
  }
}

export const taskQueueRepo = new TaskQueueRepository();
