import http from 'http';
import { URL } from 'url';
import crypto from 'crypto';
import { shell, BrowserWindow } from 'electron';
import { secureStorageService } from './secureStorage';
import { socialAccountRepo } from '../database/repositories/socialAccountRepository';
import { logger } from '../logger';
import {
  GoogleAuthState,
  GoogleUserProfile,
  SocialAccount,
} from '../../shared/types';

export interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

export interface PendingOAuthSession {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  server: http.Server;
  timeoutTimer: NodeJS.Timeout;
  clientId: string;
  resolve: (value: GoogleAuthState) => void;
  reject: (reason: any) => void;
}

export class GoogleAuthService {
  private static readonly AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static readonly TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
  private static readonly USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';
  private static readonly REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

  private static readonly DEFAULT_SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
  ];

  // Default fallback client ID for desktop applications (configured or overridden in settings)
  private defaultClientId = '1092837465920-appdesktop.apps.googleusercontent.com';
  private pendingSession: PendingOAuthSession | null = null;
  private currentStatus: GoogleAuthState = {
    status: 'not_connected',
    statusLabel: 'Not Connected',
    clientIdConfigured: false,
  };

  constructor() {
    this.refreshCurrentStatusFromDb();
  }

  // ==========================================
  // Cryptographic PKCE Generation (RFC 7636)
  // ==========================================

  /**
   * Generates a high-entropy cryptographic code_verifier
   * Length between 43 and 128 characters using unpadded base64url
   */
  public generateCodeVerifier(lengthBytes: number = 32): string {
    return this.base64UrlEncode(crypto.randomBytes(lengthBytes));
  }

  /**
   * Generates a code_challenge derived from code_verifier via SHA-256
   */
  public generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return this.base64UrlEncode(hash);
  }

  /**
   * Generates a cryptographically random state parameter to prevent CSRF
   */
  public generateState(): string {
    return this.base64UrlEncode(crypto.randomBytes(24));
  }

  private base64UrlEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // ==========================================
  // Client ID & Configuration Management
  // ==========================================

  public getClientId(): string {
    const configured = secureStorageService.getSecret('oauth_google_client_id');
    if (configured && configured.trim()) {
      return configured.trim();
    }
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim()) {
      return process.env.GOOGLE_CLIENT_ID.trim();
    }
    return this.defaultClientId;
  }

  public setClientId(clientId: string): void {
    if (clientId && clientId.trim()) {
      secureStorageService.setSecret('oauth_google_client_id', clientId.trim());
    } else {
      secureStorageService.deleteSecret('oauth_google_client_id');
    }
    this.refreshCurrentStatusFromDb();
  }

  public isCustomClientIdConfigured(): boolean {
    const configured = secureStorageService.getSecret('oauth_google_client_id');
    return Boolean(configured && configured.trim().length > 0);
  }

  // ==========================================
  // Status & Synchronization
  // ==========================================

  public refreshCurrentStatusFromDb(): GoogleAuthState {
    const accounts = socialAccountRepo.getByPlatform('google');
    const active = accounts.find((a) => a.isConnected);

    if (active) {
      const hasRefresh = Boolean(socialAccountRepo.getRefreshToken(active.id));
      const isExpired = active.tokenExpiry ? new Date(active.tokenExpiry).getTime() < Date.now() : false;

      this.currentStatus = {
        status: isExpired ? 'expired' : 'connected',
        statusLabel: isExpired ? 'Connection Expired — Reconnect Required' : 'Connected to Google Account',
        account: active,
        profile: {
          id: active.id.replace('google_', ''),
          name: active.accountName,
          email: active.channelId || '',
          picture: active.avatarUrl,
        },
        lastConnectedAt: active.updatedAt,
        hasRefreshToken: hasRefresh,
        clientIdConfigured: this.isCustomClientIdConfigured(),
      };
    } else {
      this.currentStatus = {
        status: 'not_connected',
        statusLabel: 'Not Connected',
        clientIdConfigured: this.isCustomClientIdConfigured(),
      };
    }

    return this.currentStatus;
  }

  public getStatus(): GoogleAuthState {
    return this.refreshCurrentStatusFromDb();
  }

  private broadcastStatus(state: GoogleAuthState): void {
    this.currentStatus = state;
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('googleAuthChanged', state);
        }
      }
    } catch {
      // Ignore if called in non-electron or test environment
    }
  }

  // ==========================================
  // Loopback Server Listener
  // ==========================================

  private startLoopbackServer(
    preferredPort: number = 42828
  ): Promise<{ server: http.Server; port: number; redirectUri: string }> {
    return new Promise((resolve, reject) => {
      const server = http.createServer();

      const tryListen = (port: number) => {
        server.once('error', (err: any) => {
          if (err.code === 'EADDRINUSE' && port === preferredPort) {
            logger.warn('GoogleAuthService', `Port ${preferredPort} in use, falling back to dynamic loopback port.`);
            // Try dynamic ephemeral port assigned by OS
            tryListen(0);
          } else {
            reject(err);
          }
        });

        server.listen(port, '127.0.0.1', () => {
          const address = server.address() as any;
          const assignedPort = address.port;
          const redirectUri = `http://127.0.0.1:${assignedPort}/oauth2callback`;
          logger.info('GoogleAuthService', `Loopback listener active at ${redirectUri}`);
          resolve({ server, port: assignedPort, redirectUri });
        });
      };

      tryListen(preferredPort);
    });
  }

  // ==========================================
  // OAuth 2.0 Flow Execution (PKCE + Browser)
  // ==========================================

  public async startOAuthFlow(
    customClientId?: string
  ): Promise<{ success: boolean; state: GoogleAuthState; authUrl?: string }> {
    // 1. Cancel any active pending session to prevent multiple listeners
    this.cancelPendingOAuth();

    const clientId = customClientId?.trim() || this.getClientId();
    const codeVerifier = this.generateCodeVerifier(32);
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    this.broadcastStatus({
      status: 'connecting',
      statusLabel: 'Waiting for browser sign-in & authorization...',
      clientIdConfigured: this.isCustomClientIdConfigured(),
    });

    // 2. Start temporary local loopback listener
    let loopback: { server: http.Server; port: number; redirectUri: string };
    try {
      loopback = await this.startLoopbackServer(42828);
    } catch (err: any) {
      const errorMsg = `Failed to start local OAuth loopback server: ${err.message}`;
      logger.error('GoogleAuthService', errorMsg);
      const failedState: GoogleAuthState = {
        status: 'error',
        statusLabel: 'Connection Failed',
        error: errorMsg,
        clientIdConfigured: this.isCustomClientIdConfigured(),
      };
      this.broadcastStatus(failedState);
      return { success: false, state: failedState };
    }

    const { server, redirectUri } = loopback;

    // 3. Construct official Google authorization URL
    const authUrlObj = new URL(GoogleAuthService.AUTH_ENDPOINT);
    authUrlObj.searchParams.set('client_id', clientId);
    authUrlObj.searchParams.set('redirect_uri', redirectUri);
    authUrlObj.searchParams.set('response_type', 'code');
    authUrlObj.searchParams.set('scope', GoogleAuthService.DEFAULT_SCOPES.join(' '));
    authUrlObj.searchParams.set('code_challenge', codeChallenge);
    authUrlObj.searchParams.set('code_challenge_method', 'S256');
    authUrlObj.searchParams.set('state', state);
    authUrlObj.searchParams.set('access_type', 'offline');
    authUrlObj.searchParams.set('prompt', 'consent');

    const authUrl = authUrlObj.toString();
    logger.info('GoogleAuthService', `Launching external browser for Google OAuth: ${redirectUri}`);

    // 4. Return promise resolved upon browser callback
    return new Promise((resolve) => {
      // 120-second timeout to automatically clean up
      const timeoutTimer = setTimeout(() => {
        logger.warn('GoogleAuthService', 'OAuth connection timed out after 120 seconds.');
        this.cleanUpServer(server);
        this.pendingSession = null;
        const timeoutState: GoogleAuthState = {
          status: 'error',
          statusLabel: 'Connection Timed Out',
          error: 'Google sign-in timed out. Please click "Connect with Google" to try again.',
          clientIdConfigured: this.isCustomClientIdConfigured(),
        };
        this.broadcastStatus(timeoutState);
        resolve({ success: false, state: timeoutState });
      }, 120000);

      this.pendingSession = {
        state,
        codeVerifier,
        redirectUri,
        server,
        timeoutTimer,
        clientId,
        resolve: (st) => resolve({ success: st.status === 'connected', state: st, authUrl }),
        reject: (err) => {
          const errState: GoogleAuthState = {
            status: 'error',
            statusLabel: 'Connection Failed',
            error: err.message || String(err),
            clientIdConfigured: this.isCustomClientIdConfigured(),
          };
          this.broadcastStatus(errState);
          resolve({ success: false, state: errState, authUrl });
        },
      };

      // 5. Handle HTTP requests on loopback listener
      server.on('request', async (req, res) => {
        const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${loopback.port}`);

        if (parsedUrl.pathname !== '/oauth2callback') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }

        const queryState = parsedUrl.searchParams.get('state');
        const queryCode = parsedUrl.searchParams.get('code');
        const queryError = parsedUrl.searchParams.get('error');
        const errorDescription = parsedUrl.searchParams.get('error_description');

        // Verify CSRF State
        if (queryState !== state) {
          logger.error('GoogleAuthService', `State mismatch: received ${queryState}, expected ${state}`);
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(this.renderHtmlResponse(false, 'Security Verification Failed', 'Invalid OAuth state parameter. Request rejected to prevent CSRF attacks.'));
          this.finishSessionWithError('Invalid state parameter. Authentication aborted for security reasons.');
          return;
        }

        // Handle User Denial / Cancellation
        if (queryError) {
          logger.warn('GoogleAuthService', `OAuth error from Google: ${queryError} - ${errorDescription}`);
          const friendly = queryError === 'access_denied'
            ? 'Sign-in cancelled or requested permissions were denied.'
            : (errorDescription || queryError);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(this.renderHtmlResponse(false, 'Connection Not Completed', friendly));
          this.finishSessionWithError(friendly);
          return;
        }

        if (!queryCode) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(this.renderHtmlResponse(false, 'Missing Code', 'Authorization code not provided in callback.'));
          this.finishSessionWithError('Missing authorization code in callback.');
          return;
        }

        // Send Friendly HTML Response to Browser
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(this.renderHtmlResponse(true, 'Google Account Connected!', 'Authorization successful. You may close this window and return to Social Earnings Studio.'));

        // Exchange Authorization Code for Tokens
        try {
          const tokenData = await this.exchangeCodeForTokens(queryCode, codeVerifier, redirectUri, clientId);
          const profile = await this.fetchUserProfile(tokenData.access_token);

          // Save tokens and account in secure storage & repository
          const account = this.saveGoogleConnection(profile, tokenData);

          const connectedState: GoogleAuthState = {
            status: 'connected',
            statusLabel: 'Connected to Google Account',
            account,
            profile,
            lastConnectedAt: new Date().toISOString(),
            hasRefreshToken: Boolean(tokenData.refresh_token),
            clientIdConfigured: this.isCustomClientIdConfigured(),
          };

          this.finishSessionWithSuccess(connectedState);
        } catch (authError: any) {
          logger.error('GoogleAuthService', `Token exchange error: ${authError.message}`);
          this.finishSessionWithError(`Failed to finalize authentication: ${authError.message}`);
        }
      });

      // 6. Automatically open user's default external browser
      try {
        if (shell && typeof shell.openExternal === 'function') {
          shell.openExternal(authUrl);
        }
      } catch (e: any) {
        logger.warn('GoogleAuthService', `Could not automatically launch browser: ${e.message}`);
      }
    });
  }

  // ==========================================
  // Token Exchange & User Info APIs
  // ==========================================

  public async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    clientId: string
  ): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });

    const response = await fetch(GoogleAuthService.TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = (await response.json()) as OAuthTokenResponse;

    if (!response.ok || data.error) {
      const msg = data.error_description || data.error || `HTTP ${response.status}`;
      throw new Error(`Google token exchange failed: ${msg}`);
    }

    return data;
  }

  public async fetchUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const response = await fetch(GoogleAuthService.USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve Google profile: HTTP ${response.status}`);
    }

    const info = (await response.json()) as any;
    return {
      id: info.sub || info.id,
      email: info.email,
      name: info.name || info.email.split('@')[0],
      picture: info.picture,
      verifiedEmail: info.email_verified,
      locale: info.locale,
    };
  }

  // ==========================================
  // Token Storage & Refresh
  // ==========================================

  public saveGoogleConnection(
    profile: GoogleUserProfile,
    tokenData: OAuthTokenResponse
  ): SocialAccount {
    const accountId = `google_${profile.id}`;

    // 1. Secure token persistence via OS Encrypted Store (DPAPI/Keychain)
    secureStorageService.setSecret(`oauth_${accountId}_access_token`, tokenData.access_token);
    if (tokenData.refresh_token) {
      secureStorageService.setSecret(`oauth_${accountId}_refresh_token`, tokenData.refresh_token);
    }

    // 2. Persist account record in SQLite
    const expiry = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : undefined;

    const account = socialAccountRepo.saveAccount({
      id: accountId,
      platform: 'google',
      accountName: profile.name,
      avatarUrl: profile.picture,
      channelId: profile.email,
      isConnected: true,
      permissions: tokenData.scope ? tokenData.scope.split(' ') : GoogleAuthService.DEFAULT_SCOPES,
      tokenExpiry: expiry,
    }, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    });

    logger.info('GoogleAuthService', `Saved connected Google account ${profile.email} (${accountId})`);
    return account;
  }

  public async refreshAccessToken(
    accountId?: string
  ): Promise<{ success: boolean; state: GoogleAuthState }> {
    const accounts = socialAccountRepo.getByPlatform('google');
    const target = accountId
      ? accounts.find((a) => a.id === accountId)
      : accounts.find((a) => a.isConnected) || accounts[0];

    if (!target) {
      const errState: GoogleAuthState = {
        status: 'error',
        statusLabel: 'No Account Found',
        error: 'No connected Google account found to refresh.',
        clientIdConfigured: this.isCustomClientIdConfigured(),
      };
      this.broadcastStatus(errState);
      return { success: false, state: errState };
    }

    const refreshToken = socialAccountRepo.getRefreshToken(target.id);
    if (!refreshToken) {
      const expiredState: GoogleAuthState = {
        status: 'expired',
        statusLabel: 'Refresh Token Missing',
        error: 'No refresh token stored. Please re-authenticate with Google.',
        account: target,
        clientIdConfigured: this.isCustomClientIdConfigured(),
      };
      this.broadcastStatus(expiredState);
      return { success: false, state: expiredState };
    }

    const clientId = this.getClientId();
    const params = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    try {
      const response = await fetch(GoogleAuthService.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = (await response.json()) as OAuthTokenResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error_description || data.error || `HTTP ${response.status}`);
      }

      // Update access token
      secureStorageService.setSecret(`oauth_${target.id}_access_token`, data.access_token);
      if (data.refresh_token) {
        secureStorageService.setSecret(`oauth_${target.id}_refresh_token`, data.refresh_token);
      }

      const expiry = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      const updated = socialAccountRepo.saveAccount({
        ...target,
        isConnected: true,
        tokenExpiry: expiry,
      });

      const refreshedState: GoogleAuthState = {
        status: 'connected',
        statusLabel: 'Token Refreshed & Active',
        account: updated,
        profile: {
          id: updated.id.replace('google_', ''),
          name: updated.accountName,
          email: updated.channelId || '',
          picture: updated.avatarUrl,
        },
        hasRefreshToken: true,
        lastConnectedAt: updated.updatedAt,
        clientIdConfigured: this.isCustomClientIdConfigured(),
      };

      this.broadcastStatus(refreshedState);
      return { success: true, state: refreshedState };
    } catch (refreshErr: any) {
      logger.error('GoogleAuthService', `Token refresh failed: ${refreshErr.message}`);
      const failedState: GoogleAuthState = {
        status: 'expired',
        statusLabel: 'Session Expired — Reconnect Required',
        error: `Could not refresh token: ${refreshErr.message}. Please click Reconnect.`,
        account: target,
        hasRefreshToken: true,
        clientIdConfigured: this.isCustomClientIdConfigured(),
      };
      this.broadcastStatus(failedState);
      return { success: false, state: failedState };
    }
  }

  // ==========================================
  // Disconnect & Revocation
  // ==========================================

  public async disconnect(
    accountId?: string
  ): Promise<{ success: boolean; state: GoogleAuthState }> {
    this.cancelPendingOAuth();

    const accounts = socialAccountRepo.getByPlatform('google');
    const target = accountId
      ? accounts.find((a) => a.id === accountId)
      : accounts.find((a) => a.isConnected) || accounts[0];

    if (target) {
      // 1. Best-effort token revocation at Google endpoint
      const accessToken = socialAccountRepo.getAccessToken(target.id);
      const refreshToken = socialAccountRepo.getRefreshToken(target.id);
      const tokenToRevoke = accessToken || refreshToken;

      if (tokenToRevoke) {
        try {
          await fetch(`${GoogleAuthService.REVOKE_ENDPOINT}?token=${encodeURIComponent(tokenToRevoke)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          logger.info('GoogleAuthService', `Revoked token at Google OAuth endpoint for ${target.id}`);
        } catch (revokeErr: any) {
          logger.warn('GoogleAuthService', `Remote token revocation warning: ${revokeErr.message}`);
        }
      }

      // 2. Wipe sensitive secrets from native OS vault
      secureStorageService.deleteSecret(`oauth_${target.id}_access_token`);
      secureStorageService.deleteSecret(`oauth_${target.id}_refresh_token`);

      // 3. Mark disconnected in database
      socialAccountRepo.disconnect(target.id);
    }

    const state: GoogleAuthState = {
      status: 'not_connected',
      statusLabel: 'Not Connected',
      clientIdConfigured: this.isCustomClientIdConfigured(),
    };

    this.broadcastStatus(state);
    return { success: true, state };
  }

  // ==========================================
  // Helper / Cleanup Methods
  // ==========================================

  public cancelPendingOAuth(): boolean {
    if (this.pendingSession) {
      clearTimeout(this.pendingSession.timeoutTimer);
      this.cleanUpServer(this.pendingSession.server);
      this.pendingSession.reject(new Error('OAuth flow cancelled.'));
      this.pendingSession = null;
      return true;
    }
    return false;
  }

  private cleanUpServer(server: http.Server): void {
    try {
      server.close();
    } catch {}
  }

  private finishSessionWithSuccess(state: GoogleAuthState): void {
    if (this.pendingSession) {
      clearTimeout(this.pendingSession.timeoutTimer);
      this.cleanUpServer(this.pendingSession.server);
      this.broadcastStatus(state);
      this.pendingSession.resolve(state);
      this.pendingSession = null;
    }
  }

  private finishSessionWithError(errorMessage: string): void {
    if (this.pendingSession) {
      clearTimeout(this.pendingSession.timeoutTimer);
      this.cleanUpServer(this.pendingSession.server);
      const state: GoogleAuthState = {
        status: 'error',
        statusLabel: 'Connection Failed',
        error: errorMessage,
        clientIdConfigured: this.isCustomClientIdConfigured(),
      };
      this.broadcastStatus(state);
      this.pendingSession.reject(new Error(errorMessage));
      this.pendingSession = null;
    }
  }

  /**
   * Renders an elegant, modern dark-themed callback confirmation page for the browser
   */
  private renderHtmlResponse(success: boolean, title: string, message: string): string {
    const iconSvg = success
      ? `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
      : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Social Earnings Studio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #131b2e;
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .icon-wrapper {
      margin-bottom: 20px;
      display: inline-flex;
      padding: 16px;
      border-radius: 50%;
      background: ${success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'};
    }
    .google-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #1e293b;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 12px;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 12px 20px;
      border-radius: 10px;
      background: ${success ? '#0284c7' : '#334155'};
      color: #ffffff;
      font-weight: 600;
      font-size: 14px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn:hover {
      background: ${success ? '#0369a1' : '#475569'};
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="google-badge">
      <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
      Google OAuth 2.0
    </div>
    <div class="icon-wrapper">
      ${iconSvg}
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    <button class="btn" onclick="window.close()">Close this Window</button>
  </div>
</body>
</html>`;
  }
}

export const googleAuthService = new GoogleAuthService();
