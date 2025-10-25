#!/bin/bash

# Test Email Script for TimeSyncAI Backend
# Replace the email addresses below with your actual test email

echo "🧪 Testing TimeSyncAI Email Backend..."
echo ""

curl -X POST http://localhost:3001/api/send-invite \
  -H "Content-Type: application/json" \
  -d '{
    "to": "mukhopad2@grinnell.edu",
    "organizerName": "Test Organizer",
    "organizerEmail": "TimeSyncAI@gmail.com",
    "plan": "This is a test email from TimeSyncAI backend",
    "meeting": {
      "title": "Test Meeting",
      "description": "Testing the email functionality",
      "location": "Virtual Meeting Room",
      "startISO": "2025-10-26T15:00:00Z",
      "endISO": "2025-10-26T16:00:00Z",
      "timezone": "America/New_York"
    }
  }'

echo ""
echo ""
echo "✅ Request sent! Check the response above."

