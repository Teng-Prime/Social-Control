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

  it('Play Store Apps Definitions: should define all 7 target publishing and utility apps', async () => {
    const { SUPPORTED_PUBLISHING_APPS } = await import('../src/main/services/appInstallationService');
    expect(SUPPORTED_PUBLISHING_APPS.length).toBe(7);

    const pkgs = SUPPORTED_PUBLISHING_APPS.map((a) => a.packageName);
    expect(pkgs).toContain('com.facebook.katana'); // Facebook
    expect(pkgs).toContain('com.google.android.youtube'); // YouTube
    expect(pkgs).toContain('com.zhiliaoapp.musically'); // TikTok
    expect(pkgs).toContain('com.expressvpn.vpn'); // ExpressVPN
    expect(pkgs).toContain('com.google.android.apps.youtube.creator'); // YouTube Studio
    expect(pkgs).toContain('com.tiktok.creator.studio'); // TikTok Studio
    expect(pkgs).toContain('com.facebook.pages.app'); // Facebook Business Suite
  });

  it('Play Store Remote Install: should support automated install with password bypass or entry', async () => {
    const { appInstallationService } = await import('../src/main/services/appInstallationService');

    // 1. Install without password (skip if not needed)
    const resNoPass = await appInstallationService.installAppFromPlayStore({
      deviceId: testDeviceId,
      packageName: 'com.zhiliaoapp.musically',
      appName: 'TikTok',
    });
    expect(resNoPass.success).toBe(true);
    expect(resNoPass.currentStatus).toBe('installed');
    expect(resNoPass.passwordPromptDetected).toBe(false);

    // 2. Install with password provided (enters password if prompted)
    const resWithPass = await appInstallationService.installAppFromPlayStore({
      deviceId: testDeviceId,
      packageName: 'com.google.android.youtube',
      appName: 'YouTube',
      googlePassword: 'TestGooglePassword123!',
    });
    expect(resWithPass.success).toBe(true);
    expect(resWithPass.passwordPromptDetected).toBe(true);
    expect(resWithPass.passwordEntered).toBe(true);

    // 3. Batch install all 7 apps from Play Store
    const batchRes = await appInstallationService.installAllAppsFromPlayStore(testDeviceId, 'TestPass123!');
    expect(batchRes.total).toBe(7);
    expect(batchRes.successful).toBe(7);
    expect(batchRes.failed).toBe(0);
  });

  it('Phone Account Credentials Table: should save and retrieve Google, Facebook, TikTok, and YouTube credentials', async () => {
    const { phoneAccountRepo } = await import('../src/main/database/repositories/phoneAccountRepository');

    // 1. Google (gmail, pass, 2fa)
    const googleCred = phoneAccountRepo.save({
      deviceId: testDeviceId,
      platform: 'google',
      identifier: 'creator.channel@gmail.com',
      password: 'GooglePassSecure2026',
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    });
    expect(googleCred.platform).toBe('google');
    expect(googleCred.identifier).toBe('creator.channel@gmail.com');
    expect(googleCred.password).toBe('GooglePassSecure2026');

    // 2. Facebook (uid, pass, 2fa)
    const fbCred = phoneAccountRepo.save({
      deviceId: testDeviceId,
      platform: 'facebook',
      identifier: '100089234821',
      password: 'FBPassword2026!',
      twoFactorSecret: 'HXDMVJECJJWSRZ3U',
    });
    expect(fbCred.platform).toBe('facebook');
    expect(fbCred.identifier).toBe('100089234821');

    // 3. TikTok (gmail, pass, 2fa)
    const ttCred = phoneAccountRepo.save({
      deviceId: testDeviceId,
      platform: 'tiktok',
      identifier: 'tiktok.creator@gmail.com',
      password: 'TikTokSecretPass',
      twoFactorSecret: 'KRSXG5CTMVRXEZLU',
    });
    expect(ttCred.platform).toBe('tiktok');

    // 4. YouTube (gmail, pass, 2fa)
    const ytCred = phoneAccountRepo.save({
      deviceId: testDeviceId,
      platform: 'youtube',
      identifier: 'channel.yt@gmail.com',
      password: 'YTPasswordPass',
      twoFactorSecret: 'OBZXG33QNZ2W423M',
    });
    expect(ytCred.platform).toBe('youtube');

    // Retrieve all for device
    const allCreds = phoneAccountRepo.getAll(testDeviceId);
    expect(allCreds.length).toBeGreaterThanOrEqual(4);

    const retrievedGoogle = phoneAccountRepo.getByPlatform('google', testDeviceId);
    expect(retrievedGoogle?.identifier).toBe('creator.channel@gmail.com');
  });

  it('Multi-Device Account Isolation: 1 Phone = 1 Config (Phone 1 and Phone 2 have separate accounts)', async () => {
    const { phoneAccountRepo } = await import('../src/main/database/repositories/phoneAccountRepository');
    const { atxAutomationService } = await import('../src/main/services/atxAutomationService');

    const phone1Id = 'device_pixel_phone_1';
    const phone2Id = 'device_samsung_phone_2';

    // 1. Phone 1 saves distinct accounts
    phoneAccountRepo.save({
      deviceId: phone1Id,
      platform: 'google',
      identifier: 'phone1.creator@gmail.com',
      password: 'PassPhone1Google',
      twoFactorSecret: '2FAPHONE1GOOGLE',
    });
    phoneAccountRepo.save({
      deviceId: phone1Id,
      platform: 'facebook',
      identifier: 'phone1_fb_uid_1111',
      password: 'PassPhone1FB',
    });
    phoneAccountRepo.save({
      deviceId: phone1Id,
      platform: 'tiktok',
      identifier: 'phone1_tiktok@gmail.com',
      password: 'PassPhone1TikTok',
    });
    phoneAccountRepo.save({
      deviceId: phone1Id,
      platform: 'youtube',
      identifier: 'phone1_yt_channel@gmail.com',
      password: 'PassPhone1YouTube',
    });

    // 2. Phone 2 saves different distinct accounts
    phoneAccountRepo.save({
      deviceId: phone2Id,
      platform: 'google',
      identifier: 'phone2.creator@gmail.com',
      password: 'PassPhone2Google',
      twoFactorSecret: '2FAPHONE2GOOGLE',
    });
    phoneAccountRepo.save({
      deviceId: phone2Id,
      platform: 'facebook',
      identifier: 'phone2_fb_uid_2222',
      password: 'PassPhone2FB',
    });
    phoneAccountRepo.save({
      deviceId: phone2Id,
      platform: 'tiktok',
      identifier: 'phone2_tiktok@gmail.com',
      password: 'PassPhone2TikTok',
    });
    phoneAccountRepo.save({
      deviceId: phone2Id,
      platform: 'youtube',
      identifier: 'phone2_yt_channel@gmail.com',
      password: 'PassPhone2YouTube',
    });

    // 3. Verify Phone 1 accounts
    const phone1Accounts = phoneAccountRepo.getAll(phone1Id);
    expect(phone1Accounts.length).toBe(4);
    const p1Google = phoneAccountRepo.getByPlatform('google', phone1Id);
    const p1Fb = phoneAccountRepo.getByPlatform('facebook', phone1Id);
    const p1Tt = phoneAccountRepo.getByPlatform('tiktok', phone1Id);
    const p1Yt = phoneAccountRepo.getByPlatform('youtube', phone1Id);

    expect(p1Google?.identifier).toBe('phone1.creator@gmail.com');
    expect(p1Fb?.identifier).toBe('phone1_fb_uid_1111');
    expect(p1Tt?.identifier).toBe('phone1_tiktok@gmail.com');
    expect(p1Yt?.identifier).toBe('phone1_yt_channel@gmail.com');

    // 4. Verify Phone 2 accounts
    const phone2Accounts = phoneAccountRepo.getAll(phone2Id);
    expect(phone2Accounts.length).toBe(4);
    const p2Google = phoneAccountRepo.getByPlatform('google', phone2Id);
    const p2Fb = phoneAccountRepo.getByPlatform('facebook', phone2Id);
    const p2Tt = phoneAccountRepo.getByPlatform('tiktok', phone2Id);
    const p2Yt = phoneAccountRepo.getByPlatform('youtube', phone2Id);

    expect(p2Google?.identifier).toBe('phone2.creator@gmail.com');
    expect(p2Fb?.identifier).toBe('phone2_fb_uid_2222');
    expect(p2Tt?.identifier).toBe('phone2_tiktok@gmail.com');
    expect(p2Yt?.identifier).toBe('phone2_yt_channel@gmail.com');

    // 5. Verify Phone 1 accounts did not leak to Phone 2 and vice-versa
    expect(phone1Accounts.some((a) => a.identifier.includes('phone2'))).toBe(false);
    expect(phone2Accounts.some((a) => a.identifier.includes('phone1'))).toBe(false);

    // 6. Verify ATX automation targets each phone's specific Google account
    const yt1Login = await atxAutomationService.autoLoginYouTubeGoogle(phone1Id);
    expect(yt1Login.accountEmail).toBe('phone1_yt_channel@gmail.com');

    const yt2Login = await atxAutomationService.autoLoginYouTubeGoogle(phone2Id);
    expect(yt2Login.accountEmail).toBe('phone2_yt_channel@gmail.com');

    const tt1Login = await atxAutomationService.autoLoginTikTokGoogle(phone1Id);
    expect(tt1Login.accountEmail).toBe('phone1_tiktok@gmail.com');

    const tt2Login = await atxAutomationService.autoLoginTikTokGoogle(phone2Id);
    expect(tt2Login.accountEmail).toBe('phone2_tiktok@gmail.com');
  });
});
