import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { setupSecurityPolicies } from './security';
import { appDb } from './database/db';
import { queueService } from './services/queueService';
import { registerIpcHandlers } from './ipc';
import { logger } from './logger';

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
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

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
