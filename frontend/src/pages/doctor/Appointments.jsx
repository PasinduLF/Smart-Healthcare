import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getPatientServiceUrl } from '../../config/api';
import { getAppointmentServiceUrl } from '../../config/api';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, FileText, MessageSquareWarning } from 'lucide-react';

/**
 * Returns join button state based on appointment date/time.
 * - Enabled only within [slotStart - 5min, slotStart + 30min]
 */
function getJoinState(date, time) {
    if (!date || !time) return { canJoin: true, label: 'Start Consultation' };

    // Parse "HH:MM" or "H:MM AM/PM"
    const parseTime = (t) => {
        const twelve = t.match(/^(\d{1,2}):(\d{2})\s*([aApP][mM])$/);
        if (twelve) {
            let h = Number(twelve[1]) % 12;
            if (twelve[3].toUpperCase() === 'PM') h += 12;
            return h * 60 + Number(twelve[2]);
        }
        const twenty = t.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
        if (twenty) return Number(twenty[1]) * 60 + Number(twenty[2]);
        return null;
    };

    const slotMinutes = parseTime(time.split('-')[0].trim());
    if (slotMinutes === null) return { canJoin: true, label: 'Start Consultation' };

    const now = new Date();
    const slotDate = new Date(`${date}T00:00:00`);
    slotDate.setMinutes(slotDate.getMinutes() + slotMinutes);

    const diffMs = now - slotDate; // positive = past slot start
    const EARLY_MS = 5 * 60 * 1000;
    const WINDOW_MS = 30 * 60 * 1000;

    if (diffMs < -EARLY_MS) {
        // Too early
        const startTime = slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return { canJoin: false, label: `Starts at ${startTime}` };
    }
    if (diffMs > WINDOW_MS) {
        return { canJoin: false, label: 'Slot Ended' };
    }
    return { canJoin: true, label: 'Start Consultation' };
}

const parseObjectIdTimestamp = (id) => {
    if (!id || typeof id !== 'string' || id.length < 8) return 0;
    const seconds = Number.parseInt(id.slice(0, 8), 16);
    if (Number.isNaN(seconds)) return 0;
    return seconds * 1000;
};

const getAppointmentTimestamp = (appointment) => {
    const createdAtMs = Date.parse(appointment?.createdAt || '');
    if (Number.isFinite(createdAtMs) && createdAtMs > 0) return createdAtMs;
    return parseObjectIdTimestamp(appointment?._id);
};

const sortAppointmentsNewestFirst = (items = []) => {
    return [...items].sort((a, b) => getAppointmentTimestamp(b) - getAppointmentTimestamp(a));
};

