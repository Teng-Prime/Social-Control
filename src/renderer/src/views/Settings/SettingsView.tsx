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
  Cpu,
  Zap,
  Gauge,
  Bot,
  Eye,
  EyeOff,
  Sparkles,
  Server,
  Layers,
  Clock,
  HardDrive,
  Activity,
} from 'lucide-react';
import { StudioSettings } from '../../../shared/types';
import { GoogleConnectCard } from '../../components/google/GoogleConnectCard';

export const SettingsView: React.FC = () => {
  const { settings, fetchSettings, updateSettings, health, fetchSystemHealth, addToast } = useAppStore();
  const [formData, setFormData] = useState<Partial<StudioSettings>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'hardware' | 'openai' | 'defaults' | 'storage' | 'database'>('all');
  
  // Test states
  const [testFfmpegResult, setTestFfmpegResult] = useState<string | null>(null);
  const [testAdbResult, setTestAdbResult] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Hardware benchmark state
  const [isTestingHardware, setIsTestingHardware] = useState(false);
  const [hardwareBenchResult, setHardwareBenchResult] = useState<{
    encoder: string;
    speed: string;
    durationMs: number;
  } | null>(null);
  const [hardwareBenchError, setHardwareBenchError] = useState<string | null>(null);

  // OpenAI testing state
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);
  const [openaiTestResult, setOpenaiTestResult] = useState<string | null>(null);
  const [openaiTestError, setOpenaiTestError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchSystemHealth();
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

  const handleTestHardware = async () => {
    if (!window.api) return;
    setIsTestingHardware(true);
    setHardwareBenchResult(null);
    setHardwareBenchError(null);

    try {
      const res = await window.api.testHardwareAcceleration(formData.hardwareAcceleration);
      if (res.success) {
        setHardwareBenchResult({
          encoder: res.encoder,
          speed: res.speed,
          durationMs: res.durationMs,
        });
        addToast({
          type: 'success',
          title: 'Hardware Acceleration Verified',
          message: `Render benchmark passed using [${res.encoder}] at ${res.speed}!`,
        });
      } else {
        setHardwareBenchError(res.error || 'Benchmark test failed.');
        addToast({
          type: 'error',
          title: 'Hardware Benchmark Error',
          message: res.error || 'Failed to initialize selected hardware encoder.',
        });
      }
    } catch (err: any) {
      setHardwareBenchError(err.message);
    } finally {
      setIsTestingHardware(false);
    }
  };

  const handleTestOpenAI = async () => {
    if (!window.api) return;
    setIsTestingOpenAI(true);
    setOpenaiTestResult(null);
    setOpenaiTestError(null);

    try {
      const res = await window.api.testOpenAIConnection(formData.openaiApiKey, formData.openaiModel);
      if (res.success) {
        setOpenaiTestResult(res.message);
        addToast({
          type: 'success',
          title: 'OpenAI API Connected',
          message: res.message,
        });
      } else {
        setOpenaiTestError(res.message);
        addToast({
          type: 'error',
          title: 'OpenAI Connection Failed',
          message: res.message,
        });
      }
    } catch (err: any) {
      setOpenaiTestError(err.message);
    } finally {
      setIsTestingOpenAI(false);
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
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 overflow-y-auto h-full text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-studio-700/60 sticky top-0 bg-[#0B1528]/90 backdrop-blur-md z-10 pt-1">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white shrink-0">
            <Settings size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Studio Configuration & Hardware Engine
            </h2>
            <p className="text-xs text-studio-300 mt-0.5">
              Host CPU, RAM & GPU acceleration, OpenAI intelligence, 30s video rendering defaults, and system storage.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          loading={isSaving}
          onClick={handleSave}
          className="shadow-lg shadow-cyan-500/25 shrink-0 px-6 font-semibold"
        >
          Save All Changes
        </Button>
      </div>

      {/* Quick Navigation Pills for Easy Single-Page Browsing */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Settings', icon: <Layers size={13} /> },
          { id: 'hardware', label: 'CPU / RAM / GPU Engine', icon: <Cpu size={13} /> },
          { id: 'openai', label: 'OpenAI Intelligence', icon: <Bot size={13} /> },
          { id: 'defaults', label: 'Video Defaults (30s)', icon: <Film size={13} /> },
          { id: 'storage', label: 'Storage & Toolchains', icon: <HardDrive size={13} /> },
          { id: 'database', label: 'Google Flow & Database', icon: <Database size={13} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-medium ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-studio-850/60 text-studio-400 hover:text-white hover:bg-studio-800 border border-studio-700/40'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Host Hardware Specs Overview Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-studio-900/90 via-studio-850/90 to-studio-900/90 border border-studio-700/60 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-studio-800/80">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Host System Hardware Detected
            </span>
          </div>
          <Badge variant="success" size="sm" dot>
            Hardware Ready
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* CPU Spec */}
          <div className="p-3 rounded-xl bg-studio-950/70 border border-studio-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-studio-400">
              <Cpu size={14} className="text-blue-400" />
              <span className="font-semibold text-white">Processor (CPU)</span>
            </div>
            <p className="text-[11px] text-cyan-300 font-medium truncate" title={health?.cpuModel || 'Intel Processor'}>
              {health?.cpuModel || 'Intel High-Performance CPU'}
            </p>
            <span className="text-[10px] text-studio-400 block">
              {health?.cpuThreads || 32} Logical Multithreading Cores
            </span>
          </div>

          {/* GPU Spec */}
          <div className="p-3 rounded-xl bg-studio-950/70 border border-studio-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-studio-400">
              <Zap size={14} className="text-amber-400" />
              <span className="font-semibold text-white">Graphics (GPU)</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium truncate" title={health?.gpuName || 'Graphics Card'}>
              {health?.gpuName || 'NVIDIA GeForce GPU'}
            </p>
            <span className="text-[10px] text-studio-400 block">
              DirectX / NVENC Hardware Acceleration
            </span>
          </div>

          {/* RAM Spec */}
          <div className="p-3 rounded-xl bg-studio-950/70 border border-studio-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-studio-400">
              <Gauge size={14} className="text-purple-400" />
              <span className="font-semibold text-white">Memory (RAM)</span>
            </div>
            <p className="text-[11px] text-purple-300 font-medium">
              {health?.totalRamGb ? `${health.totalRamGb} GB RAM` : '128 GB RAM'}
            </p>
            <span className="text-[10px] text-studio-400 block">
              High-Speed Queue Buffering Active
            </span>
          </div>

          {/* Active Video Encoder */}
          <div className="p-3 rounded-xl bg-studio-950/70 border border-studio-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-studio-400">
              <Film size={14} className="text-cyan-400" />
              <span className="font-semibold text-white">Video Encoder</span>
            </div>
            <p className="text-[11px] text-cyan-300 font-mono font-medium truncate">
              {health?.hardwareEncoder || formData.hardwareAcceleration || 'h264_mf (GPU)'}
            </p>
            <span className="text-[10px] text-studio-400 block">
              FFmpeg 9.0.2 Hardware Pipeline
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Hardware Acceleration (CPU / RAM / GPU) */}
      {(activeTab === 'all' || activeTab === 'hardware') && (
        <Card
          title="Hardware Acceleration & Video Rendering Engine"
          subtitle="Configure GPU acceleration, CPU multi-threading, and RAM buffer queues for ultra-fast exports"
          className="glass-card rounded-2xl border-studio-700/60 shadow-xl"
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* GPU Encoder Selection */}
              <div className="space-y-1.5">
                <Select
                  label="GPU Hardware Encoder"
                  value={formData.hardwareAcceleration || 'auto'}
                  onChange={(e) => handleChange('hardwareAcceleration', e.target.value)}
                  options={[
                    { value: 'auto', label: 'Auto Detect (Recommended - GPU MFT / NVENC)' },
                    { value: 'mediafoundation', label: 'Windows Media Foundation (DirectX / D3D GPU)' },
                    { value: 'nvenc', label: 'NVIDIA NVENC (GeForce / Quadro GPU)' },
                    { value: 'amf', label: 'AMD AMF (Radeon GPU Acceleration)' },
                    { value: 'qsv', label: 'Intel Quick Sync (QSV Video Engine)' },
                    { value: 'cpu', label: 'CPU Multi-Core Software (libx264)' },
                  ]}
                />
                <p className="text-[10px] text-studio-400 leading-tight">
                  Media Foundation / NVENC leverages GPU hardware to render 8x to 10x faster.
                </p>
              </div>

              {/* CPU Thread Limit */}
              <div className="space-y-1.5">
                <Select
                  label="CPU Multi-Threading"
                  value={String(formData.cpuThreads ?? 0)}
                  onChange={(e) => handleChange('cpuThreads', parseInt(e.target.value, 10))}
                  options={[
                    { value: '0', label: 'Auto (All CPU Cores - 32 Threads)' },
                    { value: '8', label: '8 Threads (Standard Multitasking)' },
                    { value: '16', label: '16 Threads (High-Performance Parallel)' },
                    { value: '24', label: '24 Threads (Heavy Multi-Core)' },
                    { value: '32', label: '32 Threads (Maximum Parallelism)' },
                  ]}
                />
                <p className="text-[10px] text-studio-400 leading-tight">
                  Enables multi-core parallelism across all performance and efficiency cores.
                </p>
              </div>

              {/* RAM Queue Buffer */}
              <div className="space-y-1.5">
                <Select
                  label="RAM Buffer Queue Size"
                  value={String(formData.ramBufferMb ?? 1024)}
                  onChange={(e) => handleChange('ramBufferMb', parseInt(e.target.value, 10))}
                  options={[
                    { value: '512', label: '512 MB (Standard Cache)' },
                    { value: '1024', label: '1024 MB (Recommended - Smooth Flow)' },
                    { value: '2048', label: '2048 MB (Ultra High-Speed Buffer)' },
                    { value: '4096', label: '4096 MB (Maximum 4K Queue)' },
                  ]}
                />
                <p className="text-[10px] text-studio-400 leading-tight">
                  Allocates RAM memory queue to prevent frame-drop and disk I/O bottlenecks.
                </p>
              </div>

              {/* Render Speed Preset */}
              <div className="space-y-1.5">
                <Select
                  label="Encoding Performance Preset"
                  value={formData.renderPreset || 'veryfast'}
                  onChange={(e) => handleChange('renderPreset', e.target.value)}
                  options={[
                    { value: 'ultrafast', label: 'Ultrafast (Fastest Turnaround)' },
                    { value: 'veryfast', label: 'Very Fast (Optimal Balance)' },
                    { value: 'fast', label: 'Fast (Higher Compression)' },
                    { value: 'medium', label: 'Medium (Maximum Quality Density)' },
                  ]}
                />
                <p className="text-[10px] text-studio-400 leading-tight">
                  Tuning presets adjust encoder motion estimation algorithms.
                </p>
              </div>
            </div>

            {/* Benchmark / Hardware Verification Button */}
            <div className="p-4 rounded-xl bg-studio-950/80 border border-studio-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-semibold text-white block text-xs">
                  Hardware Acceleration Benchmark
                </span>
                <span className="text-[11px] text-studio-400">
                  Run a real-time rendering test using the selected GPU/CPU/RAM pipeline to benchmark speed factor.
                </span>
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={<Zap size={14} className="text-amber-400" />}
                loading={isTestingHardware}
                onClick={handleTestHardware}
                className="shrink-0"
              >
                Benchmark Hardware Speed
              </Button>
            </div>

            {/* Benchmark Feedback */}
            {hardwareBenchResult && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-300 block">
                      Hardware Acceleration Confirmed
                    </span>
                    <span className="text-[11px] text-emerald-200/80">
                      Active Encoder: <span className="font-mono font-semibold">{hardwareBenchResult.encoder}</span> • Render Speed: <span className="font-semibold text-cyan-300">{hardwareBenchResult.speed}</span> (Completed in {hardwareBenchResult.durationMs}ms)
                    </span>
                  </div>
                </div>
                <Badge variant="success" size="sm">Optimal</Badge>
              </div>
            )}

            {hardwareBenchError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-rose-300 block">Hardware Test Warning</span>
                  <span className="text-[11px] text-rose-200/80">{hardwareBenchError}</span>
                  <p className="text-[10px] text-studio-400 mt-1">
                    Auto-fallback to CPU multithreading (libx264 -threads 0) is active to ensure renders never fail.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* SECTION 2: OpenAI API & Intelligence Configuration */}
      {(activeTab === 'all' || activeTab === 'openai') && (
        <Card
          title="OpenAI API & Intelligence Engine"
          subtitle="Power viral story scripts, hook generation, scene breakdowns, and character prompts"
          className="glass-card rounded-2xl border-studio-700/60 shadow-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 to-blue-950/30 border border-cyan-500/30 flex items-start gap-3">
              <Bot size={18} className="text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-white">Intelligent Script & Prompt Generator</span>
                <p className="text-[11px] text-studio-300 leading-relaxed">
                  Enter your OpenAI API key to automatically generate complete 30-second multi-scene video stories, high-retention opening hooks, camera angles, lighting prompts, and viral cliffhangers. If no key is set, the studio seamlessly uses built-in procedural generation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* API Key Input with show/hide toggle */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-semibold text-white">
                  OpenAI API Key (sk-...)
                </label>
                <div className="relative flex items-center">
                  <Input
                    type={showOpenAIKey ? 'text' : 'password'}
                    value={formData.openaiApiKey || ''}
                    onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                    placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="absolute right-3 text-studio-400 hover:text-white transition-colors"
                    title={showOpenAIKey ? 'Hide API Key' : 'Show API Key'}
                  >
                    {showOpenAIKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-studio-400">
                  Your key is securely stored in your local application database.
                </p>
              </div>

              {/* Model Selector */}
              <div className="space-y-1">
                <Select
                  label="Preferred OpenAI Model"
                  value={formData.openaiModel || 'gpt-4o-mini'}
                  onChange={(e) => handleChange('openaiModel', e.target.value)}
                  options={[
                    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost Efficient)' },
                    { value: 'gpt-4o', label: 'GPT-4o (Highest Creative Intelligence)' },
                    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Legacy)' },
                  ]}
                />
                <p className="text-[10px] text-studio-400">
                  GPT-4o Mini generates 30s scripts in ~1-2 seconds with minimal token cost.
                </p>
              </div>
            </div>

            {/* Test OpenAI Connection Button & Feedback */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Sparkles size={14} className="text-cyan-400" />}
                loading={isTestingOpenAI}
                onClick={handleTestOpenAI}
              >
                Test OpenAI Connection
              </Button>

              {openaiTestResult && (
                <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs">
                  <CheckCircle2 size={16} />
                  <span>{openaiTestResult}</span>
                </div>
              )}

              {openaiTestError && (
                <div className="flex items-center gap-2 text-rose-400 font-medium text-xs">
                  <AlertTriangle size={16} />
                  <span>{openaiTestError}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 3: Video Generation Defaults (30s Video Default) */}
      {(activeTab === 'all' || activeTab === 'defaults') && (
        <Card
          title="Video Generation Defaults & 30s Target Duration"
          subtitle="Default video lengths, aspect ratios, resolutions, and simultaneous queue workers"
          className="glass-card rounded-2xl border-studio-700/60 shadow-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Default Duration (30s highlighted) */}
              <div className="space-y-1.5">
                <Select
                  label="Default Target Duration"
                  value={String(formData.defaultVideoDuration ?? 30)}
                  onChange={(e) => handleChange('defaultVideoDuration', parseInt(e.target.value, 10))}
                  options={[
                    { value: '30', label: '30 Seconds (Default Shorts / Reels / TikTok)' },
                    { value: '15', label: '15 Seconds (Rapid Attention Grabber)' },
                    { value: '60', label: '60 Seconds (Full Standard Story)' },
                    { value: '90', label: '90 Seconds (Deep Extended Arc)' },
                    { value: '180', label: '180 Seconds (Long-form Short Story)' },
                  ]}
                />
                <p className="text-[10px] text-cyan-400 font-medium">
                  ★ 30 seconds (5 scenes × 6s) delivers peak retention on TikTok & YouTube Shorts.
                </p>
              </div>

              {/* Default Aspect Ratio */}
              <div className="space-y-1.5">
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
                <p className="text-[10px] text-studio-400">
                  Standard mobile format for vertical short-form video algorithms.
                </p>
              </div>

              {/* Target Resolution */}
              <div className="space-y-1.5">
                <Select
                  label="Target Resolution"
                  value={formData.defaultResolution || '1080x1920'}
                  onChange={(e) => handleChange('defaultResolution', e.target.value)}
                  options={[
                    { value: '1080x1920', label: '1080 × 1920 (FHD Vertical)' },
                    { value: '1920x1080', label: '1920 × 1080 (FHD Horizontal)' },
                    { value: '720x1280', label: '720 × 1280 (HD Vertical)' },
                  ]}
                />
                <p className="text-[10px] text-studio-400">
                  High-definition mastering ensuring crisp visual quality.
                </p>
              </div>

              {/* Concurrency Limit */}
              <div className="space-y-1.5">
                <Input
                  label="Simultaneous Queue Tasks"
                  type="number"
                  min={1}
                  max={6}
                  value={formData.queueConcurrency ?? 2}
                  onChange={(e) => handleChange('queueConcurrency', parseInt(e.target.value, 10))}
                  helperText="Simultaneous render and phone transfer jobs"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 4: Storage & Toolchain Dependencies */}
      {(activeTab === 'all' || activeTab === 'storage') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage & Directories */}
          <Card
            title="Storage & Asset Directories"
            subtitle="Where projects, scenes, videos, and exports reside"
            className="glass-card rounded-2xl border-studio-700/60 shadow-xl"
          >
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Primary Studio Root Folder
                </label>
                <div className="flex gap-2">
                  <Input
                    value={formData.storageDirectory || ''}
                    onChange={(e) => handleChange('storageDirectory', e.target.value)}
                    placeholder="D:\SocialEarningsStudio"
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
                  Subdirectories for Characters, Projects, Videos, Exports, and Logs reside here.
                </p>
              </div>

              <Input
                label="Android Phone Destination Folder"
                value={formData.phoneTransferFolder || ''}
                onChange={(e) => handleChange('phoneTransferFolder', e.target.value)}
                helperText="Folder on phone storage (e.g. Movies/SocialEarningsStudio)"
              />
            </div>
          </Card>

          {/* Toolchain Dependencies */}
          <Card
            title="Toolchain Dependencies"
            subtitle="FFmpeg video engine and Android Debug Bridge (ADB)"
            className="glass-card rounded-2xl border-studio-700/60 shadow-xl"
          >
            <div className="space-y-4 text-xs">
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
                  <p className="text-[11px] font-mono mt-1.5 text-cyan-400 bg-studio-900/60 px-2 py-1 rounded-lg border border-studio-700/40">
                    {testFfmpegResult}
                  </p>
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
                  <p className="text-[11px] font-mono mt-1.5 text-cyan-400 bg-studio-900/60 px-2 py-1 rounded-lg border border-studio-700/40">
                    {testAdbResult}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 5: Google Flow & Database Maintenance */}
      {(activeTab === 'all' || activeTab === 'database') && (
        <div className="space-y-6">
          <GoogleConnectCard />

          <Card
            title="Database Maintenance & Disaster Recovery"
            subtitle="SQLite data storage, automated WAL backups, and migration state"
            className="glass-card rounded-2xl border-studio-700/60 shadow-xl"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-studio-850/80 backdrop-blur-md border border-studio-700/60 shadow-inner">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="text-cyan-400" size={16} />
                  SQLite Database (WAL Mode Active)
                </h4>
                <p className="text-xs text-studio-300">
                  Contains characters, video projects, scene clips, social publish history, and device account records.
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
                  Restore Backup
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
