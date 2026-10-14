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
} from 'lucide-react';
import {
  Device,
  MediaAsset,
  TransferJob,
  PhoneSetupDiagnostic,
  LocalAppPackageInfo,
  AppInstallResult,
} from '../../../shared/types';

export const PhoneControlView: React.FC = () => {
  const { addToast } = useAppStore();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [transferJobs, setTransferJobs] = useState<TransferJob[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<MediaAsset[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'setup' | 'transfer' | 'control'>('setup');

  // Phone Setup & Diagnostics State
  const [diagnostic, setDiagnostic] = useState<PhoneSetupDiagnostic | null>(null);
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(false);
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);
  const [isBatchInstalling, setIsBatchInstalling] = useState(false);
  const [appFilter, setAppFilter] = useState<'all' | 'missing' | 'installed'>('all');

  // Modals & Wizards
  const [isWizardOpen, setIsWizardOpen] = useState(false);
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
    } catch (err: any) {
      addToast({ type: 'warn', title: 'Diagnostic check notice', message: err.message });
    } finally {
      setIsLoadingDiagnostic(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDeviceSelect = (dev: Device) => {
    setSelectedDevice(dev);
    loadDiagnostic(dev.id);
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
    </div>
  );
};
