# TimeSyncAI - Full Setup Guide

This guide will help you set up both the frontend and backend of TimeSyncAI.

## Architecture

```
TimeSyncAI/
├── frontend (Vite + React + TypeScript)
│   └── Runs on http://localhost:5173
└── backend (Express + Nodemailer)
    └── Runs on http://localhost:3001
```

## Quick Start

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
npm run install:backend
```

Or install concurrently first and then install backend:
```bash
npm install
cd backend && npm install && cd ..
```

### 2. Configure Backend Environment

Create a `.env` file in the `backend` directory:
```bash
cd backend
cp env.example .env
```

Edit `backend/.env` with your SMTP credentials:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=TimeSyncAI <your-email@gmail.com>
PORT=3001
FRONTEND_URL=http://localhost:5173
```

#### Getting Gmail App Password

1. Enable 2-Factor Authentication on your Google Account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use this 16-character password in `SMTP_PASS`

### 3. Configure Frontend Environment (Optional)

Create `.env` in the root directory if needed:
```env
VITE_BACKEND_URL=http://localhost:3001
```

The frontend will default to `http://localhost:3001` if not specified.

### 4. Run the Application

**Run both frontend and backend together:**
```bash
npm run dev:full
```

**Or run them separately:**

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
npm run dev:backend
```

## Using the Email API

In your React components, you can now send emails:

```typescript
import { emailApi } from './lib/api';

// Send a single meeting invite
const result = await emailApi.sendInvite({
  to: 'recipient@example.com',
  organizerName: 'Your Name',
  organizerEmail: 'you@example.com',
  meeting: {
    title: 'Team Meeting',
    description: 'Discuss project updates',
    location: 'Conference Room A',
    startISO: '2025-10-26T15:00:00Z',
    endISO: '2025-10-26T16:00:00Z',
    timezone: 'America/New_York'
  }
});

if (result.success) {
  console.log('Email sent!', result.messageId);
} else {
  console.error('Failed to send:', result.error);
}
```

## Available Scripts

### Root Directory

- `npm run dev` - Run frontend only
- `npm run dev:backend` - Run backend only
- `npm run dev:full` - Run both frontend and backend
- `npm run build` - Build frontend
- `npm run build:backend` - Build backend
- `npm run install:backend` - Install backend dependencies

### Backend Directory

- `npm run dev` - Run in development mode with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled production build

## Testing the Backend

Test the email endpoint directly:

```bash
curl -X POST http://localhost:3001/api/send-invite \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "organizerName": "Test Organizer",
    "organizerEmail": "organizer@example.com",
    "meeting": {
      "title": "Test Meeting",
      "startISO": "2025-10-26T15:00:00Z",
      "endISO": "2025-10-26T16:00:00Z",
      "timezone": "UTC"
    }
  }'
```

## Troubleshooting

### SMTP Connection Errors

1. **Gmail "Less secure app access"**: Use App Passwords (requires 2FA)
2. **Port blocked**: Try port 465 with `secure: true` instead of 587
3. **Firewall**: Ensure outbound SMTP traffic is allowed

### CORS Errors

Make sure `FRONTEND_URL` in backend `.env` matches your frontend URL (default: `http://localhost:5173`)

### Missing Environment Variables

On backend startup, check the console. It will warn about missing env vars:
```
⚠️  Warning: Missing environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS
```

## Production Deployment

### Backend
1. Build the backend: `cd backend && npm run build`
2. Set production environment variables
3. Run: `npm start`
4. Consider using PM2 or similar for process management

### Frontend
1. Update `VITE_BACKEND_URL` to your production backend URL
2. Build: `npm run build`
3. Deploy the `dist` folder to your hosting service

## Alternative SMTP Providers

Instead of Gmail, you can use:

- **SendGrid**: Free tier with 100 emails/day
- **Mailgun**: Free tier with good deliverability
- **AWS SES**: Pay-as-you-go pricing
- **Resend**: Developer-friendly with good docs

Update `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` accordingly.

## Security Notes

- ✅ Never commit `.env` files (already in `.gitignore`)
- ✅ Backend validates all inputs with Zod
- ✅ CORS configured to only accept frontend requests
- ✅ SMTP credentials stay on the server
- ⚠️ In production, use HTTPS for both frontend and backend

