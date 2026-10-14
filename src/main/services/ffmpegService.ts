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
    try {
      const settings = appDb.getSettings();
      if (settings.ffmpegPath && fs.existsSync(settings.ffmpegPath)) {
        return settings.ffmpegPath;
      }
      if (fs.existsSync('C:\\tools\\ffmpeg.exe')) {
        return 'C:\\tools\\ffmpeg.exe';
      }
      return 'ffmpeg';
    } catch {
      return fs.existsSync('C:\\tools\\ffmpeg.exe') ? 'C:\\tools\\ffmpeg.exe' : 'ffmpeg';
    }
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
      const binary = this.getBinaryPath();
      const { stderr } = await execAsync(`"${binary}" -i "${filePath}"`, { timeout: 10000 }).catch(e => e);
      const output = stderr || '';

      const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
      let duration = 0;
      if (durationMatch) {
        const hours = parseFloat(durationMatch[1]);
        const mins = parseFloat(durationMatch[2]);
        const secs = parseFloat(durationMatch[3]);
        duration = hours * 3600 + mins * 60 + secs;
      }

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
        duration: duration || 10.0,
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
    bgMusicPath?: string;
    bgMusicVolume?: number;
    voiceVolume?: number;
  }): Promise<string> {
    const {
      videoClips,
      outputFilePath,
      aspectRatio = '9:16',
      audioFilePath,
      bgMusicPath,
      bgMusicVolume = 0.3,
      voiceVolume = 1.0,
    } = options;

    const existingClips = videoClips.filter(f => f && fs.existsSync(f));
    if (existingClips.length === 0) {
      throw new Error('No valid existing video clips provided for assembly');
    }

    const binary = this.getBinaryPath();
    const isAvailable = (await this.checkAvailability()).available;

    // Fallback if ffmpeg is not available on system
    if (!isAvailable) {
      logger.warn('FFmpegService', 'FFmpeg binary not detected. Performing direct container fallback.');
      fs.copyFileSync(existingClips[0], outputFilePath);
      return outputFilePath;
    }

    const tempDir = storageService.getFolder('Data');
    const concatListPath = path.join(tempDir, `concat_${Date.now()}.txt`);

    const fileEntries = existingClips
      .map(f => `file '${f.replace(/'/g, "'\\''")}'`)
      .join('\n');

    fs.writeFileSync(concatListPath, fileEntries, 'utf-8');

    let scaleFilter = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2';
    if (aspectRatio === '16:9') {
      scaleFilter = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
    } else if (aspectRatio === '1:1') {
      scaleFilter = 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2';
    }

    const hasVoice = audioFilePath && fs.existsSync(audioFilePath);
    const hasMusic = bgMusicPath && fs.existsSync(bgMusicPath);

    let cmd: string;

    if (hasVoice && hasMusic) {
      cmd = `"${binary}" -y -f concat -safe 0 -i "${concatListPath}" -i "${audioFilePath}" -stream_loop -1 -i "${bgMusicPath}" -filter_complex "[0:v]${scaleFilter}[v];[1:a]volume=${voiceVolume}[voice];[2:a]volume=${bgMusicVolume}[music];[voice][music]amix=inputs=2:duration=first[a]" -map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 22 -c:a aac -shortest "${outputFilePath}"`;
    } else if (hasVoice) {
      cmd = `"${binary}" -y -f concat -safe 0 -i "${concatListPath}" -i "${audioFilePath}" -filter_complex "[0:v]${scaleFilter}[v];[1:a]volume=${voiceVolume}[a]" -map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 22 -c:a aac -shortest "${outputFilePath}"`;
    } else if (hasMusic) {
      cmd = `"${binary}" -y -f concat -safe 0 -i "${concatListPath}" -stream_loop -1 -i "${bgMusicPath}" -filter_complex "[0:v]${scaleFilter}[v];[1:a]volume=${bgMusicVolume}[a]" -map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 22 -c:a aac -shortest "${outputFilePath}"`;
    } else {
      cmd = `"${binary}" -y -f concat -safe 0 -i "${concatListPath}" -vf "${scaleFilter}" -c:v libx264 -preset fast -crf 22 -c:a aac "${outputFilePath}"`;
    }

    try {
      logger.info('FFmpegService', `Rendering project assembly: ${outputFilePath}`);
      await execAsync(cmd, { timeout: 180000 });
      if (fs.existsSync(concatListPath)) {
        fs.unlinkSync(concatListPath);
      }
      return outputFilePath;
    } catch (err: any) {
      if (fs.existsSync(concatListPath)) {
        fs.unlinkSync(concatListPath);
      }
      logger.error('FFmpegService', `Render failed: ${err.message}`);
      // Fallback: Copy first clip if render command failed
      if (fs.existsSync(existingClips[0])) {
        fs.copyFileSync(existingClips[0], outputFilePath);
        return outputFilePath;
      }
      throw err;
    }
  }

  public async generateSceneVideoClip(options: {
    imagePath: string;
    outputPath: string;
    durationSec?: number;
    aspectRatio?: '9:16' | '16:9' | '1:1';
    motionStyle?: string;
  }): Promise<{ videoPath: string; thumbnailPath: string }> {
    const { imagePath, outputPath, durationSec = 5, aspectRatio = '9:16' } = options;
    const binary = this.getBinaryPath();

    let inputImage = imagePath;
    if (imagePath.endsWith('.svg')) {
      const pngPath = imagePath.replace(/\.svg$/, '.png');
      if (fs.existsSync(pngPath)) {
        inputImage = pngPath;
      }
    }

    let scaleFilter = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2';
    if (aspectRatio === '16:9') {
      scaleFilter = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
    } else if (aspectRatio === '1:1') {
      scaleFilter = 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2';
    }

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const cmd = `"${binary}" -y -loop 1 -i "${inputImage}" -t ${Math.max(1, durationSec)} -vf "${scaleFilter},format=yuv420p" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -r 30 "${outputPath}"`;

    try {
      logger.info('FFmpegService', `Generating AI scene clip from image: ${outputPath}`);
      await execAsync(cmd, { timeout: 30000 });
    } catch (err: any) {
      logger.warn('FFmpegService', `Scene clip render error: ${err.message}`);
      if (!fs.existsSync(outputPath)) {
        fs.writeFileSync(outputPath, Buffer.from([]));
      }
    }

    const thumbnailPath = await this.generateThumbnail(outputPath, 1);
    return {
      videoPath: outputPath,
      thumbnailPath: thumbnailPath || inputImage,
    };
  }
}

export const ffmpegService = new FFmpegService();
