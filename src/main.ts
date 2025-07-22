import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, nativeTheme, shell, Notification, systemPreferences } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import started from 'electron-squirrel-startup';
import { SessionConfig } from './types/SessionConfig';
import { SyncManager } from './services/SyncManager';
import { LogEntry } from './types/LogEntry';
import { LogManager } from './services/LogManager';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const SESSIONS_FILE = path.join(app.getPath('userData'), 'sessions.json');
let syncManager: SyncManager;
let logManager: LogManager;
let mainWindow: BrowserWindow;
let tray: Tray;

// Add custom property to app
declare global {
  namespace Electron {
    interface App {
      isQuiting?: boolean;
    }
  }
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show window on creation
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 20, y: 18 } : undefined,
    vibrancy: process.platform === 'darwin' ? 'titlebar' : undefined,
    backgroundColor: process.platform === 'darwin' ? '#00000000' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools in development
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window minimize to tray
  mainWindow.on('minimize', (event: any) => {
    if (process.platform === 'darwin') {
      // On macOS, minimize to dock
      return;
    }
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event: any) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Hide from dock on macOS when window is closed
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
    }
  });
};

const createTray = () => {
  // Get tray icon path using the app logo
  const getIconPath = () => {
    // In development: src/assets, in production: resources/assets  
    const isDev = process.env.NODE_ENV !== 'production';
    return isDev 
      ? path.join(__dirname, '../assets/logoArrotondato.png')
      : path.join(process.resourcesPath, 'assets/logoArrotondato.png');
  };

  // Create tray with app icon
  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  
  // Resize icon for tray (16x16 on most platforms)
  const trayIcon = icon.resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);

  // Set tooltip
  tray.setToolTip('imeSync');

  // Create context menu function to get dynamic state
  const createContextMenu = () => {
    const isVisible = mainWindow && mainWindow.isVisible();
    const isPaused = syncManager ? syncManager.isGloballyPaused() : false;
    
    return Menu.buildFromTemplate([
      {
        label: isVisible ? 'Hide imeSync' : 'Show imeSync',
        click: () => {
          if (isVisible) {
            mainWindow.hide();
            if (process.platform === 'darwin') {
              app.dock.hide();
            }
          } else {
            showWindow();
          }
        }
      },
      { type: 'separator' },
      {
        label: isPaused ? 'Resume All Sessions' : 'Pause All Sessions',
        click: () => {
          if (syncManager) {
            if (isPaused) {
              syncManager.resumeAllSessions();
            } else {
              syncManager.pauseAllSessions();
            }
          }
        }
      },
      { type: 'separator' },
      {
        label: 'New Sync Session',
        click: () => {
          showWindow();
          // Send message to renderer to open new session dialog
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('open-new-session-dialog');
          }
        }
      },
      {
        label: 'View Logs',
        click: () => {
          showWindow();
          // Send message to renderer to open log viewer
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('open-log-viewer');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit imeSync',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);
  };

  // Set initial context menu
  tray.setContextMenu(createContextMenu());

  // Handle tray click - only show context menu on right-click
  tray.on('click', (event, bounds) => {
    // On macOS, left click should toggle window visibility
    if (process.platform === 'darwin') {
      const isVisible = mainWindow && mainWindow.isVisible();
      if (isVisible) {
        mainWindow.hide();
        app.dock.hide();
      } else {
        showWindow();
      }
    }
    // On Windows/Linux, left click shows context menu
    else {
      tray.popUpContextMenu(createContextMenu());
    }
  });

  // Handle right-click to show context menu
  tray.on('right-click', () => {
    tray.popUpContextMenu(createContextMenu());
  });

  // Update context menu when needed
  const updateTrayMenu = () => {
    tray.setContextMenu(createContextMenu());
  };
  
  // Store reference for updates
  tray.updateTrayMenu = updateTrayMenu;
};

const showWindow = () => {
  // Show in dock on macOS when window is opened
  if (process.platform === 'darwin') {
    app.dock.show();
  }
  
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
};

const updateTrayIcon = (isSyncing: boolean) => {
  if (!tray) return;
  
  // Use the same app icon, but potentially with opacity change for syncing state
  const getIconPath = () => {
    const isDev = process.env.NODE_ENV !== 'production';
    return isDev 
      ? path.join(__dirname, '../assets/logoArrotondato.png')
      : path.join(process.resourcesPath, 'assets/logoArrotondato.png');
  };

  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  
  // If syncing, we could modify the icon (but for now just use the same)
  const trayIcon = icon.resize({ width: 16, height: 16 });
  
  tray.setImage(trayIcon);
  tray.setToolTip(isSyncing ? 'imeSync - Syncing...' : 'imeSync - Ready');
  
  // Update the context menu to reflect current state
  if (tray.updateTrayMenu) {
    tray.updateTrayMenu();
  }
};

// IPC Handlers
ipcMain.handle('get-theme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

ipcMain.handle('check-rsync', async () => {
  try {
    const { execSync } = require('child_process');
    const version = execSync('rsync --version', { encoding: 'utf8' });
    return { 
      installed: true, 
      version: version.split('\n')[0] 
    };
  } catch (error) {
    return { 
      installed: false, 
      version: null 
    };
  }
});

ipcMain.handle('load-sessions', async () => {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('save-session', async (event, session: SessionConfig) => {
  try {
    const sessions = await loadSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    
    await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    
    // Refresh sync manager with new sessions
    if (syncManager) {
      syncManager.updateSessions(sessions);
    }
  } catch (error) {
    console.error('Failed to save session:', error);
    throw error;
  }
});

ipcMain.handle('delete-session', async (event, id: string) => {
  try {
    const sessions = await loadSessions();
    const filtered = sessions.filter(s => s.id !== id);
    await fs.writeFile(SESSIONS_FILE, JSON.stringify(filtered, null, 2));
    
    // Refresh sync manager
    if (syncManager) {
      syncManager.updateSessions(filtered);
    }
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
});

ipcMain.handle('sync-now', async (event, id: string, mainWindow?: BrowserWindow) => {
  try {
    // Update tray to show syncing state
    updateTrayIcon(true);
    
    // Set up log forwarding
    if (!mainWindow && BrowserWindow.getAllWindows().length > 0) {
      mainWindow = BrowserWindow.getAllWindows()[0];
    }
    
    // Get session info for logging
    const sessions = await loadSessions();
    const currentSession = sessions.find(s => s.id === id);
    
    // Start new log file for this sync operation
    if (logManager && currentSession) {
      await logManager.startNewSyncLog(id, currentSession.name);
    }
    
    // Create a log forwarder
    const logForwarder = async (type: 'info' | 'success' | 'error' | 'warning', message: string) => {
      const logEntry: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type,
        message,
        sessionId: id
      };
      
      // Write to file
      if (logManager) {
        await logManager.writeLog(logEntry);
      }
      
      // Send to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-entry', logEntry);
      }
    };
    
    // Pass log forwarder to sync manager
    await syncManager.syncSession(id, logForwarder);
    logForwarder('success', 'Synchronization completed successfully');
    
    // End the current log file
    if (logManager) {
      await logManager.endCurrentSyncLog();
    }
    
    // Save the updated session with lastSync timestamp
    const updatedSession = sessions.find(s => s.id === id);
    if (updatedSession) {
      updatedSession.lastSync = new Date().toISOString();
      await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
      
      // Refresh sync manager with updated sessions
      syncManager.updateSessions(sessions);
    }
    
    // Update tray to show completed state
    updateTrayIcon(false);
  } catch (error) {
    console.error('Failed to sync session:', error);
    
    // End the current log file even on error
    if (logManager) {
      await logManager.endCurrentSyncLog();
    }
    
    // Update tray to show completed state even on error
    updateTrayIcon(false);
    throw error;
  }
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (result.canceled) {
    return null;
  }
  
  return result.filePaths[0];
});

ipcMain.handle('browse-remote-directory', async (event, connectionSettings, remotePath = '') => {
  try {
    if (!syncManager) {
      throw new Error('Sync manager not initialized');
    }
    
    return await syncManager.browseRemoteDirectory(connectionSettings, remotePath);
  } catch (error) {
    console.error('Failed to browse remote directory:', error);
    throw error;
  }
});

ipcMain.handle('get-available-modules', async (event, connectionSettings) => {
  try {
    if (!syncManager) {
      throw new Error('Sync manager not initialized');
    }
    
    return await syncManager.getAvailableModules(connectionSettings);
  } catch (error) {
    console.error('Failed to get available modules:', error);
    throw error;
  }
});

// Helper function to load sessions
async function loadSessions(): Promise<SessionConfig[]> {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Helper function to save sessions to disk
async function saveSessionsToDisk(sessions: SessionConfig[]): Promise<void> {
  try {
    await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    
    // Notify renderer about updated sessions
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('sessions-updated', sessions);
    }
  } catch (error) {
    console.error('Failed to save sessions after trigger sync:', error);
  }
}

// Helper function to notify UI about sync start
function notifySyncStart(sessionId: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync-started', sessionId);
  }
}

// Helper function to notify UI about sync end
function notifySyncEnd(sessionId: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync-ended', sessionId);
  }
}

// Helper function to handle sync logging for trigger-initiated syncs
async function createSyncLogCallback(sessionId: string) {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.id === sessionId);
  
  if (logManager && session) {
    await logManager.startNewSyncLog(sessionId, session.name);
  }
  
  return async (type: 'info' | 'success' | 'error' | 'warning', message: string) => {
    const logEntry: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      message,
      sessionId
    };
    
    // Write to file
    if (logManager) {
      await logManager.writeLog(logEntry);
    }
    
    // Send to renderer if window is available
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-entry', logEntry);
    }
    
    // End log file if sync completed or failed
    if ((type === 'success' && message.includes('Sync completed')) || 
        (type === 'error' && message.includes('Sync failed'))) {
      if (logManager) {
        await logManager.endCurrentSyncLog();
      }
    }
  };
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// Create application menu for macOS
const createApplicationMenu = () => {
  if (process.platform !== 'darwin') return;

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'imeSync',
      submenu: [
        {
          label: 'About imeSync',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => {
            showWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('open-settings');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Hide imeSync',
          accelerator: 'Cmd+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Cmd+Alt+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Quit imeSync',
          accelerator: 'Cmd+Q',
          click: () => {
            app.isQuiting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Sync Session',
          accelerator: 'Cmd+N',
          click: () => {
            showWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('open-new-session-dialog');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Pause All Sessions',
          accelerator: 'Cmd+P',
          click: () => {
            if (syncManager) {
              const isPaused = syncManager.isGloballyPaused();
              if (isPaused) {
                syncManager.resumeAllSessions();
              } else {
                syncManager.pauseAllSessions();
              }
            }
          }
        },
        {
          label: 'Resume All Sessions',
          accelerator: 'Cmd+Shift+R',
          click: () => {
            if (syncManager) {
              syncManager.resumeAllSessions();
            }
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Show imeSync Window',
          accelerator: 'Cmd+1',
          click: () => {
            showWindow();
          }
        },
        {
          label: 'View Sync Logs',
          accelerator: 'Cmd+L',
          click: () => {
            showWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('open-log-viewer');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'Cmd+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Cmd+I',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Cmd+M',
          role: 'minimize'
        },
        {
          label: 'Close',
          accelerator: 'Cmd+W',
          click: () => {
            if (mainWindow) {
              mainWindow.hide();
              if (process.platform === 'darwin') {
                app.dock.hide();
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Bring All to Front',
          role: 'front'
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Rsync Installation Guide',
          click: () => {
            showWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('show-help');
            }
          }
        },
        {
          label: 'Open Log Folder',
          click: async () => {
            if (logManager) {
              const logPath = logManager.getLogFilePath();
              shell.openPath(logPath);
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.on('ready', async () => {
  // Create window but don't show it initially
  createWindow();
  createTray();
  
  // Create application menu for macOS
  createApplicationMenu();
  
  // Check if app should start in background based on auto-launch setting
  const shouldStartHidden = app.getLoginItemSettings().openAtLogin;
  
  if (shouldStartHidden) {
    // Hide from dock initially on macOS (starts in background)
    if (process.platform === 'darwin') {
      app.dock.hide();
    }
  } else {
    // Show window on first launch or when auto-launch is disabled
    showWindow();
  }
  
  // Initialize log manager
  logManager = new LogManager();
  await logManager.initializeLogFile();
  
  // Initialize sync manager with save callback and notification callback
  const sessions = await loadSessions();
  const notificationCallback = async (title: string, body: string, type: 'info' | 'error' | 'warning' = 'info') => {
    if (Notification.isSupported()) {
      const iconPath = process.env.NODE_ENV !== 'production'
        ? path.join(__dirname, '../assets/logoArrotondato.png')
        : path.join(process.resourcesPath, 'assets/logoArrotondato.png');
      
      const notification = new Notification({
        title,
        body,
        icon: iconPath
      });
      notification.show();
    }
  };
  
  syncManager = new SyncManager(sessions, saveSessionsToDisk, notificationCallback, notifySyncStart, notifySyncEnd, createSyncLogCallback);
  syncManager.start();
  
  // Listen for theme changes
  nativeTheme.on('updated', () => {
    // Notify renderer about theme change
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // On macOS, keep app running in background with tray
  if (process.platform !== 'darwin') {
    // On Windows/Linux, keep running in tray unless explicitly quit
    return;
  }
});

app.on('activate', () => {
  // On macOS, show window when dock icon is clicked (if visible) or when app is activated
  if (process.platform === 'darwin') {
    // Only show window if it's not already visible
    if (!mainWindow.isVisible()) {
      showWindow();
    }
  }
});

// Log management IPC handlers
ipcMain.handle('get-logs', async (_, limit: number = 1000) => {
  if (logManager) {
    return await logManager.readLogs(limit);
  }
  return [];
});

ipcMain.handle('clear-logs', async () => {
  if (logManager) {
    await logManager.clearLogs();
  }
});

ipcMain.handle('export-logs', async (_, exportPath: string) => {
  if (logManager) {
    await logManager.exportLogs(exportPath);
  }
});

ipcMain.handle('get-log-file-path', () => {
  return logManager ? logManager.getLogFilePath() : null;
});

ipcMain.handle('open-log-folder', () => {
  if (logManager) {
    const logPath = logManager.getLogFilePath();
    shell.openPath(logPath);
  }
});

ipcMain.handle('get-session-log-files', async (_, sessionName?: string) => {
  if (logManager) {
    return await logManager.getSessionLogFiles(sessionName);
  }
  return [];
});

ipcMain.handle('read-session-log-file', async (_, filePath: string) => {
  if (logManager) {
    return await logManager.readSessionLogFile(filePath);
  }
  return '';
});

ipcMain.handle('show-notification', (event, title: string, body: string, type: 'info' | 'error' | 'warning' = 'info') => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: process.platform === 'darwin' 
        ? path.join(__dirname, '../assets/logoArrotondato.png')
        : path.join(process.resourcesPath, 'assets/logoArrotondato.png')
    });
    notification.show();
  }
});

ipcMain.handle('get-system-stats', () => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.getCPUUsage();
  
  return {
    memoryUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    cpuUsage: Math.round(cpuUsage.percentCPUUsage)
  };
});

// Pause/Resume controls
ipcMain.handle('pause-all-sessions', () => {
  if (syncManager) {
    syncManager.pauseAllSessions();
  }
});

ipcMain.handle('resume-all-sessions', () => {
  if (syncManager) {
    syncManager.resumeAllSessions();
  }
});

ipcMain.handle('pause-session', (event, sessionId: string) => {
  if (syncManager) {
    syncManager.pauseSession(sessionId);
  }
});

ipcMain.handle('resume-session', (event, sessionId: string) => {
  if (syncManager) {
    syncManager.resumeSession(sessionId);
  }
});

ipcMain.handle('is-globally-paused', () => {
  return syncManager ? syncManager.isGloballyPaused() : false;
});


// Settings IPC handlers

ipcMain.handle('get-auto-launch-status', async () => {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch (error) {
    console.error('Failed to get auto launch status:', error);
    return false;
  }
});

ipcMain.handle('set-auto-launch', async (_, enabled: boolean) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true, // Start minimized to tray
      name: 'imeSync'
    });
    return true;
  } catch (error) {
    console.error('Failed to set auto launch:', error);
    return false;
  }
});

ipcMain.handle('get-system-paths', () => {
  return {
    configPath: app.getPath('userData'),
    logsPath: logManager ? logManager.getLogFilePath() : path.join(app.getPath('userData'), 'logs'),
    userDataPath: app.getPath('userData'),
    tempPath: app.getPath('temp')
  };
});

ipcMain.handle('get-permission-status', async () => {
  const permissions = {
    fullDiskAccess: null as boolean | null,
    accessibility: null as boolean | null,
    notifications: null as boolean | null
  };

  try {
    if (process.platform === 'darwin') {
      // Check Full Disk Access
      const mediaAccess = systemPreferences.getMediaAccessStatus('camera');
      permissions.fullDiskAccess = mediaAccess === 'granted';
      
      // Check Accessibility
      permissions.accessibility = systemPreferences.isTrustedAccessibilityClient(false);
    }
    
    // Check Notifications
    if (Notification.isSupported()) {
      permissions.notifications = true; // Assume granted if supported
    }
  } catch (error) {
    console.error('Failed to check permissions:', error);
  }

  return permissions;
});

ipcMain.handle('request-permission', async (_, permission: string) => {
  try {
    switch (permission) {
      case 'fullDiskAccess':
        if (process.platform === 'darwin') {
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles');
        }
        return true;
      
      case 'accessibility':
        if (process.platform === 'darwin') {
          const trusted = systemPreferences.isTrustedAccessibilityClient(true);
          if (!trusted) {
            shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
          }
          return trusted;
        }
        return true;
      
      case 'notifications':
        if (Notification.isSupported()) {
          return true;
        }
        return false;
        
      default:
        return false;
    }
  } catch (error) {
    console.error(`Failed to request ${permission}:`, error);
    return false;
  }
});

ipcMain.handle('open-path', async (_, filePath: string) => {
  try {
    await shell.openPath(filePath);
    return true;
  } catch (error) {
    console.error('Failed to open path:', error);
    return false;
  }
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// Clean up before quit
app.on('before-quit', () => {
  app.isQuiting = true;
  if (syncManager) {
    syncManager.stop();
  }
  if (tray) {
    tray.destroy();
  }
});