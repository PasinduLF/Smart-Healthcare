require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const { RtcRole, RtcTokenBuilder } = require('agora-access-token');

const app  = express();
const PORT = process.env.PORT || 3004;

const SLOT_DURATION_MS = 30 * 60 * 1000; //  30 min
const EARLY_JOIN_MS    =  5 * 60 * 1000; //   5 min grace before slot

const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';
const AGORA_TOKEN_EXPIRY_SECONDS = Number(process.env.AGORA_TOKEN_EXPIRY_SECONDS || 3600);

app.use(cors());
app.use(express.json());

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(
    process.env.MONGO_URI ||
    'mongodb+srv://lpasindu30_db_user:SdSjcC0yYyX1JIwj@cluster0.gvxgnvm.mongodb.net/?appName=Cluster0'
).then(() => console.log('Telemedicine Service connected to MongoDB'))
 .catch(err => console.error('MongoDB error:', err));

const msgSchema = new mongoose.Schema({
    text:       String,
    senderRole: String,   // 'patient' | 'doctor'
    senderName: String,
    time:       String,
    sentAt:     { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
    appointmentId:  { type: String, required: true, unique: true },
    patientId:      String,
    doctorId:       String,
    slotStart:      Date,
    slotEnd:        Date,
    // timer
    status:         { type: String, enum: ['waiting','active','completed','missed'], default: 'waiting' },
    remainingMs:    { type: Number, default: SLOT_DURATION_MS },
    timerStartedAt: Date,   // wall-clock when timer last resumed (null = paused)
    // outcome
    completedAt:    Date,
    durationMs:     Number,
    // chat
    chat:           [msgSchema]
});

const Session = mongoose.model('TeleSession', sessionSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "2:00 PM" + "2025-03-28" → Date (treated as UTC wall-clock, no offset) */
function parseSlotStart(dateStr, timeStr) {
    const now = new Date();

    if (!dateStr || !timeStr) {
        return now;
    }

    const dateValue = typeof dateStr === 'string' ? dateStr.trim() : String(dateStr || '').trim();
    let year;
    let month;
    let day;

    const dateParts = dateValue.split('-');
    if (dateParts.length >= 3 && /^\d{4}$/.test(dateParts[0])) {
        year = Number(dateParts[0]);
        month = Number(dateParts[1]);
        day = Number(String(dateParts[2]).slice(0, 2));
    } else {
        const parsedDate = new Date(dateValue);
        if (Number.isNaN(parsedDate.getTime())) {
            return now;
        }
        year = parsedDate.getUTCFullYear();
        month = parsedDate.getUTCMonth() + 1;
        day = parsedDate.getUTCDate();
    }

    const rawTime = typeof timeStr === 'string' ? timeStr.trim() : String(timeStr || '').trim();
    if (!rawTime) {
        return now;
    }

    const firstSegment = rawTime.split('-')[0].trim();
    if (!firstSegment) {
        return now;
    }

    let hours;
    let minutes;

    const twelveHourMatch = firstSegment.match(/^(\d{1,2}):(\d{2})\s*([aApP][mM])$/);
    if (twelveHourMatch) {
        hours = Number(twelveHourMatch[1]);
        minutes = Number(twelveHourMatch[2]);
        const meridiem = twelveHourMatch[3].toUpperCase();

        if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
            return now;
        }

        hours = hours % 12;
        if (meridiem === 'PM') {
            hours += 12;
        }
    } else {
        const twentyFourHourMatch = firstSegment.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
        if (!twentyFourHourMatch) {
            return now;
        }

        hours = Number(twentyFourHourMatch[1]);
        minutes = Number(twentyFourHourMatch[2]);
    }

    const slotStart = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    if (Number.isNaN(slotStart.getTime())) {
        return now;
    }

    return slotStart;
}

function buildAppointmentChannelName(appointmentId) {
    const normalized = String(appointmentId || '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 48);

    return `appt_${normalized || 'general'}`;
}

function toSafeUid(value) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (Number.isInteger(parsed) && parsed > 0 && parsed < 2147483647) {
        return parsed;
    }
    return null;
}

function computeRemainingMs(session) {
    if (!session.timerStartedAt) return session.remainingMs;
    return Math.max(0, session.remainingMs - (Date.now() - session.timerStartedAt.getTime()));
}

function toClient(s) {
    return {
        appointmentId: s.appointmentId,
        status:        s.status,
        slotStart:     s.slotStart,
        slotEnd:       s.slotEnd,
        remainingMs:   computeRemainingMs(s),
        completedAt:   s.completedAt,
        durationMs:    s.durationMs,
        chat:          s.chat || []
    };
}

// ── REST ──────────────────────────────────────────────────────────────────────

app.post('/agora/token', (req, res) => {
    const { appointmentId, role, uid } = req.body || {};

    if (!appointmentId) {
        return res.status(400).json({ error: 'appointmentId is required' });
    }

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
        return res.status(500).json({ error: 'Agora credentials are not configured' });
    }

    try {
        const channelName = buildAppointmentChannelName(appointmentId);
        const safeUid = toSafeUid(uid) || Math.floor(Math.random() * 1000000) + 1;
        const expiresAt = Math.floor(Date.now() / 1000) + AGORA_TOKEN_EXPIRY_SECONDS;

        const rtcRole = String(role || '').toLowerCase() === 'audience'
            ? RtcRole.SUBSCRIBER
            : RtcRole.PUBLISHER;

        const token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            AGORA_APP_CERTIFICATE,
            channelName,
            safeUid,
            rtcRole,
            expiresAt
        );

        return res.json({
            appId: AGORA_APP_ID,
            channelName,
            uid: safeUid,
            token,
            expiresAt
        });
    } catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to build Agora token' });
    }
});

