export type SocialPlatform = 'youtube' | 'tiktok' | 'facebook';

export type PublishStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type DeviceStatus = 'disconnected' | 'detecting' | 'connected' | 'unauthorized' | 'offline' | 'error';

export interface CharacterReference {
  id: string;
  characterId: string;
  imagePath: string;
  prompt: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  appearance: string;
  clothing: string;
  ageRange: string;
  personality: string;
  voice: string;
  visualStyle: string;
  isLocked: boolean;
  references: CharacterReference[];
  createdAt: string;
  updatedAt: string;
}

export type StoryGenre =
  | 'mystery'
  | 'emotional'
  | 'drama'
  | 'comedy'
  | 'romance'
  | 'horror'
  | 'adventure'
  | 'moral';

export interface VoiceSettings {
  provider: string;
  voice: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  speed: number;
  pitch: number;
  volume: number;
  audioPath?: string;
}

export interface MusicSettings {
  trackId: string;
  trackTitle: string;
  audioPath?: string;
  mood: string;
  volume: number;
  trimStart: number;
  trimEnd: number;
  fadeIn: boolean;
  fadeOut: boolean;
  loop: boolean;
  ducking: boolean;
}

export interface SoundEffectItem {
  id: string;
  sceneId?: string;
  name: string;
  category?: string;
  audioPath?: string;
  volume: number;
  startTime: number;
  duration: number;
}

export interface SubtitleSettings {
  enabled: boolean;
  style: 'minimal' | 'boxed' | 'highlight' | 'tiktok';
  text: string;
  srtPath?: string;
}

export interface Scene {
  id: string;
  projectId: string;
  sceneNumber: number;
  title?: string;
  scriptText: string;
  narration: string;
  characterId?: string;
  characterName?: string;
  referenceImagePath?: string;
  generationPrompt: string;
  duration: number; // in seconds
  videoPath?: string;
  audioPath?: string;
  visualDescription?: string;
  cameraAngle?: string;
  lighting?: string;
  actions?: string;
  environment?: string;
  soundEffectSuggestion?: string;
  negativePrompt?: string;
  status: 'draft' | 'generating' | 'ready' | 'approved' | 'failed';
  error?: string;
}

