import { appDb } from '../database/db';
import { deviceRepo } from '../database/repositories/deviceRepository';
import { adbService } from './adbService';
import { activityLogService } from './activityLogService';
import {
  PhoneAppInfo,
  PlayStoreInstallOptions,
  PlayStoreInstallResult,
  PlayStoreBatchResult,
} from '../../shared/types';
import { atxAutomationService } from './atxAutomationService';
import { phoneAccountRepo } from '../database/repositories/phoneAccountRepository';
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
    packageName: 'com.facebook.katana',
    appName: 'Facebook',
    category: 'Social Network & Reels',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.facebook.katana',
  },
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
    packageName: 'com.expressvpn.vpn',
    appName: 'ExpressVPN',
    category: 'Network & Privacy VPN',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.expressvpn.vpn',
  },
  {
    packageName: 'com.google.android.apps.youtube.creator',
    appName: 'YouTube Studio',
    category: 'Publishing & Analytics',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.youtube.creator',
  },
  {
    packageName: 'com.tiktok.creator.studio',
    appName: 'TikTok Studio',
    category: 'Creator Studio & Live',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.tiktok.creator.studio',
  },
  {
    packageName: 'com.facebook.pages.app',
    appName: 'Facebook Business Suite',
    category: 'Page Management & Ads',
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

  /**
   * Auto-remote install an app from Google Play Store:
   * 1. Launches Play Store direct intent for the package.
   * 2. Inspects screen via ATX and clicks "Install" / "Update".
   * 3. Checks if a password prompt appears on screen:
   *    - If password prompt detected and password provided, enters password and confirms.
   *    - If no password prompt appeared, skips smoothly without error ("enter password if need, if dont need skip").
   * 4. Returns installation progress and status.
   */
  public async installAppFromPlayStore(options: PlayStoreInstallOptions): Promise<PlayStoreInstallResult> {
    const serial = this.resolveSerial(options.deviceId);
    const targetApp = SUPPORTED_PUBLISHING_APPS.find((a) => a.packageName === options.packageName);
    const appName = options.appName || targetApp?.appName || options.packageName;

    if (!serial) {
      return {
        packageName: options.packageName,
        appName,
        success: false,
        message: 'No connected Android phone selected.',
        currentStatus: 'failed',
      };
    }

    // Resolve Google password if not passed explicitly
    let password = options.googlePassword;
    if (!password) {
      const googleCred = phoneAccountRepo.getByPlatform('google', options.deviceId);
      if (googleCred && googleCred.password) {
        password = googleCred.password;
      }
    }

    // Check device Google Account status
    const googleAccounts = await adbService.checkDeviceGoogleAccounts(serial);
    if (googleAccounts.count === 0 && !serial.startsWith('TEST_') && !serial.startsWith('phone_virtual')) {
      activityLogService.log(
        'warn',
        'AppInstallation',
        `No Google Account on phone ${serial}. Play Store may require signing in first.`
      );
    }

    // Simulation for tests and virtual phones
    if (serial.startsWith('TEST_') || serial.startsWith('phone_virtual')) {
      const promptDetected = Boolean(options.googlePassword && options.googlePassword.length > 0);
      return {
        packageName: options.packageName,
        appName,
        success: true,
        message: `Successfully automated Play Store installation for ${appName} (Simulated).`,
        passwordPromptDetected: promptDetected,
        passwordEntered: promptDetected,
        currentStatus: 'installed',
      };
    }

    const adb = this.getAdbPath();
    try {
      // Step 1: Launch Play Store direct intent
      try {
        await execAsync(
          `"${adb}" -s "${serial}" shell am start -a android.intent.action.VIEW -d "market://details?id=${options.packageName}"`,
          { timeout: 6000 }
        );
      } catch {
        // Fallback search intent
        await execAsync(
          `"${adb}" -s "${serial}" shell am start -a android.intent.action.VIEW -d "https://play.google.com/store/apps/details?id=${options.packageName}"`,
          { timeout: 6000 }
        );
      }

      // Wait 2500ms for Play Store UI to load
      await new Promise((r) => setTimeout(r, 2500));

      // Step 2: Dump UI hierarchy to locate "Install" button
      let dump = await atxAutomationService.dumpHierarchy(options.deviceId);
      let installClicked = false;

      if (dump.success && dump.elements.length > 0) {
        // Check if already installed (e.g. "Open" / "Uninstall")
        const openNode = dump.elements.find(
          (n) => /^(Open|Mở|Uninstall|Gỡ cài đặt)$/i.test(n.text.trim()) ||
                 n.resourceId.includes('open_button')
        );
        if (openNode) {
          return {
            packageName: options.packageName,
            appName,
            success: true,
            message: `${appName} is already installed on the phone.`,
            passwordPromptDetected: false,
            passwordEntered: false,
            currentStatus: 'installed',
          };
        }

        // Look for Install or Update button
        const installBtn = dump.elements.find(
          (n) =>
            /^(Install|Update|Cài đặt|Cập nhật)$/i.test(n.text.trim()) ||
            n.resourceId.includes('install_button') ||
            n.resourceId.includes('buy_button') ||
            /^(Install|Update|Cài đặt|Cập nhật)$/i.test(n.description.trim())
        );

        if (installBtn) {
          await atxAutomationService.tap(options.deviceId, installBtn.center.x, installBtn.center.y);
          installClicked = true;
        } else {
          // Fallback coordinate tap on standard Play Store install button position
          await atxAutomationService.tap(options.deviceId, 540, 680);
          installClicked = true;
        }
      } else {
        // Tap default Install area if hierarchy dump was unavailable
        await atxAutomationService.tap(options.deviceId, 540, 680);
        installClicked = true;
      }

      // Step 3: Wait 1500ms and check for Google password prompt
      await new Promise((r) => setTimeout(r, 1500));
      let passwordPromptDetected = false;
      let passwordEntered = false;

      dump = await atxAutomationService.dumpHierarchy(options.deviceId);
      if (dump.success && dump.elements.length > 0) {
        // Look for password field or verify prompt
        const passwordField = dump.elements.find(
          (n) =>
            n.resourceId.includes('password') ||
            n.className === 'android.widget.EditText' ||
            /password|mật khẩu|verify it's you/i.test(n.text) ||
            /password|mật khẩu|verify it's you/i.test(n.description)
        );

        if (passwordField) {
          passwordPromptDetected = true;
          if (password) {
            // Tap into password field and input password
            await atxAutomationService.tap(options.deviceId, passwordField.center.x, passwordField.center.y);
            await new Promise((r) => setTimeout(r, 400));
            await atxAutomationService.inputText(options.deviceId, password);
            await new Promise((r) => setTimeout(r, 400));

            // Tap Next/Confirm or press enter key
            const confirmBtn = dump.elements.find((n) =>
              /^(Verify|Next|Tiếp theo|Xác nhận|Confirm|OK)$/i.test(n.text.trim())
            );
            if (confirmBtn) {
              await atxAutomationService.tap(options.deviceId, confirmBtn.center.x, confirmBtn.center.y);
            } else {
              await atxAutomationService.pressKey(options.deviceId, 'enter');
            }
            passwordEntered = true;
          }
        }
      }

      // Step 4: Verify installation
      const verify = await this.verifyInstalled(options.deviceId, options.packageName);

      activityLogService.log(
        'info',
        'AppInstallation',
        `Play Store remote install executed for ${appName} on ${serial}. Status: ${
          verify.isInstalled ? 'installed' : 'installing'
        }`
      );

      return {
        packageName: options.packageName,
        appName,
        success: true,
        message: verify.isInstalled
          ? `${appName} is successfully installed on your phone.`
          : `Play Store download initiated for ${appName}. Google Play is downloading in background.`,
        passwordPromptDetected,
        passwordEntered,
        currentStatus: verify.isInstalled ? 'installed' : 'installing',
      };
    } catch (err: any) {
      activityLogService.log('error', 'AppInstallation', `Play Store install failed for ${options.packageName}: ${err.message}`);
      return {
        packageName: options.packageName,
        appName,
        success: false,
        message: `Failed to install ${appName} from Play Store: ${err.message}`,
        currentStatus: 'failed',
      };
    }
  }

  /**
   * Batch auto-install all 7 main apps from Google Play Store
   */
  public async installAllAppsFromPlayStore(
    deviceId: string,
    googlePassword?: string
  ): Promise<PlayStoreBatchResult> {
    const results: PlayStoreInstallResult[] = [];
    let successful = 0;
    let failed = 0;

    // Resolve password
    let password = googlePassword;
    if (!password) {
      const googleCred = phoneAccountRepo.getByPlatform('google', deviceId);
      if (googleCred && googleCred.password) {
        password = googleCred.password;
      }
    }

    for (const app of SUPPORTED_PUBLISHING_APPS) {
      try {
        const res = await this.installAppFromPlayStore({
          deviceId,
          packageName: app.packageName,
          appName: app.appName,
          googlePassword: password,
        });
        results.push(res);
        if (res.success) successful++;
        else failed++;
      } catch (err: any) {
        results.push({
          packageName: app.packageName,
          appName: app.appName,
          success: false,
          message: err.message,
          currentStatus: 'failed',
        });
        failed++;
      }
    }

    return {
      total: SUPPORTED_PUBLISHING_APPS.length,
      successful,
      failed,
      results,
    };
  }
}

export const appInstallationService = new AppInstallationService();
