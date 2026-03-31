import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Clock, Users } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const TELE_URL = 'http://localhost:3004';

function fmt(ms) {
    if (ms <= 0) return '00:00';
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function StatusScreen({ icon, title, subtitle, onClose }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[320px] bg-gray-900 rounded-2xl text-center px-8 py-12 gap-4">
            {icon}
            <h3 className="text-white text-xl font-bold">{title}</h3>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed">{subtitle}</p>
            {onClose && (
                <button onClick={onClose} className="mt-2 px-6 py-2 bg-gray-700 text-white rounded-xl text-sm hover:bg-gray-600 transition">
                    Close
                </button>
            )}
        </div>
    );
}

/**
 * Props:
 *   appointmentId  – MongoDB appointment _id
 *   date           – "YYYY-MM-DD"
 *   time           – "2:00 PM"
 *   onEndCall      – callback when user closes the call
 */
export default function VideoCall({ appointmentId, date, time, onEndCall }) {
    const { user } = useAuth();
    const role = user?.role;   // 'patient' | 'doctor'
    const name = user?.name || role;

    const localVideoRef = useRef(null);
    const socketRef     = useRef(null);
    const tickRef       = useRef(null);

    const [mediaError,     setMediaError]     = useState('');
    const [hasVideo,       setHasVideo]       = useState(true);
    const [hasAudio,       setHasAudio]       = useState(true);
    const [stream,         setStream]         = useState(null);

    // session state
    const [phase,          setPhase]          = useState('connecting');
    // phase: connecting | waiting | active | completed | missed | too_early | too_late | error
    const [remainingMs,    setRemainingMs]     = useState(null);
    const [timerRunning,   setTimerRunning]    = useState(false);
    const [slotStart,      setSlotStart]       = useState(null);
    const [otherPresent,   setOtherPresent]    = useState(false);

    // chat
    const [messages,    setMessages]    = useState([]);
    const [newMessage,  setNewMessage]  = useState('');
    const chatEndRef = useRef(null);

    // ── local countdown tick ──────────────────────────────────────────────────
    useEffect(() => {
        clearInterval(tickRef.current);
        if (timerRunning && remainingMs > 0) {
            tickRef.current = setInterval(() => {
                setRemainingMs(prev => {
                    if (prev <= 1000) { clearInterval(tickRef.current); return 0; }
                    return prev - 1000;
                });
            }, 1000);
        }
        return () => clearInterval(tickRef.current);
    }, [timerRunning]); // only re-run when running state changes

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const stopMedia = useCallback(() => {
        setStream(prev => {
            prev?.getTracks().forEach(t => t.stop());
            return null;
        });
    }, []);

    // ── main effect: media + socket ───────────────────────────────────────────
    useEffect(() => {
        if (!appointmentId || !role) return;
        let mounted = true;

        // local camera
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(s => {
                if (!mounted) { s.getTracks().forEach(t => t.stop()); return; }
                setStream(s);
                if (localVideoRef.current) localVideoRef.current.srcObject = s;
            })
            .catch(() => setMediaError('Camera/Microphone access denied or unavailable.'));

        // init session in DB (idempotent), then connect socket
        fetch(`${TELE_URL}/session/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appointmentId,
                patientId: role === 'patient' ? user?.id : undefined,
                doctorId:  role === 'doctor'  ? user?.id : undefined,
                date, time
            })
        }).catch(() => {}); // best-effort; socket handles errors

        const socket = io(TELE_URL, { transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-session', { appointmentId, role, name });
        });

        socket.on('session-joined', ({ status, remainingMs: rem, running, slotStart: ss, chat }) => {
            if (!mounted) return;
            setPhase(status === 'active' ? 'active' : 'waiting');
            setRemainingMs(rem);
            setTimerRunning(!!running);
            setSlotStart(ss ? new Date(ss) : null);
            setMessages(chat || []);
        });

        socket.on('session-error', ({ code, slotStart: ss, completedAt }) => {
            if (!mounted) return;
            if (code === 'too_early') { setPhase('too_early'); setSlotStart(ss ? new Date(ss) : null); }
            else if (code === 'missed')    setPhase('missed');
            else if (code === 'completed') setPhase('completed');
            else                           setPhase('error');
        });

        socket.on('participant-joined', () => { if (mounted) setOtherPresent(true); });
        socket.on('participant-left',   () => { if (mounted) setOtherPresent(false); });

        socket.on('timer-sync', ({ remainingMs: rem, running, status }) => {
            if (!mounted) return;
            setRemainingMs(rem);
            setTimerRunning(!!running);
            if (status === 'active')  setPhase('active');
            if (status === 'waiting') setPhase('waiting');
        });

        socket.on('call-ended', () => {
            if (!mounted) return;
            clearInterval(tickRef.current);
            setTimerRunning(false);
            setRemainingMs(0);
            setPhase('completed');
            stopMedia();
        });

        socket.on('receive-message', msg => {
            if (mounted) setMessages(prev => [...prev, msg]);
        });

        return () => {
            mounted = false;
            clearInterval(tickRef.current);
            socket.disconnect();
            stopMedia();
        };
    }, [appointmentId, role, name, date, time, stopMedia, user?.id]);

    // ── controls ──────────────────────────────────────────────────────────────
    const toggleVideo = () => {
        stream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setHasVideo(v => !v);
    };
    const toggleAudio = () => {
        stream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setHasAudio(a => !a);
    };
    const handleEndCall = () => {
        stopMedia();
        socketRef.current?.disconnect();
        onEndCall?.();
    };
    const sendMessage = e => {
        e.preventDefault();
        if (!newMessage.trim() || !socketRef.current) return;
        socketRef.current.emit('send-message', {
            appointmentId,
            text: newMessage.trim(),
            senderRole: role,
            senderName: name,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setNewMessage('');
    };

    // ── status screens ────────────────────────────────────────────────────────
    if (phase === 'connecting') return (
        <StatusScreen icon={<Clock className="w-10 h-10 text-indigo-400 animate-pulse" />}
            title="Connecting…" subtitle="Setting up your session" />
    );
    if (phase === 'too_early') {
        const t = slotStart?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '';
        return (
            <StatusScreen icon={<Clock className="w-10 h-10 text-amber-400" />}
                title="Too Early"
                subtitle={`Consultation starts at ${t}. The Join button activates 5 minutes before.`} />
        );
    }
    if (phase === 'missed') return (
        <StatusScreen icon={<Clock className="w-10 h-10 text-red-400" />}
            title="Session Missed"
            subtitle="The appointment slot passed without anyone joining." />
    );
    if (phase === 'completed') return (
        <StatusScreen icon={<PhoneOff className="w-10 h-10 text-slate-400" />}
            title="Call Ended"
            subtitle="This consultation has been completed."
            onClose={onEndCall} />
    );
    if (phase === 'error') return (
        <StatusScreen icon={<PhoneOff className="w-10 h-10 text-red-400" />}
            title="Session Error"
            subtitle="Could not connect to this session."
            onClose={onEndCall} />
    );

    // ── main call UI ──────────────────────────────────────────────────────────
    const bothIn = otherPresent || phase === 'active';

    return (
        <div className="flex flex-col w-full rounded-2xl overflow-hidden shadow-2xl bg-gray-900">

            {/* Timer bar */}
            <div className={`flex items-center justify-between px-6 py-3 ${timerRunning ? 'bg-indigo-700' : 'bg-gray-800'}`}>
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Clock className="w-4 h-4 shrink-0" />
                    {timerRunning ? (
                        <span>
                            Time Remaining:&nbsp;
                            <span className={`font-mono text-lg ${remainingMs < 120000 ? 'text-red-300' : 'text-white'}`}>
                                {fmt(remainingMs)}
                            </span>
                        </span>
                    ) : (
                        <span className="text-gray-300">
                            Waiting for {role === 'patient' ? 'doctor' : 'patient'} to join…
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-gray-300 text-xs">
                    <Users className="w-4 h-4" />
                    {bothIn ? '2 participants' : '1 participant'}
                </div>
            </div>

            <div className="flex" style={{ height: 460 }}>
                {/* Video area */}
                <div className="relative flex-1 flex items-center justify-center bg-gray-900">
                    {mediaError ? (
                        <div className="text-white text-center px-6">
                            <p className="text-lg mb-2">Could not start video.</p>
                            <p className="text-gray-400 text-sm">{mediaError}</p>
                        </div>
                    ) : (
                        <>
                            {/* Remote placeholder */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                <div className="text-center text-gray-500">
                                    <Video className="w-14 h-14 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">{bothIn ? 'Remote video stream' : 'Waiting for other participant…'}</p>
                                </div>
                            </div>

                            {/* Local PiP */}
                            <div className="absolute bottom-16 right-4 w-44 h-32 bg-gray-950 rounded-xl overflow-hidden border-2 border-gray-700 shadow-xl z-10">
                                <video ref={localVideoRef} autoPlay playsInline muted
                                    className={`w-full h-full object-cover ${hasVideo ? '' : 'hidden'}`} />
                                {!hasVideo && (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                        <VideoOff className="w-7 h-7 text-gray-500" />
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 bg-gray-900/80 backdrop-blur px-5 py-2.5 rounded-full border border-gray-700 z-10">
                                <button onClick={toggleAudio}
                                    className={`p-3 rounded-full transition ${hasAudio ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 text-white'}`}>
                                    {hasAudio ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                </button>
                                <button onClick={toggleVideo}
                                    className={`p-3 rounded-full transition ${hasVideo ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 text-white'}`}>
                                    {hasVideo ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                                </button>
                                <button onClick={handleEndCall}
                                    className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition">
                                    <PhoneOff className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Chat */}
                <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="px-4 py-3 bg-gray-900 text-white text-sm font-semibold border-b border-gray-700">
                        Session Chat
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto space-y-2">
                        {messages.map((msg, i) => {
                            const isMe = msg.senderRole === role;
                            return (
                                <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-gray-400 mb-0.5">{msg.senderName} · {msg.time}</span>
                                    <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] break-words
                                        ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
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
                        <button type="submit"
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
