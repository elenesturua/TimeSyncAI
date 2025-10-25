import { useState } from 'react';

interface DurationPillsProps {
  value: number;
  onChange: (duration: number) => void;
}

export default function DurationPills({ value, onChange }: DurationPillsProps) {
  const durations = [30, 45, 60];

  return (
    <div className="flex space-x-2">
      {durations.map((duration) => (
        <button
          key={duration}
          onClick={() => onChange(duration)}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            value === duration
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {duration}m
        </button>
      ))}
    </div>
  );
}
