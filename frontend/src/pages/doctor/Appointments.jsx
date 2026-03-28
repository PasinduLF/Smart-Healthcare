import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Activity, X } from 'lucide-react';

function parseSlotStart(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) return null;
    const [timePart, meridiem] = parts;
    let [hours, minutes] = timePart.split(':').map(Number);
    if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(hours, minutes, 0, 0);
    return d;
}

function getJoinState(dateStr, timeStr) {
    const slotStart = parseSlotStart(dateStr, timeStr);
    if (!slotStart) return { canJoin: false, label: 'Start Consultation', reason: null };
    const now = Date.now();
    const joinFrom = slotStart.getTime() - 5 * 60 * 1000;
    const joinUntil = slotStart.getTime() + 30 * 60 * 1000;
    const timeStr12 = slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (now < joinFrom) return { canJoin: false, label: `Starts at ${timeStr12}`, reason: 'too_early' };
    if (now > joinUntil) return { canJoin: false, label: 'Slot Ended', reason: 'too_late' };
    return { canJoin: true, label: 'Start Consultation', reason: null };
}

export default function DoctorAppointments({ setActiveCall }) {
    const { user, token } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!user?.id) return;
            try {
                const res = await axios.get(`http://localhost:3000/api/appointments/doctor/${user.id}`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setAppointments(res.data);
            } catch (err) {
                console.error("Error fetching appointments", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, [user, token]);

    const viewPatientProfile = async (patientId) => {
        try {
            const pRes = await axios.get(`http://localhost:3000/api/patients/profile/${patientId}`, { 
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedPatient(pRes.data);
        } catch(err) { 
            console.error(err);
            alert("Failed to fetch patient data"); 
        }
    };

    const handleAccept = async (id) => {
        try {
            await axios.put(`http://localhost:3000/api/appointments/accept/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(appointments.map(a => a._id === id ? { ...a, status: 'accepted' } : a));
        } catch (err) {
            console.error(err);
            alert("Failed to accept");
        }
    };

    const handleReject = async (id) => {
        try {
            await axios.put(`http://localhost:3000/api/appointments/reject/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(appointments.map(a => a._id === id ? { ...a, status: 'rejected' } : a));
        } catch (err) {
            console.error(err);
            alert("Failed to reject");
        }
    };

    const startTelemedicine = (apptId, date, time) => {
        setActiveCall({ id: apptId, date, time });
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading appointments...</div>;

    return (
        <div className="relative">
            <h2 className="text-xl font-semibold mb-6">Patient Appointments</h2>
            
            {selectedPatient && (
                <div className="mb-8 p-6 border-2 border-teal-100 rounded-2xl bg-teal-50/50 relative shadow-xl shadow-teal-100/20 animate-in zoom-in-95 duration-200">
                    <button onClick={() => setSelectedPatient(null)} className="absolute top-4 right-4 p-2 hover:bg-white rounded-full transition shadow-sm border border-transparent hover:border-teal-100">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                    <h3 className="text-lg font-bold text-teal-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5"/> Patient Overview</h3>
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-1">
                            <p><span className="text-slate-400 font-bold uppercase text-[10px]">Name</span><br/> <span className="font-bold text-slate-700">{selectedPatient.name}</span></p>
                            <p className="pt-2"><span className="text-slate-400 font-bold uppercase text-[10px]">Age</span><br/> <span className="font-bold text-slate-700">{selectedPatient.age || 'N/A'}</span></p>
                        </div>
                        <div className="space-y-1">
                            <p><span className="text-slate-400 font-bold uppercase text-[10px]">Vitals</span><br/> <span className="font-bold text-slate-700">BP: {selectedPatient.vitals?.bloodPressure || '-'} • HR: {selectedPatient.vitals?.heartRate || '-'} • Wt: {selectedPatient.vitals?.weight || '-'}</span></p>
                            <p className="pt-2"><span className="text-slate-400 font-bold uppercase text-[10px]">Allergies</span><br/> <span className="font-bold text-red-600">{selectedPatient.allergies?.length > 0 ? selectedPatient.allergies.join(', ') : 'None Reported'}</span></p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {appointments.length === 0 ? (
                    <p className="text-gray-500">No appointments scheduled.</p>
                ) : (
                    appointments.map(appt => (
                        <div key={appt._id} className={`p-6 border rounded-2xl bg-white/50 flex flex-col md:flex-row justify-between md:items-center shadow-sm hover:shadow-md transition-all ${appt.status === 'cancelled' || appt.status === 'rejected' ? 'opacity-50' : ''}`}>
                            <div className="mb-4 md:mb-0">
                                <h3 className="font-bold text-slate-800 cursor-pointer hover:text-teal-600 flex items-center gap-2 group" onClick={() => viewPatientProfile(appt.patientId)}>
                                    Patient: <span className="underline decoration-slate-200 group-hover:decoration-teal-200">{appt.patientId}</span>
                                </h3>
                                <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-tight">{appt.date} • {appt.time} • Status: <span className={`font-black uppercase tracking-widest ${appt.status === 'accepted' ? 'text-teal-600' : 'text-orange-500'}`}>{appt.status}</span></p>
                            </div>
                            <div className="flex gap-2">
                                {appt.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleAccept(appt._id)} className="px-5 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-100">Accept</button>
                                        <button onClick={() => handleReject(appt._id)} className="px-5 py-2.5 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 border border-red-100">Reject</button>
                                    </>
                                )}
                                {appt.status === 'accepted' && (() => {
                                        const { canJoin, label, reason } = getJoinState(appt.date, appt.time);
                                        return (
                                            <button
                                                onClick={() => canJoin && startTelemedicine(appt._id, appt.date, appt.time)}
                                                disabled={!canJoin}
                                                title={reason === 'too_early' ? 'Join opens 5 minutes before slot' : reason === 'too_late' ? 'Slot has ended' : ''}
                                                className={`px-6 py-2.5 text-xs font-bold rounded-xl shadow-lg transition ${canJoin ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })()}
                                <button onClick={() => viewPatientProfile(appt.patientId)} className="px-5 py-2.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-white border border-slate-100 shadow-sm">Patient Details</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
