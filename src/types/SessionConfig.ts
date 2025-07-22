export type TriggerType = 'wifi' | 'schedule' | 'fileChange' | 'startup' | 'interval';

export interface WiFiTrigger {
  type: 'wifi';
  ssid: string;
  onConnect: boolean; // true = trigger on connect, false = trigger on disconnect
}

export interface ScheduleTrigger {
  type: 'schedule';
  time: string; // Time in HH:mm format (e.g., "14:30")
  days: string[]; // Days of the week: ['monday', 'tuesday', etc.] or ['daily']
  timezone?: string; // Optional timezone (defaults to system timezone)
}

export interface FileChangeTrigger {
  type: 'fileChange';
  watchPaths: string[]; // Paths to watch for changes
  debounceMs: number; // Delay before triggering sync (default: 5000ms)
  recursive: boolean; // Watch subdirectories
  ignorePatterns?: string[]; // File patterns to ignore (*.tmp, .DS_Store, etc.)
}

export interface StartupTrigger {
  type: 'startup';
  delayMs: number; // Delay after app startup (default: 30000ms)
}

export interface IntervalTrigger {
  type: 'interval';
  intervalMinutes: number; // Sync every X minutes
  startTime?: string; // Optional start time in HH:mm format
  endTime?: string; // Optional end time in HH:mm format (only sync within this window)
}

export type Trigger = WiFiTrigger | ScheduleTrigger | FileChangeTrigger | StartupTrigger | IntervalTrigger;

export interface SessionConfig {
  id: string;
  name: string;
  sourcePath: string;
  destinationPath: string; // Generated automatically from remoteConnection or local path
  triggers: Trigger[];
  excludePatterns?: string[];
  lastSync?: string;
  lastSyncStatus?: 'success' | 'error' | 'warning';
  lastSyncError?: string;
  enabled: boolean;
  paused?: boolean; // Pause state for individual sessions
  
  // rsync specific options
  rsyncOptions?: {
    deleteOnDestination: boolean;
    compress: boolean;
    preservePermissions: boolean;
    updateOnly: boolean; // Only transfer files that are newer or don't exist
  };
  
  // Remote connection settings (rsync daemon mode only)
  remoteConnection?: {
    host: string;
    username: string;
    password?: string;
    port?: number;
    remotePath: string;
    connectionMode: 'daemon'; // Native rsync daemon only
    moduleName?: string; // For daemon mode
  };
}