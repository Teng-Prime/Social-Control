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
  GoogleFailureReason,
} from '../../../../shared/types';
import {
  Shield,
  RefreshCw,
  LogOut,
  ExternalLink,
  Settings,
  AlertCircle,
  CheckCircle2,
  Key,
  Info,
  Sparkles,
  HelpCircle,
  Globe,
  Sliders,
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
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  const fetchStatus = async () => {
    if (!window.api) return;
    try {
      const state = await window.api.getGoogleAuthStatus();
      setAuthState(state);
      const configuredId = await window.api.getGoogleClientId();
      if (configuredId) {
        setClientIdInput(configuredId);
      }
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
            title: 'Google Flow AI Connected',
            message: `Signed in as ${newState.profile?.email || 'Google User'}.`,
          });
          onAccountUpdated?.();
        } else if (newState.status === 'error') {
          addToast({
            type: 'error',
            title: 'Sign-In Incomplete',
            message: newState.error || 'Connection failed',
          });
        }
      });
      return cleanup;
    }
  }, []);

  // Validate Client ID format in real-time
  const validateClientIdSyntax = (id: string): { valid: boolean; error?: string } => {
    const trimmed = id.trim();
    if (!trimmed) {
      return { valid: false, error: 'Client ID is required.' };
    }
    if (trimmed.includes('appdesktop') || trimmed.includes('placeholder') || trimmed.includes('your-client-id')) {
      return { valid: false, error: 'Placeholder Client ID detected. Please paste your actual Google Cloud Desktop Client ID.' };
    }
    if (!trimmed.endsWith('.apps.googleusercontent.com')) {
      return { valid: false, error: 'Must end with ".apps.googleusercontent.com". (Google Cloud Console > Desktop app).' };
    }
    return { valid: true };
  };

  // Primary Connect Action
  const handleConnect = async () => {
    if (isLoading || authState.status === 'connecting') {
      return; // Prevent duplicate authentication requests
    }

    // Check if Client ID is configured
    const effectiveClientId = clientIdInput.trim();
    const validation = validateClientIdSyntax(effectiveClientId);

    if (!authState.clientIdConfigured && !validation.valid) {
      setShowConfigModal(true);
      addToast({
        type: 'warning',
        title: 'Google Client ID Required',
        message: 'A Google Cloud Desktop Client ID is required to connect.',
      });
      return;
    }

    setIsLoading(true);
    try {
      addToast({
        type: 'info',
        title: 'Opening Google Sign-In',
        message: 'Opening your default browser to sign in and authorize with Google.',
        duration: 8000,
      });

      const res = await window.api.connectGoogleAccount(effectiveClientId || undefined);
      setAuthState(res.state);

      if (res.success) {
        addToast({
          type: 'success',
          title: 'Google Flow AI Connected',
          message: `Connected account ${res.state.profile?.email || res.state.profile?.name}.`,
        });
        onAccountUpdated?.();
      } else if (res.state.error) {
        addToast({
          type: 'error',
          title: res.state.failureReason === 'user_cancelled' ? 'Sign-In Cancelled' : 'Connection Failed',
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

  // Disconnect Action
  const handleDisconnect = async () => {
    if (!window.api) return;
    if (
      !window.confirm(
        'Disconnect Google Flow AI? This will revoke the session and delete tokens from the secure OS encrypted vault.'
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
        title: 'Google Flow AI Disconnected',
        message: 'Credentials cleared from secure storage.',
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

  // Reconnect Action
  const handleReconnect = async () => {
    if (isLoading || authState.status === 'connecting') return;
    setIsLoading(true);
    try {
      addToast({
        type: 'info',
        title: 'Reconnecting to Google...',
        message: 'Launching browser sign-in to renew authorization.',
      });
      const res = await window.api.reconnectGoogleAccount();
      setAuthState(res.state);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Google Flow AI Reconnected',
          message: `Active session for ${res.state.profile?.email}.`,
        });
        onAccountUpdated?.();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Reconnect Failed',
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test Client ID in Modal
  const handleTestClientId = () => {
    const val = validateClientIdSyntax(clientIdInput);
    if (!val.valid) {
      setTestResult({ valid: false, message: val.error || 'Invalid Client ID' });
    } else {
      setTestResult({
        valid: true,
        message: 'Valid Google Desktop Client ID syntax. Ready to save and connect.',
      });
    }
  };

  // Save Client ID in Modal
  const handleSaveClientId = async () => {
    if (!window.api) return;
    const cleanId = clientIdInput.trim();
    const val = validateClientIdSyntax(cleanId);
    if (!val.valid) {
      addToast({
        type: 'warning',
        title: 'Invalid Client ID',
        message: val.error || 'Please enter a valid Desktop Client ID.',
      });
      return;
    }

    await window.api.setGoogleClientId(cleanId);
    addToast({
      type: 'success',
      title: 'Client ID Configured',
      message: 'Google credentials saved. You can now connect your Google account.',
    });
    setShowConfigModal(false);
    setTestResult(null);
    await fetchStatus();
  };

  // Status Badge Rendering
  const renderStatusBadge = (status: GoogleConnectionStatus, failureReason?: GoogleFailureReason) => {
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
            Connecting to Google...
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="warning" size="sm" dot>
            Session Expired
          </Badge>
        );
      case 'error':
        if (failureReason === 'configuration_missing') {
          return (
            <Badge variant="warning" size="sm" dot>
              Configuration Required
            </Badge>
          );
        }
        if (failureReason === 'user_cancelled') {
          return (
            <Badge variant="neutral" size="sm">
              Sign-In Cancelled
            </Badge>
          );
        }
        if (failureReason === 'access_denied') {
          return (
            <Badge variant="danger" size="sm" dot>
              Permissions Denied
            </Badge>
          );
        }
        return (
          <Badge variant="danger" size="sm" dot>
            Connection Error
          </Badge>
        );
      case 'disconnected':
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
  const isConnecting = authState.status === 'connecting' || isLoading;
  const isExpired = authState.status === 'expired';
  const isError = authState.status === 'error';

  return (
    <>
      <Card
        className={`relative overflow-hidden glass-card rounded-2xl border-studio-700/60 shadow-xl ${
          compact ? 'p-4' : 'p-6'
        }`}
      >
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header: Google Flow AI Logo, Title & Status */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-studio-700/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-lg shadow-black/20 flex items-center justify-center p-2.5 border border-white/40 shrink-0">
              <GoogleLogoSvg size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">Google Flow AI</h3>
                {renderStatusBadge(authState.status, authState.failureReason)}
              </div>
              <p className="text-xs text-studio-300 mt-0.5">
                Secure OAuth 2.0 PKCE authentication for Google Flow AI workflows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Sliders size={13} />}
              onClick={() => setShowConfigModal(true)}
              title="Google Cloud OAuth Client ID"
            >
              Configure Client ID
            </Button>
          </div>
        </div>

        {/* STATE 1: Connected View */}
        {isConnected && authState.profile ? (
          <div className="relative z-10 mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-studio-850/90 border border-emerald-500/40 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-studio-950/30">
              <div className="flex items-center gap-3.5">
                {authState.profile.picture ? (
                  <img
                    src={authState.profile.picture}
                    alt={authState.profile.name}
                    className="w-12 h-12 rounded-xl border border-cyan-400/50 object-cover shadow-md shadow-cyan-500/20 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 border border-cyan-400/40 flex items-center justify-center font-bold text-base text-white shadow-md shadow-brand-500/20 shrink-0">
                    {authState.profile.name?.[0]?.toUpperCase() || 'G'}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {authState.profile.name}
                    </span>
                    <Badge variant="success" size="sm">
                      Verified
                    </Badge>
                  </div>
                  <p className="text-xs text-emerald-300 font-mono mt-0.5">
                    {authState.profile.email}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-studio-400">
                    <Shield size={12} className="text-emerald-400" />
                    <span>Credentials protected by native OS encrypted vault (safeStorage)</span>
                  </div>
                </div>
              </div>

              {/* Connected Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink size={13} />}
                  onClick={() => window.api?.openExternalUrl('https://flow.google/')}
                >
                  Open Flow Workspace
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw size={13} />}
                  onClick={handleReconnect}
                  loading={isLoading}
                  title="Re-authenticate session"
                >
                  Reconnect
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  icon={<LogOut size={13} />}
                  onClick={handleDisconnect}
                  loading={isLoading}
                  title="Disconnect and revoke credentials"
                >
                  Disconnect
                </Button>
              </div>
            </div>

            {/* Workflow Guidance */}
            <div className="p-3.5 rounded-xl bg-studio-900/80 border border-studio-700/50 backdrop-blur-sm space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Sparkles size={13} className="text-cyan-400" />
                <span>Supported Flow AI Workflow Active</span>
              </div>
              <p className="text-[11px] text-studio-300 leading-relaxed">
                Your authenticated Google account is ready for the Flow Studio pipeline: generate scene prompts, export character keyframe reference photos, and import finished video clips directly into your project.
              </p>
            </div>
          </div>
        ) : null}

        {/* STATE 2: Connecting View */}
        {isConnecting && !isConnected && (
          <div className="relative z-10 mt-4 p-5 rounded-2xl bg-brand-500/10 border border-brand-500/30 backdrop-blur-md flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <RefreshCw size={20} className="animate-spin text-cyan-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">
                  Waiting for Google Authorization...
                </span>
                <p className="text-studio-300 text-[11px] mt-0.5">
                  Your default web browser has opened to Google sign-in. Please sign in and approve permissions to complete connection.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.api?.cancelGoogleAuth()}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* STATE 3: Failure States & Alerts */}
        {isError && (
          <div className="relative z-10 mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-200 block">
                  {authState.statusLabel}
                </span>
                <p className="text-rose-300/90 text-[11px] mt-0.5 leading-relaxed">
                  {authState.error || 'Google connection could not be established.'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {authState.failureReason === 'configuration_missing' ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Sliders size={13} />}
                  onClick={() => setShowConfigModal(true)}
                >
                  Configure Client ID
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConnect}
                  loading={isLoading}
                >
                  Retry Connection
                </Button>
              )}
            </div>
          </div>
        )}

        {/* STATE 4: Session Expired Alert */}
        {isExpired && (
          <div className="relative z-10 mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-200 block">
                  Google Session Expired
                </span>
                <p className="text-amber-300/90 text-[11px] mt-0.5">
                  {authState.error || 'Your Google OAuth authorization has expired. Reconnect to renew your session.'}
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={handleReconnect}
              loading={isLoading}
              className="bg-amber-500 hover:bg-amber-400 text-black border-amber-400 shrink-0"
            >
              Reconnect
            </Button>
          </div>
        )}

        {/* STATE 5: Not Connected (Primary CTA) */}
        {!isConnected && !isConnecting && (
          <div className="relative z-10 mt-4 space-y-4">
            <div className="p-5 rounded-2xl bg-studio-850/70 border border-studio-700/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-lg shadow-studio-950/20">
              <div className="space-y-1">
                <span className="font-bold text-sm text-white">
                  Connect Your Google Account
                </span>
                <p className="text-xs text-studio-300 leading-relaxed max-w-xl">
                  Sign in securely using official Google OAuth 2.0 with PKCE (S256). Strictly requests OpenID identity permissions (email and profile).
                </p>
              </div>

              {/* Primary Connect Google Button */}
              <button
                type="button"
                onClick={handleConnect}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-xs transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 border border-white/40 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw size={16} className="animate-spin text-slate-600" />
                ) : (
                  <GoogleLogoSvg size={18} />
                )}
                <span>{isLoading ? 'Connecting...' : 'Connect Google'}</span>
              </button>
            </div>

            {/* Zero Password Guarantee Note */}
            <div className="flex items-center gap-2 text-[11px] text-studio-400">
              <Shield size={13} className="text-emerald-400 shrink-0" />
              <span>
                Zero Password Storage: Uses Authorization Code Flow with PKCE (S256). Passwords are never entered or stored inside this application.
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Configure Client ID Modal (Advanced Settings) */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false);
          setTestResult(null);
        }}
        title="Configure Google OAuth Client ID"
        subtitle="Desktop application authentication credentials"
        size="md"
      >
        <div className="space-y-5 text-xs text-studio-300">
          <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 backdrop-blur-md flex items-start gap-3">
            <Info className="text-brand-400 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <span className="font-semibold text-white">Google Cloud Desktop Client ID</span>
              <p className="text-studio-300 leading-relaxed text-[11px]">
                Google requires external desktop applications to use an official OAuth Client ID registered as <strong>"Desktop app"</strong> in Google Cloud Console. No client secret is required or allowed in native desktop apps.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-white block">
              OAuth 2.0 Client ID (Desktop Application)
            </label>
            <Input
              value={clientIdInput}
              onChange={(e) => {
                setClientIdInput(e.target.value);
                setTestResult(null);
              }}
              placeholder="e.g. 1234567890-abcdef123456.apps.googleusercontent.com"
              helperText="Must end with '.apps.googleusercontent.com'. Desktop clients use PKCE (S256)."
            />

            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-[11px] flex items-center gap-2 ${
                  testResult.valid
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-950/40 text-rose-300 border border-rose-500/40'
                }`}
              >
                {testResult.valid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-studio-900/90 border border-studio-700/60 backdrop-blur-sm space-y-2 text-[11px]">
            <span className="font-semibold text-white block">How to get your Client ID in 1 minute:</span>
            <ol className="list-decimal list-inside space-y-1 text-studio-300">
              <li>Open <strong>Google Cloud Console &gt; Credentials</strong> (link below).</li>
              <li>Click <strong>Create Credentials &gt; OAuth client ID</strong>.</li>
              <li>Select Application type: <strong>Desktop app</strong> (name: <em>Social Earnings Studio</em>).</li>
              <li>Click <strong>Create</strong> and copy your <strong>Client ID</strong>.</li>
              <li><em>Note:</em> In <strong>OAuth consent screen</strong>, ensure your Gmail is added under <strong>Test users</strong> (if your app is in Testing mode).</li>
            </ol>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-studio-700/50">
            <Button
              variant="outline"
              size="sm"
              icon={<ExternalLink size={13} />}
              onClick={() => window.api?.openExternalUrl('https://console.cloud.google.com/apis/credentials')}
            >
              Open Cloud Console
            </Button>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTestClientId}
              >
                Test Configuration
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveClientId}
              >
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
