import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Clock, Users, MessageSquare } from 'lucide-react';
import { io } from 'socket.io-client';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useAuth } from '../context/AuthContext';
import { getTelemedicineServiceUrl } from '../config/api';

const TELE_URL = getTelemedicineServiceUrl();

function fmt(ms) {
    if (ms <= 0) return '00:00';
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function normalizeSessionTime(value) {
    if (typeof value !== 'string') return '';

    const trimmed = value.trim();
    if (!trimmed) return '';

    const rangeSafe = trimmed.split('-')[0].trim();

    // Already contains AM/PM; normalize spacing/casing.
    const twelveHour = rangeSafe.match(/^(\d{1,2}):(\d{2})\s*([aApP][mM])$/);
    if (twelveHour) {
        let hours = Number(twelveHour[1]);
        const minutes = twelveHour[2];
        const meridiem = twelveHour[3].toUpperCase();
        if (Number.isNaN(hours)) return trimmed;
        hours = hours % 12;
        if (hours === 0) hours = 12;
        return `${hours}:${minutes} ${meridiem}`;
    }

    // Convert 24-hour HH:mm to h:mm AM/PM for backend compatibility.
    const twentyFourHour = rangeSafe.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (twentyFourHour) {
        let hours = Number(twentyFourHour[1]);
        const minutes = twentyFourHour[2];
        const meridiem = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;
        return `${hours}:${minutes} ${meridiem}`;
    }

    return trimmed;
}

function deriveAgoraUid(seed) {
    const input = typeof seed === 'string' ? seed : String(seed || 'user');
    let hash = 7;

    for (let i = 0; i < input.length; i += 1) {
        hash = ((hash * 31) + input.charCodeAt(i)) >>> 0;
    }

    return (hash % 2147483000) + 1;
}

function StatusScreen({ icon, title, subtitle, onClose, children }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[320px] bg-gray-900 rounded-2xl text-center px-8 py-12 gap-4">
            {icon}
            <h3 className="text-white text-xl font-bold">{title}</h3>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed">{subtitle}</p>
            {children}
            {onClose && (
                <button onClick={onClose} className="mt-2 px-6 py-2 bg-gray-700 text-white rounded-xl text-sm hover:bg-gray-600 transition">
                    Close
                </button>
            )}
        </div>
    );
}

