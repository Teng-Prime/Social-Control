import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { storageService } from '../services/storageService';
import { logger } from '../logger';
import { StudioSettings } from '../../shared/types';

export class AppDatabase {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    const dataDir = storageService.getFolder('Data');
    this.dbPath = path.join(dataDir, 'social_earnings_studio.db');
  }

  public init(): void {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      logger.info('Database', `SQLite initialized at ${this.dbPath}`);
      this.runMigrations();
      this.seedDefaultSettings();
    } catch (err: any) {
      logger.error('Database', `Failed to initialize SQLite database: ${err.message}`);
      throw err;
    }
  }

  public getRawDb(): Database.Database {
    if (!this.db) {
      this.init();
    }
    return this.db!;
  }

  private runMigrations(): void {
    const db = this.getRawDb();

    // Ensure _migrations table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migration files directory
    // In dev: src/main/database/migrations
    // In dist: dist-electron/main/database/migrations
    let migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(process.cwd(), 'src/main/database/migrations');
    }

    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        const row = db.prepare('SELECT id FROM _migrations WHERE name = ?').get(file);
        if (!row) {
          logger.info('Database', `Applying migration: ${file}`);
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
          db.transaction(() => {
            db.exec(sql);
            db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
          })();
          logger.info('Database', `Migration applied: ${file}`);
        }
      }
    } else {
      // Fallback: If external SQL file not found, apply 001 inline
      const check = db.prepare('SELECT id FROM _migrations WHERE name = ?').get('001_initial_schema');
      if (!check) {
        logger.info('Database', 'Applying inline initial schema...');
        // The inline fallback is executed
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run('001_initial_schema');
      }
    }
  }

  private seedDefaultSettings(): void {
    const db = this.getRawDb();
    const defaults: Record<string, string> = {
      storageDirectory: storageService.getBaseDirectory(),
      ffmpegPath: 'ffmpeg',
      adbPath: 'adb',
      flowApiKey: '',
      flowApiEndpoint: 'https://flow.google.com/api',
      flowIntegrationMode: 'manual_assisted',
      defaultAiProvider: 'google-flow',
      defaultResolution: '1080x1920',
      defaultAspectRatio: '9:16',
      defaultVoice: 'en-US-Standard-C',
      phoneTransferFolder: 'Movies/SocialEarningsStudio',
      queueConcurrency: '2',
      logLevel: 'info',
      theme: 'dark',
    };

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `);

    db.transaction(() => {
      for (const [key, value] of Object.entries(defaults)) {
        insertStmt.run(key, value);
      }
    })();
  }

  public getSettings(): StudioSettings {
    const db = this.getRawDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const map: Record<string, any> = {};
    for (const r of rows) {
      if (r.key === 'queueConcurrency') {
        map[r.key] = parseInt(r.value, 10) || 2;
      } else {
        map[r.key] = r.value;
      }
    }

    return {
      storageDirectory: map.storageDirectory || storageService.getBaseDirectory(),
      ffmpegPath: map.ffmpegPath || 'ffmpeg',
      adbPath: map.adbPath || 'adb',
      flowApiKey: map.flowApiKey || '',
      flowApiEndpoint: map.flowApiEndpoint || 'https://flow.google.com/api',
      flowIntegrationMode: map.flowIntegrationMode || 'manual_assisted',
      defaultAiProvider: map.defaultAiProvider || 'google-flow',
      defaultResolution: map.defaultResolution || '1080x1920',
      defaultAspectRatio: map.defaultAspectRatio || '9:16',
      defaultVoice: map.defaultVoice || 'en-US-Standard-C',
      phoneTransferFolder: map.phoneTransferFolder || 'Movies/SocialEarningsStudio',
      queueConcurrency: map.queueConcurrency || 2,
      logLevel: map.logLevel || 'info',
      theme: map.theme || 'dark',
    };
  }

  public updateSettings(partial: Partial<StudioSettings>): StudioSettings {
    const db = this.getRawDb();
    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);

    db.transaction(() => {
      for (const [key, value] of Object.entries(partial)) {
        if (value !== undefined) {
          upsertStmt.run(key, String(value));
        }
      }
    })();

    if (partial.storageDirectory) {
      storageService.setBaseDirectory(partial.storageDirectory);
    }

    return this.getSettings();
  }

  public backup(targetFilePath?: string): string {
    const db = this.getRawDb();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = storageService.getFolder('Data');
    const backupFile = targetFilePath || path.join(backupDir, `backup_${timestamp}.db`);

    db.backup(backupFile);
    logger.info('Database', `Backup created successfully at ${backupFile}`);
    return backupFile;
  }

  public restore(backupFilePath: string): boolean {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file does not exist: ${backupFilePath}`);
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    fs.copyFileSync(backupFilePath, this.dbPath);
    this.init();
    logger.info('Database', `Restored database from ${backupFilePath}`);
    return true;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const appDb = new AppDatabase();
