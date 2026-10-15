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
} from 'lucide-react';
import {
  Device,
  PhoneSetupDiagnostic,
  LocalAppPackageInfo,
  AppInstallResult,
  PhoneAppInfo,
} from '../../../shared/types';

export const PhoneControlView: React.FC = () => {
  const { addToast } = useAppStore();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Phone Setup & Diagnostics State
  const [diagnostic, setDiagnostic] = useState<PhoneSetupDiagnostic | null>(null);
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(false);
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);
  const [isBatchInstalling, setIsBatchInstalling] = useState(false);
  const [appFilter, setAppFilter] = useState<'all' | 'missing' | 'installed'>('all');

  // Modals & Wizards
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTroubleshootOpen, setIsTroubleshootOpen] = useState(false);
  const [customAdbHost, setCustomAdbHost] = useState('127.0.0.1:5555');
  const [isConnectingAdb, setIsConnectingAdb] = useState(false);
  const [isRestartingAdb, setIsRestartingAdb] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Mobile Publishing Suite: Social Media Apps & Screen Mirroring
  const [phoneSocialApps, setPhoneSocialApps] = useState<PhoneAppInfo[]>([]);
  const [isLoadingSocialApps, setIsLoadingSocialApps] = useState(false);
  const [isMirroring, setIsMirroring] = useState(false);

  const fetchSocialApps = async (deviceId?: string) => {
    const target = deviceId || selectedDevice?.id;
    if (!window.api?.getPhoneAppStatus) return;
    setIsLoadingSocialApps(true);
    try {
      const apps = await window.api.getPhoneAppStatus(target);
      setPhoneSocialApps(apps);
    } catch (err: any) {
      console.warn('Failed to load phone social apps:', err);
    } finally {
      setIsLoadingSocialApps(false);
    }
  };

  const handleOpenPlayStore = async (packageName: string) => {
    const targetDevId = selectedDevice?.id || 'virtual_device';
    if (!window.api?.openPlayStoreApp) return;
    try {
      const res = await window.api.openPlayStoreApp(targetDevId, packageName);
      if (res.success) {
        addToast({ type: 'info', title: 'Play Store Opened', message: res.message });
      } else {
        addToast({ type: 'warn', title: 'Play Store Notice', message: res.message });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Play Store Failed', message: err.message });
    }
  };

  const handleVerifyApp = async (packageName: string) => {
    const targetDevId = selectedDevice?.id || 'virtual_device';
    if (!window.api?.verifyAppInstalled) return;
    try {
      const res = await window.api.verifyAppInstalled(targetDevId, packageName);
      if (res.isInstalled) {
        addToast({ type: 'success', title: 'App Verified', message: `${packageName} is installed.` });
      } else {
        addToast({ type: 'warn', title: 'Not Installed', message: `${packageName} was not detected.` });
      }
      await fetchSocialApps(targetDevId);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Verification Error', message: err.message });
    }
  };

  const handleLaunchScrcpy = async () => {
    const targetDevId = selectedDevice?.id || 'virtual_device';
    if (!window.api?.launchScrcpy) return;
    setIsMirroring(true);
    try {
      const res = await window.api.launchScrcpy(targetDevId);
      if (res.success) {
        addToast({ type: 'success', title: 'Screen Mirror Launched', message: res.message });
      } else {
        addToast({ type: 'warn', title: 'Screen Mirror Notice', message: res.message });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Mirror Error', message: err.message });
    } finally {
      setIsMirroring(false);
    }
  };

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

        if (activeDev) {
          await loadDiagnostic(activeDev.id);
          await fetchSocialApps(activeDev.id);
        } else if (dList.length > 0) {
          await loadDiagnostic(dList[0].id);
          await fetchSocialApps(dList[0].id);
        } else {
          // Virtual device diagnostic
          await loadDiagnostic('virtual_device');
          await fetchSocialApps('virtual_device');
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
    fetchSocialApps(dev.id);
  };

  const handleOpenConfigModal = (dev: Device) => {
    setSelectedDevice(dev);
    loadDiagnostic(dev.id);
    setIsConfigModalOpen(true);
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

  const filteredApps = (diagnostic?.appsFolderStatus.apps || []).filter((app) => {
    if (appFilter === 'missing') return !app.isInstalled;
    if (appFilter === 'installed') return app.isInstalled;
    return true;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 select-none overflow-y-auto h-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[rgba(91,145,255,0.18)]">
        <div>
          <h2 className="text-xl font-bold text-studio-100 flex items-center gap-2 tracking-tight">
            <Smartphone className="text-cyan-400 drop-shadow-[0_0_10px_#00C8FF]" size={22} />
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
            icon={<Settings size={14} className="text-cyan-400" />}
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
            icon={<HelpCircle size={14} className="text-cyan-400" />}
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
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[0_4px_24px_rgba(255,190,85,0.12)]">
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

      {/* Connected Devices Table */}
      <Card
        title="Connected Android Devices"
        subtitle="Device fleet status, connectivity details, and configuration controls"
        headerAction={
          <div className="flex items-center gap-2">
            <Badge variant={devices.length > 0 ? 'success' : 'neutral'} size="sm">
              {devices.length} {devices.length === 1 ? 'Device' : 'Devices'} Connected
            </Badge>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-6 -my-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-studio-750 bg-studio-900/60 text-studio-400 uppercase text-[11px] font-semibold tracking-wider">
                <th className="py-3 px-4 w-14 text-center">No</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">IP</th>
                <th className="py-3 px-4 text-right">btn config</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-800">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-studio-400">
                    <Smartphone size={36} className="mx-auto mb-3 text-studio-600 stroke-[1.5]" />
                    <p className="font-semibold text-studio-200 text-sm">No Android Device Detected</p>
                    <p className="text-xs text-studio-400 mt-1 max-w-md mx-auto">
                      Connect your phone via USB with USB debugging enabled, or click below to connect an emulator.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2.5">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={isConnectingAdb}
                        onClick={() => handleConnectAdb('127.0.0.1:5555')}
                      >
                        Connect LDPlayer (127.0.0.1:5555)
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsTroubleshootOpen(true)}
                      >
                        Troubleshoot & Connect
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const virtualDev: Device = {
                            id: 'virtual_device',
                            serial: 'virtual_staging',
                            model: 'Virtual Android Phone (Staging)',
                            androidVersion: '13',
                            status: 'offline',
                            lastSeenAt: new Date().toISOString(),
                            isRooted: true,
                            ipAddress: '127.0.0.1',
                          };
                          handleOpenConfigModal(virtualDev);
                        }}
                      >
                        Config Virtual Device
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                devices.map((device, idx) => {
                  const displayIp =
                    device.ipAddress ||
                    (device.serial.includes(':') ? device.serial : 'USB (Direct)');

                  return (
                    <tr
                      key={device.id}
                      className="hover:bg-studio-800/40 transition-colors group"
                    >
                      {/* 1. No */}
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-studio-400">
                        #{idx + 1}
                      </td>

                      {/* 2. Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-studio-800 border border-studio-700/60 flex items-center justify-center text-brand-400 shrink-0">
                            <Smartphone size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-studio-100 text-sm">
                                {device.model || 'Android Device'}
                              </span>
                              {device.isRooted && (
                                <Badge variant="success" size="sm">
                                  Rooted
                                </Badge>
                              )}
                              {device.isEmulator && (
                                <Badge variant="default" size="sm">
                                  Emulator
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-studio-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>Serial: {device.serial}</span>
                              <span>•</span>
                              <span>Android {device.androidVersion}</span>
                              {device.brand && (
                                <>
                                  <span>•</span>
                                  <span>{device.brand}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            device.status === 'connected'
                              ? 'success'
                              : device.status === 'unauthorized'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                          dot
                        >
                          {device.status === 'connected'
                            ? 'Connected'
                            : device.status === 'unauthorized'
                            ? 'Unauthorized'
                            : 'Offline'}
                        </Badge>
                      </td>

                      {/* 4. IP */}
                      <td className="py-3.5 px-4 font-mono text-studio-300">
                        <div className="flex items-center gap-1.5">
                          <Wifi size={13} className="text-studio-500 shrink-0" />
                          <span className="bg-studio-900 px-2.5 py-0.5 rounded border border-studio-800 text-studio-200">
                            {displayIp}
                          </span>
                        </div>
                      </td>

                      {/* 5. btn config */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Settings size={13} />}
                          onClick={() => handleOpenConfigModal(device)}
                        >
                          Config
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Social Media Publishing Apps & Screen Mirroring Card */}
      <Card
        title="Social Media Publishing Apps Setup"
        subtitle="Manage and verify installation of YouTube, TikTok, Facebook Pages, and Meta Business Suite"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={13} className={isLoadingSocialApps ? 'animate-spin' : ''} />}
              onClick={() => fetchSocialApps()}
            >
              Check Apps
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={isMirroring}
              icon={<Smartphone size={13} className="text-cyan-400" />}
              onClick={handleLaunchScrcpy}
            >
              Screen Mirror (scrcpy)
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {phoneSocialApps.map((app) => (
              <div
                key={app.packageName}
                className="p-3.5 rounded-xl bg-[#081633]/80 border border-[rgba(91,145,255,0.18)] hover:border-brand-500/40 transition-all flex flex-col justify-between space-y-3 shadow-subtle"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-studio-100">{app.appName}</span>
                    <Badge variant={app.isInstalled ? 'success' : 'warning'} size="sm" dot>
                      {app.isInstalled ? 'Installed' : 'Missing'}
                    </Badge>
                  </div>
                  <span className="text-[10px] font-mono text-studio-400 block truncate">
                    {app.packageName}
                  </span>
                  {app.installedVersion && (
                    <span className="text-[10px] font-mono text-cyan-400/80 block mt-0.5">
                      v{app.installedVersion}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-[rgba(91,145,255,0.14)]">
                  {app.isInstalled ? (
                    <div className="flex gap-1.5">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 text-[11px] h-7"
                        onClick={() => handleLaunchApp(selectedDevice?.id || 'virtual_device', app.packageName)}
                      >
                        Open App
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-7 px-2"
                        onClick={() => handleVerifyApp(app.packageName)}
                      >
                        Verify
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-[11px] h-7"
                        icon={<Download size={11} />}
                        onClick={() => handleOpenPlayStore(app.packageName)}
                      >
                        Play Store
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-7 px-2"
                        onClick={() => handleVerifyApp(app.packageName)}
                      >
                        Verify
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-brand-950/20 rounded-xl border border-brand-500/20 text-studio-300 text-[11px] flex items-center justify-between">
            <span>
              💡 <strong>Mobile Setup Guideline:</strong> Open each app on your phone to complete your account login. When posting, Social Earnings Studio will stage videos into the phone Gallery and launch the upload screen directly.
            </span>
            <Button
              variant="outline"
              size="sm"
              icon={<UserCheck size={12} className="text-cyan-400" />}
              onClick={() => handleOpenSettings('accounts')}
              className="text-[11px] shrink-0 ml-3 h-7 px-2.5"
            >
              Phone Accounts
            </Button>
          </div>
        </div>
      </Card>

      {/* Pop-up Modal for Phone Setup & Provisioning Configuration */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        maxWidth="full"
        title={`Phone Setup & Provisioning — ${selectedDevice?.model || 'Device'}`}
        subtitle={`Serial: ${selectedDevice?.serial || 'N/A'} • OS: Android ${selectedDevice?.androidVersion || 'N/A'} • IP: ${selectedDevice?.ipAddress || selectedDevice?.serial || 'USB'}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-studio-400">
              Active configuration target:{' '}
              <span className="text-studio-200 font-mono font-medium">
                {selectedDevice?.model || 'Device'} ({selectedDevice?.serial || 'N/A'})
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setIsConfigModalOpen(false)}>
              Close Configuration
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Active Device Info Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-studio-900/95 backdrop-blur-md rounded-2xl border border-studio-750 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-studio-300 flex items-center gap-1.5 shrink-0">
                <Smartphone size={14} className="text-brand-400" />
                Active Device:
              </span>
              <select
                className="bg-studio-950 border border-studio-700 rounded-lg px-2.5 py-1 text-studio-100 text-xs focus:ring-1 focus:ring-brand-500 font-mono"
                value={selectedDevice?.id || ''}
                onChange={(e) => {
                  const found = devices.find((d) => d.id === e.target.value);
                  if (found) handleDeviceSelect(found);
                }}
              >
                {devices.length === 0 ? (
                  <option value="">📱 Virtual Android Phone (Staging)</option>
                ) : (
                  devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      📱 {d.model} ({d.serial}) — {d.status.toUpperCase()}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={
                  selectedDevice?.status === 'connected'
                    ? 'success'
                    : selectedDevice?.status === 'unauthorized'
                    ? 'warning'
                    : 'default'
                }
                size="sm"
                dot
              >
                {selectedDevice?.status === 'connected'
                  ? 'Connected'
                  : selectedDevice?.status === 'unauthorized'
                  ? 'Unauthorized'
                  : 'Offline'}
              </Badge>
              {selectedDevice?.isRooted && (
                <Badge variant="success" size="sm">
                  Rooted
                </Badge>
              )}
            </div>
          </div>
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
        </div>
      </Modal>

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
