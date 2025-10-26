import { Shield } from 'lucide-react';

export default function PrivacyBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
        <div>
          <h3 className="font-medium text-blue-900 mb-1">Privacy Notice</h3>
          <p className="text-sm text-blue-700">
            We read free/busy only and create the final event. Never titles or locations.
          </p>
        </div>
      </div>
    </div>
  );
}
