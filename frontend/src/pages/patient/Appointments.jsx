import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAppointmentServiceUrl } from '../../config/api';

function getJoinState(date, time) {
    if (!date || !time) return { canJoin: true, label: 'Join Call' };

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
    if (slotMinutes === null) return { canJoin: true, label: 'Join Call' };

    const now = new Date();
    const slotDate = new Date(`${date}T00:00:00`);
    slotDate.setMinutes(slotDate.getMinutes() + slotMinutes);

    const diffMs = now - slotDate;
    const EARLY_MS = 5 * 60 * 1000;
    const WINDOW_MS = 30 * 60 * 1000;

    if (diffMs < -EARLY_MS) {
        const startTime = slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return { canJoin: false, label: `Starts at ${startTime}` };
    }
    if (diffMs > WINDOW_MS) {
        return { canJoin: false, label: 'Slot Ended' };
    }
    return { canJoin: true, label: 'Join Call' };
}

export default function PatientAppointments({ setActiveCall }) {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rescheduleData, setRescheduleData] = useState({ id: null, date: '', time: '' });
    const [, setTick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!user?.id) return;
            try {
                const apptRes = await axios.get(getAppointmentServiceUrl(`/patient/${user.id}`), {
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setAppointments(apptRes.data);
            } catch (err) {
                console.error("Failed to fetch appointments", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, [user, token]);

    const handleCancelAppointment = async (apptId) => {
        try {
            await axios.put(getAppointmentServiceUrl(`/cancel/${apptId}`), {}, {
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
            await axios.put(getAppointmentServiceUrl(`/reschedule/${apptId}`),
                { date: rescheduleData.date, time: rescheduleData.time }, {
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
        setActiveCall({ id: appt._id, date: appt.date, time: appt.time });
        navigate('/patient/telemedicine');
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading your schedule...</div>;

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Upcoming Appointments</h2>
            <div className="space-y-4">
                {appointments.length === 0 ? (
                    <p className="text-gray-500">No appointments scheduled.</p>
                ) : (
                    (Array.isArray(appointments) ? appointments : []).map(appt => (
                        <div key={appt._id} className={`p-6 border rounded-xl bg-white/50 flex flex-col md:flex-row justify-between items-start md:items-center ${appt.status === 'cancelled' ? 'opacity-50' : ''}`}>
                            <div className={`mb-4 md:mb-0 ${appt.status === 'cancelled' || appt.status === 'rejected' ? 'opacity-50' : ''}`}>
                                <h3 className="font-bold">Doctor ID: {appt.doctorId}</h3>
                                <p className="text-gray-500">{appt.date} • {appt.time} • Status: <span className="font-medium capitalize">{appt.status}</span></p>
                                
                                {rescheduleData.id === appt._id && (
                                    <div className="mt-3 flex gap-2 items-center">
                                        <input type="date" className="px-2 py-1 border rounded text-sm" value={rescheduleData.date} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} />
                                        <input type="time" className="px-2 py-1 border rounded text-sm" value={rescheduleData.time} onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})} />
                                        <button onClick={() => handleReschedule(appt._id)} className="px-3 py-1 bg-navy-600 text-white rounded text-sm hover:bg-navy-700">Save</button>
                                        <button onClick={() => setRescheduleData({ id: null, date: '', time: '' })} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">Cancel</button>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {appt.status !== 'cancelled' && appt.status !== 'rejected' && rescheduleData.id !== appt._id && (
                                    <>
                                {appt.status === 'accepted' && (() => {
                                            const { canJoin, label } = getJoinState(appt.date, appt.time);
                                            return (
                                                <button
                                                    onClick={() => canJoin && startTelemedicine(appt)}
                                                    disabled={!canJoin}
                                                    className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                                                        canJoin
                                                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })()}
                                        <button onClick={() => setRescheduleData({ id: appt._id, date: appt.date, time: appt.time })} className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition text-sm font-medium">Reschedule</button>
                                        <button onClick={() => handleCancelAppointment(appt._id)} className="px-4 py-2 bg-coral-50 text-coral-600 rounded-lg hover:bg-coral-100 transition text-sm font-medium">Cancel Appt</button>
                                        <button className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition text-sm font-medium">Pay Now</button>
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
