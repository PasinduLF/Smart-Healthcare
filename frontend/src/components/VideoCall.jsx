import { useEffect, useRef, useState, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Clock, Users } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const TELE_URL = 'http://localhost:3004';

// Free public STUN + Metered free TURN relay for production (Render/Vercel)
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

function formatMs(ms) {
    if (ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
}

export default function VideoCall({ appointmentId, date, time, onEndCall }) {
    const { user } = useAuth();
    const role = user?.role;
    const name = user?.name || role;

    const localVideoRef  = useRef(null);
    const remoteVideoRef = useRef(null);
    const socketRef      = useRef(null);
    const pcRef          = useRef(null);   // RTCPeerConnection
    const localStreamRef = useRef(null);
    const timerRef       = useRef(null);
    const makingOffer    = useRef(false);

    const [hasVideo, setHasVideo]         = useState(true);
    const [hasAudio, setHasAudio]         = useState(true);
    const [mediaError, setMediaError]     = useState('');
    const [remoteStream, setRemoteStream] = useState(false); // true once remote tracks arrive

    const [sessionStatus, setSessionStatus] = useState('connecting');
    const [remainingMs, setRemainingMs]     = useState(null);
    const [timerRunning, setTimerRunning]   = useState(false);
    const [slotStart, setSlotStart]         = useState(null);
    const [otherPresent, setOtherPresent]   = useState(false);

    const [messages, setMessages]     = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef(null);

    // ── local countdown tick ──────────────────────────────────────────────────
    useEffect(() => {
        if (timerRunning && remainingMs > 0) {
            timerRef.current = setInterval(() => {
                setRemainingMs(prev => (prev <= 1000 ? (clearInterval(timerRef.current), 0) : prev - 1000));
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [timerRunning, remainingMs]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // ── create / reset RTCPeerConnection ──────────────────────────────────────
    const createPeerConnection = useCallback((socket) => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
        }

        // Remote track → show remote video
        pc.ontrack = (e) => {
            if (remoteVideoRef.current && e.streams[0]) {
                remoteVideoRef.current.srcObject = e.streams[0];
                setRemoteStream(true);
            }
        };

        // ICE candidates → relay via socket
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socket.emit('webrtc-ice-candidate', { appointmentId, candidate: e.candidate });
            }
        };

        pc.onnegotiationneeded = async () => {
            try {
                makingOffer.current = true;
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('webrtc-offer', { appointmentId, offer: pc.localDescription });
            } catch (err) {
                console.error('Offer error:', err);
            } finally {
                makingOffer.current = false;
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') {
                // Try ICE restart
                pc.restartIce();
            }
        };

        return pc;
    }, [appointmentId, role]);

    // ── main effect: media + socket ───────────────────────────────────────────
    useEffect(() => {
        if (!appointmentId || !role) return;
        let isMounted = true;

        const socket = io(TELE_URL, { transports: ['websocket'] });
        socketRef.current = socket;

        // ── WebRTC signal handlers ────────────────────────────────────────────
        socket.on('webrtc-offer', async ({ offer }) => {
            if (!isMounted) return;
            const pc = pcRef.current;
            if (!pc) return;
            const offerCollision = makingOffer.current || pc.signalingState !== 'stable';
            // doctor is always the "polite" peer — backs off on collision
            const imPolite = role === 'doctor';
            if (offerCollision && !imPolite) return;
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('webrtc-answer', { appointmentId, answer: pc.localDescription });
            } catch (err) {
                console.error('Answer error:', err);
            }
        });

        socket.on('webrtc-answer', async ({ answer }) => {
            if (!isMounted || !pcRef.current) return;
            try {
                if (pcRef.current.signalingState !== 'have-local-offer') return;
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (err) {
                console.error('Set answer error:', err);
            }
        });

        socket.on('webrtc-ice-candidate', async ({ candidate }) => {
            if (!isMounted || !pcRef.current) return;
            try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                // Ignore benign ICE errors
            }
        });

        // ── Session signal handlers ───────────────────────────────────────────
        socket.on('session-joined', ({ status, remainingMs: rem, running, slotStart: ss, chat }) => {
            if (!isMounted) return;
            setSessionStatus(status === 'active' ? 'active' : 'waiting');
            setRemainingMs(rem);
            setTimerRunning(running);
            setSlotStart(ss ? new Date(ss) : null);
            setMessages(chat || []);
        });

        socket.on('session-error', ({ message, slotStart: ss, status }) => {
            if (!isMounted) return;
            if (message === 'too_early') { setSessionStatus('too_early'); setSlotStart(ss ? new Date(ss) : null); }
            else if (message === 'too_late') setSessionStatus(status === 'missed' ? 'missed' : 'too_late');
            else setSessionStatus('error');
        });

        socket.on('participant-joined', ({ role: r, name: n }) => {
            if (!isMounted) return;
            setOtherPresent(true);
            // Whoever was already in the room when the other joins creates the offer
            // This means either patient or doctor can start the call
            if (pcRef.current && pcRef.current.signalingState === 'stable') {
                pcRef.current.onnegotiationneeded?.();
            }
        });

        socket.on('participant-left', () => {
            if (!isMounted) return;
            setOtherPresent(false);
            setRemoteStream(false);
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        });

        socket.on('timer-sync', ({ remainingMs: rem, running, status }) => {
            if (!isMounted) return;
            setRemainingMs(rem);
            setTimerRunning(running);
            if (status) setSessionStatus(status === 'active' ? 'active' : status);
        });

        socket.on('call-ended', () => {
            if (!isMounted) return;
            clearInterval(timerRef.current);
            setTimerRunning(false);
            setRemainingMs(0);
            setSessionStatus('completed');
            localStreamRef.current?.getTracks().forEach(t => t.stop());
        });

        socket.on('receive-message', (msg) => {
            if (!isMounted) return;
            setMessages(prev => [...prev, msg]);
        });

        // ── Get media then connect ────────────────────────────────────────────
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                if (!isMounted) { stream.getTracks().forEach(t => t.stop()); return; }
                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                // Create peer connection AFTER we have media
                createPeerConnection(socket);

                // Init session then join
                fetch(`${TELE_URL}/session/init`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appointmentId, patientId: role === 'patient' ? user?.id : undefined, doctorId: role === 'doctor' ? user?.id : undefined, date, time })
                }).catch(() => {}).finally(() => {
                    socket.emit('join-session', { appointmentId, role, name });
                });
            })
            .catch(() => {
                setMediaError('Camera/Microphone access denied or unavailable.');
                // Still join session (audio-only or observer)
                createPeerConnection(socket);
                fetch(`${TELE_URL}/session/init`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appointmentId, date, time })
                }).catch(() => {}).finally(() => {
                    socket.emit('join-session', { appointmentId, role, name });
                });
            });

        return () => {
            isMounted = false;
            clearInterval(timerRef.current);
            socket.disconnect();
            pcRef.current?.close();
            pcRef.current = null;
            localStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, [appointmentId, role, name, createPeerConnection]);

    // ── controls ──────────────────────────────────────────────────────────────
    const toggleVideo = () => {
        localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setHasVideo(v => !v);
    };

    const toggleAudio = () => {
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setHasAudio(a => !a);
    };

    const handleEndCall = () => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        pcRef.current?.close();
        socketRef.current?.disconnect();
        if (onEndCall) onEndCall();
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socketRef.current) return;
        socketRef.current.emit('send-message', {
            appointmentId, text: newMessage.trim(), senderRole: role, senderName: name,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setNewMessage('');
    };

    // ── status screens ────────────────────────────────────────────────────────
    if (sessionStatus === 'connecting')
        return <StatusScreen icon={<Clock className="w-10 h-10 text-indigo-400 animate-pulse" />} title="Connecting…" subtitle="Setting up your session" />;
    if (sessionStatus === 'too_early')
        return <StatusScreen icon={<Clock className="w-10 h-10 text-amber-400" />} title="Too Early" subtitle={`Consultation starts at ${slotStart?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}. Join button activates 5 minutes before.`} />;
    if (sessionStatus === 'missed')
        return <StatusScreen icon={<Clock className="w-10 h-10 text-red-400" />} title="Session Missed" subtitle="The appointment slot has passed and was not joined." />;
    if (sessionStatus === 'too_late')
        return <StatusScreen icon={<Clock className="w-10 h-10 text-red-400" />} title="Slot Ended" subtitle="The appointment slot has ended." />;
    if (sessionStatus === 'completed')
        return <StatusScreen icon={<PhoneOff className="w-10 h-10 text-slate-400" />} title="Call Ended" subtitle="This consultation has been completed." onClose={onEndCall} />;
    if (sessionStatus === 'error')
        return <StatusScreen icon={<PhoneOff className="w-10 h-10 text-red-400" />} title="Session Error" subtitle="Could not connect to this session." onClose={onEndCall} />;

    // ── main call UI ──────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col w-full rounded-2xl overflow-hidden shadow-2xl bg-gray-900">

            {/* timer bar */}
            <div className={`flex items-center justify-between px-6 py-3 ${timerRunning ? 'bg-indigo-700' : 'bg-gray-800'}`}>
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Clock className="w-4 h-4" />
                    {timerRunning
                        ? <span>Time Remaining: <span className={`font-mono text-lg ${remainingMs < 120000 ? 'text-red-300' : 'text-white'}`}>{formatMs(remainingMs)}</span></span>
                        : <span className="text-gray-300">Waiting for {role === 'patient' ? 'doctor' : 'patient'} to join…</span>
                    }
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-xs">
                    <Users className="w-4 h-4" />
                    {otherPresent || timerRunning ? '2 participants' : '1 participant'}
                </div>
            </div>

            <div className="flex w-full" style={{ height: 460 }}>

                {/* video area */}
                <div className="relative flex-1 flex items-center justify-center bg-gray-900">
                    {mediaError ? (
                        <div className="text-white text-center px-6">
                            <p className="text-lg mb-2">Could not start video.</p>
                            <p className="text-gray-400 text-sm">{mediaError}</p>
                        </div>
                    ) : (
                        <>
                            {/* remote video (full area) */}
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className={`absolute inset-0 w-full h-full object-cover ${remoteStream ? '' : 'hidden'}`}
                            />

                            {/* placeholder when remote not yet streaming */}
                            {!remoteStream && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <div className="text-center text-gray-500">
                                        <Video className="w-14 h-14 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">{otherPresent ? 'Establishing video connection…' : 'Waiting for other participant…'}</p>
                                    </div>
                                </div>
                            )}

                            {/* local PiP */}
                            <div className="absolute bottom-16 right-4 w-44 h-32 bg-gray-950 rounded-xl overflow-hidden border-2 border-gray-700 shadow-xl z-10">
                                <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${hasVideo ? '' : 'hidden'}`} />
                                {!hasVideo && (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                        <VideoOff className="w-7 h-7 text-gray-500" />
                                    </div>
                                )}
                            </div>

                            {/* controls */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 bg-gray-900/80 backdrop-blur px-5 py-2.5 rounded-full border border-gray-700 z-10">
                                <button onClick={toggleAudio} className={`p-3 rounded-full transition ${hasAudio ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 text-white'}`}>
                                    {hasAudio ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                </button>
                                <button onClick={toggleVideo} className={`p-3 rounded-full transition ${hasVideo ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 text-white'}`}>
                                    {hasVideo ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                                </button>
                                <button onClick={handleEndCall} className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition">
                                    <PhoneOff className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* chat */}
                <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="px-4 py-3 bg-gray-900 text-white text-sm font-semibold border-b border-gray-700">Session Chat</div>
                    <div className="flex-1 p-3 overflow-y-auto space-y-2">
                        {messages.map((msg, i) => {
                            const isMe = msg.senderRole === role;
                            return (
                                <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-gray-400 mb-0.5">{msg.senderName} · {msg.time}</span>
                                    <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] break-words ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={sendMessage} className="p-3 border-t border-gray-700 bg-gray-900 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Type message…"
                            className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm placeholder-gray-500"
                        />
                        <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">Send</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function StatusScreen({ icon, title, subtitle, onClose }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-900 rounded-2xl text-center px-8 py-12 gap-4">
            {icon}
            <h3 className="text-white text-xl font-bold">{title}</h3>
            <p className="text-gray-400 text-sm max-w-xs">{subtitle}</p>
            {onClose && (
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-gray-700 text-white rounded-xl text-sm hover:bg-gray-600 transition">Close</button>
            )}
        </div>
    );
}
