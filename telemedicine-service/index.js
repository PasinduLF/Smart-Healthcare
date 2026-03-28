require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3004;
const SLOT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const EARLY_JOIN_MS = 5 * 60 * 1000;     // 5 minutes before slot

app.use(cors());
app.use(express.json());

// ── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://lpasindu30_db_user:SdSjcC0yYyX1JIwj@cluster0.gvxgnvm.mongodb.net/?appName=Cluster0')
    .then(() => console.log('Telemedicine Service connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const chatMessageSchema = new mongoose.Schema({
    text: String,
    senderRole: String, // 'patient' | 'doctor'
    senderName: String,
    time: String,
    sentAt: { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
    appointmentId: { type: String, required: true, unique: true },
    channelName:   { type: String, required: true },
    patientId:     String,
    doctorId:      String,
    slotStart:     Date,   // computed from appointment date+time
    slotEnd:       Date,
    status:        { type: String, enum: ['waiting', 'active', 'completed', 'missed'], default: 'waiting' },
    // Timer tracking (milliseconds remaining)
    remainingMs:   { type: Number, default: SLOT_DURATION_MS },
    timerStartedAt: Date,  // wall-clock when timer last resumed
    // Who is currently in the room
    participantsInRoom: { type: [String], default: [] }, // socket ids or role keys
    completedAt:   Date,
    durationMs:    Number,
    chat:          [chatMessageSchema]
});

const Session = mongoose.model('TeleSession', sessionSchema);

// ── Helpers ──────────────────────────────────────────────────────────────────

// Parse "2:00 PM" + "2025-03-28" → Date
function parseSlotStart(dateStr, timeStr) {
    const [timePart, meridiem] = timeStr.trim().split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(hours, minutes, 0, 0);
    return d;
}

function getSlotWindow(slotStart) {
    const joinFrom = new Date(slotStart.getTime() - EARLY_JOIN_MS);
    const joinUntil = new Date(slotStart.getTime() + SLOT_DURATION_MS);
    return { joinFrom, joinUntil };
}

// Compute how many ms are actually remaining right now
function computeRemainingMs(session) {
    if (!session.timerStartedAt) return session.remainingMs;
    const elapsed = Date.now() - session.timerStartedAt.getTime();
    return Math.max(0, session.remainingMs - elapsed);
}

// ── REST endpoints ────────────────────────────────────────────────────────────

// Called by frontend before showing join button — returns session state
app.post('/session/init', async (req, res) => {
    const { appointmentId, patientId, doctorId, date, time } = req.body;
    if (!appointmentId || !date || !time) return res.status(400).json({ error: 'Missing fields' });

    try {
        let session = await Session.findOne({ appointmentId });
        if (!session) {
            const slotStart = parseSlotStart(date, time);
            const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MS);
            session = await Session.create({
                appointmentId,
                channelName: `channel-${appointmentId}`,
                patientId,
                doctorId,
                slotStart,
                slotEnd,
                remainingMs: SLOT_DURATION_MS
            });
        }
        res.json(sessionToClient(session));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get session state
app.get('/session/:appointmentId', async (req, res) => {
    try {
        const session = await Session.findOne({ appointmentId: req.params.appointmentId });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json(sessionToClient(session));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get chat history for a session
app.get('/session/:appointmentId/chat', async (req, res) => {
    try {
        const session = await Session.findOne({ appointmentId: req.params.appointmentId });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json(session.chat || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function sessionToClient(session) {
    return {
        appointmentId: session.appointmentId,
        channelName: session.channelName,
        status: session.status,
        slotStart: session.slotStart,
        slotEnd: session.slotEnd,
        remainingMs: computeRemainingMs(session),
        participantsInRoom: session.participantsInRoom,
        completedAt: session.completedAt,
        durationMs: session.durationMs,
        chat: session.chat || []
    };
}

app.get('/health', (req, res) => res.json({ status: 'Telemedicine Service is running' }));

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// In-memory map of appointmentId → Set of roles currently connected
// role: 'patient' | 'doctor'
const roomParticipants = {}; // appointmentId → { patient: socketId|null, doctor: socketId|null }

io.on('connection', (socket) => {

    socket.on('join-session', async ({ appointmentId, role, name }) => {
        if (!appointmentId || !role) return;

        const session = await Session.findOne({ appointmentId });
        if (!session) return socket.emit('session-error', { message: 'Session not found' });

        const now = Date.now();
        const { joinFrom, joinUntil } = getSlotWindow(session.slotStart);

        // Enforce time window
        if (now < joinFrom.getTime()) {
            return socket.emit('session-error', {
                message: 'too_early',
                slotStart: session.slotStart
            });
        }
        if (now > joinUntil.getTime() && session.status !== 'active') {
            // Mark missed if nobody ever joined
            if (session.status === 'waiting') {
                session.status = 'missed';
                await session.save();
            }
            return socket.emit('session-error', { message: 'too_late', status: session.status });
        }
        // After slot end but session was active (rejoin scenario) — allow if not completed
        if (now > joinUntil.getTime() && session.status === 'completed') {
            return socket.emit('session-error', { message: 'too_late', status: 'completed' });
        }

        socket.join(appointmentId);
        socket.data.appointmentId = appointmentId;
        socket.data.role = role;
        socket.data.name = name;

        // Track participants
        if (!roomParticipants[appointmentId]) {
            roomParticipants[appointmentId] = { patient: null, doctor: null };
        }
        roomParticipants[appointmentId][role] = socket.id;

        const bothPresent = roomParticipants[appointmentId].patient && roomParticipants[appointmentId].doctor;

        // Resume or start timer if both are present
        if (bothPresent && session.status !== 'completed') {
            const currentRemaining = computeRemainingMs(session);
            session.remainingMs = currentRemaining;
            session.timerStartedAt = new Date();
            session.status = 'active';
            session.participantsInRoom = Object.keys(roomParticipants[appointmentId])
                .filter(r => roomParticipants[appointmentId][r]);
            await session.save();

            io.to(appointmentId).emit('timer-sync', {
                remainingMs: currentRemaining,
                running: true,
                status: 'active'
            });

            // Schedule auto-end when timer expires
            scheduleTimerEnd(appointmentId, currentRemaining);
        }

        // Send current state + chat history to the joiner
        socket.emit('session-joined', {
            channelName: session.channelName,
            status: session.status,
            remainingMs: computeRemainingMs(session),
            running: bothPresent,
            slotStart: session.slotStart,
            slotEnd: session.slotEnd,
            chat: session.chat || [],
            participantsInRoom: session.participantsInRoom
        });

        // Notify the other participant
        socket.to(appointmentId).emit('participant-joined', { role, name });

        // If only one person is in, tell them to wait
        if (!bothPresent) {
            socket.emit('timer-sync', {
                remainingMs: computeRemainingMs(session),
                running: false,
                status: session.status
            });
        }
    });

    // ── WebRTC signaling relay ────────────────────────────────────────────────
    // Just forward to the other participant in the same room — server is not involved in the peer connection itself
    socket.on('webrtc-offer', ({ appointmentId, offer }) => {
        socket.to(appointmentId).emit('webrtc-offer', { offer });
    });

    socket.on('webrtc-answer', ({ appointmentId, answer }) => {
        socket.to(appointmentId).emit('webrtc-answer', { answer });
    });

    socket.on('webrtc-ice-candidate', ({ appointmentId, candidate }) => {
        socket.to(appointmentId).emit('webrtc-ice-candidate', { candidate });
    });

    socket.on('send-message', async (data) => {
        const { appointmentId, text, senderRole, senderName, time } = data;
        if (!appointmentId || !text) return;

        const msg = { text, senderRole, senderName, time, sentAt: new Date() };

        // Persist to DB
        await Session.updateOne({ appointmentId }, { $push: { chat: msg } });

        // Broadcast to room
        io.to(appointmentId).emit('receive-message', msg);
    });

    socket.on('disconnect', async () => {
        const { appointmentId, role } = socket.data;
        if (!appointmentId || !role) return;

        if (roomParticipants[appointmentId]) {
            roomParticipants[appointmentId][role] = null;
        }

        const session = await Session.findOne({ appointmentId });
        if (!session || session.status === 'completed') return;

        // Pause timer — save remaining
        if (session.status === 'active') {
            const remaining = computeRemainingMs(session);
            session.remainingMs = remaining;
            session.timerStartedAt = null;
            session.status = 'waiting'; // back to waiting until both rejoin
            await session.save();

            io.to(appointmentId).emit('timer-sync', {
                remainingMs: remaining,
                running: false,
                status: 'waiting'
            });
        }

        socket.to(appointmentId).emit('participant-left', { role });

        // Clean up if room empty
        const anyoneLeft = Object.values(roomParticipants[appointmentId]).some(Boolean);
        if (!anyoneLeft) delete roomParticipants[appointmentId];
    });
});

// ── Timer auto-end ────────────────────────────────────────────────────────────
const timerHandles = {}; // appointmentId → timeout handle

function scheduleTimerEnd(appointmentId, remainingMs) {
    // Clear any existing handle
    if (timerHandles[appointmentId]) clearTimeout(timerHandles[appointmentId]);

    timerHandles[appointmentId] = setTimeout(async () => {
        const session = await Session.findOne({ appointmentId });
        if (!session || session.status === 'completed') return;

        // Only end if timer actually ran out (not paused)
        const remaining = computeRemainingMs(session);
        if (remaining > 1000) return; // was paused/restarted

        const durationMs = SLOT_DURATION_MS - remaining;
        session.status = 'completed';
        session.completedAt = new Date();
        session.durationMs = durationMs;
        session.remainingMs = 0;
        await session.save();

        io.to(appointmentId).emit('call-ended', {
            reason: 'timer',
            durationMs,
            completedAt: session.completedAt
        });

        delete timerHandles[appointmentId];
        delete roomParticipants[appointmentId];
    }, remainingMs);
}

server.listen(PORT, () => console.log(`Telemedicine Service listening on port ${PORT}`));
