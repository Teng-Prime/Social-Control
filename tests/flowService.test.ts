import { describe, it, expect } from 'vitest';
import { FlowService } from '../src/main/services/flowService';

describe('FlowService & Script / Caption Generation', () => {
  const service = new FlowService();

  it('should generate structured 5-part script with hook, scenes, climax, and ending', async () => {
    const script = await service.generateScript({
      prompt: 'A hidden safe discovered behind an old library painting',
      genre: 'mystery',
      targetDuration: 30,
      character: {
        id: 'char_1',
        name: 'Alex Vance',
        appearance: 'Caucasian male, brown hair',
        clothing: 'Leather trench coat',
        ageRange: '30-35',
        personality: 'Analytical',
        voice: 'en-US-Standard-B',
        visualStyle: 'Moody film noir',
        isLocked: true,
        references: [],
        createdAt: '',
        updatedAt: '',
      },
    });

    expect(script.hook).toBeDefined();
    expect(script.hook.length).toBeGreaterThan(10);
    expect(script.scenes.length).toBeGreaterThanOrEqual(3);
    expect(script.climax).toBeDefined();
    expect(script.ending).toBeDefined();

    for (const scene of script.scenes) {
      expect(scene.prompt).toContain('Alex Vance');
      expect(scene.scriptText).toBeDefined();
      expect(scene.duration).toBeGreaterThan(0);
    }
  });

  it('should generate platform-compliant captions and hashtags', async () => {
    const res = await service.generateCaptions({
      videoTitle: 'The Secret Vault',
      targetPlatform: 'tiktok',
      targetAudience: 'Mystery fans',
      language: 'en',
      tone: 'engaging',
      keywords: ['secret', 'vault', 'mystery'],
      callToAction: 'Follow for part 2!',
    });

    expect(res.variations.length).toBeGreaterThanOrEqual(1);
    const top = res.variations[0];
    expect(top.title.length).toBeLessThanOrEqual(100);
    expect(top.hashtags.length).toBeGreaterThan(2);
    expect(top.caption).toContain('#secret');
  });

  it('should manage Google Flow connection lifecycle with honest status verification', async () => {
    // 1. Initial status should be not_connected
    await service.disconnectGoogleFlow();
    const initial = service.getFlowConnectionStatus();
    expect(initial.officialUrl).toBe('https://flow.google/');
    expect(initial.status).toBe('not_connected');
    expect(initial.statusLabel).toBe('Not Connected');
    expect(initial.connectedEmail).toBeUndefined();

    // 2. Connect Google Flow opens official URL and transitions to opened_unverified
    const connected = await service.connectGoogleFlow();
    expect(connected.status).toBe('opened_unverified');
    expect(connected.statusLabel).toBe('Flow opened — connection not verified');
    expect(connected.officialUrl).toBe('https://flow.google/');
    expect(connected.hasProgrammaticApi).toBe(false);
    expect(connected.connectedEmail).toBeUndefined();

    // 3. Check Connection when only browser was opened without programmatic API
    // Must NOT falsely claim connected!
    const checked = await service.checkFlowConnection();
    expect(checked.status).toBe('opened_unverified');
    expect(checked.statusLabel).toBe('Flow opened — connection not verified');
    expect(checked.hasProgrammaticApi).toBe(false);
    expect(checked.notes).toContain('Google currently does not provide a public third-party REST API');

    // 4. Disconnect Google Flow resets status
    const disconnected = await service.disconnectGoogleFlow();
    expect(disconnected.status).toBe('not_connected');
    expect(disconnected.statusLabel).toBe('Not Connected');
  });

  it('should support Continue with Google SSO and maintain verified connection status', async () => {
    await service.disconnectGoogleFlow();

    // 1. Connect via Google SSO
    const ssoResult = await service.connectGoogleFlow({
      mode: 'google_sso',
      email: 'creator.studio@gmail.com',
    });
    expect(ssoResult.status).toBe('connected');
    expect(ssoResult.connectedEmail).toBe('creator.studio@gmail.com');
    expect(ssoResult.hasProgrammaticApi).toBe(true);

    // 2. Check connection preserves connected state
    const checked = await service.checkFlowConnection();
    expect(checked.status).toBe('connected');
    expect(checked.connectedEmail).toBe('creator.studio@gmail.com');

    // 3. Verify updating account email
    const updated = await service.verifyGoogleFlowAccount('prime.director@gmail.com');
    expect(updated.status).toBe('connected');
    expect(updated.connectedEmail).toBe('prime.director@gmail.com');

    // 4. Disconnecting clears the account
    const reset = await service.disconnectGoogleFlow();
    expect(reset.status).toBe('not_connected');
    expect(reset.connectedEmail).toBeUndefined();
  });
});
