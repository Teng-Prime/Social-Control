import { appDb } from '../database/db';
import { deviceRepo } from '../database/repositories/deviceRepository';
import { adbService } from './adbService';
import { activityLogService } from './activityLogService';
import { PhoneAppInfo } from '../../shared/types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const SUPPORTED_PUBLISHING_APPS: {
  packageName: string;
  appName: string;
  category: string;
  playStoreUrl: string;
}[] = [
  {
    packageName: 'com.google.android.youtube',
    appName: 'YouTube',
    category: 'Video & Shorts',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.youtube',
  },
  {
    packageName: 'com.zhiliaoapp.musically',
    appName: 'TikTok',
    category: 'Short-Form Video',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically',
  },
  {
    packageName: 'com.facebook.katana',
    appName: 'Facebook',
    category: 'Social Network',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.facebook.katana',
  },
  {
    packageName: 'com.facebook.pages.app',
    appName: 'Meta Business Suite',
    category: 'Page Management & Publishing',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.facebook.pages.app',
  },
];

export class AppInstallationService {
  private getAdbPath(): string {
    return appDb.getSettings().adbPath || 'adb';
  }

  private resolveSerial(deviceId?: string): string | null {
    const devices = deviceRepo.getAll().filter((d) => d.status === 'connected');
    if (!deviceId && devices.length > 0) return devices[0].serial;
    const found = devices.find((d) => d.id === deviceId || d.serial === deviceId);
    return found ? found.serial : deviceId || null;
  }

  /**
   * Get installed status of supported publishing apps on the connected device
   */
  public async getAppStatus(deviceId?: string): Promise<PhoneAppInfo[]> {
    const serial = this.resolveSerial(deviceId);
    if (!serial) {
      return SUPPORTED_PUBLISHING_APPS.map((app) => ({
        ...app,
        isInstalled: false,
        status: 'unknown',
      }));
    }

    if (serial.startsWith('TEST_') || serial.startsWith('phone_virtual')) {
      return SUPPORTED_PUBLISHING_APPS.map((app) => ({
        ...app,
        isInstalled: true,
        installedVersion: 'v32.4.1 (Simulated)',
        status: 'installed',
      }));
    }

    const adb = this.getAdbPath();
    const results: PhoneAppInfo[] = [];

    try {
      const { stdout } = await execAsync(`"${adb}" -s "${serial}" shell pm list packages`, {
        timeout: 6000,
      });
      const installedPackages = stdout
        .split('\n')
        .map((l) => l.trim().replace(/^package:/, ''))
        .filter(Boolean);

      for (const app of SUPPORTED_PUBLISHING_APPS) {
        const isInstalled = installedPackages.includes(app.packageName);
        let installedVersion: string | undefined = undefined;

        if (isInstalled) {
          try {
            const dumpOut = await execAsync(
              `"${adb}" -s "${serial}" shell dumpsys package ${app.packageName} | grep versionName`,
              { timeout: 3000 }
            );
            const m = /versionName=([^\s]+)/.exec(dumpOut.stdout);
            if (m) installedVersion = m[1];
          } catch {}
        }

        results.push({
          ...app,
          isInstalled,
          installedVersion,
          status: isInstalled ? 'installed' : 'not_installed',
        });
      }
    } catch (err: any) {
      activityLogService.log('warn', 'AppInstallation', `Failed to query phone packages: ${err.message}`);
      return SUPPORTED_PUBLISHING_APPS.map((app) => ({
        ...app,
        isInstalled: false,
        status: 'unknown',
      }));
    }

    return results;
  }

  /**
   * Launch official Play Store page on the phone for an app
   */
  public async openPlayStoreListing(
    deviceId: string,
    packageName: string
  ): Promise<{ success: boolean; message: string }> {
    const serial = this.resolveSerial(deviceId);
    if (!serial) {
      return { success: false, message: 'No connected Android phone selected.' };
    }

    if (serial.startsWith('TEST_') || serial.startsWith('phone_virtual')) {
      return { success: true, message: `Opened Play Store for ${packageName} (Simulated)` };
    }

    const adb = this.getAdbPath();
    try {
      // Launch Play Store direct intent
      await execAsync(
        `"${adb}" -s "${serial}" shell am start -a android.intent.action.VIEW -d "market://details?id=${packageName}"`,
        { timeout: 5000 }
      );
      activityLogService.log('info', 'AppInstallation', `Opened Play Store for ${packageName} on ${serial}`);
      return {
        success: true,
        message: `Opened Play Store on your phone. Please review and install ${packageName}.`,
      };
    } catch (err: any) {
      // Fallback to web link
      try {
        await execAsync(
          `"${adb}" -s "${serial}" shell am start -a android.intent.action.VIEW -d "https://play.google.com/store/apps/details?id=${packageName}"`,
          { timeout: 5000 }
        );
        return { success: true, message: `Opened Play Store in browser for ${packageName}.` };
      } catch (fErr: any) {
        return { success: false, message: `Failed to launch Play Store: ${fErr.message}` };
      }
    }
  }

  /**
   * Verify whether an app is installed on the device
   */
  public async verifyInstalled(
    deviceId: string,
    packageName: string
  ): Promise<{ isInstalled: boolean; version?: string }> {
    const serial = this.resolveSerial(deviceId);
    if (!serial) return { isInstalled: false };

    if (serial.startsWith('TEST_') || serial.startsWith('phone_virtual')) {
      return { isInstalled: true, version: 'v32.4.1 (Simulated)' };
    }

    const adb = this.getAdbPath();
    try {
      const { stdout } = await execAsync(
        `"${adb}" -s "${serial}" shell pm list packages ${packageName}`,
        { timeout: 5000 }
      );
      const isInstalled = stdout.includes(`package:${packageName}`);
      let version: string | undefined = undefined;

      if (isInstalled) {
        try {
          const vOut = await execAsync(
            `"${adb}" -s "${serial}" shell dumpsys package ${packageName} | grep versionName`,
            { timeout: 3000 }
          );
          const m = /versionName=([^\s]+)/.exec(vOut.stdout);
          if (m) version = m[1];
        } catch {}
      }

      return { isInstalled, version };
    } catch {
      return { isInstalled: false };
    }
  }

  /**
   * Launch an installed app on the phone screen
   */
  public async launchApp(deviceId: string, packageName: string): Promise<boolean> {
    return adbService.launchApp(deviceId, packageName);
  }
}

export const appInstallationService = new AppInstallationService();
