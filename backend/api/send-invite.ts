import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createEvent } from 'ics';
import { DateTime } from 'luxon';
import { z } from 'zod';

const SingleMeeting = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  location: z.string().default(''),
  startISO: z.string().datetime(),
  endISO: z.string().datetime(),
  timezone: z.string().default('UTC'),
});

const Payload = z.object({
  to: z.string().email(),
  cc: z.array(z.string().email()).optional(),
  plan: z.string().default(''),
  organizerName: z.string().default('TimeSyncAI'),
  organizerEmail: z.string().email().optional(),
  meeting: SingleMeeting.optional(),
  options: z.array(SingleMeeting).optional(),
});

function toParts(iso: string, tz: string) {
  const dt = DateTime.fromISO(iso, { zone: tz });
  return [dt.year, dt.month, dt.day, dt.hour, dt.minute] as [number, number, number, number, number];
}

function buildIcs(
  meeting: z.infer<typeof SingleMeeting>,
  extras: {
    organizerName: string;
    organizerEmail: string;
    toEmail: string;
    plan: string;
  }
) {
  const { title, description, location, startISO, endISO, timezone } = meeting;
  const uid = crypto.randomUUID();

  const { error, value } = createEvent({
    title,
    description: `${description}${extras.plan ? `\n\nPlan:\n${extras.plan}` : ''}`,
    location,
    uid,
    method: 'REQUEST',
    status: 'CONFIRMED',
    organizer: { name: extras.organizerName, email: extras.organizerEmail },
    attendees: [{ name: extras.toEmail.split('@')[0], email: extras.toEmail }],
    startInputType: 'local',
    endInputType: 'local',
    startOutputType: 'local',
    endOutputType: 'local',
    start: toParts(startISO, timezone),
    end: toParts(endISO, timezone),
    productId: 'TimeSyncAI',
    alarms: [{ action: 'display', description: 'Meeting reminder', trigger: { minutes: 10, before: true } }],
  });

  if (error) throw error;
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const parsed = Payload.parse(req.body);

    const from = process.env.FROM_EMAIL ?? 'TimeSyncAI <noreply@yourdomain.com>';
    const organizerEmail =
      parsed.organizerEmail ??
      (process.env.FROM_EMAIL?.match(/<(.*)>/)?.[1] ?? 'noreply@yourdomain.com');

    if (!organizerEmail) {
      return res.status(500).json({
        success: false,
        error: 'Organizer email is required',
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    });

    const header = parsed.meeting ? `You're invited: ${parsed.meeting.title}` : `You're invited (choose a time)`;

    const infoLines: string[] = [];
    if (parsed.meeting) {
      const m = parsed.meeting;
      infoLines.push(
        `When: ${DateTime.fromISO(m.startISO).toFormat('fff')} – ${DateTime.fromISO(m.endISO).toFormat('fff')} (${m.timezone})`,
        m.location ? `Where: ${m.location}` : ''
      );
    } else if (parsed.options?.length) {
      infoLines.push('This email includes calendar invites for each option. Accept the one that works best:');
      parsed.options.forEach((opt, i) => {
        infoLines.push(
          `• Option ${i + 1}: ${DateTime.fromISO(opt.startISO).toFormat('fff')} – ${DateTime.fromISO(opt.endISO).toFormat('fff')} (${opt.timezone})${opt.location ? ` @ ${opt.location}` : ''}`
        );
      });
    }

    const text = [header, ...infoLines.filter(Boolean), '', parsed.plan ? `Plan:\n${parsed.plan}` : '', 'Please Accept/Decline in your calendar app.'].join('\n');

    const html = `
      <p>${header}</p>
      ${infoLines.filter(Boolean).map((line) => `<p>${line}</p>`).join('')}
      ${parsed.plan ? `<p><b>Plan:</b><br/>${parsed.plan.replace(/\n/g, '<br/>')}</p>` : ''}
      <p>Please <b>Accept</b> or <b>Decline</b> in your calendar app.</p>
    `;

    const attachments: Array<{ filename: string; content: string; contentType: string }> = [];

    if (parsed.meeting) {
      const ics = buildIcs(parsed.meeting, {
        organizerName: parsed.organizerName,
        organizerEmail,
        toEmail: parsed.to,
        plan: parsed.plan,
      });
      if (!ics) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate calendar file',
        });
      }
      attachments.push({
        filename: 'invite.ics',
        content: ics,
        contentType: 'text/calendar; charset=utf-8; method=REQUEST',
      });
    } else if (parsed.options?.length) {
      parsed.options.forEach((opt, i) => {
        const ics = buildIcs(opt, {
          organizerName: parsed.organizerName,
          organizerEmail,
          toEmail: parsed.to,
          plan: parsed.plan,
        });
        if (!ics) {
          return res.status(500).json({
            success: false,
            error: `Failed to generate calendar file for option ${i + 1}`,
          });
        }
        attachments.push({
          filename: `option-${i + 1}.ics`,
          content: ics,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        });
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Provide either 'meeting' or 'options'.",
      });
    }

    const subject = parsed.meeting ? `Invitation: ${parsed.meeting.title}` : 'Invitation: choose a time';

    const info = await transporter.sendMail({
      from,
      to: parsed.to,
      cc: parsed.cc,
      subject,
      text,
      html,
      attachments,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Error sending email:', err);

    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: err.issues,
      });
    }

    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
