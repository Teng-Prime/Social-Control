import { describe, it, expect, beforeEach } from 'vitest';
import { atxAutomationService } from '../src/main/services/atxAutomationService';
import { deviceRepo } from '../src/main/database/repositories/deviceRepository';

describe('ATX Android Automation Engine', () => {
  const testSerial = 'TEST_PIXEL_7_ATX';
  let testDeviceId: string;

  beforeEach(() => {
    const dev = deviceRepo.upsertDevice({
      serial: testSerial,
      model: 'Pixel 7 Pro (Automated Studio Phone)',
      androidVersion: 'Android 14',
      status: 'connected',
      batteryLevel: 98,
      availableStorageMb: 64000,
      totalStorageMb: 128000,
      installedApps: [],
    });
    testDeviceId = dev.id;
  });

  it('ATX Agent Status: should probe and identify active automation mode', async () => {
    const status = await atxAutomationService.getAtxStatus(testDeviceId);
    expect(status.isRunning).toBe(true);
    expect(status.port).toBe(7912);
    expect(status.mode).toBe('simulated');
    expect(status.details).toContain('Simulated Phone Environment');

    const initResult = await atxAutomationService.initAtxAgent(testDeviceId);
    expect(initResult.success).toBe(true);
    expect(initResult.action).toBe('init_atx');
  });

  it('UI Hierarchy XML Parser: should parse raw Android window dump into structured UI nodes', () => {
    const sampleXml = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy rotation="0">
  <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.google.android.youtube" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,0][1080,2400]">
    <node index="0" text="Create" resource-id="com.google.android.youtube:id/creation_tab" class="android.widget.ImageView" content-desc="Create a Short or video" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[468,2240][612,2384]" />
    <node index="1" text="Upload a video" resource-id="com.google.android.youtube:id/text_upload" class="android.widget.TextView" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[100,1800][980,1920]" />
    <node index="2" text="Describe your video" resource-id="com.zhiliaoapp.musically:id/desc_input" class="android.widget.EditText" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[60,300][1020,500]" />
  </node>
</hierarchy>`;

    const elements = atxAutomationService.parseUiHierarchyXml(sampleXml);
    expect(elements.length).toBe(4); // 1 container + 3 child nodes

    const createNode = elements.find((n) => n.text === 'Create');
    expect(createNode).toBeDefined();
    expect(createNode?.resourceId).toBe('com.google.android.youtube:id/creation_tab');
    expect(createNode?.center.x).toBe(540); // (468 + 612) / 2
    expect(createNode?.center.y).toBe(2312); // (2240 + 2384) / 2
    expect(createNode?.clickable).toBe(true);

    const descNode = elements.find((n) => n.text === 'Describe your video');
    expect(descNode?.className).toBe('android.widget.EditText');
    expect(descNode?.center.x).toBe(540);
    expect(descNode?.center.y).toBe(400);
  });

  it('Element Selector Engine: should find elements by text, resourceId, and description', async () => {
    const dump = await atxAutomationService.dumpHierarchy(testDeviceId);
    expect(dump.success).toBe(true);
    expect(dump.elements.length).toBeGreaterThan(0);

    // Find by description
    const createBtn = atxAutomationService.findElement(dump.elements, {
      description: 'Create',
    });
    expect(createBtn).toBeDefined();
    expect(createBtn?.text).toBe('Create');

    // Find by resourceId
    const postBtn = atxAutomationService.findElement(dump.elements, {
      resourceId: 'btn_post',
    });
    expect(postBtn).toBeDefined();
    expect(postBtn?.resourceId).toContain('btn_post');

    // Find by textContains
    const uploadOption = atxAutomationService.findElement(dump.elements, {
      textContains: 'Upload a video',
    });
    expect(uploadOption).toBeDefined();

    // Find by className
    const editBox = atxAutomationService.findElement(dump.elements, {
      className: 'EditText',
    });
    expect(editBox).toBeDefined();
    expect(editBox?.className).toBe('android.widget.EditText');
  });

  it('Core Gesture & Key Actions: should execute tap, swipe, inputText, and keyevents', async () => {
    // Tap
    const tapRes = await atxAutomationService.tap(testDeviceId, 540, 1200);
    expect(tapRes.success).toBe(true);
    expect(tapRes.action).toBe('tap');

    // Swipe
    const swipeRes = await atxAutomationService.swipe(testDeviceId, 540, 1600, 540, 600, 300);
    expect(swipeRes.success).toBe(true);
    expect(swipeRes.action).toBe('swipe');

    // Input Text
    const textRes = await atxAutomationService.inputText(testDeviceId, 'Epic AI Story #Shorts');
    expect(textRes.success).toBe(true);
    expect(textRes.action).toBe('inputText');

    // Hardware Keys
    const keyRes = await atxAutomationService.pressKey(testDeviceId, 'home');
    expect(keyRes.success).toBe(true);
    expect(keyRes.action).toBe('pressKey');

    // Wake and Unlock
    const wakeRes = await atxAutomationService.wakeUpAndUnlock(testDeviceId);
    expect(wakeRes.success).toBe(true);
    expect(wakeRes.action).toBe('wakeUp');
  });

  it('YouTube Hands-Free Automation: should execute the full YouTube upload sequence', async () => {
    const result = await atxAutomationService.automatePublish({
      deviceId: testDeviceId,
      platform: 'youtube',
      videoPath: '/sdcard/Movies/SocialEarningsStudio/test_video.mp4',
      title: 'AI Cyberpunk Detective Ep 1',
      caption: 'The story begins in Neo Tokyo 2099',
      hashtags: ['#shorts', '#cyberpunk', '#ai'],
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe('youtube');
    expect(result.postId).toBeDefined();
    expect(result.postUrl).toContain('https://youtube.com/shorts/');
    expect(result.steps.length).toBeGreaterThanOrEqual(8);

    const stepTitles = result.steps.map((s) => s.step);
    expect(stepTitles).toContain('1. Device Wakeup');
    expect(stepTitles).toContain('2. Launch App');
    expect(stepTitles).toContain('3. Create Menu');
    expect(stepTitles).toContain('4. Video Mode');
    expect(stepTitles).toContain('7. Enter Metadata');
    expect(stepTitles).toContain('8. Final Upload');
  });

  it('TikTok Hands-Free Automation: should execute the full TikTok posting flow', async () => {
    const result = await atxAutomationService.automatePublish({
      deviceId: testDeviceId,
      platform: 'tiktok',
      videoPath: '/sdcard/Movies/SocialEarningsStudio/tiktok_dance.mp4',
      title: 'Viral Dance Challenge',
      caption: 'Can you master this move? Tag a friend!',
      hashtags: ['#dance', '#viral', '#fyp'],
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe('tiktok');
    expect(result.postId).toBeDefined();
    expect(result.postUrl).toContain('https://www.tiktok.com/@creator/video/');
    expect(result.steps.length).toBeGreaterThanOrEqual(8);

    const stepTitles = result.steps.map((s) => s.step);
    expect(stepTitles).toContain('1. Device Wakeup');
    expect(stepTitles).toContain('2. Launch TikTok');
    expect(stepTitles).toContain('3. Post Button (+)');
    expect(stepTitles).toContain('4. Open Upload Album');
    expect(stepTitles).toContain('7. Enter Caption');
    expect(stepTitles).toContain('8. Tap Post');
  });

  it('Facebook Reels Hands-Free Automation: should execute the full Facebook reel posting flow', async () => {
    const result = await atxAutomationService.automatePublish({
      deviceId: testDeviceId,
      platform: 'facebook',
      videoPath: '/sdcard/Movies/SocialEarningsStudio/fb_reel.mp4',
      title: 'Life Lesson Story',
      caption: 'A powerful message for today.',
      hashtags: ['#reels', '#motivation'],
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe('facebook');
    expect(result.postId).toBeDefined();
    expect(result.postUrl).toContain('https://www.facebook.com/watch/?v=');
    expect(result.steps.length).toBeGreaterThanOrEqual(6);

    const stepTitles = result.steps.map((s) => s.step);
    expect(stepTitles).toContain('1. Device Wakeup');
    expect(stepTitles).toContain('2. Launch Facebook');
    expect(stepTitles).toContain('3. Open Reel Creator');
    expect(stepTitles).toContain('4. Select Media');
    expect(stepTitles).toContain('5. Enter Caption');
    expect(stepTitles).toContain('6. Share Reel');
  });

  it('YouTube Google Auto-Login: should automate hands-free Google sign-in for YouTube', async () => {
    const result = await atxAutomationService.autoLoginYouTubeGoogle(
      testDeviceId,
      'creator.channel@gmail.com'
    );

    expect(result.success).toBe(true);
    expect(result.platform).toBe('youtube');
    expect(result.accountEmail).toBe('creator.channel@gmail.com');
    expect(result.message).toContain('creator.channel@gmail.com');
    expect(result.steps.length).toBeGreaterThanOrEqual(4);

    const stepTitles = result.steps.map((s) => s.step);
    expect(stepTitles).toContain('1. Device Wakeup');
    expect(stepTitles).toContain('2. Launch YouTube');
    expect(stepTitles).toContain('3. Locate Account Profile');
    expect(stepTitles).toContain('4. Select Google Account');
    expect(stepTitles).toContain('5. Verify Sign-in');
  });

  it('TikTok Google Auto-Login: should automate hands-free Google sign-in for TikTok', async () => {
    const result = await atxAutomationService.autoLoginTikTokGoogle(
      testDeviceId,
      'tiktok.creator@gmail.com'
    );

    expect(result.success).toBe(true);
    expect(result.platform).toBe('tiktok');
    expect(result.accountEmail).toBe('tiktok.creator@gmail.com');
    expect(result.message).toContain('tiktok.creator@gmail.com');
    expect(result.steps.length).toBeGreaterThanOrEqual(5);

    const stepTitles = result.steps.map((s) => s.step);
    expect(stepTitles).toContain('1. Device Wakeup');
    expect(stepTitles).toContain('2. Launch TikTok');
    expect(stepTitles).toContain('3. Open Profile Tab');
    expect(stepTitles).toContain('4. Tap "Continue with Google"');
    expect(stepTitles).toContain('5. Select Google Account');
    expect(stepTitles).toContain('6. Confirm Authorization');
  });
});
