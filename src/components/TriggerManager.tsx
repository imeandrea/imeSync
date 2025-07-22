import React, { useState } from 'react';
import { Trigger, TriggerType, WiFiTrigger, ScheduleTrigger, FileChangeTrigger, IntervalTrigger } from '../types/SessionConfig';

interface TriggerManagerProps {
  triggers: Trigger[];
  onChange: (triggers: Trigger[]) => void;
}

const TriggerManager: React.FC<TriggerManagerProps> = ({ triggers, onChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTriggerType, setSelectedTriggerType] = useState<TriggerType>('wifi');
  const [formData, setFormData] = useState<Partial<Trigger>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const triggerOptions = [
    { value: 'wifi' as TriggerType, label: 'WiFi Network Connection' },
    { value: 'fileChange' as TriggerType, label: 'File/Folder Changes' },
    { value: 'schedule' as TriggerType, label: 'Scheduled Time' },
    { value: 'startup' as TriggerType, label: 'Application Startup' },
    { value: 'interval' as TriggerType, label: 'Time Interval' }
  ];

  const addTrigger = (trigger: Trigger) => {
    if (editingIndex !== null) {
      // Update existing trigger
      const newTriggers = [...triggers];
      newTriggers[editingIndex] = trigger;
      onChange(newTriggers);
      setEditingIndex(null);
    } else {
      // Add new trigger
      onChange([...triggers, trigger]);
    }
    setShowAddForm(false);
    setFormData({});
  };

  const removeTrigger = (index: number) => {
    const newTriggers = [...triggers];
    newTriggers.splice(index, 1);
    onChange(newTriggers);
  };

  const updateTrigger = (index: number, trigger: Trigger) => {
    const newTriggers = [...triggers];
    newTriggers[index] = trigger;
    onChange(newTriggers);
  };

  const startEdit = (index: number) => {
    const trigger = triggers[index];
    setEditingIndex(index);
    setSelectedTriggerType(trigger.type);
    setFormData(trigger);
    setShowAddForm(true);
  };

  const getTriggerSummary = (trigger: Trigger): string => {
    switch (trigger.type) {
      case 'wifi':
        return `WiFi: ${trigger.ssid || 'Not set'} (${trigger.onConnect ? 'on connect' : 'on disconnect'})`;
      case 'fileChange':
        return `File Changes: ${trigger.watchPaths?.length || 0} paths, ${(trigger.debounceMs || 5000)/1000}s delay`;
      case 'schedule':
        const daysText = trigger.days?.includes('daily') ? 'daily' : 
                        trigger.days?.length === 7 ? 'daily' :
                        trigger.days?.length === 5 && !trigger.days.includes('saturday') && !trigger.days.includes('sunday') ? 'weekdays' :
                        trigger.days?.join(', ') || 'not set';
        return `Schedule: ${trigger.time || 'not set'} ${daysText}`;
      case 'startup':
        return `Startup: ${(trigger.delayMs || 30000)/1000}s delay`;
      case 'interval':
        const timeWindow = trigger.startTime && trigger.endTime 
          ? ` (${trigger.startTime}-${trigger.endTime})`
          : '';
        return `Interval: Every ${trigger.intervalMinutes || 60} minutes${timeWindow}`;
      default:
        return 'Unknown trigger';
    }
  };

  const createDefaultTrigger = (type: TriggerType): Trigger => {
    switch (type) {
      case 'wifi':
        return { type: 'wifi', ssid: '', onConnect: true };
      case 'fileChange':
        return { type: 'fileChange', watchPaths: [], debounceMs: 5000, recursive: true, ignorePatterns: ['*.tmp', '.DS_Store'] };
      case 'schedule':
        return { type: 'schedule', time: '09:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] };
      case 'startup':
        return { type: 'startup', delayMs: 30000 };
      case 'interval':
        return { type: 'interval', intervalMinutes: 60 };
      default:
        return { type: 'wifi', ssid: '', onConnect: true };
    }
  };


  const initFormData = (type: TriggerType) => {
    const defaultTrigger = createDefaultTrigger(type);
    setFormData(defaultTrigger);
  };

  const renderTriggerConfig = () => {
    switch (selectedTriggerType) {
      case 'wifi':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                WiFi Network Name (SSID)
              </label>
              <input
                type="text"
                value={(formData as WiFiTrigger).ssid || ''}
                onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="MyHomeNetwork"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={(formData as WiFiTrigger).onConnect || true}
                  onChange={(e) => setFormData({ ...formData, onConnect: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Trigger when connecting (uncheck for disconnect)
                </span>
              </label>
            </div>
          </div>
        );

      case 'fileChange':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Paths to Watch
              </label>
              <textarea
                value={(formData as FileChangeTrigger).watchPaths?.join('\n') || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  watchPaths: e.target.value.split('\n').filter(p => p.trim()) 
                })}
                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={3}
                placeholder="/path/to/watch&#10;/another/path"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delay (seconds)
                </label>
                <input
                  type="number"
                  value={(formData as FileChangeTrigger).debounceMs ? (formData as FileChangeTrigger).debounceMs / 1000 : 5}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    debounceMs: Math.max(1, parseInt(e.target.value) || 5) * 1000
                  })}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(formData as FileChangeTrigger).recursive || true}
                    onChange={(e) => setFormData({ ...formData, recursive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Include subdirectories
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'schedule':
        const scheduleData = formData as ScheduleTrigger;
        const dayOptions = [
          { value: 'daily', label: 'Daily' },
          { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
          { value: 'weekends', label: 'Weekends (Sat-Sun)' },
          { value: 'custom', label: 'Custom days' }
        ];
        
        const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        const getSelectedDaysOption = () => {
          const days = scheduleData.days || [];
          if (days.includes('daily') || days.length === 7) return 'daily';
          if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) return 'weekdays';
          if (days.length === 2 && days.includes('saturday') && days.includes('sunday')) return 'weekends';
          return 'custom';
        };
        
        const handleDaysOptionChange = (option: string) => {
          let newDays: string[] = [];
          switch (option) {
            case 'daily':
              newDays = ['daily'];
              break;
            case 'weekdays':
              newDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
              break;
            case 'weekends':
              newDays = ['saturday', 'sunday'];
              break;
            case 'custom':
              newDays = ['monday'];
              break;
          }
          setFormData({ ...formData, days: newDays });
        };

        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time
              </label>
              <input
                type="time"
                value={scheduleData.time || '09:00'}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Days
              </label>
              <select
                value={getSelectedDaysOption()}
                onChange={(e) => handleDaysOptionChange(e.target.value)}
                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-3"
              >
                {dayOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {getSelectedDaysOption() === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  {weekDays.map(day => (
                    <label key={day} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={(scheduleData.days || []).includes(day)}
                        onChange={(e) => {
                          const currentDays = scheduleData.days || [];
                          const newDays = e.target.checked
                            ? [...currentDays, day]
                            : currentDays.filter(d => d !== day);
                          setFormData({ ...formData, days: newDays });
                        }}
                        className="rounded border-gray-300 text-blue-600 mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {day}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'interval':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sync every (minutes)
              </label>
              <input
                type="number"
                value={(formData as IntervalTrigger).intervalMinutes || 60}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  intervalMinutes: Math.max(1, parseInt(e.target.value) || 60)
                })}
                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                min="1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum interval is 1 minute
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Active Time Window (Optional)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Only sync during specific hours of the day. Leave blank for 24/7 operation.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={(formData as IntervalTrigger).startTime || ''}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value || undefined })}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={(formData as IntervalTrigger).endTime || ''}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value || undefined })}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {triggerOptions.find(t => t.value === selectedTriggerType)?.label} configuration coming soon
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Triggers List */}
      {triggers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Triggers</h4>
          {triggers.map((trigger, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {getTriggerSummary(trigger)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => startEdit(index)}
                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Edit trigger"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeTrigger(index)}
                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="Remove trigger"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Trigger Section */}
      <div className="border-t pt-4">
        <div className="flex items-center space-x-3">
          <select
            value={selectedTriggerType}
            onChange={(e) => setSelectedTriggerType(e.target.value as TriggerType)}
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {triggerOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              initFormData(selectedTriggerType);
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Configuration Form */}
      {showAddForm && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Configure {triggerOptions.find(t => t.value === selectedTriggerType)?.label}
            </h4>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingIndex(null);
                setFormData({});
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {renderTriggerConfig()}
          <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingIndex(null);
                setFormData({});
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (formData.type) {
                  addTrigger(formData as Trigger);
                }
              }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editingIndex !== null ? 'Update' : 'Add'} Trigger
            </button>
          </div>
        </div>
      )}

      {triggers.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No automatic triggers configured</p>
          <p className="text-xs mt-1">Select a trigger type above and click Add to get started</p>
        </div>
      )}
    </div>
  );
};

export default TriggerManager;