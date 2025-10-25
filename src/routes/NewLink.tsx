import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Copy, Share2 } from 'lucide-react';
import DurationPills from '@/components/DurationPills';
import HoursChips from '@/components/HoursChips';
import CopyButton from '@/components/CopyButton';
import { linkApi, type CreateLinkRequest } from '@/lib/api';
import Loader from '@/components/Loader';

export default function NewLink() {
  const navigate = useNavigate();
  const [duration, setDuration] = useState(45);
  const [dateRange, setDateRange] = useState(7);
  const [preferredHours, setPreferredHours] = useState({ start: '09:00', end: '17:00' });
  const [isCreating, setIsCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<{ linkId: string; inviteUrl: string } | null>(null);

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      const request: CreateLinkRequest = {
        duration,
        dateRange,
        preferredHours
      };
      
      const response = await linkApi.create(request);
      setCreatedLink(response);
    } catch (error) {
      console.error('Failed to create link:', error);
      // TODO: Show error toast
    } finally {
      setIsCreating(false);
    }
  };

  if (createdLink) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Share2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Created!</h1>
          <p className="text-gray-600 mb-6">
            Share this link with your participants to start scheduling.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Invite URL:</p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 text-sm bg-white p-2 rounded border text-gray-800">
                {createdLink.inviteUrl}
              </code>
              <CopyButton text={createdLink.inviteUrl} />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/l/${createdLink.linkId}`)}
              className="btn-primary flex-1"
            >
              Open Link Room
            </button>
            <button
              onClick={() => {
                setCreatedLink(null);
                setDuration(45);
                setDateRange(7);
                setPreferredHours({ start: '09:00', end: '17:00' });
              }}
              className="btn-secondary flex-1"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create One-off Meeting Link</h1>
        <p className="text-gray-600">
          Set up a quick meeting link where participants can connect their calendars and find the best time.
        </p>
      </div>

      <div className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Clock className="h-4 w-4 inline mr-2" />
            Meeting Duration
          </label>
          <DurationPills value={duration} onChange={setDuration} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Calendar className="h-4 w-4 inline mr-2" />
            Date Range
          </label>
          <div className="flex space-x-2">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  dateRange === days
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Users className="h-4 w-4 inline mr-2" />
            Preferred Hours
          </label>
          <HoursChips value={preferredHours} onChange={setPreferredHours} />
        </div>

        <button
          onClick={handleCreateLink}
          disabled={isCreating}
          className="btn-primary w-full flex items-center justify-center space-x-2"
        >
          {isCreating ? (
            <>
              <Loader size="sm" />
              <span>Creating Link...</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              <span>Create Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
