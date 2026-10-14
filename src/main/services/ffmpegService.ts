import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { storageService } from './storageService';
import { appDb } from '../database/db';
import { logger } from '../logger';

const execAsync = promisify(exec);

export class FFmpegService {
  private getBinaryPath(): string {
    const settings = appDb.getSettings();
    return settings.ffmpegPath || 'ffmpeg';
  }

  public async checkAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const binary = this.getBinaryPath();
      const { stdout } = await execAsync(`"${binary}" -version`);
      const firstLine = stdout.split('\n')[0] || '';
      return { available: true, version: firstLine.trim() };
    } catch (err: any) {
      return { available: false, error: err.message };
    }
  }

  public async probeMedia(filePath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    format: string;
    aspectRatio: string;
  }> {
    try {
      // Use ffprobe or ffmpeg -i info extraction
      const binary = this.getBinaryPath();
      // Probe using ffmpeg -i (works even if ffprobe binary is absent)
      const { stderr } = await execAsync(`"${binary}" -i "${filePath}"`, { timeout: 10000 }).catch(e => e);
      const output = stderr || '';

      // Parse Duration: 00:01:23.45
      const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
      let duration = 0;
      if (durationMatch) {
        const hours = parseFloat(durationMatch[1]);
        const mins = parseFloat(durationMatch[2]);
        const secs = parseFloat(durationMatch[3]);
        duration = hours * 3600 + mins * 60 + secs;
      }

      // Parse Resolution: e.g. 1080x1920 or 1920x1080
      const videoStreamMatch = output.match(/Video:.*?,\s*(\d{3,4})x(\d{3,4})/);
      let width = 1080;
      let height = 1920;
      if (videoStreamMatch) {
        width = parseInt(videoStreamMatch[1], 10);
        height = parseInt(videoStreamMatch[2], 10);
      }

      const ratio = width > height ? '16:9' : width === height ? '1:1' : '9:16';
      const ext = path.extname(filePath).replace('.', '') || 'mp4';

      return {
        duration,
        width,
        height,
        format: ext,
        aspectRatio: ratio,
      };
    } catch (err: any) {
      logger.warn('FFmpegService', `Probe failed for ${filePath}: ${err.message}`);
      return {
        duration: 10.0,
        width: 1080,
        height: 1920,
        format: 'mp4',
        aspectRatio: '9:16',
      };
    }
  }

  public async generateThumbnail(videoPath: string, timeSec = 1): Promise<string> {
    const thumbnailsDir = storageService.getFolder('Thumbnails');
    const hash = path.basename(videoPath, path.extname(videoPath)) + '_' + Date.now();
    const outputPath = path.join(thumbnailsDir, `thumb_${hash}.jpg`);

    const binary = this.getBinaryPath();
    // ffmpeg -ss 00:00:01 -i input -vframes 1 -q:v 2 -y output.jpg
    const timeFormatted = `00:00:0${Math.min(9, Math.max(1, Math.floor(timeSec)))}`;
    const cmd = `"${binary}" -y -ss ${timeFormatted} -i "${videoPath}" -vframes 1 -vf "scale=480:-1" -q:v 3 "${outputPath}"`;

    try {
      await execAsync(cmd, { timeout: 15000 });
      if (fs.existsSync(outputPath)) {
        return outputPath;
      }
    } catch (err: any) {
      logger.warn('FFmpegService', `Could not generate thumbnail for ${videoPath}: ${err.message}`);
    }

    return '';
  }

  public async assembleScenes(options: {
    videoClips: string[];
    outputFilePath: string;
    aspectRatio?: '9:16' | '16:9' | '1:1';
    audioFilePath?: string;
  }): Promise<string> {
    const { videoClips, outputFilePath, aspectRatio = '9:16' } = options;
    if (videoClips.length === 0) {
      throw new Error('No video clips provided for assembly');
    }

    const binary = this.getBinaryPath();
    const tempDir = storageService.getFolder('Data');
    const concatListPath = path.join(tempDir, `concat_${Date.now()}.txt`);

    // Create concat demuxer list
    const fileEntries = videoClips
      .filter(f => fs.existsSync(f))
      .map(f => `file '${f.replace(/'/g, "'\\''")}'`)
      .join('\n');

    fs.writeFileSync(concatListPath, fileEntries, 'utf-8');

    let scaleFilter = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2';
    if (aspectRatio === '16:9') {
      scaleFilter = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
    } else if (aspectRatio === '1:1') {
      scaleFilter = 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2';
    }

    const cmd = `"${binary}" -y -f concat -safe 0 -i "${concatListPath}" -vf "${scaleFilter}" -c:v libx264 -preset fast -crf 22 -c:a aac "${outputFilePath}"`;

    try {
      logger.info('FFmpegService', `Rendering project assembly: ${outputFilePath}`);
      await execAsync(cmd, { timeout: 120000 });
      if (fs.existsSync(concatListPath)) {
        fs.unlinkSync(concatListPath);
      }
      return outputFilePath;
    } catch (err: any) {
      if (fs.existsSync(concatListPath)) {
        fs.unlinkSync(concatListPath);
      }
      logger.error('FFmpegService', `Render failed: ${err.message}`);
      throw err;
    }
  }
}

export const ffmpegService = new FFmpegService();
