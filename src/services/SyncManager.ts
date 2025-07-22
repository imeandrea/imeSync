import { SessionConfig, WiFiTrigger, FileChangeTrigger, ScheduleTrigger, StartupTrigger, IntervalTrigger } from '../types/SessionConfig';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { FSWatcher, watch } from 'fs';

const execAsync = promisify(exec);

export class SyncManager {
  private sessions: SessionConfig[];
  private timers: Map<string, NodeJS.Timer> = new Map();
  private fileWatchers: Map<string, FSWatcher[]> = new Map();
  private networkWatcher: NodeJS.Timer | null = null;
  private currentSSID: string | null = null;
  private startupTriggersExecuted = false;
  private globallyPaused = false;
  private saveSessionsCallback?: (sessions: SessionConfig[]) => Promise<void>;
  private notificationCallback?: (title: string, body: string, type: 'info' | 'error' | 'warning') => Promise<void>;
  private syncStartCallback?: (sessionId: string) => void;
  private syncEndCallback?: (sessionId: string) => void;
  private logCallbackFactory?: (sessionId: string) => Promise<(type: 'info' | 'success' | 'error' | 'warning', message: string) => void>;

  constructor(
    sessions: SessionConfig[], 
    saveSessionsCallback?: (sessions: SessionConfig[]) => Promise<void>, 
    notificationCallback?: (title: string, body: string, type: 'info' | 'error' | 'warning') => Promise<void>,
    syncStartCallback?: (sessionId: string) => void,
    syncEndCallback?: (sessionId: string) => void,
    logCallbackFactory?: (sessionId: string) => Promise<(type: 'info' | 'success' | 'error' | 'warning', message: string) => void>
  ) {
    this.sessions = sessions;
    this.saveSessionsCallback = saveSessionsCallback;
    this.notificationCallback = notificationCallback;
    this.syncStartCallback = syncStartCallback;
    this.syncEndCallback = syncEndCallback;
    this.logCallbackFactory = logCallbackFactory;
  }

  start() {
    this.sessions.forEach(session => {
      if (session.enabled) {
        this.setupTriggers(session);
      }
    });
    
    // Mark startup triggers as executed after setup
    setTimeout(() => {
      this.startupTriggersExecuted = true;
    }, 1000);
  }

  stop() {
    // Clear all timers
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
    
    // Close all file watchers
    this.fileWatchers.forEach(watchers => {
      watchers.forEach(watcher => watcher.close());
    });
    this.fileWatchers.clear();
    
    // Clear network monitoring
    if (this.networkWatcher) {
      clearInterval(this.networkWatcher);
      this.networkWatcher = null;
    }
  }

  updateSessions(sessions: SessionConfig[]) {
    this.stop();
    this.sessions = sessions;
    this.start();
  }

  private async triggerSync(sessionId: string) {
    // Check if globally paused or session is paused
    if (this.globallyPaused) {
      console.log(`Sync skipped for session "${sessionId}": globally paused`);
      return;
    }
    
    const session = this.sessions.find(s => s.id === sessionId);
    if (session?.paused) {
      console.log(`Sync skipped for session "${session.name}": session paused`);
      return;
    }
    
    // Use the log callback factory if available
    let logCallback = undefined;
    if (this.logCallbackFactory) {
      logCallback = await this.logCallbackFactory(sessionId);
    }
    
    await this.syncSession(sessionId, logCallback);
  }

  pauseAllSessions() {
    this.globallyPaused = true;
    console.log('All sync sessions paused');
  }

  resumeAllSessions() {
    this.globallyPaused = false;
    console.log('All sync sessions resumed');
  }

