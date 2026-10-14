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
    expect(top.pinnedComment).toBeDefined();
  });
});
