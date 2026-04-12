import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAiServiceUrl } from '../../config/api';
import { Send, Trash2, Trash, Stethoscope, Phone, UserX, Plus, Bot } from 'lucide-react';

function SeverityBadge({ severity }) {
    const map = {
        low:    { label: 'Low Risk',  bg: 'bg-emerald-100', text: 'text-emerald-700', emoji: '🟢', pulse: false },
        medium: { label: 'Moderate',  bg: 'bg-amber-100',   text: 'text-amber-700',   emoji: '�', pulse: false },
        high:   { label: 'High Risk', bg: 'bg-red-100',     text: 'text-red-700',     emoji: '�', pulse: true  },
    };
    const s = map[severity] || map.low;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
            <span className={s.pulse ? 'animate-pulse' : ''}>{s.emoji}</span>
            {s.label}
        </span>
    );
}

const EMERGENCY_NUMBERS = [
    { label: 'Suwaseriya Ambulance', number: '1990' },
    { label: 'Police Emergency',     number: '110'  },
    { label: 'Ministry of Health',   number: '118'  },
];

function EmergencyPanel() {
    const [alone, setAlone] = useState(null);
    return (
        <div className="mt-3 rounded-2xl border border-orange-200 overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <p className="text-orange-800 font-bold text-sm">Medical Attention Recommended</p>
            </div>
            <div className="bg-white px-4 py-4 space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                    Your symptoms may require prompt medical attention. Please consider contacting a healthcare provider soon.
                </p>
                {alone === null && (
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-700">Are you alone right now?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setAlone(true)} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition">Yes, I am alone</button>
                            <button onClick={() => setAlone(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition">No, someone is with me</button>
                        </div>
                    </div>
                )}
                {alone === true && (
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
                        <UserX className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-orange-800 font-medium">Please contact someone nearby or call emergency services. Try not to be alone right now.</p>
                    </div>
                )}
                {alone === false && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <p className="text-sm text-emerald-700 font-medium">Good. Ask them to help you reach a hospital or call for assistance if needed.</p>
                    </div>
                )}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Emergency Contacts — Sri Lanka
                    </p>
                    {EMERGENCY_NUMBERS.map(e => (
                        <a key={e.number} href={`tel:${e.number}`}
                            className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition group">
                            <span className="text-sm text-slate-600">{e.label}</span>
                            <span className="flex items-center gap-1.5 font-bold text-indigo-600 text-sm">
                                <Phone className="w-3.5 h-3.5" />{e.number}
                            </span>
                        </a>
                    ))}
                </div>
                {alone !== null && <button onClick={() => setAlone(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">Back</button>}
            </div>
        </div>
    );
}

function AICard({ data }) {
    const severityBg = {
        low:    'bg-emerald-50 border-emerald-200',
        medium: 'bg-amber-50   border-amber-200',
        high:   'bg-red-50     border-red-200',
    }[data.severity] || 'bg-slate-50 border-slate-200';

    return (
        <div className={`rounded-2xl rounded-tl-sm border shadow-sm overflow-hidden max-w-[88%] ${severityBg}`}>
            {/* Header row: avatar + name on left, badge on right */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow">
                        <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">CareBot</span>
                </div>
                <SeverityBadge severity={data.severity} />
            </div>

            <div className="px-4 pb-5 space-y-3">

                {/* Possible conditions */}
                {data.possibleConditions?.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-white/80 shadow-sm">
                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">🩺 Possible Conditions</p>
                        <ul className="space-y-2">
                            {data.possibleConditions.map((c, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />
                                    <span className="text-sm text-slate-700 leading-snug">{c}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Recommended specialty */}
                {data.recommendedSpecialty && (
                    <div className="bg-indigo-600 rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Stethoscope className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">👨‍⚕️ Recommended Specialist</p>
                            <p className="text-white font-extrabold text-base mt-0.5">{data.recommendedSpecialty}</p>
                        </div>
                    </div>
                )}

                {/* Advice */}
                {data.advice?.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-white/80 shadow-sm">
                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">💡 Health Advice</p>
                        <ul className="space-y-2">
                            {data.advice.map((a, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-2" />
                                    <span className="text-sm text-slate-700 leading-snug">{a}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Warning signs — high only */}
                {data.severity === 'high' && data.urgentSigns?.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
                        <p className="text-xs font-extrabold text-red-500 uppercase tracking-widest mb-3">⚠️ Warning Signs</p>
                        <ul className="space-y-2">
                            {data.urgentSigns.map((s, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-2" />
                                    <span className="text-sm text-red-700 leading-snug">{s}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {data.severity === 'high' && <EmergencyPanel />}

                <p className="text-xs text-slate-400 text-center pt-2 border-t border-black/5 leading-relaxed">
                    AI-generated guidance only — not medical advice.<br />Always consult a licensed healthcare professional.
                </p>
            </div>
        </div>
    );
}

function CareBotAvatar({ size = 'md' }) {
    const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-9 h-9';
    const ico = size === 'sm' ? 'w-4 h-4'  : size === 'lg' ? 'w-7 h-7'  : 'w-5 h-5';
    return (
        <div className={`${dim} rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md`}>
            <Bot className={`${ico} text-white`} />
        </div>
    );
}

export default function AIAnalyzer() {
    const { user, token } = useAuth();
    const [input, setInput]           = useState('');
    const [messages, setMessages]     = useState([]);
    const [loading, setLoading]       = useState(false);
    const [history, setHistory]       = useState([]);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const bottomRef = useRef(null);
    const MAX_CHARS = 300;

    useEffect(() => { if (user?.id) fetchHistory(); }, [user]);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(getAiServiceUrl(`/history/${user.id}`), { headers: { Authorization: `Bearer ${token}` } });
            setHistory(res.data);
        } catch (e) { console.error(e); }
    };

    const loadSession = (h) => {
        let parsed;
        try { parsed = JSON.parse(h.fullAnalysis); } catch {
            parsed = {
                severity: h.severity === 'moderate' ? 'medium' : (h.severity || 'low'),
                possibleConditions: (h.possibleConditions || []).map(c => c.name || c),
                recommendedSpecialty: h.recommendedSpecialty || 'General Physician',
                advice: h.recommendations || [],
                urgentSigns: h.whenToSeekEmergencyCare || []
            };
        }
        setMessages([
            { id: h._id + '_u', role: 'user', text: h.symptoms },
            { id: h._id + '_a', role: 'ai',   data: parsed }
        ]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || loading) return;
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text }]);
        setInput('');
        setLoading(true);
        try {
            const res = await axios.post(getAiServiceUrl('/carebot'), { symptoms: text, patientId: user?.id }, { headers: { Authorization: `Bearer ${token}` } });
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', data: res.data }]);
            fetchHistory();
        } catch {
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', data: {
                severity: 'low', possibleConditions: ['Unable to analyze at this time'],
                recommendedSpecialty: 'General Physician',
                advice: ['Please try again or consult a doctor directly'], urgentSigns: []
            }}]);
        } finally { setLoading(false); }
    };

    const deleteSession = async (id) => {
        try {
            await axios.delete(getAiServiceUrl(`/history/${id}`), { headers: { Authorization: `Bearer ${token}` } });
            setHistory(prev => (Array.isArray(prev) ? prev : []).filter(h => h._id !== id));
        } catch (e) { console.error(e); }
        setConfirmDelete(null);
    };

    const clearAll = async () => {
        try {
            await axios.delete(getAiServiceUrl(`/history/patient/${user.id}`), { headers: { Authorization: `Bearer ${token}` } });
            setHistory([]); setMessages([]);
        } catch (e) { console.error(e); }
        setConfirmDelete(null);
    };

    return (
        <div className="flex h-[calc(100vh-160px)] rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">

            {/* ── Sidebar ── */}
            <div className="w-64 flex-shrink-0 flex flex-col border-r border-slate-100 bg-slate-50">
                {/* Sidebar header */}
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 mb-4">
                        <CareBotAvatar size="sm" />
                        <div>
                            <p className="font-bold text-slate-800 text-sm">CareBot</p>
                            <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Online
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setMessages([])}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition">
                        <Plus className="w-4 h-4" /> New Chat
                    </button>
                </div>

                {/* History list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1">Past Consultations</p>
                    {history.length === 0 && (
                        <p className="text-xs text-slate-400 text-center mt-4 px-3">No past consultations yet.</p>
                    )}
                    {history.map(h => (
                        <div key={h._id} onClick={() => loadSession(h)}
                            className="group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white hover:shadow-sm transition text-sm text-slate-600">
                            <div className="flex-1 min-w-0">
                                <p className="truncate text-xs font-medium text-slate-700">{h.symptoms}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(h.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); setConfirmDelete(h._id); }}
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition flex-shrink-0 mt-0.5">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Clear all */}
                {history.length > 0 && (
                    <div className="p-3 border-t border-slate-100">
                        <button onClick={() => setConfirmDelete('__all__')}
                            className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition py-1">
                            <Trash className="w-3.5 h-3.5" /> Clear all history
                        </button>
                    </div>
                )}
            </div>

            {/* ── Chat area ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Chat header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-white">
                    <CareBotAvatar size="md" />
                    <div>
                        <p className="font-bold text-slate-800">CareBot</p>
                        <p className="text-xs text-slate-400">AI Symptom Checker — each message is an independent analysis</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-slate-50/40">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-slate-400">
                            <CareBotAvatar size="lg" />
                            <div>
                                <p className="font-bold text-slate-600 text-xl">Hi, I am CareBot</p>
                                <p className="text-sm mt-1.5 max-w-xs leading-relaxed">Describe your symptoms and I will provide a preliminary health assessment.</p>
                            </div>
                            <p className="text-xs text-slate-400 max-w-xs">Not a substitute for professional medical advice.</p>
                        </div>
                    )}

                    {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'ai' && <CareBotAvatar size="sm" />}
                            <div>
                                {msg.role === 'user' ? (
                                    <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm max-w-sm">
                                        {msg.text}
                                    </div>
                                ) : (
                                    <AICard data={msg.data} />
                                )}
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-600">
                                    {user?.name?.[0]?.toUpperCase() || 'P'}
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3 justify-start">
                            <CareBotAvatar size="sm" />
                            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                                <div className="flex gap-1.5 items-center h-5">
                                    {[0, 150, 300].map(d => (
                                        <span key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="px-5 py-4 border-t border-slate-100 bg-white">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1 relative">
                            <textarea
                                className="w-full px-4 py-3 pr-14 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none resize-none text-sm bg-slate-50 max-h-32"
                                rows={2}
                                maxLength={MAX_CHARS}
                                placeholder="Describe your symptoms... (Enter to send)"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                                disabled={loading}
                            />
                            <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-400">{input.length}/{MAX_CHARS}</span>
                        </div>
                        <button type="submit" disabled={loading || !input.trim()}
                            className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition disabled:opacity-40 flex-shrink-0 shadow-sm">
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center mt-2">CareBot provides preliminary suggestions only — always consult a doctor.</p>
                </form>
            </div>

            {/* Confirm delete modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">Delete {confirmDelete === '__all__' ? 'all chats' : 'this chat'}?</p>
                                <p className="text-xs text-slate-500">This cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                                Cancel
                            </button>
                            <button onClick={() => confirmDelete === '__all__' ? clearAll() : deleteSession(confirmDelete)}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
