import { PublishJob } from '../../../shared/types';
import { adbService } from '../adbService';
import { appDb } from '../../database/db';
import { deviceRepo } from '../../database/repositories/deviceRepository';
import { activityLogService } from '../activityLogService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FacebookAdapter {
  private getAdbPath(): string {
    return appDb.getSettings().adbPath || 'adb';
  }

  public prepareMetadata(job: PublishJob): {
    caption: string;
    hashtags: string[];
    formattedText: string;
    targetPageName?: string;
  } {
    const hashtags = (job.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`));
    const rawCaption = `${job.title || ''}\n\n${job.caption || ''}`.trim();
    const formattedText = `${rawCaption}\n\n${hashtags.join(' ')}`.trim();

    return {
      caption: rawCaption,
      hashtags,
      formattedText,
      targetPageName: job.selectedPageName,
    };
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
        message: 'Facebook app launch triggered (Simulated). Caption copied to clipboard.',
        formattedText: meta.formattedText,
      };
    }

    const adb = this.getAdbPath();
    const pagePrompt = meta.targetPageName ? ` on Page "${meta.targetPageName}"` : '';

    try {
      // 1. Try launching Meta Business Suite first (if installed)
      let launchedMeta = false;
      try {
        const { stdout: checkMeta } = await execAsync(
          `"${adb}" -s "${serial}" shell pm list packages com.facebook.pages.app`,
          { timeout: 3000 }
        );
        if (checkMeta.includes('com.facebook.pages.app')) {
          await execAsync(
            `"${adb}" -s "${serial}" shell monkey -p com.facebook.pages.app -c android.intent.category.LAUNCHER 1`,
            { timeout: 5000 }
          );
          launchedMeta = true;
        }
      } catch {}

      if (!launchedMeta) {
        // Fallback to Facebook app
        await execAsync(
          `"${adb}" -s "${serial}" shell monkey -p com.facebook.katana -c android.intent.category.LAUNCHER 1`,
          { timeout: 5000 }
        );
      }

      activityLogService.log('info', 'FacebookAdapter', `Launched Facebook on phone ${serial} for job ${job.id}`);
      return {
        success: true,
        message: `${
          launchedMeta ? 'Meta Business Suite' : 'Facebook'
        } launched on your phone! Caption copied to clipboard. Select video${pagePrompt}, paste caption, and publish.`,
        formattedText: meta.formattedText,
      };
    } catch (err: any) {
      activityLogService.log('warn', 'FacebookAdapter', `Failed to launch Facebook: ${err.message}`);
      return {
        success: false,
        message: `Could not launch Facebook: ${err.message}. Please open Facebook on your phone manually.`,
        formattedText: meta.formattedText,
      };
    }
  }
}

export const facebookAdapter = new FacebookAdapter();
