import { adbService } from './adbService';
import { atxAutomationService } from './atxAutomationService';
import { publishingQueueService } from './publishingQueueService';
import { activityLogService } from './activityLogService';
import { PublishJob, AtxActionResult } from '../../shared/types';

export class AutomationOrchestrator {
  /**
   * Run end-to-end publishing automation workflow with safe pauses for user review
   */
  public async orchestratePublish(params: {
    jobId: string;
    deviceId?: string;
  }): Promise<{
    success: boolean;
    stage: string;
    message: string;
    requiresUserAction: boolean;
    instructions?: string;
  }> {
    const job = publishingQueueService.getJobById(params.jobId);
    if (!job) {
      throw new Error(`Job not found: ${params.jobId}`);
    }

    activityLogService.log(
      'info',
      'AutomationOrchestrator',
      `Starting orchestrator for "${job.title}" on ${job.platform}`
    );

    // 1. Advance job to phone (transfers video, launches app, copies metadata)
    const advanceResult = await publishingQueueService.advanceJobToPhone(job.id, params.deviceId);

    // 2. Platform-specific guidance
    let instructions = '';
    switch (job.platform) {
      case 'youtube':
        instructions =
          '1. The YouTube app is open on your phone screen.\n' +
          '2. Tap the "+" button at the bottom and choose "Create a Short".\n' +
          '3. Select your transferred video from the bottom-left media preview.\n' +
          '4. Paste the prepared title from your clipboard.\n' +
          '5. Review visibility settings, tap "Upload Short", and click "Confirm Published" in this studio.';
        break;
      case 'tiktok':
        instructions =
          '1. TikTok is open on your phone.\n' +
          '2. Tap "+" at the bottom center, then tap "Upload".\n' +
          '3. Tap your transferred video from the Gallery.\n' +
          '4. Tap Next, paste your caption & hashtags from clipboard.\n' +
          '5. Review your post and tap "Post", then click "Confirm Published" in this studio.';
        break;
      case 'facebook':
        instructions =
          '1. Facebook / Meta Business Suite is open on your phone.\n' +
          `2. Make sure you are switched to your Page ${job.selectedPageName ? `("${job.selectedPageName}")` : ''}.\n` +
          '3. Tap "Post" / "Reel" and select the transferred video from your gallery.\n' +
          '4. Paste the post caption from your clipboard.\n' +
          '5. Tap "Share" / "Publish", then click "Confirm Published" in this studio.';
        break;
    }

    return {
      success: advanceResult.success,
      stage: advanceResult.stage,
      message: advanceResult.message,
      requiresUserAction: true,
      instructions,
    };
  }

  /**
   * Safe screen interaction: Tap element by selector or coordinate safely
   */
  public async safeTap(deviceId: string, x: number, y: number): Promise<AtxActionResult> {
    return atxAutomationService.tap(deviceId, x, y);
  }

  /**
   * Safe input text via clipboard paste / keyevents
   */
  public async safeInputText(deviceId: string, text: string): Promise<AtxActionResult> {
    return atxAutomationService.inputText(deviceId, text);
  }
}

export const automationOrchestrator = new AutomationOrchestrator();
