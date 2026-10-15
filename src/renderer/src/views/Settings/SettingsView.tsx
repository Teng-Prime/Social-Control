import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import {
  Settings,
  FolderOpen,
  Film,
  Smartphone,
  Key,
  Database,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCcw,
} from 'lucide-react';
import { StudioSettings } from '../../../shared/types';
import { GoogleConnectCard } from '../../components/google/GoogleConnectCard';

export const SettingsView: React.FC = () => {
  const { settings, fetchSettings, updateSettings, health, fetchSystemHealth, addToast } = useAppStore();
  const [formData, setFormData] = useState<Partial<StudioSettings>>({});
  const [testFfmpegResult, setTestFfmpegResult] = useState<string | null>(null);
  const [testAdbResult, setTestAdbResult] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (field: keyof StudioSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings(formData);
    await fetchSystemHealth();
    setIsSaving(false);
  };

  const handlePickDirectory = async () => {
    if (window.api) {
      const dir = await window.api.openDirectoryDialog();
      if (dir) {
        handleChange('storageDirectory', dir);
      }
    }
  };

  const handleTestFfmpeg = async () => {
    if (window.api) {
      const h = await window.api.getSystemHealth();
      if (h.ffmpegAvailable) {
        setTestFfmpegResult(`Available: ${h.ffmpegVersion}`);
      } else {
        setTestFfmpegResult('Failed to execute FFmpeg. Check binary path.');
      }
    }
  };

  const handleTestAdb = async () => {
    if (window.api) {
      const res = await window.api.testAdbConnection();
      if (res.success) {
        setTestAdbResult(`Available: ${res.version}`);
      } else {
        setTestAdbResult(`Failed: ${res.error || 'ADB not found'}`);
      }
    }
  };

  const handleBackupDb = async () => {
    if (window.api) {
      try {
        const backupPath = await window.api.backupDatabase();
        addToast({
          type: 'success',
          title: 'Database Backup Complete',
          message: `Saved to ${backupPath}`,
        });
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Backup Failed',
          message: err.message,
        });
      }
    }
  };

  const handleRestoreDb = async () => {
    if (window.api) {
      const file = await window.api.openFileDialog(['db']);
      if (file) {
        try {
          await window.api.restoreDatabase(file);
          addToast({
            type: 'success',
            title: 'Database Restored',
            message: 'Application data reloaded from backup.',
          });
          await fetchSettings();
        } catch (err: any) {
          addToast({
            type: 'error',
            title: 'Restore Failed',
            message: err.message,
          });
        }
      }
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-studio-700/50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white shrink-0">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Studio Settings & Preferences
            </h2>
            <p className="text-xs text-studio-300 mt-0.5">
              Configure system paths, AI providers, phone transfer targets, and database storage.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          loading={isSaving}
          onClick={handleSave}
          className="shadow-lg shadow-brand-500/25 shrink-0"
        >
          Save All Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Storage & Directories */}
        <Card title="Storage & Directories" subtitle="Where videos, projects, and assets reside" className="glass-card rounded-2xl border-studio-700/60 shadow-xl">
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Primary Studio Root Folder
              </label>
              <div className="flex gap-2">
                <Input
                  value={formData.storageDirectory || ''}
                  onChange={(e) => handleChange('storageDirectory', e.target.value)}
                  placeholder="C:\Users\Documents\SocialEarningsStudio"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FolderOpen size={16} />}
                  onClick={handlePickDirectory}
                >
                  Browse
                </Button>
              </div>
              <p className="text-[11px] text-studio-400 mt-1.5 leading-relaxed">
                Subdirectories for Characters, Projects, Videos, Exports, and Logs will be automatically managed here.
              </p>
            </div>

            <Input
              label="Default Android Phone Transfer Folder"
              value={formData.phoneTransferFolder || ''}
              onChange={(e) => handleChange('phoneTransferFolder', e.target.value)}
              helperText="Destination folder on phone storage (e.g. Movies/SocialEarningsStudio)"
            />
          </div>
        </Card>

        {/* Video & Device Toolchains */}
        <Card title="Toolchain Dependencies" subtitle="FFmpeg video engine and Android Debug Bridge (ADB)" className="glass-card rounded-2xl border-studio-700/60 shadow-xl">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white">FFmpeg Executable Path</label>
                {health?.ffmpegAvailable ? (
                  <Badge variant="success" size="sm" dot>Detected</Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot>Not Found</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={formData.ffmpegPath || ''}
                  onChange={(e) => handleChange('ffmpegPath', e.target.value)}
                  placeholder="ffmpeg"
                />
                <Button variant="secondary" size="sm" onClick={handleTestFfmpeg}>
                  Test
                </Button>
              </div>
              {testFfmpegResult && (
                <p className="text-[11px] font-mono mt-1.5 text-cyan-400 bg-studio-900/60 px-2 py-1 rounded-lg border border-studio-700/40">{testFfmpegResult}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white">ADB Executable Path</label>
                {health?.adbAvailable ? (
                  <Badge variant="success" size="sm" dot>Detected</Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot>Not Found</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={formData.adbPath || ''}
                  onChange={(e) => handleChange('adbPath', e.target.value)}
                  placeholder="adb"
                />
                <Button variant="secondary" size="sm" onClick={handleTestAdb}>
                  Test
                </Button>
              </div>
              {testAdbResult && (
                <p className="text-[11px] font-mono mt-1.5 text-cyan-400 bg-studio-900/60 px-2 py-1 rounded-lg border border-studio-700/40">{testAdbResult}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Google Flow AI Connection Card (Primary) */}
        <div className="md:col-span-2">
          <GoogleConnectCard />
        </div>

        {/* Advanced / Custom LLM & Flow Endpoint (Optional for Enterprise/Proxy) */}
        <Card
          title="Advanced Flow & AI Provider Settings"
          subtitle="Optional configuration for custom AI proxies or enterprise endpoints"
          className="glass-card rounded-2xl border-studio-700/60 shadow-xl md:col-span-2"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-studio-900/80 border border-studio-700/50 flex items-start gap-3">
              <Sliders size={16} className="text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-white">Google Flow AI Workflow</span>
                <p className="text-[11px] text-studio-300 leading-relaxed">
                  Google Flow officially operates via the web creative workspace (<span className="text-cyan-300 font-mono">https://flow.google/</span>). The studio provides automated scene prompt generation, character reference photo keyframing, and one-click video importing. Custom endpoints below are only needed if routing through an enterprise AI proxy.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Custom Flow API Endpoint (Optional)"
                value={formData.flowApiEndpoint || ''}
                onChange={(e) => handleChange('flowApiEndpoint', e.target.value)}
                placeholder="Leave blank for standard Google Flow Web"
                helperText="Optional custom proxy URL. Official Google Flow runs in browser."
              />

              <Input
                label="Custom Provider API Key / Token"
                type="password"
                value={formData.flowApiKey || ''}
                onChange={(e) => handleChange('flowApiKey', e.target.value)}
                placeholder="••••••••••••••••••••••••"
                helperText="Optional API token, encrypted via OS safeStorage (DPAPI/Keychain)."
              />
            </div>
          </div>
        </Card>

        {/* Video Rendering Defaults */}
        <Card title="Video Generation Defaults" subtitle="Default aspect ratio, resolution, and concurrency" className="glass-card rounded-2xl border-studio-700/60 shadow-xl md:col-span-2">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Default Aspect Ratio"
                value={formData.defaultAspectRatio || '9:16'}
                onChange={(e) => handleChange('defaultAspectRatio', e.target.value)}
                options={[
                  { value: '9:16', label: 'Vertical 9:16 (Shorts/Reels/TikTok)' },
                  { value: '16:9', label: 'Horizontal 16:9 (YouTube Standard)' },
                  { value: '1:1', label: 'Square 1:1 (Feed Video)' },
                ]}
              />

              <Select
                label="Target Resolution"
                value={formData.defaultResolution || '1080x1920'}
                onChange={(e) => handleChange('defaultResolution', e.target.value)}
                options={[
                  { value: '1080x1920', label: '1080 × 1920 (FHD Vertical)' },
                  { value: '1920x1080', label: '1920 × 1080 (FHD Horizontal)' },
                  { value: '720x1280', label: '720 × 1280 (HD)' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Queue Concurrency Limit"
                type="number"
                min={1}
                max={6}
                value={formData.queueConcurrency ?? 2}
                onChange={(e) => handleChange('queueConcurrency', parseInt(e.target.value, 10))}
                helperText="Simultaneous render and upload jobs"
              />

              <Select
                label="System Log Level"
                value={formData.logLevel || 'info'}
                onChange={(e) => handleChange('logLevel', e.target.value)}
                options={[
                  { value: 'debug', label: 'Debug (Verbose)' },
                  { value: 'info', label: 'Info (Standard)' },
                  { value: 'warn', label: 'Warn' },
                  { value: 'error', label: 'Errors Only' },
                ]}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Database Backup & Disaster Recovery */}
      <Card title="Database Maintenance & Recovery" subtitle="SQLite data storage, backups, and migration state" className="glass-card rounded-2xl border-studio-700/60 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-studio-850/80 backdrop-blur-md border border-studio-700/60 shadow-inner">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="text-cyan-400" size={16} />
              SQLite Database (WAL Mode Active)
            </h4>
            <p className="text-xs text-studio-300">
              Contains characters, projects, video library metadata, publish history, and device records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleBackupDb}
            >
              Backup Database
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={handleRestoreDb}
            >
              Restore from Backup
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
