require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

let transporter;
// Initialize Ethereal email transporter
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return process.exit(1);
    }
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: process.env.SMTP_USER || account.user,
            pass: process.env.SMTP_PASS || account.pass
        }
    });
    console.log('Nodemailer configured with Ethereal Email for testing');
});

// Sends an email notification
app.post('/send-email', async (req, res) => {
    const { to, subject, text } = req.body;
    
    if (!transporter) return res.status(503).json({ error: 'Mail server not initialized yet' });

    try {
        const info = await transporter.sendMail({
            from: '"SmartHealth System" <noreply@smarthealth.com>',
            to,
            subject,
            text,
            html: `<p>${text}</p>`,
        });
        console.log(`[Notification] Email sent: ${info.messageId}`);
        console.log(`[Notification] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        res.json({ message: 'Email notification sent successfully', previewUrl: nodemailer.getTestMessageUrl(info) });
    } catch (err) {
        console.error('Error sending email:', err);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.post('/send-sms', async (req, res) => {
    const { to, text } = req.body;
    // Keeping SMS mocked as Twilio requires real verified numbers and balance
    console.log(`[Notification] Mock SMS sent to ${to}: ${text}`);
    res.json({ message: 'SMS notification queued/sent mockly' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'Notification Service is running' });
});

app.listen(PORT, () => console.log(`Notification Service listening on port ${PORT}`));
