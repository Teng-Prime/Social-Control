import { ipcMain, dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { appDb } from '../database/db';
import { storageService } from '../services/storageService';
import { ffmpegService } from '../services/ffmpegService';
import { adbService } from '../services/adbService';
import { flowService } from '../services/flowService';
import { socialPublisher } from '../services/social/socialPublisher';
import { queueService } from '../services/queueService';
import { mediaAssetRepo } from '../database/repositories/mediaAssetRepository';
import { characterRepo } from '../database/repositories/characterRepository';
import { projectRepo } from '../database/repositories/projectRepository';
import { socialAccountRepo } from '../database/repositories/socialAccountRepository';
import { publishJobRepo } from '../database/repositories/publishJobRepository';
import { deviceRepo } from '../database/repositories/deviceRepository';
import { taskQueueRepo } from '../database/repositories/taskQueueRepository';
import { activityLogRepo } from '../database/repositories/activityLogRepository';
import { logger } from '../logger';
import { CaptionGenerationRequest, DashboardStats, SystemHealth } from '../../shared/types';

export function registerIpcHandlers(): void {
  // 1. System Health
  ipcMain.handle('getSystemHealth', async (): Promise<SystemHealth> => {
    const ffmpegStatus = await ffmpegService.checkAvailability();
    const adbStatus = await adbService.checkAvailability();
    const disk = await storageService.getDiskSpace();

    return {
      databaseConnected: true,
      ffmpegAvailable: ffmpegStatus.available,
      ffmpegVersion: ffmpegStatus.version,
      adbAvailable: adbStatus.available,
      adbVersion: adbStatus.version,
      storageAvailableMb: Math.round(disk.freeBytes / (1024 * 1024)),
      storageTotalMb: Math.round(disk.totalBytes / (1024 * 1024)),
      storagePath: storageService.getBaseDirectory(),
    };
  });

  // 2. Dashboard Statistics
  ipcMain.handle('getDashboardStats', async (): Promise<DashboardStats> => {
    const assets = mediaAssetRepo.getAll();
    const publishJobs = publishJobRepo.getAll();
    const accounts = socialAccountRepo.getAll().filter(a => a.isConnected);
    const devices = deviceRepo.getAll().filter(d => d.status === 'connected');
    const recentProjects = projectRepo.getAll().slice(0, 5);
    const recentLogs = activityLogRepo.getRecent(10);
    const disk = await storageService.getDiskSpace();
    const queueSummary = taskQueueRepo.getSummary();

    const readyToPublish = assets.filter(a => a.folder === 'ReadyToPublish').length;
    const publishedPosts = publishJobs.filter(p => p.status === 'published').length;
    const scheduledPosts = publishJobs.filter(p => p.status === 'scheduled').length;
    const failedJobs = publishJobs.filter(p => p.status === 'failed').length + queueSummary.failed;

    return {
      totalGeneratedVideos: assets.length,
      videosReadyToPublish: readyToPublish,
      publishedPosts,
      scheduledPosts,
      failedJobs,
      connectedAccountsCount: accounts.length,
      connectedDevicesCount: devices.length,
      storageUsedBytes: disk.usedBytes,
      storageFreeBytes: disk.freeBytes,
      recentProjects,
      recentActivity: recentLogs,
      queueSummary,
    };
  });

  // 3. Settings
  ipcMain.handle('getSettings', async () => {
    return appDb.getSettings();
  });

  ipcMain.handle('updateSettings', async (_, newSettings) => {
    logger.info('Settings', 'Updating application settings');
    return appDb.updateSettings(newSettings);
  });

  // 4. File / Directory Dialogs
  ipcMain.handle('openDirectoryDialog', async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle('openFileDialog', async (_, extensions?: string[]) => {
    const filters = extensions ? [{ name: 'Allowed Files', extensions }] : undefined;
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters,
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle('revealInFileExplorer', async (_, filePath: string) => {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
      return true;
    }
    return false;
  });

  ipcMain.handle('openExternalUrl', async (_, url: string) => {
    await shell.openExternal(url);
    return true;
  });

  // 5. Storage Folders
  ipcMain.handle('getStorageFolders', async () => {
    return storageService.getAllFolders();
  });

  // 6. Media Assets / Video Library
  ipcMain.handle('getMediaAssets', async (_, filter) => {
    return mediaAssetRepo.getAll(filter);
  });

  ipcMain.handle('getMediaAssetById', async (_, id: string) => {
    return mediaAssetRepo.getById(id);
  });

  ipcMain.handle('importMediaAsset', async (_, filePath: string, targetFolder: 'Drafts' | 'ReadyToPublish' | 'Published' = 'Drafts') => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const destFolder = storageService.getFolder(`Videos/${targetFolder}`);
    const destPath = path.join(destFolder, `${Date.now()}_${fileName}`);

    // Copy file to studio folder
    fs.copyFileSync(filePath, destPath);

    // Probe metadata
    const meta = await ffmpegService.probeMedia(destPath);
    const stats = fs.statSync(destPath);

    // Generate thumbnail
    const thumbPath = await ffmpegService.generateThumbnail(destPath);

    const asset = mediaAssetRepo.create({
      id: 'asset_' + Math.random().toString(36).substring(2, 11),
      title: path.parse(fileName).name,
      filePath: destPath,
      fileName,
      fileSize: stats.size,
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      aspectRatio: meta.aspectRatio,
      format: meta.format,
      thumbnailPath: thumbPath,
      tags: ['imported'],
      folder: targetFolder,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    logger.info('MediaLibrary', `Imported video asset: ${fileName}`);
    activityLogRepo.create({
      id: Math.random().toString(36).substring(2, 11),
      level: 'info',
      category: 'MediaLibrary',
      message: `Imported video: ${fileName}`,
      createdAt: new Date().toISOString(),
    });

    return asset;
  });

  ipcMain.handle('updateMediaAsset', async (_, id: string, updates) => {
    return mediaAssetRepo.update(id, updates);
  });

  ipcMain.handle('deleteMediaAsset', async (_, id: string, deleteFile = false) => {
    const asset = mediaAssetRepo.getById(id);
    if (asset && deleteFile && fs.existsSync(asset.filePath)) {
      try {
        fs.unlinkSync(asset.filePath);
      } catch (e) {
        logger.warn('MediaLibrary', `Could not delete physical file: ${asset.filePath}`);
      }
    }
    return mediaAssetRepo.delete(id);
  });

  ipcMain.handle('generateThumbnail', async (_, videoPath: string) => {
    return ffmpegService.generateThumbnail(videoPath);
  });

  // 7. Characters
  ipcMain.handle('getCharacters', async () => {
    return characterRepo.getAll();
  });

  ipcMain.handle('getCharacterById', async (_, id: string) => {
    return characterRepo.getById(id);
  });

  ipcMain.handle('createCharacter', async (_, charData) => {
    logger.info('CharacterStudio', `Created character profile: ${charData.name}`);
    return characterRepo.create(charData);
  });

  ipcMain.handle('updateCharacter', async (_, id: string, updates) => {
    return characterRepo.update(id, updates);
  });

  ipcMain.handle('deleteCharacter', async (_, id: string) => {
    return characterRepo.delete(id);
  });

  ipcMain.handle('addCharacterReference', async (_, characterId: string, imagePath: string, prompt: string, isPrimary: boolean) => {
    // Copy image to Characters folder
    const charFolder = storageService.getFolder('Characters');
    const dest = path.join(charFolder, `ref_${Date.now()}_${path.basename(imagePath)}`);
    if (fs.existsSync(imagePath)) {
      fs.copyFileSync(imagePath, dest);
    }
    return characterRepo.addReference(characterId, fs.existsSync(dest) ? dest : imagePath, prompt, isPrimary);
  });

  ipcMain.handle('deleteCharacterReference', async (_, refId: string) => {
    return characterRepo.deleteReference(refId);
  });

  // 8. Story Projects
  ipcMain.handle('getProjects', async () => {
    return projectRepo.getAll();
  });

  ipcMain.handle('getProjectById', async (_, id: string) => {
    return projectRepo.getById(id);
  });

  ipcMain.handle('createProject', async (_, projectData) => {
    return projectRepo.create(projectData);
  });

  ipcMain.handle('updateProject', async (_, id: string, updates) => {
    return projectRepo.update(id, updates);
  });

  ipcMain.handle('deleteProject', async (_, id: string) => {
    return projectRepo.delete(id);
  });

  ipcMain.handle('createScene', async (_, sceneData) => {
    return projectRepo.createScene(sceneData);
  });

  ipcMain.handle('updateScene', async (_, id: string, updates) => {
    return projectRepo.updateScene(id, updates);
  });

  ipcMain.handle('deleteScene', async (_, id: string) => {
    return projectRepo.deleteScene(id);
  });

  ipcMain.handle('reorderScenes', async (_, projectId: string, sceneIds: string[]) => {
    return projectRepo.reorderScenes(projectId, sceneIds);
  });

  ipcMain.handle('generateScript', async (_, prompt: string, genre: string, lengthSeconds: number) => {
    return flowService.generateScript({
      prompt,
      genre,
      targetDuration: lengthSeconds,
    });
  });

  ipcMain.handle('renderProjectVideo', async (_, projectId: string) => {
    const project = projectRepo.getById(projectId);
    if (!project) throw new Error('Project not found');

    const videoClips = project.scenes
      .map(s => s.videoPath)
      .filter((p): p is string => Boolean(p && fs.existsSync(p)));

    if (videoClips.length === 0) {
      throw new Error('No ready video clips found in project scenes to render.');
    }

    const exportsFolder = storageService.getFolder('Exports');
    const outName = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_final_${Date.now()}.mp4`;
    const outPath = path.join(exportsFolder, outName);

    const task = taskQueueRepo.create({
      type: 'video_render',
      title: `Render Story: ${project.title}`,
      payload: {
        projectId,
        clips: videoClips,
        outputPath: outPath,
        aspectRatio: project.aspectRatio,
      },
      priority: 10,
    });

    return { jobId: task.id };
  });

  // Google Flow Connection
  ipcMain.handle('getFlowConnectionStatus', async () => {
    return flowService.getFlowConnectionStatus();
  });

  ipcMain.handle('connectGoogleFlow', async () => {
    return flowService.connectGoogleFlow();
  });

  ipcMain.handle('checkFlowConnection', async () => {
    return flowService.checkFlowConnection();
  });

  ipcMain.handle('disconnectGoogleFlow', async () => {
    return flowService.disconnectGoogleFlow();
  });

  // 9. Social Accounts
  ipcMain.handle('getSocialAccounts', async () => {
    return socialAccountRepo.getAll();
  });

  ipcMain.handle('connectSocialAccount', async (_, platform: string) => {
    logger.info('SocialAccounts', `Initiating OAuth flow for ${platform}`);
    // Create demo/authorized connected account
    const dummyNames: Record<string, string> = {
      youtube: 'Studio Creator (YouTube)',
      tiktok: '@socialearnings_official',
      facebook: 'Social Earnings Studio Page',
    };

    const newAcc = socialAccountRepo.saveAccount({
      id: `acc_${platform}_${Date.now()}`,
      platform: platform as any,
      accountName: dummyNames[platform] || `${platform}_creator`,
      isConnected: true,
      permissions: ['publish_video', 'read_insights'],
      tokenExpiry: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    }, {
      accessToken: `mock_valid_token_${Date.now()}`,
    });

    return { account: newAcc };
  });

  ipcMain.handle('disconnectSocialAccount', async (_, id: string) => {
    return socialAccountRepo.disconnect(id);
  });

  // 10. Publish Jobs
  ipcMain.handle('getPublishJobs', async (_, filter) => {
    return publishJobRepo.getAll(filter);
  });

  ipcMain.handle('createPublishJob', async (_, jobData) => {
    return publishJobRepo.create(jobData);
  });

  ipcMain.handle('executePublishJob', async (_, jobId: string) => {
    return socialPublisher.publish(jobId);
  });

  ipcMain.handle('cancelPublishJob', async (_, jobId: string) => {
    return publishJobRepo.update(jobId, { status: 'draft', progress: 0 }) !== null;
  });

  // 11. Captions
  ipcMain.handle('generateCaptions', async (_, req: CaptionGenerationRequest) => {
    return flowService.generateCaptions(req);
  });

  // 12. Phone Control (ADB)
  ipcMain.handle('getConnectedDevices', async () => {
    return adbService.getConnectedDevices();
  });

  ipcMain.handle('testAdbConnection', async () => {
    return adbService.checkAvailability();
  });

  ipcMain.handle('transferFileToPhone', async (_, deviceId: string, localFilePath: string, targetPhoneDir?: string) => {
    return adbService.transferFile(deviceId, localFilePath, targetPhoneDir);
  });

  ipcMain.handle('getTransferJobs', async (_, deviceId?: string) => {
    return deviceRepo.getTransferJobs(deviceId);
  });

  ipcMain.handle('startScreenMirror', async (_, deviceId: string) => {
    return adbService.startScreenMirror(deviceId);
  });

  ipcMain.handle('captureScreenshot', async (_, deviceId: string) => {
    return adbService.captureScreenshot(deviceId);
  });

  ipcMain.handle('launchMobileApp', async (_, deviceId: string, packageName: string) => {
    return adbService.launchApp(deviceId, packageName);
  });

  // 13. Automation Queue
  ipcMain.handle('getQueueItems', async (_, filter) => {
    return taskQueueRepo.getAll(filter);
  });

  ipcMain.handle('cancelQueueItem', async (_, id: string) => {
    return taskQueueRepo.update(id, { status: 'cancelled' }) !== null;
  });

  ipcMain.handle('retryQueueItem', async (_, id: string) => {
    return taskQueueRepo.update(id, { status: 'pending', progress: 0, error: undefined }) !== null;
  });

  ipcMain.handle('pauseQueue', async () => {
    queueService.pause();
    return true;
  });

  ipcMain.handle('resumeQueue', async () => {
    queueService.resume();
    return true;
  });

  ipcMain.handle('isQueuePaused', async () => {
    return queueService.isQueuePaused();
  });

  // 14. Logs & Activity
  ipcMain.handle('getLogs', async (_, limit = 50, level?: string) => {
    return activityLogRepo.getRecent(limit, level);
  });

  ipcMain.handle('clearLogs', async () => {
    activityLogRepo.clear();
    logger.clearLogs();
    return true;
  });

  ipcMain.handle('exportLogs', async () => {
    return logger.getLogFilePath();
  });

  // 15. Database Backup / Restore
  ipcMain.handle('backupDatabase', async () => {
    return appDb.backup();
  });

  ipcMain.handle('restoreDatabase', async (_, backupFilePath: string) => {
    return appDb.restore(backupFilePath);
  });
}
