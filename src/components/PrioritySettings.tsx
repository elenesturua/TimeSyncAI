import { useState } from 'react';
import { Users, Star, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface Participant {
  email: string;
  name?: string;
  priority: number;
  conflicts: string[];
}

interface PrioritySettingsProps {
  participants: Participant[];
  onPriorityChange: (email: string, priority: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PrioritySettings({ 
  participants, 
  onPriorityChange, 
  onConfirm, 
  onCancel 
}: PrioritySettingsProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      // TODO: Call AI service with priority settings
      await new Promise(resolve => setTimeout(resolve, 2000));
      onConfirm();
    } catch (error) {
      console.error('Failed to process priorities:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Essential';
      case 2: return 'Important';
      case 3: return 'Optional';
      default: return 'Not Set';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-red-600 bg-red-50';
      case 2: return 'text-yellow-600 bg-yellow-50';
      case 3: return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Scheduling Conflict Detected</h2>
              <p className="text-gray-600">Set participant priorities to find the best time</p>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">How AI Priority Works</h3>
                <p className="text-sm text-blue-800">
                  Our AI will find the best meeting time based on your priority settings. 
                  Essential participants will be prioritized, while optional participants can be excluded if needed.
                </p>
              </div>
            </div>
          </div>

          {/* Participants Priority Settings */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Set Participant Priorities
            </h3>
            
            {participants.map((participant) => (
              <div key={participant.email} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium text-sm">
                        {participant.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{participant.email}</p>
                      {participant.conflicts.length > 0 && (
                        <p className="text-sm text-red-600">
                          {participant.conflicts.length} conflict{participant.conflicts.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(participant.priority)}`}>
                    {getPriorityLabel(participant.priority)}
                  </div>
                </div>

                {/* Priority Options */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onPriorityChange(participant.email, 1)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      participant.priority === 1 
                        ? 'bg-red-100 text-red-700 border-2 border-red-300' 
                        : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <Star className="h-4 w-4 mx-auto mb-1" />
                    Essential
                  </button>
                  
                  <button
                    onClick={() => onPriorityChange(participant.email, 2)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      participant.priority === 2 
                        ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' 
                        : 'bg-gray-50 text-gray-600 hover:bg-yellow-50 hover:text-yellow-600'
                    }`}
                  >
                    <Users className="h-4 w-4 mx-auto mb-1" />
                    Important
                  </button>
                  
                  <button
                    onClick={() => onPriorityChange(participant.email, 3)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      participant.priority === 3 
                        ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                        : 'bg-gray-50 text-gray-600 hover:bg-green-50 hover:text-green-600'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mx-auto mb-1" />
                    Optional
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Priority Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-red-600 font-medium">
                  {participants.filter(p => p.priority === 1).length}
                </div>
                <div className="text-gray-600">Essential</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-600 font-medium">
                  {participants.filter(p => p.priority === 2).length}
                </div>
                <div className="text-gray-600">Important</div>
              </div>
              <div className="text-center">
                <div className="text-green-600 font-medium">
                  {participants.filter(p => p.priority === 3).length}
                </div>
                <div className="text-gray-600">Optional</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing || participants.some(p => p.priority === 0)}
              className="btn-primary flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Finding Best Time...</span>
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  <span>Find Best Time</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
