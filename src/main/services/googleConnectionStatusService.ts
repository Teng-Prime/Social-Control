import { BrowserWindow } from 'electron';
import { GoogleAuthState, GoogleFailureReason } from '../../shared/types';
import { googleCredentialStore } from './googleCredentialStore';
import { googleOAuthService } from './googleOAuthService';
import { logger } from '../logger';

/**
 * GoogleConnectionStatusService
 * Manages Google Flow AI connection state machine, verifying status,
 * coordinating sign-in, token refresh, and disconnection.
 */
export class GoogleConnectionStatusService {
  private currentState: GoogleAuthState = {
    status: 'not_connected',
    statusLabel: 'Not Connected',
    clientIdConfigured: false,
  };

  constructor() {
    this.refreshStatusFromStorage();
  }

  /**
   * Refreshes and verifies connection status from SQLite and secure vault.
   */
  public refreshStatusFromStorage(): GoogleAuthState {
    const isConfigured = googleCredentialStore.isClientIdConfigured();
    const activeAccount = googleCredentialStore.getConnectedAccount();

    if (!activeAccount) {
      this.currentState = {
        status: 'not_connected',
        statusLabel: 'Not Connected',
        clientIdConfigured: isConfigured,
      };
      return this.currentState;
    }

    const hasRefresh = Boolean(googleCredentialStore.getRefreshToken(activeAccount.id));
    const isExpired = activeAccount.tokenExpiry
      ? new Date(activeAccount.tokenExpiry).getTime() < Date.now()
      : false;

    if (isExpired) {
      this.currentState = {
        status: 'expired',
        statusLabel: 'Connection Expired — Reconnect Required',
        failureReason: 'token_expired',
        account: activeAccount,
        profile: {
          id: activeAccount.id.replace('google_', ''),
          name: activeAccount.accountName,
          email: activeAccount.channelId || '',
          picture: activeAccount.avatarUrl,
        },
        lastConnectedAt: activeAccount.updatedAt,
        hasRefreshToken: hasRefresh,
        clientIdConfigured: isConfigured,
      };
    } else {
      this.currentState = {
        status: 'connected',
        statusLabel: 'Connected to Google Account',
        account: activeAccount,
        profile: {
          id: activeAccount.id.replace('google_', ''),
          name: activeAccount.accountName,
          email: activeAccount.channelId || '',
          picture: activeAccount.avatarUrl,
        },
        lastConnectedAt: activeAccount.updatedAt,
        hasRefreshToken: hasRefresh,
        clientIdConfigured: isConfigured,
      };
    }

    return this.currentState;
  }

  public getStatus(): GoogleAuthState {
    return this.refreshStatusFromStorage();
  }