export default function VideoCall({ appointmentId, date, time, onEndCall }) {
    const { user, token } = useAuth();
    const role = user?.role;
    const name = user?.name || role;

    // refs
    const localVideoRef  = useRef(null);
    const remoteVideoRef = useRef(null);
    const socketRef      = useRef(null);
    const agoraClientRef = useRef(null);
    const localTracksRef = useRef({ audioTrack: null, videoTrack: null });
    const tickRef        = useRef(null);
    const chatEndRef     = useRef(null);

    // media
    const [hasVideo,     setHasVideo]     = useState(true);
    const [hasAudio,     setHasAudio]     = useState(true);
    const [mediaError,   setMediaError]   = useState('');
    const [remoteStream, setRemoteStream] = useState(false);

    // session
    const [phase,        setPhase]        = useState('connecting');
    const [remainingMs,  setRemainingMs]  = useState(null);
    const [timerRunning, setTimerRunning] = useState(false);
    const [slotStart,    setSlotStart]    = useState(null);
    const [otherPresent, setOtherPresent] = useState(false);
    const [sessionError, setSessionError] = useState('');

    // chat
    const [messages,    setMessages]    = useState([]);
    const [newMessage,  setNewMessage]  = useState('');
    const [showChat,    setShowChat]    = useState(true);

    // ── local countdown ───────────────────────────────────────────────────────
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
    }, [timerRunning]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // ── Agora + session bootstrap ────────────────────────────────────────────
    useEffect(() => {
        if (!appointmentId || !role) return;

        const normalizedTime = normalizeSessionTime(time);

        if (!TELE_URL) {
            setSessionError('Telemedicine service is not configured for this environment.');
            setPhase('error');
            return;
        }

        let mounted = true;

        const socket = io(TELE_URL, { transports: ['websocket'] });
        socketRef.current = socket;

        const clearRemoteVideo = () => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.innerHTML = '';
            }
        };

        const syncAgoraPresence = () => {
            const client = agoraClientRef.current;
            if (!client) return;

            const anyRemoteVideo = client.remoteUsers.some((remoteUser) => !!remoteUser.videoTrack);
            setRemoteStream(anyRemoteVideo);
            setOtherPresent(client.remoteUsers.length > 0);

            if (!anyRemoteVideo) {
                clearRemoteVideo();
            }
        };

        // ── session handlers ──────────────────────────────────────────────────
        socket.on('session-joined', ({ status, remainingMs: rem, running, slotStart: ss, chat }) => {
            if (!mounted) return;
            setPhase(status === 'active' ? 'active' : 'waiting');
            setRemainingMs(rem);
            setTimerRunning(!!running);
            setSlotStart(ss ? new Date(ss) : null);
            setMessages(chat || []);
        });

        // backend sends `message` field (not `code`) — fixed here
        socket.on('session-error', ({ message, slotStart: ss }) => {
            if (!mounted) return;
            if (message === 'too_early')  { setPhase('too_early'); setSlotStart(ss ? new Date(ss) : null); }
            else if (message === 'too_late') setPhase('missed');
            else if (message === 'completed') setPhase('completed');
            else {
                const fallbackMessage = message === 'not_found'
                    ? 'Session is not ready yet. Please retry in a moment.'
                    : 'Could not connect to this session.';
                setSessionError(fallbackMessage);
                setPhase('error');
            }
        });

        socket.on('participant-joined', () => {
            if (!mounted) return;
            setOtherPresent(true);
        });

        socket.on('participant-left', () => {
            if (!mounted) return;
            syncAgoraPresence();
        });

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

            const { audioTrack, videoTrack } = localTracksRef.current;
            if (audioTrack) {
                audioTrack.stop();
                audioTrack.close();
            }
            if (videoTrack) {
                videoTrack.stop();
                videoTrack.close();
            }
            localTracksRef.current = { audioTrack: null, videoTrack: null };

            const client = agoraClientRef.current;
            agoraClientRef.current = null;
            if (client) {
                client.removeAllListeners();
                void client.leave().catch(() => {});
            }

            clearRemoteVideo();
            setRemoteStream(false);
            setOtherPresent(false);
        });

        socket.on('receive-message', msg => {
            if (mounted) setMessages(prev => [...prev, msg]);
        });

        const joinSession = async () => {
            try {
                const initRes = await fetch(`${TELE_URL}/session/init`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        appointmentId,
                        patientId: role === 'patient' ? user?.id : undefined,
                        doctorId:  role === 'doctor'  ? user?.id : undefined,
                        date,
                        time: normalizedTime || time
                    })
                });

                if (!initRes.ok) {
                    let initError = 'Failed to initialize consultation session.';
                    try {
                        const payload = await initRes.json();
                        if (payload?.error) {
                            initError = payload.error;
                        }
                    } catch (_) {
                        // Ignore body parse errors and use generic message.
                    }
                    throw new Error(initError);
                }
            } catch (err) {
                console.error('Session init failed:', err);
            } finally {
                socket.emit('join-session', { appointmentId, role, name });
            }
        };

        const initializeAgora = async () => {
            try {
                const uidSeed = user?.id ? `${role}-${user.id}` : `${role}-${appointmentId}`;
                const fallbackUid = deriveAgoraUid(uidSeed);

                const tokenRes = await fetch(`${TELE_URL}/agora/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        appointmentId,
                        role,
                        uid: fallbackUid
                    })
                });

                if (!tokenRes.ok) {
                    let tokenError = 'Failed to get Agora session token.';
                    try {
                        const payload = await tokenRes.json();
                        if (payload?.error) {
                            tokenError = payload.error;
                        }
                    } catch (_) {
                        // Ignore body parse errors and keep generic message.
                    }
                    throw new Error(tokenError);
                }

                const tokenPayload = await tokenRes.json();
                const appId = tokenPayload?.appId;
                const channelName = tokenPayload?.channelName;
                const rtcToken = tokenPayload?.token;
                const uid = Number(tokenPayload?.uid) || fallbackUid;

                if (!appId || !channelName || !rtcToken) {
                    throw new Error('Invalid Agora token response.');
                }

                const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
                agoraClientRef.current = client;

                client.on('user-published', async (remoteUser, mediaType) => {
                    try {
                        await client.subscribe(remoteUser, mediaType);

                        if (mediaType === 'video' && remoteUser.videoTrack && remoteVideoRef.current) {
                            clearRemoteVideo();
                            remoteUser.videoTrack.play(remoteVideoRef.current);
                        }

                        if (mediaType === 'audio' && remoteUser.audioTrack) {
                            remoteUser.audioTrack.play();
                        }

                        syncAgoraPresence();
                    } catch (err) {
                        console.error('Agora subscribe error:', err);
                    }
                });

                client.on('user-unpublished', (remoteUser, mediaType) => {
                    if (mediaType === 'audio' && remoteUser.audioTrack) {
                        remoteUser.audioTrack.stop();
                    }
                    if (mediaType === 'video') {
                        clearRemoteVideo();
                    }
                    syncAgoraPresence();
                });

                client.on('user-left', () => {
                    clearRemoteVideo();
                    syncAgoraPresence();
                });

                await client.join(appId, channelName, rtcToken, uid);

                try {
                    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                    if (!mounted) {
                        audioTrack.close();
                        videoTrack.close();
                        return;
                    }

                    localTracksRef.current = { audioTrack, videoTrack };

                    if (localVideoRef.current) {
                        videoTrack.play(localVideoRef.current);
                    }

                    setMediaError('');
                    setHasAudio(true);
                    setHasVideo(true);

                    await client.publish([audioTrack, videoTrack]);
                } catch (mediaErr) {
                    console.error('Agora local track error:', mediaErr);
                    setMediaError('Camera/Microphone access denied.');
                    localTracksRef.current = { audioTrack: null, videoTrack: null };
                }

                await joinSession();
                syncAgoraPresence();
            } catch (err) {
                console.error('Agora initialization failed:', err);
                if (mounted) {
                    setSessionError(err?.message || 'Failed to connect to consultation channel.');
                    setPhase('error');
                }
            }
        };

        socket.on('connect_error', () => {
            if (!mounted) return;
            setSessionError('Could not connect to telemedicine session server.');
            setPhase('error');
        });

        void initializeAgora();

        return () => {
            mounted = false;
            clearInterval(tickRef.current);
            socket.disconnect();

            const { audioTrack, videoTrack } = localTracksRef.current;
            if (audioTrack) {
                audioTrack.stop();
                audioTrack.close();
            }
            if (videoTrack) {
                videoTrack.stop();
                videoTrack.close();
            }
            localTracksRef.current = { audioTrack: null, videoTrack: null };

            const client = agoraClientRef.current;
            agoraClientRef.current = null;
            if (client) {
                client.removeAllListeners();
                void client.leave().catch(() => {});
            }

            clearRemoteVideo();
        };
    }, [appointmentId, role, name, date, time, user?.id, token]);

    // ── controls ──────────────────────────────────────────────────────────────
    const toggleVideo = async () => {
        const videoTrack = localTracksRef.current.videoTrack;
        if (!videoTrack) return;

        const nextEnabled = !hasVideo;
        try {
            await videoTrack.setEnabled(nextEnabled);
            setHasVideo(nextEnabled);
        } catch (err) {
            console.error('Video toggle failed:', err);
        }
    };
    const toggleAudio = async () => {
        const audioTrack = localTracksRef.current.audioTrack;
        if (!audioTrack) return;

        const nextEnabled = !hasAudio;
        try {
            await audioTrack.setEnabled(nextEnabled);
            setHasAudio(nextEnabled);
        } catch (err) {
            console.error('Audio toggle failed:', err);
        }
    };
    const handleEndCall = () => {
        const { audioTrack, videoTrack } = localTracksRef.current;
        if (audioTrack) {
            audioTrack.stop();
            audioTrack.close();
        }
        if (videoTrack) {
            videoTrack.stop();
            videoTrack.close();
        }
        localTracksRef.current = { audioTrack: null, videoTrack: null };

        const client = agoraClientRef.current;
        agoraClientRef.current = null;
        if (client) {
            client.removeAllListeners();
            void client.leave().catch(() => {});
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.innerHTML = '';
        }

        socketRef.current?.disconnect();
        onEndCall?.();
    };
    const sendMessage = e => {
        e.preventDefault();
        if (!newMessage.trim() || !socketRef.current) return;
        socketRef.current.emit('send-message', {
            appointmentId, text: newMessage.trim(), senderRole: role, senderName: name,
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
        const d = slotStart?.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) ?? '';
        return (
            <StatusScreen icon={<Clock className="w-12 h-12 text-amber-400" />}
                title="Consultation Not Started Yet"
                subtitle={`Your appointment is scheduled for ${d} at ${t}.`}>
                <div className="mt-2 px-5 py-3 bg-amber-900/30 border border-amber-700/40 rounded-xl text-amber-300 text-sm font-medium">
                    The Join button activates 5 minutes before your slot.
                </div>
            </StatusScreen>
        );
    }
    if (phase === 'missed') return (
        <StatusScreen icon={<Clock className="w-10 h-10 text-red-400" />}
            title="Session Missed" subtitle="The appointment slot passed without anyone joining." onClose={onEndCall} />
    );
    if (phase === 'completed') return (
        <StatusScreen icon={<PhoneOff className="w-10 h-10 text-slate-400" />}
            title="Call Ended" subtitle="This consultation has been completed." onClose={onEndCall}>
            {messages.length > 0 && (
                <div className="w-full max-w-sm mt-2 bg-gray-800 rounded-xl overflow-hidden">
                    <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">Session Chat History</p>
                    <div className="max-h-48 overflow-y-auto p-3 space-y-2">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.senderRole === role ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-gray-500 mb-0.5">{msg.senderName} · {msg.time}</span>
                                <div className={`px-3 py-1.5 rounded-lg text-xs max-w-[90%] break-words
                                    ${msg.senderRole === role ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </StatusScreen>
    );
    if (phase === 'error') return (
        <StatusScreen icon={<PhoneOff className="w-10 h-10 text-red-400" />}
            title="Session Error" subtitle={sessionError || 'Could not connect to this session.'} onClose={onEndCall} />
    );

    // ── timer bar color ───────────────────────────────────────────────────────
    const timerBarClass = !timerRunning
        ? 'bg-gray-800'
        : remainingMs < 60000   ? 'bg-red-700 animate-pulse'
        : remainingMs < 300000  ? 'bg-orange-700'
        : 'bg-indigo-700';

    const timerTextClass = remainingMs < 60000
        ? 'text-red-200 animate-pulse'
        : remainingMs < 300000
        ? 'text-orange-200'
        : 'text-white';

    // ── main call UI ──────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col w-full rounded-2xl overflow-hidden shadow-2xl bg-gray-900">

            {/* Timer bar */}
            <div className={`flex items-center justify-between px-6 py-3 transition-colors duration-1000 ${timerBarClass}`}>
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Clock className="w-4 h-4 shrink-0" />
                    {timerRunning ? (
                        <span>
                            Time Remaining:&nbsp;
                            <span className={`font-mono text-lg font-black ${timerTextClass}`}>{fmt(remainingMs)}</span>
                            {remainingMs < 300000 && remainingMs > 0 && (
                                <span className="ml-2 text-xs font-normal opacity-80">
                                    {remainingMs < 60000 ? '⚠ Less than 1 minute!' : '⚠ 5 minutes remaining'}
                                </span>
                            )}
                        </span>
                    ) : (
                        <span className="text-gray-300">Waiting for {role === 'patient' ? 'doctor' : 'patient'} to join…</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-gray-300 text-xs">
                        <Users className="w-4 h-4" />
                        {otherPresent || phase === 'active' ? '2 participants' : '1 participant'}
                    </div>
                    <button onClick={() => setShowChat(c => !c)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-white">
                        <MessageSquare className="w-4 h-4" />
                    </button>
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
                            {/* Remote video */}
                            <div ref={remoteVideoRef}
                                className={`absolute inset-0 w-full h-full ${remoteStream ? '' : 'hidden'}`} />

                            {/* Remote placeholder */}
                            {!remoteStream && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <div className="text-center text-gray-500">
                                        <Video className="w-14 h-14 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">
                                            {otherPresent ? 'Establishing video connection…' : `Waiting for ${role === 'patient' ? 'doctor' : 'patient'} to join…`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Local PiP */}
                            <div className="absolute bottom-16 right-4 w-44 h-32 bg-gray-950 rounded-xl overflow-hidden border-2 border-gray-700 shadow-xl z-10">
                                <div ref={localVideoRef}
                                    className={`w-full h-full ${hasVideo ? '' : 'hidden'}`} />
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

                {/* Chat panel */}
                {showChat && (
                    <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
                        <div className="px-4 py-3 bg-gray-900 text-white text-sm font-semibold border-b border-gray-700">
                            Session Chat
                        </div>
                        <div className="flex-1 p-3 overflow-y-auto space-y-2">
                            {messages.length === 0 && (
                                <p className="text-xs text-gray-500 text-center mt-4">No messages yet</p>
                            )}
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
                            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                                placeholder="Type message…"
                                className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm placeholder-gray-500" />
                            <button type="submit"
                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                                Send
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
