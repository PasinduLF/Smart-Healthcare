import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAiServiceUrl } from '../../config/api';
import { Send, Trash2, Trash, Stethoscope, Phone, UserX, Plus } from 'lucide-react';

// ── Severity badge ────────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
    const map = {
        low:    { label: 'Low Risk',  bg: 'bg-emerald-100', text: 'text-emerald-700', emoji: '🟢', pulse: false },
        medium: { label: 'Moderate',  bg: 'bg-amber-100',   text: 'text-amber-700',   emoji: '🟡', pulse: false },
        high:   { label: 'High Risk', bg: 'bg-red-100',     text: 'text-red-700',     emoji: '🔴', pulse: true  },
    };
    const s = map[severity] || map.low;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
            <span className={s.pulse ? 'animate-pulse' : ''}>{s.emoji}</span>
            {s.label}
        </span>
    );
}

// ── Emergency panel (high only) ───────────────────────────────────────────────
const EMERGENCY_NUMBERS = [
    { label: 'Suwaseriya Ambulance', number: '1990' },
    { label: 'Police Emergency',     number: '110'  },
    { label: 'Ministry of Health',   number: '118'  },
];

function EmergencyPanel() {
    const [alone, setAlone] = useState(null);
    return (
        <div className="mt-3 rounded-2xl border-2 border-red-300 overflow-hidden shadow-sm">
            <div className="bg-red-500 px-4 py-2.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <p className="text-white font-bold text-sm">Seek Immediate Medical Help</p>
            </div>
            <div className="bg-red-50 p-4 space-y-3">
                <p className="text-sm text-red-800">Your symptoms may require urgent medical attention. Do not ignore this.</p>

                {/* Safety check */}
                {alone === null && (
                    <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-red-700">Are you alone right now?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setAlone(true)}
                                className="flex-1 py-1.5 rounded-xl border-2 border-red-300 text-red-700 text-xs font-bold hover:bg-red-100 transition">
                                Yes, I am alone
                            </button>
                            <button onClick={() => setAlone(false)}
                                className="flex-1 py-1.5 rounded-xl border-2 border-red-300 text-red-700 text-xs font-bold hover:bg-red-100 transition">
                                No, someone is with me
                            </button>
                        </div>
                    </div>
                )}
                {alone === true && (
                    <div className="flex items-start gap-2 p-3 bg-red-100 rounded-xl border border-red-200">
                        <UserX className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-red-700">Please contact someone immediately or call emergency services. Do not wait.</p>
                    </div>
                )}
                {alone === false && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <p className="text-xs font-semibold text-emerald-700">Good. Ask them to help you get to a hospital or call an ambulance now.</p>
                    </div>
                )}

                {/* Emergency numbers */}
                <div className="space-y-1.5">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Emergency Numbers</p>
                    {EMERGENCY_NUMBERS.map(e => (
                        <a key={e.number} href={`tel:${e.number}`}
                            className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-red-200 hover:bg-red-50 transition group">
                            <span className="text-xs text-slate-600">{e.label}</span>
                            <span className="flex items-center gap-1.5 font-bold text-red-600 text-sm group-hover:text-red-700">
                                <Phone className="w-3.5 h-3.5" />{e.number}
                            </span>
                        </a>
                    ))}
                </div>

                {/* Immediate actions */}
                <div className="space-y-1">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Immediate Actions</p>
                    {['Stay calm and sit or lie down', 'Avoid physical strain', 'Keep your phone nearby'].map((a, i) => (
                        <p key={i} className="text-xs text-red-800 flex items-start gap-1.5">
                            <span className="mt-0.5 w-1 h-1 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />{a}
                        </p>
                    ))}
                </div>

                {alone !== null && (
                    <button onClick={() => setAlone(null)} className="text-xs text-red-400 hover:text-red-600 underline">Back</button>
                )}
            </div>
        </div>
    );
}

