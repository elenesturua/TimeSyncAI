import { useState } from 'react';
import { getPreferredHoursPresets } from '@/lib/time';

interface HoursChipsProps {
  value: { start: string; end: string };
  onChange: (hours: { start: string; end: string }) => void;
}

export default function HoursChips({ value, onChange }: HoursChipsProps) {
  const presets = getPreferredHoursPresets();
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetSelect = (preset: { start: string; end: string }) => {
    onChange(preset);
    setIsCustom(false);
  };

  const handleCustomChange = (field: 'start' | 'end', time: string) => {
    onChange({ ...value, [field]: time });
    setIsCustom(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePresetSelect(preset)}
            className={`px-3 py-2 rounded-lg font-medium transition-colors ${
              !isCustom && value.start === preset.start && value.end === preset.end
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setIsCustom(true)}
          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
            isCustom
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="flex items-center space-x-2">
          <input
            type="time"
            value={value.start}
            onChange={(e) => handleCustomChange('start', e.target.value)}
            className="input-field"
          />
          <span className="text-gray-500">to</span>
          <input
            type="time"
            value={value.end}
            onChange={(e) => handleCustomChange('end', e.target.value)}
            className="input-field"
          />
        </div>
      )}
    </div>
  );
}
