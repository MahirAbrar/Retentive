import { app, BrowserWindow, shell, Menu, ipcMain, Tray, nativeImage } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import Store from 'electron-store';
import { NotificationService } from './notificationService.js';
import { setupConsoleErrorHandler } from './consoleErrorHandler.js';
// import { setupDatabaseHandlers } from './ipcHandlers/databaseHandlers.js';

// Setup console error handler immediately to prevent EIO errors
setupConsoleErrorHandler();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

// Load environment variables from .env file (not bundled in renderer)
// This keeps credentials secure and out of the bundled JavaScript
function loadEnvVariables(): Record<string, string> {
  const env: Record<string, string> = {};

  try {
    // Construct expected .env path
    const expectedEnvPath = path.join(__dirname, '..', '.env');

    // Resolve to canonical path to prevent directory traversal
    const realEnvPath = fs.realpathSync.native(expectedEnvPath);

    // Get the base directory (project root)
    const baseDir = fs.realpathSync.native(path.join(__dirname, '..'));

    // Security check: Ensure the resolved path is within the project directory
    if (!realEnvPath.startsWith(baseDir)) {
      console.error('Security: .env file path is outside project directory');
      return env;
    }

    // Additional check: Ensure we're reading exactly '.env' file
    if (path.basename(realEnvPath) !== '.env') {
      console.error('Security: Attempted to read non-.env file');
      return env;
    }

    const envContent = fs.readFileSync(realEnvPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex > 0) {
        const key = trimmed.substring(0, equalsIndex).trim();
        const value = trimmed.substring(equalsIndex + 1).trim();

        // Basic validation: Only accept alphanumeric keys with underscores
        if (/^[A-Z_][A-Z0-9_]*$/.test(key)) {
          env[key] = value;
        }
      }
    }
  } catch (error) {
    // File doesn't exist or can't be read - this is not critical, just log
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Failed to load .env file:', error);
    }
  }

  return env;
}

const envVars = loadEnvVariables();

// Supabase credentials - These are public-facing (anon key), protected by RLS
// Safe to bundle in the app as they're already exposed in the frontend code
const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || 'https://tnkvynxyoalhowrkxjio.supabase.co';
const SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRua3Z5bnh5b2FsaG93cmt4amlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDAyNDQsImV4cCI6MjA2OTUxNjI0NH0.gO5--MQRp5SAINjmIAXKO3caQ_E2bwk_-ruSe030ups';

/**
 * Validate external URLs to prevent security vulnerabilities
 * Only allows https:// and http:// protocols
 */
function isValidExternalUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Only allow https and http protocols
    const allowedProtocols = ['https:', 'http:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }

    // Reject localhost and private IPs in production
    if (!isDev) {
      const hostname = parsed.hostname.toLowerCase();

      // Reject localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return false;
      }

      // Reject private IP ranges
      if (
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.2') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.')
      ) {
        return false;
      }
    }

    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

let mainWindow: BrowserWindow | null = null;
let notificationService: NotificationService | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Generate a machine-specific encryption key for secure storage
function getEncryptionKey(): string {
  // Use app.getPath before app.whenReady() is safe in Electron
  const machineId = app.getPath('userData');
  const appName = app.getName();

  // Create a unique key based on machine-specific data
  return crypto
    .createHash('sha256')
    .update(machineId + appName + 'retentive-secure-storage-v1')
    .digest('hex');
}

// Initialize secure storage with machine-specific encryption
// Handle corrupted store data gracefully
let store: Store<Record<string, string>>;
try {
  store = new Store<Record<string, string>>({
    name: 'retentive-secure-storage',
    encryptionKey: getEncryptionKey(),
    schema: {
      'supabase.auth.token': {
        type: 'string',
      },
    },
  });
} catch (error) {
  console.error('Failed to load encrypted store, creating new one:', error);
  // If store is corrupted (e.g., wrong encryption key), clear it and recreate
  try {
    const storePath = path.join(
      app.getPath('userData'),
      'retentive-secure-storage.json'
    );
    if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }
  } catch (cleanupError) {
    console.error('Failed to cleanup corrupted store:', cleanupError);
  }
  // Create new store
  store = new Store<Record<string, string>>({
    name: 'retentive-secure-storage',
    encryptionKey: getEncryptionKey(),
    schema: {
      'supabase.auth.token': {
        type: 'string',
      },
    },
  });
}

