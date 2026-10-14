import { contextBridge, ipcRenderer } from 'electron';
import { IElectronAPI } from '../shared/types';

const api: IElectronAPI = {
  // App & System
  getSystemHealth: () => ipcRenderer.invoke('getSystemHealth'),
  getDashboardStats: () => ipcRenderer.invoke('getDashboardStats'),
  getSettings: () => ipcRenderer.invoke('getSettings'),
  updateSettings: (settings) => ipcRenderer.invoke('updateSettings', settings),
  openDirectoryDialog: () => ipcRenderer.invoke('openDirectoryDialog'),
  openFileDialog: (extensions) => ipcRenderer.invoke('openFileDialog', extensions),
  revealInFileExplorer: (filePath) => ipcRenderer.invoke('revealInFileExplorer', filePath),
  openExternalUrl: (url) => ipcRenderer.invoke('openExternalUrl', url),

  // Storage
  getStorageFolders: () => ipcRenderer.invoke('getStorageFolders'),

  // Media
  getMediaAssets: (filter) => ipcRenderer.invoke('getMediaAssets', filter),
  getMediaAssetById: (id) => ipcRenderer.invoke('getMediaAssetById', id),
  importMediaAsset: (filePath, targetFolder) => ipcRenderer.invoke('importMediaAsset', filePath, targetFolder),
  updateMediaAsset: (id, updates) => ipcRenderer.invoke('updateMediaAsset', id, updates),
  deleteMediaAsset: (id, deleteFile) => ipcRenderer.invoke('deleteMediaAsset', id, deleteFile),
  generateThumbnail: (videoPath) => ipcRenderer.invoke('generateThumbnail', videoPath),

  // Characters
  getCharacters: () => ipcRenderer.invoke('getCharacters'),
  getCharacterById: (id) => ipcRenderer.invoke('getCharacterById', id),
  createCharacter: (char) => ipcRenderer.invoke('createCharacter', char),
  updateCharacter: (id, updates) => ipcRenderer.invoke('updateCharacter', id, updates),
  deleteCharacter: (id) => ipcRenderer.invoke('deleteCharacter', id),
  addCharacterReference: (charId, imgPath, prompt, isPrimary) =>
    ipcRenderer.invoke('addCharacterReference', charId, imgPath, prompt, isPrimary),
  deleteCharacterReference: (refId) => ipcRenderer.invoke('deleteCharacterReference', refId),
  generateCharacterPhoto: (charId, angle) => ipcRenderer.invoke('generateCharacterPhoto', charId, angle),
  generateCharacterSuite: (charId) => ipcRenderer.invoke('generateCharacterSuite', charId),
  setCharacterPrimaryReference: (charId, refId) => ipcRenderer.invoke('setCharacterPrimaryReference', charId, refId),
  copyImageToClipboard: (imgPath) => ipcRenderer.invoke('copyImageToClipboard', imgPath),

  // Story Projects & Flow AI
  getProjects: () => ipcRenderer.invoke('getProjects'),
  getProjectById: (id) => ipcRenderer.invoke('getProjectById', id),
  createProject: (proj) => ipcRenderer.invoke('createProject', proj),
  updateProject: (id, updates) => ipcRenderer.invoke('updateProject', id, updates),
  deleteProject: (id) => ipcRenderer.invoke('deleteProject', id),
  createScene: (scene) => ipcRenderer.invoke('createScene', scene),
  updateScene: (id, updates) => ipcRenderer.invoke('updateScene', id, updates),
  deleteScene: (id) => ipcRenderer.invoke('deleteScene', id),
  reorderScenes: (projectId, sceneIds) => ipcRenderer.invoke('reorderScenes', projectId, sceneIds),
  generateScript: (prompt, genre, len) => ipcRenderer.invoke('generateScript', prompt, genre, len),
  generateStoryIdeas: (topic, genre, chars) => ipcRenderer.invoke('generateStoryIdeas', topic, genre, chars),
  generateHook: (topic, genre, tone) => ipcRenderer.invoke('generateHook', topic, genre, tone),
  transformStoryScript: (opts) => ipcRenderer.invoke('transformStoryScript', opts),
  generateFullStory: (opts) => ipcRenderer.invoke('generateFullStory', opts),
  generateVoiceover: (projId, text, voiceSettings) => ipcRenderer.invoke('generateVoiceover', projId, text, voiceSettings),
  getBuiltinAudioLibrary: () => ipcRenderer.invoke('getBuiltinAudioLibrary'),
  renderProjectVideo: (projectId) => ipcRenderer.invoke('renderProjectVideo', projectId),
  renderFinalVideo: (projectId, opts) => ipcRenderer.invoke('renderFinalVideo', projectId, opts),
  getFlowConnectionStatus: () => ipcRenderer.invoke('getFlowConnectionStatus'),
  connectGoogleFlow: () => ipcRenderer.invoke('connectGoogleFlow'),
  checkFlowConnection: () => ipcRenderer.invoke('checkFlowConnection'),
  disconnectGoogleFlow: () => ipcRenderer.invoke('disconnectGoogleFlow'),

  // Social Accounts & Publishing
  getSocialAccounts: () => ipcRenderer.invoke('getSocialAccounts'),
  connectSocialAccount: (platform) => ipcRenderer.invoke('connectSocialAccount', platform),
  disconnectSocialAccount: (id) => ipcRenderer.invoke('disconnectSocialAccount', id),
  getPublishJobs: (filter) => ipcRenderer.invoke('getPublishJobs', filter),
  createPublishJob: (job) => ipcRenderer.invoke('createPublishJob', job),
  executePublishJob: (jobId) => ipcRenderer.invoke('executePublishJob', jobId),
  cancelPublishJob: (jobId) => ipcRenderer.invoke('cancelPublishJob', jobId),
  checkPlatformPostReadiness: (params) => ipcRenderer.invoke('checkPlatformPostReadiness', params),

  // Captions
  generateCaptions: (req) => ipcRenderer.invoke('generateCaptions', req),

  // Phone Control
  getConnectedDevices: () => ipcRenderer.invoke('getConnectedDevices'),
  testAdbConnection: () => ipcRenderer.invoke('testAdbConnection'),
  transferFileToPhone: (deviceId, filePath, targetDir) =>
    ipcRenderer.invoke('transferFileToPhone', deviceId, filePath, targetDir),
  getTransferJobs: (deviceId) => ipcRenderer.invoke('getTransferJobs', deviceId),
  startScreenMirror: (deviceId) => ipcRenderer.invoke('startScreenMirror', deviceId),
  captureScreenshot: (deviceId) => ipcRenderer.invoke('captureScreenshot', deviceId),
  launchMobileApp: (deviceId, pkg) => ipcRenderer.invoke('launchMobileApp', deviceId, pkg),

  // Task Queue
  getQueueItems: (filter) => ipcRenderer.invoke('getQueueItems', filter),
  cancelQueueItem: (id) => ipcRenderer.invoke('cancelQueueItem', id),
  retryQueueItem: (id) => ipcRenderer.invoke('retryQueueItem', id),
  pauseQueue: () => ipcRenderer.invoke('pauseQueue'),
  resumeQueue: () => ipcRenderer.invoke('resumeQueue'),
  isQueuePaused: () => ipcRenderer.invoke('isQueuePaused'),

  // Logs
  getLogs: (limit, level) => ipcRenderer.invoke('getLogs', limit, level),
  clearLogs: () => ipcRenderer.invoke('clearLogs'),
  exportLogs: () => ipcRenderer.invoke('exportLogs'),

  // Backup
  backupDatabase: () => ipcRenderer.invoke('backupDatabase'),
  restoreDatabase: (path) => ipcRenderer.invoke('restoreDatabase', path),
};

contextBridge.exposeInMainWorld('api', api);
