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

  // Window Controls (Custom Titlebar Frame)
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onStateChange: (callback: (isMax: boolean) => void) => {
      const handler = (_: any, isMax: boolean) => callback(isMax);
      ipcRenderer.on('window:stateChange', handler);
      return () => ipcRenderer.removeListener('window:stateChange', handler);
    },
  },

  // Storage
  getStorageFolders: () => ipcRenderer.invoke('getStorageFolders'),

  // Media
  getMediaAssets: (filter) => ipcRenderer.invoke('getMediaAssets', filter),
  getMediaAssetById: (id) => ipcRenderer.invoke('getMediaAssetById', id),
  createMediaAsset: (asset) => ipcRenderer.invoke('createMediaAsset', asset),
  batchCreateMediaAssets: (assets) => ipcRenderer.invoke('batchCreateMediaAssets', assets),
  importMediaAsset: (filePath, targetFolder) => ipcRenderer.invoke('importMediaAsset', filePath, targetFolder),
  updateMediaAsset: (id, updates) => ipcRenderer.invoke('updateMediaAsset', id, updates),
  batchUpdateMediaAssets: (ids, updates) => ipcRenderer.invoke('batchUpdateMediaAssets', ids, updates),
  deleteMediaAsset: (id, deleteFile) => ipcRenderer.invoke('deleteMediaAsset', id, deleteFile),
  batchDeleteMediaAssets: (ids, deleteFiles) => ipcRenderer.invoke('batchDeleteMediaAssets', ids, deleteFiles),
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
  generateNextVideoHook: (options) => ipcRenderer.invoke('generateNextVideoHook', options),
  autoMatchBackgroundMusic: (projectId) => ipcRenderer.invoke('autoMatchBackgroundMusic', projectId),
  autoAssignSceneSoundEffects: (projectId) => ipcRenderer.invoke('autoAssignSceneSoundEffects', projectId),
  generateSceneVideo: (sceneId, options) => ipcRenderer.invoke('generateSceneVideo', sceneId, options),
  generateAllSceneVideos: (projectId) => ipcRenderer.invoke('generateAllSceneVideos', projectId),
  getFlowConnectionStatus: () => ipcRenderer.invoke('getFlowConnectionStatus'),
  connectGoogleFlow: (options) => ipcRenderer.invoke('connectGoogleFlow', options),
  verifyGoogleFlowAccount: (email) => ipcRenderer.invoke('verifyGoogleFlowAccount', email),
  openBrowserGoogleAuth: (suggestedEmail) => ipcRenderer.invoke('openBrowserGoogleAuth', suggestedEmail),
  checkFlowConnection: () => ipcRenderer.invoke('checkFlowConnection'),
  disconnectGoogleFlow: () => ipcRenderer.invoke('disconnectGoogleFlow'),
  onFlowConnectionChanged: (callback) => {
    const handler = (_: any, info: any) => callback(info);
    ipcRenderer.on('flowConnectionChanged', handler);
    return () => ipcRenderer.removeListener('flowConnectionChanged', handler);
  },

  getSocialAccounts: () => ipcRenderer.invoke('getSocialAccounts'),
  connectSocialAccount: (platform) => ipcRenderer.invoke('connectSocialAccount', platform),
  disconnectSocialAccount: (id) => ipcRenderer.invoke('disconnectSocialAccount', id),
  deleteSocialAccount: (id: string) => ipcRenderer.invoke('deleteSocialAccount', id),
  getGoogleAuthStatus: () => ipcRenderer.invoke('getGoogleAuthStatus'),
  connectGoogleAccount: (clientId?: string, clientSecret?: string) =>
    ipcRenderer.invoke('connectGoogleAccount', clientId, clientSecret),
  disconnectGoogleAccount: (accountId?: string) => ipcRenderer.invoke('disconnectGoogleAccount', accountId),
  reconnectGoogleAccount: (clientId?: string, clientSecret?: string) =>
    ipcRenderer.invoke('reconnectGoogleAccount', clientId, clientSecret),
  refreshGoogleToken: (accountId?: string) => ipcRenderer.invoke('refreshGoogleToken', accountId),
  setGoogleClientId: (clientId: string) => ipcRenderer.invoke('setGoogleClientId', clientId),
  getGoogleClientId: () => ipcRenderer.invoke('getGoogleClientId'),
  setGoogleClientSecret: (clientSecret: string) => ipcRenderer.invoke('setGoogleClientSecret', clientSecret),
  getGoogleClientSecret: () => ipcRenderer.invoke('getGoogleClientSecret'),
  cancelGoogleAuth: () => ipcRenderer.invoke('cancelGoogleAuth'),
  onGoogleAuthChanged: (callback) => {
    const handler = (_: any, state: any) => callback(state);
    ipcRenderer.on('googleAuthChanged', handler);
    return () => ipcRenderer.removeListener('googleAuthChanged', handler);
  },
  getPublishJobs: (filter) => ipcRenderer.invoke('getPublishJobs', filter),
  createPublishJob: (job) => ipcRenderer.invoke('createPublishJob', job),
  executePublishJob: (jobId) => ipcRenderer.invoke('executePublishJob', jobId),
  cancelPublishJob: (jobId) => ipcRenderer.invoke('cancelPublishJob', jobId),
  checkPlatformPostReadiness: (params) => ipcRenderer.invoke('checkPlatformPostReadiness', params),

  // Performance Analytics
  getAnalyticsSummary: (filter) => ipcRenderer.invoke('getAnalyticsSummary', filter),
  syncAnalyticsMetrics: () => ipcRenderer.invoke('syncAnalyticsMetrics'),
  getTopPerformingPosts: (limit, platform) => ipcRenderer.invoke('getTopPerformingPosts', limit, platform),

  // Captions
  generateCaptions: (req) => ipcRenderer.invoke('generateCaptions', req),

  // Phone Control & Provisioning Setup (ADB)
  getConnectedDevices: () => ipcRenderer.invoke('getConnectedDevices'),
  testAdbConnection: () => ipcRenderer.invoke('testAdbConnection'),
  transferFileToPhone: (deviceId, filePath, targetDir) =>
    ipcRenderer.invoke('transferFileToPhone', deviceId, filePath, targetDir),
  getTransferJobs: (deviceId) => ipcRenderer.invoke('getTransferJobs', deviceId),
  startScreenMirror: (deviceId) => ipcRenderer.invoke('startScreenMirror', deviceId),
  captureScreenshot: (deviceId) => ipcRenderer.invoke('captureScreenshot', deviceId),
  launchMobileApp: (deviceId, pkg) => ipcRenderer.invoke('launchMobileApp', deviceId, pkg),
  getPhoneSetupDiagnostic: (deviceId) => ipcRenderer.invoke('getPhoneSetupDiagnostic', deviceId),
  getLocalAppsInFolder: () => ipcRenderer.invoke('getLocalAppsInFolder'),
  installAppOnPhone: (deviceId, filePath) => ipcRenderer.invoke('installAppOnPhone', deviceId, filePath),
  installAllAppsOnPhone: (deviceId) => ipcRenderer.invoke('installAllAppsOnPhone', deviceId),
  requestPhoneAdbRoot: (deviceId) => ipcRenderer.invoke('requestPhoneAdbRoot', deviceId),
  openPhoneSettings: (deviceId, settingType) => ipcRenderer.invoke('openPhoneSettings', deviceId, settingType),
  restartAdbServer: () => ipcRenderer.invoke('restartAdbServer'),
  connectWirelessAdb: (hostPort) => ipcRenderer.invoke('connectWirelessAdb', hostPort),

  // ATX Automation Engine
  getAtxStatus: (deviceId) => ipcRenderer.invoke('getAtxStatus', deviceId),
  initAtxAgent: (deviceId) => ipcRenderer.invoke('initAtxAgent', deviceId),
  dumpAtxHierarchy: (deviceId) => ipcRenderer.invoke('dumpAtxHierarchy', deviceId),
  atxTap: (deviceId, x, y) => ipcRenderer.invoke('atxTap', deviceId, x, y),
  atxSwipe: (deviceId, sx, sy, ex, ey, durationMs) => ipcRenderer.invoke('atxSwipe', deviceId, sx, sy, ex, ey, durationMs),
  atxInputText: (deviceId, text) => ipcRenderer.invoke('atxInputText', deviceId, text),
  atxPressKey: (deviceId, key) => ipcRenderer.invoke('atxPressKey', deviceId, key),
  atxAutomatePublish: (params) => ipcRenderer.invoke('atxAutomatePublish', params),


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

  // Mobile Publishing Suite (PC Studio -> Phone -> Social Media)
  getMobileDashboardStats: () => ipcRenderer.invoke('getMobileDashboardStats'),
  batchTransferVideos: (request) => ipcRenderer.invoke('batchTransferVideos', request),
  getTransferRecords: (deviceId) => ipcRenderer.invoke('getTransferRecords', deviceId),
  retryTransferRecord: (id) => ipcRenderer.invoke('retryTransferRecord', id),
  getPhoneAppStatus: (deviceId) => ipcRenderer.invoke('getPhoneAppStatus', deviceId),
  openPlayStoreApp: (deviceId, packageName) => ipcRenderer.invoke('openPlayStoreApp', deviceId, packageName),
  verifyAppInstalled: (deviceId, packageName) => ipcRenderer.invoke('verifyAppInstalled', deviceId, packageName),
  saveSocialAccountEmail: (accountId, email) => ipcRenderer.invoke('saveSocialAccountEmail', accountId, email),
  submitAccountOtp: (request) => ipcRenderer.invoke('submitAccountOtp', request),
  updateSocialAccountPage: (accountId, pageId, pageName) =>
    ipcRenderer.invoke('updateSocialAccountPage', accountId, pageId, pageName),
  confirmPublishCompleted: (request) => ipcRenderer.invoke('confirmPublishCompleted', request),
  advanceJobToPhone: (jobId, deviceId) => ipcRenderer.invoke('advanceJobToPhone', jobId, deviceId),
  launchScrcpy: (deviceId) => ipcRenderer.invoke('launchScrcpy', deviceId),
  updateMediaAssetWorkflow: (id, workflowStatus) =>
    ipcRenderer.invoke('updateMediaAssetWorkflow', id, workflowStatus),

  // Phone Account Configuration & Play Store Remote Automation
  getPhoneAccountCredentials: (deviceId) => ipcRenderer.invoke('getPhoneAccountCredentials', deviceId),
  savePhoneAccountCredential: (credential) => ipcRenderer.invoke('savePhoneAccountCredential', credential),
  deletePhoneAccountCredential: (id) => ipcRenderer.invoke('deletePhoneAccountCredential', id),
  installAppFromPlayStore: (options) => ipcRenderer.invoke('installAppFromPlayStore', options),
  installAllAppsFromPlayStore: (deviceId, googlePassword) =>
    ipcRenderer.invoke('installAllAppsFromPlayStore', deviceId, googlePassword),
  autoLoginYouTubeGoogle: (deviceId, googleEmail) =>
    ipcRenderer.invoke('autoLoginYouTubeGoogle', deviceId, googleEmail),
  autoLoginTikTokGoogle: (deviceId, googleEmail) =>
    ipcRenderer.invoke('autoLoginTikTokGoogle', deviceId, googleEmail),

  // Hardware Acceleration & OpenAI Diagnostics
  testHardwareAcceleration: (encoder) => ipcRenderer.invoke('testHardwareAcceleration', encoder),
  testOpenAIConnection: (apiKey, model) => ipcRenderer.invoke('testOpenAIConnection', apiKey, model),
  getHardwareInfo: () => ipcRenderer.invoke('getHardwareInfo'),
};

const authAPI = {
  signInWithGoogle: (clientId?: string, clientSecret?: string) =>
    ipcRenderer.invoke('connectGoogleAccount', clientId, clientSecret),
  getSession: () => ipcRenderer.invoke('getGoogleAuthStatus'),
  signOut: (accountId?: string) => ipcRenderer.invoke('disconnectGoogleAccount', accountId),
  reconnect: (clientId?: string, clientSecret?: string) =>
    ipcRenderer.invoke('reconnectGoogleAccount', clientId, clientSecret),
  refreshToken: (accountId?: string) => ipcRenderer.invoke('refreshGoogleToken', accountId),
  onAuthStateChanged: (callback: (state: any) => void) => {
    const handler = (_: any, state: any) => callback(state);
    ipcRenderer.on('googleAuthChanged', handler);
    return () => ipcRenderer.removeListener('googleAuthChanged', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('authAPI', authAPI);
