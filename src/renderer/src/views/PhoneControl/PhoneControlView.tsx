import React, { useEffect, useState, useRef } from 'react';
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
  Eye,
  EyeOff,
  Key,
  Save,
  LogIn,
  PlayCircle,
  Copy,
  Lock,
  Globe,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Device,
  PhoneSetupDiagnostic,
  LocalAppPackageInfo,
  AppInstallResult,
  PhoneAppInfo,
  PhoneAccountCredential,
  PhoneAccountPlatform,
  PlayStoreInstallResult,
  PlayStoreBatchResult,
  GoogleAutoLoginResult,
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

  // Phone Account Configuration (Google, Facebook, TikTok, YouTube)
  const [accountCredentials, setAccountCredentials] = useState<PhoneAccountCredential[]>([]);
  const [allAccountsMap, setAllAccountsMap] = useState<Record<string, Record<string, PhoneAccountCredential>>>({});
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [formInputs, setFormInputs] = useState<Record<PhoneAccountPlatform, { identifier: string; password: string; twoFactorSecret: string }>>({
    google: { identifier: '', password: '', twoFactorSecret: '' },
    facebook: { identifier: '', password: '', twoFactorSecret: '' },
    tiktok: { identifier: '', password: '', twoFactorSecret: '' },
    youtube: { identifier: '', password: '', twoFactorSecret: '' },
  });
  const [savingPlatform, setSavingPlatform] = useState<string | null>(null);
  const [runningAutoLogin, setRunningAutoLogin] = useState<string | null>(null);
  const [installingPlayStorePackage, setInstallingPlayStorePackage] = useState<string | null>(null);
  const [isBatchPlayStoreInstalling, setIsBatchPlayStoreInstalling] = useState(false);

  // Active fetch tracking ref to prevent in-flight race conditions when switching devices
  const activeFetchDeviceIdRef = useRef<string>('');

  const fetchSocialApps = async (deviceId?: string) => {
    const target = deviceId || selectedDevice?.serial || selectedDevice?.id;
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

  const fetchAccountCredentials = async (deviceId?: string) => {
    if (!window.api?.getPhoneAccountCredentials) return;
    const targetDevId = deviceId || selectedDevice?.serial || selectedDevice?.id || (devices.length > 0 ? (devices[0].serial || devices[0].id) : 'virtual_device');
    activeFetchDeviceIdRef.current = targetDevId;
    setIsLoadingAccounts(true);
    try {
      // 1. Fetch credentials scoped specifically to this target device
      const creds = await window.api.getPhoneAccountCredentials(targetDevId);

      // Race condition guard: If user switched devices while fetch was in flight, abort form update
      if (activeFetchDeviceIdRef.current !== targetDevId) {
        return;
      }

      setAccountCredentials(creds);

      // Cleanly reset form inputs for this device
      const cleanInputs: Record<PhoneAccountPlatform, { identifier: string; password: string; twoFactorSecret: string }> = {
        google: { identifier: '', password: '', twoFactorSecret: '' },
        facebook: { identifier: '', password: '', twoFactorSecret: '' },
        tiktok: { identifier: '', password: '', twoFactorSecret: '' },
        youtube: { identifier: '', password: '', twoFactorSecret: '' },
      };
      creds.forEach((c) => {
        if (cleanInputs[c.platform]) {
          cleanInputs[c.platform] = {
            identifier: c.identifier || '',
            password: c.password || '',
            twoFactorSecret: c.twoFactorSecret || '',
          };
        }
      });
      setFormInputs(cleanInputs);

      // 2. Fetch all credentials across all devices for per-device dashboard badges
      const allCreds = await window.api.getPhoneAccountCredentials();
      const map: Record<string, Record<string, PhoneAccountCredential>> = {};
      allCreds.forEach((c) => {
        const devKey = c.deviceId || 'default';
        if (!map[devKey]) map[devKey] = {};
        map[devKey][c.platform] = c;
      });
      setAllAccountsMap(map);
    } catch (err: any) {
      console.warn('Failed to load phone account credentials:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleSaveCredential = async (platform: PhoneAccountPlatform) => {
    if (!window.api?.savePhoneAccountCredential) return;

    // 1. Identify device associated with the current form at click time
    const targetDev = selectedDevice;
    const targetDevKey = targetDev?.serial || targetDev?.id || (devices.length > 0 ? (devices[0].serial || devices[0].id) : 'virtual_device');
    const targetModel = targetDev?.model || (targetDevKey === 'virtual_device' ? 'Virtual Android Device' : targetDevKey);

    // 2. Validate device still exists in connected devices if devices exist
    if (devices.length > 0 && targetDev && !devices.some((d) => d.serial === targetDev.serial || d.id === targetDev.id)) {
      addToast({
        type: 'error',
        title: 'Save failed',
        message: `Device "${targetModel}" is no longer available. Save aborted to prevent credential corruption.`,
      });
      return;
    }

    // 3. Capture exact inputs at click time
    const inputToSave = { ...formInputs[platform] };
    if (!inputToSave.identifier.trim()) {
      addToast({
        type: 'warn',
        title: 'Identifier Required',
        message: `Please enter a valid ${platform === 'facebook' ? 'UID or Email' : 'Gmail / Email'} for ${platform.toUpperCase()}.`,
      });
      return;
    }

    const existingCred = accountCredentials.find((c) => c.platform === platform);
    const isUpdate = Boolean(existingCred && existingCred.id);

    setSavingPlatform(platform);
    try {
      const saved = await window.api.savePhoneAccountCredential({
        id: existingCred?.id,
        deviceId: targetDevKey,
        platform,
        identifier: inputToSave.identifier.trim(),
        password: inputToSave.password.trim(),
        twoFactorSecret: inputToSave.twoFactorSecret.trim(),
      });

      if (!saved || !saved.id) {
        throw new Error('Database persistence could not be verified by backend.');
      }

      addToast({
        type: 'success',
        title: 'Saved successfully',
        message: `${platform.toUpperCase()} credentials ${isUpdate ? 'updated' : 'saved'} for ${saved.identifier} on ${targetModel}.`,
      });

      // Update form inputs immediately with confirmed saved record
      setFormInputs((prev) => ({
        ...prev,
        [platform]: {
          identifier: saved.identifier || '',
          password: saved.password || '',
          twoFactorSecret: saved.twoFactorSecret || '',
        },
      }));

      // Update global accounts map for this device so dashboard badges update immediately
      setAllAccountsMap((prev) => ({
        ...prev,
        [targetDevKey]: {
          ...(prev[targetDevKey] || {}),
          [platform]: saved,
        },
      }));

      // Update active accountCredentials list
      setAccountCredentials((prev) => {
        const next = prev.filter((c) => c.platform !== platform);
        return [...next, saved];
      });

      // 4. Race condition prevention: only refresh the form if active device is STILL targetDevKey!
      const currentSelectedKey = selectedDevice?.serial || selectedDevice?.id || (devices.length > 0 ? (devices[0].serial || devices[0].id) : 'virtual_device');
      if (currentSelectedKey === targetDevKey) {
        await fetchAccountCredentials(targetDevKey);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save failed',
        message: err?.message || 'Failed to save account credentials.',
      });
    } finally {
      setSavingPlatform(null);
    }
  };

  const handleDeleteCredential = async (id: string, platform: PhoneAccountPlatform) => {
    if (!window.api?.deletePhoneAccountCredential) return;
    try {
      await window.api.deletePhoneAccountCredential(id);
      addToast({
        type: 'info',
        title: 'Account Removed',
        message: `${platform.toUpperCase()} credentials removed.`,
      });
      const targetDevKey = selectedDevice?.serial || selectedDevice?.id || (devices.length > 0 ? (devices[0].serial || devices[0].id) : 'virtual_device');
      setFormInputs((prev) => ({
        ...prev,
        [platform]: { identifier: '', password: '', twoFactorSecret: '' },
      }));
      setAllAccountsMap((prev) => {
        const devMap = { ...(prev[targetDevKey] || {}) };
        delete devMap[platform];
        return { ...prev, [targetDevKey]: devMap };
      });
      setAccountCredentials((prev) => prev.filter((c) => c.id !== id && c.platform !== platform));
      await fetchAccountCredentials(targetDevKey);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Failed to delete account credential.',
      });
    }
  };

  const handleAutoLoginYouTube = async () => {
    const targetDevKey = selectedDevice?.serial || selectedDevice?.id || 'virtual_device';
    if (!window.api?.autoLoginYouTubeGoogle) return;

    setRunningAutoLogin('youtube');
    try {
      const googleEmail = formInputs.youtube.identifier || formInputs.google.identifier;
      const res = await window.api.autoLoginYouTubeGoogle(targetDevKey, googleEmail);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'YouTube Google Sign-in',
          message: res.message,
        });
      } else {
        addToast({
          type: 'warn',
          title: 'YouTube Sign-in Notice',
          message: res.message,
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Auto-Login Error', message: err.message });
    } finally {
      setRunningAutoLogin(null);
    }
  };

  const handleAutoLoginTikTok = async () => {
    const targetDevKey = selectedDevice?.serial || selectedDevice?.id || 'virtual_device';
    if (!window.api?.autoLoginTikTokGoogle) return;

    setRunningAutoLogin('tiktok');
    try {
      const googleEmail = formInputs.tiktok.identifier || formInputs.google.identifier;
      const res = await window.api.autoLoginTikTokGoogle(targetDevKey, googleEmail);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'TikTok Google Sign-in',
          message: res.message,
        });
      } else {
        addToast({
          type: 'warn',
          title: 'TikTok Sign-in Notice',
          message: res.message,
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Auto-Login Error', message: err.message });
    } finally {
      setRunningAutoLogin(null);
    }
  };

  const handleRemotePlayStoreInstall = async (packageName: string, appName: string) => {
    const targetDevId = selectedDevice?.id || 'virtual_device';
    if (!window.api?.installAppFromPlayStore) return;

    setInstallingPlayStorePackage(packageName);
    try {
      const googlePass = formInputs.google.password;
      const res = await window.api.installAppFromPlayStore({
        deviceId: targetDevId,
        packageName,
        appName,
        googlePassword: googlePass,
      });

      if (res.success) {
        addToast({
          type: 'success',
          title: `${appName} Play Store Request`,
          message: res.message,
        });
      } else {
        addToast({
          type: 'warn',
          title: `${appName} Notice`,
          message: res.message,
        });
      }
      await fetchSocialApps(targetDevId);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Play Store Install Failed', message: err.message });
    } finally {
      setInstallingPlayStorePackage(null);
    }
  };

  const handleBatchPlayStoreInstallAll = async () => {
    const targetDevId = selectedDevice?.id || 'virtual_device';
    if (!window.api?.installAllAppsFromPlayStore) return;

    setIsBatchPlayStoreInstalling(true);
    try {
      const googlePass = formInputs.google.password;
      const res = await window.api.installAllAppsFromPlayStore(targetDevId, googlePass);
      addToast({
        type: 'success',
        title: 'Play Store Installation Complete',
        message: `Processed ${res.total} apps (${res.successful} successful, ${res.failed} warnings/failed).`,
      });
      await fetchSocialApps(targetDevId);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Batch Play Store Install Failed', message: err.message });
    } finally {
      setIsBatchPlayStoreInstalling(false);
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
          const devKey = activeDev.serial || activeDev.id;
          await loadDiagnostic(devKey);
          await fetchSocialApps(devKey);
          await fetchAccountCredentials(devKey);
        } else if (dList.length > 0) {
          const devKey = dList[0].serial || dList[0].id;
          await loadDiagnostic(devKey);
          await fetchSocialApps(devKey);
          await fetchAccountCredentials(devKey);
        } else {
          // Virtual device diagnostic
          await loadDiagnostic('virtual_device');
          await fetchSocialApps('virtual_device');
          await fetchAccountCredentials('virtual_device');
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
    // Instantly blank out form inputs so previous device credentials don't linger
    setFormInputs({
      google: { identifier: '', password: '', twoFactorSecret: '' },
      facebook: { identifier: '', password: '', twoFactorSecret: '' },
      tiktok: { identifier: '', password: '', twoFactorSecret: '' },
      youtube: { identifier: '', password: '', twoFactorSecret: '' },
    });
    const devKey = dev.serial || dev.id;
    activeFetchDeviceIdRef.current = devKey;
    loadDiagnostic(devKey);
    fetchSocialApps(devKey);
    fetchAccountCredentials(devKey);
  };

  const handleOpenConfigModal = (dev: Device) => {
    setSelectedDevice(dev);
    // Instantly blank out form inputs so previous device credentials don't linger
    setFormInputs({
      google: { identifier: '', password: '', twoFactorSecret: '' },
      facebook: { identifier: '', password: '', twoFactorSecret: '' },
      tiktok: { identifier: '', password: '', twoFactorSecret: '' },
      youtube: { identifier: '', password: '', twoFactorSecret: '' },
    });
    const devKey = dev.serial || dev.id;
    activeFetchDeviceIdRef.current = devKey;
    loadDiagnostic(devKey);
    fetchSocialApps(devKey);
    fetchAccountCredentials(devKey);
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
                            {/* Assigned Accounts Badge for this phone */}
                            {(() => {
                              const devAccs = allAccountsMap[device.serial] || allAccountsMap[device.id] || {};
                              const gAcc = devAccs.google?.identifier;
                              const configuredCount = Object.keys(devAccs).filter((k) => devAccs[k]?.identifier).length;
                              return (
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  {gAcc ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/40 text-red-300 border border-red-800/40"
                                      title="Google Account configured for Play Store & auto-login"
                                    >
                                      <span className="font-bold text-red-400">G</span>
                                      <span className="truncate max-w-[170px]">{gAcc}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-studio-800/80 text-studio-500 border border-studio-750">
                                      No Google Acct (Click Config)
                                    </span>
                                  )}
                                  {configuredCount > 1 && (
                                    <span className="text-[10px] text-cyan-400/90 font-mono bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-800/30">
                                      +{configuredCount - 1} social accts
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
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

      {/* Social Media Publishing Apps & Play Store Remote Installation Card */}
      <Card
        title="Social Media Publishing Apps Setup (Play Store Remote Installation)"
        subtitle="Auto-install YouTube, TikTok, Facebook, ExpressVPN, YouTube Studio, TikTok Studio, and Meta Business Suite directly from Google Play Store"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              icon={<Settings size={13} className="text-brand-400" />}
              onClick={() => {
                if (selectedDevice) handleOpenConfigModal(selectedDevice);
                else if (devices.length > 0) handleOpenConfigModal(devices[0]);
              }}
            >
              Configure Accounts
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={13} className={isLoadingSocialApps ? 'animate-spin' : ''} />}
              onClick={() => fetchSocialApps()}
            >
              Check Apps
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isBatchPlayStoreInstalling}
              icon={<Download size={13} />}
              onClick={handleBatchPlayStoreInstallAll}
            >
              Install All via Play Store
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
          {/* Active Device & Google Account Context Banner */}
          <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-studio-900 to-indigo-950/40 rounded-xl border border-[rgba(91,145,255,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-studio-300">
            <div className="flex items-center gap-2.5">
              <Smartphone size={16} className="text-brand-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-studio-100 block">
                  Target Phone: {selectedDevice?.model || 'Device'} ({selectedDevice?.serial || 'virtual_device'})
                </span>
                <span className="text-[11px] text-studio-400 flex items-center gap-1.5 flex-wrap">
                  <span>Assigned Google Account:</span>
                  {allAccountsMap[selectedDevice?.serial || '']?.google?.identifier || allAccountsMap[selectedDevice?.id || '']?.google?.identifier || formInputs.google.identifier ? (
                    <span className="text-red-300 font-mono font-medium">
                      {allAccountsMap[selectedDevice?.serial || '']?.google?.identifier || allAccountsMap[selectedDevice?.id || '']?.google?.identifier || formInputs.google.identifier}
                    </span>
                  ) : (
                    <span className="text-amber-400/90 italic">None (click Configure Accounts to set up)</span>
                  )}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Settings size={12} className="text-brand-400" />}
              onClick={() => {
                if (selectedDevice) handleOpenConfigModal(selectedDevice);
                else if (devices.length > 0) handleOpenConfigModal(devices[0]);
              }}
            >
              Configure This Phone's Accounts
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {phoneSocialApps.map((app) => {
              const isCurrentInstalling = installingPlayStorePackage === app.packageName;

              return (
                <div
                  key={app.packageName}
                  className="p-3.5 rounded-xl bg-[#081633]/80 border border-[rgba(91,145,255,0.18)] hover:border-brand-500/40 transition-all flex flex-col justify-between space-y-3 shadow-subtle"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-studio-100 truncate max-w-[140px]">
                        {app.appName}
                      </span>
                      <Badge variant={app.isInstalled ? 'success' : 'warning'} size="sm" dot>
                        {app.isInstalled ? 'Installed' : 'Missing'}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-semibold block mb-0.5">
                      {app.category}
                    </span>
                    <span className="text-[10px] font-mono text-studio-400 block truncate">
                      {app.packageName}
                    </span>
                    {app.installedVersion && (
                      <span className="text-[10px] font-mono text-emerald-400/80 block mt-0.5">
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
                      <div className="flex flex-col gap-1.5">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-[11px] h-7"
                          icon={<Download size={11} />}
                          loading={isCurrentInstalling}
                          onClick={() => handleRemotePlayStoreInstall(app.packageName, app.appName)}
                        >
                          Play Store Install
                        </Button>
                        <div className="flex gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 text-[10px] h-6 px-1.5"
                            icon={<ExternalLink size={10} />}
                            onClick={() => handleOpenPlayStore(app.packageName)}
                          >
                            Open Listing
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 px-2"
                            onClick={() => handleVerifyApp(app.packageName)}
                          >
                            Verify
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-brand-950/20 rounded-xl border border-brand-500/20 text-studio-300 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              💡 <strong>Play Store Automation:</strong> Clicking <strong>"Play Store Install"</strong> triggers the remote ADB/ATX agent to launch Google Play Store, search the app, and tap Install automatically. If a Google password prompt appears, it submits your configured password; otherwise it skips seamlessly.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                icon={<UserCheck size={12} className="text-cyan-400" />}
                onClick={() => handleOpenSettings('accounts')}
                className="text-[11px] shrink-0 h-7 px-2.5"
              >
                Phone Accounts
              </Button>
            </div>
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

          {/* Phone Account Configuration Table (Google, Facebook, TikTok, YouTube) - Scoped to Selected Phone */}
          <Card
            title={`Phone Accounts & Automated Login — ${selectedDevice?.model || 'Device'}`}
            subtitle={`Credentials isolated strictly for device: ${selectedDevice?.serial || 'virtual_device'}. Configure Google for Play Store installations and 1-click auto-login (TikTok & YouTube).`}
            action={
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<RefreshCw size={13} className={isLoadingAccounts ? 'animate-spin' : ''} />}
                  onClick={() => fetchAccountCredentials(selectedDevice?.serial || selectedDevice?.id)}
                >
                  Refresh Accounts
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<PlayCircle size={13} className="text-red-400" />}
                  loading={runningAutoLogin === 'youtube'}
                  onClick={handleAutoLoginYouTube}
                >
                  Auto-Login YouTube (Google)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<PlayCircle size={13} className="text-cyan-400" />}
                  loading={runningAutoLogin === 'tiktok'}
                  onClick={handleAutoLoginTikTok}
                >
                  Auto-Login TikTok (Google)
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              {/* Informational banner about 1 Phone = 1 Account Set */}
              <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-studio-900 to-indigo-950/40 rounded-xl border border-[rgba(91,145,255,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-studio-300">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="text-cyan-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <span className="font-semibold text-studio-100 block">
                      Isolated 1 Phone = 1 Account Set ({selectedDevice?.model || 'Device'})
                    </span>
                    <span className="text-[11px] text-studio-400">
                      These credentials belong specifically to this device ({selectedDevice?.serial || 'virtual_device'}). If you have multiple phones, each phone stores its own accounts separately and will never overwrite each other.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<UserCheck size={12} className="text-emerald-400" />}
                    onClick={() => handleOpenSettings('accounts')}
                  >
                    Phone Settings
                  </Button>
                </div>
              </div>

              {/* Account Configuration Table */}
              <div className="overflow-x-auto -mx-6 -my-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-studio-750 bg-studio-900/60 text-studio-400 uppercase text-[10px] font-semibold tracking-wider">
                      <th className="py-2.5 px-4">Platform & Service</th>
                      <th className="py-2.5 px-4 min-w-[200px]">Account Identifier (Gmail / UID)</th>
                      <th className="py-2.5 px-4 min-w-[180px]">Password</th>
                      <th className="py-2.5 px-4 min-w-[150px]">2FA Secret / Code</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-studio-800">
                    {(
                      [
                        {
                          platform: 'google' as PhoneAccountPlatform,
                          name: 'Google Account',
                          desc: 'Play Store, YouTube & System Auth',
                          idLabel: 'Gmail Address',
                          idPlaceholder: 'creator.channel@gmail.com',
                          passPlaceholder: 'Google password (for Play Store auth)',
                          twoFaPlaceholder: '2FA TOTP secret key (optional)',
                          color: 'border-red-500/30 text-red-400',
                          badgeBg: 'bg-red-950/40 text-red-300 border-red-800/40',
                          supportsGoogleAuth: false,
                        },
                        {
                          platform: 'facebook' as PhoneAccountPlatform,
                          name: 'Facebook Account',
                          desc: 'Facebook & Meta Business Suite',
                          idLabel: 'UID / Email',
                          idPlaceholder: 'UID or login email',
                          passPlaceholder: 'Facebook password',
                          twoFaPlaceholder: 'Facebook 2FA secret key',
                          color: 'border-blue-500/30 text-blue-400',
                          badgeBg: 'bg-blue-950/40 text-blue-300 border-blue-800/40',
                          supportsGoogleAuth: false,
                        },
                        {
                          platform: 'tiktok' as PhoneAccountPlatform,
                          name: 'TikTok Account',
                          desc: 'TikTok & TikTok Studio',
                          idLabel: 'Gmail / Username / Email',
                          idPlaceholder: 'TikTok Gmail or username',
                          passPlaceholder: 'TikTok password (or use Google Auth)',
                          twoFaPlaceholder: 'TikTok 2FA key',
                          color: 'border-cyan-500/30 text-cyan-400',
                          badgeBg: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40',
                          supportsGoogleAuth: true,
                        },
                        {
                          platform: 'youtube' as PhoneAccountPlatform,
                          name: 'YouTube Account',
                          desc: 'YouTube & YouTube Studio',
                          idLabel: 'Channel Gmail',
                          idPlaceholder: 'channel.email@gmail.com',
                          passPlaceholder: 'YouTube / Google password',
                          twoFaPlaceholder: 'Channel 2FA key',
                          color: 'border-rose-500/30 text-rose-400',
                          badgeBg: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
                          supportsGoogleAuth: true,
                        },
                      ] as const
                    ).map((item) => {
                      const input = formInputs[item.platform];
                      const savedAcc = accountCredentials.find((c) => c.platform === item.platform);
                      const isSaved = Boolean(savedAcc?.identifier);
                      const isConfigured = Boolean(input.identifier.trim());
                      const isSaving = savingPlatform === item.platform;
                      const isLoggingIn = runningAutoLogin === item.platform;
                      const isShowingPass = Boolean(showPassword[item.platform]);

                      return (
                        <tr
                          key={item.platform}
                          className="hover:bg-studio-800/30 transition-colors"
                        >
                          {/* Platform & Service */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-lg bg-studio-850 border ${item.color} flex items-center justify-center font-bold text-xs shrink-0`}
                              >
                                {item.platform === 'google'
                                  ? 'G'
                                  : item.platform === 'facebook'
                                  ? 'f'
                                  : item.platform === 'tiktok'
                                  ? 'TT'
                                  : 'YT'}
                              </div>
                              <div>
                                <span className="font-semibold text-studio-100 block">
                                  {item.name}
                                </span>
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${item.badgeBg}`}
                                >
                                  {item.desc}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Identifier Input */}
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={input.identifier}
                              onChange={(e) =>
                                setFormInputs((prev) => ({
                                  ...prev,
                                  [item.platform]: {
                                    ...prev[item.platform],
                                    identifier: e.target.value,
                                  },
                                }))
                              }
                              placeholder={item.idPlaceholder}
                              className="w-full bg-studio-900 border border-studio-700/80 rounded-lg px-2.5 py-1 text-xs text-studio-100 placeholder-studio-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
                            />
                          </td>

                          {/* Password Input */}
                          <td className="py-3 px-4">
                            <div className="relative flex items-center">
                              <input
                                type={isShowingPass ? 'text' : 'password'}
                                value={input.password}
                                onChange={(e) =>
                                  setFormInputs((prev) => ({
                                    ...prev,
                                    [item.platform]: {
                                      ...prev[item.platform],
                                      password: e.target.value,
                                    },
                                  }))
                                }
                                placeholder={item.passPlaceholder}
                                className="w-full bg-studio-900 border border-studio-700/80 rounded-lg pl-2.5 pr-8 py-1 text-xs text-studio-100 placeholder-studio-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowPassword((prev) => ({
                                    ...prev,
                                    [item.platform]: !prev[item.platform],
                                  }))
                                }
                                className="absolute right-2 text-studio-400 hover:text-studio-200 transition-colors"
                                title={isShowingPass ? 'Hide password' : 'Show password'}
                              >
                                {isShowingPass ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                          </td>

                          {/* 2FA Secret Input */}
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={input.twoFactorSecret}
                              onChange={(e) =>
                                setFormInputs((prev) => ({
                                  ...prev,
                                  [item.platform]: {
                                    ...prev[item.platform],
                                    twoFactorSecret: e.target.value,
                                  },
                                }))
                              }
                              placeholder={item.twoFaPlaceholder}
                              className="w-full bg-studio-900 border border-studio-700/80 rounded-lg px-2.5 py-1 text-xs text-studio-100 placeholder-studio-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
                            />
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3 text-center">
                            <Badge variant={isSaved ? 'success' : isConfigured ? 'warning' : 'neutral'} size="sm" dot>
                              {isSaved ? 'Saved' : isConfigured ? 'Unsaved' : 'Unset'}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="primary"
                                size="sm"
                                className="h-7 text-[11px] px-2.5"
                                icon={<Save size={11} />}
                                loading={isSaving}
                                disabled={isSaving}
                                onClick={() => handleSaveCredential(item.platform)}
                              >
                                {isSaving ? 'Saving...' : 'Save'}
                              </Button>

                              {savedAcc && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-studio-400 hover:text-rose-400 hover:bg-rose-500/10"
                                  icon={<Trash2 size={12} />}
                                  title={`Remove ${item.name} from this device`}
                                  onClick={() => handleDeleteCredential(savedAcc.id, item.platform)}
                                />
                              )}

                              {item.supportsGoogleAuth && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 text-[11px] px-2"
                                  icon={<LogIn size={11} className="text-cyan-400" />}
                                  loading={isLoggingIn}
                                  title={`Auto-run Google Login on ${item.name}`}
                                  onClick={
                                    item.platform === 'youtube'
                                      ? handleAutoLoginYouTube
                                      : handleAutoLoginTikTok
                                  }
                                >
                                  Auto-Login
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

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
