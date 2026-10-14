import { app, session, shell, BrowserWindow } from 'electron';

/**
 * Configure Electron security best practices:
 * - Content Security Policy (CSP)
 * - Navigation restrictions (prevent navigation to untrusted external sites inside the app)
 * - Window open handler (open external links in default OS browser)
 * - Permission request restrictions
 */
export function setupSecurityPolicies(mainWindow: BrowserWindow): void {
  // Enforce Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          // Allow scripts from self and local dev server
          // Allow styles with inline for Tailwind dynamic classes
          // Allow images/media from local files (app:// or file://) and data: blobs
          "default-src 'self' 'unsafe-inline' data: blob: file:; " +
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' data: https://fonts.gstatic.com; " +
          "img-src 'self' data: blob: file: https:; " +
          "media-src 'self' data: blob: file:; " +
          "connect-src 'self' http://localhost:* ws://localhost:* https:;"
        ],
      },
    });
  });

  // Intercept permission requests (deny unknown permissions)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['fullscreen'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Intercept navigation to prevent navigating inside Electron to external websites
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // Allow navigation to local dev server or local file
    if (parsedUrl.origin !== 'http://localhost:5173' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Intercept new window requests (e.g. window.open or target="_blank")
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}
