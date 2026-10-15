import React, { useEffect, useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { useAppStore } from '../../stores/useAppStore';
import {
  GoogleAuthState,
  GoogleConnectionStatus,
} from '../../../../shared/types';
import {
  Shield,
  RefreshCw,
  LogOut,
  ExternalLink,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock,
  Key,
  Info,
} from 'lucide-react';

export const GoogleLogoSvg: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={`shrink-0 ${className}`}
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface GoogleConnectCardProps {
  onAccountUpdated?: () => void;
  compact?: boolean;
}

export const GoogleConnectCard: React.FC<GoogleConnectCardProps> = ({
  onAccountUpdated,
  compact = false,
}) => {
  const { addToast } = useAppStore();
  const [authState, setAuthState] = useState<GoogleAuthState>({
    status: 'not_connected',
    statusLabel: 'Not Connected',
    clientIdConfigured: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');

  const fetchStatus = async () => {
    if (!window.api) return;
    try {
      const state = await window.api.getGoogleAuthStatus();
      setAuthState(state);
      const configuredId = await window.api.getGoogleClientId();
      setClientIdInput(configuredId || '');
    } catch (err: any) {
      console.warn('Could not fetch Google auth status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Subscribe to real-time auth changes from loopback listener
    if (window.api?.onGoogleAuthChanged) {
      const cleanup = window.api.onGoogleAuthChanged((newState) => {
        setAuthState(newState);
        setIsLoading(false);
        setIsRefreshing(false);
        if (newState.status === 'connected') {
          addToast({
            type: 'success',
            title: 'Google Connected',
            message: `Authenticated as ${newState.profile?.email || 'Google User'}.`,
          });
          onAccountUpdated?.();
        } else if (newState.status === 'error') {
          addToast({
            type: 'error',
            title: 'Google Auth Error',
            message: newState.error || 'Connection failed',
          });
        }
      });
      return cleanup;
    }
  }, []);

  const handleConnect = async () => {
    if (isLoading || authState.status === 'connecting') {
      return; // Prevent duplicate authentication requests
    }

    const effectiveClientId = clientIdInput.trim();
    if (!authState.clientIdConfigured && (!effectiveClientId || effectiveClientId.includes('appdesktop'))) {
      setShowConfigModal(true);
      addToast({
        type: 'warning',
        title: 'Google Client ID Required',
        message: 'Please paste your Google Cloud Desktop Client ID to connect.',
      });
      return;
    }

    setIsLoading(true);
    try {
      addToast({
        type: 'info',
        title: 'Opening Google Sign-In',
        message: 'Please complete authorization in your default web browser.',
      });
      const auth = window.authAPI || window.api;
      if (!auth) return;
      const res = window.authAPI
        ? await window.authAPI.signInWithGoogle(clientIdInput || undefined)
        : await window.api.connectGoogleAccount(clientIdInput || undefined);
      setAuthState(res.state);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Google Account Connected',
          message: `Connected ${res.state.profile?.name || res.state.profile?.email}.`,
        });
        onAccountUpdated?.();
      } else if (res.state.error) {
        addToast({
          type: 'error',
          title: 'Connection Incomplete',
          message: res.state.error,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.api) return;
    if (
      !window.confirm(
        'Disconnect Google Account? This will revoke the session and delete tokens from the OS encrypted vault.'
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await window.api.disconnectGoogleAccount();
      setAuthState(res.state);
      addToast({
        type: 'info',
        title: 'Google Account Disconnected',
        message: 'Tokens cleared from secure OS storage.',
      });
      onAccountUpdated?.();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Disconnect Failed',
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!window.api) return;
    setIsRefreshing(true);
    try {
      const res = await window.api.refreshGoogleToken();
      setAuthState(res.state);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Token Refreshed',
          message: 'Google OAuth access token renewed successfully.',
        });
        onAccountUpdated?.();
      } else {
        addToast({
          type: 'warn',
          title: 'Token Refresh Incomplete',
          message: res.state.error || 'Please reconnect your Google account.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Refresh Error',
        message: err.message,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveClientId = async () => {
    if (!window.api) return;
    const cleanId = clientIdInput.trim();
    if (!cleanId) {
      addToast({
        type: 'warning',
        title: 'Input Required',
        message: 'Please paste your Google Cloud Desktop Client ID.',
      });
      return;
    }
    if (cleanId.includes('appdesktop') || cleanId.includes('placeholder')) {
      addToast({
        type: 'warning',
        title: 'Placeholder Client ID',
        message: 'Please paste your own actual Client ID from Google Cloud Console.',
      });
      return;
    }
    await window.api.setGoogleClientId(cleanId);
    addToast({
      type: 'success',
      title: 'OAuth Client ID Saved',
      message: 'Google credentials configured. You can now connect with Google.',
    });
    setShowConfigModal(false);
    await fetchStatus();
  };

  const renderStatusBadge = (status: GoogleConnectionStatus) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="success" size="sm" dot>
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="brand" size="sm" dot>
            Connecting...
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="warning" size="sm" dot>
            Connection Expired
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="danger" size="sm" dot>
            Authentication Failed
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="neutral" size="sm">
            Disconnected
          </Badge>
        );
      case 'not_connected':
      default:
        return (
          <Badge variant="neutral" size="sm">
            Not Connected
          </Badge>
        );
    }
  };

  const isConnected = authState.status === 'connected';
  const isExpired = authState.status === 'expired';
  const hasError = authState.status === 'error';

  return (
    <>
      <Card
        className={`relative overflow-hidden border-studio-700/80 bg-gradient-to-b from-studio-900 to-studio-950 ${
          compact ? 'p-4' : 'p-6'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-studio-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center p-2.5">
              <GoogleLogoSvg size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-studio-100">Google Account</h3>
                {renderStatusBadge(authState.status)}
              </div>
              <p className="text-xs text-studio-400 mt-0.5">
                Official OAuth 2.0 PKCE Authorization & OS Protected Credential Vault
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Settings size={13} />}
              onClick={() => setShowConfigModal(true)}
              title="Google Cloud Console Client ID Configuration"
            >
              Config Client ID
            </Button>
          </div>
        </div>

        {/* Client ID not configured banner */}
        {!authState.clientIdConfigured && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Key size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-200">Google Cloud Client ID Required</span>
                <p className="text-amber-300/80 text-[11px] mt-0.5">
                  Google requires a registered Desktop OAuth Client ID to log in. Click "Config Client ID" to paste your credentials.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Settings size={13} />}
              onClick={() => setShowConfigModal(true)}
              className="border-amber-500/40 text-amber-200 hover:bg-amber-500/20 shrink-0"
            >
              Config Client ID
            </Button>
          </div>
        )}

        {/* Error notification banner if connection failed */}
        {hasError && authState.error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-200">Connection Error</span>
                <p className="text-rose-300/90 mt-0.5">{authState.error}</p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConnect}
              loading={isLoading}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Expired session banner */}
        {isExpired && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-200">Session Expired or Revoked</span>
                <p className="text-amber-300/90 mt-0.5">
                  {authState.error || 'Your Google authorization has expired. Please reconnect to refresh tokens.'}
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConnect}
              loading={isLoading}
            >
              Reconnect
            </Button>
          </div>
        )}

        {/* Connected Account Display */}
        {isConnected && authState.profile ? (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-xl bg-studio-850/80 border border-studio-750 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {authState.profile.picture ? (
                  <img
                    src={authState.profile.picture}
                    alt={authState.profile.name}
                    className="w-12 h-12 rounded-full border-2 border-emerald-500/40 object-cover shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-studio-750 border border-studio-650 flex items-center justify-center font-bold text-base text-studio-200">
                    {authState.profile.name?.[0]?.toUpperCase() || 'G'}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-studio-100">
                      {authState.profile.name}
                    </span>
                    <Badge variant="success" size="sm">
                      Verified
                    </Badge>
                  </div>
                  <p className="text-xs text-studio-300 font-mono mt-0.5">
                    {authState.profile.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-studio-500">
                    <Shield size={12} className="text-emerald-400" />
                    <span>Protected by Windows DPAPI / macOS Keychain</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />}
                  loading={isRefreshing}
                  onClick={handleRefreshToken}
                  title="Exchange refresh token for updated access token"
                >
                  Refresh Token
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw size={13} />}
                  onClick={handleConnect}
                  loading={isLoading}
                  title="Re-run OAuth sign-in flow"
                >
                  Reconnect
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  icon={<LogOut size={13} />}
                  onClick={handleDisconnect}
                  loading={isLoading}
                  title="Disconnect and revoke tokens"
                >
                  Disconnect
                </Button>
              </div>
            </div>

            {/* Account Details & Permissions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-studio-400">
              <div className="p-3 rounded-lg bg-studio-900 border border-studio-800">
                <span className="text-studio-500 block mb-0.5">Channel / User ID</span>
                <span className="font-mono text-studio-200 truncate block">
                  {authState.account?.channelId || authState.profile.id}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-studio-900 border border-studio-800">
                <span className="text-studio-500 block mb-0.5">Approved Permissions</span>
                <span className="text-studio-200">
                  OpenID Connect (openid, email, profile)
                </span>
              </div>
              <div className="p-3 rounded-lg bg-studio-900 border border-studio-800">
                <span className="text-studio-500 block mb-0.5">Token Expiry</span>
                <span className="text-studio-200">
                  {authState.account?.tokenExpiry
                    ? new Date(authState.account.tokenExpiry).toLocaleTimeString()
                    : 'Auto-refresh active'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Disconnected State / Connect CTA */
          <div className="mt-5 space-y-4">
            <div className="p-5 rounded-xl bg-studio-850/60 border border-studio-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-semibold text-sm text-studio-200">
                  Sign in with Google Account
                </span>
                <p className="text-xs text-studio-400 leading-relaxed max-w-xl">
                  Connect your Google account via official OAuth 2.0 with PKCE (S256). Strictly requests OpenID Connect identity scopes (openid, email, profile).
                </p>
              </div>

              {/* Official Google-styled Sign-In Button */}
              <button
                onClick={handleConnect}
                disabled={isLoading || authState.status === 'connecting'}
                className="inline-flex items-center justify-center gap-3 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-semibold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0 border border-slate-200"
              >
                {isLoading || authState.status === 'connecting' ? (
                  <RefreshCw size={16} className="animate-spin text-slate-600" />
                ) : (
                  <GoogleLogoSvg size={18} />
                )}
                <span>{isLoading || authState.status === 'connecting' ? 'Connecting...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* Security Guarantee Notice */}
            <div className="flex items-center gap-2 text-[11px] text-studio-500">
              <Shield size={13} className="text-emerald-400 shrink-0" />
              <span>
                Zero Password Storage: Uses Authorization Code Flow with PKCE (S256). Passwords are never entered or stored in this application.
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Google Cloud Console Setup & Client ID Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Google OAuth 2.0 Configuration"
        size="md"
      >
        <div className="space-y-5 text-xs text-studio-300">
          <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-start gap-3">
            <Info className="text-brand-400 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <span className="font-semibold text-studio-200">Google Cloud Console Setup (Desktop App)</span>
              <p className="text-studio-400 leading-relaxed text-[11px]">
                Google error <strong>"Error 401: invalid_client / The OAuth client was not found"</strong> occurs when using an uncreated client ID. Follow the steps below to create your official Desktop client.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-studio-200 block">
              OAuth 2.0 Client ID (Desktop Application)
            </label>
            <Input
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              placeholder="e.g. 1234567890-abcdef.apps.googleusercontent.com"
              helperText="Desktop OAuth clients use PKCE (S256). No Client Secret is needed or allowed in native desktop applications."
            />
          </div>

          <div className="p-3.5 rounded-xl bg-studio-900 border border-studio-800 space-y-2 text-[11px]">
            <span className="font-semibold text-studio-200 block">How to get your Client ID in 1 minute:</span>
            <ol className="list-decimal list-inside space-y-1.5 text-studio-300">
              <li>Open <strong>Google Cloud Console &gt; Credentials</strong> (button below).</li>
              <li>Click <strong>Create Credentials &gt; OAuth client ID</strong>.</li>
              <li>Set Application type to <strong>Desktop app</strong> (name: <em>Social Control Desktop</em>).</li>
              <li>Click <strong>Create</strong> and copy your <strong>Client ID</strong>.</li>
              <li><em>Note:</em> In <strong>OAuth consent screen</strong>, ensure your Gmail is added under <strong>Test users</strong> (if your app is in Testing mode).</li>
            </ol>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-studio-800">
            <Button
              variant="outline"
              size="sm"
              icon={<ExternalLink size={13} />}
              onClick={() => window.api?.openExternalUrl('https://console.cloud.google.com/apis/credentials')}
            >
              Open Cloud Console
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowConfigModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveClientId}>
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