// ── AI response card ──────────────────────────────────────────────────────────
function AICard({ data }) {
    const cardBg = {
        low:    'bg-emerald-50  border-emerald-200',
        medium: 'bg-amber-50    border-amber-200',
        high:   'bg-red-50      border-red-200',
    }[data.severity] || 'bg-emerald-50 border-emerald-200';

    const sectionTitle = 'text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

    return (
        <div className={`rounded-2xl rounded-tl-sm border shadow-sm p-4 max-w-[85%] space-y-3 ${cardBg}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">CareBot</span>
                <SeverityBadge severity={data.severity} />
            </div>

            {/* Possible conditions */}
            {data.possibleConditions?.length > 0 && (
                <div>
                    <p className={sectionTitle}>Possible Conditions</p>
                    <ul className="space-y-1">
                        {data.possibleConditions.map((c, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0 mt-2" />{c}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recommended specialty */}
            {data.recommendedSpecialty && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/70 rounded-xl border border-white">
                    <Stethoscope className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recommended Specialist</p>
                        <p className="text-sm font-bold text-indigo-700">{data.recommendedSpecialty}</p>
                    </div>
                </div>
            )}

            {/* Advice */}
            {data.advice?.length > 0 && (
                <div>
                    <p className={sectionTitle}>Advice</p>
                    <ul className="space-y-1">
                        {data.advice.map((a, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0 mt-2" />{a}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Urgent signs — only for high */}
            {data.severity === 'high' && data.urgentSigns?.length > 0 && (
                <div className="p-3 bg-red-100 rounded-xl border border-red-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1.5">Warning Signs</p>
                    <ul className="space-y-1">
                        {data.urgentSigns.map((s, i) => (
                            <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />{s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Emergency panel */}
            {data.severity === 'high' && <EmergencyPanel />}

            <p className="text-[10px] text-slate-400 italic border-t border-white/60 pt-2">
                AI-generated guidance only — not medical advice. Consult a licensed professional.
            </p>
        </div>
    );
}

// ── CareBot avatar ────────────────────────────────────────────────────────────
function CareBotAvatar({ size = 8 }) {
    return (
        <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow`}>
            <Stethoscope className={`w-${Math.round(size * 0.45)} h-${Math.round(size * 0.45)} text-white`} />
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AIAnalyzer() {
    const { user, token } = useAuth();
    const [input, setInput]       = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading]   = useState(false);
    const [history, setHistory]   = useState([]);
    const [confirmDelete, setConfirmDelete] = useState(null); // id | '__all__'
    const bottomRef  = useRef(null);
    const MAX_CHARS  = 300;

    useEffect(() => { if (user?.id) fetchHistory(); }, [user]);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(getAiServiceUrl(`/history/${user.id}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (err) { console.error('Failed to fetch history', err); }
    };

    const loadSession = (h) => {
        const parsed = parseSession(h);
        setMessages([
            { id: h._id + '_u', role: 'user', text: h.symptoms },
            { id: h._id + '_a', role: 'ai',   data: parsed }
        ]);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || loading) return;
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text }]);
        setInput('');
        setLoading(true);
        try {
            const res = await axios.post(getAiServiceUrl('/carebot'), {
                symptoms: text, patientId: user?.id
            }, { headers: { Authorization: `Bearer ${token}` } });
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', data: res.data }]);
            fetchHistory();
        } catch {
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', data: {
                severity: 'low',
                possibleConditions: ['Unable to analyze at this time'],
                recommendedSpecialty: 'General Physician',
                advice: ['Please try again or consult a doctor directly'],
                urgentSigns: []
            }}]);
        } finally { setLoading(false); }
    };

    const deleteSession = async (id) => {
        try {
            await axios.delete(getAiServiceUrl(`/history/${id}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(prev => prev.filter(h => h._id !== id));
        } catch (err) { console.error('Failed to delete', err); }
        setConfirmDelete(null);
    };

    const clearAll = async () => {
        try {
            await axios.delete(getAiServiceUrl(`/history/patient/${user.id}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory([]);
            setMessages([]);
        } catch (err) { console.error('Failed to clear', err); }
        setConfirmDelete(null);
    };

    const parseSession = (h) => {
        try { return JSON.parse(h.fullAnalysis); } catch {
            return {
                severity: h.severity === 'moderate' ? 'medium' : (h.severity || 'low'),
                possibleConditions: (h.possibleConditions || []).map(c => c.name || c),
                recommendedSpecialty: h.recommendedSpecialty || 'General Physician',
                advice: h.recommendations || [],
                urgentSigns: h.whenToSeekEmergencyCare || []
            };
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] bg-white rounded-2xl border overflow-hidden shadow-sm">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-indigo-50 to-violet-50">
                <div className="flex items-center gap-3">
                    <CareBotAvatar size={9} />
                    <div>
                        <p className="font-bold text-slate-800">CareBot</p>
                        <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setMessages([]); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition">
                        <Plus className="w-3.5 h-3.5" /> New Chat
                    </button>
                    {history.length > 0 && (
                        <button onClick={() => setConfirmDelete('__all__')}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition" title="Clear all history">
                            <Trash className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Past sessions strip */}
            {history.length > 0 && (
                <div className="flex gap-2 px-4 py-2 border-b bg-slate-50 overflow-x-auto no-scrollbar">
                    {history.map(h => (
                        <div key={h._id}
                            className="group flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-xl text-xs text-slate-600 cursor-pointer hover:border-indigo-300 hover:text-indigo-600 transition flex-shrink-0 max-w-[160px]"
                            onClick={() => loadSession(h)}>
                            <span className="truncate">{h.symptoms}</span>
                            <button onClick={e => { e.stopPropagation(); setConfirmDelete(h._id); }}
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition flex-shrink-0">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-slate-50/40">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-slate-400">
                        <CareBotAvatar size={14} />
                        <div>
                            <p className="font-bold text-slate-600 text-lg">Hi, I am CareBot</p>
                            <p className="text-sm mt-1 max-w-xs">Describe your symptoms and I will provide a preliminary health assessment.</p>
                        </div>
                        <p className="text-xs text-slate-400 max-w-xs">Not a substitute for professional medical advice.</p>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && <CareBotAvatar size={8} />}
                        <div>
                            {msg.role === 'user' ? (
                                <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm max-w-[75%] ml-auto">
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
                        <CareBotAvatar size={8} />
                        <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                            <div className="flex gap-1.5 items-center h-4">
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
            <form onSubmit={handleSubmit} className="px-4 py-4 border-t bg-white">
                <div className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            className="w-full px-4 py-3 pr-14 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none resize-none text-sm bg-slate-50"
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
                        className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition disabled:opacity-40 flex-shrink-0">
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-2">CareBot provides preliminary suggestions only — always consult a doctor.</p>
            </form>

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
