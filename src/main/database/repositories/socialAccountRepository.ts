import { appDb } from '../db';
import { SocialAccount, SocialPlatform } from '../../../shared/types';
import { secureStorageService } from '../../services/secureStorage';

export class SocialAccountRepository {
  public getAll(): SocialAccount[] {
    const db = appDb.getRawDb();
    const rows = db.prepare(`
      SELECT id, platform, account_name as accountName, avatar_url as avatarUrl,
             channel_id as channelId, is_connected as isConnected, permissions,
             token_expiry as tokenExpiry, created_at as createdAt, updated_at as updatedAt
      FROM social_accounts
      ORDER BY platform ASC, account_name ASC
    `).all() as any[];

    return rows.map(r => ({
      ...r,
      isConnected: Boolean(r.isConnected),
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions || '[]') : [],
    }));
  }

  public getById(id: string): SocialAccount | null {
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT id, platform, account_name as accountName, avatar_url as avatarUrl,
             channel_id as channelId, is_connected as isConnected, permissions,
             token_expiry as tokenExpiry, created_at as createdAt, updated_at as updatedAt
      FROM social_accounts
      WHERE id = ?
    `).get(id) as any;

    if (!r) return null;
    return {
      ...r,
      isConnected: Boolean(r.isConnected),
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions || '[]') : [],
    };
  }

  public getByPlatform(platform: SocialPlatform): SocialAccount[] {
    const db = appDb.getRawDb();
    const rows = db.prepare(`
      SELECT id, platform, account_name as accountName, avatar_url as avatarUrl,
             channel_id as channelId, is_connected as isConnected, permissions,
             token_expiry as tokenExpiry, created_at as createdAt, updated_at as updatedAt
      FROM social_accounts
      WHERE platform = ?
    `).all(platform) as any[];

    return rows.map(r => ({
      ...r,
      isConnected: Boolean(r.isConnected),
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions || '[]') : [],
    }));
  }

  public saveAccount(
    account: Omit<SocialAccount, 'createdAt' | 'updatedAt'>,
    tokenBundle?: { accessToken: string; refreshToken?: string }
  ): SocialAccount {
    const db = appDb.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO social_accounts (
        id, platform, account_name, avatar_url, channel_id, is_connected,
        permissions, token_expiry, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, datetime('now'), datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        account_name = excluded.account_name,
        avatar_url = excluded.avatar_url,
        channel_id = excluded.channel_id,
        is_connected = excluded.is_connected,
        permissions = excluded.permissions,
        token_expiry = excluded.token_expiry,
        updated_at = datetime('now')
    `);

    stmt.run(
      account.id,
      account.platform,
      account.accountName,
      account.avatarUrl || null,
      account.channelId || null,
      account.isConnected ? 1 : 0,
      JSON.stringify(account.permissions || []),
      account.tokenExpiry || null
    );

    if (tokenBundle) {
      if (tokenBundle.accessToken) {
        secureStorageService.setSecret(`oauth_${account.id}_access_token`, tokenBundle.accessToken);
      }
      if (tokenBundle.refreshToken) {
        secureStorageService.setSecret(`oauth_${account.id}_refresh_token`, tokenBundle.refreshToken);
      }
    }

    return this.getById(account.id)!;
  }

  public disconnect(id: string): boolean {
    const db = appDb.getRawDb();
    secureStorageService.deleteSecret(`oauth_${id}_access_token`);
    secureStorageService.deleteSecret(`oauth_${id}_refresh_token`);
    const res = db.prepare('UPDATE social_accounts SET is_connected = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public delete(id: string): boolean {
    const db = appDb.getRawDb();
    secureStorageService.deleteSecret(`oauth_${id}_access_token`);
    secureStorageService.deleteSecret(`oauth_${id}_refresh_token`);
    const res = db.prepare('DELETE FROM social_accounts WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public getAccessToken(id: string): string | null {
    return secureStorageService.getSecret(`oauth_${id}_access_token`);
  }
}

export const socialAccountRepo = new SocialAccountRepository();
