import { SessionConfig } from './types/SessionConfig';
import { LogEntry } from './types/LogEntry';

export interface IElectronAPI {
  loadSessions: () => Promise<SessionConfig[]>;
  saveSession: (session: SessionConfig) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  syncNow: (id: string) => Promise<void>;
  selectDirectory: () => Promise<string | null>;
  onLogEntry?: (callback: (entry: LogEntry) => void) => void;
  browseRemoteDirectory: (connectionSettings: any, remotePath?: string) => Promise<{name: string, isDirectory: boolean, path: string}[]>;
  getAvailableModules: (connectionSettings: any) => Promise<{name: string, comment: string}[]>;
  getTheme: () => Promise<'light' | 'dark'>;
  onThemeChanged?: (callback: (theme: 'light' | 'dark') => void) => void;
  onSessionsUpdated?: (callback: (sessions: SessionConfig[]) => void) => void;
  onSyncStarted?: (callback: (sessionId: string) => void) => void;
  onSyncEnded?: (callback: (sessionId: string) => void) => void;
  onOpenNewSessionDialog?: (callback: () => void) => void;
  onOpenLogViewer?: (callback: () => void) => void;
  onShowHelp?: (callback: () => void) => void;
  onOpenSettings?: (callback: () => void) => void;
  checkRsync: () => Promise<{installed: boolean, version: string | null}>;
  // Log management
  getLogs: (limit?: number) => Promise<LogEntry[]>;
  clearLogs: () => Promise<void>;
  exportLogs: (exportPath: string) => Promise<void>;
  getLogFilePath: () => Promise<string | null>;
  openLogFolder: () => Promise<void>;
  getSessionLogFiles: (sessionName?: string) => Promise<{fileName: string, path: string, date: Date, size: number}[]>;
  readSessionLogFile: (filePath: string) => Promise<string>;
  // Notifications
  showNotification: (title: string, body: string, type?: 'info' | 'error' | 'warning') => Promise<void>;
  // System stats
  getSystemStats: () => Promise<{memoryUsed: number, memoryTotal: number, cpuUsage: number}>;
  // Pause/Resume controls
  pauseAllSessions: () => Promise<void>;
  resumeAllSessions: () => Promise<void>;
  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  isGloballyPaused: () => Promise<boolean>;
  // Settings
  getAutoLaunchStatus: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  getSystemPaths: () => Promise<{configPath: string, logsPath: string, userDataPath: string, tempPath: string}>;
  getPermissionStatus: () => Promise<{fullDiskAccess: boolean | null, accessibility: boolean | null, notifications: boolean | null}>;
  requestPermission: (permission: string) => Promise<boolean>;
  openPath: (path: string) => Promise<boolean>;
  getPlatform: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}