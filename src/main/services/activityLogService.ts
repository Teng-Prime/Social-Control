import { activityLogRepo } from '../database/repositories/activityLogRepository';
import { ActivityLog } from '../../shared/types';
import { logger } from '../logger';

export class ActivityLogService {
  public log(level: 'info' | 'warn' | 'error' | 'debug', category: string, message: string, details?: any): ActivityLog {
    const detailsStr = details
      ? typeof details === 'string'
        ? details
        : JSON.stringify(details, null, 2)
      : undefined;

    if (level === 'error') {
      logger.error(category, message);
    } else if (level === 'warn') {
      logger.warn(category, message);
    } else {
      logger.info(category, message);
    }

    return activityLogRepo.create({
      level,
      category,
      message,
      details: detailsStr,
    });
  }

  public getRecentLogs(limit: number = 100, level?: string): ActivityLog[] {
    return activityLogRepo.getRecent(limit, level);
  }

  public clearLogs(): boolean {
    return activityLogRepo.clear();
  }
}

export const activityLogService = new ActivityLogService();