export interface StoryProject {
  id: string;
  title: string;
  genre: StoryGenre;
  aspectRatio: '9:16' | '16:9' | '1:1';
  targetDuration: number;
  language: string;
  voice: string;
  status: 'draft' | 'scripted' | 'generating' | 'review' | 'assembled' | 'exported';
  hook: string;
  intro: string;
  climax: string;
  ending: string;
  continuityNotes: string;
  scenes: Scene[];
  selectedCharacterIds?: string[];
  storyIdea?: string;
  targetAudience?: string;
  platform?: 'tiktok' | 'youtube' | 'facebook';
  storyTone?: string;
  customInstructions?: string;
  voiceSettings?: VoiceSettings;
  musicSettings?: MusicSettings;
  soundEffects?: SoundEffectItem[];
  subtitlesSettings?: SubtitleSettings;
  finalVideoPath?: string;
  currentStep?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  title: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  format: string;
  thumbnailPath: string;
  tags: string[];
  folder: 'Drafts' | 'ReadyToPublish' | 'Published';
  isFavorite: boolean;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  avatarUrl?: string;
  channelId?: string;
  isConnected: boolean;
  permissions: string[];
  tokenExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishJob {
  id: string;
  mediaAssetId: string;
  platform: SocialPlatform;
  accountId: string;
  accountName?: string;
  title: string;
  caption: string;
  hashtags: string[];
  tags: string[];
  privacy: 'public' | 'unlisted' | 'private';
  scheduledFor?: string;
  status: PublishStatus;
  progress: number;
  remotePostId?: string;
  remotePostUrl?: string;
  errorMessage?: string;
  aiDisclosure: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstalledAppInfo {
  packageName: string;
  appName: string;
  isInstalled: boolean;
  playStoreUrl: string;
}

export interface Device {
  id: string;
  serial: string;
  model: string;
  androidVersion: string;
  status: DeviceStatus;
  batteryLevel?: number;
  availableStorageMb?: number;
  totalStorageMb?: number;
  installedApps: InstalledAppInfo[];
  lastConnectedAt: string;
  isRooted?: boolean;
  googleAccount?: string;
  googleAccountsCount?: number;
  hasInternet?: boolean;
}

export interface LocalAppPackageInfo {
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  format: 'apk' | 'xapk';
  appName: string;
  packageName: string;
  category: string;
  isInstalled: boolean;
  installedVersion?: string;
}

export interface PhoneSetupDiagnostic {
  deviceId: string;
  serial: string;
  model: string;
  status: DeviceStatus;
  
  // 1. Root phone status
  rootStatus: {
    isRooted: boolean;
    rootMethod?: 'su' | 'adb_root' | 'magisk' | 'none';
    details: string;
  };

  // 2. Internet connectivity
  internetStatus: {
    hasInternet: boolean;
    pingMs?: number;
    networkType?: 'wifi' | 'cellular' | 'vpn' | 'ethernet' | 'none';
    details: string;
    vpnActive?: boolean;
  };

  // 3. Single Google Account verification (1 Phone = 1 Google Account)
  googleAccountStatus: {
    count: number;
    accounts: string[];
    primaryAccount?: string;
    isOptimal: boolean;
    status: 'optimal' | 'missing' | 'multiple';
    message: string;
  };

  // 4. Apps folder inspection & status
  appsFolderStatus: {
    totalAppsInFolder: number;
    installedCount: number;
    missingCount: number;
    apps: LocalAppPackageInfo[];
  };

  overallReadiness: {
    score: number; // 0 to 100
    isReady: boolean;
    summary: string;
  };
}

export interface AppInstallResult {
  appName: string;
  packageName?: string;
  success: boolean;
  message: string;
}

export interface BatchInstallResult {
  total: number;
  installed: number;
  failed: number;
  results: AppInstallResult[];
}

export interface TransferJob {
  id: string;
  deviceId: string;
  sourceFilePath: string;
  destinationPath: string;
  fileSize: number;
  transferredBytes: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PlatformPostCheckItem {
  name: string;
  passed: boolean;
  severity: 'success' | 'warn' | 'error';
  message: string;
}

export interface PlatformPostCheckResult {
  canPost: boolean;
  status: 'ready' | 'warning' | 'error';
  platform: SocialPlatform;
  platformName: string;
  checks: PlatformPostCheckItem[];
  summary: string;
  recommendations: string[];
  platformLimits: {
    maxTitleLength: number;
    maxCaptionLength: number;
    maxDurationSeconds: number;
    recommendedAspectRatio: string;
    packageName: string;
    appName: string;
  };
}

export interface PostReadinessParams {
  platform: SocialPlatform;
  deviceId?: string;
  mediaAssetId?: string;
  checkQuery?: string;
  title?: string;
  caption?: string;
  hashtags?: string[];
  privacy?: string;
}

export interface TaskQueueItem {
  id: string;
  type: 'character_gen' | 'video_gen' | 'video_render' | 'file_transfer' | 'caption_gen' | 'upload' | 'publishing';
  title: string;
  payload: Record<string, any>;
  status: TaskStatus;
  progress: number;
  priority: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface StudioSettings {
  storageDirectory: string;
  ffmpegPath: string;
  adbPath: string;
  flowApiKey: string;
  flowApiEndpoint: string;
  flowIntegrationMode: 'api' | 'manual_assisted';
  defaultAiProvider: string;
  defaultResolution: string;
  defaultAspectRatio: string;
  defaultVoice: string;
  phoneTransferFolder: string;
  queueConcurrency: number;
  logLevel: string;
  theme: 'dark' | 'light';
}

export interface ActivityLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  details?: string;
  createdAt: string;
}

export interface SystemHealth {
  databaseConnected: boolean;
  ffmpegAvailable: boolean;
  ffmpegVersion?: string;
  adbAvailable: boolean;
  adbVersion?: string;
  storageAvailableMb: number;
  storageTotalMb: number;
  storagePath: string;
}

export interface DashboardStats {
  totalGeneratedVideos: number;
  videosReadyToPublish: number;
  publishedPosts: number;
  scheduledPosts: number;
  failedJobs: number;
  connectedAccountsCount: number;
  connectedDevicesCount: number;
  storageUsedBytes: number;
  storageFreeBytes: number;
  recentProjects: StoryProject[];
  recentActivity: ActivityLog[];
  queueSummary: {
    pending: number;
    running: number;
    failed: number;
    completed: number;
  };
}

export interface CaptionGenerationRequest {
  videoTitle: string;
  scriptText?: string;
  targetPlatform: SocialPlatform;
  targetAudience: string;
  language: string;
  tone: 'engaging' | 'professional' | 'humorous' | 'dramatic' | 'educational' | 'storytelling';
  keywords: string[];
  callToAction: string;
  customInstructions?: string;
}

export interface CaptionVariation {
  title: string;
  caption: string;
  hashtags: string[];
  pinnedComment: string;
  thumbnailText: string;
  searchKeywords: string[];
}

export type FlowConnectionStatus =
  | 'not_connected'
  | 'connecting'
  | 'opened_unverified'
  | 'connected'
  | 'session_expired'
  | 'error';

export interface FlowConnectionInfo {
  status: FlowConnectionStatus;
  statusLabel: string;
  officialUrl: string;
  connectedEmail?: string;
  lastOpenedAt?: string;
  lastCheckedAt?: string;
  hasProgrammaticApi: boolean;
  notes: string;
}

export interface CaptionGenerationResult {
  variations: CaptionVariation[];
  platformLimitNotes: string;
}

// Window Electron API bridge definition
export interface IElectronAPI {
  // App & System
  getSystemHealth: () => Promise<SystemHealth>;
  getDashboardStats: () => Promise<DashboardStats>;
  getSettings: () => Promise<StudioSettings>;
  updateSettings: (settings: Partial<StudioSettings>) => Promise<StudioSettings>;
  openDirectoryDialog: () => Promise<string | null>;
  openFileDialog: (extensions?: string[]) => Promise<string | null>;
  revealInFileExplorer: (filePath: string) => Promise<boolean>;
  openExternalUrl: (url: string) => Promise<boolean>;

  // Storage
  getStorageFolders: () => Promise<Record<string, string>>;

  // Media & Video Library
  getMediaAssets: (filter?: { folder?: string; query?: string; favorite?: boolean }) => Promise<MediaAsset[]>;
  getMediaAssetById: (id: string) => Promise<MediaAsset | null>;
  importMediaAsset: (filePath: string, targetFolder?: 'Drafts' | 'ReadyToPublish' | 'Published') => Promise<MediaAsset>;
  updateMediaAsset: (id: string, updates: Partial<MediaAsset>) => Promise<MediaAsset>;
  deleteMediaAsset: (id: string, deleteFile?: boolean) => Promise<boolean>;
  generateThumbnail: (videoPath: string) => Promise<string>;

  // Characters
  getCharacters: () => Promise<Character[]>;
  getCharacterById: (id: string) => Promise<Character | null>;
  createCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'references'>) => Promise<Character>;
  updateCharacter: (id: string, updates: Partial<Character>) => Promise<Character>;
  deleteCharacter: (id: string) => Promise<boolean>;
  addCharacterReference: (characterId: string, imagePath: string, prompt: string, isPrimary: boolean) => Promise<CharacterReference>;
  deleteCharacterReference: (referenceId: string) => Promise<boolean>;
  generateCharacterPhoto: (characterId: string, angle?: 'front' | 'three_quarter' | 'profile' | 'full_body') => Promise<CharacterReference>;
  generateCharacterSuite: (characterId: string) => Promise<CharacterReference[]>;
  setCharacterPrimaryReference: (characterId: string, referenceId: string) => Promise<boolean>;
  copyImageToClipboard: (imagePath: string) => Promise<boolean>;

  // Story Projects & Flow AI
  getProjects: () => Promise<StoryProject[]>;
  getProjectById: (id: string) => Promise<StoryProject | null>;
  createProject: (project: Omit<StoryProject, 'id' | 'createdAt' | 'updatedAt' | 'scenes'>) => Promise<StoryProject>;
  updateProject: (id: string, updates: Partial<StoryProject>) => Promise<StoryProject>;
  deleteProject: (id: string) => Promise<boolean>;
  createScene: (scene: Omit<Scene, 'id'>) => Promise<Scene>;
  updateScene: (id: string, updates: Partial<Scene>) => Promise<Scene>;
  deleteScene: (id: string) => Promise<boolean>;
  reorderScenes: (projectId: string, sceneIds: string[]) => Promise<boolean>;
  generateScript: (prompt: string, genre: string, lengthMinutes: number) => Promise<{ hook: string; intro: string; scenes: Array<{ scriptText: string; narration: string; prompt: string }>; climax: string; ending: string }>;
  generateStoryIdeas: (topic: string, genre: string, characterNames?: string[]) => Promise<string[]>;
  generateHook: (topic: string, genre: string, tone: string) => Promise<string>;
  transformStoryScript: (options: { script: string; hook: string; action: 'rewrite' | 'improve_hook' | 'shorten' | 'expand' | 'continue'; genre: string }) => Promise<{ hook: string; script: string; climax?: string; ending?: string }>;
  generateFullStory: (options: { prompt: string; genre: string; targetDuration: number; platform?: string; tone?: string; targetAudience?: string; characterIds?: string[]; customInstructions?: string }) => Promise<{ hook: string; intro: string; scenes: Array<{ title: string; scriptText: string; narration: string; prompt: string; duration: number; visualDescription: string; cameraAngle: string; lighting: string; actions: string; environment: string; soundEffectSuggestion: string; negativePrompt: string }>; climax: string; ending: string }>;
  generateVoiceover: (projectId: string, text: string, voiceSettings: VoiceSettings) => Promise<{ audioPath: string; duration: number }>;
  getBuiltinAudioLibrary: () => Promise<{ music: Array<{ id: string; title: string; mood: string; genre: string; duration: number; path: string }>; soundEffects: Array<{ id: string; name: string; category: string; duration: number; path: string }> }>;
  renderProjectVideo: (projectId: string) => Promise<{ jobId: string }>;
  renderFinalVideo: (projectId: string, options?: { resolution?: string; aspectRatio?: string; mixAudio?: boolean; burnedSubtitles?: boolean }) => Promise<{ jobId: string; outputPath: string; assetId?: string }>;
  getFlowConnectionStatus: () => Promise<FlowConnectionInfo>;
  connectGoogleFlow: () => Promise<FlowConnectionInfo>;
  checkFlowConnection: () => Promise<FlowConnectionInfo>;
  disconnectGoogleFlow: () => Promise<FlowConnectionInfo>;

  // Social Accounts & Publishing
  getSocialAccounts: () => Promise<SocialAccount[]>;
  connectSocialAccount: (platform: SocialPlatform, authCode?: string) => Promise<{ authUrl?: string; account?: SocialAccount }>;
  disconnectSocialAccount: (id: string) => Promise<boolean>;
  getPublishJobs: (filter?: { status?: string; platform?: string }) => Promise<PublishJob[]>;
  createPublishJob: (job: Omit<PublishJob, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'status'>) => Promise<PublishJob>;
  executePublishJob: (jobId: string) => Promise<{ success: boolean; remotePostId?: string; remotePostUrl?: string; message?: string }>;
  cancelPublishJob: (jobId: string) => Promise<boolean>;
  checkPlatformPostReadiness: (params: PostReadinessParams) => Promise<PlatformPostCheckResult>;

  // Caption Assistant
  generateCaptions: (request: CaptionGenerationRequest) => Promise<CaptionGenerationResult>;

  // Phone Control & Provisioning Setup (ADB)
  getConnectedDevices: () => Promise<Device[]>;
  testAdbConnection: () => Promise<{ success: boolean; version?: string; error?: string }>;
  transferFileToPhone: (deviceId: string, localFilePath: string, targetPhoneDir?: string) => Promise<TransferJob>;
  getTransferJobs: (deviceId?: string) => Promise<TransferJob[]>;
  startScreenMirror: (deviceId: string) => Promise<{ success: boolean; message: string }>;
  captureScreenshot: (deviceId: string) => Promise<{ success: boolean; imageBase64?: string; error?: string }>;
  launchMobileApp: (deviceId: string, packageName: string) => Promise<boolean>;
  getPhoneSetupDiagnostic: (deviceId: string) => Promise<PhoneSetupDiagnostic>;
  getLocalAppsInFolder: () => Promise<LocalAppPackageInfo[]>;
  installAppOnPhone: (deviceId: string, filePath: string) => Promise<AppInstallResult>;
  installAllAppsOnPhone: (deviceId: string) => Promise<BatchInstallResult>;
  requestPhoneAdbRoot: (deviceId: string) => Promise<{ success: boolean; message: string }>;
  openPhoneSettings: (deviceId: string, settingType: 'accounts' | 'wifi' | 'developer') => Promise<{ success: boolean; message: string }>;

  // Automation Task Queue
  getQueueItems: (filter?: { status?: TaskStatus }) => Promise<TaskQueueItem[]>;
  cancelQueueItem: (id: string) => Promise<boolean>;
  retryQueueItem: (id: string) => Promise<boolean>;
  pauseQueue: () => Promise<boolean>;
  resumeQueue: () => Promise<boolean>;
  isQueuePaused: () => Promise<boolean>;

  // Logs & Activity
  getLogs: (limit?: number, level?: string) => Promise<ActivityLog[]>;
  clearLogs: () => Promise<boolean>;
  exportLogs: () => Promise<string>;

  // Database Backup/Restore
  backupDatabase: () => Promise<string>;
  restoreDatabase: (backupFilePath: string) => Promise<boolean>;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
