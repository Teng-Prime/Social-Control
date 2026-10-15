import { app, BrowserWindow, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { setupSecurityPolicies } from './security';
import { appDb } from './database/db';
import { queueService } from './services/queueService';
import { registerIpcHandlers } from './ipc';
import { logger } from './logger';

// Set Application User Model ID for Windows Taskbar grouping and icon binding
if (process.platform === 'win32') {
  app.setAppUserModelId('com.socialearningsstudio.app');
}

/**
 * Resolves the application taskbar & window icon across development and production packaging
 */
function getAppIconPath(): string {
  const isWin = process.platform === 'win32';
  const iconName = isWin ? 'icon.ico' : 'icon.png';

  const candidateDirs = [
    path.join(__dirname, '../../resources'),
    path.join(__dirname, '../resources'),
    path.join(__dirname, 'resources'),
    path.join(process.cwd(), 'resources'),
    path.join(__dirname, '../../build'),
    path.join(process.cwd(), 'build'),
  ];

  for (const dir of candidateDirs) {
    const fullPath = path.join(dir, iconName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Fallback to PNG on Windows if ICO is not found
  for (const dir of candidateDirs) {
    const pngPath = path.join(dir, 'icon.png');
    if (fs.existsSync(pngPath)) {
      return pngPath;
    }
  }

  return '';
}

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  // Initialize Database & Storage
  appDb.init();

  // Remove native OS application menu (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  // Register all typed IPC channels
  registerIpcHandlers();

  // Start automation background queue worker
  queueService.start();

  const iconPath = getAppIconPath();
  const iconImage = iconPath ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 750,
    backgroundColor: '#0B0F17',
    show: false,
    frame: false, // Frameless window - custom sleek titlebar frame rendered in React
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    icon: iconImage || (iconPath ? iconPath : undefined),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (iconImage && !iconImage.isEmpty()) {
    mainWindow.setIcon(iconImage);
  }

  mainWindow.setMenuBarVisibility(false);

  // Broadcast window state changes for maximize / restore UI icon toggle
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:stateChange', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:stateChange', false);
  });

  // Apply security policies (CSP, external link navigation, permission filtering)
  setupSecurityPolicies(mainWindow);

  // Show window once ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    logger.info('App', 'Main desktop application window shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load URL based on environment
  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

// App lifecycle
app.whenReady().then(async () => {
  logger.info('App', 'Social Earnings Studio starting...');
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  queueService.stop();
  appDb.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  queueService.stop();
  appDb.close();
});
