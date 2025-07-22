import React, { useState, useEffect } from 'react';
import { SessionConfig } from './types/SessionConfig';
import Toolbar from './components/Toolbar';
import SessionDialog from './components/SessionDialog';
import RsyncInstructions from './components/RsyncInstructions';
import FooterBar from './components/FooterBar';
import LogViewer from './components/LogViewer';
import Settings from './components/Settings';
import { LogEntry } from './types/LogEntry';

function App() {
  const [sessions, setSessions] = useState<SessionConfig[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionConfig | null>(null);
  const [, setLogs] = useState<LogEntry[]>([]);
  const [runningStates, setRunningStates] = useState<Record<string, boolean>>({});
  const [progressStates, setProgressStates] = useState<Record<string, number>>({});
  const [, setTheme] = useState<'light' | 'dark'>('light');
  const [showHelp, setShowHelp] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [logViewerSessionFilter, setLogViewerSessionFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rsyncStatus, setRsyncStatus] = useState<{installed: boolean, version: string | null}>({ installed: false, version: null });
  const [appStartTime] = useState(Date.now());
  const [isGloballyPaused, setIsGloballyPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  useEffect(() => {
    loadSessions();
    
    // Check rsync installation
    window.electronAPI.checkRsync().then(status => {
      setRsyncStatus(status);
      if (!status.installed) {
        setShowHelp(true);
      }
    });
    
    // Get initial pause state
    window.electronAPI.isGloballyPaused().then(paused => {
      setIsGloballyPaused(paused);
    });
    
    // Get initial theme
    window.electronAPI.getTheme().then(initialTheme => {
      setTheme(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    });
    
    // Setup theme change listener
    window.electronAPI.onThemeChanged?.((newTheme) => {
      setTheme(newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    });
    
    // Setup log listener
    window.electronAPI.onLogEntry?.((entry: LogEntry) => {
      setLogs(prev => [...prev, entry]);
    });
    
    // Setup sessions update listener
    window.electronAPI.onSessionsUpdated?.((updatedSessions: SessionConfig[]) => {
      setSessions(updatedSessions);
    });
    
    // Setup sync start/end listeners for trigger-initiated syncs
    window.electronAPI.onSyncStarted?.((sessionId: string) => {
      setRunningStates(prev => ({ ...prev, [sessionId]: true }));
      setProgressStates(prev => ({ ...prev, [sessionId]: 0 }));
      
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setProgressStates(prev => {
          const currentProgress = prev[sessionId] || 0;
          if (currentProgress >= 95 || !prev[sessionId]) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [sessionId]: Math.min(95, currentProgress + Math.random() * 15) };
        });
      }, 500);
    });
    
    window.electronAPI.onSyncEnded?.((sessionId: string) => {
      setProgressStates(prev => ({ ...prev, [sessionId]: 100 }));
      
      setTimeout(() => {
        setRunningStates(prev => ({ ...prev, [sessionId]: false }));
        setProgressStates(prev => ({ ...prev, [sessionId]: 0 }));
      }, 2000);
    });
    
    // Setup tray menu listeners
    window.electronAPI.onOpenNewSessionDialog?.(() => {
      setIsDialogOpen(true);
      setEditingSession(null);
    });
    
    window.electronAPI.onOpenLogViewer?.(() => {
      setShowLogViewer(true);
      setLogViewerSessionFilter('all');
    });
    
    window.electronAPI.onShowHelp?.(() => {
      setShowHelp(true);
    });
    
    // Setup settings listener
    window.electronAPI.onOpenSettings?.(() => {
      setShowSettings(true);
    });
    
    // Check if we should show settings based on URL hash
    if (window.location.hash === '#/settings') {
      setShowSettings(true);
    }
  }, []);

  const loadSessions = async () => {
    const loadedSessions = await window.electronAPI.loadSessions();
    setSessions(loadedSessions);
  };

  const handleSaveSession = async (session: SessionConfig) => {
    await window.electronAPI.saveSession(session);
    await loadSessions();
    setIsDialogOpen(false);
    setEditingSession(null);
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      await window.electronAPI.deleteSession(id);
      await loadSessions();
      // Clean up running states
      setRunningStates(prev => {
        const newStates = { ...prev };
        delete newStates[id];
        return newStates;
      });
      setProgressStates(prev => {
        const newStates = { ...prev };
        delete newStates[id];
        return newStates;
      });
    }
  };

  const handleSyncNow = async (id: string) => {
    setRunningStates(prev => ({ ...prev, [id]: true }));
    setProgressStates(prev => ({ ...prev, [id]: 0 }));
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgressStates(prev => {
          const currentProgress = prev[id] || 0;
          if (currentProgress >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [id]: currentProgress + Math.random() * 15 };
        });
      }, 500);
      
      await window.electronAPI.syncNow(id);
      
      clearInterval(progressInterval);
      setProgressStates(prev => ({ ...prev, [id]: 100 }));
      
      setTimeout(() => {
        setRunningStates(prev => ({ ...prev, [id]: false }));
        setProgressStates(prev => ({ ...prev, [id]: 0 }));
        loadSessions(); // Refresh to update lastSync
      }, 2000);
      
    } catch (error) {
      setRunningStates(prev => ({ ...prev, [id]: false }));
      setProgressStates(prev => ({ ...prev, [id]: 0 }));
      addLog('error', `Sync failed: ${error}`);
    }
  };

  const handleEditSession = (session: SessionConfig) => {
    setEditingSession(session);
    setIsDialogOpen(true);
  };

  const handleNewSession = () => {
    setEditingSession(null);
    setIsDialogOpen(true);
  };

  const addLog = (type: 'info' | 'success' | 'error' | 'warning', message: string) => {
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      message
    }]);
  };

  // Calculate footer stats
  const activeSessions = Object.values(runningStates).filter(Boolean).length;
  const totalDataSynced = sessions.reduce((total, _session) => total + (Math.random() * 100), 0); // Mock data
  const uptime = Math.floor((Date.now() - appStartTime) / 1000);
  
  const syncStats = {
    totalSessions: sessions.length,
    activeSessions,
    lastSyncSpeed: activeSessions > 0 ? Math.random() * 50 + 10 : 0, // Mock network speed
    networkLatency: Math.floor(Math.random() * 50) + 10, // Mock latency 10-60ms
    totalDataSynced,
    uptime
  };

  const toggleRowExpansion = (sessionId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(sessionId)) {
      newExpandedRows.delete(sessionId);
    } else {
      newExpandedRows.add(sessionId);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleShowSessionLogs = (sessionId: string) => {
    setLogViewerSessionFilter(sessionId);
    setShowLogViewer(true);
  };

  const handleToggleGlobalPause = async (currentlyPaused: boolean) => {
    try {
      if (currentlyPaused) {
        await window.electronAPI.resumeAllSessions();
        setIsGloballyPaused(false);
      } else {
        await window.electronAPI.pauseAllSessions();
        setIsGloballyPaused(true);
      }
    } catch (error) {
      console.error('Failed to toggle global pause:', error);
    }
  };

  const handleToggleSessionPause = async (sessionId: string, currentlyPaused: boolean) => {
    try {
      if (currentlyPaused) {
        await window.electronAPI.resumeSession(sessionId);
      } else {
        await window.electronAPI.pauseSession(sessionId);
      }
      // Refresh sessions to get updated pause state
      await loadSessions();
    } catch (error) {
      console.error('Failed to toggle session pause:', error);
    }
  };


  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Toolbar
        onNewSession={handleNewSession}
        onShowHelp={() => setShowHelp(true)}
        onShowLogs={() => setShowLogViewer(true)}
        onTogglePause={handleToggleGlobalPause}
        isGloballyPaused={isGloballyPaused}
        onShowSettings={() => setShowSettings(true)}
      />
      
      <main className="flex-1 p-8 overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-4">
        <div className="max-w-7xl mx-auto">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No sync sessions</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">Create your first sync session to get started</p>
              <button
                onClick={handleNewSession}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Session
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Last Sync
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sessions.map((session) => {
                      const isRunning = runningStates[session.id] || false;
                      const progress = progressStates[session.id] || 0;
                      
                      const isSessionPaused = isGloballyPaused || session.paused;

                      const getStatusColor = () => {
                        if (isRunning) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
                        if (!session.enabled) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
                        if (isSessionPaused) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
                        if (session.lastSyncStatus === 'error') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                        if (session.lastSyncStatus === 'warning') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
                        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                      };

                      const getStatusText = () => {
                        if (isRunning) return 'Syncing...';
                        if (!session.enabled) return 'Disabled';
                        if (isSessionPaused) return isGloballyPaused ? 'Paused (Global)' : 'Paused';
                        if (session.lastSyncStatus === 'error') return 'Error';
                        if (session.lastSyncStatus === 'warning') return 'Warning';
                        return 'Ready';
                      };

                      return (
                        <React.Fragment key={session.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleRowExpansion(session.id)}
                              className="mr-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                              title={expandedRows.has(session.id) ? "Collapse details" : "Expand details"}
                            >
                              <svg 
                                className={`w-4 h-4 text-gray-500 transition-transform ${expandedRows.has(session.id) ? 'rotate-90' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {session.name}
                              </div>
                              {session.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {session.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                          
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {session.lastSync ? new Date(session.lastSync).toLocaleDateString() + ' ' + new Date(session.lastSync).toLocaleTimeString() : 'Never'}
                          </td>
                          
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span 
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}
                              title={session.lastSyncError || undefined}
                            >
                              {getStatusText()}
                            </span>
                          </td>
                          
                          <td className="px-4 py-2 whitespace-nowrap">
                            {isRunning ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[32px]">
                                  {progress}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          
                          <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleSyncNow(session.id)}
                                disabled={isRunning}
                                className="inline-flex items-center justify-center w-7 h-7 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                                title="Sync now"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => handleShowSessionLogs(session.id)}
                                className="inline-flex items-center justify-center w-7 h-7 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded transition-colors"
                                title="View session logs"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => handleToggleSessionPause(session.id, session.paused || false)}
                                disabled={isGloballyPaused}
                                className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
                                  isGloballyPaused
                                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    : isSessionPaused
                                    ? 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400'
                                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                                title={
                                  isGloballyPaused 
                                    ? "Individual pause disabled while globally paused"
                                    : session.paused 
                                    ? "Resume session" 
                                    : "Pause session"
                                }
                              >
                                {isSessionPaused ? (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleEditSession(session)}
                                className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                                title="Edit session"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="inline-flex items-center justify-center w-7 h-7 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition-colors"
                                title="Delete session"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {expandedRows.has(session.id) && (
                          <tr className="bg-gray-50 dark:bg-gray-750">
                            <td colSpan={5} className="px-4 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Source Path</h4>
                                  <p className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all">
                                    {session.sourcePath || 'Not configured'}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Destination Path</h4>
                                  <p className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all">
                                    {session.destinationPath || 'Not configured'}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Triggers ({session.triggers?.length || 0})</h4>
                                  <div className="space-y-1">
                                    {session.triggers && session.triggers.length > 0 ? (
                                      session.triggers.map((trigger, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                          <span className={`inline-block w-2 h-2 rounded-full ${
                                            trigger.type === 'wifi' ? 'bg-blue-500' :
                                            trigger.type === 'fileChange' ? 'bg-green-500' :
                                            trigger.type === 'schedule' ? 'bg-purple-500' :
                                            trigger.type === 'startup' ? 'bg-orange-500' :
                                            'bg-gray-500'
                                          }`}></span>
                                          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                                            {trigger.type === 'wifi' ? `WiFi: ${trigger.ssid}` :
                                             trigger.type === 'fileChange' ? 'File Changes' :
                                             trigger.type === 'schedule' ? `Schedule: ${trigger.time} ${trigger.days?.includes('daily') ? 'daily' : trigger.days?.join(', ')}` :
                                             trigger.type === 'startup' ? 'On Startup' :
                                             trigger.type === 'interval' ? `Every ${trigger.intervalMinutes}min` :
                                             trigger.type}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">No triggers configured</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <FooterBar syncStats={syncStats} />

      {isDialogOpen && (
        <SessionDialog
          session={editingSession}
          onSave={handleSaveSession}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingSession(null);
          }}
        />
      )}
      
      
      {showHelp && (
        <RsyncInstructions
          onClose={() => setShowHelp(false)}
          rsyncVersion={rsyncStatus.version}
        />
      )}

      {showLogViewer && (
        <LogViewer
          isOpen={showLogViewer}
          onClose={() => {
            setShowLogViewer(false);
            setLogViewerSessionFilter('all');
          }}
          sessions={sessions.map(s => ({id: s.id, name: s.name}))}
          initialSessionFilter={logViewerSessionFilter}
        />
      )}
      
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;