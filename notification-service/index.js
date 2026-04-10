require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://lpasindu30_db_user:SdSjcC0yYyX1JIwj@cluster0.gvxgnvm.mongodb.net/?appName=Cluster0')
    .then(() => console.log('Notification Service connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// ─── Schemas ───
const notificationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    userRole: { type: String, enum: ['patient', 'doctor'], required: true },
    type: { type: String, enum: ['appointment_booked', 'appointment_accepted', 'appointment_rejected', 'appointment_cancelled', 'consultation_completed', 'prescription_issued', 'general'], default: 'general' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

// Email delivery log schema
const emailLogSchema = new mongoose.Schema({
    to: { type: String, required: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed', 'skipped'], default: 'sent' },
    messageId: { type: String, default: '' },
    error: { type: String, default: '' },
    type: { type: String, default: 'general' },
    sentAt: { type: Date, default: Date.now }
});
const EmailLog = mongoose.model('EmailLog', emailLogSchema);

// ─── Gmail SMTP ───
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

transporter.verify((err) => {
    if (err) console.error('[Notification] Gmail SMTP verification failed:', err.message);
    else console.log('[Notification] ✅ Gmail SMTP ready');
});

// ─── Twilio SMS ───
let twilioClient = null;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';

if (twilioSid.startsWith('AC') && twilioToken) {
    try {
        twilioClient = twilio(twilioSid, twilioToken);
        console.log('[Notification] ✅ Twilio SMS client initialized');
    } catch (err) {
        console.warn('[Notification] Twilio init failed:', err.message);
    }
} else {
    console.warn('[Notification] Twilio credentials not set — SMS will be logged only');
}

const formatPhone = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('0')) cleaned = '+94' + cleaned.substring(1);
    else if (!cleaned.startsWith('+')) cleaned = '+94' + cleaned;
    return cleaned;
};

// ─── Email Template Engine ───
const buildEmailHtml = ({ subject, heading, subheading, bodyHtml, accentColor = '#2563eb', iconEmoji = '📧', type = 'general' }) => {
    const accentMap = {
        appointment_booked:    { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', emoji: '📅' },
        appointment_accepted:  { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', emoji: '✅' },
        appointment_rejected:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', emoji: '❌' },
        appointment_cancelled: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', emoji: '🚫' },
        prescription_issued:   { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', emoji: '💊' },
        general:               { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', emoji: '📧' }
    };
    const style = accentMap[type] || accentMap.general;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1A2B4C 0%,#2563eb 100%);border-radius:20px 20px 0 0;padding:36px 40px;text-align:center;">
            <div style="font-size:40px;margin-bottom:12px;">${style.emoji}</div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">SmartHealth</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.65);font-size:13px;font-weight:500;letter-spacing:1px;text-transform:uppercase;">Your Trusted Healthcare Portal</p>
          </td>
        </tr>

        <!-- Status Banner -->
        <tr>
          <td style="background:${style.bg};border-left:4px solid ${style.color};border-right:4px solid ${style.color};padding:20px 40px;text-align:center;">
            <h2 style="margin:0;color:${style.color};font-size:20px;font-weight:800;">${heading}</h2>
            ${subheading ? `<p style="margin:6px 0 0;color:#64748b;font-size:14px;">${subheading}</p>` : ''}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;border-left:4px solid ${style.color};border-right:4px solid ${style.color};padding:32px 40px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Divider strip -->
        <tr>
          <td style="background:${style.bg};border-left:4px solid ${style.color};border-right:4px solid ${style.color};border-top:1px solid ${style.border};padding:16px 40px;text-align:center;">
            <p style="margin:0;color:${style.color};font-size:12px;font-weight:700;">Need help? Contact us at support@smarthealth.com</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1e293b;border-radius:0 0 20px 20px;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} SmartHealth Healthcare System · All rights reserved</p>
            <p style="margin:6px 0 0;color:#475569;font-size:11px;">This is an automated notification. Please do not reply directly to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// Info row helper used in email body
const infoRow = (label, value, emoji = '') =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">${label}</span>
        <div style="margin-top:4px;font-size:15px;font-weight:700;color:#1e293b;">${emoji} ${value}</div>
      </td>
    </tr>`;

// ─── Build HTML per email type ───
const buildEmailContent = (type, data) => {
    const { patientName, doctorName, date, time, reason, subject } = data;

    switch (type) {
        case 'appointment_booked_patient':
            return buildEmailHtml({
                type: 'appointment_booked',
                subject: 'Appointment Booked — SmartHealth',
                heading: 'Appointment Successfully Booked!',
                subheading: 'Your request has been sent to the doctor for approval.',
                bodyHtml: `
                  <p style="color:#475569;font-size:15px;margin:0 0 24px;">Dear <strong>${patientName}</strong>,</p>
                  <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">Your appointment request has been submitted successfully. The doctor will review and confirm it shortly.</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${infoRow('Doctor', doctorName, '👨‍⚕️')}
                    ${infoRow('Date', date, '📅')}
                    ${infoRow('Time', time, '⏰')}
                    ${infoRow('Status', 'Pending Doctor Approval', '🕐')}
                  </table>
                  <div style="margin-top:28px;padding:16px;background:#eff6ff;border-radius:12px;border:1px solid #bfdbfe;">
                    <p style="margin:0;color:#1d4ed8;font-size:13px;font-weight:600;">💡 You'll receive another email once the doctor confirms your appointment.</p>
                  </div>`
            });

        case 'appointment_booked_doctor':
            return buildEmailHtml({
                type: 'appointment_booked',
                subject: 'New Appointment Request — SmartHealth',
                heading: 'New Appointment Request',
                subheading: 'A patient is requesting your time.',
                bodyHtml: `
                  <p style="color:#475569;font-size:15px;margin:0 0 24px;">Dear <strong>${doctorName}</strong>,</p>
                  <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">A patient has requested an appointment with you. Please log in to your SmartHealth dashboard to accept or reject.</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${infoRow('Patient', patientName, '👤')}
                    ${infoRow('Date', date, '📅')}
                    ${infoRow('Time', time, '⏰')}
                    ${infoRow('Action Required', 'Accept or Reject in Dashboard', '⚡')}
                  </table>
                  <div style="margin-top:28px;text-align:center;">
                    <a href="http://localhost:5173/doctor/appointments" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#ffffff;font-weight:800;text-decoration:none;border-radius:12px;font-size:14px;letter-spacing:0.5px;">View in Dashboard →</a>
                  </div>`
            });

        case 'appointment_accepted':
            return buildEmailHtml({
                type: 'appointment_accepted',
                subject: 'Appointment Confirmed ✅ — SmartHealth',
                heading: 'Your Appointment is Confirmed!',
                subheading: 'Great news — the doctor has accepted your request.',
                bodyHtml: `
                  <p style="color:#475569;font-size:15px;margin:0 0 24px;">Dear <strong>${patientName}</strong>,</p>
                  <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">Great news! Your appointment has been <strong style="color:#059669;">confirmed</strong> by the doctor. Please make sure to arrive on time.</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${infoRow('Doctor', doctorName, '👨‍⚕️')}
                    ${infoRow('Date', date, '📅')}
                    ${infoRow('Time', time, '⏰')}
                    ${infoRow('Status', 'CONFIRMED ✓', '✅')}
                  </table>
                  <div style="margin-top:28px;padding:16px;background:#ecfdf5;border-radius:12px;border:1px solid #a7f3d0;">
                    <p style="margin:0;color:#065f46;font-size:13px;font-weight:600;">📌 Please arrive 10 minutes early and bring any relevant medical documents.</p>
                  </div>`
            });

        case 'appointment_rejected':
            return buildEmailHtml({
                type: 'appointment_rejected',
                subject: 'Appointment Request Update — SmartHealth',
                heading: 'Appointment Could Not Be Confirmed',
                subheading: 'We\'re sorry, the doctor couldn\'t accept this request.',
                bodyHtml: `
                  <p style="color:#475569;font-size:15px;margin:0 0 24px;">Dear <strong>${patientName}</strong>,</p>
                  <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">Unfortunately, your appointment request on <strong>${date}</strong> at <strong>${time}</strong> could not be accepted at this time.</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${infoRow('Date', date, '📅')}
                    ${infoRow('Time', time, '⏰')}
                    ${reason ? infoRow('Reason', reason, 'ℹ️') : ''}
                  </table>
                  <div style="margin-top:28px;padding:16px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca;">
                    <p style="margin:0;color:#991b1b;font-size:13px;font-weight:600;">🔄 You can book a different time slot through the SmartHealth portal anytime.</p>
                  </div>`
            });

        case 'appointment_cancelled':
            return buildEmailHtml({
                type: 'appointment_cancelled',
                subject: 'Appointment Cancelled — SmartHealth',
                heading: 'Appointment Has Been Cancelled',
                subheading: '',
                bodyHtml: `
                  <p style="color:#475569;font-size:15px;margin:0 0 24px;">Dear <strong>${patientName || doctorName}</strong>,</p>
                  <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">The appointment on <strong>${date}</strong> at <strong>${time}</strong> has been cancelled.</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${infoRow('Date', date, '📅')}
                    ${infoRow('Time', time, '⏰')}
                    ${infoRow('Status', 'Cancelled', '🚫')}
                  </table>
                  <div style="margin-top:28px;padding:16px;background:#fffbeb;border-radius:12px;border:1px solid #fde68a;">
                    <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">📅 You can book a new appointment anytime through SmartHealth.</p>
                  </div>`
            });

        default:
            // Generic fallback — still uses the nice template  
            return buildEmailHtml({
                type: 'general',
                subject: subject || 'SmartHealth Notification',
                heading: subject || 'SmartHealth Notification',
                subheading: '',
                bodyHtml: `<p style="color:#475569;font-size:15px;line-height:1.7;margin:0;">${data.text || ''}</p>`
            });
    }
};

// ─── In-app Notification endpoints ───
app.post('/notifications', async (req, res) => {
    try {
        const { userId, userRole, type, title, message } = req.body;
        const notification = new Notification({ userId, userRole, type, title, message });
        await notification.save();
        res.status(201).json(notification);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/notifications/:userId', async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.params.userId })
            .sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/notifications/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        res.json(notification);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/notifications/:id', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndDelete(req.params.id);
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/notifications/user/:userId', async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.params.userId });
        res.json({ message: 'All notifications cleared' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Send Rich HTML Email ───
app.post('/send-email', async (req, res) => {
    const { to, subject, text, type, templateData } = req.body;

    if (!to) {
        console.warn('[Notification] ⚠️ Email sending skipped - no recipient address provided');
        return res.status(400).json({ error: 'Missing "to" email address' });
    }
    if (!subject && !type) return res.status(400).json({ error: 'Missing "subject" or "type"' });

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
        const log = new EmailLog({ to, subject: subject || type, status: 'skipped', error: 'Invalid email format', type: type || 'general' });
        await log.save();
        console.warn(`[Notification] ⚠️ Skipped email — invalid address format: ${to}`);
        return res.status(400).json({ error: 'Invalid email address format', skipped: true });
    }

    // Build HTML — use type-specific template if available, else generic
    let htmlContent;
    try {
        if (type && templateData) {
            htmlContent = buildEmailContent(type, { ...templateData, subject });
        } else {
            htmlContent = buildEmailContent('general', { text, subject });
        }
    } catch (buildErr) {
        console.error('[Notification] Template build failed:', buildErr.message);
        htmlContent = `<p>${text}</p>`;
    }

    try {
        console.log(`[Notification] 📧 Attempting to send email to: ${to} | Subject: ${subject || type}`);
        
        const info = await transporter.sendMail({
            from: `"SmartHealth System" <${process.env.SMTP_USER}>`,
            to,
            subject: subject || 'SmartHealth Notification',
            text: text || subject,
            html: htmlContent
        });

        const log = new EmailLog({ to, subject: subject || type, status: 'sent', messageId: info.messageId, type: type || 'general' });
        await log.save();

        console.log(`[Notification] ✅ Email sent successfully → ${to} | MsgID: ${info.messageId}`);
        res.json({ message: 'Email sent successfully', messageId: info.messageId, to, status: 'sent' });

    } catch (err) {
        const log = new EmailLog({ to, subject: subject || type, status: 'failed', error: err.message, type: type || 'general' });
        await log.save();

        console.error(`[Notification] ❌ Email FAILED → ${to}`);
        console.error(`[Notification] Error details:`, err.message);
        console.error(`[Notification] Full error:`, JSON.stringify(err, null, 2));
        
        res.status(500).json({ 
            error: 'Failed to send email: ' + err.message, 
            to, 
            status: 'failed',
            details: err.response || err.message
        });
    }
});

// ─── Email Logs (for verifying what was sent) ───
app.get('/email-logs', async (req, res) => {
    try {
        const { limit = 50, status } = req.query;
        const filter = status ? { status } : {};
        const logs = await EmailLog.find(filter).sort({ sentAt: -1 }).limit(Number(limit));
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/email-logs/stats', async (req, res) => {
    try {
        const [sent, failed, skipped] = await Promise.all([
            EmailLog.countDocuments({ status: 'sent' }),
            EmailLog.countDocuments({ status: 'failed' }),
            EmailLog.countDocuments({ status: 'skipped' })
        ]);
        res.json({ sent, failed, skipped, total: sent + failed + skipped });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Send SMS via Twilio ───
app.post('/send-sms', async (req, res) => {
    const { to, text } = req.body;
    if (!to || !text) return res.status(400).json({ error: 'Missing "to" or "text"' });

    const formattedPhone = formatPhone(to);
    if (!formattedPhone) {
        console.warn(`[Notification] ⚠️ Invalid phone number format: ${to}`);
        return res.status(400).json({ error: 'Invalid phone number' });
    }

    if (!twilioClient || !TWILIO_PHONE) {
        console.log(`[Notification] 📱 SMS (Twilio not configured) to ${formattedPhone}: ${text}`);
        return res.json({ message: 'SMS logged (Twilio not configured)', phone: formattedPhone });
    }

    try {
        console.log(`[Notification] 📱 Attempting to send SMS to: ${formattedPhone}`);
        
        const message = await twilioClient.messages.create({
            body: `[SmartHealth] ${text}`,
            from: TWILIO_PHONE,
            to: formattedPhone
        });
        
        console.log(`[Notification] ✅ SMS sent successfully → ${formattedPhone} | SID: ${message.sid}`);
        res.json({ message: 'SMS sent successfully', sid: message.sid, phone: formattedPhone });
    } catch (err) {
        console.error(`[Notification] ❌ SMS FAILED → ${formattedPhone}`);
        console.error(`[Notification] Error details:`, err.message);
        res.status(500).json({ 
            error: 'Failed to send SMS: ' + err.message,
            phone: formattedPhone,
            details: err.message
        });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'Notification Service is running',
        smsEnabled: !!twilioClient,
        emailEnabled: !!process.env.SMTP_USER,
        features: ['rich-html-emails', 'email-delivery-logs', 'per-type-templates', 'email-validation']
    });
});

app.listen(PORT, () => console.log(`Notification Service listening on port ${PORT}`));
