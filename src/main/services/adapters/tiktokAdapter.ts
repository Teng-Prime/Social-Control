import { PublishJob } from '../../../shared/types';
import { adbService } from '../adbService';
import { appDb } from '../../database/db';
import { deviceRepo } from '../../database/repositories/deviceRepository';
import { activityLogService } from '../activityLogService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TikTokAdapter {
  private getAdbPath(): string {
    return appDb.getSettings().adbPath || 'adb';
  }

  public prepareMetadata(job: PublishJob): {
    caption: string;
    hashtags: string[];
    formattedText: string;
  } {
    const hashtags = (job.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`));
    if (!hashtags.some((h) => h.toLowerCase() === '#fyp')) {
      hashtags.push('#fyp');
    }
    const rawCaption = `${job.title || ''} ${job.caption || ''}`.trim();
    const formattedText = `${rawCaption}\n${hashtags.join(' ')}`.trim();

    return { caption: rawCaption, hashtags, formattedText };
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
        message: 'TikTok app launch triggered (Simulated). Caption & hashtags copied to clipboard.',
        formattedText: meta.formattedText,
      };
    }

    const adb = this.getAdbPath();
    try {
      // 1. Try launching TikTok direct intent
      try {
        await execAsync(
          `"${adb}" -s "${serial}" shell am start -a android.intent.action.VIEW -d "snssdk1128://"`,
          { timeout: 5000 }
        );
      } catch {
        // Fallback to launcher
        await execAsync(
          `"${adb}" -s "${serial}" shell monkey -p com.zhiliaoapp.musically -c android.intent.category.LAUNCHER 1`,
          { timeout: 5000 }
        );
      }

      activityLogService.log('info', 'TikTokAdapter', `Launched TikTok on phone ${serial} for job ${job.id}`);
      return {
        success: true,
        message:
          'TikTok launched on your phone! Caption copied to clipboard. Tap "+" > Upload > Select your video from gallery, paste caption, and post.',
        formattedText: meta.formattedText,
      };
    } catch (err: any) {
      activityLogService.log('warn', 'TikTokAdapter', `Failed to launch TikTok: ${err.message}`);
      return {
        success: false,
        message: `Could not launch TikTok: ${err.message}. Please open TikTok on your phone manually.`,
        formattedText: meta.formattedText,
      };
    }
  }
}

export const tiktokAdapter = new TikTokAdapter();
