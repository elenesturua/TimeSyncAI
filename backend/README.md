# TimeSyncAI Backend

Backend server for sending email invitations with calendar attachments using Nodemailer.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

   Edit `.env` and add your SMTP credentials:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=TimeSyncAI <noreply@yourdomain.com>
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   ```

### Using Gmail SMTP

If using Gmail:
1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an **App Password**:
   - Go to Security > 2-Step Verification > App passwords
   - Select "Mail" and generate a password
   - Use this password in `SMTP_PASS`

### Using Other SMTP Services

For other providers:
- **SendGrid**: `smtp.sendgrid.net` (Port 587)
- **Mailgun**: `smtp.mailgun.org` (Port 587)
- **Outlook**: `smtp-mail.outlook.com` (Port 587)
- **AWS SES**: `email-smtp.region.amazonaws.com` (Port 587)

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### `POST /api/send-invite`

Send calendar invite email(s).

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "cc": ["cc1@example.com", "cc2@example.com"],
  "organizerName": "John Doe",
  "organizerEmail": "john@example.com",
  "plan": "Optional meeting description or plan",
  "meeting": {
    "title": "Team Sync",
    "description": "Weekly team meeting",
    "location": "Conference Room A",
    "startISO": "2025-10-26T15:00:00Z",
    "endISO": "2025-10-26T16:00:00Z",
    "timezone": "America/New_York"
  }
}
```

Or send multiple options:
```json
{
  "to": "recipient@example.com",
  "organizerName": "John Doe",
  "organizerEmail": "john@example.com",
  "options": [
    {
      "title": "Team Sync - Option 1",
      "startISO": "2025-10-26T15:00:00Z",
      "endISO": "2025-10-26T16:00:00Z",
      "timezone": "America/New_York"
    },
    {
      "title": "Team Sync - Option 2",
      "startISO": "2025-10-27T15:00:00Z",
      "endISO": "2025-10-27T16:00:00Z",
      "timezone": "America/New_York"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "<unique-message-id>"
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "TimeSyncAI Backend Server is running"
}
```

## Features

- ✅ Send calendar invites (.ics files) via email
- ✅ Support for single confirmed meetings
- ✅ Support for multiple time options
- ✅ ICS files compatible with Outlook, Gmail, Apple Calendar
- ✅ Proper timezone handling
- ✅ Meeting reminders (10 minutes before)
- ✅ CC recipients support
- ✅ Custom organizer information

## Tech Stack

- **Express.js** - Web framework
- **Nodemailer** - Email sending
- **ICS** - Calendar file generation
- **Luxon** - Timezone handling
- **Zod** - Request validation
- **TypeScript** - Type safety

