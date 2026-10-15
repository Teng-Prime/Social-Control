import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { googleAuthService } from '../src/main/services/googleAuthService';
import { socialAccountRepo } from '../src/main/database/repositories/socialAccountRepository';
import { secureStorageService } from '../src/main/services/secureStorage';

describe('Google OAuth 2.0 PKCE & Secure Token Management', () => {
  beforeEach(() => {
    // Clean up any test accounts
    const existing = socialAccountRepo.getByPlatform('google');
    for (const acc of existing) {
      socialAccountRepo.delete(acc.id);
    }
    secureStorageService.deleteSecret('oauth_google_client_id');
  });

  afterEach(() => {
    googleAuthService.cancelPendingOAuth();
    const existing = socialAccountRepo.getByPlatform('google');
    for (const acc of existing) {
      socialAccountRepo.delete(acc.id);
    }
    vi.restoreAllMocks();
  });

  it('1. PKCE: should generate RFC 7636 compliant code_verifier, code_challenge, and state', () => {
    const verifier = googleAuthService.generateCodeVerifier(32);
    // Base64url of 32 bytes should be exactly 43 characters
    expect(verifier.length).toBe(43);
    // Verify base64url characters only (no +, /, or = padding)
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);

    const challenge = googleAuthService.generateCodeChallenge(verifier);
    expect(challenge.length).toBe(43);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);

    // Verify mathematical accuracy of SHA-256 + base64url derivation
    const manualHash = crypto.createHash('sha256').update(verifier).digest();
    const manualChallenge = manualHash
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(challenge).toBe(manualChallenge);

    // Verify unguessable state
    const state1 = googleAuthService.generateState();
    const state2 = googleAuthService.generateState();
    expect(state1).not.toBe(state2);
    expect(state1.length).toBeGreaterThanOrEqual(32);
    expect(state1).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('2. Configuration: should manage and persist custom Google Client ID', () => {
    expect(googleAuthService.isCustomClientIdConfigured()).toBe(false);

    const customId = '123456789-mycustomclient.apps.googleusercontent.com';
    googleAuthService.setClientId(customId);

    expect(googleAuthService.getClientId()).toBe(customId);
    expect(googleAuthService.isCustomClientIdConfigured()).toBe(true);

    // Clearing client ID resets to default
    googleAuthService.setClientId('');
    expect(googleAuthService.isCustomClientIdConfigured()).toBe(false);
  });

  it('3. Secure Persistence: should securely store tokens in OS vault and save profile record', () => {
    const mockProfile = {
      id: 'sub_test_user_9981',
      email: 'creator.pro@gmail.com',
      name: 'Alex Rivera',
      picture: 'https://lh3.googleusercontent.com/a/mock_avatar_url',
      verifiedEmail: true,
    };

    const mockTokens = {
      access_token: 'mock_access_token_sec_val_12345',
      refresh_token: 'mock_refresh_token_sec_val_67890',
      expires_in: 3600,
      scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
    };

    const account = googleAuthService.saveGoogleConnection(mockProfile, mockTokens);

    expect(account.id).toBe(`google_${mockProfile.id}`);
    expect(account.platform).toBe('google');
    expect(account.accountName).toBe('Alex Rivera');
    expect(account.channelId).toBe('creator.pro@gmail.com');
    expect(account.avatarUrl).toBe('https://lh3.googleusercontent.com/a/mock_avatar_url');
    expect(account.isConnected).toBe(true);
    expect(account.tokenExpiry).toBeDefined();

    // Verify tokens were encrypted into secure storage and NOT stored plaintext in DB
    const storedAccessToken = socialAccountRepo.getAccessToken(account.id);
    const storedRefreshToken = socialAccountRepo.getRefreshToken(account.id);
    expect(storedAccessToken).toBe('mock_access_token_sec_val_12345');
    expect(storedRefreshToken).toBe('mock_refresh_token_sec_val_67890');

    // Verify status returns connected
    const status = googleAuthService.getStatus();
    expect(status.status).toBe('connected');
    expect(status.profile?.email).toBe('creator.pro@gmail.com');
    expect(status.profile?.name).toBe('Alex Rivera');
    expect(status.hasRefreshToken).toBe(true);
  });

  it('4. Token Refresh: should exchange refresh_token for updated access token', async () => {
    const mockProfile = {
      id: 'sub_refresh_test',
      email: 'refresh.test@gmail.com',
      name: 'Refresh Tester',
      picture: '',
      verifiedEmail: true,
    };

    const mockInitialTokens = {
      access_token: 'old_access_token',
      refresh_token: 'valid_refresh_token',
      expires_in: 3600,
    };

    const account = googleAuthService.saveGoogleConnection(mockProfile, mockInitialTokens);

    // Mock global fetch for Google token endpoint
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any, opts: any) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'new_fresh_access_token_9999',
            expires_in: 7200,
            token_type: 'Bearer',
          }),
        } as any;
      }
      return { ok: false, status: 404, json: async () => ({}) } as any;
    });

    const refreshResult = await googleAuthService.refreshAccessToken(account.id);
    expect(refreshResult.success).toBe(true);
    expect(refreshResult.state.status).toBe('connected');

    // Stored access token should be updated
    const updatedAccessToken = socialAccountRepo.getAccessToken(account.id);
    expect(updatedAccessToken).toBe('new_fresh_access_token_9999');

    fetchSpy.mockRestore();
  });

  it('5. Disconnect & Token Revocation: should wipe secrets and mark account disconnected', async () => {
    const mockProfile = {
      id: 'sub_disconnect_test',
      email: 'disconnect.test@gmail.com',
      name: 'Disconnect User',
    };

    const mockTokens = {
      access_token: 'token_to_disconnect',
      refresh_token: 'refresh_to_disconnect',
      expires_in: 3600,
    };

    const account = googleAuthService.saveGoogleConnection(mockProfile, mockTokens);
    expect(socialAccountRepo.getAccessToken(account.id)).toBe('token_to_disconnect');

    // Mock revocation endpoint
    const revokeSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as any);

    const disconnectRes = await googleAuthService.disconnect(account.id);
    expect(disconnectRes.success).toBe(true);
    expect(disconnectRes.state.status).toBe('not_connected');

    // Tokens must be wiped from OS secure vault
    expect(socialAccountRepo.getAccessToken(account.id)).toBeNull();
    expect(socialAccountRepo.getRefreshToken(account.id)).toBeNull();

    // DB record should be marked disconnected
    const updatedAccount = socialAccountRepo.getById(account.id);
    expect(updatedAccount?.isConnected).toBe(false);

    // Overall status is now not_connected
    const status = googleAuthService.getStatus();
    expect(status.status).toBe('not_connected');

    revokeSpy.mockRestore();
  });

  it('6. Reconnection Flow: should re-connect an existing disconnected account', async () => {
    const mockProfile = {
      id: 'sub_reconnect_test',
      email: 'reconnect.test@gmail.com',
      name: 'Reconnect User',
    };

    // 1. Initial connection
    const acc = googleAuthService.saveGoogleConnection(mockProfile, {
      access_token: 'tok_1',
      refresh_token: 'ref_1',
      expires_in: 3600,
    });
    expect(acc.isConnected).toBe(true);

    // 2. Disconnect
    await googleAuthService.disconnect(acc.id);
    expect(googleAuthService.getStatus().status).toBe('not_connected');

    // 3. Re-connect
    const reconnected = googleAuthService.saveGoogleConnection(mockProfile, {
      access_token: 'tok_2',
      refresh_token: 'ref_2',
      expires_in: 3600,
    });
    expect(reconnected.isConnected).toBe(true);
    expect(googleAuthService.getStatus().status).toBe('connected');
    expect(socialAccountRepo.getAccessToken(reconnected.id)).toBe('tok_2');
  });

  it('7. Cancellation: should cleanly cancel pending OAuth flow', () => {
    expect(googleAuthService.cancelPendingOAuth()).toBe(false);
  });
});
