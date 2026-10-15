import { secureStorageService } from './secureStorage';
import { socialAccountRepo } from '../database/repositories/socialAccountRepository';
import { GoogleUserProfile, SocialAccount } from '../../shared/types';
import { logger } from '../logger';

export interface OAuthTokenData {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

/**
 * GoogleCredentialStore
 * Encapsulates secure storage of Google OAuth credentials, client configuration,
 * and user account metadata using native OS encrypted vault (safeStorage / DPAPI / Keychain)
 * and SQLite database.
 */
export class GoogleCredentialStore {
  public static readonly CLIENT_ID_SECRET_KEY = 'oauth_google_client_id';
  public static readonly CLIENT_SECRET_KEY = 'oauth_google_client_secret';

  /**
   * Validates the structure and format of a Google Desktop OAuth Client ID.
   * Format: <project-number>-<hash>.apps.googleusercontent.com
   */
  public validateClientId(clientId: string): { valid: boolean; error?: string } {
    if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
      return {
        valid: false,
        error: 'Google OAuth Client ID is required. Please configure your Google Cloud Desktop Client ID.',
      };
    }

    const trimmed = clientId.trim();
    if (trimmed.length < 15) {
      return { valid: false, error: 'Client ID is too short.' };
    }

    if (trimmed.includes('appdesktop') || trimmed.includes('placeholder') || trimmed.includes('your-client-id')) {
      return {
        valid: false,
        error: 'Placeholder Client ID detected. Please paste your actual Google Cloud Desktop Client ID.',
      };
    }

    if (!trimmed.endsWith('.apps.googleusercontent.com')) {
      return {
        valid: false,
        error: 'Client ID must end with ".apps.googleusercontent.com". Ensure you selected "Desktop app" in Google Cloud Console.',
      };
    }

    return { valid: true };
  }

  /**
   * Retrieves the stored Google OAuth Client ID, checking secure vault and environment variables.
   */
  public getClientId(): string {
    const configured = secureStorageService.getSecret(GoogleCredentialStore.CLIENT_ID_SECRET_KEY);
    if (configured && configured.trim()) {
      return configured.trim();
    }

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim()) {
      return process.env.GOOGLE_CLIENT_ID.trim();
    }

