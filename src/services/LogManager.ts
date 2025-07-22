import { promises as fs } from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { LogEntry } from '../types/LogEntry';

export class LogManager {
  private logDir: string;
  private sessionsLogDir: string;
  private maxLogSize = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 20; // Keep more log files
  private currentSessionLogFile: string | null = null;
  private currentSessionName: string | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.logDir = path.join(userDataPath, 'logs');
    this.sessionsLogDir = path.join(this.logDir, 'sessions');
  }

  async initializeLogFile(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
      await fs.mkdir(this.sessionsLogDir, { recursive: true });
      
      // Create year/month subdirectories
      const now = new Date();
      const yearDir = path.join(this.sessionsLogDir, now.getFullYear().toString());
      const monthDir = path.join(yearDir, (now.getMonth() + 1).toString().padStart(2, '0'));
      await fs.mkdir(monthDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize log directory:', error);
    }
  }

  async endCurrentSyncLog(): Promise<void> {
    if (this.currentSessionLogFile) {
      try {
        const footer = `\n${'='.repeat(50)}\nSync completed at: ${new Date().toLocaleString()}\n`;
        await fs.appendFile(this.currentSessionLogFile, footer);
      } catch (error) {
        console.error('Failed to write log footer:', error);
      }
      this.currentSessionLogFile = null;
      this.currentSessionName = null;
    }
  }

  async startNewSyncLog(sessionId: string, sessionName: string): Promise<void> {
    const now = new Date();
    const yearDir = path.join(this.sessionsLogDir, now.getFullYear().toString());
    const monthDir = path.join(yearDir, (now.getMonth() + 1).toString().padStart(2, '0'));
    
    // Ensure directories exist
    await fs.mkdir(monthDir, { recursive: true });
    
    // Create filename: sessionName_YYYYMMDD_HHMMSS.txt
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const safeSessionName = sessionName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeSessionName}_${dateStr}_${timeStr}.txt`;
    
    this.currentSessionLogFile = path.join(monthDir, fileName);
    this.currentSessionName = sessionName;
    
    try {
      const header = `=== Sync Log for "${sessionName}" ===\n` +
                    `Session ID: ${sessionId}\n` +
                    `Date: ${now.toLocaleDateString()}\n` +
                    `Time: ${now.toLocaleTimeString()}\n` +
                    `${'='.repeat(50)}\n\n`;
      await fs.writeFile(this.currentSessionLogFile, header);
    } catch (error) {
      console.error('Failed to create session log file:', error);
    }
  }

  async writeLog(entry: LogEntry): Promise<void> {
    try {
      // Format log entry with time
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const logLine = `[${time}] [${entry.type.toUpperCase().padEnd(7)}] ${entry.message}\n`;
      
      // Write to current session log file if it exists
      if (this.currentSessionLogFile) {
        await fs.appendFile(this.currentSessionLogFile, logLine);
      } else {
        console.warn('No active log file for session, creating one...');
        // If no session log file exists but we have a sessionId, create one
        if (entry.sessionId) {
          await this.startNewSyncLog(entry.sessionId, this.currentSessionName || 'Unknown Session');
          await fs.appendFile(this.currentSessionLogFile, logLine);
        }
      }
      
      // Also write to a combined log file for historical viewing
      const combinedLogFile = path.join(this.logDir, 'combined.log');
      const combinedLogLine = `${entry.timestamp} [${entry.type.toUpperCase()}] ${entry.sessionId ? `[${entry.sessionId}] ` : ''}${entry.message}\n`;
      await fs.appendFile(combinedLogFile, combinedLogLine);
      
      // Check if combined log rotation is needed
      await this.rotateLogsIfNeeded(combinedLogFile);
    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  }

  async readLogs(limit: number = 1000): Promise<LogEntry[]> {
    try {
      const combinedLogFile = path.join(this.logDir, 'combined.log');
      const content = await fs.readFile(combinedLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Parse last 'limit' lines
      const recentLines = lines.slice(-limit);
      const entries: LogEntry[] = [];
      
      for (const line of recentLines) {
        const entry = this.parseLogLine(line);
        if (entry) {
          entries.push(entry);
        }
      }
      
      return entries;
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    try {
      const combinedLogFile = path.join(this.logDir, 'combined.log');
      await fs.writeFile(combinedLogFile, '');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  async exportLogs(exportPath: string): Promise<void> {
    try {
      const combinedLogFile = path.join(this.logDir, 'combined.log');
      await fs.copyFile(combinedLogFile, exportPath);
    } catch (error) {
      console.error('Failed to export logs:', error);
      throw error;
    }
  }

  private parseLogLine(line: string): LogEntry | null {
    try {
      // Parse format: "2024-07-22T18:20:13.634Z [INFO] [sessionId] message"
      const regex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[(\w+)\]\s+(?:\[([^\]]+)\]\s+)?(.+)$/;
      const match = line.match(regex);
      
      if (match) {
        const [, timestamp, type, sessionId, message] = match;
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp,
          type: type.toLowerCase() as 'info' | 'success' | 'error' | 'warning',
          message,
          sessionId: sessionId || undefined
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async rotateLogsIfNeeded(logFilePath: string): Promise<void> {
    try {
      const stats = await fs.stat(logFilePath);
      
      if (stats.size >= this.maxLogSize) {
        // Rotate logs
        for (let i = this.maxLogFiles - 1; i > 0; i--) {
          const oldPath = `${logFilePath}.${i}`;
          const newPath = `${logFilePath}.${i + 1}`;
          
          try {
            await fs.access(oldPath);
            if (i === this.maxLogFiles - 1) {
              await fs.unlink(oldPath); // Delete oldest log
            } else {
              await fs.rename(oldPath, newPath);
            }
          } catch {
            // File doesn't exist, skip
          }
        }
        
        // Move current log to .1
        await fs.rename(logFilePath, `${logFilePath}.1`);
        
        // Create new empty log file
        await fs.writeFile(logFilePath, '');
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  getLogFilePath(): string {
    return this.logDir;
  }

  async getSessionLogFiles(sessionName?: string): Promise<{fileName: string, path: string, date: Date, size: number}[]> {
    try {
      const logFiles: {fileName: string, path: string, date: Date, size: number}[] = [];
      
      // Recursively search through year/month directories
      const searchDir = async (dir: string) => {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory() && !item.name.startsWith('.')) {
            // Recursively search subdirectories
            await searchDir(fullPath);
          } else if (item.isFile() && item.name.endsWith('.txt')) {
            // Check if this is a log file we're interested in
            if (!sessionName || item.name.toLowerCase().includes(sessionName.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_'))) {
              const stats = await fs.stat(fullPath);
              logFiles.push({
                fileName: item.name,
                path: fullPath,
                date: stats.mtime,
                size: stats.size
              });
            }
          }
        }
      };
      
      await searchDir(this.sessionsLogDir);
      
      // Sort by date descending (newest first)
      logFiles.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      return logFiles;
    } catch (error) {
      console.error('Failed to get session log files:', error);
      return [];
    }
  }

  async readSessionLogFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error('Failed to read session log file:', error);
      return '';
    }
  }
}