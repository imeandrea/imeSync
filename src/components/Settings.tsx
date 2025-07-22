import React, { useState, useEffect } from 'react';

interface SettingsProps {
  onClose: () => void;
}

interface SystemInfo {
  configPath: string;
  logsPath: string;
  userDataPath: string;
  tempPath: string;
}

interface PermissionStatus {
  fullDiskAccess: boolean | null;
  accessibility: boolean | null;
  notifications: boolean | null;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [isMacOS, setIsMacOS] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    configPath: '',
    logsPath: '',
    userDataPath: '',
    tempPath: ''
  });
  const [permissions, setPermissions] = useState<PermissionStatus>({
    fullDiskAccess: null,
    accessibility: null,
    notifications: null
  });

  useEffect(() => {
    loadSettings();
    
    // Handle Escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const loadSettings = async () => {
    try {
      const [autoLaunchStatus, paths, perms, platform] = await Promise.all([
        window.electronAPI.getAutoLaunchStatus(),
        window.electronAPI.getSystemPaths(),
        window.electronAPI.getPermissionStatus(),
        window.electronAPI.getPlatform()
      ]);
      
      setAutoLaunch(autoLaunchStatus);
      setSystemInfo(paths);
      setPermissions(perms);
      setIsMacOS(platform === 'darwin');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleAutoLaunchToggle = async (enabled: boolean) => {
    try {
      await window.electronAPI.setAutoLaunch(enabled);
      setAutoLaunch(enabled);
    } catch (error) {
      console.error('Failed to set auto launch:', error);
    }
  };

  const requestPermission = async (permission: 'fullDiskAccess' | 'accessibility' | 'notifications') => {
    try {
      const granted = await window.electronAPI.requestPermission(permission);
      setPermissions(prev => ({ ...prev, [permission]: granted }));
    } catch (error) {
      console.error(`Failed to request ${permission}:`, error);
    }
  };

  const openPath = async (path: string) => {
    try {
      await window.electronAPI.openPath(path);
    } catch (error) {
      console.error('Failed to open path:', error);
    }
  };

  const getPermissionIcon = (status: boolean | null) => {
    if (status === null) return '⚫'; // Unknown
    return status ? '🟢' : '🔴'; // Granted : Denied
  };

  const getPermissionText = (status: boolean | null) => {
    if (status === null) return 'Unknown';
    return status ? 'Granted' : 'Denied';
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'permissions', name: 'Permissions', icon: '🔐' },
    { id: 'paths', name: 'Paths', icon: '📁' }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-4xl h-full max-h-[80vh] bg-white dark:bg-gray-900 rounded-lg shadow-xl flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
        </div>
        
        <nav className="flex-1 p-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-sm font-medium">{tab.name}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">General Settings</h3>
                
                {/* Auto Launch */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto Launch</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Start imeSync automatically when you log in to your computer
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={autoLaunch}
                        onChange={(e) => handleAutoLaunchToggle(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">System Permissions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  imeSync may require certain permissions to function properly on your system.
                </p>
                
                <div className="space-y-4">
                  {/* Full Disk Access - macOS only */}
                  {isMacOS && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getPermissionIcon(permissions.fullDiskAccess)}</span>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Full Disk Access</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Required to sync files from protected locations
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {getPermissionText(permissions.fullDiskAccess)}
                          </span>
                          <button
                            onClick={() => requestPermission('fullDiskAccess')}
                            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded text-xs transition-colors"
                          >
                            Request
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Accessibility - macOS only */}
                  {isMacOS && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getPermissionIcon(permissions.accessibility)}</span>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Accessibility</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Required for advanced file system monitoring
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {getPermissionText(permissions.accessibility)}
                          </span>
                          <button
                            onClick={() => requestPermission('accessibility')}
                            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded text-xs transition-colors"
                          >
                            Request
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notifications */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getPermissionIcon(permissions.notifications)}</span>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Notifications</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Show system notifications for sync status and errors
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {getPermissionText(permissions.notifications)}
                        </span>
                        <button
                          onClick={() => requestPermission('notifications')}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded text-xs transition-colors"
                        >
                          Request
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'paths' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Application Paths</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  File locations used by imeSync for configuration, logs, and temporary files.
                </p>
                
                <div className="space-y-4">
                  {/* Config Path */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Configuration Files</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1 break-all">
                          {systemInfo.configPath || 'Loading...'}
                        </p>
                      </div>
                      <button
                        onClick={() => openPath(systemInfo.configPath)}
                        disabled={!systemInfo.configPath}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs transition-colors disabled:opacity-50"
                      >
                        Open
                      </button>
                    </div>
                  </div>

                  {/* Logs Path */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Log Files</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1 break-all">
                          {systemInfo.logsPath || 'Loading...'}
                        </p>
                      </div>
                      <button
                        onClick={() => openPath(systemInfo.logsPath)}
                        disabled={!systemInfo.logsPath}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs transition-colors disabled:opacity-50"
                      >
                        Open
                      </button>
                    </div>
                  </div>

                  {/* User Data Path */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">User Data</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1 break-all">
                          {systemInfo.userDataPath || 'Loading...'}
                        </p>
                      </div>
                      <button
                        onClick={() => openPath(systemInfo.userDataPath)}
                        disabled={!systemInfo.userDataPath}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs transition-colors disabled:opacity-50"
                      >
                        Open
                      </button>
                    </div>
                  </div>

                  {/* Temp Path */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Temporary Files</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1 break-all">
                          {systemInfo.tempPath || 'Loading...'}
                        </p>
                      </div>
                      <button
                        onClick={() => openPath(systemInfo.tempPath)}
                        disabled={!systemInfo.tempPath}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs transition-colors disabled:opacity-50"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default Settings;