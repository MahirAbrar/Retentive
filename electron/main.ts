import { app, BrowserWindow, shell, Menu, ipcMain, Tray, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Store from 'electron-store';
import { NotificationService } from './notificationService.js';
import { setupConsoleErrorHandler } from './consoleErrorHandler.js';
// import { setupDatabaseHandlers } from './ipcHandlers/databaseHandlers.js';

// Setup console error handler immediately to prevent EIO errors
setupConsoleErrorHandler();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let notificationService: NotificationService | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Initialize secure storage with encryption
const store = new Store<Record<string, string>>({
  name: 'retentive-secure-storage',
  encryptionKey: 'retentive-app-secret-key-2024', // In production, use a more secure key
  schema: {
    'supabase.auth.token': {
      type: 'string',
    },
  },
});

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
      webSecurity: !isDev ? false : true,  // Disable in production for file protocol
      allowRunningInsecureContent: false,
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
    titleBarStyle: 'hiddenInset',
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
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle open-external IPC
  ipcMain.on('open-external', (event, url) => {
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
  
  // Initialize notification service with Supabase credentials
  // Note: In Electron main process, Vite env vars aren't available directly
  // For now, we'll hardcode them or pass from renderer
  const supabaseUrl = 'https://tnkvynxyoalhowrkxjio.supabase.co'
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRua3Z5bnh5b2FsaG93cmt4amlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDAyNDQsImV4cCI6MjA2OTUxNjI0NH0.gO5--MQRp5SAINjmIAXKO3caQ_E2bwk_-ruSe030ups'
    
  notificationService = new NotificationService(supabaseUrl, supabaseKey)

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
  
  if (mainWindow && notificationService) {
    notificationService.setMainWindow(mainWindow)
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