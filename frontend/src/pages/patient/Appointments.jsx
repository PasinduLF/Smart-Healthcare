import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function PatientAppointments({ setActiveCall }) {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rescheduleData, setRescheduleData] = useState({ id: null, date: '', time: '' });

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!user?.id) return;
            try {
                const apptRes = await axios.get(`http://localhost:3000/api/appointments/patient/${user.id}`, { 
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
            await axios.put(`http://localhost:3000/api/appointments/cancel/${apptId}`, {}, {
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
            await axios.put(`http://localhost:3000/api/appointments/reschedule/${apptId}`, 
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

    const startTelemedicine = (apptId) => {
        setActiveCall(`channel-${apptId}`);
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
                    appointments.map(appt => (
                        <div key={appt._id} className={`p-6 border rounded-xl bg-white/50 flex flex-col md:flex-row justify-between items-start md:items-center ${appt.status === 'cancelled' ? 'opacity-50' : ''}`}>
                            <div className={`mb-4 md:mb-0 ${appt.status === 'cancelled' || appt.status === 'rejected' ? 'opacity-50' : ''}`}>
                                <h3 className="font-bold">Doctor ID: {appt.doctorId}</h3>
                                <p className="text-gray-500">{appt.date} • {appt.time} • Status: <span className="font-medium capitalize">{appt.status}</span></p>
                                
                                {rescheduleData.id === appt._id && (
                                    <div className="mt-3 flex gap-2 items-center">
                                        <input type="date" className="px-2 py-1 border rounded text-sm" value={rescheduleData.date} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} />
                                        <input type="time" className="px-2 py-1 border rounded text-sm" value={rescheduleData.time} onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})} />
                                        <button onClick={() => handleReschedule(appt._id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save</button>
                                        <button onClick={() => setRescheduleData({ id: null, date: '', time: '' })} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">Cancel</button>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {appt.status !== 'cancelled' && appt.status !== 'rejected' && rescheduleData.id !== appt._id && (
                                    <>
                                        {appt.status === 'accepted' && (
                                            <button onClick={() => startTelemedicine(appt._id)} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium">Join Call</button>
                                        )}
                                        <button onClick={() => setRescheduleData({ id: appt._id, date: appt.date, time: appt.time })} className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition text-sm font-medium">Reschedule</button>
                                        <button onClick={() => handleCancelAppointment(appt._id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium">Cancel Appt</button>
                                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">Pay Now</button>
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
