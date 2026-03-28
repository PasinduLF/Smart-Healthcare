import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Send, Trash2, Bot, Plus, AlertTriangle, Phone, UserX } from 'lucide-react';

const EMERGENCY_NUMBERS = [
    { label: 'National Ambulance Service', number: '1990' },
    { label: 'Police Emergency',           number: '119'  },
    { label: 'National Hospital Colombo',  number: '011-2691111' },
];

function EmergencyPanel() {
    const [alone, setAlone] = useState(null); // null | true | false

    return (
        <div className="mt-4 rounded-2xl border-2 border-red-400 bg-red-50 overflow-hidden">
            {/* header */}
            <div className="flex items-center gap-2 bg-red-500 px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-white flex-shrink-0" />
                <p className="text-white font-bold text-sm">Seek Immediate Medical Help</p>
            </div>

            <div className="p-4 space-y-4">
                <p className="text-sm text-red-800 font-medium">
                    Your symptoms indicate a potentially serious condition. Please do not ignore this.
                </p>

                {/* Are you alone? */}
                {alone === null && (
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-red-700">Are you alone right now?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setAlone(true)}  className="flex-1 py-2 rounded-xl border-2 border-red-300 text-red-700 text-sm font-bold hover:bg-red-100 transition">Yes, I'm alone</button>
                            <button onClick={() => setAlone(false)} className="flex-1 py-2 rounded-xl border-2 border-red-300 text-red-700 text-sm font-bold hover:bg-red-100 transition">No, someone is with me</button>
                        </div>
                    </div>
                )}

                {alone === true && (
                    <div className="p-3 bg-red-100 rounded-xl border border-red-300 flex items-start gap-2">
                        <UserX className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-bold text-red-700">Please contact someone immediately or call emergency services. Do not wait.</p>
                    </div>
                )}

                {alone === false && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <p className="text-sm font-semibold text-emerald-700">Good. Ask them to help you get to a hospital or call an ambulance now.</p>
                    </div>
                )}

                {/* Emergency numbers */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider">🇱🇰 Sri Lanka Emergency Numbers</p>
                    {EMERGENCY_NUMBERS.map(e => (
                        <a key={e.number} href={`tel:${e.number}`}
                            className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-red-200 hover:bg-red-50 transition group">
                            <span className="text-sm text-slate-700">{e.label}</span>
                            <span className="flex items-center gap-1.5 font-bold text-red-600 group-hover:text-red-700">
                                <Phone className="w-4 h-4" />{e.number}
                            </span>
                        </a>
                    ))}
                </div>

                {alone !== null && (
                    <button onClick={() => setAlone(null)} className="text-xs text-red-400 hover:text-red-600 underline">← Back</button>
                )}
            </div>
        </div>
    );
}

// ── Severity badge ──────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
    const map = {
        low:       { label: 'Low Risk',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        moderate:  { label: 'Moderate',   cls: 'bg-amber-100  text-amber-700  border-amber-200'  },
        high:      { label: 'High Risk',  cls: 'bg-orange-100 text-orange-700 border-orange-200' },
        emergency: { label: 'Emergency',  cls: 'bg-red-100    text-red-700    border-red-200'    },
    };
    const { label, cls } = map[severity] || map.low;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cls}`}>
            <span className={`w-2 h-2 rounded-full ${severity === 'emergency' ? 'bg-red-500 animate-pulse' : severity === 'high' ? 'bg-orange-500' : severity === 'moderate' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {label}
        </span>
    );
}

