import React from 'react';

interface ConnectionDiagnosticProps {
  error: string;
  connectionSettings: {
    host: string;
    username: string;
    port?: number;
    connectionMode: 'daemon';
    moduleName?: string;
  };
  onRetry: () => void;
  onClose: () => void;
}

const ConnectionDiagnostic: React.FC<ConnectionDiagnosticProps> = ({
  error,
  connectionSettings,
  onRetry,
  onClose
}) => {
  const isDaemonMode = connectionSettings.connectionMode === 'daemon';
  const port = connectionSettings.port || (isDaemonMode ? 873 : 22);

  const getErrorType = () => {
    if (error.includes('unexpected end of file')) return 'daemon_not_responding';
    if (error.includes('Connection refused')) return 'connection_refused';
    if (error.includes('auth failed')) return 'auth_failed';
    if (error.includes('unknown module')) return 'unknown_module';
    if (error.includes('Cannot connect')) return 'port_closed';
    return 'unknown';
  };

  const getErrorTitle = () => {
    switch (getErrorType()) {
      case 'daemon_not_responding':
        return 'Rsync Daemon Not Responding';
      case 'connection_refused':
        return 'Connection Refused';
      case 'auth_failed':
        return 'Authentication Failed';
      case 'unknown_module':
        return 'Module Not Found';
      case 'port_closed':
        return 'Port Not Accessible';
      default:
        return 'Connection Error';
    }
  };

  const getSuggestions = () => {
    const suggestions = [];
    
    switch (getErrorType()) {
      case 'daemon_not_responding':
      case 'port_closed':
        suggestions.push({
          title: 'Check Rsync Daemon Status',
          steps: [
            'Access the remote server and check if rsync daemon is running',
            `Run: sudo systemctl status rsync`,
            `Or check if process is running: ps aux | grep rsync`
          ]
        });
        suggestions.push({
          title: 'Verify Port Accessibility',
          steps: [
            `Test if port ${port} is open from your machine`,
            `Run: telnet ${connectionSettings.host} ${port}`,
            `Or: nc -z ${connectionSettings.host} ${port}`
          ]
        });
        suggestions.push({
          title: 'Check Firewall Settings',
          steps: [
            `Ensure port ${port} is open in firewall`,
            'Check both local and remote firewall settings',
            'For Ubuntu/Debian: sudo ufw allow 873',
            'For CentOS/RHEL: sudo firewall-cmd --add-port=873/tcp --permanent'
          ]
        });
        break;
        
      case 'connection_refused':
        suggestions.push({
          title: 'Start Rsync Daemon',
          steps: [
            'Start the rsync daemon service',
            'sudo systemctl start rsync',
            'sudo systemctl enable rsync (to start on boot)'
          ]
        });
        break;
        
      case 'auth_failed':
        suggestions.push({
          title: 'Check Authentication',
          steps: [
            'Verify username and password are correct',
            'Check /etc/rsyncd.secrets file on remote server',
            'Ensure user has access to the module'
          ]
        });
        break;
        
      case 'unknown_module':
        suggestions.push({
          title: 'Check Module Configuration',
          steps: [
            'Verify module name is correct',
            'Check /etc/rsyncd.conf on remote server',
            'Ensure module is defined and accessible'
          ]
        });
        break;
        
      default:
        suggestions.push({
          title: 'General Troubleshooting',
          steps: [
            'Check network connectivity',
            'Verify host IP/hostname is correct',
            'Test basic network connectivity to the server'
          ]
        });
    }
    
    return suggestions;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {getErrorTitle()}
              </h2>
              <p className="text-sm text-gray-600">
                Rsync Daemon Mode • {connectionSettings.host}:{port}
              </p>
            </div>
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

        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Error Details</h3>
              <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-800 mb-2">Connection Settings</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Host:</strong> {connectionSettings.host}</div>
                <div><strong>Username:</strong> {connectionSettings.username}</div>
                <div><strong>Port:</strong> {port}</div>
                <div><strong>Mode:</strong> Rsync Daemon</div>
                {isDaemonMode && connectionSettings.moduleName && (
                  <div><strong>Module:</strong> {connectionSettings.moduleName}</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Troubleshooting Steps</h3>
              
              {getSuggestions().map((suggestion, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">{suggestion.title}</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {suggestion.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Quick Test Commands</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                <div><strong>Test port connectivity:</strong></div>
                <code className="bg-yellow-100 px-2 py-1 rounded text-xs">
                  telnet {connectionSettings.host} {port}
                </code>
                <div className="mt-2"><strong>Test rsync daemon:</strong></div>
                <code className="bg-yellow-100 px-2 py-1 rounded text-xs">
                  rsync --list-only rsync://{connectionSettings.host}:{port}/
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDiagnostic;