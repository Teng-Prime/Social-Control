import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { adbService } from '../src/main/services/adbService';
import { deviceRepo } from '../src/main/database/repositories/deviceRepository';

describe('Phone Setup & Provisioning Process (1 Phone + 1 Google Account)', () => {
  const testSerial = 'TEST_PIXEL_7_ADB';
  let testDeviceId: string;

  beforeEach(() => {
    const dev = deviceRepo.upsertDevice({
      serial: testSerial,
      model: 'Pixel 7 Pro (Isolated Creator Phone)',
      androidVersion: 'Android 14',
      status: 'connected',
      batteryLevel: 94,
      availableStorageMb: 48000,
      totalStorageMb: 128000,
      installedApps: [],
    });
    testDeviceId = dev.id;
  });

  it('Local Apps Folder: should detect and parse all 8 APK/XAPK packages in apps/ folder', async () => {
    const apps = await adbService.scanLocalAppsFolder();
    expect(apps.length).toBeGreaterThanOrEqual(8);

    const packageNames = apps.map((a) => a.packageName);
    expect(packageNames).toContain('com.expressvpn.vpn');
    expect(packageNames).toContain('com.facebook.katana');
    expect(packageNames).toContain('com.zhiliaoapp.musically');
    expect(packageNames).toContain('com.google.android.youtube');
    expect(packageNames).toContain('com.google.android.apps.youtube.creator');
    expect(packageNames).toContain('com.android.vending');
    expect(packageNames).toContain('com.google.android.gms');
    expect(packageNames).toContain('com.google.android.googlequicksearchbox');

    // Verify format types
    const fbApp = apps.find((a) => a.packageName === 'com.facebook.katana');
    expect(fbApp?.format).toBe('xapk');
    expect(fbApp?.fileSizeBytes).toBeGreaterThan(100 * 1024 * 1024);

    const ytStudioApp = apps.find((a) => a.packageName === 'com.google.android.apps.youtube.creator');
    expect(ytStudioApp?.format).toBe('xapk');

    const vpnApp = apps.find((a) => a.packageName === 'com.expressvpn.vpn');
    expect(vpnApp?.format).toBe('apk');
  });

  it('Root Phone Check: should verify su binary and root privileges', async () => {
    const rootCheck = await adbService.checkRootStatus(testSerial);
    expect(rootCheck.isRooted).toBe(true);
    expect(rootCheck.rootMethod).toBe('su');
    expect(rootCheck.details).toContain('UID 0');
  });

  it('Internet Connectivity: should verify network ping and VPN status', async () => {
    const netCheck = await adbService.checkDeviceInternet(testSerial);
    expect(netCheck.hasInternet).toBe(true);
    expect(netCheck.pingMs).toBeDefined();
    expect(netCheck.vpnActive).toBe(true);
  });

  it('1 Google Account Rule: should verify exactly 1 Google account isolation', async () => {
    const accountCheck = await adbService.checkDeviceGoogleAccounts(testSerial);
    expect(accountCheck.count).toBe(1);
    expect(accountCheck.isOptimal).toBe(true);
    expect(accountCheck.status).toBe('optimal');
    expect(accountCheck.primaryAccount).toBe('creator.studio.channel@gmail.com');
  });

  it('Full Phone Setup Diagnostic: should compute 100% readiness and apps status', async () => {
    deviceRepo.upsertDevice({
      serial: testSerial,
      model: 'Pixel 7 Pro (Isolated Creator Phone)',
      androidVersion: 'Android 14',
      status: 'connected',
      batteryLevel: 94,
      availableStorageMb: 48000,
      totalStorageMb: 128000,
      installedApps: [
        { packageName: 'com.expressvpn.vpn', appName: 'ExpressVPN', isInstalled: true, playStoreUrl: '' },
        { packageName: 'com.facebook.katana', appName: 'Facebook', isInstalled: true, playStoreUrl: '' },
        { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', isInstalled: true, playStoreUrl: '' },
        { packageName: 'com.google.android.youtube', appName: 'YouTube', isInstalled: true, playStoreUrl: '' },
        { packageName: 'com.google.android.apps.youtube.creator', appName: 'YouTube Studio', isInstalled: true, playStoreUrl: '' },
        { packageName: 'com.android.vending', appName: 'Google Play Store', isInstalled: true, playStoreUrl: '' },
        { packageName: 'com.google.android.gms', appName: 'Google Play Services', isInstalled: true, playStoreUrl: '' },
        { packageName: 'com.google.android.googlequicksearchbox', appName: 'Google App', isInstalled: true, playStoreUrl: '' },
      ],
    });

    const diag = await adbService.getPhoneSetupDiagnostic(testDeviceId);
    expect(diag.deviceId).toBe(testDeviceId);
    expect(diag.serial).toBe(testSerial);
    expect(diag.rootStatus.isRooted).toBe(true);
    expect(diag.internetStatus.hasInternet).toBe(true);
    expect(diag.googleAccountStatus.isOptimal).toBe(true);
    expect(diag.appsFolderStatus.totalAppsInFolder).toBeGreaterThanOrEqual(8);
    expect(diag.overallReadiness.score).toBeGreaterThanOrEqual(90);
    expect(diag.overallReadiness.isReady).toBe(true);
  });

  it('Single App & Batch App Installation: should simulate APK installation', async () => {
    const apps = await adbService.scanLocalAppsFolder();
    expect(apps.length).toBeGreaterThan(0);

    // Test install single app
    const singleResult = await adbService.installApp(testDeviceId, apps[0].filePath);
    expect(singleResult.success).toBe(true);
    expect(singleResult.appName).toBe(apps[0].fileName);

    // Test install all apps
    const batchResult = await adbService.installAllApps(testDeviceId);
    expect(batchResult.installed).toBeGreaterThan(0);
  });
});
