# 📧 Email Backend Setup - Complete Summary

## ✅ What Was Created

Your TimeSyncAI project now has a fully functional backend server for sending email invitations with calendar attachments!

### New Files Created

```
TimeSyncAI/
├── backend/                          # New backend directory
│   ├── package.json                  # Backend dependencies
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── .gitignore                    # Git ignore for backend
│   ├── env.example                   # Environment variables template
│   ├── README.md                     # Backend documentation
│   └── src/
│       ├── server.ts                 # Express server setup
│       └── email.ts                  # Email sending logic (converted from Next.js)
├── SETUP_GUIDE.md                    # Complete setup instructions
├── EXAMPLE_USAGE.md                  # Code examples for using the API
└── EMAIL_BACKEND_SUMMARY.md         # This file

Modified Files:
├── package.json                      # Added scripts for running backend
└── src/lib/api.ts                   # Added emailApi functions
```

## 🚀 Quick Start (3 Steps)

### Step 1: Set Up Environment Variables

```bash
cd backend
cp env.example .env
```

Edit `backend/.env` with your Gmail credentials:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
FROM_EMAIL=TimeSyncAI <your-email@gmail.com>
```

**Get Gmail App Password:**
1. Enable 2FA on your Google Account
2. Go to https://myaccount.google.com/apppasswords
3. Generate password for "Mail"
4. Copy the 16-character password to `SMTP_PASS`

### Step 2: Run Both Frontend and Backend

```bash
npm run dev:full
```

Or run separately:
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:backend
```

### Step 3: Use the Email API in Your Code

```typescript
import { emailApi } from './lib/api';

const response = await emailApi.sendInvite({
  to: 'recipient@example.com',
  organizerName: 'Your Name',
  organizerEmail: 'you@example.com',
  meeting: {
    title: 'Team Meeting',
    startISO: '2025-10-26T15:00:00Z',
    endISO: '2025-10-26T16:00:00Z',
    timezone: 'America/New_York'
  }
});

if (response.success) {
  console.log('Email sent!', response.messageId);
}
```

## 📦 Technologies Used

- **Express.js** - Fast, minimalist web framework
- **Nodemailer** - Email sending library
- **ICS** - Calendar file generation
- **Luxon** - Timezone and date handling
- **Zod** - Runtime type validation
- **TypeScript** - Type safety
- **CORS** - Cross-origin resource sharing

## 🎯 Key Features

✅ **Single Meeting Invites** - Send one confirmed meeting time  
✅ **Multiple Options** - Send several time slots for recipient to choose  
✅ **Calendar Integration** - .ics files work with Outlook, Gmail, Apple Calendar  
✅ **Timezone Support** - Proper IANA timezone handling  
✅ **CC Recipients** - Include multiple people in the invitation  
✅ **Meeting Reminders** - Automatic 10-minute reminders  
✅ **Custom Organizer** - Set custom name and email for the organizer  
✅ **Type Safety** - Full TypeScript support with exported types  

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev:full` | Run both frontend and backend together |
| `npm run dev` | Run frontend only (port 5173) |
| `npm run dev:backend` | Run backend only (port 3001) |
| `npm run build` | Build frontend for production |
| `npm run build:backend` | Build backend for production |
| `npm run install:backend` | Install backend dependencies |

## 🧪 Testing the Backend

### Test with curl:
```bash
curl -X POST http://localhost:3001/api/send-invite \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "organizerName": "Test",
    "organizerEmail": "test@example.com",
    "meeting": {
      "title": "Test Meeting",
      "startISO": "2025-10-26T15:00:00Z",
      "endISO": "2025-10-26T16:00:00Z",
      "timezone": "UTC"
    }
  }'
```

### Check health:
```bash
curl http://localhost:3001/health
```

## 📚 Documentation

- **SETUP_GUIDE.md** - Detailed setup instructions
- **EXAMPLE_USAGE.md** - Code examples for frontend integration
- **backend/README.md** - Backend API documentation

## 🔒 Security

✅ SMTP credentials stored in `.env` (gitignored)  
✅ CORS configured to accept only frontend requests  
✅ Request validation with Zod schemas  
✅ Environment variables never exposed to frontend  
✅ Backend runs separately from frontend  

## 🐛 Troubleshooting

### "SMTP Connection Failed"
- Check your Gmail App Password (not regular password)
- Ensure 2FA is enabled on Google Account
- Verify `SMTP_HOST` and `SMTP_PORT` are correct

### "CORS Error"
- Make sure backend is running on port 3001
- Check `FRONTEND_URL` in backend `.env` matches your frontend URL
- Verify `VITE_BACKEND_URL` points to `http://localhost:3001`

### "Missing Environment Variables"
- Check backend console on startup for warnings
- Ensure `.env` file exists in `backend/` directory
- Verify all required variables are set (SMTP_HOST, SMTP_USER, SMTP_PASS)

### Port Already in Use
Change the port in `backend/.env`:
```env
PORT=3002
```

And update frontend `.env`:
```env
VITE_BACKEND_URL=http://localhost:3002
```

## 🌐 Alternative Email Providers

Instead of Gmail, you can use:

| Provider | Host | Port | Notes |
|----------|------|------|-------|
| Gmail | smtp.gmail.com | 587 | Requires App Password |
| SendGrid | smtp.sendgrid.net | 587 | 100 emails/day free |
| Mailgun | smtp.mailgun.org | 587 | Good deliverability |
| Outlook | smtp-mail.outlook.com | 587 | Microsoft accounts |
| AWS SES | email-smtp.region.amazonaws.com | 587 | Pay-as-you-go |

## 🎉 What's Different from Before?

**Before:**
- ❌ `email.ts` was written for Next.js (wouldn't work)
- ❌ Used Next.js-specific imports (`NextRequest`, `NextResponse`)
- ❌ Expected server-side API route structure
- ❌ No backend server to run the code

**After:**
- ✅ Converted to Express.js (works with your Vite setup)
- ✅ Proper Express request/response handling
- ✅ Standalone backend server
- ✅ Frontend API utility to call backend
- ✅ CORS configured for communication
- ✅ Complete documentation and examples

## 💡 Next Steps

1. **Configure your SMTP credentials** in `backend/.env`
2. **Test the backend** with curl or Postman
3. **Integrate into your app** - See `EXAMPLE_USAGE.md` for patterns
4. **Update your booking flow** to send emails after confirming meetings
5. **Customize email templates** in `backend/src/email.ts` if needed

## 📞 Need Help?

- Check `SETUP_GUIDE.md` for detailed setup instructions
- See `EXAMPLE_USAGE.md` for code examples
- Read `backend/README.md` for API documentation

---

**Your email backend is ready to use! 🚀**

Run `npm run dev:full` and start sending calendar invites!

