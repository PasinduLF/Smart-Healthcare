require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');

const app  = express();
const PORT = process.env.PORT || 3004;

const SLOT_DURATION_MS = 30 * 60 * 1000; //  30 min
const EARLY_JOIN_MS    =  5 * 60 * 1000; //   5 min grace before slot

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

/** "2:00 PM" + "2025-03-28" → Date */
function parseSlotStart(dateStr, timeStr) {
    const [timePart, meridiem] = timeStr.trim().split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (meridiem.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (meridiem.toUpperCase() === 'AM' && h === 12) h  =  0;
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(h, m, 0, 0);
    return d;
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

// Idempotent session bootstrap — called by frontend before socket join
app.post('/session/init', async (req, res) => {
    const { appointmentId, patientId, doctorId, date, time } = req.body;
    if (!appointmentId || !date || !time)
        return res.status(400).json({ error: 'appointmentId, date and time are required' });
    try {
        let s = await Session.findOne({ appointmentId });
        if (!s) {
            const slotStart = parseSlotStart(date, time);
            s = await Session.create({
                appointmentId, patientId, doctorId,
                slotStart,
                slotEnd: new Date(slotStart.getTime() + SLOT_DURATION_MS),
                remainingMs: SLOT_DURATION_MS
            });
        }
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

        const now      = Date.now();
        const joinFrom  = s.slotStart.getTime() - EARLY_JOIN_MS;
        const joinUntil = s.slotEnd.getTime();

        if (now < joinFrom) {
            return socket.emit('session-error', {
                code: 'too_early', message: 'too_early',
                slotStart: s.slotStart
            });
        }

        if (now > joinUntil) {
            if (s.status === 'waiting') {
                s.status = 'missed';
                await s.save();
                return socket.emit('session-error', { code: 'missed', message: 'too_late' });
            }
            if (s.status === 'completed') {
                return socket.emit('session-error', { code: 'completed', message: 'completed', completedAt: s.completedAt });
            }
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
