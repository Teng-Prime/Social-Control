import { taskQueueRepo } from '../database/repositories/taskQueueRepository';
import { appDb } from '../database/db';
import { logger } from '../logger';
import { ffmpegService } from './ffmpegService';
import { adbService } from './adbService';
import { socialPublisher } from './social/socialPublisher';
import { TaskQueueItem } from '../../shared/types';

export class QueueService {
  private isRunning = false;
  private isPaused = false;
  private activeJobsCount = 0;
  private loopInterval: NodeJS.Timeout | null = null;

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('QueueService', 'Background automation queue worker started');

    // Reset any jobs stuck in 'running' back to 'pending' from previous crash/restart
    this.recoverStaleTasks();

    this.loopInterval = setInterval(() => {
      this.tick();
    }, 2000);
  }

  public stop(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    this.isRunning = false;
    logger.info('QueueService', 'Background queue worker stopped');
  }

  public pause(): void {
    this.isPaused = true;
    logger.info('QueueService', 'Queue paused by user');
  }

  public resume(): void {
    this.isPaused = false;
    logger.info('QueueService', 'Queue resumed');
  }

  public isQueuePaused(): boolean {
    return this.isPaused;
  }

  private recoverStaleTasks(): void {
    const runningTasks = taskQueueRepo.getAll({ status: 'running' });
    for (const t of runningTasks) {
      logger.warn('QueueService', `Recovering stale task ${t.id} (${t.title}) -> reset to pending`);
      taskQueueRepo.update(t.id, { status: 'pending', progress: 0 });
    }
  }

  private async tick(): Promise<void> {
    if (this.isPaused) return;

    const settings = appDb.getSettings();
    const maxConcurrency = settings.queueConcurrency || 2;

    while (this.activeJobsCount < maxConcurrency) {
      const nextTask = taskQueueRepo.getNextPendingTask();
      if (!nextTask) break;

      this.activeJobsCount++;
      this.processTask(nextTask).finally(() => {
        this.activeJobsCount--;
      });
    }
  }

  private async processTask(task: TaskQueueItem): Promise<void> {
    logger.info('QueueService', `Executing task: ${task.title} [${task.type}]`);
    taskQueueRepo.update(task.id, { status: 'running', progress: 10 });

    try {
      switch (task.type) {
        case 'video_render': {
          const { clips, outputPath, aspectRatio } = task.payload;
          taskQueueRepo.update(task.id, { progress: 30 });
          await ffmpegService.assembleScenes({
            videoClips: clips,
            outputFilePath: outputPath,
            aspectRatio,
          });
          taskQueueRepo.update(task.id, { progress: 100, status: 'completed' });
          break;
        }

        case 'file_transfer': {
          const { deviceId, localFilePath, targetPhoneDir } = task.payload;
          taskQueueRepo.update(task.id, { progress: 40 });
          await adbService.transferFile(deviceId, localFilePath, targetPhoneDir);
          taskQueueRepo.update(task.id, { progress: 100, status: 'completed' });
          break;
        }

        case 'publishing': {
          const { jobId } = task.payload;
          taskQueueRepo.update(task.id, { progress: 20 });
          const res = await socialPublisher.publish(jobId);
          if (res.success) {
            taskQueueRepo.update(task.id, { progress: 100, status: 'completed' });
          } else {
            throw new Error(res.message || 'Publishing failed');
          }
          break;
        }

        default: {
          // Simulation / generic task handler
          taskQueueRepo.update(task.id, { progress: 50 });
          await new Promise(r => setTimeout(r, 1000));
          taskQueueRepo.update(task.id, { progress: 100, status: 'completed' });
          break;
        }
      }
      logger.info('QueueService', `Task completed: ${task.title}`);
    } catch (err: any) {
      logger.error('QueueService', `Task failed: ${task.title} - ${err.message}`);
      const retryCount = task.retryCount + 1;
      if (retryCount < task.maxRetries) {
        taskQueueRepo.update(task.id, {
          status: 'pending',
          retryCount,
          error: `Attempt ${retryCount} failed: ${err.message}`,
        });
      } else {
        taskQueueRepo.update(task.id, {
          status: 'failed',
          retryCount,
          error: err.message,
        });
      }
    }
  }
}

export const queueService = new QueueService();
