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
} from 'lucide-react';
import { Device, MediaAsset, TransferJob } from '../../../shared/types';

export const PhoneControlView: React.FC = () => {
  const { addToast } = useAppStore();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [transferJobs, setTransferJobs] = useState<TransferJob[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<MediaAsset[]>([]);
  const [isScanning, setIsScanning] = useState(false);

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

        if (dList.length > 0 && !selectedDevice) {
          setSelectedDevice(dList[0]);
        }

        const tJobs = await window.api.getTransferJobs();
        setTransferJobs(tJobs);

        const assets = await window.api.getMediaAssets();
        setLibraryAssets(assets);
        if (assets.length > 0 && !selectedAssetForTransfer) {
          setSelectedAssetForTransfer(assets[0].filePath);
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Device scan failed', message: err.message });
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

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

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 select-none overflow-y-auto h-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-xl font-bold text-studio-100 flex items-center gap-2">
            <Smartphone className="text-brand-400" size={22} />
            Android Phone Control Center
          </h2>
          <p className="text-xs text-studio-400 mt-1">
            Connect Android phones and emulators via ADB for direct video pushing, screen viewing, and app launching.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={14} />}
            onClick={() => {
              setWizardStep(1);
              setIsWizardOpen(true);
            }}
          >
            Phone Setup Wizard
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />}
            onClick={fetchDevices}
            loading={isScanning}
          >
            Scan for Devices
          </Button>
        </div>
      </div>

      {/* Connected Devices Grid or Empty State */}
      {devices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Smartphone size={36} />}
            title="No Android Devices Detected"
            description="Connect your Android phone via USB cable with USB Debugging enabled, or launch an Android emulator."
            actionText="Open First-Time Setup Wizard"
            onAction={() => {
              setWizardStep(1);
              setIsWizardOpen(true);
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Device Selection & Diagnostics */}
          <div className="md:col-span-1 space-y-4">
            <Card title="Connected Devices" subtitle="Select a device to control">
              <div className="space-y-2">
                {devices.map((dev) => {
                  const isSelected = selectedDevice?.id === dev.id;
                  const isConnected = dev.status === 'connected';

                  return (
                    <div
                      key={dev.id}
                      onClick={() => setSelectedDevice(dev)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-500/15 border-brand-500/50 shadow-subtle'
                          : 'bg-studio-900 border-studio-800 hover:border-studio-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-studio-100">{dev.model}</span>
                        <Badge
                          variant={
                            dev.status === 'connected'
                              ? 'success'
                              : dev.status === 'unauthorized'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                          dot
                        >
                          {dev.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-mono text-studio-400">{dev.serial}</p>
                      <span className="text-[10px] text-studio-500">{dev.androidVersion}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Diagnostics */}
            {selectedDevice && selectedDevice.status === 'connected' && (
              <Card title="Device Diagnostics" subtitle="Hardware & storage status">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-studio-900 rounded-lg border border-studio-800">
                    <span className="text-studio-400 flex items-center gap-1.5">
                      <Battery size={14} className="text-emerald-400" /> Battery Level
                    </span>
                    <span className="font-mono font-semibold text-studio-200">
                      {selectedDevice.batteryLevel}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-studio-900 rounded-lg border border-studio-800">
                    <span className="text-studio-400 flex items-center gap-1.5">
                      <HardDrive size={14} className="text-cyan-400" /> Phone Storage
                    </span>
                    <span className="font-mono font-semibold text-studio-200">
                      {Math.round((selectedDevice.availableStorageMb || 0) / 1024)} GB Free
                    </span>
                  </div>

                  {/* Remote viewing & Screenshot actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Monitor size={14} />}
                      onClick={() => handleStartMirror(selectedDevice.id)}
                    >
                      Screen Mirror
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Camera size={14} />}
                      loading={isCapturingScreenshot}
                      onClick={() => handleCaptureScreenshot(selectedDevice.id)}
                    >
                      Screenshot
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right: Transfer Video & Social Apps Launchpad */}
          <div className="md:col-span-2 space-y-6">
            {/* Quick File Transfer */}
            <Card
              title="Push Video to Phone"
              subtitle="Transfer files directly to Android gallery (Movies/SocialEarningsStudio)"
            >
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-studio-300 mb-1.5">
                    Select Local Video to Transfer
                  </label>
                  <select
                    className="w-full bg-studio-900 border border-studio-750 rounded-lg p-2.5 text-studio-100 text-xs"
                    value={selectedAssetForTransfer}
                    onChange={(e) => setSelectedAssetForTransfer(e.target.value)}
                  >
                    {libraryAssets.map((a) => (
                      <option key={a.id} value={a.filePath}>
                        {a.title} ({a.aspectRatio}, {(a.fileSize / (1024 * 1024)).toFixed(1)} MB)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 bg-studio-900 rounded-lg border border-studio-800 text-[11px]">
                  <span className="text-studio-400">Target Device:</span>
                  <span className="font-semibold text-studio-200">
                    {selectedDevice?.model || 'No device selected'} ({selectedDevice?.serial})
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  loading={isTransferring}
                  disabled={!selectedDevice || selectedDevice.status !== 'connected'}
                  icon={<Send size={15} />}
                  onClick={handleExecuteTransfer}
                >
                  Transfer Video to Android Phone
                </Button>
              </div>
            </Card>

            {/* Social Apps Launcher on Device */}
            {selectedDevice && (
              <Card
                title="Installed Social Applications"
                subtitle="One-click launcher to open creation screens on your physical device"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {selectedDevice.installedApps.map((app) => (
                    <div
                      key={app.packageName}
                      className="p-3 bg-studio-900 rounded-xl border border-studio-800 flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-studio-200">{app.appName}</span>
                          {app.isInstalled ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <XCircle size={14} className="text-studio-500" />
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
                          onClick={() => handleLaunchApp(selectedDevice.id, app.packageName)}
                        >
                          Launch
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<ExternalLink size={12} />}
                          onClick={() => window.api?.openExternalUrl(app.playStoreUrl)}
                        >
                          Get on Play Store
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Transfer History Table */}
            <Card title="Recent Transfer Jobs" subtitle="Tracked PC-to-Android transfers">
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
                          {(job.fileSize / (1024 * 1024)).toFixed(1)} MB transferred
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

      {/* First-Time Phone Setup Wizard Modal */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title="First-Time Android Phone Setup Wizard"
        subtitle={`Step ${wizardStep} of 4: Android Debug Bridge (ADB) Configuration`}
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
                Finish & Test Connection
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {wizardStep === 1 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-studio-100 text-sm">1. Enable Developer Options & USB Debugging</h4>
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
              <h4 className="font-semibold text-studio-100 text-sm">2. Connect via USB & Authorize Fingerprint</h4>
              <p className="text-studio-300 leading-relaxed">
                Connect your Android phone to this computer using a USB cable.
              </p>
              <div className="p-4 bg-studio-900 rounded-xl border border-studio-800 space-y-2">
                <p className="text-amber-400 font-medium">⚠️ Important Security Prompt on Phone:</p>
                <p className="text-studio-400">
                  A dialog titled <strong>"Allow USB debugging?"</strong> will appear on your phone screen with this computer's RSA key fingerprint.
                </p>
                <p className="text-studio-200">
                  Check <strong>"Always allow from this computer"</strong> and tap <strong>Allow</strong>.
                </p>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-studio-100 text-sm">3. Verification & Diagnostic Checks</h4>
              <p className="text-studio-300 leading-relaxed">
                Social Earnings Studio will verify the authorized connection, query available internal storage, and detect social publishing apps.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-studio-900 rounded-lg border border-studio-800">
                  <span className="text-emerald-400 font-semibold block mb-1">Supported Devices:</span>
                  <p className="text-studio-400">All Android 8.0+ phones (Pixel, Samsung, Xiaomi, Motorola, etc.) and Android Studio emulators.</p>
                </div>
                <div className="p-3 bg-studio-900 rounded-lg border border-studio-800">
                  <span className="text-brand-400 font-semibold block mb-1">Target Folder:</span>
                  <p className="text-studio-400">Movies/SocialEarningsStudio (Indexed by MediaScanner for instant gallery detection).</p>
                </div>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-studio-100 text-sm">4. Ready to Transfer & Publish!</h4>
              <p className="text-studio-300 leading-relaxed">
                Setup is complete! You can now push videos with 1-click, capture live screenshots, and mirror the device screen.
              </p>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
                Click <strong>"Finish & Test Connection"</strong> to scan for your device.
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
