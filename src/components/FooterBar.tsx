import React, { useState, useEffect } from 'react';

interface SyncStats {
  totalSessions: number;
  activeSessions: number;
  lastSyncSpeed: number; // MB/s
  networkLatency: number; // ms
  totalDataSynced: number; // MB
  uptime: number; // seconds
}

interface FooterBarProps {
  syncStats: SyncStats;
}

const FooterBar: React.FC<FooterBarProps> = ({ syncStats }) => {
  const [networkHistory, setNetworkHistory] = useState<number[]>([]);
  const [systemStats, setSystemStats] = useState({ memoryUsed: 0, memoryTotal: 0, cpuUsage: 0 });

  useEffect(() => {
    const updateStats = async () => {
      try {
        const stats = await window.electronAPI.getSystemStats();
        setSystemStats(stats);
      } catch (error) {
        console.error('Failed to get system stats:', error);
      }
      
      // Update network history for mini graph
      setNetworkHistory(prev => {
        const newHistory = [...prev, syncStats.lastSyncSpeed];
        return newHistory.slice(-20); // Keep last 20 data points
      });
    };

    // Update immediately
    updateStats();
    
    // Then update every 2 seconds
    const timer = setInterval(updateStats, 2000);
    return () => clearInterval(timer);
  }, [syncStats.lastSyncSpeed]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const MiniSpeedGraph = ({ data }: { data: number[] }) => {
    if (data.length < 2) return null;
    
    const maxValue = Math.max(...data, 1);
    const width = 60;
    const height = 20;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (value / maxValue) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-blue-500"
        />
      </svg>
    );
  };

  const StatusIndicator = ({ active, color }: { active: boolean; color: string }) => (
    <div className={`w-2 h-2 rounded-full ${active ? `bg-${color}-500` : 'bg-gray-300 dark:bg-gray-600'} 
                    ${active ? `animate-pulse` : ''}`} />
  );

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-3">
      <div className="flex items-center justify-between text-xs">
        {/* Left section - Session status */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <StatusIndicator active={syncStats.activeSessions > 0} color="green" />
            <span className="text-gray-600 dark:text-gray-400">
              {syncStats.activeSessions > 0 ? 'Syncing' : 'Ready'}
            </span>
            <span className="text-gray-500 dark:text-gray-500">
              {syncStats.activeSessions}/{syncStats.totalSessions}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">
              {syncStats.lastSyncSpeed > 0 ? `${syncStats.lastSyncSpeed.toFixed(1)} MB/s` : '-- MB/s'}
            </span>
            <MiniSpeedGraph data={networkHistory} />
          </div>

          <div className="flex items-center space-x-2">
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">
              {formatBytes(syncStats.totalDataSynced * 1024 * 1024)}
            </span>
          </div>
        </div>

        {/* Center section - Network stats */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-1 h-3 bg-green-500 rounded-full opacity-80"></div>
              <div className="w-1 h-4 bg-green-500 rounded-full opacity-60"></div>
              <div className="w-1 h-2 bg-green-500 rounded-full opacity-40"></div>
              <div className="w-1 h-3 bg-green-500 rounded-full opacity-80"></div>
            </div>
            <span className="text-gray-600 dark:text-gray-400">
              {syncStats.networkLatency}ms
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">
              {formatUptime(syncStats.uptime)}
            </span>
          </div>
        </div>

        {/* Right section - System info */}
        <div className="flex items-center space-x-4">
          {/* CPU Usage */}
          <div className="flex items-center space-x-2">
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <div className="w-3 h-3 relative">
              <div className="absolute inset-0 border-2 border-gray-300 dark:border-gray-600 rounded-full">
                <div className="w-full h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full opacity-60" 
                     style={{ clipPath: `polygon(0 0, ${systemStats.cpuUsage}% 0, ${systemStats.cpuUsage}% 100%, 0 100%)` }}></div>
              </div>
            </div>
            <span className="text-gray-600 dark:text-gray-400">{systemStats.cpuUsage}%</span>
          </div>

          {/* RAM Usage */}
          <div className="flex items-center space-x-2">
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">
              {systemStats.memoryUsed} MB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FooterBar;