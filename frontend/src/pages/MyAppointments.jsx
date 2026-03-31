import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { useLocation, useNavigate } from 'react-router-dom';

const getJoinState = () => ({ canJoin: true, label: 'Join Call' });

const dayKeyFromDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const parseAvailability = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }
    return [];
};

const timeToMinutes = (time) => {
    if (!time) return null;
    const parts = time.split(':').map((value) => Number(value));
    if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
    return (parts[0] * 60) + parts[1];
};

const minutesToTime = (minutes) => {
    if (!Number.isFinite(minutes)) return '';
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mins = String(minutes % 60).padStart(2, '0');
    return `${hours}:${mins}`;
};

const normalizeTime = (value) => {
    if (!value) return '';
    if (value.includes('AM') || value.includes('PM')) {
        const [timePart, meridiem] = value.split(' ');
        const [rawHours, rawMinutes] = timePart.split(':').map((part) => Number(part));
        if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return '';
        let hours = rawHours % 12;
        if (meridiem.toUpperCase() === 'PM') hours += 12;
        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(rawMinutes).padStart(2, '0');
        return `${formattedHours}:${formattedMinutes}`;
    }
    return value;
};

const buildSlotsForDay = (dayAvailability) => {
    if (!dayAvailability || !Array.isArray(dayAvailability.slots)) return [];
    const slots = [];

    dayAvailability.slots.forEach((slot) => {
        const startMinutes = timeToMinutes(slot?.start);
        const endMinutes = timeToMinutes(slot?.end);
        if (startMinutes === null || endMinutes === null) return;
        if (endMinutes <= startMinutes) return;

        for (let current = startMinutes; current + 30 <= endMinutes; current += 30) {
            slots.push(minutesToTime(current));
        }
    });

    return Array.from(new Set(slots)).sort();
};

