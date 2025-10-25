import { useState } from 'react';
import { emailApi } from '../lib/api';

export default function TestEmail() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTest = async () => {
    if (!recipientEmail) {
      alert('Please enter a recipient email address');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await emailApi.sendInvite({
        to: recipientEmail,
        organizerName: 'Test Organizer',
        organizerEmail: recipientEmail, // Using same email as organizer for testing
        plan: 'This is a test email from TimeSyncAI backend',
        meeting: {
          title: 'Test Meeting from TimeSyncAI',
          description: 'Testing the email functionality',
          location: 'Virtual Meeting Room',
          startISO: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          endISO: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });

      if (response.success) {
        setResult({
          success: true,
          message: `✅ Email sent successfully! Message ID: ${response.messageId}`
        });
      } else {
        setResult({
          success: false,
          message: `❌ Failed to send email: ${response.error}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>📧 Test Email Sending</h1>
      <p style={{ color: '#666' }}>
        Test your email backend by sending a calendar invite to yourself.
      </p>

      <div style={{ marginTop: '30px' }}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Recipient Email Address:
        </label>
        <input
          id="email"
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="your-email@example.com"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '16px'
          }}
        />

        <button
          onClick={handleSendTest}
          disabled={loading || !recipientEmail}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: loading ? '#999' : '#007bff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%'
          }}
        >
          {loading ? '📤 Sending...' : '📧 Send Test Email'}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: '4px',
            backgroundColor: result.success ? '#d4edda' : '#f8d7da',
            color: result.success ? '#155724' : '#721c24',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
            {result.message}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>📝 Instructions:</h3>
        <ol style={{ paddingLeft: '20px' }}>
          <li>Make sure your backend is running (<code>npm run dev:full</code>)</li>
          <li>Enter your email address above</li>
          <li>Click "Send Test Email"</li>
          <li>Check your inbox for the calendar invite</li>
          <li>The invite should have an .ics attachment you can add to your calendar</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <strong>⚠️ Troubleshooting:</strong>
        <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
          <li>Check that <code>backend/.env</code> has your SMTP credentials</li>
          <li>Verify backend is running on port 3001</li>
          <li>Check browser console for errors (F12)</li>
          <li>Check backend terminal for error messages</li>
          <li>Gmail may take a few seconds to deliver the email</li>
        </ul>
      </div>
    </div>
  );
}

