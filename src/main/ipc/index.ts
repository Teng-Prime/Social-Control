import { ipcMain, dialog, shell, clipboard, nativeImage, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { appDb } from '../database/db';
import { storageService } from '../services/storageService';
import { ffmpegService } from '../services/ffmpegService';
import { adbService } from '../services/adbService';
import { flowService } from '../services/flowService';
import { atxAutomationService } from '../services/atxAutomationService';
import { characterImageGenerator } from '../services/characterImageGenerator';
import { socialPublisher } from '../services/social/socialPublisher';
import { analyticsService } from '../services/analyticsService';
import { queueService } from '../services/queueService';
import { googleAuthService } from '../services/googleAuthService';
import { videoStudioService } from '../services/videoStudioService';
import { videoLibraryService } from '../services/videoLibraryService';
import { androidDeviceService } from '../services/androidDeviceService';
import { appInstallationService } from '../services/appInstallationService';
import { videoTransferService } from '../services/videoTransferService';
import { accountService } from '../services/accountService';
import { emailVerificationService } from '../services/emailVerificationService';
import { publishingQueueService } from '../services/publishingQueueService';
import { automationOrchestrator } from '../services/automationOrchestrator';
import { mediaAssetRepo } from '../database/repositories/mediaAssetRepository';
import { characterRepo } from '../database/repositories/characterRepository';
import { projectRepo } from '../database/repositories/projectRepository';
import { socialAccountRepo } from '../database/repositories/socialAccountRepository';
import { publishJobRepo } from '../database/repositories/publishJobRepository';
import { deviceRepo } from '../database/repositories/deviceRepository';
import { taskQueueRepo } from '../database/repositories/taskQueueRepository';
import { activityLogRepo } from '../database/repositories/activityLogRepository';
import { logger } from '../logger';
import {
  CaptionGenerationRequest,
  DashboardStats,
  SystemHealth,
  MediaAsset,
  BatchTransferRequest,
  OtpVerificationRequest,
  PublishConfirmationRequest,
  VideoWorkflowStage,
} from '../../shared/types';

export function validateIpcSender(event: Electron.IpcMainInvokeEvent): boolean {
  if (!event || !event.senderFrame) return true; // CLI or test mock context
  const url = event.senderFrame.url;
  if (!url) return true;
  if (url.startsWith('http://localhost:5173') || url.startsWith('file://')) {
    return true;
  }
  logger.warn('IPC', `Blocked IPC request from unauthorized origin: ${url}`);
  return false;
}

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

  // Window Frame Controls (Frameless window custom titlebar)
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
    return true;
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    } else {
      win.maximize();
      return true;
    }
  });

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
    return true;
  });

  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return Boolean(win?.isMaximized());
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

  ipcMain.handle('createMediaAsset', async (_, assetData: Partial<MediaAsset> & { title: string }) => {
    let destPath = assetData.filePath || '';
    let fileName = assetData.fileName || '';
    let fileSize = assetData.fileSize || 0;
    let duration = assetData.duration || 60;
    let width = assetData.width || 1080;
    let height = assetData.height || 1920;
    let aspectRatio = assetData.aspectRatio || '9:16';
    let format = assetData.format || 'mp4';
    let thumbnailPath = assetData.thumbnailPath || '';

    if (destPath && fs.existsSync(destPath)) {
      try {
        fileName = path.basename(destPath);
        const stats = fs.statSync(destPath);
        fileSize = stats.size;
        const meta = await ffmpegService.probeMedia(destPath);
        duration = meta.duration || duration;
        width = meta.width || width;
        height = meta.height || height;
        aspectRatio = meta.aspectRatio || aspectRatio;
        format = meta.format || format;
        if (!thumbnailPath) {
          thumbnailPath = await ffmpegService.generateThumbnail(destPath);
        }
      } catch (err) {
        logger.warn('MediaLibrary', `Probe failed for asset: ${err}`);
      }
    }

    const created = mediaAssetRepo.create({
      id: assetData.id || 'asset_' + Math.random().toString(36).substring(2, 11),
      title: assetData.title,
      filePath: destPath,
      fileName,
      fileSize,
      duration,
      width,
      height,
      aspectRatio,
      format,
      thumbnailPath,
      tags: assetData.tags || [],
      folder: assetData.folder || 'Drafts',
      isFavorite: assetData.isFavorite || false,
      projectId: assetData.projectId,
    });

    activityLogRepo.create({
      id: Math.random().toString(36).substring(2, 11),
      level: 'info',
      category: 'MediaLibrary',
      message: `Created video asset: ${created.title}`,
      createdAt: new Date().toISOString(),
    });

    return created;
  });

  ipcMain.handle('batchCreateMediaAssets', async (_, assetsList: Array<Partial<MediaAsset> & { title: string }>) => {
    const created = mediaAssetRepo.batchCreate(assetsList);
    activityLogRepo.create({
      id: Math.random().toString(36).substring(2, 11),
      level: 'info',
      category: 'MediaLibrary',
      message: `Batch created ${created.length} video assets`,
      createdAt: new Date().toISOString(),
    });
    return created;
  });

  ipcMain.handle('updateMediaAsset', async (_, id: string, updates) => {
    return mediaAssetRepo.update(id, updates);
  });

  ipcMain.handle('batchUpdateMediaAssets', async (_, ids: string[], updates: Partial<MediaAsset>) => {
    const updated = mediaAssetRepo.batchUpdate(ids, updates);
    activityLogRepo.create({
      id: Math.random().toString(36).substring(2, 11),
      level: 'info',
      category: 'MediaLibrary',
      message: `Batch updated ${updated.length} video assets`,
      createdAt: new Date().toISOString(),
    });
    return updated;
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

  ipcMain.handle('batchDeleteMediaAssets', async (_, ids: string[], deleteFiles = false) => {
    if (deleteFiles) {
      for (const id of ids) {
        const asset = mediaAssetRepo.getById(id);
        if (asset && fs.existsSync(asset.filePath)) {
          try {
            fs.unlinkSync(asset.filePath);
          } catch {}
        }
      }
    }
    const count = mediaAssetRepo.batchDelete(ids);
    activityLogRepo.create({
      id: Math.random().toString(36).substring(2, 11),
      level: 'info',
      category: 'MediaLibrary',
      message: `Batch deleted ${count} video assets`,
      createdAt: new Date().toISOString(),
    });
    return count > 0;
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

  ipcMain.handle('generateCharacterPhoto', async (_, characterId: string, angle = 'front') => {
    const character = characterRepo.getById(characterId);
    if (!character) throw new Error(`Character not found: ${characterId}`);
    return characterImageGenerator.generatePortrait(character, angle as any, character.references.length === 0);
  });

  ipcMain.handle('generateCharacterSuite', async (_, characterId: string) => {
    const character = characterRepo.getById(characterId);
    if (!character) throw new Error(`Character not found: ${characterId}`);
    return characterImageGenerator.generateMultiAngleSuite(character);
  });

  ipcMain.handle('setCharacterPrimaryReference', async (_, characterId: string, referenceId: string) => {
    return characterRepo.setPrimaryReference(characterId, referenceId);
  });

  ipcMain.handle('copyImageToClipboard', async (_, imagePath: string) => {
    try {
      if (fs.existsSync(imagePath)) {
        if (imagePath.endsWith('.png') || imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
          const img = nativeImage.createFromPath(imagePath);
          clipboard.writeImage(img);
        } else {
          clipboard.writeText(fs.readFileSync(imagePath, 'utf-8'));
        }
        return true;
      }
      return false;
    } catch (e: any) {
      logger.warn('Clipboard', `Failed to copy image: ${e.message}`);
      return false;
    }
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

  ipcMain.handle('generateStoryIdeas', async (_, topic: string, genre: string, characterNames?: string[]) => {
    return flowService.generateStoryIdeas(topic, genre, characterNames);
  });

  ipcMain.handle('generateHook', async (_, topic: string, genre: string, tone: string) => {
    return flowService.generateHook(topic, genre, tone);
  });

  ipcMain.handle('transformStoryScript', async (_, options: any) => {
    return flowService.transformStoryScript(options);
  });

  ipcMain.handle('generateFullStory', async (_, options: any) => {
    return flowService.generateFullStory(options);
  });

  ipcMain.handle('generateVoiceover', async (_, projectId: string, text: string, voiceSettings: any) => {
    const res = await flowService.generateVoiceoverAudio(projectId, text, voiceSettings);
    // Persist to project
    const project = projectRepo.getById(projectId);
    if (project) {
      projectRepo.update(projectId, {
        voiceSettings: {
          ...voiceSettings,
          audioPath: res.audioPath,
        },
      });
    }
    return res;
  });

  ipcMain.handle('getBuiltinAudioLibrary', async () => {
    return flowService.getBuiltinAudioLibrary();
  });

  ipcMain.handle('generateNextVideoHook', async (_, options: any) => {
    return flowService.generateNextVideoHook(options);
  });

  ipcMain.handle('autoMatchBackgroundMusic', async (_, projectId: string) => {
    return flowService.autoMatchBackgroundMusic(projectId);
  });

  ipcMain.handle('autoAssignSceneSoundEffects', async (_, projectId: string) => {
    return flowService.autoAssignSceneSoundEffects(projectId);
  });

  ipcMain.handle('generateSceneVideo', async (_, sceneId: string, options: any) => {
    return flowService.generateSceneVideo(sceneId, options);
  });

  ipcMain.handle('generateAllSceneVideos', async (_, projectId: string) => {
    return flowService.generateAllSceneVideos(projectId);
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

  ipcMain.handle('renderFinalVideo', async (_, projectId: string, options: any = {}) => {
    const project = projectRepo.getById(projectId);
    if (!project) throw new Error('Project not found');

    const videoClips = project.scenes
      .map(s => s.videoPath)
      .filter((p): p is string => Boolean(p && fs.existsSync(p)));

    if (videoClips.length === 0) {
      throw new Error('No video clips found. Please generate or import at least one scene clip before final export.');
    }

    const exportsFolder = storageService.getFolder('Exports');
    const outName = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.mp4`;
    const outPath = path.join(exportsFolder, outName);

    // Audio mixing parameters
    const voiceAudio = project.voiceSettings?.audioPath;
    const musicAudio = project.musicSettings?.audioPath;
    const musicVol = project.musicSettings?.ducking ? 0.2 : (project.musicSettings?.volume ?? 30) / 100;
    const voiceVol = (project.voiceSettings?.volume ?? 100) / 100;

    await ffmpegService.assembleScenes({
      videoClips,
      outputFilePath: outPath,
      aspectRatio: options.aspectRatio || project.aspectRatio || '9:16',
      audioFilePath: voiceAudio,
      bgMusicPath: musicAudio,
      bgMusicVolume: musicVol,
      voiceVolume: voiceVol,
    });

    // Probe metadata & generate thumbnail
    const meta = await ffmpegService.probeMedia(outPath);
    const thumbPath = await ffmpegService.generateThumbnail(outPath);
    const stats = fs.statSync(outPath);

    // Automatically register exported video directly in Video Library
    const asset = mediaAssetRepo.create({
      id: 'asset_' + Math.random().toString(36).substring(2, 11),
      title: `${project.title} (Final Render)`,
      filePath: outPath,
      fileName: outName,
      fileSize: stats.size,
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      aspectRatio: meta.aspectRatio,
      format: meta.format,
      thumbnailPath: thumbPath,
      tags: ['rendered', 'ai-story', project.genre],
      folder: 'ReadyToPublish',
      isFavorite: true,
      projectId: project.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update project with final video path and status
    projectRepo.update(projectId, {
      finalVideoPath: outPath,
      status: 'exported',
    });

    activityLogRepo.create({
      id: Math.random().toString(36).substring(2, 11),
      level: 'info',
      category: 'VideoRenderer',
      message: `Rendered and registered final video: ${outName}`,
      createdAt: new Date().toISOString(),
    });

    return { jobId: 'completed', outputPath: outPath, assetId: asset.id };
  });

  // Google Flow Connection
  ipcMain.handle('getFlowConnectionStatus', async () => {
    return flowService.getFlowConnectionStatus();
  });

  ipcMain.handle('connectGoogleFlow', async (_, options?: any) => {
    return flowService.connectGoogleFlow(options);
  });

  ipcMain.handle('verifyGoogleFlowAccount', async (_, email: string) => {
    return flowService.verifyGoogleFlowAccount(email);
  });

  ipcMain.handle('openBrowserGoogleAuth', async (_, suggestedEmail?: string) => {
    return flowService.openBrowserGoogleAuth(suggestedEmail);
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
    if (platform === 'google') {
      const res = await googleAuthService.startOAuthFlow();
      return { account: res.state.account };
    }

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
    if (id.startsWith('google_')) {
      await googleAuthService.disconnect(id);
      return true;
    }
    return socialAccountRepo.disconnect(id);
  });

  // Google OAuth 2.0 (Official Loopback + PKCE & OIDC)
  ipcMain.handle('getGoogleAuthStatus', async (event) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    return googleAuthService.getStatus();
  });

  ipcMain.handle('connectGoogleAccount', async (event, customClientId?: string, customClientSecret?: string) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    return googleAuthService.startOAuthFlow(customClientId, customClientSecret);
  });

  ipcMain.handle('disconnectGoogleAccount', async (event, accountId?: string) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    return googleAuthService.disconnect(accountId);
  });

  ipcMain.handle('reconnectGoogleAccount', async (event, customClientId?: string, customClientSecret?: string) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    return googleAuthService.reconnect(customClientId, customClientSecret);
  });

  ipcMain.handle('refreshGoogleToken', async (event, accountId?: string) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    return googleAuthService.refreshAccessToken(accountId);
  });

  ipcMain.handle('setGoogleClientId', async (event, clientId: string) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    googleAuthService.setClientId(clientId);
    return true;
  });

  ipcMain.handle('getGoogleClientId', async (event) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    return googleAuthService.getClientId();
  });

  ipcMain.handle('setGoogleClientSecret', async (event, clientSecret: string) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    googleAuthService.setClientSecret(clientSecret);
    return true;
  });

  ipcMain.handle('getGoogleClientSecret', async (event) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    return googleAuthService.getClientSecret();
  });

  ipcMain.handle('cancelGoogleAuth', async (event) => {
    if (!validateIpcSender(event)) throw new Error('Unauthorized IPC sender');
    return googleAuthService.cancelPendingOAuth();
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

  ipcMain.handle('checkPlatformPostReadiness', async (_, params) => {
    return socialPublisher.checkPostReadiness(params);
  });

  // Performance Analytics
  ipcMain.handle('getAnalyticsSummary', async (_, filter) => {
    return analyticsService.getSummary(filter?.platform, filter?.timeframe);
  });

  ipcMain.handle('syncAnalyticsMetrics', async () => {
    return analyticsService.syncLiveMetrics();
  });

  ipcMain.handle('getTopPerformingPosts', async (_, limit = 10, platform = 'all') => {
    const summary = await analyticsService.getSummary(platform as any);
    return summary.topPosts.slice(0, limit);
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

  ipcMain.handle('getPhoneSetupDiagnostic', async (_, deviceId: string) => {
    return adbService.getPhoneSetupDiagnostic(deviceId);
  });

  ipcMain.handle('getLocalAppsInFolder', async () => {
    return adbService.scanLocalAppsFolder();
  });

  ipcMain.handle('installAppOnPhone', async (_, deviceId: string, filePath: string) => {
    return adbService.installApp(deviceId, filePath);
  });

  ipcMain.handle('installAllAppsOnPhone', async (_, deviceId: string) => {
    return adbService.installAllApps(deviceId);
  });

  ipcMain.handle('requestPhoneAdbRoot', async (_, deviceId: string) => {
    return adbService.requestRoot(deviceId);
  });

  ipcMain.handle('openPhoneSettings', async (_, deviceId: string, settingType: 'accounts' | 'wifi' | 'developer') => {
    return adbService.openSettings(deviceId, settingType);
  });

  ipcMain.handle('restartAdbServer', async () => {
    return adbService.restartAdbServer();
  });

  ipcMain.handle('connectWirelessAdb', async (_, hostPort: string) => {
    return adbService.connectWirelessAdb(hostPort);
  });


  // ATX Android Automation Engine
  ipcMain.handle('getAtxStatus', async (_, deviceId: string) => {
    return atxAutomationService.getAtxStatus(deviceId);
  });

  ipcMain.handle('initAtxAgent', async (_, deviceId: string) => {
    return atxAutomationService.initAtxAgent(deviceId);
  });

  ipcMain.handle('dumpAtxHierarchy', async (_, deviceId: string) => {
    return atxAutomationService.dumpHierarchy(deviceId);
  });

  ipcMain.handle('atxTap', async (_, deviceId: string, x: number, y: number) => {
    return atxAutomationService.tap(deviceId, x, y);
  });

  ipcMain.handle('atxSwipe', async (_, deviceId: string, sx: number, sy: number, ex: number, ey: number, durationMs?: number) => {
    return atxAutomationService.swipe(deviceId, sx, sy, ex, ey, durationMs);
  });

  ipcMain.handle('atxInputText', async (_, deviceId: string, text: string) => {
    return atxAutomationService.inputText(deviceId, text);
  });

  ipcMain.handle('atxPressKey', async (_, deviceId: string, key: 'home' | 'back' | 'enter' | 'power') => {
    return atxAutomationService.pressKey(deviceId, key);
  });

  ipcMain.handle('atxAutomatePublish', async (_, params) => {
    return atxAutomationService.automatePublish(params);
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

  // 16. Mobile Publishing Suite (PC Studio -> Phone -> Social Media)
  ipcMain.handle('getMobileDashboardStats', async () => {
    return publishingQueueService.getDashboardMobileStats();
  });

  ipcMain.handle('batchTransferVideos', async (_, request: BatchTransferRequest) => {
    return videoTransferService.batchTransfer(request);
  });

  ipcMain.handle('getTransferRecords', async (_, deviceId?: string) => {
    return videoTransferService.getTransferRecords(deviceId);
  });

  ipcMain.handle('retryTransferRecord', async (_, recordId: string) => {
    return videoTransferService.retryTransfer(recordId);
  });

  ipcMain.handle('getPhoneAppStatus', async (_, deviceId?: string) => {
    return appInstallationService.getAppStatus(deviceId);
  });

  ipcMain.handle('openPlayStoreApp', async (_, deviceId: string, packageName: string) => {
    return appInstallationService.openPlayStoreListing(deviceId, packageName);
  });

  ipcMain.handle('verifyAppInstalled', async (_, deviceId: string, packageName: string) => {
    return appInstallationService.verifyInstalled(deviceId, packageName);
  });

  ipcMain.handle('saveSocialAccountEmail', async (_, accountId: string, email: string) => {
    const acc = accountService.getAccountById(accountId);
    emailVerificationService.associateEmail({
      accountId,
      email,
      platform: acc?.platform || 'youtube',
    });
    return true;
  });

  ipcMain.handle('submitAccountOtp', async (_, request: OtpVerificationRequest) => {
    return emailVerificationService.verifyOtp(request);
  });

  ipcMain.handle('updateSocialAccountPage', async (_, accountId: string, pageId: string, pageName: string) => {
    return accountService.updateSelectedPage(accountId, pageId, pageName);
  });

  ipcMain.handle('confirmPublishCompleted', async (_, request: PublishConfirmationRequest) => {
    return publishingQueueService.confirmPublished(request);
  });

  ipcMain.handle('advanceJobToPhone', async (_, jobId: string, deviceId?: string) => {
    return publishingQueueService.advanceJobToPhone(jobId, deviceId);
  });

  ipcMain.handle('launchScrcpy', async (_, deviceId?: string) => {
    return androidDeviceService.launchScrcpy(deviceId);
  });

  ipcMain.handle('updateMediaAssetWorkflow', async (_, id: string, workflowStatus: VideoWorkflowStage) => {
    return videoStudioService.updateWorkflowStatus(id, workflowStatus);
  });
}