  public broadcastStatus(state: GoogleAuthState): void {
    this.currentState = state;
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send('googleAuthChanged', state);
          }
        }
      }
    } catch {
      // Safe fallback in test or headless environments
    }
  }

  /**
   * Initiates Google Sign-In with validation and state transitions.
   */
  public async connectGoogle(
    customClientId?: string
  ): Promise<{ success: boolean; state: GoogleAuthState; authUrl?: string }> {
    // 1. Prevent duplicate requests while connecting
    if (this.currentState.status === 'connecting' || googleOAuthService.isAuthInProgress()) {
      logger.warn('GoogleConnectionStatusService', 'Sign-in already in progress. Ignoring duplicate click.');
      return { success: false, state: this.currentState };
    }

    // 2. Validate Client ID
    const effectiveClientId = customClientId?.trim() || googleCredentialStore.getClientId();
    const validation = googleCredentialStore.validateClientId(effectiveClientId);

    if (!validation.valid) {
      const errorMsg =
        validation.error ||
        'Google OAuth Client ID is required. Please click "Configure Client ID" in Advanced Settings to configure your Desktop Client ID.';
      logger.warn('GoogleConnectionStatusService', `Configuration check failed: ${errorMsg}`);

      const configErrorState: GoogleAuthState = {
        status: 'error',
        statusLabel: 'Configuration Missing',
        failureReason: 'configuration_missing',
        error: errorMsg,
        clientIdConfigured: false,
      };

      this.broadcastStatus(configErrorState);
      return { success: false, state: configErrorState };
    }

    // If a custom valid client ID was passed in, persist it
    if (customClientId && customClientId.trim() !== googleCredentialStore.getClientId()) {
      googleCredentialStore.setClientId(customClientId.trim());
    }

    // 3. Transition to Connecting
    const connectingState: GoogleAuthState = {
      status: 'connecting',
      statusLabel: 'Opening browser for Google authorization...',
      clientIdConfigured: true,
    };
    this.broadcastStatus(connectingState);

    // 4. Execute OAuth flow
    try {
      const { profile, tokenData, authUrl } = await googleOAuthService.executeFlow(effectiveClientId);

      // 5. Securely persist credentials
      const account = googleCredentialStore.saveGoogleConnection(profile, tokenData);

      const connectedState: GoogleAuthState = {
        status: 'connected',
        statusLabel: 'Connected to Google Account',
        account,
        profile,
        lastConnectedAt: new Date().toISOString(),
        hasRefreshToken: Boolean(tokenData.refresh_token),
        clientIdConfigured: true,
      };

      this.broadcastStatus(connectedState);
      return { success: true, state: connectedState, authUrl };
    } catch (err: any) {
      const failureReason: GoogleFailureReason =
        err.failureReason ||
        (err.message?.includes('cancelled')
          ? 'user_cancelled'
          : err.message?.includes('denied')
          ? 'access_denied'
          : 'connection_error');

      logger.error('GoogleConnectionStatusService', `Sign-in failed (${failureReason}): ${err.message}`);

      const errorState: GoogleAuthState = {
        status: 'error',
        statusLabel: failureReason === 'user_cancelled' ? 'Sign-In Cancelled' : 'Connection Failed',
        failureReason,
        error: err.message || 'Authentication failed',
        clientIdConfigured: true,
      };

      this.broadcastStatus(errorState);
      return { success: false, state: errorState };
    }
  }

  /**
   * Refreshes the active Google OAuth access token.
   */
  public async refreshToken(
    accountId?: string
  ): Promise<{ success: boolean; state: GoogleAuthState }> {
    const account = accountId
      ? googleCredentialStore.getAllGoogleAccounts().find((a) => a.id === accountId)
      : googleCredentialStore.getConnectedAccount();

    if (!account) {
      const errState: GoogleAuthState = {
        status: 'error',
        statusLabel: 'No Connected Account',
        failureReason: 'connection_error',
        error: 'No active Google account found to refresh.',
        clientIdConfigured: googleCredentialStore.isClientIdConfigured(),
      };
      this.broadcastStatus(errState);
      return { success: false, state: errState };
    }

    const refreshToken = googleCredentialStore.getRefreshToken(account.id);
    if (!refreshToken) {
      const expiredState: GoogleAuthState = {
        status: 'expired',
        statusLabel: 'Session Expired — Reconnect Required',
        failureReason: 'token_expired',
        error: 'No refresh token stored. Please click Reconnect to sign in.',
        account,
        clientIdConfigured: googleCredentialStore.isClientIdConfigured(),
      };
      this.broadcastStatus(expiredState);
      return { success: false, state: expiredState };
    }

    const clientId = googleCredentialStore.getClientId();
    try {
      const tokenData = await googleOAuthService.refreshTokens(clientId, refreshToken);
      const updated = googleCredentialStore.updateRefreshedTokens(
        account.id,
        tokenData.access_token,
        tokenData.expires_in,
        tokenData.refresh_token
      );

      const refreshedState: GoogleAuthState = {
        status: 'connected',
        statusLabel: 'Token Refreshed & Active',
        account: updated || account,
        profile: {
          id: account.id.replace('google_', ''),
          name: account.accountName,
          email: account.channelId || '',
          picture: account.avatarUrl,
        },
        hasRefreshToken: true,
        lastConnectedAt: new Date().toISOString(),
        clientIdConfigured: true,
      };

      this.broadcastStatus(refreshedState);
      return { success: true, state: refreshedState };
    } catch (refreshErr: any) {
      logger.error('GoogleConnectionStatusService', `Token refresh failed: ${refreshErr.message}`);
      const failedState: GoogleAuthState = {
        status: 'expired',
        statusLabel: 'Session Expired — Reconnect Required',
        failureReason: 'token_expired',
        error: `Could not refresh session: ${refreshErr.message}. Please click Reconnect.`,
        account,
        hasRefreshToken: true,
        clientIdConfigured: googleCredentialStore.isClientIdConfigured(),
      };
      this.broadcastStatus(failedState);
      return { success: false, state: failedState };
    }
  }

  /**
   * Disconnects the Google account, revoking remote tokens and wiping local credentials.
   */
  public async disconnect(
    accountId?: string
  ): Promise<{ success: boolean; state: GoogleAuthState }> {
    googleOAuthService.cancelPendingOAuth();

    const account = accountId
      ? googleCredentialStore.getAllGoogleAccounts().find((a) => a.id === accountId)
      : googleCredentialStore.getConnectedAccount();

    if (account) {
      const token =
        googleCredentialStore.getAccessToken(account.id) ||
        googleCredentialStore.getRefreshToken(account.id);

      if (token) {
        await googleOAuthService.revokeToken(token);
        logger.info('GoogleConnectionStatusService', `Revoked token remotely for account: ${account.id}`);
      }

      googleCredentialStore.clearCredentials(account.id);
    }

    const disconnectedState: GoogleAuthState = {
      status: 'disconnected',
      statusLabel: 'Disconnected',
      clientIdConfigured: googleCredentialStore.isClientIdConfigured(),
    };

    this.broadcastStatus(disconnectedState);
    return { success: true, state: disconnectedState };
  }

  /**
   * Reconnects by clearing any broken session and triggering a fresh OAuth sign-in.
   */
  public async reconnect(
    customClientId?: string
  ): Promise<{ success: boolean; state: GoogleAuthState; authUrl?: string }> {
    googleOAuthService.cancelPendingOAuth();
    return this.connectGoogle(customClientId);
  }
}

export const googleConnectionStatusService = new GoogleConnectionStatusService();