// Idempotent session bootstrap — called by frontend before socket join
app.post('/session/init', async (req, res) => {
    const { appointmentId, patientId, doctorId, date, time } = req.body;
    if (!appointmentId)
        return res.status(400).json({ error: 'appointmentId is required' });
    try {
        const slotStart = (date && time) ? parseSlotStart(date, time) : new Date();
        let s;
        try {
            s = await Session.findOneAndUpdate(
                { appointmentId },
                { $setOnInsert: {
                    appointmentId, patientId, doctorId,
                    slotStart,
                    slotEnd: new Date(slotStart.getTime() + SLOT_DURATION_MS),
                    remainingMs: SLOT_DURATION_MS,
                    status: 'waiting'
                }},
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        } catch (upsertErr) {
            // Handle duplicate key race condition — just fetch the existing doc
            if (upsertErr.code === 11000) {
                s = await Session.findOne({ appointmentId });
            } else {
                throw upsertErr;
            }
        }
        if (!s) return res.status(500).json({ error: 'Failed to create or find session' });
        res.json(toClient(s));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fetch session state (used for chat history page etc.)
app.get('/session/:appointmentId', async (req, res) => {
    try {
        const s = await Session.findOne({ appointmentId: req.params.appointmentId });
        if (!s) return res.status(404).json({ error: 'Not found' });
        res.json(toClient(s));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fetch only chat messages for a session
app.get('/session/:appointmentId/chat', async (req, res) => {
    try {
        const s = await Session.findOne({ appointmentId: req.params.appointmentId });
        if (!s) return res.json([]);
        res.json(s.chat || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/health', (_req, res) => res.json({ status: 'Telemedicine Service running' }));

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });

// appointmentId → { patient: socketId|null, doctor: socketId|null }
const rooms = {};

// appointmentId → timeout handle for auto-end
const timerHandles = {};

function scheduleAutoEnd(appointmentId, ms) {
    if (timerHandles[appointmentId]) clearTimeout(timerHandles[appointmentId]);
    timerHandles[appointmentId] = setTimeout(async () => {
        const s = await Session.findOne({ appointmentId });
        if (!s || s.status === 'completed') return;
        // Guard: timer may have been paused/reset since we scheduled
        if (computeRemainingMs(s) > 1500) return;
        s.status      = 'completed';
        s.completedAt = new Date();
        s.durationMs  = SLOT_DURATION_MS - s.remainingMs;
        s.remainingMs = 0;
        s.timerStartedAt = null;
        await s.save();
        io.to(appointmentId).emit('call-ended', {
            reason: 'timer',
            durationMs: s.durationMs,
            completedAt: s.completedAt
        });
        delete timerHandles[appointmentId];
        delete rooms[appointmentId];
    }, ms);
}

io.on('connection', socket => {

    // ── join-session ──────────────────────────────────────────────────────────
    socket.on('join-session', async ({ appointmentId, role, name }) => {
        if (!appointmentId || !role) return;

        const s = await Session.findOne({ appointmentId });
        if (!s) return socket.emit('session-error', { code: 'not_found', message: 'not_found' });

        // No time validation — users can join anytime after payment
        if (s.status === 'completed') {
            return socket.emit('session-error', { code: 'completed', message: 'completed', completedAt: s.completedAt });
        }

        // ── join room ─────────────────────────────────────────────────────────
        socket.join(appointmentId);
        socket.data.appointmentId = appointmentId;
        socket.data.role          = role;
        socket.data.name          = name;

        if (!rooms[appointmentId]) rooms[appointmentId] = { patient: null, doctor: null };
        rooms[appointmentId][role] = socket.id;

        const bothPresent = !!(rooms[appointmentId].patient && rooms[appointmentId].doctor);

        // ── start / resume timer when both present ────────────────────────────
        if (bothPresent && s.status !== 'completed') {
            const remaining = computeRemainingMs(s);
            s.remainingMs    = remaining;
            s.timerStartedAt = new Date();
            s.status         = 'active';
            await s.save();

            io.to(appointmentId).emit('timer-sync', {
                remainingMs: remaining,
                running: true,
                status: 'active'
            });
            scheduleAutoEnd(appointmentId, remaining);
        }

        // ── send current state to the joiner ──────────────────────────────────
        socket.emit('session-joined', {
            status:      s.status,
            remainingMs: computeRemainingMs(s),
            running:     bothPresent && s.status !== 'completed',
            slotStart:   s.slotStart,
            slotEnd:     s.slotEnd,
            chat:        s.chat || []
        });

        // notify the other side
        socket.to(appointmentId).emit('participant-joined', { role, name });

        // if only one person, tell them to wait
        if (!bothPresent) {
            socket.emit('timer-sync', {
                remainingMs: computeRemainingMs(s),
                running: false,
                status: s.status
            });
        }
    });

    // ── chat ──────────────────────────────────────────────────────────────────
    socket.on('send-message', async ({ appointmentId, text, senderRole, senderName, time }) => {
        if (!appointmentId || !text) return;
        const msg = { text, senderRole, senderName, time, sentAt: new Date() };
        await Session.updateOne({ appointmentId }, { $push: { chat: msg } });
        io.to(appointmentId).emit('receive-message', msg);
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
        const { appointmentId, role } = socket.data;
        if (!appointmentId || !role) return;

        if (rooms[appointmentId]) rooms[appointmentId][role] = null;

        const s = await Session.findOne({ appointmentId });
        if (!s || s.status === 'completed') return;

        if (s.status === 'active') {
            // Pause timer
            const remaining   = computeRemainingMs(s);
            s.remainingMs     = remaining;
            s.timerStartedAt  = null;
            s.status          = 'waiting';
            await s.save();

            // Cancel the scheduled auto-end (timer is paused)
            if (timerHandles[appointmentId]) {
                clearTimeout(timerHandles[appointmentId]);
                delete timerHandles[appointmentId];
            }

            io.to(appointmentId).emit('timer-sync', {
                remainingMs: remaining,
                running: false,
                status: 'waiting'
            });
        }

        socket.to(appointmentId).emit('participant-left', { role });

        const anyoneLeft = Object.values(rooms[appointmentId] || {}).some(Boolean);
        if (!anyoneLeft) delete rooms[appointmentId];
    });
});

server.listen(PORT, () => console.log(`Telemedicine Service listening on port ${PORT}`));
