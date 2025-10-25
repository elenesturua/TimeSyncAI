import { CheckCircle, Clock } from 'lucide-react';
import type { Participant } from '@/lib/api';

interface ParticipantCardProps {
  participant: Participant;
}

export default function ParticipantCard({ participant }: ParticipantCardProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-600 font-medium">
            {participant.displayName?.charAt(0) || participant.email.charAt(0)}
          </span>
        </div>
        <div>
          <p className="font-medium text-gray-900">{participant.displayName || participant.email}</p>
          <p className="text-sm text-gray-500">{participant.email}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {participant.connected ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-600 font-medium">Connected</span>
          </>
        ) : (
          <>
            <Clock className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">Waiting</span>
          </>
        )}
      </div>
    </div>
  );
}
