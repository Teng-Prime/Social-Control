import http from 'http';
import {
  GoogleAuthState,
  GoogleUserProfile,
  SocialAccount,
} from '../../shared/types';
import {
  GoogleOAuthService,
  OAuthTokenResponse,
  googleOAuthService,
} from './googleOAuthService';
import {
  GoogleCredentialStore,
  googleCredentialStore,
} from './googleCredentialStore';
import {
  GoogleConnectionStatusService,
  googleConnectionStatusService,
} from './googleConnectionStatusService';

export { OAuthTokenResponse };

/**
 * GoogleAuthService (Facade)
 * Coordinates GoogleOAuthService, GoogleCredentialStore, and GoogleConnectionStatusService.
 * Maintains full backwards compatibility with existing tests and IPC methods.
 */
export class GoogleAuthService {
  public static readonly AUTH_ENDPOINT = GoogleOAuthService.AUTH_ENDPOINT;
  public static readonly TOKEN_ENDPOINT = GoogleOAuthService.TOKEN_ENDPOINT;
  public static readonly USERINFO_ENDPOINT = GoogleOAuthService.USERINFO_ENDPOINT;
  public static readonly REVOKE_ENDPOINT = GoogleOAuthService.REVOKE_ENDPOINT;
  public static readonly JWKS_ENDPOINT = GoogleOAuthService.JWKS_ENDPOINT;
  public static readonly DEFAULT_SCOPES = GoogleOAuthService.DEFAULT_SCOPES;

  // Cryptographic utilities
  public generateCodeVerifier(lengthBytes: number = 32): string {
    return googleOAuthService.generateCodeVerifier(lengthBytes);
  }

  public generateCodeChallenge(verifier: string): string {
    return googleOAuthService.generateCodeChallenge(verifier);
  }

  public generateState(lengthBytes: number = 24): string {
    return googleOAuthService.generateState(lengthBytes);
  }

  public generateNonce(lengthBytes: number = 24): string {
    return googleOAuthService.generateNonce(lengthBytes);
  }

  public validateAuthUrl(urlStr: string): boolean {
    return googleOAuthService.validateAuthUrl(urlStr);
  }

  // Client ID & Configuration
  public getClientId(): string {
    return googleCredentialStore.getClientId() || '1092837465920-appdesktop.apps.googleusercontent.com';
  }

  public setClientId(clientId: string): void {
    googleCredentialStore.setClientId(clientId);
    googleConnectionStatusService.refreshStatusFromStorage();
  }

  public isCustomClientIdConfigured(): boolean {
    return googleCredentialStore.isClientIdConfigured();
  }

  public getClientSecret(): string {
    return googleCredentialStore.getClientSecret();
  }

  public setClientSecret(clientSecret: string): void {
    googleCredentialStore.setClientSecret(clientSecret);
    googleConnectionStatusService.refreshStatusFromStorage();
  }

  public isClientSecretConfigured(): boolean {
    return googleCredentialStore.isClientSecretConfigured();
  }

  // Loopback Server & Token Exchange
  public startLoopbackServer(
    preferredPort: number = 0
  ): Promise<{ server: http.Server; port: number; redirectUri: string }> {
    return googleOAuthService.startLoopbackServer(preferredPort);
  }

  public validateIdToken(
    idToken: string,
    expectedClientId: string,
    expectedNonce?: string
  ): Promise<GoogleUserProfile> {
    return googleOAuthService.validateIdToken(idToken, expectedClientId, expectedNonce);
  }

  public exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    clientId: string,
    clientSecret?: string
  ): Promise<OAuthTokenResponse> {
    return googleOAuthService.exchangeCodeForTokens(code, codeVerifier, redirectUri, clientId, clientSecret);
  }

  public fetchUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    return googleOAuthService.fetchUserProfile(accessToken);
  }

  // Token Storage & Refresh
  public saveGoogleConnection(
    profile: GoogleUserProfile,
    tokenData: OAuthTokenResponse
  ): SocialAccount {
    return googleCredentialStore.saveGoogleConnection(profile, tokenData);
  }

  public refreshAccessToken(
    accountId?: string
  ): Promise<{ success: boolean; state: GoogleAuthState }> {
    return googleConnectionStatusService.refreshToken(accountId);
  }

  public disconnect(
    accountId?: string
  ): Promise<{ success: boolean; state: GoogleAuthState }> {
    return googleConnectionStatusService.disconnect(accountId);
  }

  public get pendingSession(): any {
    return googleOAuthService.getPendingSession();
  }

  public set pendingSession(val: any) {
    googleOAuthService.setPendingSession(val);
  }

  public cleanUpServer(server: http.Server): void {
    googleOAuthService.cleanUpServer(server);
  }

  public get currentStatus(): GoogleAuthState {
    return (googleConnectionStatusService as any).currentState;
  }

  public set currentStatus(val: GoogleAuthState) {
    (googleConnectionStatusService as any).currentState = val;
  }

  public broadcastStatus(state: GoogleAuthState): void {
    googleConnectionStatusService.broadcastStatus(state);
  }

  public cancelPendingOAuth(): boolean {
    return googleOAuthService.cancelPendingOAuth();
  }

  // Flow Execution & Status
  public startOAuthFlow(
    customClientId?: string,
    customClientSecret?: string
  ): Promise<{ success: boolean; state: GoogleAuthState; authUrl?: string }> {
    return googleConnectionStatusService.connectGoogle(customClientId, customClientSecret);
  }

  public reconnect(
    customClientId?: string,
    customClientSecret?: string
  ): Promise<{ success: boolean; state: GoogleAuthState; authUrl?: string }> {
    return googleConnectionStatusService.reconnect(customClientId, customClientSecret);
  }

  public getStatus(): GoogleAuthState {
    return googleConnectionStatusService.getStatus();
  }

  public refreshCurrentStatusFromDb(): GoogleAuthState {
    return googleConnectionStatusService.refreshStatusFromStorage();
  }
}

export const googleAuthService = new GoogleAuthService();