export default function MyAppointments({ setActiveCall }) {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [appointments, setAppointments] = useState([]);
    const [doctorMap, setDoctorMap] = useState({});
    const [doctorAvailabilityMap, setDoctorAvailabilityMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [rescheduleData, setRescheduleData] = useState({ id: null, date: '', time: '' });
    const [doctorAppointments, setDoctorAppointments] = useState([]);

    const fetchAll = useCallback(async () => {
        if (!user?.id || !token) return;
        try {
            const [docRes, apptRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/doctors/list`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/api/appointments/patient/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setAppointments(apptRes.data);
            setDoctorMap(docRes.data.reduce((acc, doc) => {
                acc[doc._id] = doc.name;
                return acc;
            }, {}));
            setDoctorAvailabilityMap(docRes.data.reduce((acc, doc) => {
                acc[doc._id] = doc.availability;
                return acc;
            }, {}));
        } catch (err) {
            console.error("Failed to fetch appointment data", err);
        } finally {
            setLoading(false);
        }
    }, [token, user?.id]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        if (!location.state?.refresh) return;
        setLoading(true);
        fetchAll();
        const retry = setTimeout(fetchAll, 2000);
        navigate('/patient/appointments', { replace: true, state: {} });
        return () => clearTimeout(retry);
    }, [fetchAll, location.state, navigate]);

    const handleCancelAppointment = async (apptId) => {
        try {
            await axios.put(`${API_BASE_URL}/api/appointments/cancel/${apptId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(appointments.map(a => a._id === apptId ? { ...a, status: 'cancelled' } : a));
        } catch (err) {
            console.error(err);
            alert('Failed to cancel appointment');
        }
    };

    const handleReschedule = async (apptId) => {
        if (!rescheduleData.date || !rescheduleData.time) return alert("Please select date and time");
        try {
            await axios.put(`${API_BASE_URL}/api/appointments/reschedule/${apptId}`, { date: rescheduleData.date, time: rescheduleData.time }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(appointments.map(a => a._id === apptId ? { ...a, date: rescheduleData.date, time: rescheduleData.time, status: 'pending' } : a));
            setRescheduleData({ id: null, date: '', time: '' });
            alert('Appointment rescheduled and is pending approval!');
        } catch (err) {
            console.error(err);
            alert('Failed to reschedule');
        }
    };

    const startTelemedicine = (appt) => {
        if (setActiveCall) setActiveCall({ id: appt._id, date: appt.date, time: appt.time });
        navigate('/patient/telemedicine');
    };

    const handlePayNow = (appt) => {
        navigate('/patient/payment', { 
            state: { 
                appointment: appt,
                doctorId: appt.doctorId,
                doctorName: doctorMap[appt.doctorId] || 'Specialist',
                consultationFee: appt.amount || 2500, // Default fee if not in appt
                date: appt.date,
                time: appt.time
            } 
        });
    };

    const rescheduleTarget = useMemo(() => {
        if (!rescheduleData.id) return null;
        return appointments.find((appt) => appt._id === rescheduleData.id) || null;
    }, [appointments, rescheduleData.id]);

    useEffect(() => {
        if (!rescheduleTarget || !token) {
            setDoctorAppointments([]);
            return;
        }

        let isMounted = true;
        const fetchDoctorAppointments = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/appointments/doctor/${rescheduleTarget.doctorId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!isMounted) return;
                setDoctorAppointments(res.data || []);
            } catch (err) {
                console.error('Failed to load doctor appointments', err);
            }
        };

        fetchDoctorAppointments();
        return () => { isMounted = false; };
    }, [rescheduleTarget, token]);

    const availableSlots = useMemo(() => {
        if (!rescheduleTarget || !rescheduleData.date) return [];
        const availability = parseAvailability(doctorAvailabilityMap?.[rescheduleTarget.doctorId]);
        const dayKey = dayKeyFromDate(rescheduleData.date);
        if (!dayKey) return [];
        const dayAvailability = availability.find((entry) => entry?.day === dayKey);
        return buildSlotsForDay(dayAvailability);
    }, [doctorAvailabilityMap, rescheduleData.date, rescheduleTarget]);

    const bookedSlots = useMemo(() => {
        if (!rescheduleTarget || !rescheduleData.date) return new Set();
        return new Set(
            doctorAppointments
                .filter((appt) => appt.date === rescheduleData.date && appt.status !== 'cancelled' && appt.status !== 'rejected' && appt._id !== rescheduleTarget._id)
                .map((appt) => normalizeTime(appt.time))
                .filter(Boolean)
        );
    }, [doctorAppointments, rescheduleData.date, rescheduleTarget]);

    if (loading) return <div className="text-center py-10 text-gray-400">Loading appointments...</div>;

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Upcoming Appointments</h2>
            <div className="space-y-4">
                {appointments.filter(appt => appt.status !== 'cancelled').length === 0 ? (
                    <p className="text-gray-500 text-center py-10 italic">No appointments scheduled.</p>
                ) : (
                    appointments.filter(appt => appt.status !== 'cancelled').map(appt => (
                        <div key={appt._id} className="p-6 border rounded-xl bg-white/50 flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div className="mb-4 md:mb-0">
                                <h3 className="font-bold text-lg text-slate-800">{doctorMap?.[appt.doctorId] || 'Medical Specialist'}</h3>
                                <p className="text-gray-500 font-medium">{appt.date} • {appt.time} • Doctor Acceptance Status: <span className={`font-black uppercase tracking-widest text-[10px] px-2 py-1 rounded-lg ${
                                    appt.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' :
                                    appt.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                                    'bg-red-50 text-red-600'
                                }`}>{appt.status}</span></p>
                                <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mt-1">
                                    Payment: <span className={
                                        appt.paymentStatus === 'unpaid'
                                            ? 'text-red-500'
                                            : appt.paymentStatus === 'refunded'
                                                ? 'text-amber-600'
                                                : 'text-emerald-600'
                                    }>{appt.paymentStatus || 'unpaid'}</span>
                                </p>

                                {rescheduleData.id === appt._id && (
                                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select New Slot</p>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="date"
                                                className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={rescheduleData.date}
                                                onChange={e => setRescheduleData({ ...rescheduleData, date: e.target.value, time: '' })}
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                {availableSlots.length === 0 ? (
                                                    <span className="text-xs text-gray-400">No availability</span>
                                                ) : availableSlots.map((slot) => {
                                                    const isBooked = bookedSlots.has(slot);
                                                    return (
                                                        <button
                                                            key={`${appt._id}-${slot}`}
                                                            type="button"
                                                            disabled={isBooked}
                                                            onClick={() => setRescheduleData({ ...rescheduleData, time: slot })}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${isBooked
                                                                ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                                                                : rescheduleData.time === slot
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                                                    : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200'}`}
                                                        >
                                                            {slot}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleReschedule(appt._id)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase transition hover:bg-indigo-700">Confirm Change</button>
                                            <button onClick={() => setRescheduleData({ id: null, date: '', time: '' })} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase transition hover:bg-slate-200">Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {rescheduleData.id !== appt._id && (
                                    <>
                                        {appt.status === 'accepted' && appt.paymentStatus === 'paid' && (() => {
                                            const { canJoin, label } = getJoinState();
                                            return (
                                                <button
                                                    onClick={() => canJoin && startTelemedicine(appt)}
                                                    disabled={!canJoin}
                                                    className={`px-4 py-2 rounded-lg transition text-sm font-bold border ${
                                                        canJoin
                                                            ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100'
                                                            : 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })()}
                                        {appt.status !== 'cancelled' && (
                                            <>
                                                <button onClick={() => setRescheduleData({ id: appt._id, date: appt.date, time: appt.time })} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition text-sm font-bold border border-slate-100">Reschedule</button>
                                                <button onClick={() => handleCancelAppointment(appt._id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-bold border border-red-100">Cancel</button>
                                                   {appt.status === 'accepted' && appt.paymentStatus !== 'paid' && (
                                                       <button onClick={() => handlePayNow(appt)} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-bold shadow-lg shadow-slate-200">Pay Now</button>
                                                   )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
