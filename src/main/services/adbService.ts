import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { appDb } from '../database/db';
import { deviceRepo } from '../database/repositories/deviceRepository';
import { Device, DeviceStatus, InstalledAppInfo, TransferJob } from '../../shared/types';
import { logger } from '../logger';

const execAsync = promisify(exec);

const SOCIAL_APPS: { packageName: string; appName: string; playStoreUrl: string }[] = [
  {
    packageName: 'com.google.android.youtube',
    appName: 'YouTube',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.youtube',
  },
  {
    packageName: 'com.zhiliaoapp.musically',
    appName: 'TikTok',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically',
  },
  {
    packageName: 'com.facebook.katana',
    appName: 'Facebook',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.facebook.katana',
  },
  {
    packageName: 'com.instagram.android',
    appName: 'Instagram',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.instagram.android',
  },
];

export class AdbService {
  private getAdbPath(): string {
    const settings = appDb.getSettings();
    return settings.adbPath || 'adb';
  }

  public async checkAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const adb = this.getAdbPath();
      const { stdout } = await execAsync(`"${adb}" version`);
      const firstLine = stdout.split('\n')[0] || '';
      return { available: true, version: firstLine.trim() };
    } catch (err: any) {
      return { available: false, error: err.message };
    }
  }

  public async getConnectedDevices(): Promise<Device[]> {
    const adb = this.getAdbPath();
    const result: Device[] = [];

    try {
      const { stdout } = await execAsync(`"${adb}" devices -l`);
      const lines = stdout.split('\n');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // format: 192.168.1.100:5555  device product:... model:Pixel_7 device:...
        const parts = line.split(/\s+/);
        if (parts.length < 2) continue;

        const serial = parts[0];
        const statusRaw = parts[1].toLowerCase();

        let status: DeviceStatus = 'disconnected';
        if (statusRaw === 'device') status = 'connected';
        else if (statusRaw === 'unauthorized') status = 'unauthorized';
        else if (statusRaw === 'offline') status = 'offline';
        else status = 'error';

        let model = 'Android Device';
        const modelMatch = line.match(/model:(\S+)/);
        if (modelMatch) {
          model = modelMatch[1].replace(/_/g, ' ');
        }

        let androidVersion = 'Android';
        let batteryLevel = 85;
        let availableStorageMb = 16384;
        let totalStorageMb = 65536;
        let installedApps: InstalledAppInfo[] = [];

        if (status === 'connected') {
          try {
            // Get Android OS version
            const { stdout: osVer } = await execAsync(`"${adb}" -s "${serial}" shell getprop ro.build.version.release`, { timeout: 3000 });
            if (osVer.trim()) androidVersion = `Android ${osVer.trim()}`;

            // Get battery
            const { stdout: batteryOut } = await execAsync(`"${adb}" -s "${serial}" shell dumpsys battery`, { timeout: 3000 });
            const levelMatch = batteryOut.match(/level:\s*(\d+)/);
            if (levelMatch) batteryLevel = parseInt(levelMatch[1], 10);

            // Get storage (/sdcard)
            const { stdout: dfOut } = await execAsync(`"${adb}" -s "${serial}" shell df -k /sdcard`, { timeout: 3000 });
            const dfLines = dfOut.trim().split('\n');
            if (dfLines.length >= 2) {
              const dfParts = dfLines[dfLines.length - 1].trim().split(/\s+/);
              if (dfParts.length >= 4) {
                const totalKb = parseInt(dfParts[1], 10);
                const availKb = parseInt(dfParts[3], 10);
                if (!isNaN(totalKb)) totalStorageMb = Math.round(totalKb / 1024);
                if (!isNaN(availKb)) availableStorageMb = Math.round(availKb / 1024);
              }
            }

            // Check installed apps
            const { stdout: packagesOut } = await execAsync(`"${adb}" -s "${serial}" shell pm list packages`, { timeout: 4000 });
            installedApps = SOCIAL_APPS.map(app => ({
              ...app,
              isInstalled: packagesOut.includes(`package:${app.packageName}`),
            }));
          } catch (deviceQueryErr: any) {
            logger.warn('AdbService', `Failed partial query on device ${serial}: ${deviceQueryErr.message}`);
          }
        }

        const device = deviceRepo.upsertDevice({
          serial,
          model,
          androidVersion,
          status,
          batteryLevel,
          availableStorageMb,
          totalStorageMb,
          installedApps,
        });

        result.push(device);
      }
    } catch (err: any) {
      logger.warn('AdbService', `Failed to list ADB devices: ${err.message}`);
    }

    return result;
  }

  public async transferFile(
    deviceId: string,
    localFilePath: string,
    targetPhoneDir = 'Movies/SocialEarningsStudio'
  ): Promise<TransferJob> {
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Local file not found: ${localFilePath}`);
    }

    const device = deviceRepo.getAll().find(d => d.id === deviceId || d.serial === deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const stats = fs.statSync(localFilePath);
    const fileName = path.basename(localFilePath);
    const remoteDir = `/sdcard/${targetPhoneDir.replace(/^\/+/, '')}`;
    const remoteDest = `${remoteDir}/${fileName}`;

    const job = deviceRepo.createTransferJob({
      deviceId: device.id,
      sourceFilePath: localFilePath,
      destinationPath: remoteDest,
      fileSize: stats.size,
    });

    const adb = this.getAdbPath();

    try {
      deviceRepo.updateTransferJob(job.id, { status: 'transferring' });

      // Ensure directory exists on device
      await execAsync(`"${adb}" -s "${device.serial}" shell mkdir -p "${remoteDir}"`);

      // Push file
      logger.info('AdbService', `Pushing ${localFilePath} to ${device.serial}:${remoteDest}`);
      await execAsync(`"${adb}" -s "${device.serial}" push "${localFilePath}" "${remoteDest}"`, { timeout: 300000 });

      // Trigger MediaScanner broadcast so video is indexed by gallery apps
      try {
        await execAsync(`"${adb}" -s "${device.serial}" shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://${remoteDest}"`);
      } catch {
        // Broadcast non-fatal on modern Android
      }

      deviceRepo.updateTransferJob(job.id, {
        status: 'completed',
        transferredBytes: stats.size,
      });

      logger.info('AdbService', `Transfer completed: ${remoteDest}`);
      return deviceRepo.getTransferJobById(job.id)!;
    } catch (err: any) {
      logger.error('AdbService', `Transfer failed: ${err.message}`);
      deviceRepo.updateTransferJob(job.id, {
        status: 'failed',
        error: err.message,
      });
      throw err;
    }
  }

  public async captureScreenshot(deviceId: string): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
    const device = deviceRepo.getAll().find(d => d.id === deviceId || d.serial === deviceId);
    if (!device) return { success: false, error: 'Device not found' };

    const adb = this.getAdbPath();
    try {
      // Screencap directly via adb exec-out
      const { stdout } = await execAsync(`"${adb}" -s "${device.serial}" exec-out screencap -p`, {
        encoding: 'buffer',
        maxBuffer: 20 * 1024 * 1024,
      });
      const b64 = (stdout as unknown as Buffer).toString('base64');
      return { success: true, imageBase64: `data:image/png;base64,${b64}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async launchApp(deviceId: string, packageName: string): Promise<boolean> {
    const device = deviceRepo.getAll().find(d => d.id === deviceId || d.serial === deviceId);
    if (!device) return false;

    const adb = this.getAdbPath();
    try {
      await execAsync(`"${adb}" -s "${device.serial}" shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
      return true;
    } catch {
      return false;
    }
  }

  public async startScreenMirror(deviceId: string): Promise<{ success: boolean; message: string }> {
    const device = deviceRepo.getAll().find(d => d.id === deviceId || d.serial === deviceId);
    if (!device) return { success: false, message: 'Device not found' };

    try {
      // Attempt to spawn scrcpy in detached process
      const child = spawn('scrcpy', ['-s', device.serial, '--window-title', `Social Earnings Studio - ${device.model}`], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return { success: true, message: `Started screen mirror with scrcpy for ${device.model}` };
    } catch (err: any) {
      return {
        success: false,
        message: `Could not launch scrcpy: ${err.message}. Ensure scrcpy is installed and added to PATH.`,
      };
    }
  }
}

export const adbService = new AdbService();
