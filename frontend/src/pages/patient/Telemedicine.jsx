import { useState, useEffect } from 'react';
import { Video, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import VideoCall from '../../components/VideoCall';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { getAppointmentServiceUrl, getTelemedicineServiceUrl } from '../../config/api';

const TELE_URL = getTelemedicineServiceUrl();

export default function Telemedicine({ activeCall, setActiveCall }) {
    const { user, token } = useAuth();
    const [pastAppointments, setPastAppointments] = useState([]);
    const [chatHistories, setChatHistories]       = useState({}); // apptId → messages[]
    const [expanded, setExpanded]                 = useState(null);

    useEffect(() => {
        if (!user?.id || !token) return;
        axios.get(getAppointmentServiceUrl(`/patient/${user.id}`), {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => {
            // only accepted appointments that could have had a session
            setPastAppointments(r.data.filter(a => a.status === 'accepted'));
        }).catch(() => {});
    }, [user?.id, token]);

    const loadChat = async (apptId) => {
        if (chatHistories[apptId]) {
            setExpanded(expanded === apptId ? null : apptId);
            return;
        }

        if (!TELE_URL) {
            setChatHistories(prev => ({ ...prev, [apptId]: [] }));
            setExpanded(apptId);
            return;
        }

        try {
            const res = await fetch(`${TELE_URL}/session/${apptId}/chat`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });

            if (!res.ok) {
                throw new Error('Failed to load chat history');
            }

            const data = await res.json();
            setChatHistories(prev => ({ ...prev, [apptId]: data }));
            setExpanded(apptId);
        } catch {
            setChatHistories(prev => ({ ...prev, [apptId]: [] }));
            setExpanded(apptId);
        }
    };

    if (activeCall) {
        return (
            <div>
                <h2 className="text-xl font-semibold mb-6">Live Consultation</h2>
                <VideoCall
                    appointmentId={activeCall.id}
                    date={activeCall.date}
                    time={activeCall.time}
                    onEndCall={() => setActiveCall(null)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* No active call placeholder */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Telemedicine</h2>
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Video className="w-10 h-10 mb-3 text-gray-300" />
                    <p className="text-sm">Go to <span className="font-semibold text-indigo-500">My Appointments</span> and click "Join Call" to start a session.</p>
                </div>
            </div>

            {/* Past session chat histories */}
            {pastAppointments.length > 0 && (
                <div>
                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-500" /> Session Chat History
                    </h3>
                    <div className="space-y-3">
                        {pastAppointments.map(appt => (
                            <div key={appt._id} className="border rounded-xl bg-white overflow-hidden">
                                <button
                                    onClick={() => loadChat(appt._id)}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">Appointment on {appt.date} at {appt.time}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Tap to view session chat</p>
                                    </div>
                                    {expanded === appt._id
                                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                                    }
                                </button>

                                {expanded === appt._id && (
                                    <div className="border-t bg-gray-50 px-5 py-4">
                                        {!chatHistories[appt._id] || chatHistories[appt._id].length === 0 ? (
                                            <p className="text-sm text-gray-400 italic">No chat messages for this session.</p>
                                        ) : (
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {chatHistories[appt._id].map((msg, i) => {
                                                    const isMe = msg.senderRole === 'patient';
                                                    return (
                                                        <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                            <span className="text-[10px] text-gray-400 mb-0.5">{msg.senderName} · {msg.time}</span>
                                                            <div className={`px-3 py-2 rounded-xl text-sm max-w-[80%] break-words
                                                                ${isMe ? 'bg-indigo-100 text-indigo-900' : 'bg-white border border-slate-200 text-slate-700'}`}>
                                                                {msg.text}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
