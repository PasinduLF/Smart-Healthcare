import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

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

export default function MyAppointments({
    appointments,
    doctorMap,
    doctorAvailabilityMap,
    rescheduleData,
    setRescheduleData,
    handleReschedule,
    handleCancelAppointment,
    startTelemedicine
}) {
    const { token } = useAuth();
    const [doctorAppointments, setDoctorAppointments] = useState([]);

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
                const res = await axios.get(`http://localhost:3000/api/appointments/doctor/${rescheduleTarget.doctorId}`, {
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
    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Upcoming Appointments</h2>
            <div className="space-y-4">
                {appointments.filter(appt => appt.status !== 'cancelled').length === 0 ? <p className="text-gray-500">No appointments scheduled.</p> : appointments.filter(appt => appt.status !== 'cancelled').map(appt => (
                    <div key={appt._id} className={`p-6 border rounded-xl bg-white/50 flex flex-col md:flex-row justify-between items-start md:items-center ${appt.status === 'cancelled' ? 'opacity-50' : ''}`}>
                        <div className={`mb-4 md:mb-0 ${appt.status === 'cancelled' || appt.status === 'rejected' ? 'opacity-50' : ''}`}>
                            <h3 className="font-bold">Doctor ID: {appt.doctorId}</h3>
                            <h3 className="font-bold">Doctor Name: {doctorMap?.[appt.doctorId] || 'Unknown'}</h3>
                            <p className="text-gray-500">{appt.date} • {appt.time} • Status: <span className="font-medium capitalize">{appt.status}</span></p>

                            {rescheduleData.id === appt._id && (
                                <div className="mt-3 flex gap-2 items-center">
                                    <input
                                        type="date"
                                        className="px-2 py-1 border rounded text-sm"
                                        value={rescheduleData.date}
                                        onChange={e => setRescheduleData({ ...rescheduleData, date: e.target.value, time: '' })}
                                    />
                                    {rescheduleTarget?.doctorId === appt.doctorId ? (
                                        <div className="flex flex-wrap gap-2">
                                            {availableSlots.length === 0 ? (
                                                <span className="text-xs text-gray-500">No slots</span>
                                            ) : availableSlots.map((slot) => {
                                                const isBooked = bookedSlots.has(slot);
                                                return (
                                                    <button
                                                        key={`${appt._id}-${slot}`}
                                                        type="button"
                                                        disabled={isBooked}
                                                        onClick={() => setRescheduleData({ ...rescheduleData, time: slot })}
                                                        className={`px-2 py-1 rounded text-xs border transition ${isBooked
                                                            ? 'bg-red-50 text-red-600 border-red-200 cursor-not-allowed'
                                                            : rescheduleData.time === slot
                                                                ? 'bg-green-600 text-white border-green-600'
                                                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                                                    >
                                                        {slot}-{minutesToTime(timeToMinutes(slot) + 30)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : null}
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
                ))}
            </div>
        </div>
    );
}