// ── AI response card ────────────────────────────────────────────────────────
function AICard({ data }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <SeverityBadge severity={data.severity} />
            </div>

            {data.possibleConditions?.length > 0 && (
                <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">🩺 Possible Conditions</p>
                    <ul className="space-y-1.5">
                        {data.possibleConditions.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className={`mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${c.probability === 'High' ? 'bg-red-50 text-red-600' : c.probability === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{c.probability}</span>
                                <span><span className="font-semibold">{c.name}</span> — {c.description}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {data.recommendedSpecialty && (
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">👨‍⚕️ Recommended Specialty</p>
                    <p className="text-sm font-bold text-indigo-800">{data.recommendedSpecialty}</p>
                </div>
            )}

            {data.lifestyleAdvice?.length > 0 && (
                <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">💡 Advice</p>
                    <ul className="space-y-1">
                        {data.lifestyleAdvice.map((a, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span>{a}</li>
                        ))}
                    </ul>
                </div>
            )}

            {data.whenToSeekEmergencyCare?.length > 0 && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Urgent Signs</p>
                    <ul className="space-y-1">
                        {data.whenToSeekEmergencyCare.map((s, i) => (
                            <li key={i} className="text-sm text-red-700 flex items-start gap-2"><span className="mt-0.5">•</span>{s}</li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="text-xs text-slate-400 italic leading-relaxed">{data.disclaimer}</p>

            {(data.severity === 'high' || data.severity === 'emergency') && (
                <EmergencyPanel />
            )}
        </div>
    );
}

// ── CareBot avatar ──────────────────────────────────────────────────────────
function CareBotAvatar({ size = 'md' }) {
    const s = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
    return (
        <div className={`${s} rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md`}>
            <Bot className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'} color="white" />
        </div>
    );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AIAnalyzer() {
    const { user, token } = useAuth();
    const [sessions, setSessions] = useState([]); // [{id, label, messages:[]}]
    const [activeId, setActiveId] = useState(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [healthProfile, setHealthProfile] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // id to delete
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);

    const STORAGE_KEY = `carebot_sessions_${user?.id}`;

    // load sessions from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            setSessions(parsed);
            if (parsed.length > 0) setActiveId(parsed[0].id);
        }
    }, [user?.id]);

    // persist sessions
    useEffect(() => {
        if (sessions.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }, [sessions]);

    // fetch health profile for context
    useEffect(() => {
        if (!user?.id) return;
        axios.get(`http://localhost:3000/api/patients/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => setHealthProfile(r.data))
            .catch(() => {});
    }, [user?.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sessions, activeId]);

    const activeSession = sessions.find(s => s.id === activeId);

    const newSession = () => {
        const id = Date.now().toString();
        const session = { id, label: 'New Chat', messages: [] };
        setSessions(prev => [session, ...prev]);
        setActiveId(id);
    };

    const deleteSession = (id) => {
        const updated = sessions.filter(s => s.id !== id);
        setSessions(updated);
        if (updated.length === 0) localStorage.removeItem(STORAGE_KEY);
        if (activeId === id) setActiveId(updated[0]?.id || null);
        setConfirmDelete(null);
    };

    const clearAll = () => {
        setSessions([]);
        setActiveId(null);
        localStorage.removeItem(STORAGE_KEY);
        setConfirmDelete(null);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const text = input.trim();
        setInput('');

        // create session if none
        let sid = activeId;
        if (!sid) {
            const id = Date.now().toString();
            const session = { id, label: text.slice(0, 40), messages: [] };
            setSessions(prev => [session, ...prev]);
            setActiveId(id);
            sid = id;
        }

        const userMsg = { role: 'user', text, ts: Date.now() };
        setSessions(prev => prev.map(s => s.id === sid
            ? { ...s, label: s.messages.length === 0 ? text.slice(0, 40) : s.label, messages: [...s.messages, userMsg] }
            : s
        ));

        setLoading(true);
        try {
            const res = await axios.post('http://localhost:3000/api/ai/check-symptoms', {
                symptoms: text,
                patientProfile: healthProfile,
                patientId: user?.id
            }, { headers: { Authorization: `Bearer ${token}` } });

            const aiMsg = { role: 'ai', data: res.data, ts: Date.now() };
            setSessions(prev => prev.map(s => s.id === sid
                ? { ...s, messages: [...s.messages, aiMsg] }
                : s
            ));
        } catch {
            const errMsg = { role: 'ai', data: null, error: 'Failed to get a response. Please try again.', ts: Date.now() };
            setSessions(prev => prev.map(s => s.id === sid
                ? { ...s, messages: [...s.messages, errMsg] }
                : s
            ));
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    return (
        <div className="flex h-[75vh] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">

            {/* ── Sidebar ── */}
            <div className="w-64 flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                        <CareBotAvatar size="sm" />
                        <span className="font-bold text-slate-800 text-sm">CareBot</span>
                    </div>
                    <button onClick={newSession} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition">
                        <Plus className="w-4 h-4" /> New Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.length === 0 && (
                        <p className="text-xs text-slate-400 text-center mt-6 px-2">No chats yet. Start a new one.</p>
                    )}
                    {sessions.map(s => (
                        <div key={s.id}
                            onClick={() => setActiveId(s.id)}
                            className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition text-sm ${activeId === s.id ? 'bg-indigo-100 text-indigo-800 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <span className="truncate flex-1">{s.label || 'Chat'}</span>
                            <button
                                onClick={e => { e.stopPropagation(); setConfirmDelete(s.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 hover:text-red-600 transition text-slate-400"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>

                {sessions.length > 0 && (
                    <div className="p-3 border-t border-slate-200">
                        <button onClick={() => setConfirmDelete('__all__')} className="w-full text-xs text-slate-400 hover:text-red-500 transition py-1">
                            Clear all chats
                        </button>
                    </div>
                )}
            </div>

            {/* ── Chat area ── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-white">
                    <CareBotAvatar />
                    <div>
                        <p className="font-bold text-slate-800 text-sm">CareBot</p>
                        <p className="text-xs text-emerald-500 font-medium">● Online</p>
                    </div>
                </div>

                {/* messages */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-slate-50/50">
                    {!activeSession || activeSession.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-slate-400">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                                <Bot className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-600 text-lg">Hi, I'm CareBot</p>
                                <p className="text-sm mt-1">Describe your symptoms and I'll provide a preliminary health assessment.</p>
                            </div>
                            <p className="text-xs max-w-xs">Not a substitute for professional medical advice.</p>
                        </div>
                    ) : (
                        activeSession.messages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'ai' && <CareBotAvatar />}
                                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                                    {msg.role === 'user' ? (
                                        <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm">
                                            {msg.text}
                                        </div>
                                    ) : msg.error ? (
                                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl rounded-tl-sm text-sm">
                                            {msg.error}
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm">
                                            <AICard data={msg.data} />
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-400 mt-1 px-1">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-sm font-bold text-slate-600">
                                        {user?.name?.[0]?.toUpperCase() || 'P'}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex gap-3 justify-start">
                            <CareBotAvatar />
                            <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm">
                                <div className="flex gap-1.5 items-center h-5">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* input */}
                <div className="px-6 py-4 border-t border-slate-200 bg-white">
                    <div className="flex gap-3 items-end">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 max-h-32"
                            placeholder="Describe your symptoms… (Enter to send)"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || loading}
                            className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition disabled:opacity-40 flex-shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">CareBot provides preliminary suggestions only — always consult a doctor.</p>
                </div>
            </div>

            {/* ── Confirm delete modal ── */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">Delete {confirmDelete === '__all__' ? 'all chats' : 'this chat'}?</p>
                                <p className="text-xs text-slate-500">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                            <button
                                onClick={() => confirmDelete === '__all__' ? clearAll() : deleteSession(confirmDelete)}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
