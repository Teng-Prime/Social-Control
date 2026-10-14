import { describe, it, expect } from 'vitest';
import { FFmpegService } from '../src/main/services/ffmpegService';
import { AdbService } from '../src/main/services/adbService';

describe('System Diagnostics & Toolchains', () => {
  it('should probe FFmpeg executable availability and version', async () => {
    const ffmpeg = new FFmpegService();
    const res = await ffmpeg.checkAvailability();
    // FFmpeg is installed on this system
    expect(res).toBeDefined();
    expect(typeof res.available).toBe('boolean');
    if (res.available) {
      expect(res.version).toContain('ffmpeg');
    }
  });

  it('should probe ADB executable availability and version', async () => {
    const adb = new AdbService();
    const res = await adb.checkAvailability();
    // ADB is installed on this system
    expect(res).toBeDefined();
    expect(typeof res.available).toBe('boolean');
    if (res.available) {
      expect(res.version).toContain('Android Debug Bridge');
    }
  });
});
