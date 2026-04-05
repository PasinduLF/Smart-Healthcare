import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getDoctorServiceUrl } from '../../config/api';

const dayOptions = [
    { key: 'Mon', label: 'Monday' },
    { key: 'Tue', label: 'Tuesday' },
    { key: 'Wed', label: 'Wednesday' },
    { key: 'Thu', label: 'Thursday' },
    { key: 'Fri', label: 'Friday' },
    { key: 'Sat', label: 'Saturday' },
    { key: 'Sun', label: 'Sunday' }
];

const timeOptions = Array.from({ length: 48 }, (_, index) => {
    const totalMinutes = index * 30;
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
});

const buildDefaultAvailability = () => dayOptions.map((day) => ({ day: day.key, slots: [] }));

const normalizeDayKey = (value) => {
    if (!value) return null;
    const key = String(value).trim().toLowerCase();
    const map = {
        mon: 'Mon', monday: 'Mon', tue: 'Tue', tuesday: 'Tue',
        wed: 'Wed', wednesday: 'Wed', thu: 'Thu', thursday: 'Thu',
        fri: 'Fri', friday: 'Fri', sat: 'Sat', saturday: 'Sat',
        sun: 'Sun', sunday: 'Sun'
    };
    return map[key] || null;
};

const normalizeAvailability = (raw) => {
    const base = buildDefaultAvailability();
    if (!raw) return base;
    let parsed = raw;
    if (typeof raw === 'string') {
        try { parsed = JSON.parse(raw); } catch (err) { return base; }
    }
    if (!Array.isArray(parsed)) return base;
    const slotMap = new Map();
    parsed.forEach((entry) => {
        const dayKey = normalizeDayKey(entry?.day);
        if (!dayKey) return;
        const slots = Array.isArray(entry?.slots) ? entry.slots.map((slot) => ({
            start: typeof slot?.start === 'string' ? slot.start : '',
            end: typeof slot?.end === 'string' ? slot.end : ''
        })) : [];
        slotMap.set(dayKey, slots);
    });
    return base.map((day) => ({
        ...day,
        slots: slotMap.get(day.day) || []
    }));
};

export default function DoctorSchedule() {
    const { user, token } = useAuth();
    const [profileData, setProfileData] = useState({ name: '', specialization: '', experience: 0, consultationFee: 0 });
    const [weeklyAvailability, setWeeklyAvailability] = useState(buildDefaultAvailability);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;
            try {
                const profRes = await axios.get(getDoctorServiceUrl(`/profile/${user.id}`), {
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setProfileData({
                    name: profRes.data.name || '',
                    specialization: profRes.data.specialty || profRes.data.specialization || '',
                    experience: profRes.data.experience || 0,
                    consultationFee: Number(profRes.data.consultationFee) || 0
                });
                setWeeklyAvailability(normalizeAvailability(profRes.data.availability));
            } catch (err) {
                console.error("Error fetching doctor profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user, token]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...profileData, availability: weeklyAvailability };
            await axios.put(getDoctorServiceUrl(`/profile/${user.id}`), payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Profile & Availability updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update profile");
        }
    };

    const addSlot = (dayKey) => {
        setWeeklyAvailability((prev) => prev.map((day) => day.day === dayKey
            ? { ...day, slots: [...day.slots, { start: '', end: '' }] }
            : day
        ));
    };

    const updateSlot = (dayKey, index, field, value) => {
        setWeeklyAvailability((prev) => prev.map((day) => {
            if (day.day !== dayKey) return day;
            return {
                ...day,
                slots: day.slots.map((slot, slotIndex) => slotIndex === index
                    ? { ...slot, [field]: value }
                    : slot
                )
            };
        }));
    };

    const removeSlot = (dayKey, index) => {
        setWeeklyAvailability((prev) => prev.map((day) => day.day === dayKey
            ? { ...day, slots: day.slots.filter((_, slotIndex) => slotIndex !== index) }
            : day
        ));
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading profile data...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">My Profile & Availability</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Specialization</label>
                    <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={profileData.specialization} onChange={e => setProfileData({...profileData, specialization: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Years of Experience</label>
                    <input type="number" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={profileData.experience} onChange={e => setProfileData({...profileData, experience: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Appointment Price (LKR)</label>
                    <input type="number" min="0" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={profileData.consultationFee} onChange={e => setProfileData({...profileData, consultationFee: Number(e.target.value) || 0})} />
                </div>
                
                <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 uppercase tracking-wider text-xs font-bold">Weekly Schedule</label>
                        <button type="button" onClick={() => setWeeklyAvailability(buildDefaultAvailability())} className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 uppercase font-black">Clear All</button>
                    </div>
                    <div className="space-y-4">
                        {dayOptions.map((day) => {
                            const dayData = weeklyAvailability.find((entry) => entry.day === day.key) || { day: day.key, slots: [] };
                            return (
                                <div key={day.key} className="p-4 border rounded-xl bg-slate-50/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-bold text-slate-700 text-sm">{day.label}</p>
                                        <button type="button" onClick={() => addSlot(day.key)} className="text-[10px] px-3 py-1 rounded-full bg-teal-50 text-teal-600 font-bold border border-teal-100 hover:bg-teal-100 transition-colors">ADD SLOT</button>
                                    </div>
                                    {dayData.slots.length === 0 ? (
                                        <p className="text-[10px] text-slate-400 uppercase font-bold px-1">Off Duty</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {dayData.slots.map((slot, index) => (
                                                <div key={`${day.key}-${index}`} className="flex items-center gap-2">
                                                    <select className="px-3 py-2 border rounded-lg text-xs" value={slot.start} onChange={(e) => updateSlot(day.key, index, 'start', e.target.value)}>
                                                        <option value="">Start</option>
                                                        {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                    <span className="text-gray-400 text-xs">to</span>
                                                    <select className="px-3 py-2 border rounded-lg text-xs" value={slot.end} onChange={(e) => updateSlot(day.key, index, 'end', e.target.value)}>
                                                        <option value="">End</option>
                                                        {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => removeSlot(day.key, index)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-lg">×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <button type="submit" className="w-full py-4 bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-100 font-bold hover:bg-teal-700 transition-all">Save Profile & Schedule</button>
            </form>
        </div>
    );
}
