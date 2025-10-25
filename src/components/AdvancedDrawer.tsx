import { useState } from 'react';
import { Settings, X } from 'lucide-react';

interface AdvancedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Array<{ email: string; displayName: string }>;
  onSettingsChange: (settings: any) => void;
}

export default function AdvancedDrawer({ isOpen, onClose, participants, onSettingsChange }: AdvancedDrawerProps) {
  const [settings, setSettings] = useState({
    allowAbsences: 0,
    fairness: true,
    earlyPenalty: 0,
    latePenalty: 0
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="bg-white rounded-t-xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Advanced Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allow Absences
            </label>
            <select
              value={settings.allowAbsences}
              onChange={(e) => setSettings({ ...settings, allowAbsences: parseInt(e.target.value) })}
              className="input-field"
            >
              <option value={0}>None</option>
              <option value={1}>1 person</option>
              <option value={2}>2 people</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Fairness Priority
            </label>
            <input
              type="checkbox"
              checked={settings.fairness}
              onChange={(e) => setSettings({ ...settings, fairness: e.target.checked })}
              className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Early Meeting Penalty: {settings.earlyPenalty}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.earlyPenalty}
              onChange={(e) => setSettings({ ...settings, earlyPenalty: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Late Meeting Penalty: {settings.latePenalty}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.latePenalty}
              onChange={(e) => setSettings({ ...settings, latePenalty: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                onSettingsChange(settings);
                onClose();
              }}
              className="btn-primary w-full"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
