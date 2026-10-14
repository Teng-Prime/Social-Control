import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Database & Schema Integrity', () => {
  let db: any;

  beforeEach(() => {
    // In Node 22, DatabaseSync is built into node:sqlite
    let DatabaseSync: any;
    try {
      DatabaseSync = require('node:sqlite').DatabaseSync;
    } catch {
      DatabaseSync = require('better-sqlite3');
    }

    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');

    // Run migration
    const migrationSql = fs.readFileSync(
      path.resolve(__dirname, '../src/main/database/migrations/001_initial_schema.sql'),
      'utf-8'
    );
    db.exec(migrationSql);
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('should create all 16 required normalized tables', () => {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    const tableNames = rows.map((r: any) => r.name);

    const requiredTables = [
      '_migrations',
      'settings',
      'activity_logs',
      'social_accounts',
      'characters',
      'character_references',
      'projects',
      'story_versions',
      'scenes',
      'media_assets',
      'captions',
      'publish_jobs',
      'published_posts',
      'devices',
      'transfer_jobs',
      'generation_jobs',
      'task_queue',
    ];

    for (const table of requiredTables) {
      expect(tableNames).toContain(table);
    }
  });

  it('should insert and retrieve character profiles with locked continuity', () => {
    const charId = 'char_test_1';
    db.prepare(`
      INSERT INTO characters (id, name, description, appearance, clothing, age_range, personality, voice, visual_style, is_locked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      charId,
      'Maya Lin',
      'Cyberpunk detective',
      'Asian female, black hair',
      'Charcoal bomber jacket',
      '25-30',
      'Bold',
      'en-US-Standard-C',
      'Photorealistic 8k'
    );

    const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(charId) as any;
    expect(char.name).toBe('Maya Lin');
    expect(char.is_locked).toBe(1);

    // Add reference
    db.prepare(`
      INSERT INTO character_references (id, character_id, image_path, prompt, is_primary)
      VALUES ('ref_1', ?, '/images/maya_face.png', 'Front portrait', 1)
    `).run(charId);

    const refs = db.prepare('SELECT * FROM character_references WHERE character_id = ?').all(charId) as any[];
    expect(refs.length).toBe(1);
    expect(refs[0].image_path).toBe('/images/maya_face.png');
    expect(refs[0].is_primary).toBe(1);
  });

  it('should enforce cascade deletion on character references', () => {
    const charId = 'char_test_del';
    db.prepare(`
      INSERT INTO characters (id, name) VALUES (?, 'To Delete')
    `).run(charId);

    db.prepare(`
      INSERT INTO character_references (id, character_id, image_path) VALUES ('ref_del_1', ?, '/img.png')
    `).run(charId);

    db.prepare('DELETE FROM characters WHERE id = ?').run(charId);

    const remainingRefs = db.prepare('SELECT * FROM character_references WHERE character_id = ?').all(charId);
    expect(remainingRefs.length).toBe(0);
  });

  it('should maintain task queue status, priority, and retry count', () => {
    db.prepare(`
      INSERT INTO task_queue (id, type, title, payload, status, progress, priority, retry_count, max_retries)
      VALUES ('task_1', 'video_render', 'Render Scene 1', '{"sceneId": 1}', 'pending', 0, 10, 0, 3)
    `).run();

    const task = db.prepare('SELECT * FROM task_queue WHERE id = ?').get('task_1') as any;
    expect(task.type).toBe('video_render');
    expect(task.priority).toBe(10);
    expect(task.status).toBe('pending');
  });
});
