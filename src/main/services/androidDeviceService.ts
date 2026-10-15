import { adbService } from './adbService';
import { deviceRepo } from '../database/repositories/deviceRepository';
import { activityLogService } from './activityLogService';
import { Device, DeviceStatus, PhoneSetupDiagnostic } from '../../shared/types';
import { appDb } from '../database/db';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class AndroidDeviceService {
  public async getConnectedDevices(): Promise<Device[]> {
    try {
      const devices = await adbService.getConnectedDevices();
      return devices;
    } catch (err: any) {
      activityLogService.log('warn', 'AndroidDevice', `Failed to get connected devices: ${err.message}`);
      return deviceRepo.getAll();
    }
  }

  public async refreshDevices(): Promise<Device[]> {
    return this.getConnectedDevices();
  }

  public async connectWireless(hostPort: string): Promise<{ success: boolean; message: string }> {
    const res = await adbService.connectWirelessAdb(hostPort);
    if (res.success) {
      activityLogService.log('info', 'AndroidDevice', `Connected wireless ADB to ${hostPort}`);
    } else {
      activityLogService.log('warn', 'AndroidDevice', `Wireless ADB connect failed for ${hostPort}: ${res.message}`);
    }
    return res;
  }

  public async disconnectDevice(serial: string): Promise<{ success: boolean; message: string }> {
    const adb = appDb.getSettings().adbPath || 'adb';
    try {
      if (serial.includes(':')) {
        await execAsync(`"${adb}" disconnect "${serial}"`);
        activityLogService.log('info', 'AndroidDevice', `Disconnected wireless device: ${serial}`);
        return { success: true, message: `Disconnected device ${serial}` };
      }
      return { success: true, message: `USB device ${serial} state noted. Unplug cable to disconnect.` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  public async restartAdb(): Promise<{ success: boolean; message: string }> {
    return adbService.restartAdbServer();
  }

  public async getDiagnostic(deviceId: string): Promise<PhoneSetupDiagnostic> {
    return adbService.getPhoneSetupDiagnostic(deviceId);
  }

  public async captureScreen(deviceId: string): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
    return adbService.captureScreenshot(deviceId);
  }

  public async launchScrcpy(deviceId?: string): Promise<{ success: boolean; message: string }> {
    const devices = await this.getConnectedDevices();
    let target = deviceId ? devices.find((d) => d.id === deviceId || d.serial === deviceId) : devices[0];
    const serial = target?.serial || deviceId;

    if (!serial) {
      return { success: false, message: 'No connected Android device found for screen mirroring.' };
    }

    try {
      const res = await adbService.startScreenMirror(target ? target.id : serial);
      activityLogService.log('info', 'AndroidDevice', `Launched screen mirror for device ${serial}`);
      return res;
    } catch (err: any) {
      activityLogService.log('error', 'AndroidDevice', `Screen mirror error: ${err.message}`);
      return { success: false, message: err.message };
    }
  }

  public getTroubleshootingGuide(): {
    step: number;
    title: string;
    description: string;
    solution: string;
  }[] {
    return [
      {
        step: 1,
        title: 'Enable Developer Options',
        description: 'Developer Options is hidden by default on Android phones.',
        solution: 'Open Phone Settings > About Phone > Tap "Build Number" 7 times until Developer mode is enabled.',
      },
      {
        step: 2,
        title: 'Enable USB Debugging',
        description: 'Allows ADB commands and file transfer via USB cable.',
        solution: 'Open Phone Settings > System > Developer Options > Toggle "USB Debugging" ON.',
      },
      {
        step: 3,
        title: 'Authorize Desktop Connection',
        description: 'Device state shows "Unauthorized" until confirmed on phone.',
        solution: 'Check your phone screen. When prompted "Allow USB debugging?", check "Always allow from this computer" and tap Allow.',
      },
      {
        step: 4,
        title: 'Set USB Mode to File Transfer (MTP)',
        description: 'Some phones default to "Charging Only".',
        solution: 'Swipe down notifications on phone > Tap "Charging via USB" > Change to "File Transfer / MTP".',
      },
      {
        step: 5,
        title: 'Wireless ADB Connection (Optional)',
        description: 'Connect phone over same Wi-Fi network without cable.',
        solution: 'Enable "Wireless Debugging" in Developer Options > Pair device or use "adb connect IP:PORT" button.',
      },
    ];
  }
}

export const androidDeviceService = new AndroidDeviceService();
