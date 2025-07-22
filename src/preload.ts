import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadSessions: () => ipcRenderer.invoke('load-sessions'),
  saveSession: (session: any) => ipcRenderer.invoke('save-session', session),
  deleteSession: (id: string) => ipcRenderer.invoke('delete-session', id),
  syncNow: (id: string) => ipcRenderer.invoke('sync-now', id),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  browseRemoteDirectory: (connectionSettings: any, remotePath?: string) => ipcRenderer.invoke('browse-remote-directory', connectionSettings, remotePath),
  getAvailableModules: (connectionSettings: any) => ipcRenderer.invoke('get-available-modules', connectionSettings),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  checkRsync: () => ipcRenderer.invoke('check-rsync'),
  onLogEntry: (callback: (entry: any) => void) => {
    ipcRenderer.on('log-entry', (event, entry) => callback(entry));
  },
  onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => {
    ipcRenderer.on('theme-changed', (event, theme) => callback(theme));
  },
  onSessionsUpdated: (callback: (sessions: any[]) => void) => {
    ipcRenderer.on('sessions-updated', (event, sessions) => callback(sessions));
  },
  onSyncStarted: (callback: (sessionId: string) => void) => {
    ipcRenderer.on('sync-started', (event, sessionId) => callback(sessionId));
  },
  onSyncEnded: (callback: (sessionId: string) => void) => {
    ipcRenderer.on('sync-ended', (event, sessionId) => callback(sessionId));
  },
  onOpenNewSessionDialog: (callback: () => void) => {
    ipcRenderer.on('open-new-session-dialog', () => callback());
  },
  onOpenLogViewer: (callback: () => void) => {
    ipcRenderer.on('open-log-viewer', () => callback());
  },
  onShowHelp: (callback: () => void) => {
    ipcRenderer.on('show-help', () => callback());
  },
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', () => callback());
  },
  // Log management
  getLogs: (limit?: number) => ipcRenderer.invoke('get-logs', limit),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  exportLogs: (exportPath: string) => ipcRenderer.invoke('export-logs', exportPath),
  getLogFilePath: () => ipcRenderer.invoke('get-log-file-path'),
  openLogFolder: () => ipcRenderer.invoke('open-log-folder'),
  getSessionLogFiles: (sessionName?: string) => ipcRenderer.invoke('get-session-log-files', sessionName),
  readSessionLogFile: (filePath: string) => ipcRenderer.invoke('read-session-log-file', filePath),
  // Notifications
  showNotification: (title: string, body: string, type?: 'info' | 'error' | 'warning') => ipcRenderer.invoke('show-notification', title, body, type),
  // System stats
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  // Pause/Resume controls
  pauseAllSessions: () => ipcRenderer.invoke('pause-all-sessions'),
  resumeAllSessions: () => ipcRenderer.invoke('resume-all-sessions'),
  pauseSession: (sessionId: string) => ipcRenderer.invoke('pause-session', sessionId),
  resumeSession: (sessionId: string) => ipcRenderer.invoke('resume-session', sessionId),
  isGloballyPaused: () => ipcRenderer.invoke('is-globally-paused'),
  // Settings
  getAutoLaunchStatus: () => ipcRenderer.invoke('get-auto-launch-status'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
  getSystemPaths: () => ipcRenderer.invoke('get-system-paths'),
  getPermissionStatus: () => ipcRenderer.invoke('get-permission-status'),
  requestPermission: (permission: string) => ipcRenderer.invoke('request-permission', permission),
  openPath: (path: string) => ipcRenderer.invoke('open-path', path),
  getPlatform: () => ipcRenderer.invoke('get-platform')
});
