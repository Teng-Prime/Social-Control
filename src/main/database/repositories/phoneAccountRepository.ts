import { appDb } from '../db';
import { PhoneAccountCredential, PhoneAccountPlatform } from '../../../shared/types';
import { secureStorageService } from '../../services/secureStorage';
import { deviceRepo } from './deviceRepository';

export class PhoneAccountRepository {
  /**
   * Resolves any input device identifier (database ID, serial number, or virtual ID)
   * into the canonical stable device identifier (preferably ADB serial number).
   */
  public resolveDeviceKey(deviceId?: string): string {
    if (!deviceId) return 'default';
    const trimmed = deviceId.trim();
    if (!trimmed || trimmed === 'default' || trimmed === 'virtual_device') {
      return trimmed || 'default';
    }

    try {
      // Look up by internal ID or serial in device repository
      const dev = deviceRepo.getById(trimmed) || deviceRepo.getBySerial(trimmed);
      if (dev && dev.serial) {
        return dev.serial;
      }
    } catch {}

    return trimmed;
  }

  private ensureTable(): void {
    const db = appDb.getRawDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS phone_account_credentials (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL DEFAULT 'default',
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

    // Standardize empty or null device_id to 'default'
    try {
      db.exec(`
        UPDATE phone_account_credentials
        SET device_id = 'default'
        WHERE device_id IS NULL OR device_id = '';
      `);
    } catch {}

    // Clean up any legacy duplicates by keeping the newest updated_at row
    try {
      db.exec(`
        DELETE FROM phone_account_credentials
        WHERE rowid NOT IN (
          SELECT MAX(rowid)
          FROM phone_account_credentials
          WHERE device_id IS NOT NULL AND device_id != ''
          GROUP BY device_id, platform
        ) AND device_id IS NOT NULL AND device_id != '';
      `);
    } catch {}

    // Ensure UNIQUE index exists on (device_id, platform) for atomic UPSERT and 100% device isolation
    try {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_acc_dev_platform ON phone_account_credentials(device_id, platform);
      `);
    } catch {}
  }

  private resolveSecretPassword(id: string, fallbackPassword?: string): string {
    try {
      const secPass =
        secureStorageService.getSecret(`phone_acc_${id}_password`) ||
        secureStorageService.getSecret(`${id}_password`);
      return secPass || fallbackPassword || '';
    } catch {
      return fallbackPassword || '';
    }
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
      const canonical = this.resolveDeviceKey(deviceId);
      if (canonical !== deviceId) {
        query += ` WHERE (device_id = ? OR device_id = ?) ORDER BY platform ASC`;
        params.push(canonical, deviceId);
      } else {
        query += ` WHERE device_id = ? ORDER BY platform ASC`;
        params.push(canonical);
      }
    } else {
      query += ` ORDER BY device_id ASC, platform ASC`;
    }

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map((r) => ({
      ...r,
      password: this.resolveSecretPassword(r.id, r.password),
    }));
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
      const canonical = this.resolveDeviceKey(deviceId);
      if (canonical !== deviceId) {
        query += ` AND (device_id = ? OR device_id = ?)`;
        params.push(canonical, deviceId);
      } else {
        query += ` AND device_id = ?`;
        params.push(canonical);
      }
    }

    query += ` ORDER BY updated_at DESC LIMIT 1`;
    const row = db.prepare(query).get(...params) as any;
    if (!row) return null;

    return {
      ...row,
      password: this.resolveSecretPassword(row.id, row.password),
    };
  }

  public save(
    credential: Partial<PhoneAccountCredential> & {
      platform: PhoneAccountPlatform;
      identifier: string;
      clearPassword?: boolean;
      clearTwoFactor?: boolean;
    }
  ): PhoneAccountCredential {
    this.ensureTable();
    const db = appDb.getRawDb();

    const canonicalDeviceId = this.resolveDeviceKey(credential.deviceId);
    const existing = this.getByPlatform(credential.platform, canonicalDeviceId);
    const id = credential.id || existing?.id || `phone_acc_${canonicalDeviceId}_${credential.platform}`;
    const identifier = credential.identifier.trim();

    // Sensitive field preservation during edit:
    // If clearPassword is explicitly true, clear password.
    // Else if password was provided and non-empty, use the new password.
    // Else if existing record has a password, retain it so partial updates never wipe secrets.
    let effectivePassword = '';
    if (credential.clearPassword) {
      effectivePassword = '';
    } else if (credential.password && credential.password.trim() !== '') {
      effectivePassword = credential.password.trim();
    } else if (existing?.password) {
      effectivePassword = existing.password;
    }

    // 2FA secret preservation during edit:
    let effectiveTwoFactorSecret: string | null = null;
    if (credential.clearTwoFactor) {
      effectiveTwoFactorSecret = null;
    } else if (credential.twoFactorSecret && credential.twoFactorSecret.trim() !== '') {
      effectiveTwoFactorSecret = credential.twoFactorSecret.trim();
    } else if (existing?.twoFactorSecret) {
      effectiveTwoFactorSecret = existing.twoFactorSecret;
    }

    const notes = credential.notes !== undefined ? credential.notes : (existing?.notes || null);
    const lastVerifiedAt = credential.lastVerifiedAt || existing?.lastVerifiedAt || null;

    // Use atomic SQLite UPSERT on unique constraint (device_id, platform)
    const stmt = db.prepare(`
      INSERT INTO phone_account_credentials (
        id, device_id, platform, identifier, password, two_factor_secret, notes, last_verified_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      )
      ON CONFLICT(device_id, platform) DO UPDATE SET
        id = excluded.id,
        identifier = excluded.identifier,
        password = excluded.password,
        two_factor_secret = excluded.two_factor_secret,
        notes = excluded.notes,
        last_verified_at = COALESCE(excluded.last_verified_at, phone_account_credentials.last_verified_at),
        updated_at = datetime('now')
    `);

    stmt.run(
      id,
      canonicalDeviceId,
      credential.platform,
      identifier,
      effectivePassword,
      effectiveTwoFactorSecret,
      notes,
      lastVerifiedAt
    );

    // Sync encrypted credentials vault
    try {
      if (effectivePassword) {
        secureStorageService.setSecret(`phone_acc_${id}_password`, effectivePassword);
      } else if (credential.clearPassword) {
        secureStorageService.deleteSecret(`phone_acc_${id}_password`);
        secureStorageService.deleteSecret(`${id}_password`);
      }
    } catch {}

    return {
      id,
      deviceId: canonicalDeviceId,
      platform: credential.platform,
      identifier,
      password: effectivePassword,
      twoFactorSecret: effectiveTwoFactorSecret || undefined,
      notes: notes || undefined,
      lastVerifiedAt: lastVerifiedAt || undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public delete(id: string): boolean {
    this.ensureTable();
    const db = appDb.getRawDb();
    try {
      secureStorageService.deleteSecret(`phone_acc_${id}_password`);
      secureStorageService.deleteSecret(`${id}_password`);
    } catch {}
    const res = db.prepare('DELETE FROM phone_account_credentials WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public getUnassigned(): PhoneAccountCredential[] {
    this.ensureTable();
    const db = appDb.getRawDb();
    const rows = db.prepare(`
      SELECT id, device_id as deviceId, platform, identifier, password,
             two_factor_secret as twoFactorSecret, notes, last_verified_at as lastVerifiedAt,
             created_at as createdAt, updated_at as updatedAt
      FROM phone_account_credentials
      WHERE device_id IS NULL OR device_id = '' OR device_id = 'default'
      ORDER BY platform ASC
    `).all() as any[];

    return rows.map((r) => ({
      ...r,
      password: this.resolveSecretPassword(r.id, r.password),
    }));
  }

  public assignToDevice(id: string, deviceId: string): boolean {
    this.ensureTable();
    const canonicalDeviceId = this.resolveDeviceKey(deviceId);
    const db = appDb.getRawDb();
    const res = db.prepare(`
      UPDATE phone_account_credentials
      SET device_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(canonicalDeviceId, id);
    return res.changes > 0;
  }
}

export const phoneAccountRepo = new PhoneAccountRepository();
