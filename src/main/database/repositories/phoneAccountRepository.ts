import { appDb } from '../db';
import { PhoneAccountCredential, PhoneAccountPlatform } from '../../../shared/types';
import { secureStorageService } from '../../services/secureStorage';

export class PhoneAccountRepository {
  private ensureTable(): void {
    const db = appDb.getRawDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS phone_account_credentials (
        id TEXT PRIMARY KEY,
        device_id TEXT,
        platform TEXT NOT NULL,
        identifier TEXT NOT NULL,
        password TEXT,
        two_factor_secret TEXT,
        notes TEXT,
        last_verified_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_phone_acc_platform ON phone_account_credentials(platform);
      CREATE INDEX IF NOT EXISTS idx_phone_acc_device ON phone_account_credentials(device_id);
    `);
  }

  public getAll(deviceId?: string): PhoneAccountCredential[] {
    this.ensureTable();
    const db = appDb.getRawDb();

    let query = `
      SELECT id, device_id as deviceId, platform, identifier, password,
             two_factor_secret as twoFactorSecret, notes, last_verified_at as lastVerifiedAt,
             created_at as createdAt, updated_at as updatedAt
      FROM phone_account_credentials
    `;
    const params: any[] = [];

    if (deviceId) {
      query += ` WHERE device_id = ? OR device_id IS NULL OR device_id = '' ORDER BY platform ASC`;
      params.push(deviceId);
    } else {
      query += ` ORDER BY platform ASC`;
    }

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map((r) => {
      // Check if secureStorage has encrypted password override
      const secPass = secureStorageService.getSecret(`phone_acc_${r.id}_password`);
      return {
        ...r,
        password: secPass || r.password || '',
      };
    });
  }

  public getByPlatform(platform: PhoneAccountPlatform, deviceId?: string): PhoneAccountCredential | null {
    this.ensureTable();
    const db = appDb.getRawDb();

    let query = `
      SELECT id, device_id as deviceId, platform, identifier, password,
             two_factor_secret as twoFactorSecret, notes, last_verified_at as lastVerifiedAt,
             created_at as createdAt, updated_at as updatedAt
      FROM phone_account_credentials
      WHERE platform = ?
    `;
    const params: any[] = [platform];

    if (deviceId) {
      query += ` AND (device_id = ? OR device_id IS NULL OR device_id = '')`;
      params.push(deviceId);
    }

    query += ` ORDER BY updated_at DESC LIMIT 1`;
    const row = db.prepare(query).get(...params) as any;
    if (!row) return null;

    const secPass = secureStorageService.getSecret(`phone_acc_${row.id}_password`);
    return {
      ...row,
      password: secPass || row.password || '',
    };
  }

  public save(
    credential: Partial<PhoneAccountCredential> & { platform: PhoneAccountPlatform; identifier: string }
  ): PhoneAccountCredential {
    this.ensureTable();
    const db = appDb.getRawDb();

    const id = credential.id || `phone_acc_${credential.platform}_${Date.now()}`;
    const deviceId = credential.deviceId || null;
    const identifier = credential.identifier.trim();
    const password = credential.password?.trim() || '';
    const twoFactorSecret = credential.twoFactorSecret?.trim() || null;
    const notes = credential.notes || null;
    const lastVerifiedAt = credential.lastVerifiedAt || null;

    const stmt = db.prepare(`
      INSERT INTO phone_account_credentials (
        id, device_id, platform, identifier, password, two_factor_secret, notes, last_verified_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        device_id = excluded.device_id,
        platform = excluded.platform,
        identifier = excluded.identifier,
        password = excluded.password,
        two_factor_secret = excluded.two_factor_secret,
        notes = excluded.notes,
        last_verified_at = COALESCE(excluded.last_verified_at, phone_account_credentials.last_verified_at),
        updated_at = datetime('now')
    `);

    stmt.run(id, deviceId, credential.platform, identifier, password, twoFactorSecret, notes, lastVerifiedAt);

    if (password) {
      try {
        secureStorageService.setSecret(`phone_acc_${id}_password`, password);
      } catch {}
    }

    return {
      id,
      deviceId: deviceId || undefined,
      platform: credential.platform,
      identifier,
      password,
      twoFactorSecret: twoFactorSecret || undefined,
      notes: notes || undefined,
      lastVerifiedAt: lastVerifiedAt || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public delete(id: string): boolean {
    this.ensureTable();
    const db = appDb.getRawDb();
    try {
      secureStorageService.deleteSecret(`phone_acc_${id}_password`);
    } catch {}
    const res = db.prepare('DELETE FROM phone_account_credentials WHERE id = ?').run(id);
    return res.changes > 0;
  }
}

export const phoneAccountRepo = new PhoneAccountRepository();
