import { useState } from 'react';
import { X, Calendar, Users } from 'lucide-react';
import { formatTimeSlot, parseISOTimeSlot } from '@/lib/time';
import type { Suggestion, BookingRequest } from '@/lib/api';

interface BookingModalProps {
  suggestion: Suggestion;
  attendees: string[];
  onClose: () => void;
  onConfirm: (booking: BookingRequest) => void;
}

export default function BookingModal({ suggestion, attendees, onClose, onConfirm }: BookingModalProps) {
  const [title, setTitle] = useState('');
  const timeSlot = parseISOTimeSlot(suggestion.startISO, suggestion.endISO);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const booking: BookingRequest = {
      title: title.trim(),
      startISO: suggestion.startISO,
      endISO: suggestion.endISO,
      attendees,
      timezone: timeSlot.timezone
    };

    onConfirm(booking);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create Event</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter meeting title..."
              className="input-field"
              required
            />
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatTimeSlot(timeSlot)}</span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{attendees.length} attendees</span>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={!title.trim()}
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
