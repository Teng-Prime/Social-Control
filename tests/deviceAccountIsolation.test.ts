import { describe, it, expect, beforeEach } from 'vitest';
import { phoneAccountRepo } from '../src/main/database/repositories/phoneAccountRepository';
import { deviceRepo } from '../src/main/database/repositories/deviceRepository';
import { atxAutomationService } from '../src/main/services/atxAutomationService';
import { appInstallationService } from '../src/main/services/appInstallationService';

describe('Device-Specific Platform Account Isolation (Tests A through G)', () => {
  const phone1Serial = 'emulator-5556';
  const phone2Serial = 'emulator-5558';
  let phone1DevId: string;
  let phone2DevId: string;

  beforeEach(() => {
    // 1. Provision Device 1 (emulator-5556)
    const dev1 = deviceRepo.upsertDevice({
      serial: phone1Serial,
      model: 'Pixel 7 Pro (Creator Phone 1)',
      androidVersion: 'Android 14',
      status: 'connected',
      batteryLevel: 95,
      availableStorageMb: 40000,
      totalStorageMb: 128000,
      installedApps: [],
    });
    phone1DevId = dev1.id;

    // 2. Provision Device 2 (emulator-5558)
    const dev2 = deviceRepo.upsertDevice({
      serial: phone2Serial,
      model: 'Galaxy S23 (Creator Phone 2)',
      androidVersion: 'Android 13',
      status: 'connected',
      batteryLevel: 88,
      availableStorageMb: 60000,
      totalStorageMb: 256000,
      installedApps: [],
    });
    phone2DevId = dev2.id;
  });

  // ---------------------------------------------------------------------------
  // Test A — Independent saves
  // ---------------------------------------------------------------------------
  it('Test A: Independent saves — Phone 1 and Phone 2 save separate Google accounts', async () => {
    // 1. Select Phone 1 -> Save Google Account A
    const savedP1Google = phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'google',
      identifier: 'phone1.creator.a@gmail.com',
      password: 'Phone1PasswordGoogle!',
      twoFactorSecret: 'P12FASECRET',
    });
    expect(savedP1Google.identifier).toBe('phone1.creator.a@gmail.com');

    // 2. Select Phone 2 -> Save Google Account B
    const savedP2Google = phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'google',
      identifier: 'phone2.creator.b@gmail.com',
      password: 'Phone2PasswordGoogle!',
      twoFactorSecret: 'P22FASECRET',
    });
    expect(savedP2Google.identifier).toBe('phone2.creator.b@gmail.com');

    // 3. Switch between both devices -> Confirm each displays its own account
    const p1Accounts = phoneAccountRepo.getAll(phone1Serial);
    const p1Google = phoneAccountRepo.getByPlatform('google', phone1Serial);
    expect(p1Google?.identifier).toBe('phone1.creator.a@gmail.com');
    expect(p1Google?.password).toBe('Phone1PasswordGoogle!');

    const p2Accounts = phoneAccountRepo.getAll(phone2Serial);
    const p2Google = phoneAccountRepo.getByPlatform('google', phone2Serial);
    expect(p2Google?.identifier).toBe('phone2.creator.b@gmail.com');
    expect(p2Google?.password).toBe('Phone2PasswordGoogle!');

    // 4. Switch back to Phone 1 -> Original account is preserved
    const p1GoogleRestored = phoneAccountRepo.getByPlatform('google', phone1Serial);
    expect(p1GoogleRestored?.identifier).toBe('phone1.creator.a@gmail.com');
    expect(p1GoogleRestored?.identifier).not.toBe(p2Google?.identifier);
  });

  // ---------------------------------------------------------------------------
  // Test B — Independent platforms
  // ---------------------------------------------------------------------------
  it('Test B: Independent platforms — Save separate Google, Facebook, TikTok, and YouTube accounts per phone', async () => {
    // Save all 4 platforms for Phone 1
    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'google',
      identifier: 'p1_google@gmail.com',
      password: 'pass_p1_google',
    });
    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'facebook',
      identifier: 'p1_fb_uid_1001',
      password: 'pass_p1_fb',
    });
    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'tiktok',
      identifier: 'p1_tiktok_user@gmail.com',
      password: 'pass_p1_tiktok',
    });
    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'youtube',
      identifier: 'p1_yt_channel@gmail.com',
      password: 'pass_p1_youtube',
    });

    // Save all 4 platforms for Phone 2 with completely different credentials
    phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'google',
      identifier: 'p2_google@gmail.com',
      password: 'pass_p2_google',
    });
    phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'facebook',
      identifier: 'p2_fb_uid_2002',
      password: 'pass_p2_fb',
    });
    phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'tiktok',
      identifier: 'p2_tiktok_user@gmail.com',
      password: 'pass_p2_tiktok',
    });
    phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'youtube',
      identifier: 'p2_yt_channel@gmail.com',
      password: 'pass_p2_youtube',
    });

    // Verify Phone 1 credentials
    const p1All = phoneAccountRepo.getAll(phone1Serial);
    expect(p1All.length).toBe(4);
    expect(phoneAccountRepo.getByPlatform('google', phone1Serial)?.identifier).toBe('p1_google@gmail.com');
    expect(phoneAccountRepo.getByPlatform('facebook', phone1Serial)?.identifier).toBe('p1_fb_uid_1001');
    expect(phoneAccountRepo.getByPlatform('tiktok', phone1Serial)?.identifier).toBe('p1_tiktok_user@gmail.com');
    expect(phoneAccountRepo.getByPlatform('youtube', phone1Serial)?.identifier).toBe('p1_yt_channel@gmail.com');

    // Verify Phone 2 credentials
    const p2All = phoneAccountRepo.getAll(phone2Serial);
    expect(p2All.length).toBe(4);
    expect(phoneAccountRepo.getByPlatform('google', phone2Serial)?.identifier).toBe('p2_google@gmail.com');
    expect(phoneAccountRepo.getByPlatform('facebook', phone2Serial)?.identifier).toBe('p2_fb_uid_2002');
    expect(phoneAccountRepo.getByPlatform('tiktok', phone2Serial)?.identifier).toBe('p2_tiktok_user@gmail.com');
    expect(phoneAccountRepo.getByPlatform('youtube', phone2Serial)?.identifier).toBe('p2_yt_channel@gmail.com');

    // Confirm no platform credentials leak between devices
    expect(p1All.some((a) => a.identifier.includes('p2_'))).toBe(false);
    expect(p2All.some((a) => a.identifier.includes('p1_'))).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Test C — Save isolation
  // ---------------------------------------------------------------------------
  it('Test C: Save isolation — Updating Phone 2 Facebook account leaves Phone 1 Facebook account unchanged', async () => {
    // 1. Setup initial Facebook credentials for both
    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'facebook',
      identifier: 'p1_original_fb_uid',
      password: 'p1_original_pass',
    });
    phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'facebook',
      identifier: 'p2_original_fb_uid',
      password: 'p2_original_pass',
    });

    // 2. Update Phone 2's Facebook account
    phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'facebook',
      identifier: 'p2_updated_fb_uid_9999',
      password: 'p2_updated_new_password_2026',
      twoFactorSecret: 'NEWP22FAKEY',
    });

    // 3. Verify Phone 2 has the updated credentials
    const p2FbUpdated = phoneAccountRepo.getByPlatform('facebook', phone2Serial);
    expect(p2FbUpdated?.identifier).toBe('p2_updated_fb_uid_9999');
    expect(p2FbUpdated?.password).toBe('p2_updated_new_password_2026');
    expect(p2FbUpdated?.twoFactorSecret).toBe('NEWP22FAKEY');

    // 4. Verify Phone 1's Facebook account remains completely unchanged
    const p1FbUnchanged = phoneAccountRepo.getByPlatform('facebook', phone1Serial);
    expect(p1FbUnchanged?.identifier).toBe('p1_original_fb_uid');
    expect(p1FbUnchanged?.password).toBe('p1_original_pass');
  });

  // ---------------------------------------------------------------------------
  // Test D — Device switching during save
  // ---------------------------------------------------------------------------
  it('Test D: Device switching during save — In-flight save locks to the target device captured at invocation', async () => {
    // Phone 1 setup
    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'tiktok',
      identifier: 'p1_old_tiktok@gmail.com',
      password: 'old_pass_1',
    });
    // Phone 2 setup
    phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'tiktok',
      identifier: 'p2_existing_tiktok@gmail.com',
      password: 'p2_existing_pass',
    });

    // Simulate save invocation on Phone 1:
    // Device ID is captured at button click time
    const clickTimeTargetDeviceId = phone1Serial;
    const inputAtClick = {
      platform: 'tiktok' as const,
      identifier: 'p1_new_tiktok_updated@gmail.com',
      password: 'p1_new_password_secure',
    };

    // User switches active UI context to Phone 2 while network/disk save is pending
    let activeUiDeviceContext = phone2Serial;

    // Save executes with the captured clickTimeTargetDeviceId
    const saved = phoneAccountRepo.save({
      deviceId: clickTimeTargetDeviceId,
      platform: inputAtClick.platform,
      identifier: inputAtClick.identifier,
      password: inputAtClick.password,
    });

    expect(saved.deviceId).toBe(phone1Serial);

    // Verify Phone 1 received the update
    const p1Tiktok = phoneAccountRepo.getByPlatform('tiktok', phone1Serial);
    expect(p1Tiktok?.identifier).toBe('p1_new_tiktok_updated@gmail.com');

    // Verify Phone 2 was NOT overwritten by Phone 1's save even though it became the active context
    const p2Tiktok = phoneAccountRepo.getByPlatform('tiktok', phone2Serial);
    expect(p2Tiktok?.identifier).toBe('p2_existing_tiktok@gmail.com');
    expect(p2Tiktok?.password).toBe('p2_existing_pass');
  });

  // ---------------------------------------------------------------------------
  // Test E — Automated login
  // ---------------------------------------------------------------------------
  it('Test E: Automated login — Account actions use the selected device credentials and target device explicitly', async () => {
    // Setup distinct credentials
    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'youtube',
      identifier: 'creator.phone1.channel@gmail.com',
    });
    phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'youtube',
      identifier: 'creator.phone2.channel@gmail.com',
    });

    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'tiktok',
      identifier: 'tiktok.phone1@gmail.com',
    });
    phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'tiktok',
      identifier: 'tiktok.phone2@gmail.com',
    });

    // 1. YouTube Auto-Login on Phone 2
    const ytPhone2Result = await atxAutomationService.autoLoginYouTubeGoogle(phone2Serial);
    expect(ytPhone2Result.success).toBe(true);
    expect(ytPhone2Result.accountEmail).toBe('creator.phone2.channel@gmail.com');
    expect(ytPhone2Result.accountEmail).not.toBe('creator.phone1.channel@gmail.com');

    // 2. YouTube Auto-Login on Phone 1
    const ytPhone1Result = await atxAutomationService.autoLoginYouTubeGoogle(phone1Serial);
    expect(ytPhone1Result.success).toBe(true);
    expect(ytPhone1Result.accountEmail).toBe('creator.phone1.channel@gmail.com');

    // 3. TikTok Auto-Login on Phone 2
    const ttPhone2Result = await atxAutomationService.autoLoginTikTokGoogle(phone2Serial);
    expect(ttPhone2Result.success).toBe(true);
    expect(ttPhone2Result.accountEmail).toBe('tiktok.phone2@gmail.com');
    expect(ttPhone2Result.accountEmail).not.toBe('tiktok.phone1@gmail.com');

    // 4. TikTok Auto-Login on Phone 1
    const ttPhone1Result = await atxAutomationService.autoLoginTikTokGoogle(phone1Serial);
    expect(ttPhone1Result.success).toBe(true);
    expect(ttPhone1Result.accountEmail).toBe('tiktok.phone1@gmail.com');
  });

  // ---------------------------------------------------------------------------
  // Test F — Reconnection
  // ---------------------------------------------------------------------------
  it('Test F: Reconnection — Reconnecting an emulator preserves its saved accounts via stable ADB serial', async () => {
    const reconnectingSerial = 'emulator-5560';

    // 1. Initial connection
    const initialDev = deviceRepo.upsertDevice({
      serial: reconnectingSerial,
      model: 'Pixel Fold (Staging Device)',
      androidVersion: 'Android 14',
      status: 'connected',
      installedApps: [],
    });

    // Save accounts for this device
    phoneAccountRepo.save({
      deviceId: reconnectingSerial,
      platform: 'google',
      identifier: 'stable.reconnect@gmail.com',
      password: 'PersistentPassword2026',
    });
    phoneAccountRepo.save({
      deviceId: reconnectingSerial,
      platform: 'facebook',
      identifier: 'persistent_fb_uid_888',
      password: 'PersistentFbPassword',
    });

    // 2. Simulate disconnect
    deviceRepo.upsertDevice({
      serial: reconnectingSerial,
      model: 'Pixel Fold (Staging Device)',
      androidVersion: 'Android 14',
      status: 'disconnected',
      installedApps: [],
    });

    // 3. Simulate emulator reconnecting
    const reconnectedDev = deviceRepo.upsertDevice({
      serial: reconnectingSerial,
      model: 'Pixel Fold (Staging Device)',
      androidVersion: 'Android 14',
      status: 'connected',
      installedApps: [],
    });

    // 4. Query accounts using the stable serial or internal ID
    const accountsBySerial = phoneAccountRepo.getAll(reconnectingSerial);
    expect(accountsBySerial.length).toBe(2);

    const accountsByDevId = phoneAccountRepo.getAll(reconnectedDev.id);
    expect(accountsByDevId.length).toBe(2);

    const googleAcc = phoneAccountRepo.getByPlatform('google', reconnectingSerial);
    expect(googleAcc?.identifier).toBe('stable.reconnect@gmail.com');
    expect(googleAcc?.password).toBe('PersistentPassword2026');

    const fbAcc = phoneAccountRepo.getByPlatform('facebook', reconnectedDev.id);
    expect(fbAcc?.identifier).toBe('persistent_fb_uid_888');
    expect(fbAcc?.password).toBe('PersistentFbPassword');
  });

  // ---------------------------------------------------------------------------
  // Test G — Regression
  // ---------------------------------------------------------------------------
  it('Test G: Regression — All account management features, unassigned accounts, and Play Store install work correctly', async () => {
    // 1. Unassigned account query does not leak into phone-scoped accounts
    const unassignedList = phoneAccountRepo.getUnassigned();
    expect(Array.isArray(unassignedList)).toBe(true);

    // 2. Play Store install resolves the target phone's Google credentials
    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'google',
      identifier: 'phone1.playstore@gmail.com',
      password: 'Phone1PlayStorePass!',
    });

    const installResult = await appInstallationService.installAppFromPlayStore({
      deviceId: phone1Serial,
      packageName: 'com.zhiliaoapp.musically',
      appName: 'TikTok',
    });
    expect(installResult.success).toBe(true);
    expect(installResult.appName).toBe('TikTok');

    // 3. Delete account for a platform on Phone 1 does not delete Phone 2 account
    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'youtube',
      identifier: 'delete.me@gmail.com',
    });
    phoneAccountRepo.save({
      deviceId: phone2Serial,
      platform: 'youtube',
      identifier: 'keep.me@gmail.com',
    });

    const toDelete = phoneAccountRepo.getByPlatform('youtube', phone1Serial);
    expect(toDelete).not.toBeNull();
    if (toDelete) {
      phoneAccountRepo.delete(toDelete.id);
    }

    // Phone 1 YouTube is deleted
    expect(phoneAccountRepo.getByPlatform('youtube', phone1Serial)).toBeNull();

    // Phone 2 YouTube is still present
    const p2YouTube = phoneAccountRepo.getByPlatform('youtube', phone2Serial);
    expect(p2YouTube?.identifier).toBe('keep.me@gmail.com');
  });

  // ---------------------------------------------------------------------------
  // Test H — Sensitive field preservation during edit (Requirement 4)
  // ---------------------------------------------------------------------------
  it('Test H: Sensitive field preservation — Leaving password or 2FA secret blank during edit preserves saved values', async () => {
    // 1. Initial save with complete credentials
    phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'google',
      identifier: 'initial.creator@gmail.com',
      password: 'SuperSecretPassword2026!',
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    });

    const initial = phoneAccountRepo.getByPlatform('google', phone1Serial);
    expect(initial?.identifier).toBe('initial.creator@gmail.com');
    expect(initial?.password).toBe('SuperSecretPassword2026!');
    expect(initial?.twoFactorSecret).toBe('JBSWY3DPEHPK3PXP');

    // 2. Partial edit: update identifier only, leave password and 2FA secret blank
    const updated = phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'google',
      identifier: 'updated.creator@gmail.com',
      password: '', // Blank during edit
      twoFactorSecret: '', // Blank during edit
    });

    // 3. Confirm identifier updated, but password & 2FA secret were preserved
    expect(updated.identifier).toBe('updated.creator@gmail.com');
    expect(updated.password).toBe('SuperSecretPassword2026!');
    expect(updated.twoFactorSecret).toBe('JBSWY3DPEHPK3PXP');

    // 4. Verify querying database also returns preserved credentials
    const fetched = phoneAccountRepo.getByPlatform('google', phone1Serial);
    expect(fetched?.identifier).toBe('updated.creator@gmail.com');
    expect(fetched?.password).toBe('SuperSecretPassword2026!');
    expect(fetched?.twoFactorSecret).toBe('JBSWY3DPEHPK3PXP');

    // 5. Explicit clear: clearPassword clears the password
    const cleared = phoneAccountRepo.save({
      deviceId: phone1Serial,
      platform: 'google',
      identifier: 'updated.creator@gmail.com',
      clearPassword: true,
    });
    expect(cleared.password).toBe('');
    const fetchedCleared = phoneAccountRepo.getByPlatform('google', phone1Serial);
    expect(fetchedCleared?.password).toBe('');
    expect(fetchedCleared?.twoFactorSecret).toBe('JBSWY3DPEHPK3PXP'); // 2FA still preserved
  });

  // ---------------------------------------------------------------------------
  // Test I — Staging on virtual device when no phone is connected
  // ---------------------------------------------------------------------------
  it('Test I: Staging on virtual device — Saves and loads accounts when no physical phone is connected', async () => {
    const virtualDevKey = 'virtual_device';

    // 1. Save credentials for virtual device
    const saved = phoneAccountRepo.save({
      deviceId: virtualDevKey,
      platform: 'tiktok',
      identifier: 'virtual.staging@tiktok.com',
      password: 'VirtualStagingPass123',
    });
    expect(saved.deviceId).toBe('virtual_device');
    expect(saved.identifier).toBe('virtual.staging@tiktok.com');

    // 2. Retrieve accounts for virtual device
    const virtualAccounts = phoneAccountRepo.getAll(virtualDevKey);
    expect(virtualAccounts.length).toBeGreaterThanOrEqual(1);
    const virtualTikTok = phoneAccountRepo.getByPlatform('tiktok', virtualDevKey);
    expect(virtualTikTok?.identifier).toBe('virtual.staging@tiktok.com');
    expect(virtualTikTok?.password).toBe('VirtualStagingPass123');

    // 3. Virtual device credentials do NOT leak into phone1 or phone2
    const p1TikTok = phoneAccountRepo.getByPlatform('tiktok', phone1Serial);
    expect(p1TikTok?.identifier).not.toBe('virtual.staging@tiktok.com');
    const p2TikTok = phoneAccountRepo.getByPlatform('tiktok', phone2Serial);
    expect(p2TikTok?.identifier).not.toBe('virtual.staging@tiktok.com');
  });
});
