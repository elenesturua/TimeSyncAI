# 🧪 How to Test Email Sending

## Prerequisites

1. ✅ Backend is running (`npm run dev:full`)
2. ✅ You've added SMTP credentials to `backend/.env`
3. ✅ No warnings about missing environment variables in backend console

---

## Method 1: 🌐 Test via Browser (EASIEST)

**This is the easiest way to test!**

1. Make sure both frontend and backend are running:
   ```bash
   npm run dev:full
   ```

2. Open your browser and go to:
   ```
   http://localhost:5173/test-email
   ```

3. Enter your email address and click "Send Test Email"

4. Check your inbox! You should receive:
   - ✉️ An email with the subject "Invitation: Test Meeting from TimeSyncAI"
   - 📅 An `.ics` calendar attachment
   - 🎯 Ability to add it to your calendar (Outlook, Gmail, Apple Calendar, etc.)

**Expected Result:**
- Green success message: "✅ Email sent successfully!"
- Email arrives within 10-30 seconds

---

## Method 2: 🖥️ Test via Command Line (curl)

I've created a test script for you.

### Quick Test:

1. Edit the test script first:
   ```bash
   nano test-email.sh
   ```

2. Replace `REPLACE_WITH_RECIPIENT_EMAIL@example.com` with your actual email
3. Replace `REPLACE_WITH_YOUR_EMAIL@gmail.com` with your actual email

4. Run the test:
   ```bash
   ./test-email.sh
   ```

### Manual curl command:

```bash
curl -X POST http://localhost:3001/api/send-invite \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "organizerName": "Test Organizer",
    "organizerEmail": "your-email@gmail.com",
    "plan": "This is a test email",
    "meeting": {
      "title": "Test Meeting",
      "description": "Testing the email functionality",
      "location": "Virtual Meeting Room",
      "startISO": "2025-10-26T15:00:00Z",
      "endISO": "2025-10-26T16:00:00Z",
      "timezone": "America/New_York"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "<some-message-id>"
}
```

---

## Method 3: 🔍 Test via Browser Console

1. Open your app: `http://localhost:5173`
2. Open browser console (F12 or Cmd+Option+I on Mac)
3. Paste this code (replace email address):

```javascript
const response = await fetch('http://localhost:3001/api/send-invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'your-email@example.com',
    organizerName: 'Test',
    organizerEmail: 'your-email@gmail.com',
    meeting: {
      title: 'Console Test Meeting',
      startISO: new Date(Date.now() + 86400000).toISOString(),
      endISO: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      timezone: 'UTC'
    }
  })
});
const data = await response.json();
console.log(data);
```

---

## Method 4: 📝 Test with Multiple Options

Send multiple time slot options:

```bash
curl -X POST http://localhost:3001/api/send-invite \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "organizerName": "Your Name",
    "organizerEmail": "your-email@gmail.com",
    "plan": "Please choose the time that works best for you",
    "options": [
      {
        "title": "Team Sync - Option 1",
        "startISO": "2025-10-26T14:00:00Z",
        "endISO": "2025-10-26T15:00:00Z",
        "timezone": "America/New_York"
      },
      {
        "title": "Team Sync - Option 2",
        "startISO": "2025-10-26T18:00:00Z",
        "endISO": "2025-10-26T19:00:00Z",
        "timezone": "America/New_York"
      }
    ]
  }'
```

---

## ✅ What to Look For

### Successful Test:
- ✅ Response: `{"success": true, "messageId": "..."}`
- ✅ Email arrives in inbox (check spam folder if not there)
- ✅ Email has `.ics` attachment
- ✅ Can add event to calendar by clicking the attachment
- ✅ Event shows correct date, time, and timezone

### Failed Test - What to Check:

#### Error: "Missing environment variables"
- ❌ Check that `backend/.env` file exists
- ❌ Check that it has SMTP_HOST, SMTP_USER, SMTP_PASS
- ❌ Restart backend after adding env vars

#### Error: "Invalid login" or "Authentication failed"
- ❌ Wrong Gmail password - you need an **App Password**, not your regular password
- ❌ Get it here: https://myaccount.google.com/apppasswords
- ❌ Make sure 2FA is enabled on your Google Account first

#### Error: "Connection timeout"
- ❌ Check if port 587 is blocked by firewall
- ❌ Try changing to port 465 with `secure: true` in `backend/src/email.ts`

#### Error: "CORS"
- ❌ Backend not running on port 3001
- ❌ Check `FRONTEND_URL` in `backend/.env` is correct

#### Email not arriving:
- ⏳ Wait 30-60 seconds (Gmail can be slow)
- 📂 Check spam/junk folder
- 📧 Try sending to a different email address
- 🔍 Check backend terminal for error messages

---

## 🎯 Quick Health Check

Test if backend is responding:

```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "ok",
  "message": "TimeSyncAI Backend Server is running"
}
```

---

## 📊 Monitoring

### Backend Console
Watch your backend terminal for:
- ✅ "Email sent successfully"
- ❌ Error messages from Nodemailer
- ⚠️ SMTP connection issues

### Frontend Console
Check browser console (F12) for:
- ✅ Network requests to `http://localhost:3001/api/send-invite`
- ❌ CORS errors
- ❌ Connection refused errors

---

## 🐛 Common Issues

### "Cannot read properties of undefined"
- The backend isn't running
- Solution: Run `npm run dev:full`

### "Network Error"
- Backend URL is wrong
- Solution: Check `.env` has `VITE_BACKEND_URL=http://localhost:3001`

### "Validation error"
- Missing required fields in request
- Solution: Check that `to`, `meeting.title`, `meeting.startISO`, `meeting.endISO` are all present

### "SMTP connection refused"
- Wrong SMTP host or port
- Solution: For Gmail, use `smtp.gmail.com` port `587`

---

## 🎉 Success!

If you received the email with a calendar attachment, **congratulations!** Your email backend is working perfectly! 🚀

### Next Steps:
1. Remove the test route from production (optional)
2. Integrate email sending into your booking flow
3. See `EXAMPLE_USAGE.md` for integration patterns
4. Consider customizing the email template in `backend/src/email.ts`

---

## 💡 Pro Tips

1. **Test with yourself first** - Use your own email as both sender and recipient
2. **Check spam folder** - First emails from new senders often go to spam
3. **Use real dates** - Set meeting times in the future, not the past
4. **Timezone matters** - Use your actual timezone for better testing
5. **Watch the logs** - Keep an eye on both frontend and backend console

Need help? Check the troubleshooting section in `SETUP_GUIDE.md`!

