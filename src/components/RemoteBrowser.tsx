import React, { useState, useEffect } from 'react';

interface RemoteEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface RemoteBrowserProps {
  connectionSettings: {
    host: string;
    username: string;
    password?: string;
    port?: number;
    connectionMode: 'daemon';
    moduleName?: string;
  };
  onSelectPath: (path: string) => void;
  onClose: () => void;
}

const RemoteBrowser: React.FC<RemoteBrowserProps> = ({ connectionSettings, onSelectPath, onClose }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [entries, setEntries] = useState<RemoteEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>(['']);

  useEffect(() => {
    loadDirectory('');
  }, []);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.browseRemoteDirectory(connectionSettings, path);
      setEntries(result);
      setCurrentPath(path);
    } catch (err) {
      setError(`Failed to load directory: ${err}`);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateToDirectory = (entry: RemoteEntry) => {
    if (entry.isDirectory) {
      const newPath = entry.path;
      setPathHistory([...pathHistory, newPath]);
      loadDirectory(newPath);
    }
  };

  const navigateBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = pathHistory.slice(0, -1);
      const previousPath = newHistory[newHistory.length - 1];
      setPathHistory(newHistory);
      loadDirectory(previousPath);
    }
  };

  const selectCurrentPath = () => {
    onSelectPath(currentPath);
    onClose();
  };

  const getDisplayPath = () => {
    if (connectionSettings.connectionMode === 'daemon') {
      const modulePath = connectionSettings.moduleName || '';
      return currentPath ? `${modulePath}/${currentPath}` : modulePath;
    } else {
      return currentPath || '/';
    }
  };

  const getProtocolInfo = () => {
    return `rsync://${connectionSettings.host}:${connectionSettings.port || 873}/${getDisplayPath()}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Browse Remote Directory
            </h2>
            <p className="text-sm text-gray-500">
              Using rsync daemon ({connectionSettings.host}:{connectionSettings.port || 873})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={navigateBack}
                disabled={pathHistory.length <= 1}
                className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Path:</span> {getDisplayPath()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {getProtocolInfo()}
              </div>
            </div>
            <button
              onClick={selectCurrentPath}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Select This Path
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading directory...</p>
                </div>
              ) : entries.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <p>No directories found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {entries.map((entry, index) => (
                    <div
                      key={index}
                      onClick={() => navigateToDirectory(entry)}
                      className={`p-3 flex items-center space-x-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !entry.isDirectory ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {entry.isDirectory ? (
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {entry.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.isDirectory ? 'Directory' : 'File'}
                        </p>
                      </div>
                      {entry.isDirectory && (
                        <div className="flex-shrink-0">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoteBrowser;