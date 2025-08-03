import { app, BrowserWindow, shell, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { NotificationService } from './notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let notificationService: NotificationService | null = null;

// Initialize secure storage with encryption
const store = new Store({
  name: 'retentive-secure-storage',
  encryptionKey: 'retentive-app-secret-key-2024', // In production, use a more secure key
  schema: {
    'supabase.auth.token': {
      type: 'string',
    },
  },
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,  // Always keep web security enabled
      allowRunningInsecureContent: false  // Block insecure content
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

  // Set Content Security Policy headers
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
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
    return store.get(key);
  } catch (error) {
    console.error('Error getting secure storage:', error);
    return null;
  }
});

ipcMain.handle('secureStorage:set', async (_, key: string, value: string) => {
  try {
    store.set(key, value);
    return true;
  } catch (error) {
    console.error('Error setting secure storage:', error);
    return false;
  }
});

ipcMain.handle('secureStorage:remove', async (_, key: string) => {
  try {
    store.delete(key);
    return true;
  } catch (error) {
    console.error('Error removing from secure storage:', error);
    return false;
  }
});

ipcMain.handle('secureStorage:clear', async () => {
  try {
    store.clear();
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
    }
    return true
  } catch (error) {
    console.error('Error scheduling notification:', error)
    return false
  }
})

ipcMain.handle('notifications:cancel', async (_, type: string, userId: string) => {
  if (!notificationService) return false
  
  try {
    if (type === 'all') {
      notificationService.cancelUserJobs(userId)
    } else {
      notificationService.cancelJob(`${type}-${userId}`)
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
      'Notifications are working correctly!'
    )
    return true
  } catch (error) {
    console.error('Error sending test notification:', error)
    return false
  }
})

// Handle navigation from notifications
ipcMain.on('navigate-reply', (_, path: string) => {
  mainWindow?.webContents.send('navigate', path)
})

app.whenReady().then(() => {
  // Initialize notification service with Supabase credentials
  // Note: In Electron main process, Vite env vars aren't available directly
  // For now, we'll hardcode them or pass from renderer
  const supabaseUrl = 'https://tnkvynxyoalhowrkxjio.supabase.co'
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRua3Z5bnh5b2FsaG93cmt4amlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDAyNDQsImV4cCI6MjA2OTUxNjI0NH0.gO5--MQRp5SAINjmIAXKO3caQ_E2bwk_-ruSe030ups'
    
  notificationService = new NotificationService(supabaseUrl, supabaseKey)
  
  createWindow();
  createMenu();
  
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});