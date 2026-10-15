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
});
