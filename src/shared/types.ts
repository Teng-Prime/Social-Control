export type SocialPlatform = 'youtube' | 'tiktok' | 'facebook' | 'google';

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
  endingHook?: string;
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
  ipAddress?: string;
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

// ==========================================
// ATX (Android Test eXtension) Automation
// ==========================================
export interface AtxUiBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface AtxUiNode {
  text: string;
  resourceId: string;
  className: string;
  description: string;
  bounds: AtxUiBounds;
  center: { x: number; y: number };
  clickable: boolean;
  enabled: boolean;
  scrollable: boolean;
}

export interface AtxElementSelector {
  text?: string;
  textContains?: string;
  resourceId?: string;
  description?: string;
  descriptionContains?: string;
  className?: string;
  clickable?: boolean;
}

export interface AtxAgentStatus {
  isRunning: boolean;
  port: number;
  mode: 'atx_rpc' | 'adb_bridge' | 'simulated';
  details: string;
  version?: string;
}

export interface AtxActionResult {
  success: boolean;
  action: string;
  message: string;
  durationMs?: number;
  element?: AtxUiNode;
}

export interface AtxAutomatePostStep {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  timestamp: string;
}

export interface AtxAutomatePostParams {
  deviceId: string;
  platform: 'youtube' | 'tiktok' | 'facebook';
  videoPath: string;
  title: string;
  caption: string;
  hashtags?: string[];
}

export interface AtxAutomatePostResult {
  success: boolean;
  platform: string;
  message: string;
  steps: AtxAutomatePostStep[];
  postId?: string;
  postUrl?: string;
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

// ==========================================
// Performance & Content Analytics
// ==========================================
export interface PublishedPost {
  id: string;
  publishJobId: string;
  mediaAssetId: string;
  platform: SocialPlatform;
  accountId: string;
  remotePostId: string;
  remotePostUrl: string;
  title: string;
  thumbnailPath?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeSeconds: number;
  lastAnalyticsSync?: string;
  publishedAt: string;
  duration?: number;
  genre?: string;
}

export interface PlatformMetricBreakdown {
  platform: SocialPlatform;
  name: string;
  postsCount: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeSeconds: number;
  avgRetentionPercent: number;
  engagementRate: number;
}

export interface GenreMetricBreakdown {
  genre: string;
  postsCount: number;
  views: number;
  retentionPercent: number;
  color: string;
}

export interface DurationMetricBreakdown {
  bucket: 'short' | 'mid' | 'long';
  label: string;
  range: string;
  count: number;
  avgViews: number;
  retentionPercent: number;
  badge: string;
  note: string;
}

export interface AnalyticsSummary {
  timeframe: '7d' | '30d' | '90d' | 'all';
  platformFilter: 'all' | SocialPlatform;
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalWatchTimeHours: number;
  likeToViewRatio: number;
  avgRetentionPercent: number;
  viewsGrowthPercent: number;
  platformBreakdown: Record<SocialPlatform, PlatformMetricBreakdown>;
  genreBreakdown: GenreMetricBreakdown[];
  durationBreakdown: DurationMetricBreakdown[];
  topPosts: PublishedPost[];
  lastSyncedAt: string;
  isAuditedLive: boolean;
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
  googleClientId?: string;
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

export interface FlowConnectOptions {
  mode?: 'interactive' | 'external' | 'google_sso' | 'browser';
  email?: string;
}

export interface CaptionGenerationResult {
  variations: CaptionVariation[];
  platformLimitNotes: string;
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verifiedEmail?: boolean;
  locale?: string;
}

export type GoogleConnectionStatus =
  | 'not_connected'
  | 'connecting'
  | 'connected'
  | 'expired'
  | 'error'
  | 'disconnected';

export interface GoogleAuthState {
  status: GoogleConnectionStatus;
  statusLabel: string;
  profile?: GoogleUserProfile;
  account?: SocialAccount;
  error?: string;
  lastConnectedAt?: string;
  hasRefreshToken?: boolean;
  clientIdConfigured?: boolean;
}

export interface IAuthAPI {
  signInWithGoogle: (clientId?: string) => Promise<{ success: boolean; state: GoogleAuthState; authUrl?: string }>;
  getSession: () => Promise<GoogleAuthState>;
  signOut: (accountId?: string) => Promise<{ success: boolean; state: GoogleAuthState }>;
  reconnect: (accountId?: string) => Promise<{ success: boolean; state: GoogleAuthState }>;
  refreshToken: (accountId?: string) => Promise<{ success: boolean; state: GoogleAuthState }>;
  onAuthStateChanged: (callback: (state: GoogleAuthState) => void) => () => void;
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

  // Window Controls (Custom Titlebar Frame)
  windowControls: {
    minimize: () => Promise<boolean>;
    maximize: () => Promise<boolean>;
    close: () => Promise<boolean>;
    isMaximized: () => Promise<boolean>;
    onStateChange: (callback: (isMaximized: boolean) => void) => () => void;
  };

  // Storage
  getStorageFolders: () => Promise<Record<string, string>>;