function createTray() {
  // Use the logo.png for tray icon
  const logoPath = path.join(__dirname, '..', 'logo.png');
  let icon;
  
  if (fs.existsSync(logoPath)) {
    icon = nativeImage.createFromPath(logoPath);
    
    // Resize for tray (tray icons should be smaller)
    icon = icon.resize({ width: 16, height: 16 });
    
    // On macOS, set as template image (makes it work with light/dark mode)
    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }
  } else {
    // Fallback: Create a simple 16x16 icon programmatically
    icon = nativeImage.createFromBuffer(Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 16, 0, 0, 0, 16, 8, 2, 0, 0, 0, 144, 145, 104,
      54, 0, 0, 0, 25, 73, 68, 65, 84, 120, 156, 98, 248, 15, 0, 1, 1, 1, 0,
      24, 220, 3, 240, 15, 0, 3, 3, 0, 0, 254, 254, 254, 0, 0, 0,
      0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]));
  }
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Hide App',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Retentive - Spaced Repetition App');
  tray.setContextMenu(contextMenu);
  
  // On Windows, single click to show/hide
  if (process.platform === 'win32') {
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  }
}

function createWindow() {
  // Set the app icon - handle both dev and production paths
  let iconPath = path.join(__dirname, '..', 'logo.png');
  if (!fs.existsSync(iconPath)) {
    // Try alternative path for production build
    iconPath = path.join(process.resourcesPath || __dirname, 'logo.png');
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,  // ALWAYS enable web security
      allowRunningInsecureContent: false,
      enableRemoteModule: false,
      nodeIntegrationInWorker: false,
      backgroundThrottling: false,
      // Performance optimizations
      experimentalFeatures: true,
      enablePreferredSizeMode: true,
      v8CacheOptions: 'code',
      spellcheck: false,
      enableWebSQL: false,
      disableDialogs: false,
      disableHtmlFullscreenWindowResize: true
    },
    // Platform-specific titlebar styles
    ...(process.platform === 'darwin' ? {
      titleBarStyle: 'hiddenInset'
    } : process.platform === 'win32' ? {
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#fffef9',
        symbolColor: '#1a1a1a',
        height: 40
      }
    } : {}),
    backgroundColor: '#fffef9', // Cream background from our theme
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });



  // Configure session for proper CORS handling with Supabase
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.supabase.co/*'] },
    (details, callback) => {
      // In development, keep the localhost origin; in production use app://
      if (isDev) {
        details.requestHeaders['Origin'] = 'http://localhost:5173';
      } else {
        details.requestHeaders['Origin'] = 'file://';
      }
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  // Set Content Security Policy headers - more permissive in production for file protocol
  if (isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "connect-src 'self' http://localhost:* https://*.supabase.co wss://*.supabase.co https://*.supabase.in",
              "img-src 'self' data: https:",
              "font-src 'self' data: https://fonts.gstatic.com"
            ].join('; ')
          }
        });
      }
    );
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Don't automatically open DevTools - use Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows) to open manually
    
    // Add network error logging in development (only for errors)
    mainWindow.webContents.session.webRequest.onErrorOccurred({ urls: ['https://*.supabase.co/*'] }, (details) => {
      console.error('Network Error:', details.error, 'URL:', details.url);
    });
    
    // Comment out success logging to reduce console noise
    // mainWindow.webContents.session.webRequest.onCompleted({ urls: ['https://*.supabase.co/*'] }, (details) => {
    //   console.log('Request completed:', details.statusCode, 'URL:', details.url);
    // });
  } else {
    // Production: Load the built app
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Security: Only allow https:// and http:// URLs
    if (isValidExternalUrl(url)) {
      shell.openExternal(url);
    } else {
      console.warn('Blocked attempt to open invalid URL:', url);
    }
    return { action: 'deny' };
  });

  // Handle open-external IPC
  ipcMain.on('open-external', (event, url) => {
    // Security: Validate URL before opening
    if (typeof url !== 'string' || !url) {
      console.error('Invalid URL provided to open-external');
      return;
    }

    if (!isValidExternalUrl(url)) {
      console.warn('Blocked attempt to open invalid URL via IPC:', url);
      return;
    }

    shell.openExternal(url);
  });

  // Handle window close - hide instead of quit
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      
      // On macOS, hide dock icon when window is hidden
      if (process.platform === 'darwin' && app.dock) {
        app.dock.hide();
      }
    }
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Show dock icon when window is shown (macOS)
  mainWindow.on('show', () => {
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
    }
  });
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Retentive',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        isDev ? { role: 'toggleDevTools' } : null,
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ].filter(Boolean) as Electron.MenuItemConstructorOptions[]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/retentive-app')
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for secure storage
ipcMain.handle('secureStorage:get', async (_, key: string) => {
  try {
    return (store as any).get(key);
  } catch (error) {
    console.error('Error getting secure storage:', error);
    return null;
  }
});

ipcMain.handle('secureStorage:set', async (_, key: string, value: string) => {
  try {
    (store as any).set(key, value);
    return true;
  } catch (error) {
    console.error('Error setting secure storage:', error);
    return false;
  }
});

ipcMain.handle('secureStorage:remove', async (_, key: string) => {
  try {
    (store as any).delete(key);
    return true;
  } catch (error) {
    console.error('Error removing from secure storage:', error);
    return false;
  }
});

ipcMain.handle('secureStorage:clear', async () => {
  try {
    (store as any).clear();
    return true;
  } catch (error) {
    console.error('Error clearing secure storage:', error);
    return false;
  }
});

// IPC handler to get Supabase credentials (not bundled in renderer)
ipcMain.handle('getSupabaseConfig', async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase credentials not configured');
    console.error('SUPABASE_URL:', SUPABASE_URL ? 'present' : 'missing');
    console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'present' : 'missing');
    return null;
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
  };
});

// IPC handlers for auto-updater
ipcMain.handle('update:download', async () => {
  if (!isDev) {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('Failed to download update:', error);
      return { success: false, error: String(error) };
    }
  }
  return { success: false, error: 'Auto-update not available in development' };
});

ipcMain.handle('update:install', async () => {
  if (!isDev) {
    // This will quit the app and install the update
    autoUpdater.quitAndInstall();
    return { success: true };
  }
  return { success: false, error: 'Auto-update not available in development' };
});

// IPC handlers for notifications
ipcMain.handle('notifications:schedule', async (_, type: string, data: any) => {
  if (!notificationService) return false
  
  try {
    switch(type) {
      case 'daily':
        notificationService.scheduleDailyReminder(data.userId, data.time)
        break
      case 'streak':
        notificationService.scheduleStreakCheck(data.userId)
        break
      case 'item-due':
        notificationService.scheduleItemDueNotification(
          data.userId,
          data.itemId,
          data.itemContent,
          data.topicName,
          data.topicId,
          data.dueAt
        )
        break
    }
    return true
  } catch (error) {
    console.error('Error scheduling notification:', error)
    return false
  }
})

ipcMain.handle('notifications:cancel', async (_, type: string, data: string | { itemId: string }) => {
  if (!notificationService) return false
  
  try {
    if (type === 'all' && typeof data === 'string') {
      notificationService.cancelUserJobs(data) // data is userId
    } else if (type === 'item' && typeof data === 'object' && data.itemId) {
      notificationService.cancelItemNotification(data.itemId)
    } else if (typeof data === 'string') {
      notificationService.cancelJob(`${type}-${data}`)
    }
    return true
  } catch (error) {
    console.error('Error cancelling notification:', error)
    return false
  }
})

ipcMain.handle('notifications:test', async () => {
  if (!notificationService) return false
  
  try {
    notificationService.sendNotification(
      'Test Notification',
      'Notifications are working correctly! 🎉'
    )
    return true
  } catch (error) {
    console.error('Error sending test notification:', error)
    return false
  }
})

// Test daily reminder immediately
ipcMain.handle('notifications:testDaily', async (_, userId: string) => {
  if (!notificationService) {
    console.error('Notification service not initialized')
    return false
  }
  
  try {
    console.log('Manually triggering daily reminder for user:', userId)
    await notificationService.checkAndSendStudyReminder(userId)
    return true
  } catch (error) {
    console.error('Error testing daily reminder:', error)
    return false
  }
})

// Handle navigation from notifications
ipcMain.on('navigate-reply', (_, path: string) => {
  mainWindow?.webContents.send('navigate', path)
})

// Enable hardware acceleration
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// Optimize renderer process
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Disable unnecessary features
app.commandLine.appendSwitch('disable-features', 'TranslateUI');
app.commandLine.appendSwitch('disable-features', 'BlinkGenPropertyTrees');

app.whenReady().then(() => {
  // Set the dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    const dockIconPath = path.join(__dirname, '..', 'logo.png');
    if (fs.existsSync(dockIconPath)) {
      const dockIcon = nativeImage.createFromPath(dockIconPath);
      app.dock.setIcon(dockIcon);
    }
  }

  // Initialize notification service with credentials from .env (secure - not bundled)
  const supabaseUrl = envVars['VITE_SUPABASE_URL'];
  const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

  if (supabaseUrl && supabaseKey) {
    notificationService = new NotificationService(supabaseUrl, supabaseKey);
  } else {
    console.warn('Supabase credentials not found in .env - notification service disabled');
  }

  // Initialize database handlers
  // setupDatabaseHandlers();

  // Add stub handler for db:sync:status to prevent errors
  ipcMain.handle('db:sync:status', async () => {
    return {
      pendingOperations: 0,
      offlineStats: {
        topics: 0,
        items: 0,
        reviews: 0
      },
      lastSync: new Date().toISOString()
    }
  })

  // Keep existing stub handlers
  ipcMain.handle('db:user:upsert', async () => {
    return { success: true };
  });

  ipcMain.handle('db:gamification:getStats', async () => {
    return null;
  });

  ipcMain.handle('db:gamification:updateStats', async () => {
    return { success: true };
  });
  
  createWindow();
  createMenu();
  createTray();  // Create system tray

  // Set main window for notification service
  if (mainWindow && notificationService) {
    notificationService.setMainWindow(mainWindow);
  }

  // Auto-updater configuration
  // Only check for updates in production builds
  if (!isDev) {
    autoUpdater.logger = console;
    autoUpdater.autoDownload = false; // Don't auto-download, ask user first

    // Check for updates on startup
    autoUpdater.checkForUpdates();

    // Check for updates every hour
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 60 * 60 * 1000);

    // Auto-updater event handlers
    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      // Show notification to user
      if (mainWindow) {
        mainWindow.webContents.send('update-available', info);
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
    });

    autoUpdater.on('error', (err) => {
      console.error('Auto-updater error:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log('Download progress:', progressObj);
      if (mainWindow) {
        mainWindow.webContents.send('download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      // Notify user that update is ready to install
      if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', info);
      }
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit when all windows are closed - keep running in background
  // The app will only quit when isQuitting is true (from tray menu)
  if (isQuitting) {
    app.quit();
  }
});

// Removed duplicate unhandledRejection handler - now handled in consoleErrorHandler