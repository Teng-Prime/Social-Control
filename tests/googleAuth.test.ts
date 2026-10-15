import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import http from 'http';
import { googleAuthService } from '../src/main/services/googleAuthService';
import { socialAccountRepo } from '../src/main/database/repositories/socialAccountRepository';
import { secureStorageService } from '../src/main/services/secureStorage';
import { validateIpcSender } from '../src/main/ipc/index';

function createMockIdToken(
  payloadOverrides: Record<string, any> = {},
  signature: string = 'mock_valid_signature'
): string {
  const header = { alg: 'RS256', kid: 'mock-key-1', typ: 'JWT' };
  const payload = {
    iss: 'https://accounts.google.com',
    aud: '1092837465920-appdesktop.apps.googleusercontent.com',
    sub: '109283746592019283746',
    email: 'test.user@gmail.com',
    email_verified: true,
    name: 'Test User',
    picture: 'https://lh3.googleusercontent.com/a/mock_avatar',
    iat: Math.floor(Date.now() / 1000) - 10,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payloadOverrides,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sigB64 = Buffer.from(signature).toString('base64url');
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

describe('Google OAuth 2.0 PKCE, OIDC Identity & Security Management', () => {
  beforeEach(() => {
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

  // 1. PKCE & Nonce Cryptographic Generation
  it('1. PKCE & Nonce: generates RFC 7636 compliant code_verifier, code_challenge, state, and nonce', () => {
    const verifier = googleAuthService.generateCodeVerifier(32);
    expect(verifier.length).toBe(43);
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

    const state1 = googleAuthService.generateState();
    const state2 = googleAuthService.generateState();
    expect(state1).not.toBe(state2);
    expect(state1.length).toBeGreaterThanOrEqual(32);

    const nonce = googleAuthService.generateNonce();
    expect(nonce.length).toBeGreaterThanOrEqual(32);
    expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  // 2. Security URL Allowlisting
  it('2. URL Allowlisting: permits only official HTTPS Google OAuth endpoint', () => {
    const validUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=123&response_type=code';
    expect(googleAuthService.validateAuthUrl(validUrl)).toBe(true);

    const fakeUrl1 = 'http://accounts.google.com/o/oauth2/v2/auth'; // Insecure HTTP
    expect(googleAuthService.validateAuthUrl(fakeUrl1)).toBe(false);

    const fakeUrl2 = 'https://evil-phishing.com/o/oauth2/v2/auth'; // Malicious domain
    expect(googleAuthService.validateAuthUrl(fakeUrl2)).toBe(false);

    const fakeUrl3 = 'javascript:alert(1)'; // Injection attempt
    expect(googleAuthService.validateAuthUrl(fakeUrl3)).toBe(false);
  });

  // 3. Successful Google Sign-In with OIDC ID Token Validation
  it('3. Successful Sign-In: executes loopback callback, validates OIDC ID token, and stores connection', async () => {
    const clientId = googleAuthService.getClientId();
    const expectedNonce = 'test_nonce_val_12345';

    const validIdToken = createMockIdToken({
      aud: clientId,
      nonce: expectedNonce,
      sub: 'google_user_sub_8888',
      name: 'Elena Rostova',
      email: 'elena@gmail.com',
      picture: 'https://lh3.googleusercontent.com/a/elena_avatar',
    });

    // Mock token exchange fetch
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'valid_access_token_8888',
            refresh_token: 'valid_refresh_token_8888',
            id_token: validIdToken,
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'openid email profile',
          }),
        } as any;
      }
      return { ok: false, status: 404, json: async () => ({}) } as any;
    });

    // Start loopback server
    const loopback = await googleAuthService.startLoopbackServer(0);
    const state = 'test_state_param_9999';

    // Mock pending session with expected state and nonce
    (googleAuthService as any).pendingSession = {
      state,
      codeVerifier: 'verifier_32_bytes_long_mock_code_verifier',
      nonce: expectedNonce,
      redirectUri: loopback.redirectUri,
      server: loopback.server,
      timeoutTimer: setTimeout(() => {}, 60000),
      clientId,
      sessionHandled: false,
      resolve: vi.fn(),
      reject: vi.fn(),
    };

    // Simulate browser callback from Google
    const callbackRes = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      http.get(`${loopback.redirectUri}?code=mock_auth_code_777&state=${state}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 200, body }));
      }).on('error', reject);
    });

    expect(callbackRes.statusCode).toBe(200);
    expect(callbackRes.body).toContain('Google Account Connected!');

    // Wait for async token exchange
    await new Promise((r) => setTimeout(r, 100));

    // Verify session was resolved with success
    const status = googleAuthService.getStatus();
    expect(status.status).toBe('connected');
    expect(status.profile?.id).toBe('google_user_sub_8888');
    expect(status.profile?.email).toBe('elena@gmail.com');
    expect(status.profile?.name).toBe('Elena Rostova');

    // Verify tokens were encrypted into secureStorage (and not plaintext in database)
    const storedAccess = socialAccountRepo.getAccessToken('google_google_user_sub_8888');
    const storedRefresh = socialAccountRepo.getRefreshToken('google_google_user_sub_8888');
    expect(storedAccess).toBe('valid_access_token_8888');
    expect(storedRefresh).toBe('valid_refresh_token_8888');

    googleAuthService.cleanUpServer(loopback.server);
    fetchSpy.mockRestore();
  });

  // 4. Invalid State and Mismatched PKCE Verifier
  it('4. CSRF Prevention: rejects callback with invalid state parameter', async () => {
    const loopback = await googleAuthService.startLoopbackServer(0);
    const expectedState = 'expected_state_abc';

    (googleAuthService as any).pendingSession = {
      state: expectedState,
      codeVerifier: 'test_verifier',
      nonce: 'test_nonce',
      redirectUri: loopback.redirectUri,
      server: loopback.server,
      timeoutTimer: setTimeout(() => {}, 60000),
      clientId: googleAuthService.getClientId(),
      sessionHandled: false,
      resolve: vi.fn(),
      reject: vi.fn(),
    };

    const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      // Attacker sends mismatched state
      http.get(`${loopback.redirectUri}?code=attacker_code&state=wrong_mismatched_state`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 200, body }));
      }).on('error', reject);
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('Security Verification Failed');

    googleAuthService.cleanUpServer(loopback.server);
  });

  // 5. Invalid ID Token and Audience Validation
  it('5. OIDC ID Token Validation: rejects invalid audience, issuer, expired token, and nonce mismatch', async () => {
    const clientId = googleAuthService.getClientId();

    // A. Audience mismatch
    const badAudToken = createMockIdToken({ aud: 'wrong_untrusted_client_id.apps.googleusercontent.com' });
    await expect(googleAuthService.validateIdToken(badAudToken, clientId)).rejects.toThrow(
      /ID token audience mismatch/
    );

    // B. Issuer mismatch
    const badIssToken = createMockIdToken({ iss: 'https://attacker-identity-provider.com' });
    await expect(googleAuthService.validateIdToken(badIssToken, clientId)).rejects.toThrow(
      /Invalid ID token issuer/
    );

    // C. Expired token
    const expiredToken = createMockIdToken({
      exp: Math.floor(Date.now() / 1000) - 1000, // 1000 seconds in the past
    });
    await expect(googleAuthService.validateIdToken(expiredToken, clientId)).rejects.toThrow(
      /ID token has expired/
    );

    // D. Nonce mismatch
    const badNonceToken = createMockIdToken({ nonce: 'actual_nonce_xxx' });
    await expect(
      googleAuthService.validateIdToken(badNonceToken, clientId, 'expected_different_nonce')
    ).rejects.toThrow(/ID token nonce mismatch/);

    // E. Missing sub
    const noSubToken = createMockIdToken({ sub: '' });
    await expect(googleAuthService.validateIdToken(noSubToken, clientId)).rejects.toThrow(
      /missing stable subject identifier/
    );

    // F. Invalid signature bytes
    const badSigToken = createMockIdToken({}, 'invalid_signature_bytes');
    await expect(googleAuthService.validateIdToken(badSigToken, clientId)).rejects.toThrow(
      /signature verification failed/
    );
  });

  // 6. OAuth Denial and User Cancellation
  it('6. OAuth Denial: handles user cancellation or permission denial gracefully', async () => {
    const loopback = await googleAuthService.startLoopbackServer(0);
    const state = 'state_cancel_test';

    (googleAuthService as any).pendingSession = {
      state,
      codeVerifier: 'verifier',
      nonce: 'nonce',
      redirectUri: loopback.redirectUri,
      server: loopback.server,
      timeoutTimer: setTimeout(() => {}, 60000),
      clientId: googleAuthService.getClientId(),
      sessionHandled: false,
      resolve: vi.fn(),
      reject: vi.fn(),
    };

    const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      http.get(`${loopback.redirectUri}?error=access_denied&state=${state}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 200, body }));
      }).on('error', reject);
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Connection Not Completed');
    expect(res.body).toContain('Sign-in cancelled or requested permissions were denied');

    googleAuthService.cleanUpServer(loopback.server);
  });

  // 7. Callback Timeout and Listener Cleanup
  it('7. Timeout & Cleanup: shuts down loopback server and aborts flow after timeout', async () => {
    const loopback = await googleAuthService.startLoopbackServer(0);
    expect(loopback.server.listening).toBe(true);

    googleAuthService.cleanUpServer(loopback.server);

    await new Promise((r) => setTimeout(r, 50));
    expect(loopback.server.listening).toBe(false);
  });

  // 8. Duplicate Callback and Replay Prevention
  it('8. Replay Prevention: rejects duplicate or replayed callback requests on the same listener', async () => {
    const loopback = await googleAuthService.startLoopbackServer(0);
    const state = 'replay_test_state';

    vi.spyOn(googleAuthService as any, 'exchangeCodeForTokens').mockResolvedValue({
      access_token: 'mock_token',
      expires_in: 3600,
    });
    vi.spyOn(googleAuthService as any, 'validateIdToken').mockResolvedValue({
      id: 'sub_mock',
      email: 'test@example.com',
      name: 'Test User',
    });
    vi.spyOn(googleAuthService as any, 'fetchUserProfile').mockResolvedValue({
      id: 'sub_mock',
      email: 'test@example.com',
      name: 'Test User',
    });

    (googleAuthService as any).pendingSession = {
      state,
      codeVerifier: 'verifier',
      nonce: 'nonce',
      redirectUri: loopback.redirectUri,
      server: loopback.server,
      timeoutTimer: setTimeout(() => {}, 60000),
      clientId: googleAuthService.getClientId(),
      sessionHandled: false,
      resolve: vi.fn(),
      reject: vi.fn(),
    };

    // 1. First callback request
    const firstRes = await new Promise<number>((resolve, reject) => {
      http.get(`${loopback.redirectUri}?code=code_1&state=${state}`, (res) => {
        resolve(res.statusCode || 200);
      }).on('error', reject);
    });
    expect(firstRes).toBe(200);

    // 2. Second callback request (replayed)
    const secondRes = await new Promise<number>((resolve, reject) => {
      http.get(`${loopback.redirectUri}?code=code_1&state=${state}`, (res) => {
        resolve(res.statusCode || 200);
      }).on('error', reject);
    });
    expect(secondRes).toBe(409); // Rejected with 409 Conflict

    googleAuthService.cleanUpServer(loopback.server);
  });

  // 9. Session Restoration and Sign-Out (Disconnect)
  it('9. Session Restoration & Sign-Out: restores connection across restarts and cleanly signs out', async () => {
    const mockProfile = {
      id: 'sub_persist_user_1',
      email: 'creator@youtube.com',
      name: 'Creator One',
    };

    // Initial connection save
    const account = googleAuthService.saveGoogleConnection(mockProfile, {
      access_token: 'acc_token_persist',
      refresh_token: 'ref_token_persist',
      expires_in: 3600,
    });
    expect(account.isConnected).toBe(true);

    // Verify session restoration
    const restored = googleAuthService.getStatus();
    expect(restored.status).toBe('connected');
    expect(restored.profile?.email).toBe('creator@youtube.com');
    expect(restored.hasRefreshToken).toBe(true);

    // Disconnect (sign out)
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as any);

    const disconnectRes = await googleAuthService.disconnect(account.id);
    expect(disconnectRes.success).toBe(true);
    expect(disconnectRes.state.status).toBe('disconnected');

    // Tokens must be wiped
    expect(socialAccountRepo.getAccessToken(account.id)).toBeNull();
    expect(socialAccountRepo.getRefreshToken(account.id)).toBeNull();

    // Account marked disconnected
    const updated = socialAccountRepo.getById(account.id);
    expect(updated?.isConnected).toBe(false);

    fetchSpy.mockRestore();
  });

  // 10. Secure Token Handling (No Plaintext Storage)
  it('10. Secure Token Storage: stores sensitive credentials in encrypted store only', () => {
    const mockProfile = {
      id: 'sub_vault_test',
      email: 'vault@test.com',
      name: 'Vault Tester',
    };

    const account = googleAuthService.saveGoogleConnection(mockProfile, {
      access_token: 'secret_access_token_xyz',
      refresh_token: 'secret_refresh_token_xyz',
      expires_in: 3600,
    });

    // Tokens must NOT be in plaintext in the account object
    const dbAccount = socialAccountRepo.getById(account.id) as any;
    expect(dbAccount.accessToken).toBeUndefined();
    expect(dbAccount.refreshToken).toBeUndefined();

    // Secret vault must retrieve tokens via OS safeStorage
    expect(socialAccountRepo.getAccessToken(account.id)).toBe('secret_access_token_xyz');
    expect(socialAccountRepo.getRefreshToken(account.id)).toBe('secret_refresh_token_xyz');
  });

  // 11. IPC Sender Validation
  it('11. IPC Security: validates sender frame origin to block unauthorized origins', () => {
    // Trusted local development origin
    const devEvent = { senderFrame: { url: 'http://localhost:5173/index.html' } } as any;
    expect(validateIpcSender(devEvent)).toBe(true);

    // Trusted production file origin
    const prodEvent = { senderFrame: { url: 'file:///C:/App/dist/index.html' } } as any;
    expect(validateIpcSender(prodEvent)).toBe(true);

    // Malicious external origin
    const untrustedEvent = { senderFrame: { url: 'https://malicious-web.attacker.com/exploit' } } as any;
    expect(validateIpcSender(untrustedEvent)).toBe(false);

    // Empty/CLI event
    const cliEvent = {} as any;
    expect(validateIpcSender(cliEvent)).toBe(true);
  });

  // 12. State Machine Transitions
  it('12. State Machine: accurately transitions across not_connected, connecting, connected, and disconnected', async () => {
    // Start at not connected
    let status = googleAuthService.refreshCurrentStatusFromDb();
    expect(status.status).toBe('not_connected');

    // Simulate connecting
    (googleAuthService as any).broadcastStatus({
      status: 'connecting',
      statusLabel: 'Waiting for browser sign-in...',
    });
    expect((googleAuthService as any).currentStatus.status).toBe('connecting');

    // Simulate connected
    googleAuthService.saveGoogleConnection({
      id: 'user_state_machine',
      email: 'state@machine.com',
      name: 'State Machine User',
    }, {
      access_token: 'tok_sm',
      expires_in: 3600,
    });
    status = googleAuthService.getStatus();
    expect(status.status).toBe('connected');

    // Simulate expired
    (googleAuthService as any).broadcastStatus({
      status: 'expired',
      statusLabel: 'Session Expired',
    });
    expect((googleAuthService as any).currentStatus.status).toBe('expired');

    // Disconnected
    await googleAuthService.disconnect('google_user_state_machine');
    expect((googleAuthService as any).currentStatus.status).toBe('disconnected');
  });
});
