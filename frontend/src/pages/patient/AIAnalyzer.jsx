import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAiServiceUrl } from '../../config/api';
import { Brain, Send, Trash2, Trash } from 'lucide-react';

// ── Urgency badge ──────────────────────────────────────────────
function UrgencyBadge({ severity }) {
    const map = {
        low:    { label: '🟢 Low',    cls: 'bg-green-100 text-green-700 border-green-300' },
        medium: { label: '🟡 Medium', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
        high:   { label: '🔴 High',   cls: 'bg-red-100 text-red-700 border-red-300' },
    };
    const { label, cls } = map[severity] || map.low;
    return (
        <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full border ${cls}`}>
            {label}
        </span>
    );
}

// ── AI response card ───────────────────────────────────────────
function AICard({ data }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 max-w-[85%] space-y-3">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-indigo-700 flex items-center gap-1">
                    <Brain className="w-4 h-4" /> CareBot
                </span>
                <UrgencyBadge severity={data.severity} />
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">🩺 Possible Conditions</p>
                <ul className="space-y-0.5">
                    {data.possibleConditions.map((c, i) => (
                        <li key={i} className="text-sm text-gray-700">• {c}</li>
                    ))}
                </ul>
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">👨‍⚕️ Recommended Specialty</p>
                <p className="text-sm font-medium text-indigo-600">{data.recommendedSpecialty}</p>
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">💡 Advice</p>
                <ul className="space-y-0.5">
                    {data.advice.map((a, i) => (
                        <li key={i} className="text-sm text-gray-700">• {a}</li>
                    ))}
                </ul>
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">⚠️ Urgent Signs</p>
                <ul className="space-y-0.5">
                    {data.urgentSigns.map((s, i) => (
                        <li key={i} className="text-sm text-red-600">• {s}</li>
                    ))}
                </ul>
            </div>

            <p className="text-[10px] text-gray-400 italic border-t pt-2">
                This is AI-generated guidance only — not medical advice. Consult a licensed professional.
            </p>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────
export default function AIAnalyzer() {
    const { user, token } = useAuth();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]); // { id, role: 'user'|'ai', text?, data? }
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);   // past sessions from DB
    const [activeSession, setActiveSession] = useState(null); // viewing a past session
    const bottomRef = useRef(null);
    const MAX_CHARS = 200;

    useEffect(() => {
        if (user?.id) fetchHistory();
    }, [user]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(getAiServiceUrl(`/history/${user.id}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error('Failed to fetch history', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || loading) return;

        const userMsg = { id: Date.now(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(getAiServiceUrl('/carebot'), {
                symptoms: text,
                patientId: user?.id
            }, { headers: { Authorization: `Bearer ${token}` } });

            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', data: res.data }]);
            fetchHistory();
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1, role: 'ai',
                data: {
                    severity: 'low',
                    possibleConditions: ['Unable to analyze at this time'],
                    recommendedSpecialty: 'General Physician',
                    advice: ['Please try again or consult a doctor directly'],
                    urgentSigns: ['If symptoms are severe, seek emergency care immediately']
                }
            }]);
        } finally {
            setLoading(false);
        }
    };

    const deleteSession = async (id, e) => {
        e.stopPropagation();
        try {
            await axios.delete(getAiServiceUrl(`/history/${id}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(prev => prev.filter(h => h._id !== id));
            if (activeSession?._id === id) setActiveSession(null);
        } catch (err) {
            console.error('Failed to delete session', err);
        }
    };

    const clearAll = async () => {
        if (!window.confirm('Clear all past consultations?')) return;
        try {
            await axios.delete(getAiServiceUrl(`/history/patient/${user.id}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory([]);
            setActiveSession(null);
        } catch (err) {
            console.error('Failed to clear history', err);
        }
    };

    // Parse stored session into AICard-compatible data
    const parseSession = (h) => {
        try {
            const parsed = JSON.parse(h.fullAnalysis);
            return parsed;
        } catch {
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
        <div className="flex h-[calc(100vh-120px)] gap-4">

            {/* ── Sidebar: history ── */}
            <div className="w-64 flex-shrink-0 flex flex-col bg-white border rounded-2xl overflow-hidden">
                <div className="p-3 border-b flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">Past Consultations</span>
                    {history.length > 0 && (
                        <button onClick={clearAll} title="Clear all" className="text-gray-400 hover:text-red-500 transition">
                            <Trash className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {history.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center mt-6 px-3">No past consultations yet.</p>
                    ) : (
                        history.map(h => (
                            <div
                                key={h._id}
                                onClick={() => setActiveSession(activeSession?._id === h._id ? null : h)}
                                className={`group flex items-start gap-2 p-3 border-b cursor-pointer hover:bg-indigo-50 transition ${activeSession?._id === h._id ? 'bg-indigo-50' : ''}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-700 truncate">{h.symptoms}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{new Date(h.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button
                                    onClick={(e) => deleteSession(h._id, e)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition flex-shrink-0 mt-0.5"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Main chat area ── */}
            <div className="flex-1 flex flex-col bg-white border rounded-2xl overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b flex items-center gap-3 bg-indigo-50">
                    <Brain className="w-6 h-6 text-indigo-600" />
                    <div>
                        <h2 className="font-bold text-gray-800">CareBot</h2>
                        <p className="text-xs text-gray-500">AI Symptom Checker — each message is an independent analysis</p>
                    </div>
                </div>

                {/* Past session viewer */}
                {activeSession && (
                    <div className="border-b bg-gray-50 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Viewing past consultation — {new Date(activeSession.createdAt).toLocaleString()}</p>
                            <button onClick={() => setActiveSession(null)} className="text-xs text-indigo-600 hover:underline">Close</button>
                        </div>
                        <div className="bg-indigo-50 rounded-xl px-3 py-2 text-sm text-gray-700 italic">"{activeSession.symptoms}"</div>
                        <AICard data={parseSession(activeSession)} />
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && !activeSession && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-2">
                            <Brain className="w-12 h-12 text-indigo-200" />
                            <p className="text-sm font-medium">Describe your symptoms and CareBot will analyze them.</p>
                            <p className="text-xs">e.g., "I have tooth pain for 2 days with swelling"</p>
                        </div>
                    )}

                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'user' ? (
                                <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%] text-sm">
                                    {msg.text}
                                </div>
                            ) : (
                                <AICard data={msg.data} />
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-500 flex items-center gap-2 shadow-sm">
                                <span className="animate-spin inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full"></span>
                                Analyzing symptoms…
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 relative">
                            <textarea
                                className="w-full px-4 py-3 pr-16 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                                rows={2}
                                maxLength={MAX_CHARS}
                                placeholder="e.g., I have tooth pain for 2 days with swelling"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
                                }}
                                disabled={loading}
                            />
                            <span className="absolute bottom-2 right-3 text-[10px] text-gray-400">
                                {input.length}/{MAX_CHARS}
                            </span>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium flex-shrink-0"
                        >
                            <Send className="w-4 h-4" />
                            Analyze Symptoms
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
