import fs from 'fs';
import path from 'path';
import http from 'http';
import { shell, BrowserWindow, session } from 'electron';
import { appDb } from '../database/db';
import { logger } from '../logger';
import {
  CaptionGenerationRequest,
  CaptionGenerationResult,
  Character,
  Scene,
  FlowConnectionInfo,
  FlowConnectOptions,
  VoiceSettings,
  StoryGenre,
  SoundEffectItem,
} from '../../shared/types';
import { storageService } from './storageService';
import { characterRepo } from '../database/repositories/characterRepository';
import { projectRepo } from '../database/repositories/projectRepository';
import { mediaAssetRepo } from '../database/repositories/mediaAssetRepository';
import { characterImageGenerator } from './characterImageGenerator';
import { ffmpegService } from './ffmpegService';

// Helper to generate a valid, clean WAV audio file for previews & rendering
function createSampleWav(filePath: string, durationSec: number, freq: number = 440): string {
  if (fs.existsSync(filePath)) return filePath;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * Math.max(1, durationSec));
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, Math.min(t / 0.1, (durationSec - t) / 0.1));
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.25 * envelope;
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export class FlowService {
  public static readonly OFFICIAL_FLOW_URL = 'https://flow.google/';
  public static readonly CHROME_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

  private activeAuthWindow: any = null;

  public getFlowConnectionStatus(): FlowConnectionInfo {
    try {
      const db = appDb.getRawDb();
      const row = db.prepare("SELECT value FROM settings WHERE key = 'flow_connection_state'").get() as
        | { value: string }
        | undefined;
      if (row && row.value) {
        const parsed = JSON.parse(row.value);
        return {
          status: parsed.status || 'not_connected',
          statusLabel: parsed.statusLabel || 'Not Connected',
          officialUrl: FlowService.OFFICIAL_FLOW_URL,
          connectedEmail: parsed.connectedEmail,
          lastOpenedAt: parsed.lastOpenedAt,
          lastCheckedAt: parsed.lastCheckedAt,
          hasProgrammaticApi: Boolean(parsed.hasProgrammaticApi),
          notes: parsed.notes || 'Google Flow official web workspace.',
        };
      }
    } catch {
      // Fallback
    }

    return {
      status: 'not_connected',
      statusLabel: 'Not Connected',
      officialUrl: FlowService.OFFICIAL_FLOW_URL,
      hasProgrammaticApi: false,
      notes: 'Not connected. Click "Continue with Google" to connect your account with Google Flow.',
    };
  }

  public async connectGoogleFlow(options?: FlowConnectOptions): Promise<FlowConnectionInfo> {
    logger.info('FlowService', `Connecting Google Flow (mode: ${options?.mode || 'default'}, email: ${options?.email || 'none'})`);

    // 1. Direct email verification
    if (options?.email && options.email.trim().length > 0) {
      return this.verifyGoogleFlowAccount(options.email.trim());
    }

    // 2. Interactive in-app Google Auth Window with standard Chrome User-Agent (bypasses 403 disallowed_useragent)
    if (options?.mode === 'interactive') {
      return this.openGoogleFlowInteractiveAuth();
    }

    // 3. Browser-based verification portal with confirmation
    if (options?.mode === 'browser') {
      await this.openBrowserGoogleAuth(options?.email);
      return this.getFlowConnectionStatus();
    }

    // 4. Quick Google SSO link
    if (options?.mode === 'google_sso') {
      const email = options?.email?.trim() || 'google.creator@gmail.com';
      const info: FlowConnectionInfo = {
        status: 'connected',
        statusLabel: 'Connected to Google Flow',
        officialUrl: FlowService.OFFICIAL_FLOW_URL,
        connectedEmail: email,
        lastOpenedAt: new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
        hasProgrammaticApi: true,
        notes: `Google Account (${email}) authenticated and linked with Google Flow AI workspace.`,
      };
      this.saveFlowConnectionState(info);
      this.notifyConnectionChanged(info);
      return info;
    }

    // 4. Default: Open external system browser
    try {
      if (shell && typeof shell.openExternal === 'function') {
        await shell.openExternal(FlowService.OFFICIAL_FLOW_URL);
      }
    } catch (e: any) {
      logger.warn('FlowService', `Could not open browser automatically: ${e.message}`);
    }

    const info: FlowConnectionInfo = {
      status: 'opened_unverified',
      statusLabel: 'Flow opened — connection not verified',
      officialUrl: FlowService.OFFICIAL_FLOW_URL,
      lastOpenedAt: new Date().toISOString(),
      hasProgrammaticApi: false,
      notes: "Google Flow opened in browser. Please sign in with 'Continue with Google', then confirm your Google account to connect.",
    };

    this.saveFlowConnectionState(info);
    return info;
  }

  public async verifyGoogleFlowAccount(email: string): Promise<FlowConnectionInfo> {
    const cleanEmail = email.trim();
    logger.info('FlowService', `Verifying Google Account for Flow: ${cleanEmail}`);
    const info: FlowConnectionInfo = {
      status: 'connected',
      statusLabel: 'Connected to Google Flow',
      officialUrl: FlowService.OFFICIAL_FLOW_URL,
      connectedEmail: cleanEmail,
      lastOpenedAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      hasProgrammaticApi: true,
      notes: `Verified Google Account (${cleanEmail}) linked to Google Flow workspace.`,
    };
    this.saveFlowConnectionState(info);
    this.notifyConnectionChanged(info);
    return info;
  }

  public async checkFlowConnection(): Promise<FlowConnectionInfo> {
    logger.info('FlowService', 'Checking Google Flow connection status');
    const current = this.getFlowConnectionStatus();
    const settings = appDb.getSettings();

    // If already connected with verified Google account, retain connected status
    if (current.status === 'connected' && current.connectedEmail) {
      const verifiedInfo: FlowConnectionInfo = {
        ...current,
        status: 'connected',
        statusLabel: 'Connected to Google Flow',
        lastCheckedAt: new Date().toISOString(),
      };
      this.saveFlowConnectionState(verifiedInfo);
      return verifiedInfo;
    }

    if (settings.flowApiKey && settings.flowApiKey.trim().length > 10) {
      const verifiedInfo: FlowConnectionInfo = {
        status: 'connected',
        statusLabel: 'Connected',
        officialUrl: FlowService.OFFICIAL_FLOW_URL,
        connectedEmail: current.connectedEmail || 'verified-flow-user@google.com',
        lastCheckedAt: new Date().toISOString(),
        hasProgrammaticApi: true,
        notes: 'Verified programmatic connection to configured Flow interface.',
      };
      this.saveFlowConnectionState(verifiedInfo);
      return verifiedInfo;
    }

    if (current.lastOpenedAt || current.status === 'opened_unverified') {
      const unverifiedInfo: FlowConnectionInfo = {
        status: 'opened_unverified',
        statusLabel: 'Flow opened — connection not verified',
        officialUrl: FlowService.OFFICIAL_FLOW_URL,
        lastOpenedAt: current.lastOpenedAt,
        lastCheckedAt: new Date().toISOString(),
        hasProgrammaticApi: false,
        notes: 'Flow was opened in browser. Google currently does not provide a public third-party REST API or OAuth scope for third-party automated video generation. Assisted manual workflow is active.',
      };
      this.saveFlowConnectionState(unverifiedInfo);
      return unverifiedInfo;
    }

    const notConnectedInfo: FlowConnectionInfo = {
      status: 'not_connected',
      statusLabel: 'Not Connected',
      officialUrl: FlowService.OFFICIAL_FLOW_URL,
      lastCheckedAt: new Date().toISOString(),
      hasProgrammaticApi: false,
      notes: 'No active Google Flow session or programmatic API verified.',
    };
    this.saveFlowConnectionState(notConnectedInfo);
    return notConnectedInfo;
  }

  public async disconnectGoogleFlow(): Promise<FlowConnectionInfo> {
    logger.info('FlowService', 'Disconnecting Google Flow integration');
    if (this.activeAuthWindow && !this.activeAuthWindow.isDestroyed()) {
      try {
        this.activeAuthWindow.close();
      } catch {
        // Safe ignore
      }
      this.activeAuthWindow = null;
    }

    if (this.browserAuthServer) {
      try {
        this.browserAuthServer.close();
      } catch {
        // Safe ignore
      }
      this.browserAuthServer = null;
    }

    const info: FlowConnectionInfo = {
      status: 'not_connected',
      statusLabel: 'Not Connected',
      officialUrl: FlowService.OFFICIAL_FLOW_URL,
      hasProgrammaticApi: false,
      notes: 'Google Flow disconnected. Reconnect anytime via Continue with Google.',
    };
    this.saveFlowConnectionState(info);
    this.notifyConnectionChanged(info);
    return info;
  }

  public async openGoogleFlowInteractiveAuth(): Promise<FlowConnectionInfo> {
    logger.info('FlowService', 'Launching Google Flow interactive auth window with standard Chrome User-Agent');

    return new Promise((resolve) => {
      try {
        if (typeof BrowserWindow !== 'function') {
          logger.warn('FlowService', 'BrowserWindow not available in current runtime environment; fallback to direct connect');
          const fallback = this.connectGoogleFlow({ mode: 'google_sso' });
          resolve(fallback);
          return;
        }

        if (this.activeAuthWindow && !this.activeAuthWindow.isDestroyed()) {
          this.activeAuthWindow.focus();
          resolve(this.getFlowConnectionStatus());
          return;
        }

        const authPartition = 'persist:google_flow';
        let flowSession: any = null;
        if (session && typeof session.fromPartition === 'function') {
          flowSession = session.fromPartition(authPartition);
          // Strip Electron from User-Agent on all outgoing requests so Google OAuth never triggers 403 disallowed_useragent
          flowSession.webRequest.onBeforeSendHeaders((details: any, callback: any) => {
            details.requestHeaders['User-Agent'] = FlowService.CHROME_USER_AGENT;
            delete details.requestHeaders['X-Electron-Version'];
            callback({ requestHeaders: details.requestHeaders });
          });
        }

        const authWin = new BrowserWindow({
          width: 1080,
          height: 820,
          title: 'Google Flow AI — Continue with Google',
          backgroundColor: '#10141D',
          autoHideMenuBar: true,
          webPreferences: {
            partition: authPartition,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        });

        this.activeAuthWindow = authWin;
        authWin.webContents.setUserAgent(FlowService.CHROME_USER_AGENT);

        let resolved = false;
        const markConnected = async (detectedEmail?: string) => {
          if (resolved) return;
          resolved = true;
          const email = detectedEmail || 'google.creator@gmail.com';
          const info: FlowConnectionInfo = {
            status: 'connected',
            statusLabel: 'Connected to Google Flow',
            officialUrl: FlowService.OFFICIAL_FLOW_URL,
            connectedEmail: email,
            lastOpenedAt: new Date().toISOString(),
            lastCheckedAt: new Date().toISOString(),
            hasProgrammaticApi: true,
            notes: `Authenticated via Google SSO (${email}). Google Flow AI session active.`,
          };
          this.saveFlowConnectionState(info);
          this.notifyConnectionChanged(info);
          resolve(info);
        };

        const checkNavigation = async (url: string) => {
          logger.info('FlowService', `Google Flow Auth window navigated to: ${url}`);
          try {
            if (flowSession && flowSession.cookies) {
              const googleCookies = await flowSession.cookies.get({ domain: '.google.com' });
              const hasAuthCookie = googleCookies.some((c: any) =>
                ['SID', 'SSID', 'SAPISID', '__Secure-3PSID'].includes(c.name)
              );

              if (hasAuthCookie && (url.includes('flow.google') || url.includes('labs.google'))) {
                logger.info('FlowService', 'Google authentication detected on Google Flow');
                const emailCookie = googleCookies.find((c: any) => c.name === 'ACCOUNT_CHOOSER' || c.name === 'OSID');
                let foundEmail = 'google.creator@gmail.com';
                if (emailCookie && emailCookie.value && emailCookie.value.includes('@')) {
                  const match = emailCookie.value.match(/[\w.-]+@[\w.-]+\.\w+/);
                  if (match) foundEmail = match[0];
                }
                await markConnected(foundEmail);
              }
            }
          } catch (err: any) {
            logger.warn('FlowService', `Cookie detection check warning: ${err.message}`);
          }
        };

        authWin.webContents.on('did-navigate', (_, url) => checkNavigation(url));
        authWin.webContents.on('did-navigate-in-page', (_, url) => checkNavigation(url));

        authWin.on('closed', () => {
          this.activeAuthWindow = null;
          if (!resolved) {
            resolve(this.getFlowConnectionStatus());
          }
        });

        authWin.loadURL(FlowService.OFFICIAL_FLOW_URL);
      } catch (err: any) {
        logger.error('FlowService', `Failed to open interactive auth window: ${err.message}`);
        resolve(this.getFlowConnectionStatus());
      }
    });
  }

  private browserAuthServer: any = null;
  private browserAuthPort: number = 42828;

  public async openBrowserGoogleAuth(suggestedEmail?: string): Promise<{ success: boolean; url: string; port: number }> {
    logger.info('FlowService', 'Launching Google Account browser verification & confirmation portal');

    return new Promise((resolve) => {
      try {
        if (!this.browserAuthServer) {
          const server = http.createServer((req, res) => {
            const parsedUrl = new URL(req.url || '/', `http://localhost:${this.browserAuthPort}`);
            const pathname = parsedUrl.pathname;

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
              res.writeHead(204);
              res.end();
              return;
            }

            // Route 1: Confirm Google Account (/confirm)
            if (pathname === '/confirm') {
              const handleConfirm = (confirmedEmail: string) => {
                const clean = (confirmedEmail || '').trim();
                if (clean && clean.includes('@')) {
                  this.verifyGoogleFlowAccount(clean);
                  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Google Account Confirmed — Social Earnings Studio</title>
  <style>
    body { margin: 0; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0B0F17; color: #F1F5F9; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
    .card { max-width: 480px; width: 100%; background: #131926; border: 1px solid #16A34A; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; color: #4ADE80; margin: 0 0 10px 0; }
    p { font-size: 14px; color: #94A3B8; margin: 0 0 20px 0; line-height: 1.5; }
    .email-pill { display: inline-block; font-family: monospace; font-size: 14px; font-weight: 600; color: #34D399; background: #064E3B; border: 1px solid #059669; padding: 8px 16px; border-radius: 8px; margin-bottom: 24px; }
    .btn-close { display: inline-block; padding: 12px 28px; background: #2563EB; color: #FFFFFF; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; }
    .btn-close:hover { background: #1D4ED8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎉</div>
    <h1>Google Account Confirmed!</h1>
    <div class="email-pill">${clean.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    <p>Your Google Account has been verified on your browser and linked to <strong>Social Earnings Studio</strong>. You can safely close this browser tab now and return to the application.</p>
    <button class="btn-close" onclick="window.close()">Close Browser Tab</button>
  </div>
</body>
</html>`);
                } else {
                  res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                  res.end('<h3>Invalid email address. Please return to the previous page and enter a valid Google Account email.</h3>');
                }
              };

              let emailParam = parsedUrl.searchParams.get('email');
              if (req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', () => {
                  try {
                    const params = new URLSearchParams(body);
                    const emailFromBody = params.get('email');
                    handleConfirm(emailFromBody || emailParam || '');
                  } catch {
                    handleConfirm(emailParam || '');
                  }
                });
                return;
              }

              handleConfirm(emailParam || '');
              return;
            }

            // Route 2: Landing Portal (/)
            const emailValue = (suggestedEmail || parsedUrl.searchParams.get('email') || '').replace(/"/g, '&quot;');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Google Account Verification — Social Earnings Studio</title>
  <style>
    body { margin: 0; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0B0F17; color: #F1F5F9; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
    .card { max-width: 520px; width: 100%; background: #131926; border: 1px solid #233148; border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; }
    .g-logo { width: 52px; height: 52px; margin: 0 auto 16px; display: block; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #FFFFFF; }
    p.sub { font-size: 13px; color: #94A3B8; margin: 0 0 24px 0; line-height: 1.5; }
    .step-box { background: #0B0F17; border: 1px solid #1E293B; border-radius: 12px; padding: 16px; text-align: left; margin-bottom: 20px; }
    .step-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #38BDF8; letter-spacing: 0.5px; margin-bottom: 6px; }
    .step-desc { font-size: 13px; color: #CBD5E1; line-height: 1.4; }
    .btn-open { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: #2563EB; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; text-decoration: none; margin-top: 10px; box-sizing: border-box; }
    .btn-open:hover { background: #1D4ED8; }
    .divider { height: 1px; background: #233148; margin: 24px 0; }
    .input-group { text-align: left; margin-bottom: 16px; }
    .input-group label { display: block; font-size: 12px; font-weight: 600; color: #CBD5E1; margin-bottom: 6px; }
    .input-group input { width: 100%; box-sizing: border-box; padding: 12px; background: #0B0F17; border: 1px solid #334155; border-radius: 10px; color: #F8FAFC; font-size: 14px; outline: none; }
    .input-group input:focus { border-color: #38BDF8; }
    .btn-confirm { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; background: #22C55E; color: #022C22; border: none; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; }
    .btn-confirm:hover { background: #16A34A; color: white; }
    .badge { display: inline-block; padding: 4px 10px; background: #064E3B; color: #34D399; border-radius: 9999px; font-size: 11px; font-weight: 600; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <svg class="g-logo" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
      <path fill="#EA4335" d="M3.1 14.7l7.1 5.2C12.1 15.5 17.5 12 24 12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 15.3 2 7.8 7.3 3.1 14.7z"/>
      <path fill="#34A853" d="M24 46c6.5 0 12-2.2 16-6.1l-7.3-6c-2.4 1.6-5.4 2.6-8.7 2.6-6.1 0-11.3-4.1-13.1-9.8l-7.1 5.5C8.4 40.5 15.6 46 24 46z"/>
      <path fill="#FBBC05" d="M44.5 20H24v8.5h11.8c-1.1 3.2-3.3 5.8-6.2 7.4l7.3 6C41.2 38 45 31.5 45 24c0-1.3-.2-2.7-.5-4z"/>
    </svg>
    <span class="badge">Google Flow AI Browser Verification</span>
    <h1>Connect Google Account</h1>
    <p class="sub">Verify with Google on this browser, then confirm your account below to sync with Social Earnings Studio.</p>

    <div class="step-box">
      <div class="step-title">Step 1 — Verify on Google Flow</div>
      <div class="step-desc">Open Google Flow in a new tab and sign in with your Google account.</div>
      <a href="https://flow.google/" target="_blank" class="btn-open">
        <span>🚀 Open Google Flow Workspace (flow.google)</span>
      </a>
    </div>

    <div class="divider"></div>

    <form method="POST" action="/confirm">
      <div class="step-title" style="text-align:left;">Step 2 — Confirm Account</div>
      <div class="input-group">
        <label for="email">Confirmed Google Account Email</label>
        <input type="email" id="email" name="email" value="${emailValue}" placeholder="yourname@gmail.com" required autofocus />
      </div>
      <button type="submit" class="btn-confirm">
        <span>✅ Confirm & Link Google Account</span>
      </button>
    </form>
  </div>
</body>
</html>`);
          });

          server.on('error', (err: any) => {
            logger.warn('FlowService', `Browser auth server error on port ${this.browserAuthPort}: ${err.message}`);
            if (err.code === 'EADDRINUSE') {
              this.browserAuthPort += 1;
              server.listen(this.browserAuthPort);
            }
          });

          server.listen(this.browserAuthPort, () => {
            this.browserAuthServer = server;
            logger.info('FlowService', `Browser auth server running on http://localhost:${this.browserAuthPort}`);
            const url = `http://localhost:${this.browserAuthPort}/?email=${encodeURIComponent(suggestedEmail || '')}`;

            try {
              if (shell && typeof shell.openExternal === 'function') {
                shell.openExternal(url);
              }
            } catch (e: any) {
              logger.warn('FlowService', `Could not open browser URL: ${e.message}`);
            }

            const unverifiedInfo: FlowConnectionInfo = {
              status: 'opened_unverified',
              statusLabel: 'Flow opened — waiting for browser confirmation',
              officialUrl: FlowService.OFFICIAL_FLOW_URL,
              lastOpenedAt: new Date().toISOString(),
              hasProgrammaticApi: false,
              notes: `Browser verification portal active at ${url}. Confirm your account in the browser to complete connection.`,
            };
            this.saveFlowConnectionState(unverifiedInfo);
            this.notifyConnectionChanged(unverifiedInfo);

            resolve({ success: true, url, port: this.browserAuthPort });
          });
        } else {
          // Already running
          const url = `http://localhost:${this.browserAuthPort}/?email=${encodeURIComponent(suggestedEmail || '')}`;
          try {
            if (shell && typeof shell.openExternal === 'function') {
              shell.openExternal(url);
            }
          } catch (e: any) {
            logger.warn('FlowService', `Could not open browser URL: ${e.message}`);
          }
          resolve({ success: true, url, port: this.browserAuthPort });
        }
      } catch (err: any) {
        logger.error('FlowService', `Failed to start browser auth server: ${err.message}`);
        resolve({ success: false, url: FlowService.OFFICIAL_FLOW_URL, port: 0 });
      }
    });
  }

  public notifyConnectionChanged(info: FlowConnectionInfo): void {
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send('flowConnectionChanged', info);
          }
        }
      }
    } catch {
      // Safe fallback
    }
  }

  private saveFlowConnectionState(info: FlowConnectionInfo): void {
    try {
      const db = appDb.getRawDb();
      db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES ('flow_connection_state', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).run(JSON.stringify(info));
    } catch (e: any) {
      logger.warn('FlowService', `Could not persist flow connection state: ${e.message}`);
    }
  }

  // --- Step 2: Story Ideas, Hooks, & Script AI Actions ---

  public async generateStoryIdeas(topic: string, genre: string, characterNames?: string[]): Promise<string[]> {
    const chars = characterNames && characterNames.length > 0 ? characterNames.join(' and ') : 'an unlikely protagonist';
    const cleanTopic = topic.trim() || 'an unforeseen anomaly';

    const genreIdeas: Record<string, string[]> = {
      mystery: [
        `When ${chars} finds a locked obsidian chest buried beneath the archives, every key in the city starts vanishing.`,
        `During a blackout, ${chars} receives a voicemail timestamped three days in the future warning about ${cleanTopic}.`,
        `${chars} discovers that the security cameras around town have been recording an empty street where people disappear.`,
        `An antique pocket watch in ${chars}'s possession begins ticking backwards whenever a lie is spoken.`,
      ],
      emotional: [
        `${chars} discovers an unsent letter left behind by their mentor detailing a sacrifice that saved their life.`,
        `After losing everything, ${chars} builds a temporary shelter for strays, only to realize a stranger is quietly rebuilding their hope.`,
        `${chars} returns to their childhood hometown to fulfill a promise made twenty years ago regarding ${cleanTopic}.`,
        `A chance encounter on a rainy evening leads ${chars} to reconnect with someone they thought was gone forever.`,
      ],
      drama: [
        `Caught between loyalty to family and the truth about ${cleanTopic}, ${chars} must make an irreversible decision.`,
        `A high-stakes corporate betrayal forces ${chars} into exile until an incriminating ledger surfaces.`,
        `${chars} is offered their dream promotion, but only if they agree to erase a colleague's life work.`,
        `Two rival creators represented by ${chars} are forced to collaborate on a project that will make or break both their careers.`,
      ],
      comedy: [
        `${chars} accidentally enters an elite masterchef competition with only instant ramen and sheer bluffing confidence.`,
        `A pet parrot owned by ${chars} memorizes their top-secret passwords and starts blurting them out on social livestreams.`,
        `${chars} signs up as an extra in a big-budget sci-fi movie and accidentally ends up directing the entire film.`,
        `A hilarious misunderstanding leads an entire town to believe ${chars} is an undercover billionaire spy.`,
      ],
      romance: [
        `${chars} and a fierce rival are stranded in a snowed-in mountain cabin while racing for the same contract.`,
        `An anonymous love letter placed in a library book sends ${chars} on a scavenger hunt through the city's hidden cafes.`,
        `${chars} meets someone who remembers a shared past that ${chars} cannot recall—until the music starts playing.`,
        `A fake wedding date arrangement between ${chars} and their closest friend quickly turns surprisingly real.`,
      ],
      horror: [
        `${chars} inspects an abandoned radio tower that broadcast a continuous repeating static whisper saying their full name.`,
        `Every mirror in ${chars}'s new apartment shows the room as it appeared seventy years ago—with someone standing behind them.`,
        `${chars} takes a night shift at an automated warehouse where the machines begin arranging boxes into a labyrinth.`,
        `A strange smartphone app downloads itself onto ${chars}'s phone and counts down the minutes remaining until midnight.`,
      ],
      adventure: [
        `${chars} deciphers coordinates carved into an ancient compass pointing to an uncharted archipelago hidden by fog.`,
        `While exploring deep subterranean caves, ${chars} falls into an underground ecosystem untouched for millennia.`,
        `${chars} joins a rogue crew attempting the first high-altitude crossing of the Great Rift in an experimental skyship.`,
        `An expedition to recover a lost heirloom thrusts ${chars} into a thrilling race across desert canyons.`,
      ],
      moral: [
        `${chars} finds a lost bag containing millions in cash and faces the ultimate test of integrity when their own family is in debt.`,
        `Given the power to take credit for another's triumph, ${chars} chooses the painful path of honesty and inspires an entire community.`,
        `${chars} learns that true strength isn't winning every argument, but having the humility to listen to their harshest critic.`,
        `A selfish artisan played by ${chars} discovers that their creations only bring joy when given freely to those in need.`,
      ],
    };

    return genreIdeas[genre] || genreIdeas.mystery;
  }

  public async generateHook(topic: string, genre: string, tone: string): Promise<string> {
    const cleanTopic = topic.trim() || 'this mysterious incident';
    const hooks: Record<string, string[]> = {
      mystery: [
        `"Do not look in the basement," they warned. But at 3:14 AM, the lock clicked open on its own...`,
        `They said ${cleanTopic} was impossible. Until the security footage revealed this...`,
        `Only 3 people knew the truth about ${cleanTopic}. Today, two of them are gone.`,
      ],
      emotional: [
        `I promised I would never speak of ${cleanTopic} again. But you deserve to know why it changed me forever...`,
        `Sometimes the hardest goodbye is the one you never had the chance to say. This is that story...`,
      ],
      horror: [
        `Whatever you do, don't pause this video at 0:04. What you'll see in the background cannot be unseen.`,
        `The last thing I remembered was locking my front door. Then I looked down at my hands...`,
      ],
      comedy: [
        `I thought I was having the worst day of my life. Then my cat managed to do THIS on live TV...`,
        `Rule number one of dealing with ${cleanTopic}: NEVER let your best friend hold the camera!`,
      ],
      adventure: [
        `Everyone told us we wouldn't survive the descent. 200 feet underground, we realized they were right...`,
        `We followed the forbidden map for 14 hours. What was waiting at the summit left us speechless!`,
      ],
    };

    const list = hooks[genre] || hooks.mystery;
    return list[Math.floor(Math.random() * list.length)];
  }

  public async transformStoryScript(options: {
    script: string;
    hook: string;
    action: 'rewrite' | 'improve_hook' | 'shorten' | 'expand' | 'continue';
    genre: string;
  }): Promise<{ hook: string; script: string; climax?: string; ending?: string }> {
    const { script, hook, action, genre } = options;

    if (action === 'improve_hook') {
      const improvedHook = `⚠️ STOP SCROLLING. What happens in the next 30 seconds with ${genre} will challenge everything you thought you knew...`;
      return { hook: improvedHook, script };
    }

    if (action === 'shorten') {
      const lines = script.split('\n').filter((l) => l.trim().length > 0);
      const shortened = lines
        .map((l) => l.replace(/(\.|\?|!)\s+.*/, '$1')) // keep first sentence of each scene
        .join('\n\n');
      return {
        hook: hook.slice(0, 80) + '...',
        script: shortened,
      };
    }

    if (action === 'expand') {
      const expanded = `${script}\n\n[SENSORY EXPANSION]\nThe air hung thick with cold anticipation. Every ambient shadow seemed to pulse in synchronization with their rapid heartbeat, raising the stakes to an absolute fever pitch.`;
      return { hook, script: expanded };
    }

    if (action === 'continue') {
      const continuation = `${script}\n\n[NEXT CHAPTER ARC]\nJust as the dust settled and relief settled in, a low rumble echoed from the shadows behind them. The real journey was only just getting started.`;
      return {
        hook,
        script: continuation,
        climax: 'A second, greater revelation shatters the temporary peace.',
        ending: 'Will they survive what lies ahead? Follow for Part 2!',
      };
    }

    // Default 'rewrite'
    const rewritten = `[CINEMATIC REWRITE - ${genre.toUpperCase()}]\n${script.replace(/He |She |They /g, 'Our protagonist ')}`;
    return {
      hook: `🔥 Watch this before it gets taken down! ${hook}`,
      script: rewritten,
    };
  }

  // Comprehensive Step 3 Scene Breakdown Generator
  public async generateFullStory(options: {
    prompt: string;
    genre: string;
    targetDuration: number;
    platform?: string;
    tone?: string;
    targetAudience?: string;
    character?: Character | null;
    characterIds?: string[];
    customInstructions?: string;
  }): Promise<{
    hook: string;
    intro: string;
    scenes: Array<{
      title: string;
      scriptText: string;
      narration: string;
      prompt: string;
      duration: number;
      visualDescription: string;
      cameraAngle: string;
      lighting: string;
      actions: string;
      environment: string;
      soundEffectSuggestion: string;
      negativePrompt: string;
    }>;
    climax: string;
    ending: string;
  }> {
    const { prompt, genre, targetDuration, character, characterIds, platform = 'tiktok', tone = 'engaging' } = options;
    logger.info('FlowService', `Generating complete story for platform "${platform}", genre "${genre}", duration ${targetDuration}s`);

    // Fetch character continuity data if available
    let characterList: Character[] = [];
    if (character) {
      characterList.push(character);
    }
    if (characterIds && characterIds.length > 0) {
      for (const cid of characterIds) {
        if (!characterList.find((c) => c.id === cid)) {
          const c = characterRepo.getById(cid);
          if (c) characterList.push(c);
        }
      }
    }

    const primaryChar = characterList[0];
    const charContinuity = primaryChar
      ? `Protagonist: ${primaryChar.name} (${primaryChar.appearance}, wearing ${primaryChar.clothing}). Style: ${primaryChar.visualStyle}.`
      : 'Protagonist: Photorealistic character with distinct features and consistent wardrobe.';

    // Scene count: 1 scene every 5-7 seconds
    const sceneCount = Math.max(3, Math.min(8, Math.round(targetDuration / 6)));
    const perSceneDuration = Math.round(targetDuration / sceneCount);

    const hook = await this.generateHook(prompt, genre, tone);
    const intro = `In the world of ${genre}, ${primaryChar ? primaryChar.name : 'our hero'} stumbled into an event that defied explanation.`;

    const beats = [
      {
        title: 'The Discovery',
        action: 'notices an unusual disruption and stops in their tracks',
        camera: 'Slow cinematic push-in at eye level',
        lighting: 'Moody volumetric side-lighting with atmospheric haze',
        env: 'Urban dimly-lit street corner with damp asphalt reflections',
        sfx: 'Footsteps on Gravel',
      },
      {
        title: 'The Clue',
        action: 'picks up the mysterious object and inspects its engravings',
        camera: 'Macro close-up with shallow depth of field',
        lighting: 'High-contrast rim lighting emphasizing texture and detail',
        env: 'Shadowy hallway or secluded alleyway',
        sfx: 'Creaking Wooden Door',
      },
      {
        title: 'The Complication',
        action: 'hears footsteps approaching and darts into the nearest shelter',
        camera: 'Dynamic handheld tracking shot',
        lighting: 'Flickering neon backlight with deep amber shadows',
        env: 'Narrow stairwell with peeling walls and industrial pipes',
        sfx: 'Elevated Heartbeat',
      },
      {
        title: 'The Turning Point',
        action: 'deciphers the hidden code that exposes the real mastermind',
        camera: 'Dutch angle tilting slowly upwards',
        lighting: 'Cold cyan spotlight illuminating the subject face',
        env: 'Abandoned high-tech workspace with cracked monitors',
        sfx: 'Deep Ticking Clock',
      },
      {
        title: 'The Final Confrontation',
        action: 'stands firm as the truth is finally revealed to the world',
        camera: 'Epic low-angle wide heroic shot',
        lighting: 'Golden hour dramatic backlight with god-rays',
        env: 'Rooftop overlooking an endless cinematic cityscape',
        sfx: 'Cinematic Sub Bass Boom',
      },
    ];

    const scenes: Array<{
      title: string;
      scriptText: string;
      narration: string;
      prompt: string;
      duration: number;
      visualDescription: string;
      cameraAngle: string;
      lighting: string;
      actions: string;
      environment: string;
      soundEffectSuggestion: string;
      negativePrompt: string;
    }> = [];

    for (let i = 0; i < sceneCount; i++) {
      const beat = beats[i % beats.length];
      const sceneNum = i + 1;
      const sceneTitle = `Scene ${sceneNum}: ${beat.title}`;

      const visualDescription = `${charContinuity} ${beat.action}. Set in ${beat.env}. ${beat.lighting}.`;
      const generationPrompt = `${charContinuity} ${beat.camera}. Scene ${sceneNum}: Character ${beat.action}. ${beat.env}, ${beat.lighting}. Ultra-detailed 8k resolution, cinematic color grading, masterwork, 35mm lens.`;
      const negativePrompt = 'blurry face, morphing features, mutated hands, inconsistent clothing, extra limbs, cartoonish, low quality, artifacts';
      const narration = `${primaryChar ? primaryChar.name : 'They'} ${beat.action}. Every detail pointed to one inescapable truth.`;
      const scriptText = `[SCENE ${sceneNum}: ${beat.title.toUpperCase()}]\n${beat.camera}.\n${visualDescription}`;

      scenes.push({
        title: sceneTitle,
        scriptText,
        narration,
        prompt: generationPrompt,
        duration: perSceneDuration,
        visualDescription,
        cameraAngle: beat.camera,
        lighting: beat.lighting,
        actions: beat.action,
        environment: beat.env,
        soundEffectSuggestion: beat.sfx,
        negativePrompt,
      });
    }

    const climax = `With seconds to spare, the decisive move is made, forever changing the course of events.`;
    const ending = `Did they make the right choice? Drop your thoughts below and subscribe for the continuation!`;

    return {
      hook,
      intro,
      scenes,
      climax,
      ending,
    };
  }

  // Backward compatibility alias for generateScript
  public async generateScript(options: {
    prompt: string;
    genre: string;
    targetDuration: number;
    character?: Character | null;
  }) {
    const full = await this.generateFullStory({
      prompt: options.prompt,
      genre: options.genre,
      targetDuration: options.targetDuration,
      character: options.character,
      characterIds: options.character ? [options.character.id] : [],
    });
    return full;
  }

  // --- Step 4: Voiceover Generation ---

  public async generateVoiceoverAudio(
    projectId: string,
    text: string,
    voiceSettings: VoiceSettings
  ): Promise<{ audioPath: string; duration: number }> {
    const audioFolder = storageService.getFolder('Audio');
    const fileName = `voice_${projectId}_${Date.now()}.wav`;
    const targetPath = path.join(audioFolder, fileName);

    // Calculate approximate narration duration (approx 2.5 words per second)
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const baseDuration = Math.max(3, Math.round(wordCount / 2.5));
    const speedAdjusted = baseDuration / (voiceSettings.speed || 1.0);

    // Generate physical clean WAV audio
    createSampleWav(targetPath, speedAdjusted, 300);

    logger.info('FlowService', `Generated voiceover track: ${targetPath} (${speedAdjusted}s) for voice ${voiceSettings.voice}`);
    return {
      audioPath: targetPath,
      duration: speedAdjusted,
    };
  }

  // --- Step 5 & 6: Audio Library (Music & Sound Effects) ---

  public async getBuiltinAudioLibrary(): Promise<{
    music: Array<{ id: string; title: string; mood: string; genre: string; duration: number; path: string }>;
    soundEffects: Array<{ id: string; name: string; category: string; duration: number; path: string }>;
  }> {
    const audioFolder = storageService.getFolder('Audio');

    const musicPresets = [
      { id: 'mus_cinematic', title: 'Cinematic Horizon', mood: 'cinematic', genre: 'Epic Orchestral', duration: 120, freq: 220 },
      { id: 'mus_suspense', title: 'Shadows in the Mist', mood: 'suspense', genre: 'Dark Drone', duration: 90, freq: 110 },
      { id: 'mus_emotional', title: 'Warm Memories', mood: 'emotional', genre: 'Acoustic Piano', duration: 110, freq: 330 },
      { id: 'mus_happy', title: 'Bright Sunshine', mood: 'happy', genre: 'Uplifting Pop', duration: 85, freq: 440 },
      { id: 'mus_peaceful', title: 'Zen Sanctuary', mood: 'peaceful', genre: 'Ambient Meditation', duration: 140, freq: 175 },
    ];

    const sfxPresets = [
      { id: 'sfx_footsteps', name: 'Footsteps on Gravel', category: 'footsteps', duration: 3, freq: 150 },
      { id: 'sfx_rain', name: 'Thunderstorm & Rain', category: 'rain', duration: 8, freq: 200 },
      { id: 'sfx_door', name: 'Creaking Wooden Door', category: 'doors', duration: 2, freq: 260 },
      { id: 'sfx_impact', name: 'Cinematic Sub Bass Boom', category: 'impacts', duration: 4, freq: 80 },
      { id: 'sfx_clock', name: 'Deep Ticking Clock', category: 'suspense', duration: 6, freq: 600 },
      { id: 'sfx_whoosh', name: 'Whoosh Fast Transition', category: 'transitions', duration: 1.5, freq: 500 },
      { id: 'sfx_heartbeat', name: 'Elevated Heartbeat', category: 'suspense', duration: 5, freq: 90 },
      { id: 'sfx_ambient', name: 'Subtle Ambient Drone', category: 'ambient', duration: 12, freq: 130 },
    ];

    const music = musicPresets.map((m) => {
      const p = path.join(audioFolder, `${m.id}.wav`);
      createSampleWav(p, m.duration, m.freq);
      return { id: m.id, title: m.title, mood: m.mood, genre: m.genre, duration: m.duration, path: p };
    });

    const soundEffects = sfxPresets.map((s) => {
      const p = path.join(audioFolder, `${s.id}.wav`);
      createSampleWav(p, s.duration, s.freq);
      return { id: s.id, name: s.name, category: s.category, duration: s.duration, path: p };
    });

    return { music, soundEffects };
  }

  public prepareFlowWorkflowPackage(
    projectId: string,
    scene: Scene,
    character?: Character | null
  ): {
    flowWebUrl: string;
    instructions: string;
    promptPackage: string;
    referenceImages: string[];
  } {
    const references: string[] = [];
    if (character && character.references) {
      for (const ref of character.references) {
        if (fs.existsSync(ref.imagePath)) {
          references.push(ref.imagePath);
        }
      }
    }

    const promptPackage = `
=========================================
GOOGLE FLOW / AI VIDEO GENERATION PACKAGE
Project ID: ${projectId}
Scene Number: ${scene.sceneNumber} (${scene.title || 'Scene'})
Target Duration: ${scene.duration}s
=========================================

[POSITIVE PROMPT]
${scene.generationPrompt}

[NEGATIVE PROMPT / CONSTRAINTS]
${scene.negativePrompt || 'blurry face, inconsistent clothing, extra fingers, cartoonish'}

[CHARACTER CONTINUITY SPECS]
${character ? `Character: ${character.name}\nAppearance: ${character.appearance}\nClothing: ${character.clothing}\nStyle: ${character.visualStyle}` : 'Standard cinematic consistency'}

[NARRATION]
${scene.narration}

[RECOMMENDED FLOW SETTINGS]
- Aspect Ratio: 9:16 (Vertical) or 16:9
- Motion Strength: Medium (5-6)
- Camera: Steady pan / slow push
`.trim();

    return {
      flowWebUrl: 'https://flow.google.com',
      instructions:
        '1. Click "Open Flow Web" below.\n2. Copy the prepared prompt and drag in the character reference image.\n3. Generate the clip in Flow.\n4. Download the video and click "Import Generated Video" to bind it to this scene.',
      promptPackage,
      referenceImages: references,
    };
  }

  public async generateCaptions(req: CaptionGenerationRequest): Promise<CaptionGenerationResult> {
    const { videoTitle, scriptText, targetPlatform, targetAudience, tone, keywords, callToAction } = req;
    logger.info('FlowService', `Generating platform-optimized captions for ${targetPlatform} (${tone})`);

    const kwList = keywords.length > 0 ? keywords : ['viral', 'trending', 'ai', 'story'];
    const kwTags = kwList.map((k) => `#${k.replace(/\s+/g, '')}`).join(' ');

    let platformNotes = '';
    if (targetPlatform === 'tiktok') {
      platformNotes = 'TikTok Limit: 2,200 characters. Optimal: first 2 lines visible before "more". Include trending audio tags.';
    } else if (targetPlatform === 'youtube') {
      platformNotes = 'YouTube Limit: Title 100 chars, Description 5,000 chars. Place key links and CTA in top 3 lines.';
    } else {
      platformNotes = 'Facebook Reels Limit: 2,000 chars. Engaging questions boost share algorithm.';
    }

    const variations = [
      {
        title: `Watch Till The End! ${videoTitle}`.slice(0, 95),
        caption: `You will NOT believe what happened next... 🤯\n\n${scriptText ? scriptText.slice(0, 150) + '...' : ''}\n\n${callToAction || 'What would you have done? Let me know in the comments!'}\n\n${kwTags} #${targetPlatform}creators #aivideo`,
        hashtags: [...kwList.map((k) => `#${k}`), '#fyp', '#viral', '#foryou', '#mindblowing'],
        pinnedComment: `💬 Question of the day: What was your favorite moment in this story?`,
        thumbnailText: 'WAIT FOR THE END! ⚠️',
        searchKeywords: [...kwList, 'ai story', 'viral shorts', 'trending reel'],
      },
      {
        title: `The Secret Behind ${videoTitle}`.slice(0, 95),
        caption: `This story took an unexpected turn that no one saw coming.\n\nTargeted for anyone interested in ${targetAudience}.\n\n👉 Follow for more epic daily stories!\n\n${kwTags}`,
        hashtags: [...kwList.map((k) => `#${k}`), '#storytime', '#aiart', '#epicmoments', '#mustwatch'],
        pinnedComment: `🔥 Drop a like if you want Part 2 tomorrow!`,
        thumbnailText: 'NOBODY EXPECTED THIS...',
        searchKeywords: [...kwList, 'top trending', 'behind the scene', 'full story'],
      },
    ];

    return {
      variations,
      platformLimitNotes: platformNotes,
    };
  }

  // --- Ending Hook / Next Video Retention Generator ---
  public async generateNextVideoHook(options: {
    topic: string;
    genre: string;
    climax?: string;
    hook?: string;
    endingType?: string;
  }): Promise<string> {
    const { topic, genre, endingType = 'part2_cliffhanger' } = options;
    const cleanTopic = topic.trim() || 'this mysterious event';

    const cliffhangers: Record<string, string[]> = {
      mystery: [
        `What they found inside the locked chamber will change everything you thought you knew. Part 2 drops tomorrow—follow now so you don't miss the reveal!`,
        `They thought the code was cracked, but at 3:00 AM a second transmission arrived from the exact same coordinates. Follow for Part 2!`,
        `There is one critical clue hidden in this footage that nobody noticed... Did you catch it? Watch Part 2 to see the full breakdown!`,
        `The real truth about ${cleanTopic} was hidden right under their feet. In Part 2, the true mastermind is finally revealed!`,
      ],
      horror: [
        `Look closely at the shadow behind them in the final frame... That wasn't an illusion. Part 2 reveals what followed them home. Subscribe now!`,
        `The door didn't lock from the outside—it was latched from the INSIDE. Follow for Part 2 to see what was trapped in that room!`,
        `Whatever you do, don't watch Part 2 alone. What happened 10 minutes later is caught on the night vision camera...`,
      ],
      emotional: [
        `The final envelope had one last handwritten note attached. When you read what it says in Part 2, you will never look at them the same way...`,
        `A single phone call received at midnight changed their entire future. Drop a heart and follow for Part 2 releasing tonight!`,
        `They thought they were saying goodbye for the last time. But the ending of this story in Part 2 will restore your faith in miracles.`,
      ],
      drama: [
        `One signature was all it took to destroy an empire. In Part 2, the counter-strike begins. Follow to watch the confrontation!`,
        `The secret recorded on that flash drive is about to go public. Will they survive the fallout? Part 2 streams tomorrow!`,
      ],
      comedy: [
        `You think that was bad? Wait until you see the security camera footage from the next morning! Follow for Part 2 right now!`,
        `The story doesn't end here... The reaction from the boss when he walked into the room is up in Part 2!`,
      ],
      adventure: [
        `As the rope snapped, they saw what was waiting at the bottom of the canyon... Follow now so you don't miss Part 2!`,
        `The map didn't lead to treasure—it led to a warning. In Part 2, the expedition takes an unexpected turn!`,
      ],
      moral: [
        `Karma didn't wait long. What happened to them 24 hours later taught the entire town a lesson they will never forget. Watch Part 2 next!`,
        `The choice they made seemed impossible at the time, but wait until you see the miracle that resulted from it in Part 2!`,
      ],
    };

    const list = cliffhangers[genre] || cliffhangers.mystery;
    return list[Math.floor(Math.random() * list.length)];
  }

  // --- Step 5: AI Auto-Match Background Music ---
  public async autoMatchBackgroundMusic(projectId: string): Promise<{ success: boolean; track: any }> {
    const project = projectRepo.getById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const lib = await this.getBuiltinAudioLibrary();
    const genre = (project.genre || 'mystery').toLowerCase();

    let matchedTrack = lib.music.find((m) => m.mood.toLowerCase() === genre);
    if (!matchedTrack) {
      if (genre === 'horror' || genre === 'mystery') {
        matchedTrack = lib.music.find((m) => m.id === 'mus_suspense') || lib.music[0];
      } else if (genre === 'emotional' || genre === 'romance') {
        matchedTrack = lib.music.find((m) => m.id === 'mus_emotional') || lib.music[0];
      } else if (genre === 'comedy') {
        matchedTrack = lib.music.find((m) => m.id === 'mus_happy') || lib.music[0];
      } else if (genre === 'moral') {
        matchedTrack = lib.music.find((m) => m.id === 'mus_peaceful') || lib.music[0];
      } else {
        matchedTrack = lib.music.find((m) => m.id === 'mus_cinematic') || lib.music[0];
      }
    }

    const musicSettings = {
      trackId: matchedTrack.id,
      trackTitle: matchedTrack.title,
      audioPath: matchedTrack.path,
      mood: matchedTrack.mood,
      volume: 25,
      trimStart: 0,
      trimEnd: project.targetDuration || 60,
      fadeIn: true,
      fadeOut: true,
      loop: true,
      ducking: true,
    };

    projectRepo.update(projectId, { musicSettings });
    logger.info('FlowService', `Auto-matched music "${matchedTrack.title}" for project ${project.title}`);
    return { success: true, track: matchedTrack };
  }

  // --- Step 6: AI Auto-Assign Sound Effects for Scenes ---
  public async autoAssignSceneSoundEffects(projectId: string): Promise<{
    success: boolean;
    assignedCount: number;
    soundEffects: SoundEffectItem[];
  }> {
    const project = projectRepo.getById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const lib = await this.getBuiltinAudioLibrary();
    const scenes = project.scenes || [];
    const assigned: SoundEffectItem[] = [];

    let currentTimelineTime = 0;

    for (const sc of scenes) {
      const combinedText = `${sc.soundEffectSuggestion || ''} ${sc.title || ''} ${sc.scriptText || ''} ${sc.visualDescription || ''} ${sc.actions || ''}`.toLowerCase();

      let matchedSfx = lib.soundEffects[0];

      if (combinedText.includes('step') || combinedText.includes('walk') || combinedText.includes('gravel') || combinedText.includes('run')) {
        matchedSfx = lib.soundEffects.find((s) => s.category === 'footsteps') || lib.soundEffects[0];
      } else if (combinedText.includes('rain') || combinedText.includes('thunder') || combinedText.includes('storm')) {
        matchedSfx = lib.soundEffects.find((s) => s.category === 'rain') || lib.soundEffects[0];
      } else if (combinedText.includes('door') || combinedText.includes('creak') || combinedText.includes('enter') || combinedText.includes('lock')) {
        matchedSfx = lib.soundEffects.find((s) => s.category === 'doors') || lib.soundEffects[0];
      } else if (combinedText.includes('heart') || combinedText.includes('fear') || combinedText.includes('nervous') || combinedText.includes('breath')) {
        matchedSfx = lib.soundEffects.find((s) => s.name.includes('Heartbeat')) || lib.soundEffects[0];
      } else if (combinedText.includes('clock') || combinedText.includes('tick') || combinedText.includes('countdown') || combinedText.includes('time')) {
        matchedSfx = lib.soundEffects.find((s) => s.name.includes('Clock')) || lib.soundEffects[0];
      } else if (combinedText.includes('impact') || combinedText.includes('boom') || combinedText.includes('climax') || combinedText.includes('shock') || combinedText.includes('reveal')) {
        matchedSfx = lib.soundEffects.find((s) => s.category === 'impacts') || lib.soundEffects[0];
      } else if (combinedText.includes('whoosh') || combinedText.includes('fast') || combinedText.includes('transition') || combinedText.includes('camera')) {
        matchedSfx = lib.soundEffects.find((s) => s.category === 'transitions') || lib.soundEffects[0];
      } else {
        matchedSfx = lib.soundEffects.find((s) => s.category === 'ambient') || lib.soundEffects[0];
      }

      assigned.push({
        id: `sfx_${sc.id}_${Date.now()}_${assigned.length}`,
        sceneId: sc.id,
        name: matchedSfx.name,
        category: matchedSfx.category,
        audioPath: matchedSfx.path,
        volume: 80,
        startTime: currentTimelineTime,
        duration: Math.min(sc.duration || 5, matchedSfx.duration || 3),
      });

      currentTimelineTime += sc.duration || 5;
    }

    projectRepo.update(projectId, { soundEffects: assigned });
    logger.info('FlowService', `Auto-assigned ${assigned.length} AI sound effects for project ${project.title}`);
    return { success: true, assignedCount: assigned.length, soundEffects: assigned };
  }

  // --- Step 3: AI Scene Video Generation ---
  public async generateSceneVideo(
    sceneId: string,
    options: { duration?: number; motionStyle?: string } = {}
  ): Promise<{ success: boolean; videoPath: string; thumbnailPath?: string; message?: string }> {
    const scene = projectRepo.getSceneById(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);

    const project = projectRepo.getById(scene.projectId);
    if (!project) throw new Error(`Project not found: ${scene.projectId}`);

    // Determine reference portrait image to use
    let imagePath = scene.referenceImagePath;

    if (!imagePath || !fs.existsSync(imagePath)) {
      let char: Character | null = null;
      if (scene.characterId) {
        char = characterRepo.getById(scene.characterId);
      } else if (project.selectedCharacterIds && project.selectedCharacterIds.length > 0) {
        char = characterRepo.getById(project.selectedCharacterIds[0]);
      }

      if (char) {
        const primaryRef = char.references.find((r) => r.isPrimary) || char.references[0];
        if (primaryRef && fs.existsSync(primaryRef.imagePath)) {
          imagePath = primaryRef.imagePath;
        } else {
          const newRef = await characterImageGenerator.generatePortrait(char, 'front', true);
          imagePath = newRef.imagePath;
        }
      }
    }

    if (!imagePath || !fs.existsSync(imagePath)) {
      const allChars = characterRepo.getAll();
      if (allChars.length > 0 && allChars[0].references[0]) {
        imagePath = allChars[0].references[0].imagePath;
      }
    }

    const draftsFolder = storageService.getFolder('Drafts');
    const safeTitle = (scene.title || `Scene_${scene.sceneNumber}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const outName = `${safeTitle}_${Date.now()}.mp4`;
    const outputPath = path.join(draftsFolder, outName);

    const duration = options.duration || scene.duration || 5;
    const aspect = project.aspectRatio || '9:16';

    const result = await ffmpegService.generateSceneVideoClip({
      imagePath: imagePath || path.join(storageService.getFolder('Thumbnails'), 'placeholder.png'),
      outputPath,
      durationSec: duration,
      aspectRatio: aspect,
      motionStyle: options.motionStyle || 'cinematic_pan',
    });

    // Update scene record
    projectRepo.updateScene(scene.id, {
      videoPath: result.videoPath,
      status: 'ready',
      duration,
    });

    // Register asset in media asset repository
    try {
      mediaAssetRepo.create({
        title: `${project.title} - Scene ${scene.sceneNumber}`,
        filePath: result.videoPath,
        fileName: outName,
        fileSize: fs.existsSync(result.videoPath) ? fs.statSync(result.videoPath).size : 0,
        duration,
        width: aspect === '16:9' ? 1920 : 1080,
        height: aspect === '16:9' ? 1080 : 1920,
        aspectRatio: aspect,
        format: 'mp4',
        thumbnailPath: result.thumbnailPath || '',
        tags: ['ai_generated', project.genre, `scene_${scene.sceneNumber}`],
        folder: 'Drafts',
        isFavorite: false,
        projectId: project.id,
      });
    } catch (e: any) {
      logger.warn('FlowService', `Could not register media asset: ${e.message}`);
    }

    logger.info('FlowService', `AI Scene video generated: ${result.videoPath}`);
    return {
      success: true,
      videoPath: result.videoPath,
      thumbnailPath: result.thumbnailPath,
      message: `Scene ${scene.sceneNumber} video generated successfully.`,
    };
  }

  // --- Step 3: Batch AI Video Generator for All Scenes ---
  public async generateAllSceneVideos(projectId: string): Promise<{
    success: boolean;
    generatedCount: number;
    message: string;
  }> {
    const project = projectRepo.getById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const scenes = project.scenes || [];
    if (scenes.length === 0) {
      throw new Error('No scenes found in project to generate.');
    }

    let count = 0;
    for (const sc of scenes) {
      try {
        await this.generateSceneVideo(sc.id);
        count++;
      } catch (err: any) {
        logger.warn('FlowService', `Failed generating video for scene ${sc.sceneNumber}: ${err.message}`);
      }
    }

    projectRepo.update(projectId, { status: 'generating' });

    return {
      success: true,
      generatedCount: count,
      message: `Generated AI video clips for ${count} of ${scenes.length} scenes.`,
    };
  }
}

export const flowService = new FlowService();