    return '';
  }

  /**
   * Saves or clears the Google OAuth Client ID in secure storage.
   */
  public setClientId(clientId: string): void {
    const trimmed = clientId ? clientId.trim() : '';
    if (trimmed) {
      secureStorageService.setSecret(GoogleCredentialStore.CLIENT_ID_SECRET_KEY, trimmed);
      logger.info('GoogleCredentialStore', 'Configured custom Google OAuth Client ID');
    } else {
      secureStorageService.deleteSecret(GoogleCredentialStore.CLIENT_ID_SECRET_KEY);
      logger.info('GoogleCredentialStore', 'Cleared Google OAuth Client ID');
    }
  }

  /**
   * Checks whether a valid, non-placeholder custom Client ID is configured.
   */
  public isClientIdConfigured(): boolean {
    const id = this.getClientId();
    const validation = this.validateClientId(id);
    return validation.valid;
  }

  /**
   * Retrieves the stored Google OAuth Client Secret, checking secure vault and environment variables.
   */
  public getClientSecret(): string {
    const configured = secureStorageService.getSecret(GoogleCredentialStore.CLIENT_SECRET_KEY);
    if (configured && configured.trim()) {
      return configured.trim();
    }

    if (process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.trim()) {
      return process.env.GOOGLE_CLIENT_SECRET.trim();
    }

    return '';
  }

  /**
   * Saves or clears the Google OAuth Client Secret in secure storage.
   */
  public setClientSecret(clientSecret: string): void {
    const trimmed = clientSecret ? clientSecret.trim() : '';
    if (trimmed) {
      secureStorageService.setSecret(GoogleCredentialStore.CLIENT_SECRET_KEY, trimmed);
      logger.info('GoogleCredentialStore', 'Configured custom Google OAuth Client Secret');
    } else {
      secureStorageService.deleteSecret(GoogleCredentialStore.CLIENT_SECRET_KEY);
      logger.info('GoogleCredentialStore', 'Cleared Google OAuth Client Secret');
    }
  }

  /**
   * Checks whether a client secret is configured.
   */
  public isClientSecretConfigured(): boolean {
    return Boolean(this.getClientSecret());
  }

  /**
   * Retrieves the currently active connected Google social account record.
   */
  public getConnectedAccount(): SocialAccount | null {
    const accounts = socialAccountRepo.getByPlatform('google');
    return accounts.find((a) => a.isConnected) || null;
  }

  /**
   * Retrieves all Google account records.
   */
  public getAllGoogleAccounts(): SocialAccount[] {
    return socialAccountRepo.getByPlatform('google');
  }

  /**
   * Saves a newly authenticated Google connection.
   */
  public saveGoogleConnection(
    profile: GoogleUserProfile,
    tokenData: OAuthTokenData
  ): SocialAccount {
    const accountId = `google_${profile.id}`;

    // 1. Store tokens in OS encrypted store (DPAPI / Keychain)
    secureStorageService.setSecret(`oauth_${accountId}_access_token`, tokenData.access_token);
    if (tokenData.refresh_token) {
      secureStorageService.setSecret(`oauth_${accountId}_refresh_token`, tokenData.refresh_token);
    }

    // 2. Persist account record in SQLite
    const expiry = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : undefined;

    const account = socialAccountRepo.saveAccount(
      {
        id: accountId,
        platform: 'google',
        accountName: profile.name,
        avatarUrl: profile.picture,
        channelId: profile.email,
        isConnected: true,
        permissions: tokenData.scope ? tokenData.scope.split(' ') : ['openid', 'email', 'profile'],
        tokenExpiry: expiry,
      },
      {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      }
    );

    logger.info('GoogleCredentialStore', `Saved Google account credentials for ${profile.email}`);
    return account;
  }

  /**
   * Updates an existing account's access token after refresh.
   */
  public updateRefreshedTokens(
    accountId: string,
    accessToken: string,
    expiresIn?: number,
    refreshToken?: string
  ): SocialAccount | null {
    secureStorageService.setSecret(`oauth_${accountId}_access_token`, accessToken);
    if (refreshToken) {
      secureStorageService.setSecret(`oauth_${accountId}_refresh_token`, refreshToken);
    }

    const account = socialAccountRepo.getById(accountId);
    if (!account) return null;

    const expiry = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : undefined;

    const updated = socialAccountRepo.saveAccount({
      ...account,
      isConnected: true,
      tokenExpiry: expiry,
    });

    return updated;
  }

  /**
   * Retrieves the stored access token from the secure vault.
   */
  public getAccessToken(accountId: string): string | null {
    return secureStorageService.getSecret(`oauth_${accountId}_access_token`);
  }

  /**
   * Retrieves the stored refresh token from the secure vault.
   */
  public getRefreshToken(accountId: string): string | null {
    return (
      secureStorageService.getSecret(`oauth_${accountId}_refresh_token`) ||
      socialAccountRepo.getRefreshToken(accountId)
    );
  }

  /**
   * Wipes tokens from the secure vault and marks account disconnected in database.
   */
  public clearCredentials(accountId?: string): void {
    const accounts = this.getAllGoogleAccounts();
    const targets = accountId
      ? accounts.filter((a) => a.id === accountId)
      : accounts;

    for (const target of targets) {
      secureStorageService.deleteSecret(`oauth_${target.id}_access_token`);
      secureStorageService.deleteSecret(`oauth_${target.id}_refresh_token`);
      socialAccountRepo.disconnect(target.id);
      logger.info('GoogleCredentialStore', `Cleared credentials for Google account: ${target.id}`);
    }
  }
}

export const googleCredentialStore = new GoogleCredentialStore();
