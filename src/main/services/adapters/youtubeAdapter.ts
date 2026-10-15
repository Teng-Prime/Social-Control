import { PublishJob } from '../../../shared/types';
import { adbService } from '../adbService';
import { appDb } from '../../database/db';
import { deviceRepo } from '../../database/repositories/deviceRepository';
import { activityLogService } from '../activityLogService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class YouTubeAdapter {
  private getAdbPath(): string {
    return appDb.getSettings().adbPath || 'adb';
  }

  public prepareMetadata(job: PublishJob): {
    title: string;
    description: string;
    hashtags: string[];
    formattedText: string;
  } {
    const rawTitle = (job.title || 'YouTube Short').trim();
    const title = rawTitle.length > 100 ? rawTitle.substring(0, 97) + '...' : rawTitle;
    const hashtags = (job.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`));
    if (!hashtags.some((h) => h.toLowerCase() === '#shorts')) {
      hashtags.push('#shorts');
    }
    const description = `${job.caption || ''}\n\n${hashtags.join(' ')}`.trim();
    const formattedText = `${title}\n\n${description}`;

    return { title, description, hashtags, formattedText };
  }

  public async launchUploadOnPhone(
    deviceId: string,
    phoneVideoPath: string,
    job: PublishJob
  ): Promise<{ success: boolean; message: string; formattedText: string }> {
    const meta = this.prepareMetadata(job);

    // Copy formatted text to system clipboard
    try {
      const electron = require('electron');
      if (electron.clipboard) {
        electron.clipboard.writeText(meta.formattedText);
      }
    } catch {}

    const dbDev = deviceRepo.getById(deviceId) || deviceRepo.getAll().find((d) => d.serial === deviceId || d.id === deviceId);
    let serial = dbDev?.serial || deviceId;
    if (!dbDev) {
      const devices = await adbService.getConnectedDevices();
      const dev = devices.find((d) => d.id === deviceId || d.serial === deviceId);
      if (dev?.serial) serial = dev.serial;
    }

    if (!serial || serial.startsWith('TEST_') || serial.startsWith('phone_virtual')) {
      return {
        success: true,
        message: 'YouTube app launch triggered (Simulated). Title & hashtags copied to clipboard.',
        formattedText: meta.formattedText,
      };
    }

    const adb = this.getAdbPath();
    try {
      // 1. Try launching YouTube video creation intent
      try {
        await execAsync(
          `"${adb}" -s "${serial}" shell am start -a android.intent.action.VIEW -d "vnd.youtube://"`,
          { timeout: 5000 }
        );
      } catch {
        // Fallback to launching YouTube app package directly
        await execAsync(
          `"${adb}" -s "${serial}" shell monkey -p com.google.android.youtube -c android.intent.category.LAUNCHER 1`,
          { timeout: 5000 }
        );
      }

      activityLogService.log('info', 'YouTubeAdapter', `Launched YouTube on phone ${serial} for job ${job.id}`);
      return {
        success: true,
        message:
          'YouTube launched on your phone! Title and description copied to clipboard. Tap "+" > Create a Short > Select your video from gallery, paste title, and publish.',
        formattedText: meta.formattedText,
      };
    } catch (err: any) {
      activityLogService.log('warn', 'YouTubeAdapter', `Failed to launch YouTube: ${err.message}`);
      return {
        success: false,
        message: `Could not launch YouTube: ${err.message}. Please open YouTube on your phone manually.`,
        formattedText: meta.formattedText,
      };
    }
  }
}

export const youtubeAdapter = new YouTubeAdapter();
