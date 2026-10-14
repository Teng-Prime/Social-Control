import fs from 'fs';
import path from 'path';
import { storageService } from './services/storageService';
import { ActivityLog } from '../shared/types';

export class Logger {
  private logFilePath: string;

  constructor() {
    const logsDir = storageService.getFolder('Logs');
    this.logFilePath = path.join(logsDir, 'app.log');
  }

  private sanitize(message: string): string {
    // Redact Bearer tokens, API keys, passwords, and secrets
    return message
      .replace(/Bearer\s+[\w-._~+/]+=*/gi, 'Bearer [REDACTED]')
      .replace(/(key|token|secret|password|auth|authorization)=['"]?[^&'",\s]+['"]?/gi, '$1=[REDACTED]');
  }

  public log(level: 'info' | 'warn' | 'error' | 'debug', category: string, rawMessage: string, details?: any): ActivityLog {
    const message = this.sanitize(rawMessage);
    const detailsStr = details ? this.sanitize(typeof details === 'string' ? details : JSON.stringify(details)) : undefined;

    const entry: ActivityLog = {
      id: Math.random().toString(36).substring(2, 11),
      level,
      category,
      message,
      details: detailsStr,
      createdAt: new Date().toISOString(),
    };

    const formattedLine = `[${entry.createdAt}] [${level.toUpperCase()}] [${category}] ${message} ${detailsStr ? '- ' + detailsStr : ''}\n`;

    try {
      fs.appendFileSync(this.logFilePath, formattedLine, 'utf-8');
    } catch {
      // Ignore file append errors during early startup
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[36m';
      console.log(`${color}[${level.toUpperCase()}] [${category}]\x1b[0m ${message}`, detailsStr || '');
    }

    return entry;
  }

  public info(category: string, message: string, details?: any): ActivityLog {
    return this.log('info', category, message, details);
  }

  public warn(category: string, message: string, details?: any): ActivityLog {
    return this.log('warn', category, message, details);
  }

  public error(category: string, message: string, details?: any): ActivityLog {
    return this.log('error', category, message, details);
  }

  public debug(category: string, message: string, details?: any): ActivityLog {
    return this.log('debug', category, message, details);
  }

  public getRecentLogs(limit = 100): string[] {
    if (!fs.existsSync(this.logFilePath)) return [];
    try {
      const content = fs.readFileSync(this.logFilePath, 'utf-8');
      const lines = content.trim().split('\n');
      return lines.slice(-limit);
    } catch {
      return [];
    }
  }

  public clearLogs(): boolean {
    try {
      fs.writeFileSync(this.logFilePath, '', 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  public getLogFilePath(): string {
    return this.logFilePath;
  }
}

export const logger = new Logger();
