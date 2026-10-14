import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Smartphone,
  RefreshCw,
  Send,
  Camera,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Play,
  HelpCircle,
  ExternalLink,
  Battery,
  HardDrive,
  Check,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  WifiOff,
  UserCheck,
  Users,
  Download,
  Package,
  Terminal,
  Settings,
  Sparkles,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  Device,
  MediaAsset,
  TransferJob,
  PhoneSetupDiagnostic,
  LocalAppPackageInfo,
  AppInstallResult,
  AtxAgentStatus,
  AtxUiNode,
  AtxAutomatePostResult,
} from '../../../shared/types';

export const PhoneControlView: React.FC = () => {
  const { addToast } = useAppStore();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [transferJobs, setTransferJobs] = useState<TransferJob[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<MediaAsset[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'setup' | 'transfer' | 'control' | 'atx'>('setup');

  // Phone Setup & Diagnostics State
  const [diagnostic, setDiagnostic] = useState<PhoneSetupDiagnostic | null>(null);
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(false);
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);
  const [isBatchInstalling, setIsBatchInstalling] = useState(false);
  const [appFilter, setAppFilter] = useState<'all' | 'missing' | 'installed'>('all');

  // ATX Automation State
  const [atxStatus, setAtxStatus] = useState<AtxAgentStatus | null>(null);
  const [isLoadingAtx, setIsLoadingAtx] = useState(false);
  const [atxHierarchy, setAtxHierarchy] = useState<AtxUiNode[]>([]);
  const [isDumpingHierarchy, setIsDumpingHierarchy] = useState(false);
  const [atxPlatform, setAtxPlatform] = useState<'youtube' | 'tiktok' | 'facebook'>('youtube');
  const [atxTitle, setAtxTitle] = useState('New Viral Story Video #Shorts');
  const [atxCaption, setAtxCaption] = useState('Watch this incredible story unfolded! #story #viral #entertainment');
  const [atxHashtags, setAtxHashtags] = useState('#story #viral #shorts #trending');
  const [atxResult, setAtxResult] = useState<AtxAutomatePostResult | null>(null);
  const [isAutomatingPublish, setIsAutomatingPublish] = useState(false);
  const [manualTapX, setManualTapX] = useState<number>(540);
  const [manualTapY, setManualTapY] = useState<number>(1200);
  const [manualText, setManualText] = useState<string>('');


  // Modals & Wizards
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTroubleshootOpen, setIsTroubleshootOpen] = useState(false);
  const [customAdbHost, setCustomAdbHost] = useState('127.0.0.1:5555');
  const [isConnectingAdb, setIsConnectingAdb] = useState(false);
  const [isRestartingAdb, setIsRestartingAdb] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [selectedAssetForTransfer, setSelectedAssetForTransfer] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);


  const fetchDevices = async () => {
    setIsScanning(true);
    try {
      if (window.api) {
        const dList = await window.api.getConnectedDevices();
        setDevices(dList);

        let activeDev = selectedDevice;
        if (dList.length > 0) {
          if (!activeDev || !dList.some((d) => d.id === activeDev?.id)) {
            activeDev = dList[0];
            setSelectedDevice(dList[0]);
          }
        }

        const tJobs = await window.api.getTransferJobs();
        setTransferJobs(tJobs);

        const assets = await window.api.getMediaAssets();
        setLibraryAssets(assets);
        if (assets.length > 0 && !selectedAssetForTransfer) {
          setSelectedAssetForTransfer(assets[0].filePath);
        }

        if (activeDev) {
          await loadDiagnostic(activeDev.id);
        } else if (dList.length > 0) {
          await loadDiagnostic(dList[0].id);
        } else {
          // Virtual device diagnostic
          await loadDiagnostic('virtual_device');
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Device scan failed', message: err.message });
    } finally {
      setIsScanning(false);
    }
  };

  const loadDiagnostic = async (deviceId: string) => {
    if (!window.api) return;
    setIsLoadingDiagnostic(true);
    try {
      const diag = await window.api.getPhoneSetupDiagnostic(deviceId);
      setDiagnostic(diag);
      await loadAtxStatus(deviceId);
    } catch (err: any) {
      addToast({ type: 'warn', title: 'Diagnostic check notice', message: err.message });
    } finally {
      setIsLoadingDiagnostic(false);
    }
  };

  const loadAtxStatus = async (deviceId: string) => {
    if (!window.api) return;
    setIsLoadingAtx(true);
    try {
      const status = await window.api.getAtxStatus(deviceId);
      setAtxStatus(status);
    } catch (err: any) {
      console.warn('Failed to get ATX status', err);
    } finally {
      setIsLoadingAtx(false);
    }
  };

  const handleInitAtx = async () => {
    const devId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';
    setIsLoadingAtx(true);
    try {
      if (window.api) {
        const res = await window.api.initAtxAgent(devId);
        if (res.success) {
          addToast({ type: 'success', title: 'ATX Agent Initialized', message: res.message });
        } else {
          addToast({ type: 'warn', title: 'ATX Init Response', message: res.message });
        }
        await loadAtxStatus(devId);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'ATX Init Failed', message: err.message });
    } finally {
      setIsLoadingAtx(false);
    }
  };

  const handleDumpHierarchy = async () => {
    const devId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';
    setIsDumpingHierarchy(true);
    try {
      if (window.api) {
        const res = await window.api.dumpAtxHierarchy(devId);
        if (res.success) {
          setAtxHierarchy(res.elements);
          addToast({
            type: 'info',
            title: 'UI Hierarchy Inspected',
            message: `Detected ${res.elements.length} clickable & focusable UI elements on current screen.`,
          });
        } else {
          addToast({ type: 'warn', title: 'Dump Hierarchy', message: res.error || 'Failed to parse UI hierarchy' });
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Hierarchy Dump Failed', message: err.message });
    } finally {
      setIsDumpingHierarchy(false);
    }
  };

  const handleAtxTap = async (x: number, y: number) => {
    const devId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';
    try {
      if (window.api) {
        const res = await window.api.atxTap(devId, x, y);
        addToast({ type: 'info', title: 'Tap Action', message: res.message });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Tap Failed', message: err.message });
    }
  };

  const handleAtxSwipe = async (direction: 'up' | 'down' | 'left' | 'right') => {
    const devId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';
    const swipeCoords: Record<string, [number, number, number, number]> = {
      up: [540, 1600, 540, 600],
      down: [540, 600, 540, 1600],
      left: [900, 1200, 200, 1200],
      right: [200, 1200, 900, 1200],
    };
    const [sx, sy, ex, ey] = swipeCoords[direction];
    try {
      if (window.api) {
        const res = await window.api.atxSwipe(devId, sx, sy, ex, ey, 350);
        addToast({ type: 'info', title: `Swipe ${direction.toUpperCase()}`, message: res.message });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Swipe Failed', message: err.message });
    }
  };

  const handleAtxInputText = async () => {
    if (!manualText.trim()) return;
    const devId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';
    try {
      if (window.api) {
        const res = await window.api.atxInputText(devId, manualText);
        addToast({ type: 'info', title: 'Input Text', message: res.message });
        setManualText('');
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Input Text Failed', message: err.message });
    }
  };

  const handleAtxPressKey = async (key: 'home' | 'back' | 'enter' | 'power') => {
    const devId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';
    try {
      if (window.api) {
        const res = await window.api.atxPressKey(devId, key);
        addToast({ type: 'info', title: `Key ${key.toUpperCase()}`, message: res.message });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Press Key Failed', message: err.message });
    }
  };

  const handleRunAtxPublish = async () => {
    const devId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';
    setIsAutomatingPublish(true);
    setAtxResult(null);

    try {
      if (window.api) {
        addToast({
          type: 'info',
          title: `Starting ATX ${atxPlatform.toUpperCase()} Automation...`,
          message: 'Hands-free automated posting executing on device.',
        });

        const res = await window.api.atxAutomatePublish({
          deviceId: devId,
          platform: atxPlatform,
          videoPath: selectedAssetForTransfer || '/sdcard/Movies/SocialEarningsStudio/video.mp4',
          title: atxTitle,
          caption: atxCaption,
          hashtags: atxHashtags.split(' ').map((h) => h.trim()).filter(Boolean),
        });

        setAtxResult(res);
        if (res.success) {
          addToast({
            type: 'success',
            title: `ATX ${atxPlatform.toUpperCase()} Post Succeeded!`,
            message: res.message,
          });
        } else {
          addToast({
            type: 'error',
            title: `ATX Automation Error`,
            message: res.message,
          });
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Automation Failed', message: err.message });
    } finally {
      setIsAutomatingPublish(false);
    }
  };

  const handleConnectAdb = async (target?: string) => {
    const hostPort = target || customAdbHost;
    setIsConnectingAdb(true);
    try {
      if (window.api) {
        const res = await window.api.connectWirelessAdb(hostPort);
        if (res.success) {
          addToast({ type: 'success', title: 'ADB Connected', message: res.message });
          await fetchDevices();
        } else {
          addToast({ type: 'warn', title: 'Connection Response', message: res.message });
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Connection Failed', message: err.message });
    } finally {
      setIsConnectingAdb(false);
    }
  };

  const handleRestartAdb = async () => {
    setIsRestartingAdb(true);
    try {
      if (window.api) {
        const res = await window.api.restartAdbServer();
        if (res.success) {
          addToast({ type: 'info', title: 'ADB Daemon Reset', message: res.message });
          await fetchDevices();
        } else {
          addToast({ type: 'warn', title: 'Notice', message: res.message });
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Restart Failed', message: err.message });
    } finally {
      setIsRestartingAdb(false);
    }
  };


  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDeviceSelect = (dev: Device) => {
    setSelectedDevice(dev);
    loadDiagnostic(dev.id);
    loadAtxStatus(dev.id);
  };

  const handleInstallSingleApp = async (app: LocalAppPackageInfo) => {
    if (!selectedDevice && !diagnostic?.deviceId) return;
    const targetDevId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';

    setInstallingPackage(app.packageName);
    try {
      if (window.api) {
        addToast({
          type: 'info',
          title: `Installing ${app.appName}...`,
          message: `Pushing and installing ${app.format.toUpperCase()} from apps folder to device`,
        });

        const res: AppInstallResult = await window.api.installAppOnPhone(targetDevId, app.filePath);
        if (res.success) {
          addToast({
            type: 'success',
            title: `${app.appName} Installed!`,
            message: res.message,
          });
          await loadDiagnostic(targetDevId);
        } else {
          addToast({
            type: 'error',
            title: `Installation Failed: ${app.appName}`,
            message: res.message,
          });
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Install Error', message: err.message });
    } finally {
      setInstallingPackage(null);
    }
  };

  const handleBatchInstallAll = async () => {
    if (!selectedDevice && !diagnostic?.deviceId) return;
    const targetDevId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';

    setIsBatchInstalling(true);
    try {
      if (window.api) {
        addToast({
          type: 'info',
          title: 'Batch Installing Apps...',
          message: 'Installing all missing apps from apps/ folder to phone',
        });

        const batchRes = await window.api.installAllAppsOnPhone(targetDevId);
        addToast({
          type: batchRes.failed === 0 ? 'success' : 'warn',
          title: `Batch Installation Finished`,
          message: `Successfully installed ${batchRes.installed} of ${batchRes.total} missing apps.`,
        });
        await loadDiagnostic(targetDevId);
        await fetchDevices();
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Batch Install Failed', message: err.message });
    } finally {
      setIsBatchInstalling(false);
    }
  };

  const handleRequestRoot = async () => {
    if (!selectedDevice && !diagnostic?.deviceId) return;
    const targetDevId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';

    try {
      if (window.api) {
        const res = await window.api.requestPhoneAdbRoot(targetDevId);
        if (res.success) {
          addToast({ type: 'success', title: 'ADB Root Request', message: res.message });
        } else {
          addToast({ type: 'warn', title: 'ADB Root Response', message: res.message });
        }
        await loadDiagnostic(targetDevId);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Root Request Failed', message: err.message });
    }
  };

  const handleOpenSettings = async (settingType: 'accounts' | 'wifi' | 'developer') => {
    if (!selectedDevice && !diagnostic?.deviceId) return;
    const targetDevId = selectedDevice?.id || diagnostic?.deviceId || 'virtual_device';

    try {
      if (window.api) {
        const res = await window.api.openPhoneSettings(targetDevId, settingType);
        if (res.success) {
          addToast({ type: 'info', title: 'Phone Screen Opened', message: res.message });
        } else {
          addToast({ type: 'warn', title: 'Notice', message: res.message });
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Settings Launch Failed', message: err.message });
    }
  };

  const handleStartMirror = async (deviceId: string) => {
    if (window.api) {
      const res = await window.api.startScreenMirror(deviceId);
      if (res.success) {
        addToast({ type: 'success', title: 'Mirror Started', message: res.message });
      } else {
        addToast({ type: 'warn', title: 'Mirror Notice', message: res.message });
      }
    }
  };

  const handleCaptureScreenshot = async (deviceId: string) => {
    if (window.api) {
      setIsCapturingScreenshot(true);
      const res = await window.api.captureScreenshot(deviceId);
      setIsCapturingScreenshot(false);
      if (res.success && res.imageBase64) {
        setScreenshotBase64(res.imageBase64);
      } else {
        addToast({ type: 'error', title: 'Screenshot Failed', message: res.error });
      }
    }
  };

  const handleLaunchApp = async (deviceId: string, packageName: string) => {
    if (window.api) {
      const success = await window.api.launchMobileApp(deviceId, packageName);
      if (success) {
        addToast({ type: 'success', title: 'App Opened on Device' });
      } else {
        addToast({ type: 'warn', title: 'Could not launch app', message: 'Check if app is installed.' });
      }
    }
  };

  const handleExecuteTransfer = async () => {
    if (!selectedDevice || !selectedAssetForTransfer || !window.api) return;

    setIsTransferring(true);
    try {
      const job = await window.api.transferFileToPhone(selectedDevice.id, selectedAssetForTransfer);
      addToast({
        type: 'success',
        title: 'Video Transferred to Phone!',
        message: `Saved to ${job.destinationPath}. MediaScanner indexed.`,
      });
      await fetchDevices();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Transfer Failed', message: err.message });
    } finally {
      setIsTransferring(false);
    }
  };

  const filteredApps = (diagnostic?.appsFolderStatus.apps || []).filter((app) => {
    if (appFilter === 'missing') return !app.isInstalled;
    if (appFilter === 'installed') return app.isInstalled;
    return true;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 select-none overflow-y-auto h-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-xl font-bold text-studio-100 flex items-center gap-2">
            <Smartphone className="text-brand-400" size={22} />
            Android Phone Control & Provisioning Center
          </h2>
          <p className="text-xs text-studio-400 mt-1">
            Dedicated 1-phone setup: root permissions check, phone internet verification, 1-Google-Account isolation, and local apps folder installer.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<Settings size={14} />}
            onClick={() => setIsTroubleshootOpen(true)}
          >
            Troubleshoot & Connect
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={13} className={isLoadingDiagnostic ? 'animate-spin' : ''} />}
            onClick={() => {
              if (selectedDevice) loadDiagnostic(selectedDevice.id);
              else fetchDevices();
            }}
            loading={isLoadingDiagnostic}
          >
            Run Setup Check
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={14} />}
            onClick={() => {
              setWizardStep(1);
              setIsWizardOpen(true);
            }}
          >
            Setup Guide
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />}
            onClick={fetchDevices}
            loading={isScanning}
          >
            Scan Devices
          </Button>
        </div>
      </div>

      {/* Device Not Detected Warning & Quick Actions Banner */}
      {devices.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <div>
              <span className="font-bold text-amber-200 block">No Android Device Detected</span>
              <span className="text-amber-300/80">
                Plug in your phone via USB with USB Debugging enabled, or auto-connect to LDPlayer / local emulator.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              loading={isConnectingAdb}
              onClick={() => handleConnectAdb('127.0.0.1:5555')}
            >
              Connect LDPlayer (5555)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTroubleshootOpen(true)}
            >
              Fix Connection
            </Button>
          </div>
        </div>
      )}

      {/* Device Selector & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-studio-850 rounded-2xl border border-studio-750">
        {/* Device Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-studio-300 flex items-center gap-1.5 shrink-0">
            <Smartphone size={14} className="text-brand-400" />
            Active Device:
          </span>
          <select
            className="bg-studio-900 border border-studio-700 rounded-lg px-2.5 py-1 text-studio-100 text-xs focus:ring-1 focus:ring-brand-500"
            value={selectedDevice?.id || ''}
            onChange={(e) => {
              const found = devices.find((d) => d.id === e.target.value);
              if (found) handleDeviceSelect(found);
            }}
          >
            {devices.length === 0 ? (
              <option value="">📱 Virtual Android Phone (Staging / Offline)</option>
            ) : (
              devices.map((d) => (
                <option key={d.id} value={d.id}>
                  📱 {d.model} ({d.serial}) — {d.status.toUpperCase()}
                </option>
              ))
            )}
          </select>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-studio-900 p-1 rounded-xl border border-studio-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'setup'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-studio-400 hover:text-studio-200'
            }`}
          >
            <ShieldCheck size={13} />
            Phone Setup & Provisioning
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transfer')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'transfer'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-studio-400 hover:text-studio-200'
            }`}
          >
            <Send size={13} />
            Video Push
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('control')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'control'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-studio-400 hover:text-studio-200'
            }`}
          >
            <Monitor size={13} />
            Screen & Launcher
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('atx')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'atx'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-studio-400 hover:text-studio-200'
            }`}
          >
            <Sparkles size={13} className={activeTab === 'atx' ? 'text-white' : 'text-amber-400'} />
            ATX Automation
          </button>
        </div>
      </div>

      {/* TAB 1: PHONE SETUP & PROVISIONING */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* Setup Readiness Progress Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-studio-850 via-studio-800 to-studio-850 border border-studio-700 shadow-subtle space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-studio-400 uppercase tracking-wider">
                    Phone Setup Progress
                  </span>
                  <Badge
                    variant={diagnostic?.overallReadiness.isReady ? 'success' : 'warning'}
                    size="sm"
                    dot
                  >
                    {diagnostic?.overallReadiness.score}% Ready
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-studio-100 mt-0.5">
                  {diagnostic?.overallReadiness.summary || 'Analyzing phone setup status...'}
                </h3>
              </div>

              {diagnostic?.appsFolderStatus.missingCount && diagnostic.appsFolderStatus.missingCount > 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Download size={14} />}
                  loading={isBatchInstalling}
                  onClick={handleBatchInstallAll}
                >
                  Install All Missing Apps ({diagnostic.appsFolderStatus.missingCount})
                </Button>
              ) : (
                <Badge variant="success" size="md">
                  ✓ All Required Apps Installed
                </Badge>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-studio-900 rounded-full h-2.5 overflow-hidden border border-studio-750">
              <div
                className={`h-full transition-all duration-500 ${
                  (diagnostic?.overallReadiness.score || 0) >= 90
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                    : 'bg-gradient-to-r from-amber-500 to-brand-500'
                }`}
                style={{ width: `${diagnostic?.overallReadiness.score || 0}%` }}
              />
            </div>
          </div>

          {/* The 4 Setup Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pillar 1: Root Phone Status */}
            <Card
              title="1. Root Phone Status"
              subtitle="superuser (su) binary & privileges"
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-studio-400">Access Status:</span>
                  <Badge
                    variant={diagnostic?.rootStatus.isRooted ? 'success' : 'neutral'}
                    size="sm"
                    dot
                  >
                    {diagnostic?.rootStatus.isRooted ? 'Root Active' : 'Unrooted'}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-lg bg-studio-900 border border-studio-800 text-[11px] text-studio-300">
                  {diagnostic?.rootStatus.details || 'Checking root access on phone...'}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-[11px]"
                    icon={<Terminal size={12} />}
                    onClick={handleRequestRoot}
                  >
                    Restart ADB as Root
                  </Button>
                </div>
              </div>
            </Card>

            {/* Pillar 2: Phone Internet Connectivity */}
            <Card
              title="2. Phone Internet"
              subtitle="Network & ExpressVPN check"
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-studio-400">Connection:</span>
                  <Badge
                    variant={diagnostic?.internetStatus.hasInternet ? 'success' : 'danger'}
                    size="sm"
                    dot
                  >
                    {diagnostic?.internetStatus.hasInternet ? 'Online' : 'Offline'}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-lg bg-studio-900 border border-studio-800 text-[11px] text-studio-300">
                  {diagnostic?.internetStatus.details || 'Checking phone network...'}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-[11px]"
                    icon={<Wifi size={12} />}
                    onClick={() => handleOpenSettings('wifi')}
                  >
                    Wi-Fi Settings
                  </Button>
                </div>
              </div>
            </Card>

            {/* Pillar 3: 1 Google Account Policy */}
            <Card
              title="3. 1 Google Account Rule"
              subtitle="Device isolation & posting security"
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-studio-400">Account Policy:</span>
                  <Badge
                    variant={
                      diagnostic?.googleAccountStatus.isOptimal
                        ? 'success'
                        : diagnostic?.googleAccountStatus.status === 'missing'
                        ? 'danger'
                        : 'warning'
                    }
                    size="sm"
                    dot
                  >
                    {diagnostic?.googleAccountStatus.isOptimal
                      ? '1 Account (Optimal)'
                      : diagnostic?.googleAccountStatus.status === 'missing'
                      ? '0 Accounts'
                      : `${diagnostic?.googleAccountStatus.count} Accounts`}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-lg bg-studio-900 border border-studio-800 text-[11px] text-studio-300 break-all">
                  {diagnostic?.googleAccountStatus.primaryAccount ? (
                    <span className="font-semibold text-emerald-300">
                      ✉️ {diagnostic.googleAccountStatus.primaryAccount}
                    </span>
                  ) : (
                    <span>{diagnostic?.googleAccountStatus.message || 'Checking Google accounts...'}</span>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-[11px]"
                  icon={<UserCheck size={12} />}
                  onClick={() => handleOpenSettings('accounts')}
                >
                  {diagnostic?.googleAccountStatus.count === 0
                    ? 'Add Google Account on Phone'
                    : 'Manage Phone Accounts'}
                </Button>
              </div>
            </Card>

            {/* Pillar 4: Studio Apps Status */}
            <Card
              title="4. Studio Apps Folder"
              subtitle="Local APK & XAPK packages"
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-studio-400">Installed Apps:</span>
                  <Badge
                    variant={
                      diagnostic?.appsFolderStatus.missingCount === 0 ? 'success' : 'warning'
                    }
                    size="sm"
                  >
                    {diagnostic?.appsFolderStatus.installedCount || 0} /{' '}
                    {diagnostic?.appsFolderStatus.totalAppsInFolder || 0}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-lg bg-studio-900 border border-studio-800 text-[11px] text-studio-300">
                  {diagnostic?.appsFolderStatus.missingCount === 0
                    ? 'All APK packages from apps/ folder installed.'
                    : `${diagnostic?.appsFolderStatus.missingCount} package(s) ready to install from apps/`}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full text-[11px]"
                  icon={<Download size={12} />}
                  loading={isBatchInstalling}
                  disabled={!diagnostic?.appsFolderStatus.missingCount}
                  onClick={handleBatchInstallAll}
                >
                  Install All Missing
                </Button>
              </div>
            </Card>
          </div>

          {/* Local Apps Folder Manager */}
          <Card
            title="Local 'apps' Folder Packages"
            subtitle="APKs and XAPKs detected in apps/ folder ready for 1-click phone installation"
            action={
              <div className="flex items-center gap-2">
                <div className="flex bg-studio-900 p-0.5 rounded-lg border border-studio-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAppFilter('all')}
                    className={`px-2 py-0.5 rounded ${
                      appFilter === 'all' ? 'bg-studio-750 text-white' : 'text-studio-400'
                    }`}
                  >
                    All ({diagnostic?.appsFolderStatus.totalAppsInFolder || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppFilter('missing')}
                    className={`px-2 py-0.5 rounded ${
                      appFilter === 'missing' ? 'bg-studio-750 text-white' : 'text-studio-400'
                    }`}
                  >
                    Missing ({diagnostic?.appsFolderStatus.missingCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppFilter('installed')}
                    className={`px-2 py-0.5 rounded ${
                      appFilter === 'installed' ? 'bg-studio-750 text-white' : 'text-studio-400'
                    }`}
                  >
                    Installed ({diagnostic?.appsFolderStatus.installedCount || 0})
                  </button>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Download size={13} />}
                  loading={isBatchInstalling}
                  disabled={!diagnostic?.appsFolderStatus.missingCount}
                  onClick={handleBatchInstallAll}
                >
                  Install Missing
                </Button>
              </div>
            }
          >
            {filteredApps.length === 0 ? (
              <div className="text-center py-8 text-xs text-studio-500">
                No apps matching the filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {filteredApps.map((app) => {
                  const isCurrentInstalling = installingPackage === app.packageName;

                  return (
                    <div
                      key={app.fileName}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                        app.isInstalled
                          ? 'bg-studio-900/90 border-emerald-500/20 shadow-subtle'
                          : 'bg-studio-850/80 border-studio-750 hover:border-studio-650'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-studio-100 text-xs truncate max-w-[150px]">
                            {app.appName}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold ${
                              app.format === 'xapk'
                                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50'
                                : 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50'
                            }`}
                          >
                            {app.format}
                          </span>
                        </div>

                        <span className="text-[10px] text-studio-400 font-mono block truncate">
                          {app.packageName}
                        </span>

                        <div className="flex items-center justify-between text-[10px] text-studio-400 mt-2">
                          <span className="text-studio-400 font-mono">
                            {(app.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                          </span>
                          {app.isInstalled ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Check size={11} /> Installed
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <Download size={11} /> Not Installed
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-studio-800">
                        {app.isInstalled ? (
                          <div className="flex gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex-1 text-[11px]"
                              icon={<Play size={11} />}
                              onClick={() => {
                                if (selectedDevice) handleLaunchApp(selectedDevice.id, app.packageName);
                              }}
                            >
                              Launch
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reinstall APK"
                              icon={<RefreshCw size={11} className={isCurrentInstalling ? 'animate-spin' : ''} />}
                              loading={isCurrentInstalling}
                              onClick={() => handleInstallSingleApp(app)}
                            />
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-[11px]"
                            icon={<Download size={12} />}
                            loading={isCurrentInstalling}
                            onClick={() => handleInstallSingleApp(app)}
                          >
                            Install to Phone
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: VIDEO PUSH & TRANSFER */}
      {activeTab === 'transfer' && (
        <div className="space-y-6">
          <Card
            title="Push Story Video to Android Phone"
            subtitle="Direct transfer to /sdcard/Movies/SocialEarningsStudio with MediaScanner gallery indexing"
          >
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-studio-300 mb-1.5">
                  Select Video from Library
                </label>
                <select
                  className="w-full bg-studio-900 border border-studio-750 rounded-lg p-2.5 text-studio-100 text-xs"
                  value={selectedAssetForTransfer}
                  onChange={(e) => setSelectedAssetForTransfer(e.target.value)}
                >
                  {libraryAssets.length === 0 && <option value="">No videos in library yet</option>}
                  {libraryAssets.map((a) => (
                    <option key={a.id} value={a.filePath}>
                      {a.title} ({a.aspectRatio}, {(a.fileSize / (1024 * 1024)).toFixed(1)} MB) - {a.folder}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-studio-900 rounded-lg border border-studio-800 text-[11px]">
                <div>
                  <span className="text-studio-400 block mb-0.5">Target Device:</span>
                  <span className="font-semibold text-studio-200">
                    {selectedDevice?.model || 'Virtual Staging Phone'} ({selectedDevice?.serial || 'virtual'})
                  </span>
                </div>
                <div>
                  <span className="text-studio-400 block mb-0.5">Gallery Destination:</span>
                  <span className="font-mono text-cyan-400">/sdcard/Movies/SocialEarningsStudio/</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full"
                loading={isTransferring}
                icon={<Send size={15} />}
                onClick={handleExecuteTransfer}
              >
                Push Video File to Phone
              </Button>
            </div>
          </Card>

          {/* Transfer History */}
          <Card title="Transfer History Log" subtitle="Tracked PC-to-Android file transfers">
            {transferJobs.length === 0 ? (
              <div className="text-center py-6 text-xs text-studio-500">
                No files transferred yet.
              </div>
            ) : (
              <div className="space-y-2">
                {transferJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-lg bg-studio-900 border border-studio-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono text-studio-200 block truncate max-w-sm">
                        {job.destinationPath}
                      </span>
                      <span className="text-[10px] text-studio-500">
                        {(job.fileSize / (1024 * 1024)).toFixed(1)} MB • {new Date(job.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <Badge variant={job.status === 'completed' ? 'success' : 'danger'} size="sm">
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: REMOTE SCREEN & APP LAUNCHER */}
      {activeTab === 'control' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Remote Screen Mirror & Capture */}
            <Card title="Remote Screen Viewing" subtitle="Control and mirror phone screen in real time">
              <div className="space-y-4 text-xs">
                <p className="text-studio-400">
                  Open an interactive live window of your physical phone using scrcpy or capture high-resolution screenshots.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<Monitor size={15} />}
                    onClick={() => {
                      if (selectedDevice) handleStartMirror(selectedDevice.id);
                    }}
                  >
                    Start Screen Mirror
                  </Button>

                  <Button
                    variant="outline"
                    size="md"
                    icon={<Camera size={15} />}
                    loading={isCapturingScreenshot}
                    onClick={() => {
                      if (selectedDevice) handleCaptureScreenshot(selectedDevice.id);
                    }}
                  >
                    Capture Screenshot
                  </Button>
                </div>
              </div>
            </Card>

            {/* Hardware Diagnostics */}
            <Card title="Hardware Status" subtitle="Battery, storage & Android OS">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-studio-900 rounded-lg border border-studio-800">
                  <span className="text-studio-400 flex items-center gap-1.5">
                    <Battery size={14} className="text-emerald-400" /> Battery Level
                  </span>
                  <span className="font-mono font-semibold text-studio-200">
                    {selectedDevice?.batteryLevel || 85}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-studio-900 rounded-lg border border-studio-800">
                  <span className="text-studio-400 flex items-center gap-1.5">
                    <HardDrive size={14} className="text-cyan-400" /> Available Storage
                  </span>
                  <span className="font-mono font-semibold text-studio-200">
                    {Math.round((selectedDevice?.availableStorageMb || 16384) / 1024)} GB Free
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-studio-900 rounded-lg border border-studio-800">
                  <span className="text-studio-400 flex items-center gap-1.5">
                    <Smartphone size={14} className="text-purple-400" /> Android Platform
                  </span>
                  <span className="font-mono font-semibold text-studio-200">
                    {selectedDevice?.androidVersion || 'Android 14'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Social Apps Launcher */}
          <Card
            title="Installed Applications Launcher"
            subtitle="One-click remote launchpad to open creation screens on your device"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {(diagnostic?.appsFolderStatus.apps || []).map((app) => (
                <div
                  key={app.packageName}
                  className="p-3 bg-studio-900 rounded-xl border border-studio-800 flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-studio-200 truncate">{app.appName}</span>
                      {app.isInstalled ? (
                        <Check size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle size={14} className="text-studio-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-studio-500 block truncate font-mono">
                      {app.packageName}
                    </span>
                  </div>

                  {app.isInstalled ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Play size={12} />}
                      onClick={() => {
                        if (selectedDevice) handleLaunchApp(selectedDevice.id, app.packageName);
                      }}
                    >
                      Launch
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Download size={12} />}
                      onClick={() => handleInstallSingleApp(app)}
                    >
                      Install APK
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: ATX ANDROID AUTOMATION */}
      {activeTab === 'atx' && (
        <div className="space-y-6">
          {/* ATX Engine Status Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-studio-850 via-studio-800 to-studio-850 border border-studio-700 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-studio-100 text-sm">
                    ATX (Android Test eXtension) Automation Engine
                  </h3>
                  <Badge
                    variant={atxStatus?.isRunning ? 'success' : 'warning'}
                    size="sm"
                    dot
                  >
                    {atxStatus?.mode === 'atx_rpc'
                      ? 'JSON-RPC Mode (Port 7912)'
                      : atxStatus?.mode === 'adb_bridge'
                      ? 'UIAutomator2 ADB Bridge'
                      : 'Simulated Engine'}
                  </Badge>
                </div>
                <p className="text-xs text-studio-400 mt-0.5">
                  {atxStatus?.details || 'Probing ATX daemon and UIAutomator service on phone...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={13} className={isLoadingAtx ? 'animate-spin' : ''} />}
                loading={isLoadingAtx}
                onClick={handleInitAtx}
              >
                Reconnect ATX
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Terminal size={13} />}
                loading={isDumpingHierarchy}
                onClick={handleDumpHierarchy}
              >
                Inspect Screen UI
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Hands-Free Social Media Automated Posting */}
            <div className="lg:col-span-7 space-y-6">
              <Card
                title="Hands-Free Social Media Automated Posting"
                subtitle="ATX automatically opens the app, selects video, inputs title & hashtags, and taps post"
              >
                <div className="space-y-4 text-xs">
                  {/* Platform Pills */}
                  <div>
                    <label className="block text-xs font-semibold text-studio-300 mb-1.5">
                      Target Social Platform
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAtxPlatform('youtube')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${
                          atxPlatform === 'youtube'
                            ? 'bg-red-500/10 border-red-500/50 text-red-300'
                            : 'bg-studio-900 border-studio-800 text-studio-400 hover:text-studio-200'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        YouTube Shorts
                      </button>

                      <button
                        type="button"
                        onClick={() => setAtxPlatform('tiktok')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${
                          atxPlatform === 'tiktok'
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                            : 'bg-studio-900 border-studio-800 text-studio-400 hover:text-studio-200'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        TikTok
                      </button>

                      <button
                        type="button"
                        onClick={() => setAtxPlatform('facebook')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${
                          atxPlatform === 'facebook'
                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-300'
                            : 'bg-studio-900 border-studio-800 text-studio-400 hover:text-studio-200'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Facebook Reels
                      </button>
                    </div>
                  </div>

                  {/* Video Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-studio-300 mb-1.5">
                      Video to Post
                    </label>
                    <select
                      className="w-full bg-studio-900 border border-studio-750 rounded-lg p-2.5 text-studio-100 text-xs focus:ring-1 focus:ring-brand-500"
                      value={selectedAssetForTransfer}
                      onChange={(e) => setSelectedAssetForTransfer(e.target.value)}
                    >
                      {libraryAssets.length === 0 && <option value="">No videos in library yet</option>}
                      {libraryAssets.map((asset) => (
                        <option key={asset.id} value={asset.filePath}>
                          🎬 {asset.fileName} ({asset.width}x{asset.height} • {asset.durationSeconds}s)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title & Caption */}
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-studio-300 mb-1">
                        Post Title
                      </label>
                      <input
                        type="text"
                        className="w-full bg-studio-900 border border-studio-750 rounded-lg p-2.5 text-studio-100 text-xs focus:ring-1 focus:ring-brand-500"
                        value={atxTitle}
                        onChange={(e) => setAtxTitle(e.target.value)}
                        placeholder="Video Title..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-studio-300 mb-1">
                        Caption / Description
                      </label>
                      <textarea
                        rows={2}
                        className="w-full bg-studio-900 border border-studio-750 rounded-lg p-2 text-studio-100 text-xs focus:ring-1 focus:ring-brand-500"
                        value={atxCaption}
                        onChange={(e) => setAtxCaption(e.target.value)}
                        placeholder="Description..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-studio-300 mb-1">
                        Hashtags
                      </label>
                      <input
                        type="text"
                        className="w-full bg-studio-900 border border-studio-750 rounded-lg p-2 text-studio-100 text-xs focus:ring-1 focus:ring-brand-500"
                        value={atxHashtags}
                        onChange={(e) => setAtxHashtags(e.target.value)}
                        placeholder="#shorts #viral #story"
                      />
                    </div>
                  </div>

                  {/* Submit Automation Button */}
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      icon={<Sparkles size={16} />}
                      loading={isAutomatingPublish}
                      disabled={isAutomatingPublish}
                      onClick={handleRunAtxPublish}
                    >
                      {isAutomatingPublish
                        ? `Executing ATX ${atxPlatform.toUpperCase()} Automation...`
                        : `Execute Hands-Free ${atxPlatform.toUpperCase()} Post via ATX`}
                    </Button>
                  </div>

                  {/* Real-time Execution Steps Log */}
                  {atxResult && (
                    <div className="p-3.5 bg-studio-900 rounded-xl border border-studio-800 space-y-2.5 mt-3">
                      <div className="flex items-center justify-between border-b border-studio-800 pb-2">
                        <span className="font-semibold text-studio-200 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          ATX Automation Sequence ({atxResult.platform.toUpperCase()})
                        </span>
                        <Badge variant={atxResult.success ? 'success' : 'danger'} size="sm">
                          {atxResult.success ? 'Completed' : 'Failed'}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {atxResult.steps.map((st, idx) => (
                          <div key={idx} className="flex items-start justify-between text-[11px] py-1 border-b border-studio-850/50">
                            <span className="font-medium text-studio-300">{st.step}</span>
                            <span className="text-studio-500 font-mono text-[10px]">{st.timestamp}</span>
                          </div>
                        ))}
                      </div>

                      {atxResult.postUrl && (
                        <div className="pt-2 text-[11px] text-brand-300 font-mono truncate">
                          Post Link: {atxResult.postUrl}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right 5 Columns: Screen UI Inspector & Quick Touchpad */}
            <div className="lg:col-span-5 space-y-6">
              {/* Remote Touchpad & Input Controller */}
              <Card
                title="Remote Gesture Touchpad"
                subtitle="Direct hardware keys, directional swipes, and coordinate taps"
              >
                <div className="space-y-4 text-xs">
                  {/* Directional Swipes */}
                  <div>
                    <span className="text-studio-400 font-semibold block mb-2">Directional Swipe</span>
                    <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
                      <div />
                      <Button variant="secondary" size="sm" icon={<ArrowUp size={14} />} onClick={() => handleAtxSwipe('up')} />
                      <div />
                      <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => handleAtxSwipe('left')} />
                      <Button variant="outline" size="sm" onClick={() => handleAtxTap(manualTapX, manualTapY)}>Tap</Button>
                      <Button variant="secondary" size="sm" icon={<ArrowRight size={14} />} onClick={() => handleAtxSwipe('right')} />
                      <div />
                      <Button variant="secondary" size="sm" icon={<ArrowDown size={14} />} onClick={() => handleAtxSwipe('down')} />
                      <div />
                    </div>
                  </div>

                  {/* Hardware Keys */}
                  <div className="pt-2 border-t border-studio-800">
                    <span className="text-studio-400 font-semibold block mb-2">Hardware Keys</span>
                    <div className="grid grid-cols-4 gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleAtxPressKey('back')}>
                        Back
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleAtxPressKey('home')}>
                        Home
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleAtxPressKey('enter')}>
                        Enter
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleAtxPressKey('power')}>
                        Wake
                      </Button>
                    </div>
                  </div>

                  {/* Text Injector */}
                  <div className="pt-2 border-t border-studio-800">
                    <span className="text-studio-400 font-semibold block mb-1.5">Inject Text into Active Input</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type text to send to phone..."
                        className="flex-1 bg-studio-900 border border-studio-750 rounded-lg px-2.5 py-1.5 text-studio-100 text-xs focus:ring-1 focus:ring-brand-500"
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAtxInputText();
                        }}
                      />
                      <Button variant="secondary" size="sm" onClick={handleAtxInputText}>
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Detected UI Elements Hierarchy */}
              <Card
                title="Detected UI Elements"
                subtitle={`${atxHierarchy.length} UI elements parsed from window hierarchy`}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RefreshCw size={12} className={isDumpingHierarchy ? 'animate-spin' : ''} />}
                    loading={isDumpingHierarchy}
                    onClick={handleDumpHierarchy}
                  >
                    Refresh
                  </Button>
                }
              >
                {atxHierarchy.length === 0 ? (
                  <div className="text-center py-6 text-xs text-studio-500">
                    Click "Inspect Screen UI" to parse all buttons and inputs on the active phone screen.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {atxHierarchy.map((el, i) => (
                      <div
                        key={i}
                        onClick={() => handleAtxTap(el.center.x, el.center.y)}
                        className="p-2 bg-studio-900 hover:bg-studio-800 border border-studio-800 hover:border-brand-500/50 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs group"
                      >
                        <div className="truncate mr-2">
                          <span className="font-semibold text-studio-200 block truncate">
                            {el.text || el.description || el.resourceId || el.className}
                          </span>
                          <span className="text-[10px] text-studio-500 font-mono block truncate">
                            {el.resourceId || el.className}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-studio-400 bg-studio-800 px-1.5 py-0.5 rounded group-hover:bg-brand-500 group-hover:text-white transition-colors shrink-0">
                          ({el.center.x}, {el.center.y})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Viewer Modal */}
      {screenshotBase64 && (
        <Modal
          isOpen={Boolean(screenshotBase64)}
          onClose={() => setScreenshotBase64(null)}
          title="Device Screenshot Capture"
          subtitle="Real-time capture via ADB screencap"
          maxWidth="sm"
        >
          <div className="rounded-xl overflow-hidden border border-studio-800 bg-black max-h-[70vh] flex items-center justify-center">
            <img src={screenshotBase64} alt="Device Screenshot" className="max-h-[65vh] w-auto mx-auto" />
          </div>
        </Modal>
      )}

      {/* Setup Guide Modal */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title="Phone Setup & Provisioning Guide"
        subtitle={`Step ${wizardStep} of 4: Android Device Configuration`}
        maxWidth="lg"
        footer={
          <div className="flex justify-between w-full">
            <Button
              variant="secondary"
              size="sm"
              disabled={wizardStep === 1}
              onClick={() => setWizardStep((s) => s - 1)}
            >
              Previous Step
            </Button>

            {wizardStep < 4 ? (
              <Button variant="primary" size="sm" onClick={() => setWizardStep((s) => s + 1)}>
                Next Step
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsWizardOpen(false);
                  fetchDevices();
                }}
              >
                Finish & Scan Phone
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {wizardStep === 1 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-studio-100 text-sm">1. Enable USB Debugging</h4>
              <p className="text-studio-300 leading-relaxed">
                On your physical Android phone:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-studio-400 bg-studio-900 p-4 rounded-xl border border-studio-800">
                <li>Open phone <strong>Settings → About phone</strong>.</li>
                <li>Tap <strong>Build number</strong> 7 times until you see "You are now a developer!".</li>
                <li>Go back to <strong>Settings → System → Developer options</strong>.</li>
                <li>Toggle on <strong>USB debugging</strong>.</li>
              </ol>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-studio-100 text-sm">2. Root Access & Permissions</h4>
              <p className="text-studio-300 leading-relaxed">
                Ensure phone has root / su access (Magisk or KernelSU) or ADB root enabled.
              </p>
              <div className="p-4 bg-studio-900 rounded-xl border border-studio-800 space-y-2">
                <p className="text-amber-400 font-medium">Root Access Recommendation:</p>
                <p className="text-studio-400">
                  Root allows the studio to automate app permissions, background installations, and proxy routing through ExpressVPN.
                </p>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-studio-100 text-sm">3. Exactly 1 Google Account Policy</h4>
              <p className="text-studio-300 leading-relaxed">
                Configure exactly one Google Account on this phone.
              </p>
              <div className="p-3 bg-studio-900 rounded-lg border border-studio-800 text-studio-400 space-y-1">
                <span className="text-emerald-400 font-semibold block">Why 1 Google Account?</span>
                <p>
                  Binding 1 Google Account per device ensures algorithm isolation, prevents channel mixups, and protects your social publishing accounts from cross-linking.
                </p>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-studio-100 text-sm">4. Local 'apps' Folder Installation</h4>
              <p className="text-studio-300 leading-relaxed">
                The studio automatically reads the <strong>apps/</strong> folder and offers 1-click batch installation of all required APKs (YouTube, TikTok, Facebook, ExpressVPN, etc.)
              </p>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
                Click <strong>"Finish & Scan Phone"</strong> to begin managing your device.
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Connection Troubleshooting Modal */}
      <Modal
        isOpen={isTroubleshootOpen}
        onClose={() => setIsTroubleshootOpen(false)}
        title="Device Connection & ADB Troubleshooting"
        subtitle="Quick tools to connect physical phones or local Android emulators (LDPlayer, BlueStacks, Nox)"
        maxWidth="lg"
      >
        <div className="space-y-5 text-xs">
          {/* Quick Connect Actions */}
          <div className="p-4 rounded-xl bg-studio-900 border border-studio-800 space-y-3">
            <h4 className="font-bold text-studio-100 flex items-center gap-2">
              <Terminal size={14} className="text-brand-400" />
              1-Click Emulator & Wireless Connect
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="sm"
                loading={isConnectingAdb}
                onClick={() => handleConnectAdb('127.0.0.1:5555')}
              >
                Connect LDPlayer (127.0.0.1:5555)
              </Button>

              <Button
                variant="secondary"
                size="sm"
                loading={isConnectingAdb}
                onClick={() => handleConnectAdb('127.0.0.1:62001')}
              >
                Connect Nox / MEmu (62001)
              </Button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Custom IP:Port (e.g. 192.168.1.50:5555)"
                value={customAdbHost}
                onChange={(e) => setCustomAdbHost(e.target.value)}
                className="flex-1 bg-studio-850 border border-studio-750 rounded-lg px-3 py-1.5 text-xs text-studio-100 focus:ring-1 focus:ring-brand-500"
              />
              <Button
                variant="primary"
                size="sm"
                loading={isConnectingAdb}
                onClick={() => handleConnectAdb(customAdbHost)}
              >
                Connect
              </Button>
            </div>

            <div className="pt-2 border-t border-studio-800 flex items-center justify-between">
              <span className="text-studio-400 text-[11px]">ADB daemon frozen or unresponsive?</span>
              <Button
                variant="outline"
                size="sm"
                loading={isRestartingAdb}
                onClick={handleRestartAdb}
              >
                Restart ADB Server
              </Button>
            </div>
          </div>

          {/* Physical Phone Checklist */}
          <div className="space-y-3">
            <h4 className="font-bold text-studio-100 flex items-center gap-2">
              <Smartphone size={14} className="text-emerald-400" />
              Physical Phone USB Checklist
            </h4>
            <div className="space-y-2 text-studio-300">
              <div className="p-3 bg-studio-900 rounded-lg border border-studio-800 flex items-start gap-2.5">
                <span className="font-bold text-brand-400">1.</span>
                <div>
                  <strong className="text-studio-100 block">Use a High-Quality Data Cable</strong>
                  <span className="text-studio-400 text-[11px]">
                    Many USB cables only supply power and cannot transfer data. Make sure your computer plays a connection chime when plugging it in.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-studio-900 rounded-lg border border-studio-800 flex items-start gap-2.5">
                <span className="font-bold text-brand-400">2.</span>
                <div>
                  <strong className="text-studio-100 block">Set Phone USB Mode to "File Transfer (MTP)"</strong>
                  <span className="text-studio-400 text-[11px]">
                    Swipe down notifications on your phone screen, tap <em>"Charging this device via USB"</em>, and switch it to <strong>File Transfer / MTP</strong>.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-studio-900 rounded-lg border border-studio-800 flex items-start gap-2.5">
                <span className="font-bold text-brand-400">3.</span>
                <div>
                  <strong className="text-studio-100 block">Enable USB Debugging in Developer Options</strong>
                  <span className="text-studio-400 text-[11px]">
                    Go to <strong>Settings → About phone → Tap 'Build number' 7 times</strong>, then go to <strong>Developer options</strong> and toggle ON <strong>USB Debugging</strong>.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-studio-900 rounded-lg border border-studio-800 flex items-start gap-2.5">
                <span className="font-bold text-brand-400">4.</span>
                <div>
                  <strong className="text-studio-100 block">Authorize RSA Fingerprint on Phone Screen</strong>
                  <span className="text-studio-400 text-[11px]">
                    Look at your phone screen for the prompt: <em>"Allow USB debugging from this computer?"</em>. Check <strong>Always allow</strong> and tap <strong>OK</strong>.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-studio-900 rounded-lg border border-studio-800 flex items-start gap-2.5">
                <span className="font-bold text-brand-400">5.</span>
                <div>
                  <strong className="text-studio-100 block">If Using LDPlayer Emulator</strong>
                  <span className="text-studio-400 text-[11px]">
                    In LDPlayer, open <strong>Settings (Gear icon) → Other Settings → Set "ADB Debugging" to "Open Local Connection"</strong>, then restart LDPlayer.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
