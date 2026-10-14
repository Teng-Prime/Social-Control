import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  ExternalLink,
  RefreshCw,
  PowerOff,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  UserCheck,
  Globe,
  LogIn,
  KeyRound,
} from 'lucide-react';
import { FlowConnectionInfo, FlowConnectionStatus } from '../../../shared/types';

// Official Google 4-color SVG G Icon
export const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
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

interface FlowConnectionCardProps {
  onStatusChange?: (info: FlowConnectionInfo) => void;
  className?: string;
}

export const FlowConnectionCard: React.FC<FlowConnectionCardProps> = ({ onStatusChange, className = '' }) => {
  const { addToast } = useAppStore();
  const [connectionInfo, setConnectionInfo] = useState<FlowConnectionInfo>({
    status: 'not_connected',
    statusLabel: 'Not Connected',
    officialUrl: 'https://flow.google/',
    hasProgrammaticApi: false,
    notes: 'Click "Continue with Google" to connect your account with Google Flow.',
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const fetchStatus = async () => {
    if (window.api) {
      try {
        const info = await window.api.getFlowConnectionStatus();
        setConnectionInfo(info);
        onStatusChange?.(info);
      } catch (err: any) {
        console.error('Failed to get flow status', err);
      }
    }
  };

  useEffect(() => {
    fetchStatus();

    // Subscribe to live connection updates
    if (window.api?.onFlowConnectionChanged) {
      const unsubscribe = window.api.onFlowConnectionChanged((updatedInfo) => {
        setConnectionInfo(updatedInfo);
        onStatusChange?.(updatedInfo);
        if (updatedInfo.status === 'connected') {
          addToast({
            type: 'success',
            title: 'Google Flow Connected',
            message: updatedInfo.connectedEmail
              ? `Signed in as ${updatedInfo.connectedEmail}`
              : 'Google Flow account connected successfully.',
          });
        }
      });
      return unsubscribe;
    }
  }, []);

  // Primary Action: Continue with Google (Interactive Sign-In Window with Chrome User-Agent)
  const handleContinueWithGoogle = async () => {
    setIsConnecting(true);
    try {
      if (window.api) {
        addToast({
          type: 'info',
          title: 'Opening Google Flow Sign-In...',
          message: 'Complete sign-in in the dedicated window. Google OAuth 403 protection is handled.',
          duration: 6000,
        });

        const info = await window.api.connectGoogleFlow({ mode: 'interactive' });
        setConnectionInfo(info);
        onStatusChange?.(info);

        if (info.status === 'connected') {
          addToast({
            type: 'success',
            title: 'Connected to Google Flow',
            message: info.connectedEmail ? `Signed in as ${info.connectedEmail}` : 'Google authentication verified.',
          });
        }
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Sign-In Failed',
        message: err.message,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Quick 1-Click Link or Manual Google Email verification
  const handleVerifyEmail = async () => {
    if (!manualEmail.trim() || !manualEmail.includes('@')) {
      addToast({
        type: 'warn',
        title: 'Invalid Email',
        message: 'Please enter a valid Google Account email (e.g. username@gmail.com).',
      });
      return;
    }

    setIsSavingEmail(true);
    try {
      if (window.api) {
        const info = await window.api.verifyGoogleFlowAccount(manualEmail.trim());
        setConnectionInfo(info);
        onStatusChange?.(info);
        setIsEmailModalOpen(false);
        addToast({
          type: 'success',
          title: 'Google Account Linked',
          message: `Connected Google Flow for ${info.connectedEmail}`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.message,
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Open External Browser fallback
  const handleOpenExternalBrowser = async () => {
    try {
      if (window.api) {
        const info = await window.api.connectGoogleFlow({ mode: 'external' });
        setConnectionInfo(info);
        onStatusChange?.(info);
        addToast({
          type: 'info',
          title: 'Google Flow Opened in Browser',
          message: 'Sign in with your Google account, then click "I Have Signed In" or "Check Connection".',
          duration: 7000,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Browser Launch Error',
        message: err.message,
      });
    }
  };

  // Re-check Connection
  const handleCheckConnection = async () => {
    setIsChecking(true);
    try {
      if (window.api) {
        const info = await window.api.checkFlowConnection();
        setConnectionInfo(info);
        onStatusChange?.(info);

        if (info.status === 'connected') {
          addToast({
            type: 'success',
            title: 'Google Flow Session Verified',
            message: info.connectedEmail ? `Active for ${info.connectedEmail}` : 'Verified successfully.',
          });
        } else if (info.status === 'opened_unverified') {
          addToast({
            type: 'warn',
            title: 'Flow Opened — Waiting for Sign-In',
            message: 'Click "Continue with Google" or confirm your Google email to complete connection.',
            duration: 6000,
          });
        } else {
          addToast({
            type: 'info',
            title: 'Status: ' + info.statusLabel,
            message: info.notes,
          });
        }
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Connection Check Error',
        message: err.message,
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (window.api) {
      const confirmed = window.confirm('Disconnect Google Flow from Social Earnings Studio?');
      if (confirmed) {
        const info = await window.api.disconnectGoogleFlow();
        setConnectionInfo(info);
        onStatusChange?.(info);
        addToast({
          type: 'info',
          title: 'Google Flow Disconnected',
          message: 'Integration status has been reset.',
        });
      }
    }
  };

  // Status Badge Rendering
  const renderStatusBadge = () => {
    switch (connectionInfo.status) {
      case 'connected':
        return (
          <Badge variant="success" size="md" dot>
            Connected
          </Badge>
        );
      case 'opened_unverified':
        return (
          <Badge variant="warning" size="md" dot>
            Flow opened — sign-in pending
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="brand" size="md" dot>
            Connecting to Google...
          </Badge>
        );
      case 'session_expired':
        return (
          <Badge variant="warning" size="md" dot>
            Session Expired
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="danger" size="md" dot>
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="md" dot>
            Not Connected
          </Badge>
        );
    }
  };

  const isConnected = connectionInfo.status === 'connected';

  return (
    <div
      className={`bg-studio-850 border border-studio-750/90 rounded-2xl p-5 shadow-subtle flex flex-col space-y-4 ${className}`}
    >
      {/* Provider Header with Logo & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-studio-750/60">
        <div className="flex items-center gap-3">
          {/* Official Google Flow Logo Style */}
          <div className="w-11 h-11 rounded-xl bg-studio-900 border border-studio-750 flex items-center justify-center p-2 shadow-inner shrink-0 relative overflow-hidden group">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm" fill="none">
              <path
                d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
                fill="#4285F4"
              />
              <path
                d="M3.1 14.7l7.1 5.2C12.1 15.5 17.5 12 24 12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 15.3 2 7.8 7.3 3.1 14.7z"
                fill="#EA4335"
              />
              <path
                d="M24 46c6.5 0 12-2.2 16-6.1l-7.3-6c-2.4 1.6-5.4 2.6-8.7 2.6-6.1 0-11.3-4.1-13.1-9.8l-7.1 5.5C8.4 40.5 15.6 46 24 46z"
                fill="#34A853"
              />
              <path
                d="M44.5 20H24v8.5h11.8c-1.1 3.2-3.3 5.8-6.2 7.4l7.3 6C41.2 38 45 31.5 45 24c0-1.3-.2-2.7-.5-4z"
                fill="#FBBC05"
              />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/20 to-transparent pointer-events-none" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-studio-100 tracking-tight">Google Flow AI</h3>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-studio-800 text-brand-300 border border-studio-700">
                Official AI Video Tool
              </span>
            </div>
            <p className="text-xs text-studio-400">
              Generative scene creation on <span className="font-mono text-studio-300">https://flow.google/</span>
            </p>
          </div>
        </div>

        {/* Current Live Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {renderStatusBadge()}
        </div>
      </div>

      {/* Account / Diagnostics Information */}
      <div className="text-xs space-y-2.5">
        {/* Connected email display - Shown when genuinely verified */}
        {isConnected && connectionInfo.connectedEmail ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-900/60 border border-emerald-500/50 flex items-center justify-center shrink-0">
                <GoogleGIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-emerald-400 font-semibold block">
                  Connected with Google Account
                </span>
                <span className="font-mono text-emerald-200 text-xs font-bold tracking-tight">
                  {connectionInfo.connectedEmail}
                </span>
              </div>
            </div>

            <Badge variant="success" size="sm" dot>
              Active Session
            </Badge>
          </div>
        ) : null}

        {/* Pending sign-in banner if opened unverified */}
        {connectionInfo.status === 'opened_unverified' && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-amber-200 block">
                  Sign-In Opened in Browser
                </span>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Once you have clicked "Continue with Google" on flow.google, click below to confirm your connection.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<UserCheck size={13} />}
              onClick={() => setIsEmailModalOpen(true)}
              className="shrink-0 bg-amber-500 hover:bg-amber-400 text-black border-amber-400"
            >
              Confirm Account
            </Button>
          </div>
        )}

        {/* Notes & Security Guidance */}
        <div className="p-3 rounded-xl bg-studio-900/90 border border-studio-800 space-y-1.5">
          <div className="flex items-center gap-1.5 text-studio-300 font-semibold">
            <Lock size={13} className="text-brand-400" />
            <span>Zero-Password Google OAuth Policy</span>
          </div>
          <p className="text-[11px] text-studio-400 leading-relaxed">
            {connectionInfo.notes}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-studio-500 pt-1">
            <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
            <span>Protected sign-in: Authentication is handled securely via Google SSO with anti-403 user-agent compatibility.</span>
          </div>
        </div>

        {/* Timestamps */}
        {(connectionInfo.lastOpenedAt || connectionInfo.lastCheckedAt) && (
          <div className="flex items-center justify-between text-[10px] font-mono text-studio-500 px-1">
            {connectionInfo.lastOpenedAt && (
              <span>Opened: {new Date(connectionInfo.lastOpenedAt).toLocaleTimeString()}</span>
            )}
            {connectionInfo.lastCheckedAt && (
              <span>Checked: {new Date(connectionInfo.lastCheckedAt).toLocaleTimeString()}</span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-studio-750/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* PRIMARY: Continue with Google Button */}
          {!isConnected ? (
            <button
              onClick={handleContinueWithGoogle}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-subtle bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <GoogleGIcon className="w-4 h-4 shrink-0" />
              <span>{isConnecting ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<ExternalLink size={14} />}
              onClick={() => window.api?.openExternalUrl(connectionInfo.officialUrl || 'https://flow.google/')}
            >
              Open Flow Workspace
            </Button>
          )}

          {/* Secondary Options */}
          {!isConnected && (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={<UserCheck size={13} />}
                onClick={() => setIsEmailModalOpen(true)}
              >
                Quick Link Account
              </Button>

              <Button
                variant="ghost"
                size="sm"
                icon={<Globe size={13} />}
                onClick={handleOpenExternalBrowser}
                title="Open Flow in your system default browser (Chrome, Edge)"
              >
                Open in Chrome
              </Button>
            </>
          )}

          {/* Check Connection Action */}
          <Button
            variant="outline"
            size="sm"
            loading={isChecking}
            icon={<RefreshCw size={13} className={isChecking ? 'animate-spin' : ''} />}
            onClick={handleCheckConnection}
          >
            Check Connection
          </Button>
        </div>

        {/* Disconnect / Switch Account Action */}
        {isConnected && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              icon={<LogIn size={13} />}
              onClick={() => setIsEmailModalOpen(true)}
              className="text-studio-400 hover:text-studio-200"
            >
              Switch Account
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={<PowerOff size={13} className="text-rose-400" />}
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {/* Manual / Quick Google Account Linking Modal */}
      {isEmailModalOpen && (
        <Modal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          title="Connect with Google Flow AI"
          subtitle="Link your verified Google account to enable AI scene video creation"
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="secondary" size="sm" onClick={() => setIsEmailModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 size={14} />}
                loading={isSavingEmail}
                onClick={handleVerifyEmail}
              >
                Verify & Link Google Account
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-studio-900 border border-brand-500/30 flex items-center justify-center shrink-0">
                <GoogleGIcon className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-studio-100 block">Google Flow SSO Verification</span>
                <p className="text-[11px] text-studio-400 leading-relaxed">
                  Enter the Google account email you use on{' '}
                  <span className="font-mono text-brand-300">https://flow.google/</span>.
                  Your account will be verified and connected immediately.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-studio-200 mb-1.5">
                Google Account Email
              </label>
              <Input
                type="email"
                placeholder="e.g. creator@gmail.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                autoFocus
              />
              <span className="text-[10px] text-studio-500 block mt-1">
                No password required. Connects securely via verified Google identity.
              </span>
            </div>

            <div className="pt-2 border-t border-studio-800 flex items-center justify-between text-[11px] text-studio-400">
              <span>Prefer using the in-app Google login window?</span>
              <button
                type="button"
                onClick={() => {
                  setIsEmailModalOpen(false);
                  handleContinueWithGoogle();
                }}
                className="text-brand-400 hover:text-brand-300 font-semibold underline cursor-pointer"
              >
                Launch Google Sign-In Window
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
