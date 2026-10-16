import { describe, it, expect, beforeEach } from 'vitest';
import { appDb } from '../src/main/database/db';
import { projectRepo } from '../src/main/database/repositories/projectRepository';
import { flowService } from '../src/main/services/flowService';
import { ffmpegService } from '../src/main/services/ffmpegService';
import { openAiService } from '../src/main/services/openAiService';

describe('Video Generator Hardware Acceleration, OpenAI Integration & 30s Video Defaults', () => {
  beforeEach(() => {
    // Reset test state if needed
  });

  describe('1. Configuration & Default Settings', () => {
    it('should default target video duration to 30 seconds', () => {
      const settings = appDb.getSettings();
      expect(settings.defaultVideoDuration).toBe(30);
    });

    it('should have hardware acceleration defaults configured for host CPU, RAM and GPU', () => {
      const settings = appDb.getSettings();
      expect(settings.hardwareAcceleration).toBeDefined();
      expect(['auto', 'mediafoundation', 'nvenc', 'amf', 'qsv', 'cpu']).toContain(settings.hardwareAcceleration);
      expect(typeof settings.cpuThreads).toBe('number');
      expect(typeof settings.ramBufferMb).toBe('number');
      expect(settings.ramBufferMb).toBeGreaterThanOrEqual(512);
      expect(settings.renderPreset).toBeDefined();
    });

    it('should persist hardware acceleration and OpenAI configuration updates', () => {
      appDb.updateSettings({
        hardwareAcceleration: 'mediafoundation',
        cpuThreads: 16,
        ramBufferMb: 2048,
        defaultVideoDuration: 30,
        openaiModel: 'gpt-4o-mini',
      });

      const updated = appDb.getSettings();
      expect(updated.hardwareAcceleration).toBe('mediafoundation');
      expect(updated.cpuThreads).toBe(16);
      expect(updated.ramBufferMb).toBe(2048);
      expect(updated.defaultVideoDuration).toBe(30);
      expect(updated.openaiModel).toBe('gpt-4o-mini');
    });
  });

  describe('2. Project Repository & 30s Video Generation Defaults', () => {
    it('should initialize new story projects with 30s target duration by default', () => {
      const proj = projectRepo.create({
        id: 'test_proj_30s_' + Date.now(),
        title: '30s Viral Adventure',
        genre: 'mystery',
        aspectRatio: '9:16',
        language: 'en',
        voice: 'en-US-Standard-C',
        status: 'draft',
      });

      expect(proj.targetDuration).toBe(30);
    });

    it('should generate a 30s story with 5 scenes totaling exactly 30 seconds', async () => {
      const story = await flowService.generateFullStory({
        prompt: 'Uncovering the hidden vault in the city',
        genre: 'mystery',
        targetDuration: 30,
      });

      expect(story).toBeDefined();
      expect(story.hook).toBeTruthy();
      expect(story.scenes.length).toBe(5);

      const totalDuration = story.scenes.reduce((sum, sc) => sum + sc.duration, 0);
      expect(totalDuration).toBe(30);

      // Verify each scene has rich descriptions, prompts, and sound effect cues
      for (const sc of story.scenes) {
        expect(sc.duration).toBe(6);
        expect(sc.prompt).toBeTruthy();
        expect(sc.cameraAngle).toBeTruthy();
        expect(sc.lighting).toBeTruthy();
      }
    });
  });

  describe('3. Host Hardware Detection & Video Acceleration', () => {
    it('should detect host processor CPU, memory RAM, and GPU capabilities', async () => {
      const hw = await ffmpegService.detectHardwareCapabilities();
      expect(hw).toBeDefined();
      expect(hw.cpuModel).toBeTruthy();
      expect(hw.cpuThreads).toBeGreaterThan(0);
      expect(hw.totalRamGb).toBeGreaterThan(0);
      expect(hw.availableEncoders.length).toBeGreaterThan(0);
      expect(hw.activeEncoder).toBeTruthy();
    });

    it('should benchmark hardware acceleration and measure real-time speed factor', async () => {
      const bench = await ffmpegService.testHardwareAcceleration('auto');
      expect(bench).toBeDefined();
      expect(bench.success).toBe(true);
      expect(bench.encoder).toBeTruthy();
      expect(bench.speed).toBeTruthy();
      expect(bench.durationMs).toBeGreaterThan(0);
    }, 20000);
  });

  describe('4. OpenAI API Service Integration & Graceful Fallback', () => {
    it('should check for configured OpenAI API key', () => {
      expect(openAiService.hasApiKey('sk-test1234567890')).toBe(true);
      expect(openAiService.hasApiKey('')).toBe(false);
    });

    it('should return helpful validation message when testing connection without API key', async () => {
      const res = await openAiService.testConnection('');
      expect(res.success).toBe(false);
      expect(res.message).toContain('No OpenAI API key');
    });

    it('should gracefully fallback to procedural generator when no OpenAI key is set', async () => {
      // Without OpenAI key, generateStoryIdeas and generateHook should return valid ideas
      const ideas = await flowService.generateStoryIdeas('The abandoned laboratory', 'mystery');
      expect(ideas.length).toBeGreaterThan(0);

      const hook = await flowService.generateHook('The abandoned laboratory', 'mystery', 'dramatic');
      expect(hook).toBeTruthy();
    });
  });
});
