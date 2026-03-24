require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3004;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
    });

    socket.on('send-message', (data) => {
        io.to(data.roomId).emit('receive-message', data);
    });
});

const APP_ID = process.env.AGORA_APP_ID || 'mock-app-id';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'mock-app-certificate';

app.post('/generate-token', (req, res) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    const { channelName, uid } = req.body;

    if (!channelName) return res.status(400).json({ error: 'Channel name is required' });

    let intUid = uid || 0;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    if (APP_ID === 'mock-app-id') {
        return res.json({ token: `mock-token-for-${channelName}` });
    }

    try {
        const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, intUid, role, privilegeExpiredTs);
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'Telemedicine Service is running' });
});

server.listen(PORT, () => console.log(`Telemedicine Service & Socket.IO listening on port ${PORT}`));
