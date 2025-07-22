import React, { useState } from 'react';

interface RsyncInstructionsProps {
  onClose: () => void;
  rsyncVersion?: string | null;
}

const RsyncInstructions: React.FC<RsyncInstructionsProps> = ({ onClose, rsyncVersion }) => {
  const [activeTab, setActiveTab] = useState<'client' | 'server'>('client');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50" style={{ paddingTop: '60px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '16px' }}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full h-full max-w-none max-h-none overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Rsync Installation Guide
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {rsyncVersion ? (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-300">
                ✓ Rsync is installed: <code className="font-mono">{rsyncVersion}</code>
              </p>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">
                ✗ Rsync is not installed or not found in PATH
              </p>
            </div>
          )}

          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('client')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'client'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Client Installation
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('server')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'server'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Server Daemon Setup
              </button>
            </nav>
          </div>

          <div className="mt-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 'client' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Installing Rsync Client
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">macOS</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Rsync comes pre-installed on macOS. If you need to update it:
                      </p>
                      <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                        brew install rsync
                      </code>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Windows</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Install using Windows Package Manager (winget):
                      </p>
                      <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm mb-2">
                        winget install -e --id cwRsync.cwRsync
                      </code>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Alternative: Install via WSL (Windows Subsystem for Linux):
                      </p>
                      <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                        wsl --install{'\n'}
                        # Then in WSL:{'\n'}
                        sudo apt update && sudo apt install rsync
                      </code>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Linux</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Debian/Ubuntu:</p>
                          <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                            sudo apt update && sudo apt install rsync
                          </code>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Red Hat/CentOS/Fedora:</p>
                          <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                            sudo yum install rsync
                          </code>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Arch Linux:</p>
                          <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                            sudo pacman -S rsync
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'server' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Setting Up Rsync Daemon on Linux Server
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">1. Install Rsync</h4>
                      <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                        sudo apt update && sudo apt install rsync
                      </code>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">2. Create Configuration File</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Create or edit <code className="font-mono">/etc/rsyncd.conf</code>:
                      </p>
                      <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm whitespace-pre">
{`# /etc/rsyncd.conf
# Global settings
pid file = /var/run/rsyncd.pid
lock file = /var/run/rsync.lock
log file = /var/log/rsync.log
port = 873

# Module definition
[backup]
    path = /home/backup
    comment = Backup directory
    read only = no
    list = yes
    uid = backup-user
    gid = backup-group
    auth users = syncuser
    secrets file = /etc/rsyncd.secrets
    hosts allow = 192.168.1.0/24 10.0.0.0/8
    hosts deny = *`}
                      </code>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">3. Create Secrets File</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Create authentication file:
                      </p>
                      <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                        sudo nano /etc/rsyncd.secrets
                      </code>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-2">
                        Add user credentials (format: username:password):
                      </p>
                      <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                        syncuser:your_secure_password
                      </code>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-2">
                        Set proper permissions:
                      </p>
                      <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                        sudo chmod 600 /etc/rsyncd.secrets
                      </code>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">4. Create Backup Directory</h4>
                      <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                        sudo mkdir -p /home/backup{'\n'}
                        sudo useradd -r -s /bin/false backup-user{'\n'}
                        sudo chown backup-user:backup-group /home/backup{'\n'}
                        sudo chmod 755 /home/backup
                      </code>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">5. Enable and Start Service</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">For systemd systems:</p>
                        <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                          sudo systemctl enable rsync{'\n'}
                          sudo systemctl start rsync{'\n'}
                          sudo systemctl status rsync
                        </code>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">For older systems:</p>
                        <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                          sudo service rsync start
                        </code>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">6. Configure Firewall</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">UFW (Ubuntu/Debian):</p>
                        <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                          sudo ufw allow 873/tcp{'\n'}
                          sudo ufw reload
                        </code>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">firewalld (Red Hat/CentOS):</p>
                        <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                          sudo firewall-cmd --add-port=873/tcp --permanent{'\n'}
                          sudo firewall-cmd --reload
                        </code>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Testing the Connection</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                        From your client machine, test the connection:
                      </p>
                      <code className="block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded font-mono text-sm">
                        rsync --list-only rsync://username@server-ip:873/
                      </code>
                      <p className="text-sm text-blue-800 dark:text-blue-300 mt-2">
                        You should see the available modules listed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RsyncInstructions;