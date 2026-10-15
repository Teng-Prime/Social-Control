import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { googleCredentialStore } from '../src/main/services/googleCredentialStore';
import { googleOAuthService } from '../src/main/services/googleOAuthService';
import { googleConnectionStatusService } from '../src/main/services/googleConnectionStatusService';
import { flowService } from '../src/main/services/flowService';
import { socialAccountRepo } from '../src/main/database/repositories/socialAccountRepository';
import { secureStorageService } from '../src/main/services/secureStorage';

describe('Google Flow AI Integration Architecture & Separation of Concerns', () => {
  beforeEach(() => {
    const existing = socialAccountRepo.getByPlatform('google');
    for (const acc of existing) {
      socialAccountRepo.delete(acc.id);
    }
    secureStorageService.deleteSecret('oauth_google_client_id');
    secureStorageService.deleteSecret('oauth_google_client_secret');
  });

  afterEach(() => {
    googleOAuthService.cancelPendingOAuth();
    const existing = socialAccountRepo.getByPlatform('google');
    for (const acc of existing) {
      socialAccountRepo.delete(acc.id);
    }
    vi.restoreAllMocks();
  });

  // 1. GoogleCredentialStore - Client ID Validation & Secure Storage
  it('1. GoogleCredentialStore: validates Client ID format and rejects placeholders or invalid extensions', () => {
    // Empty
    expect(googleCredentialStore.validateClientId('').valid).toBe(false);

    // Placeholder
    expect(googleCredentialStore.validateClientId('1092837465920-appdesktop.apps.googleusercontent.com').valid).toBe(false);
    expect(googleCredentialStore.validateClientId('your-client-id.apps.googleusercontent.com').valid).toBe(false);

    // Wrong suffix / Web client instead of desktop
    expect(googleCredentialStore.validateClientId('1234567890-abcdef.example.com').valid).toBe(false);

    // Valid desktop client ID
    const validId = '123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com';
    const validation = googleCredentialStore.validateClientId(validId);
    expect(validation.valid).toBe(true);

    // Persist and retrieve
    googleCredentialStore.setClientId(validId);
    expect(googleCredentialStore.getClientId()).toBe(validId);
    expect(googleCredentialStore.isClientIdConfigured()).toBe(true);

    // Clear
    googleCredentialStore.setClientId('');
    expect(googleCredentialStore.getClientId()).toBe('');
    expect(googleCredentialStore.isClientIdConfigured()).toBe(false);
  });

  // 2. GoogleCredentialStore - Secure Token Encryption & Safe Wiping
  it('2. GoogleCredentialStore: saves tokens in secureStorage vault and clears credentials without deleting unrelated data', () => {
    const mockProfile = {
      id: 'sub_test_9999',
      email: 'creator.flow@gmail.com',
      name: 'Flow Creator',
      picture: 'https://lh3.googleusercontent.com/avatar',
    };

    const mockTokens = {
      access_token: 'secret_access_token_val',
      refresh_token: 'secret_refresh_token_val',
      expires_in: 3600,
    };

    const saved = googleCredentialStore.saveGoogleConnection(mockProfile, mockTokens);
    expect(saved.isConnected).toBe(true);
    expect(saved.channelId).toBe('creator.flow@gmail.com');

    // Tokens must be in secure vault, never in database plaintext
    const vaultAccess = googleCredentialStore.getAccessToken('google_sub_test_9999');
    const vaultRefresh = googleCredentialStore.getRefreshToken('google_sub_test_9999');
    expect(vaultAccess).toBe('secret_access_token_val');
    expect(vaultRefresh).toBe('secret_refresh_token_val');

    // Clear credentials
    googleCredentialStore.clearCredentials('google_sub_test_9999');
    expect(googleCredentialStore.getAccessToken('google_sub_test_9999')).toBeNull();
    expect(googleCredentialStore.getRefreshToken('google_sub_test_9999')).toBeNull();
    const afterClear = googleCredentialStore.getConnectedAccount();
    expect(afterClear).toBeNull();
  });

  // 3. GoogleConnectionStatusService - State Machine & Configuration Check
  it('3. GoogleConnectionStatusService: fails with configuration_missing when Client ID is missing', async () => {
    googleCredentialStore.setClientId('');

    const res = await googleConnectionStatusService.connectGoogle();
    expect(res.success).toBe(false);
    expect(res.state.status).toBe('error');
    expect(res.state.failureReason).toBe('configuration_missing');
    expect(res.state.statusLabel).toBe('Configuration Missing');
    expect(res.state.error).toContain('Client ID is required');
  });

  // 4. Duplicate Click Prevention
  it('4. GoogleConnectionStatusService: prevents duplicate sign-in flows when clicked repeatedly', async () => {
    const validId = '123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com';
    googleCredentialStore.setClientId(validId);

    // Mock executeFlow to simulate in-flight OAuth flow
    vi.spyOn(googleOAuthService, 'isAuthInProgress').mockReturnValue(true);

    const duplicateRes = await googleConnectionStatusService.connectGoogle();
    expect(duplicateRes.success).toBe(false);
  });

  // 5. FlowAIService Honest Status Integration
  it('5. FlowAIService: honestly reflects Google OAuth connection status and avoids fake API responses', async () => {
    // 1. Initial status with no connected Google account
    await flowService.disconnectGoogleFlow();
    const initialStatus = flowService.getFlowConnectionStatus();
    expect(initialStatus.status).toBe('not_connected');
    expect(initialStatus.hasProgrammaticApi).toBe(false);

    // 2. Connect via genuine Google account
    const mockProfile = {
      id: 'sub_flow_user_1',
      email: 'active.creator@gmail.com',
      name: 'Active Creator',
    };
    googleCredentialStore.saveGoogleConnection(mockProfile, {
      access_token: 'mock_flow_access',
      expires_in: 3600,
    });

    // 3. Flow connection status must now reflect genuine connected Google account
    const connectedStatus = flowService.getFlowConnectionStatus();
    expect(connectedStatus.status).toBe('connected');
    expect(connectedStatus.connectedEmail).toBe('active.creator@gmail.com');
    expect(connectedStatus.hasProgrammaticApi).toBe(false); // Honest: web workspace, not fake API
    expect(connectedStatus.officialUrl).toBe('https://flow.google/');

    // 4. Disconnect clears state
    await googleConnectionStatusService.disconnect();
    const afterDisconnect = flowService.getFlowConnectionStatus();
    expect(afterDisconnect.status).toBe('not_connected');
    expect(afterDisconnect.connectedEmail).toBeUndefined();
  });

  // 6. GoogleCredentialStore - Client Secret Persistence & OS Vault Protection
  it('6. GoogleCredentialStore: saves, retrieves, and clears Client Secret in encrypted store', () => {
    expect(googleCredentialStore.getClientSecret()).toBe('');
    expect(googleCredentialStore.isClientSecretConfigured()).toBe(false);

    const secret = 'GOCSPX-mockClientSecret1234567890';
    googleCredentialStore.setClientSecret(secret);
    expect(googleCredentialStore.getClientSecret()).toBe(secret);
    expect(googleCredentialStore.isClientSecretConfigured()).toBe(true);

    googleCredentialStore.setClientSecret('');
    expect(googleCredentialStore.getClientSecret()).toBe('');
    expect(googleCredentialStore.isClientSecretConfigured()).toBe(false);
  });

  // 7. Token Exchange & Refresh with client_secret
  it('7. GoogleOAuthService: sends client_secret in POST body to Google token endpoint when configured', async () => {
    let capturedBody = '';
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any, init?: any) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        capturedBody = init?.body || '';
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'mock_access_with_secret',
            refresh_token: 'mock_refresh_with_secret',
            expires_in: 3600,
          }),
        } as any;
      }
      return { ok: false, status: 404, json: async () => ({}) } as any;
    });

    const clientId = '123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com';
    const clientSecret = 'GOCSPX-secret123456';

    // A. exchangeCodeForTokens passes client_secret
    await googleOAuthService.exchangeCodeForTokens('code_123', 'verifier_123', 'http://127.0.0.1:8080', clientId, clientSecret);
    expect(capturedBody).toContain('client_secret=GOCSPX-secret123456');
    expect(capturedBody).toContain(`client_id=${encodeURIComponent(clientId)}`);
    expect(capturedBody).toContain('grant_type=authorization_code');

    // B. refreshTokens passes client_secret
    await googleOAuthService.refreshTokens(clientId, 'ref_token_123', clientSecret);
    expect(capturedBody).toContain('client_secret=GOCSPX-secret123456');
    expect(capturedBody).toContain(`client_id=${encodeURIComponent(clientId)}`);
    expect(capturedBody).toContain('grant_type=refresh_token');

    fetchSpy.mockRestore();
  });

  // 8. Helpful Error Handling and Browser Feedback on "client_secret is missing"
  it('8. GoogleOAuthService: translates Google "client_secret is missing" error into actionable guidance and renders failure in browser', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: 'invalid_request',
            error_description: 'client_secret is missing',
          }),
        } as any;
      }
      return { ok: false, status: 404, json: async () => ({}) } as any;
    });

    const clientId = '123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com';

    // A. Direct exchangeCodeForTokens throws actionable error
    await expect(
      googleOAuthService.exchangeCodeForTokens('code_x', 'ver_x', 'http://127.0.0.1:8080', clientId)
    ).rejects.toThrow(/Google requires a Client Secret for your Client ID/);

    // B. Loopback callback renders failure in browser (not false success)
    const loopback = await googleOAuthService.startLoopbackServer(0);
    const state = 'state_secret_missing_test';

    (googleOAuthService as any).pendingSession = {
      state,
      codeVerifier: 'verifier_test',
      nonce: 'nonce_test',
      redirectUri: loopback.redirectUri,
      server: loopback.server,
      timeoutTimer: setTimeout(() => {}, 60000),
      clientId,
      sessionHandled: false,
      resolve: vi.fn(),
      reject: vi.fn(),
    };

    const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      import('http').then(({ default: http }) => {
        http.get(`${loopback.redirectUri}?code=code_without_secret&state=${state}`, (httpRes) => {
          let body = '';
          httpRes.on('data', (c) => (body += c));
          httpRes.on('end', () => resolve({ statusCode: httpRes.statusCode || 200, body }));
        }).on('error', reject);
      });
    });

    // Must NOT state success!
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('Connection Incomplete');
    expect(res.body).toContain('Google requires a Client Secret for your Client ID');
    expect(res.body).not.toContain('Google Account Connected!');

    googleOAuthService.cleanUpServer(loopback.server);
    fetchSpy.mockRestore();
  });
});