  // Media & Video Library
  getMediaAssets: (filter?: { folder?: string; query?: string; favorite?: boolean }) => Promise<MediaAsset[]>;
  getMediaAssetById: (id: string) => Promise<MediaAsset | null>;
  createMediaAsset: (asset: Partial<MediaAsset> & { title: string; filePath?: string }) => Promise<MediaAsset>;
  batchCreateMediaAssets: (assets: Array<Partial<MediaAsset> & { title: string; filePath?: string }>) => Promise<MediaAsset[]>;
  importMediaAsset: (filePath: string, targetFolder?: 'Drafts' | 'ReadyToPublish' | 'Published') => Promise<MediaAsset>;
  updateMediaAsset: (id: string, updates: Partial<MediaAsset>) => Promise<MediaAsset>;
  batchUpdateMediaAssets: (ids: string[], updates: Partial<MediaAsset>) => Promise<MediaAsset[]>;
  deleteMediaAsset: (id: string, deleteFile?: boolean) => Promise<boolean>;
  batchDeleteMediaAssets: (ids: string[], deleteFiles?: boolean) => Promise<boolean>;
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
  generateNextVideoHook: (options: { topic: string; genre: string; climax?: string; hook?: string; endingType?: string }) => Promise<string>;
  autoMatchBackgroundMusic: (projectId: string) => Promise<{ success: boolean; track: any }>;
  autoAssignSceneSoundEffects: (projectId: string) => Promise<{ success: boolean; assignedCount: number; soundEffects: SoundEffectItem[] }>;
  generateSceneVideo: (sceneId: string, options?: { duration?: number; motionStyle?: string }) => Promise<{ success: boolean; videoPath: string; thumbnailPath?: string; message?: string }>;
  generateAllSceneVideos: (projectId: string) => Promise<{ success: boolean; generatedCount: number; message: string }>;
  renderProjectVideo: (projectId: string) => Promise<{ jobId: string }>;
  renderFinalVideo: (projectId: string, options?: { resolution?: string; aspectRatio?: string; mixAudio?: boolean; burnedSubtitles?: boolean }) => Promise<{ jobId: string; outputPath: string; assetId?: string }>;
  getFlowConnectionStatus: () => Promise<FlowConnectionInfo>;
  connectGoogleFlow: (options?: FlowConnectOptions) => Promise<FlowConnectionInfo>;
  verifyGoogleFlowAccount: (email: string) => Promise<FlowConnectionInfo>;
  openBrowserGoogleAuth: (suggestedEmail?: string) => Promise<{ success: boolean; url: string; port: number }>;
  checkFlowConnection: () => Promise<FlowConnectionInfo>;
  disconnectGoogleFlow: () => Promise<FlowConnectionInfo>;
  onFlowConnectionChanged?: (callback: (info: FlowConnectionInfo) => void) => () => void;

  // Social Accounts & Publishing
  getSocialAccounts: () => Promise<SocialAccount[]>;
  connectSocialAccount: (platform: SocialPlatform, authCode?: string) => Promise<{ authUrl?: string; account?: SocialAccount }>;
  disconnectSocialAccount: (id: string) => Promise<boolean>;
  getGoogleAuthStatus: () => Promise<GoogleAuthState>;
  connectGoogleAccount: (customClientId?: string) => Promise<{ success: boolean; state: GoogleAuthState; authUrl?: string }>;
  disconnectGoogleAccount: (accountId?: string) => Promise<{ success: boolean; state: GoogleAuthState }>;
  reconnectGoogleAccount: (accountId?: string) => Promise<{ success: boolean; state: GoogleAuthState }>;
  refreshGoogleToken: (accountId?: string) => Promise<{ success: boolean; state: GoogleAuthState }>;
  setGoogleClientId: (clientId: string) => Promise<boolean>;
  getGoogleClientId: () => Promise<string>;
  cancelGoogleAuth: () => Promise<boolean>;
  onGoogleAuthChanged?: (callback: (state: GoogleAuthState) => void) => () => void;
  getPublishJobs: (filter?: { status?: string; platform?: string }) => Promise<PublishJob[]>;
  createPublishJob: (job: Omit<PublishJob, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'status'>) => Promise<PublishJob>;
  executePublishJob: (jobId: string) => Promise<{ success: boolean; remotePostId?: string; remotePostUrl?: string; message?: string }>;
  cancelPublishJob: (jobId: string) => Promise<boolean>;
  checkPlatformPostReadiness: (params: PostReadinessParams) => Promise<PlatformPostCheckResult>;

  // Performance Analytics
  getAnalyticsSummary: (filter?: { platform?: 'all' | SocialPlatform; timeframe?: '7d' | '30d' | '90d' | 'all' }) => Promise<AnalyticsSummary>;
  syncAnalyticsMetrics: () => Promise<{ success: boolean; updatedCount: number; message: string }>;
  getTopPerformingPosts: (limit?: number, platform?: string) => Promise<PublishedPost[]>;

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
  restartAdbServer: () => Promise<{ success: boolean; message: string }>;
  connectWirelessAdb: (hostPort: string) => Promise<{ success: boolean; message: string }>;

  // ATX Android Automation Engine
  getAtxStatus: (deviceId: string) => Promise<AtxAgentStatus>;
  initAtxAgent: (deviceId: string) => Promise<AtxActionResult>;
  dumpAtxHierarchy: (deviceId: string) => Promise<{ success: boolean; elements: AtxUiNode[]; error?: string }>;
  atxTap: (deviceId: string, x: number, y: number) => Promise<AtxActionResult>;
  atxSwipe: (deviceId: string, sx: number, sy: number, ex: number, ey: number, durationMs?: number) => Promise<AtxActionResult>;
  atxInputText: (deviceId: string, text: string) => Promise<AtxActionResult>;
  atxPressKey: (deviceId: string, key: 'home' | 'back' | 'enter' | 'power') => Promise<AtxActionResult>;
  atxAutomatePublish: (params: AtxAutomatePostParams) => Promise<AtxAutomatePostResult>;


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
    authAPI: IAuthAPI;
  }
}
