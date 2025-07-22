import React, { useState, useEffect } from 'react';
import { SessionConfig } from '../types/SessionConfig';
import RemoteBrowser from './RemoteBrowser';
import ConnectionDiagnostic from './ConnectionDiagnostic';
import TriggerManager from './TriggerManager';

interface SessionDialogProps {
  session: SessionConfig | null;
  onSave: (session: SessionConfig) => void;
  onClose: () => void;
}

const SessionDialog: React.FC<SessionDialogProps> = ({ session, onSave, onClose }) => {
  const [formData, setFormData] = useState<Partial<SessionConfig>>({
    name: '',
    sourcePath: '',
    destinationPath: '',
    triggers: [],
    enabled: true,
    excludePatterns: [],
    remoteConnection: {
      host: '',
      username: '',
      remotePath: '',
      password: '',
      port: 873,
      connectionMode: 'daemon',
      moduleName: ''
    }
  });
  const [activeTab, setActiveTab] = useState<'general' | 'triggers' | 'advanced'>('general');
  const [showRemoteBrowser, setShowRemoteBrowser] = useState(false);
  const [availableModules, setAvailableModules] = useState<{name: string, comment: string}[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasTestedConnection, setHasTestedConnection] = useState(false);

  useEffect(() => {
    if (session) {
      setFormData(session);
    }
  }, [session]);

  // Clear connection test results when connection settings change
  useEffect(() => {
    setHasTestedConnection(false);
    setAvailableModules([]);
    setConnectionError(null);
  }, [
    formData.remoteConnection?.host,
    formData.remoteConnection?.username,
    formData.remoteConnection?.password,
    formData.remoteConnection?.port
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate destination path based on connection settings
    let destinationPath = '';
    
    if (formData.remoteConnection) {
      const rc = formData.remoteConnection;
      // For daemon mode, use rsync:// protocol
      destinationPath = `rsync://${rc.username}@${rc.host}:${rc.port || 873}/${rc.moduleName}/${rc.remotePath}`;
    }
    
    const sessionData: SessionConfig = {
      id: session?.id || Date.now().toString(),
      name: formData.name || '',
      sourcePath: formData.sourcePath || '',
      destinationPath: destinationPath,
      triggers: formData.triggers || [],
      enabled: formData.enabled ?? true,
      excludePatterns: formData.excludePatterns,
      rsyncOptions: formData.rsyncOptions,
      remoteConnection: formData.remoteConnection,
    };
    onSave(sessionData);
  };

  const handleBrowseSource = async () => {
    const path = await window.electronAPI.selectDirectory();
    if (path) {
      setFormData({ ...formData, sourcePath: path });
    }
  };


  const handleBrowseRemote = () => {
    setShowRemoteBrowser(true);
  };

  const handleRemotePathSelected = (path: string) => {
    if (formData.remoteConnection) {
      setFormData({
        ...formData,
        remoteConnection: {
          ...formData.remoteConnection,
          remotePath: path
        }
      });
    }
  };

  const canBrowseRemote = () => {
    return formData.remoteConnection && 
           formData.remoteConnection.host &&
           formData.remoteConnection.username &&
           formData.remoteConnection.password &&
           formData.remoteConnection.moduleName;
  };

  const loadAvailableModules = async () => {
    if (!formData.remoteConnection || 
        !formData.remoteConnection.host ||
        !formData.remoteConnection.username) {
      return;
    }

    const { host, username, password, port } = formData.remoteConnection;
    
    // Only load if we have authentication
    if (!password) {
      return;
    }

    setLoadingModules(true);
    setConnectionError(null);
    setAvailableModules([]);
    try {
      const modules = await window.electronAPI.getAvailableModules({
        host,
        username,
        password,
        port
      });
      setAvailableModules(modules);
      setHasTestedConnection(true);
    } catch (error) {
      console.error('Failed to load modules:', error);
      setAvailableModules([]);
      setConnectionError(error instanceof Error ? error.message : String(error));
      setHasTestedConnection(false);
    } finally {
      setLoadingModules(false);
    }
  };


  const renderConnectionSettings = () => {
    return (
      <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <h4 className="text-sm font-medium text-green-900 mb-3">Connection Settings</h4>
            
            <div className="space-y-3">
              
              {formData.remoteConnection && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Host/IP Address
                      </label>
                      <input
                        type="text"
                        value={formData.remoteConnection.host}
                        onChange={(e) => setFormData({
                          ...formData,
                          remoteConnection: {
                            ...formData.remoteConnection!,
                            host: e.target.value
                          }
                        })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        placeholder="192.168.1.100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Port
                      </label>
                      <input
                        type="number"
                        value={formData.remoteConnection.port || 873}
                        onChange={(e) => setFormData({
                          ...formData,
                          remoteConnection: {
                            ...formData.remoteConnection!,
                            port: parseInt(e.target.value) || 873
                          }
                        })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        placeholder="873"
                        min="1"
                        max="65535"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.remoteConnection.username}
                        onChange={(e) => setFormData({
                          ...formData,
                          remoteConnection: {
                            ...formData.remoteConnection!,
                            username: e.target.value
                          }
                        })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        placeholder="username"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.remoteConnection.password || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          remoteConnection: {
                            ...formData.remoteConnection!,
                            password: e.target.value
                          }
                        })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        placeholder="password"
                        required
                      />
                    </div>
                    {/* Module Name - enabled only if basic fields are filled */}
                    {formData.remoteConnection.host && 
                     formData.remoteConnection.username && 
                     formData.remoteConnection.password && 
                     formData.remoteConnection.port && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Module Name
                          {loadingModules && (
                            <span className="text-xs text-blue-600 ml-2">
                              <div className="inline-block animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-blue-600"></div>
                              Loading...
                            </span>
                          )}
                        </label>
                        <div className="space-y-1.5">
                          {availableModules.length > 0 ? (
                            <select
                              value={formData.remoteConnection.moduleName || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                remoteConnection: {
                                  ...formData.remoteConnection!,
                                  moduleName: e.target.value
                                }
                              })}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500"
                              required
                            >
                              <option value="">Select a module...</option>
                              {availableModules.map((module) => (
                                <option key={module.name} value={module.name}>
                                  {module.name} - {module.comment}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={formData.remoteConnection.moduleName || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                remoteConnection: {
                                  ...formData.remoteConnection!,
                                  moduleName: e.target.value
                                }
                              })}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500"
                              placeholder="backup"
                              required
                            />
                          )}
                          <button
                            type="button"
                            onClick={loadAvailableModules}
                            disabled={loadingModules || !formData.remoteConnection.host || !formData.remoteConnection.username || !formData.remoteConnection.password}
                            className="w-full px-2 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {loadingModules ? 'Testing Connection...' : 'Test Connection & Load Modules'}
                          </button>
                          {connectionError && (
                            <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                              <p className="text-xs text-red-700 mb-1">
                                Connection test failed
                              </p>
                              <button
                                type="button"
                                onClick={() => setConnectionError(connectionError)}
                                className="text-xs text-red-600 hover:text-red-800 underline"
                              >
                                View Diagnostic Details
                              </button>
                            </div>
                          )}
                          {availableModules.length === 0 && !loadingModules && !connectionError && (
                            <p className="text-xs text-gray-500">
                              {hasTestedConnection 
                                ? "No modules found. Enter module name manually or check server configuration."
                                : "Click \"Test Connection & Load Modules\" to discover available modules on the remote server."
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Path within Module - enabled only if basic fields are filled */}
                    {formData.remoteConnection.host && 
                     formData.remoteConnection.username && 
                     formData.remoteConnection.password && 
                     formData.remoteConnection.port && (
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Path within Module
                        </label>
                        <div className="flex">
                          <input
                            type="text"
                            value={formData.remoteConnection.remotePath}
                            onChange={(e) => setFormData({
                              ...formData,
                              remoteConnection: {
                                ...formData.remoteConnection!,
                                remotePath: e.target.value
                              }
                            })}
                            className="flex-1 rounded-l-md border border-gray-300 px-2 py-1 text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            placeholder="subfolder"
                            required
                          />
                          <button
                            type="button"
                            onClick={handleBrowseRemote}
                            disabled={!canBrowseRemote()}
                            className="px-2 py-1 bg-green-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                          >
                            Browse Remote
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>Generated path:</strong> {(() => {
                        const rc = formData.remoteConnection;
                        if (!rc.host || !rc.username || !rc.password || !rc.port) {
                          return 'Please fill in host, port, username, and password';
                        }
                        
                        return rc.moduleName && rc.remotePath 
                          ? `rsync://${rc.username}@${rc.host}:${rc.port || 873}/${rc.moduleName}/${rc.remotePath}`
                          : 'Please fill in module name and path';
                      })()}
                    </p>
                    <div className="mt-1.5 text-xs text-gray-600">
                      <p><strong>Note:</strong> Connects directly to rsync daemon (port 873)</p>
                      <p>• Optimized for efficient file transfers</p>
                      <p>• Requires rsync daemon running on remote server</p>
                      <p>• Authentication via rsync secrets file</p>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50" style={{ paddingTop: '60px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '16px' }}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full h-full max-w-none max-h-none overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <nav className="flex space-x-6">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`py-2 px-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('triggers')}
              className={`py-2 px-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'triggers'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Triggers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`py-2 px-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'advanced'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Advanced
            </button>
          </nav>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {activeTab === 'general' && (
              <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Session Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="My Backup"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Source Path (Local)
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={formData.sourcePath}
                        onChange={(e) => setFormData({ ...formData, sourcePath: e.target.value })}
                        className="flex-1 rounded-l border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="/path/to/source"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleBrowseSource}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        Browse
                      </button>
                    </div>
                  </div>

                  {renderConnectionSettings()}


                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                        className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable this session</span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'triggers' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Automatic Synchronization Triggers
                        </h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Configure when this session should automatically sync. You can combine multiple triggers 
                          like WiFi connection, file changes, scheduled times, and more.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <TriggerManager
                    triggers={formData.triggers || []}
                    onChange={(triggers) => setFormData({ ...formData, triggers })}
                  />
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Exclude Patterns
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const defaultPatterns = ['*.tmp', '.DS_Store', 'node_modules/', 'build/', 'release/'];
                          const currentPatterns = formData.excludePatterns || [];
                          const newPatterns = [...new Set([...currentPatterns, ...defaultPatterns])];
                          setFormData({ ...formData, excludePatterns: newPatterns });
                        }}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 transition-colors"
                      >
                        Add Defaults
                      </button>
                    </div>
                    <textarea
                      value={formData.excludePatterns?.join('\n') || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        excludePatterns: e.target.value.split('\n').filter(p => p.trim())
                      })}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      rows={4}
                      placeholder="*.tmp&#10;.DS_Store&#10;node_modules/&#10;build/&#10;release/"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">One pattern per line</p>
                  </div>

                  {/* Always show rsync options since we use rsync for everything */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Rsync Options</h3>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.rsyncOptions?.updateOnly ?? true}
                        onChange={(e) => setFormData({
                          ...formData,
                          rsyncOptions: {
                            ...formData.rsyncOptions,
                            updateOnly: e.target.checked,
                            deleteOnDestination: formData.rsyncOptions?.deleteOnDestination || false,
                            compress: formData.rsyncOptions?.compress || false,
                            preservePermissions: formData.rsyncOptions?.preservePermissions || false,
                          }
                        })}
                        className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Only transfer newer files (recommended)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.rsyncOptions?.deleteOnDestination || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          rsyncOptions: {
                            ...formData.rsyncOptions,
                            deleteOnDestination: e.target.checked,
                            updateOnly: formData.rsyncOptions?.updateOnly ?? true,
                            compress: formData.rsyncOptions?.compress || false,
                            preservePermissions: formData.rsyncOptions?.preservePermissions || false,
                          }
                        })}
                        className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Delete files on destination</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.rsyncOptions?.compress || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          rsyncOptions: {
                            ...formData.rsyncOptions,
                            compress: e.target.checked,
                            updateOnly: formData.rsyncOptions?.updateOnly ?? true,
                            deleteOnDestination: formData.rsyncOptions?.deleteOnDestination || false,
                            preservePermissions: formData.rsyncOptions?.preservePermissions || false,
                          }
                        })}
                        className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Compress during transfer</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.rsyncOptions?.preservePermissions || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          rsyncOptions: {
                            ...formData.rsyncOptions,
                            preservePermissions: e.target.checked,
                            updateOnly: formData.rsyncOptions?.updateOnly ?? true,
                            deleteOnDestination: formData.rsyncOptions?.deleteOnDestination || false,
                            compress: formData.rsyncOptions?.compress || false,
                          }
                        })}
                        className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Preserve file permissions</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

          <div className="px-4 py-2 bg-gray-50/80 dark:bg-gray-700/80 backdrop-blur border-t border-gray-200 dark:border-gray-600 flex justify-end space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors"
            >
              {session ? 'Update' : 'Create'} Session
            </button>
          </div>
        </form>
        </div>
      </div>
      
      {showRemoteBrowser && formData.remoteConnection && (
        <RemoteBrowser
          connectionSettings={formData.remoteConnection}
          onSelectPath={handleRemotePathSelected}
          onClose={() => setShowRemoteBrowser(false)}
        />
      )}
      
      {connectionError && formData.remoteConnection && (
        <ConnectionDiagnostic
          error={connectionError}
          connectionSettings={formData.remoteConnection}
          onRetry={() => {
            setConnectionError(null);
            loadAvailableModules();
          }}
          onClose={() => setConnectionError(null)}
        />
      )}
    </>
  );
};

export default SessionDialog;