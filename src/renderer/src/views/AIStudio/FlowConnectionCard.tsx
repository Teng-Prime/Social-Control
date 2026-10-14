import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  ExternalLink,
  RefreshCw,
  PowerOff,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { FlowConnectionInfo, FlowConnectionStatus } from '../../../shared/types';

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
    notes: 'Click Connect Google Flow to open the official Flow workspace.',
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

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
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (window.api) {
        const info = await window.api.connectGoogleFlow();
        setConnectionInfo(info);
        onStatusChange?.(info);
        addToast({
          type: 'info',
          title: 'Opening Google Flow...',
          message: 'Sign in to your Google account in your browser, then click "Check Connection".',
          duration: 6000,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Connection Failed',
        message: err.message,
      });
    } finally {
      setIsConnecting(false);
    }
  };

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
            title: 'Google Flow Connected',
            message: info.connectedEmail ? `Verified for ${info.connectedEmail}` : 'Verified successfully.',
          });
        } else if (info.status === 'opened_unverified') {
          addToast({
            type: 'warn',
            title: 'Flow Opened — Connection Not Verified',
            message: 'Browser session active. Assisted manual workflow is enabled.',
            duration: 5000,
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

  const handleOpenFlowWeb = async () => {
    if (window.api) {
      await window.api.openExternalUrl(connectionInfo.officialUrl || 'https://flow.google/');
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
            Flow opened — connection not verified
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="brand" size="md" dot>
            Connecting...
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
              {/* Google 4-color Flow emblem */}
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
              <h3 className="font-bold text-base text-studio-100 tracking-tight">Google Flow</h3>
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
        {/* Connected email display - ONLY shown when genuinely verified */}
        {connectionInfo.connectedEmail ? (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
            <span className="text-studio-400">Verified Google Account:</span>
            <span className="font-mono text-emerald-300 font-semibold">{connectionInfo.connectedEmail}</span>
          </div>
        ) : null}

        {/* Notes & Security Guidance */}
        <div className="p-3 rounded-xl bg-studio-900/90 border border-studio-800 space-y-1.5">
          <div className="flex items-center gap-1.5 text-studio-300 font-semibold">
            <Lock size={13} className="text-brand-400" />
            <span>Zero-Password Authentication Policy</span>
          </div>
          <p className="text-[11px] text-studio-400 leading-relaxed">
            {connectionInfo.notes}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-studio-500 pt-1">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>You sign in securely directly on Google. Password & 2FA codes are never collected or stored.</span>
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
        <div className="flex items-center gap-2">
          {/* Primary Connect Button */}
          {connectionInfo.status === 'not_connected' ? (
            <Button
              variant="primary"
              size="sm"
              loading={isConnecting}
              icon={<Sparkles size={14} />}
              onClick={handleConnect}
            >
              Connect Google Flow
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={<ExternalLink size={14} />}
              onClick={handleOpenFlowWeb}
            >
              Open Google Flow
            </Button>
          )}

          {/* Check Connection Action */}
          <Button
            variant="outline"
            size="sm"
            loading={isChecking}
            icon={<RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />}
            onClick={handleCheckConnection}
          >
            Check Connection
          </Button>
        </div>

        {/* Disconnect Action */}
        {connectionInfo.status !== 'not_connected' && (
          <Button
            variant="ghost"
            size="sm"
            icon={<PowerOff size={14} className="text-rose-400" />}
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        )}
      </div>
    </div>
  );
};