  pauseSession(sessionId: string) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      session.paused = true;
      console.log(`Session "${session.name}" paused`);
      // Save sessions state
      if (this.saveSessionsCallback) {
        this.saveSessionsCallback(this.sessions).catch(console.error);
      }
    }
  }

  resumeSession(sessionId: string) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      session.paused = false;
      console.log(`Session "${session.name}" resumed`);
      // Save sessions state
      if (this.saveSessionsCallback) {
        this.saveSessionsCallback(this.sessions).catch(console.error);
      }
    }
  }

  isGloballyPaused(): boolean {
    return this.globallyPaused;
  }

  async syncSession(sessionId: string, logCallback?: (type: 'info' | 'success' | 'error' | 'warning', message: string) => void) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const log = (type: 'info' | 'success' | 'error' | 'warning', message: string) => {
      console.log(`[${type.toUpperCase()}] ${message}`);
      if (logCallback) {
        logCallback(type, message);
      }
    };

    log('info', `Starting sync for session: ${session.name}`);
    log('info', `Source: ${session.sourcePath}`);
    log('info', `Destination: ${session.destinationPath}`);

    // Notify UI that sync is starting
    if (this.syncStartCallback) {
      this.syncStartCallback(sessionId);
    }

    try {
      // Always use rsync daemon mode
      await this.syncWithRsync(session, log);

      // Update last sync time and status
      session.lastSync = new Date().toISOString();
      session.lastSyncStatus = 'success';
      session.lastSyncError = undefined;
      
      // Save sessions to disk if callback is provided
      if (this.saveSessionsCallback) {
        try {
          await this.saveSessionsCallback(this.sessions);
        } catch (error) {
          log('warning', `Failed to save session data after sync: ${error}`);
        }
      }
      
      log('success', `Sync completed for session: ${session.name}`);
      
      // Notify UI that sync is ending
      if (this.syncEndCallback) {
        this.syncEndCallback(sessionId);
      }
    } catch (error) {
      // Update sync status with error info
      session.lastSync = new Date().toISOString();
      session.lastSyncStatus = 'error';
      session.lastSyncError = error instanceof Error ? error.message : String(error);
      
      // Save sessions to disk with error status
      if (this.saveSessionsCallback) {
        try {
          await this.saveSessionsCallback(this.sessions);
        } catch (saveError) {
          log('warning', `Failed to save session data after sync error: ${saveError}`);
        }
      }
      
      // Show notification for sync error
      if (this.notificationCallback) {
        try {
          await this.notificationCallback(
            'imeSync - Sync Error',
            `Sync failed for "${session.name}": ${session.lastSyncError || 'Unknown error'}`,
            'error'
          );
        } catch (notifError) {
          console.error('Failed to show error notification:', notifError);
        }
      }
      
      log('error', `Sync failed for session ${session.name}: ${error}`);
      
      // Notify UI that sync is ending (even on error)
      if (this.syncEndCallback) {
        this.syncEndCallback(sessionId);
      }
      
      throw error;
    }
  }

  private setupTriggers(session: SessionConfig) {
    session.triggers.forEach(trigger => {
      switch (trigger.type) {
        case 'schedule':
          this.setupScheduleTrigger(session, trigger as ScheduleTrigger);
          break;
        case 'wifi':
          this.setupWiFiTrigger(session, trigger as WiFiTrigger);
          break;
        case 'fileChange':
          this.setupFileChangeTrigger(session, trigger as FileChangeTrigger);
          break;
        case 'startup':
          this.setupStartupTrigger(session, trigger as StartupTrigger);
          break;
        case 'interval':
          this.setupIntervalTrigger(session, trigger as IntervalTrigger);
          break;
      }
    });
  }

  private setupScheduleTrigger(session: SessionConfig, trigger: ScheduleTrigger) {
    if (trigger.time && trigger.days) {
      const checkSchedule = () => {
        const now = new Date();
        const [hours, minutes] = trigger.time.split(':').map(Number);
        
        // Check if it's the right time
        if (now.getHours() === hours && now.getMinutes() === minutes) {
          // Check if it's the right day
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const currentDay = dayNames[now.getDay()];
          
          const shouldTrigger = trigger.days.includes('daily') || 
                               trigger.days.includes(currentDay) ||
                               (trigger.days.length === 7); // All days selected
          
          if (shouldTrigger) {
            console.log(`Schedule trigger: ${trigger.time} sync for session "${session.name}"`);
            this.triggerSync(session.id).catch(console.error);
          }
        }
      };
      
      // Check every minute
      const timer = setInterval(checkSchedule, 60000);
      this.timers.set(`${session.id}-schedule`, timer);
    }
  }

  private setupWiFiTrigger(_session: SessionConfig, _trigger: WiFiTrigger) {
    // Start network monitoring if not already running
    if (!this.networkWatcher) {
      this.startNetworkMonitoring();
    }
  }

  private setupFileChangeTrigger(session: SessionConfig, trigger: FileChangeTrigger) {
    const watchers: FSWatcher[] = [];
    
    trigger.watchPaths.forEach(watchPath => {
      try {
        const watcher = watch(watchPath, { recursive: trigger.recursive }, (eventType, filename) => {
          if (filename) {
            // Check ignore patterns
            const shouldIgnore = trigger.ignorePatterns?.some(pattern => {
              const regex = new RegExp(pattern.replace(/\*/g, '.*'));
              return regex.test(filename);
            });
            
            if (!shouldIgnore) {
              // Debounce the sync operation
              const debounceKey = `${session.id}-filechange-${watchPath}`;
              const existingTimer = this.timers.get(debounceKey);
              
              if (existingTimer) {
                clearTimeout(existingTimer);
              }
              
              const timer = setTimeout(() => {
                console.log(`File change trigger: "${filename}" changed, syncing session "${session.name}"`);
                this.triggerSync(session.id).catch(console.error);
                this.timers.delete(debounceKey);
              }, trigger.debounceMs);
              
              this.timers.set(debounceKey, timer);
            }
          }
        });
        
        watchers.push(watcher);
      } catch (error) {
        console.error(`Failed to watch path ${watchPath}:`, error);
      }
    });
    
    // Store watchers for cleanup
    const sessionWatchers = this.fileWatchers.get(session.id) || [];
    sessionWatchers.push(...watchers);
    this.fileWatchers.set(session.id, sessionWatchers);
  }

  private setupStartupTrigger(session: SessionConfig, trigger: StartupTrigger) {
    if (!this.startupTriggersExecuted) {
      setTimeout(() => {
        console.log(`Startup trigger: Syncing session "${session.name}" after ${trigger.delayMs/1000}s delay`);
        this.triggerSync(session.id).catch(console.error);
      }, trigger.delayMs);
    }
  }

  private setupIntervalTrigger(session: SessionConfig, trigger: IntervalTrigger) {
    const interval = trigger.intervalMinutes * 60 * 1000;
    
    const executeSync = () => {
      // Check if we're within the allowed time window (if specified)
      if (trigger.startTime && trigger.endTime) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        if (currentTime < trigger.startTime || currentTime > trigger.endTime) {
          return;
        }
      }
      
      console.log(`Interval trigger: Every ${trigger.intervalMinutes}min sync for session "${session.name}"`);
      this.triggerSync(session.id).catch(console.error);
    };
    
    const timer = setInterval(executeSync, interval);
    this.timers.set(`${session.id}-interval`, timer);
  }


  private startNetworkMonitoring() {
    const checkNetwork = async () => {
      try {
        const ssid = await this.getCurrentSSID();
        
        if (ssid !== this.currentSSID) {
          const previousSSID = this.currentSSID;
          this.currentSSID = ssid;
          
          // Check all sessions for WiFi triggers
          this.sessions.forEach(session => {
            session.triggers.forEach(trigger => {
              if (trigger.type === 'wifi') {
                const wifiTrigger = trigger as WiFiTrigger;
                
                // Trigger on connect
                if (wifiTrigger.onConnect && ssid === wifiTrigger.ssid) {
                  console.log(`WiFi trigger: Connected to "${ssid}", syncing session "${session.name}"`);
                  this.triggerSync(session.id).catch(console.error);
                }
                
                // Trigger on disconnect
                if (!wifiTrigger.onConnect && previousSSID === wifiTrigger.ssid && ssid !== wifiTrigger.ssid) {
                  console.log(`WiFi trigger: Disconnected from "${previousSSID}", syncing session "${session.name}"`);
                  this.triggerSync(session.id).catch(console.error);
                }
              }
            });
          });
        }
      } catch (error) {
        console.error('WiFi monitoring error:', error);
      }
    };
    
    // Do an initial check
    checkNetwork();
    
    // Check network status every 10 seconds
    this.networkWatcher = setInterval(checkNetwork, 10000);
  }

  private async getCurrentSSID(): Promise<string | null> {
    try {
      // Platform-specific SSID detection
      if (process.platform === 'darwin') {
        // Method 1: Try system_profiler (most reliable)
        try {
          const { stdout: profilerOut } = await execAsync('system_profiler SPAirPortDataType');
          
          // Look for current network in system profiler output using regex
          const currentNetworkMatch = profilerOut.match(/Current Network Information:\s*\n\s*([^:\n]+):/);
          if (currentNetworkMatch) {
            return currentNetworkMatch[1].trim() || null;
          }
        } catch (profilerError) {
          // Silent fallback to next method
        }

        // Method 2: Try networksetup with en0
        try {
          const { stdout: networkOut } = await execAsync('networksetup -getairportnetwork en0');
          const match = networkOut.match(/Current Wi-Fi Network: (.+)/);
          if (match) {
            return match[1].trim() || null;
          }
        } catch (networkError) {
          // Silent fallback to next method
        }

        // Method 3: Try deprecated airport as last resort
        try {
          const { stdout: airportOut } = await execAsync('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I');
          
          // Look for SSID line that doesn't contain BSSID
          const lines = airportOut.split('\n');
          for (const line of lines) {
            if (line.includes('SSID') && !line.includes('BSSID')) {
              const match = line.match(/SSID:\s*(.+)/);
              if (match) {
                return match[1].trim() || null;
              }
            }
          }
        } catch (airportError) {
          // Silent fallback
        }
        
        return null;
        
      } else if (process.platform === 'win32') {
        const { stdout } = await execAsync('netsh wlan show interfaces');
        
        // Parse Windows WiFi info: "SSID                   : NetworkName"
        const match = stdout.match(/SSID\s*:\s*(.+)/);
        return match ? match[1].trim() : null;
        
      } else {
        // Linux - try multiple methods
        try {
          const { stdout } = await execAsync('iwgetid -r');
          return stdout.trim() || null;
        } catch {
          const { stdout } = await execAsync('nmcli -t -f active,ssid dev wifi | egrep \'^yes\' | cut -d: -f2');
          return stdout.trim() || null;
        }
      }
    } catch (error) {
      console.error('Failed to get WiFi network name:', error);
      return null;
    }
  }

  private async syncWithRsync(session: SessionConfig, log: (type: 'info' | 'success' | 'error' | 'warning', message: string) => void) {
    const { sourcePath, destinationPath, excludePatterns = [], rsyncOptions } = session;
    
    // Check if source directory exists
    try {
      await fs.access(sourcePath, fs.constants.F_OK);
      log('info', `Source directory verified: ${sourcePath}`);
    } catch (error) {
      throw new Error(`Source directory does not exist: ${sourcePath}`);
    }

    // Verify remote connection (always daemon mode)
    if (session.remoteConnection) {
      const { host, username, port } = session.remoteConnection;
      log('info', 'Detected rsync daemon destination');
      log('info', `Rsync daemon mode configured for ${username}@${host}:${port || 873}`);
    } else {
      throw new Error('Remote connection configuration is required');
    }

    // Build rsync command with enhanced options
    let command = '';
    const env = { ...process.env };
    
    // Set up daemon authentication
    if (session.remoteConnection && session.remoteConnection.password) {
      env.RSYNC_PASSWORD = session.remoteConnection.password;
      log('info', 'Using RSYNC_PASSWORD for daemon authentication');
    }
    
    // Build base rsync command
    command += `rsync -av --progress --stats`;
    
    // Add human-readable progress
    command += ' --human-readable';
    
    // Add exclude patterns FIRST (important: before other options)
    if (excludePatterns.length > 0) {
      excludePatterns.forEach(pattern => {
        // Clean pattern and ensure proper escaping
        const cleanPattern = pattern.trim();
        if (cleanPattern) {
          command += ` --exclude='${cleanPattern}'`;
        }
      });
      log('info', `Excluding patterns: ${excludePatterns.map(p => p.trim()).filter(p => p).join(', ')}`);
    }
    
    // Handle update only option (default is true)
    const updateOnly = rsyncOptions?.updateOnly ?? true;
    if (!updateOnly) {
      command += ' --ignore-times';
      log('info', 'Update mode disabled: all files will be transferred regardless of timestamps');
    } else {
      log('info', 'Update mode enabled: only newer files will be transferred');
    }
    
    // Add deletion option
    if (rsyncOptions?.deleteOnDestination) {
      command += ' --delete';
      log('info', 'Delete mode enabled: files not in source will be removed from destination');
    }
    
    // Add compression
    if (rsyncOptions?.compress) {
      command += ' -z';
      log('info', 'Compression enabled for transfer');
    }
    
    // Add permission preservation
    if (rsyncOptions?.preservePermissions) {
      command += ' -p';
      log('info', 'Permission preservation enabled');
    }
    
    command += ` "${sourcePath}/" "${destinationPath}/"`;
    
    log('info', `Executing rsync command...`);
    log('info', `Full command: ${command}`);
    
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(command, { env });
      
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      // Parse and log rsync output
      if (stdout) {
        const lines = stdout.split('\n').filter(line => line.trim());
        let filesTransferred = 0;
        let totalSize = '';
        
        lines.forEach(line => {
          if (line.includes('->') || line.includes('sent') || line.includes('received')) {
            log('info', line);
          } else if (line.includes('Number of files transferred:')) {
            const match = line.match(/Number of files transferred: (\d+)/);
            if (match) {
              filesTransferred = parseInt(match[1]);
            }
          } else if (line.includes('Total file size:')) {
            const match = line.match(/Total file size: (.+) bytes/);
            if (match) {
              totalSize = match[1];
            }
          }
        });
        
        log('success', `Transfer completed in ${duration}s`);
        log('info', `Files transferred: ${filesTransferred}`);
        if (totalSize) {
          log('info', `Total size: ${totalSize} bytes`);
        }
      }
      
      if (stderr && !stderr.includes('warning')) {
        log('warning', `Rsync warnings: ${stderr}`);
      }
      
    } catch (error: any) {
      log('error', `Rsync failed: ${error.message}`);
      
      if (error.message.includes('Permission denied')) {
        throw new Error('Permission denied. Check read permissions on source and write permissions on destination.');
      } else if (error.message.includes('No such file or directory')) {
        throw new Error('Source or destination path not found. Please verify the paths are correct.');
      } else if (error.message.includes('Connection refused')) {
        throw new Error('Connection refused. Check if rsync daemon is running on the remote host.');
      } else if (error.message.includes('Host key verification failed')) {
        throw new Error('Host verification failed. Please check server configuration.');
      } else {
        throw error;
      }
    }
  }


  // Remote browsing methods
  async browseRemoteDirectory(connectionSettings: {
    host: string;
    username: string;
    password?: string;
    port?: number;
    moduleName?: string;
  }, remotePath = ''): Promise<{name: string, isDirectory: boolean, path: string}[]> {
    
    const { host, username, password, port, moduleName } = connectionSettings;
    
    try {
      return await this.browseDaemonDirectory(host, username, password, port || 873, moduleName || '', remotePath);
    } catch (error) {
      throw new Error(`Failed to browse remote directory: ${error}`);
    }
  }

  private async browseDaemonDirectory(host: string, username: string, password: string | undefined, port: number, moduleName: string, remotePath: string): Promise<{name: string, isDirectory: boolean, path: string}[]> {
    try {
      const command = `rsync --list-only`;
      const fullPath = remotePath ? `${moduleName}/${remotePath}` : moduleName;
      const rsyncUrl = `rsync://${username}@${host}:${port}/${fullPath}/`;
      
      const fullCommand = `${command} ${rsyncUrl}`;
      
      // Set up environment variables properly
      const env = { ...process.env };
      if (password) {
        env.RSYNC_PASSWORD = password;
      }
      
      
      const { stdout } = await execAsync(fullCommand, { env });
      
      const entries: {name: string, isDirectory: boolean, path: string}[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const permissions = parts[0];
          const name = parts[parts.length - 1];
          
          // Skip . and .. entries
          if (name === '.' || name === '..') continue;
          
          const isDirectory = permissions.startsWith('d');
          const itemPath = remotePath ? `${remotePath}/${name}` : name;
          
          entries.push({
            name,
            isDirectory,
            path: itemPath
          });
        }
      }
      
      return entries;
    } catch (error: any) {
      // Provide specific error messages for common daemon issues
      if (error.message.includes('unexpected end of file') || error.message.includes('auth failed')) {
        throw new Error(`Authentication failed for module "${moduleName}". This could be due to:\n• Username "${username}" is incorrect\n• Password is incorrect\n• User does not have access to module "${moduleName}"\n• Module requires different authentication method\n\nTry:\n• Check the rsync daemon configuration (/etc/rsyncd.conf)\n• Verify the secrets file (/etc/rsyncd.secrets)\n• Test with: rsync --list-only rsync://${host}:${port}/\n• Contact the administrator for correct credentials`);
      } else if (error.message.includes('unknown module')) {
        throw new Error(`Module "${moduleName}" not found on rsync daemon. Check:\n• Module name is correct (available modules: try rsync --list-only rsync://${host}:${port}/)\n• Module is configured in /etc/rsyncd.conf\n• Module is accessible to user "${username}"`);
      } else {
        throw new Error(`Failed to browse daemon directory: ${error.message}`);
      }
    }
  }


  // Auto-detect available rsync daemon modules
  async getAvailableModules(connectionSettings: {
    host: string;
    username: string;
    password?: string;
    port?: number;
  }): Promise<{name: string, comment: string}[]> {
    
    const { host, username, password, port } = connectionSettings;
    
    // First try without authentication to see if the daemon allows anonymous access
    try {
      const command = `rsync --list-only`;
      const rsyncUrl = `rsync://${host}:${port || 873}/`;
      const fullCommand = `${command} ${rsyncUrl}`;
      
      
      const { stdout } = await execAsync(fullCommand);
      
      const modules: {name: string, comment: string}[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // rsync daemon module list format: "module_name    comment"
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('drwx') && !trimmedLine.startsWith('-rw')) {
          // Split by whitespace, first part is module name, rest is comment
          const parts = trimmedLine.split(/\s+/);
          if (parts.length >= 1) {
            const moduleName = parts[0];
            const comment = parts.slice(1).join(' ') || 'No description';
            
            // Skip if it looks like a file listing (has permissions)
            if (!moduleName.match(/^[drwx-]+$/)) {
              modules.push({
                name: moduleName,
                comment: comment
              });
            }
          }
        }
      }
      
      return modules;
    } catch (anonymousError) {
      
      // If anonymous access fails, try with authentication
      try {
        const command = `rsync --list-only`;
        const rsyncUrl = `rsync://${username}@${host}:${port || 873}/`;
        const fullCommand = `${command} ${rsyncUrl}`;
        
        // Set up environment variables properly
        const env = { ...process.env };
        if (password) {
          env.RSYNC_PASSWORD = password;
        }
        
        
        const { stdout } = await execAsync(fullCommand, { env });
        
        const modules: {name: string, comment: string}[] = [];
        const lines = stdout.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          // rsync daemon module list format: "module_name    comment"
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('drwx') && !trimmedLine.startsWith('-rw')) {
            // Split by whitespace, first part is module name, rest is comment
            const parts = trimmedLine.split(/\s+/);
            if (parts.length >= 1) {
              const moduleName = parts[0];
              const comment = parts.slice(1).join(' ') || 'No description';
              
              // Skip if it looks like a file listing (has permissions)
              if (!moduleName.match(/^[drwx-]+$/)) {
                modules.push({
                  name: moduleName,
                  comment: comment
                });
              }
            }
          }
        }
        
        return modules;
      } catch (error: any) {
        // Provide specific error messages for common issues
        if (error.message.includes('unexpected end of file') || error.message.includes('auth failed')) {
          throw new Error(`Authentication failed when connecting to rsync daemon. This could be due to:\n• Username "${username}" is incorrect\n• Password is incorrect\n• Authentication is required but not properly configured\n• The daemon may not require authentication (try without username/password)\n\nTry first:\n• rsync --list-only rsync://${host}:${port || 873}/\n• Check with the administrator for correct credentials`);
        } else if (error.message.includes('Connection refused')) {
          throw new Error(`Connection refused to ${host}:${port || 873}. Check if:\n• Rsync daemon is running on port ${port || 873}\n• Firewall allows connections to this port`);
        } else {
          throw new Error(`Failed to get available modules: ${error.message}`);
        }
      }
    }
  }

}