export default function DoctorAppointments({ setActiveCall }) {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [expandedPatient, setExpandedPatient] = useState({}); // { appointmentId: patientData }
    const [loadingPatient, setLoadingPatient] = useState(null); // appointment id being loaded
    const [loading, setLoading] = useState(true);
    const [, setTick] = useState(0);

    // Re-render every 30s so join state stays current
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    // Rejection modal state
    const [rejectModal, setRejectModal] = useState(null); // appointment id
    const [rejectReason, setRejectReason] = useState('');
    const [patientNames, setPatientNames] = useState({}); // patientId → display name (fills gaps when API omits patientName)

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!user?.id) return;
            try {
                const res = await axios.get(getAppointmentServiceUrl(`/doctor/${user.id}`), {
                    headers: { Authorization: `Bearer ${token}` } 
                });

                const incomingAppointments = Array.isArray(res.data) ? res.data : [];
                const sortedAppointments = sortAppointmentsNewestFirst(incomingAppointments);
                setAppointments(sortedAppointments);

                const uniquePatientIds = Array.from(
                    new Set(sortedAppointments.map((appt) => appt.patientId).filter(Boolean))
                );
                if (uniquePatientIds.length > 0) {
                    const entries = await Promise.all(
                        uniquePatientIds.map(async (patientId) => {
                            try {
                                const pRes = await axios.get(getPatientServiceUrl(`/profile/${patientId}`), {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                                return [patientId, pRes.data?.name || ''];
                            } catch {
                                return [patientId, ''];
                            }
                        })
                    );
                    setPatientNames(Object.fromEntries(entries));
                } else {
                    setPatientNames({});
                }
            } catch (err) {
                console.error("Error fetching appointments", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, [user, token]);

    const viewPatientProfile = async (appointmentId, patientId) => {
        // Toggle off if already expanded
        if (expandedPatient[appointmentId]) {
            setExpandedPatient(prev => {
                const next = { ...prev };
                delete next[appointmentId];
                return next;
            });
            return;
        }
        setLoadingPatient(appointmentId);
        try {
            const pRes = await axios.get(getPatientServiceUrl(`/profile/${patientId}`), { 
                headers: { Authorization: `Bearer ${token}` }
            });
            setExpandedPatient(prev => ({ ...prev, [appointmentId]: pRes.data }));
        } catch(err) { 
            console.error(err);
            alert("Failed to fetch patient data"); 
        } finally {
            setLoadingPatient(null);
        }
    };

    const handleAccept = async (id) => {
        try {
            await axios.put(getAppointmentServiceUrl(`/accept/${id}`), {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments((prev) => prev.map((a) => a._id === id ? { ...a, status: 'accepted' } : a));
        } catch (err) {
            console.error(err);
            alert("Failed to accept");
        }
    };

    const openRejectModal = (id) => {
        setRejectModal(id);
        setRejectReason('');
    };

    const handleRejectConfirm = async () => {
        if (!rejectModal) return;
        try {
            await axios.put(getAppointmentServiceUrl(`/reject/${rejectModal}`), {
                reason: rejectReason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                return list.map(a => a._id === rejectModal ? { ...a, status: 'rejected', rejectionReason: rejectReason } : a);
            });
            setRejectModal(null);
            setRejectReason('');
        } catch (err) {
            console.error(err);
            alert("Failed to reject");
        }
    };

    const startTelemedicine = (appt) => {
        setActiveCall({ id: appt._id, date: appt.date, time: appt.time });
        navigate('/doctor/telemedicine');
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading appointments...</div>;

    const appointmentRows = Array.isArray(appointments) ? appointments : [];

    const displayPatientName = (appt) =>
        patientNames[appt.patientId] || appt.patientName || appt.patientId || 'Patient';

    return (
        <div className="relative">
            {/* Doctor Verification Banner */}
            {user?.verified === false && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
                    <ShieldAlert className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">Account Pending Verification</p>
                        <p className="text-xs text-amber-600">Your account is awaiting admin verification. Some features may be limited until approved.</p>
                    </div>
                </div>
            )}

            <h2 className="text-xl font-semibold mb-6">Patient Appointments</h2>

            <div className="space-y-4">
                {appointmentRows.length === 0 ? (
                    <p className="text-gray-500">No appointments scheduled.</p>
                ) : (
                    appointmentRows.map(appt => (
                        <div key={appt._id} className={`border rounded-2xl bg-white/50 shadow-sm hover:shadow-md transition-all ${appt.status === 'cancelled' || appt.status === 'rejected' ? 'opacity-50' : ''}`}>
                            <div className="p-6 flex flex-col md:flex-row justify-between md:items-center">
                                <div className="mb-4 md:mb-0">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        Patient: <span className="text-brand-600">{displayPatientName(appt)}</span>
                                    </h3>
                                    <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-tight">{appt.date} • {appt.time} • Status: <span className={`font-black uppercase tracking-widest ${appt.status === 'accepted' ? 'text-brand-600' : appt.status === 'rejected' ? 'text-coral-500' : 'text-orange-500'}`}>{appt.status}</span></p>
                                    {appt.status === 'rejected' && appt.rejectionReason && (
                                        <p className="text-xs text-coral-500 mt-1 flex items-center gap-1">
                                            <MessageSquareWarning className="w-3 h-3" />
                                            Reason: {appt.rejectionReason}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {appt.status === 'pending' && (
                                        <>
                                            <button onClick={() => handleAccept(appt._id)} className="px-5 py-2.5 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-100">Accept</button>
                                            <button onClick={() => openRejectModal(appt._id)} className="px-5 py-2.5 bg-coral-50 text-coral-600 text-xs font-bold rounded-xl hover:bg-coral-100 border border-coral-100">Reject</button>
                                        </>
                                    )}
                                    {appt.status === 'accepted' && (
                                        <button onClick={() => startTelemedicine(appt)} className="px-6 py-2.5 bg-navy-600 text-white text-xs font-bold rounded-xl hover:bg-navy-700 shadow-lg shadow-navy-100">Start Consultation</button>
                                    )}
                                    <button 
                                        onClick={() => viewPatientProfile(appt._id, appt.patientId)} 
                                        className={`px-5 py-2.5 text-xs font-bold rounded-xl border shadow-sm transition ${expandedPatient[appt._id] ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-slate-50 text-slate-600 hover:bg-white border-slate-100'}`}
                                        disabled={loadingPatient === appt._id}
                                    >
                                        {loadingPatient === appt._id ? 'Loading...' : expandedPatient[appt._id] ? 'Hide Details' : 'Patient Details'}
                                    </button>
                                </div>
                            </div>

                            {/* Inline Patient Details */}
                            {expandedPatient[appt._id] && (
                                <div className="px-6 pb-6 pt-2 border-t border-brand-100 bg-brand-50/30 rounded-b-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                                    <h4 className="text-sm font-bold text-brand-800 mb-3 flex items-center gap-2"><Activity className="w-4 h-4"/> Patient Overview</h4>
                                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                                        <div className="space-y-1">
                                            <p><span className="text-slate-400 font-bold uppercase text-[10px]">Name</span><br/> <span className="font-bold text-slate-700">{expandedPatient[appt._id].name}</span></p>
                                            <p className="pt-2"><span className="text-slate-400 font-bold uppercase text-[10px]">Age</span><br/> <span className="font-bold text-slate-700">{expandedPatient[appt._id].age || 'N/A'}</span></p>
                                        </div>
                                        <div className="space-y-1">
                                            <p><span className="text-slate-400 font-bold uppercase text-[10px]">Vitals</span><br/> <span className="font-bold text-slate-700">BP: {expandedPatient[appt._id].vitals?.bloodPressure || '-'} • HR: {expandedPatient[appt._id].vitals?.heartRate || '-'} • Wt: {expandedPatient[appt._id].vitals?.weight || '-'}</span></p>
                                            <p className="pt-2"><span className="text-slate-400 font-bold uppercase text-[10px]">Allergies</span><br/> <span className="font-bold text-coral-600">{Array.isArray(expandedPatient[appt._id].allergies) && expandedPatient[appt._id].allergies.length > 0 ? expandedPatient[appt._id].allergies.join(', ') : 'None Reported'}</span></p>
                                        </div>
                                    </div>
                                    {Array.isArray(expandedPatient[appt._id].reports) && expandedPatient[appt._id].reports.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-brand-100">
                                            <h5 className="text-[10px] font-black uppercase text-brand-600 tracking-widest mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Medical Reports</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {expandedPatient[appt._id].reports.map(report => (
                                                    <a key={report._id} href={`http://localhost:3000${report.url}`} target="_blank" rel="noreferrer"
                                                        className="px-3 py-1.5 bg-white border border-brand-100 rounded-lg text-xs font-medium text-brand-700 hover:bg-brand-50 transition">
                                                        {report.category && <span className="text-[9px] text-brand-500 mr-1">[{report.category}]</span>}
                                                        {report.originalName}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Rejection Reason Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-coral-50 rounded-xl">
                                <MessageSquareWarning className="w-5 h-5 text-coral-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-navy-800">Reject Appointment</h3>
                                <p className="text-xs text-gray-500">Provide a reason for the patient</p>
                            </div>
                        </div>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. Schedule conflict, patient needs different specialist, time slot unavailable..."
                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-coral-200 outline-none text-sm resize-none"
                            rows="3"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setRejectModal(null)}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition">
                                Cancel
                            </button>
                            <button onClick={handleRejectConfirm}
                                className="px-5 py-2.5 bg-coral-500 text-white rounded-xl hover:bg-coral-600 transition text-sm font-bold">
                                Reject Appointment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
