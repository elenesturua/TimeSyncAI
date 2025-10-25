import { useState } from 'react';
import { Calendar, Users, Clock, Info } from 'lucide-react';
import { formatTimeSlot, parseISOTimeSlot, formatBadge } from '@/lib/time';
import type { Suggestion } from '@/lib/api';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onBook: (suggestion: Suggestion) => void;
}

export default function SuggestionCard({ suggestion, onBook }: SuggestionCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeSlot = parseISOTimeSlot(suggestion.startISO, suggestion.endISO);

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary-500" />
          <div>
            <h3 className="font-semibold text-gray-900">
              {formatTimeSlot(timeSlot)}
            </h3>
            <p className="text-sm text-gray-500">{timeSlot.timezone}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Info className="h-4 w-4" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10">
              {suggestion.reason}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {suggestion.badges.map((badge, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full"
          >
            {formatBadge(badge)}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-gray-400" />
          <div className="flex -space-x-1">
            {suggestion.attendeesFree.map((email, index) => (
              <div
                key={index}
                className="h-6 w-6 bg-green-100 border-2 border-white rounded-full flex items-center justify-center"
                title={email}
              >
                <span className="text-xs font-medium text-green-600">
                  {email.charAt(0)}
                </span>
              </div>
            ))}
            {suggestion.attendeesMissing.map((email, index) => (
              <div
                key={index}
                className="h-6 w-6 bg-gray-200 border-2 border-white rounded-full flex items-center justify-center"
                title={email}
              >
                <span className="text-xs font-medium text-gray-500">
                  {email.charAt(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => onBook(suggestion)}
          className="btn-primary"
        >
          Book
        </button>
      </div>
    </div>
  );
}
