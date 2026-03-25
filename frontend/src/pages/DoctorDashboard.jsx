import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, FileSignature, LogOut, User, Activity, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import VideoCall from '../components/VideoCall';
import { useNavigate, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

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
        mon: 'Mon', monday: 'Mon',
        tue: 'Tue', tuesday: 'Tue',
        wed: 'Wed', wednesday: 'Wed',
        thu: 'Thu', thursday: 'Thu',
        fri: 'Fri', friday: 'Fri',
        sat: 'Sat', saturday: 'Sat',
        sun: 'Sun', sunday: 'Sun'
    };
    return map[key] || null;
};

const normalizeAvailability = (raw) => {
    const base = buildDefaultAvailability();
    if (!raw) return base;

    let parsed = raw;
    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            return base;
        }
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

export default function DoctorDashboard() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [appointments, setAppointments] = useState([]);
    const [activeCall, setActiveCall] = useState(null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [newScript, setNewScript] = useState({ patientId: '', medication: '', instructions: '' });

    const [profileData, setProfileData] = useState({ name: '', specialization: '', experience: 0 });
    const [weeklyAvailability, setWeeklyAvailability] = useState(buildDefaultAvailability);
    const [selectedPatient, setSelectedPatient] = useState(null);

    useEffect(() => {
        if (!token || !user) return;
        
        const fetchAll = async () => {
            try {
                const apptRes = await axios.get(`http://localhost:3000/api/appointments/doctor/${user.id}`, { headers: { Authorization: `Bearer ${token}` } });
                setAppointments(apptRes.data);
                
                const presRes = await axios.get(`http://localhost:3000/api/doctors/prescriptions/doctor/${user.id}`, { headers: { Authorization: `Bearer ${token}` } });
                setPrescriptions(presRes.data);
                
                const profRes = await axios.get(`http://localhost:3000/api/doctors/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` } });
                setProfileData({
                    name: profRes.data.name || '',
                    specialization: profRes.data.specialty || profRes.data.specialization || '',
                    experience: profRes.data.experience || 0
                });
                setWeeklyAvailability(normalizeAvailability(profRes.data.availability));
            } catch (err) { console.error("Error fetching doctor data", err); }
        };
        fetchAll();
    }, [token, user]);

    const startTelemedicine = (apptId) => {
        setActiveCall(`channel-${apptId}`);
        navigate('/doctor/telemedicine');
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...profileData,
                availability: weeklyAvailability
            };
            await axios.put(`http://localhost:3000/api/doctors/profile/${user.id}`, payload, {
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

    const viewPatientProfile = async (patientId) => {
        try {
            const pRes = await axios.get(`http://localhost:3000/api/patients/profile/${patientId}`, { headers: { Authorization: `Bearer ${token}` }});
            setSelectedPatient({ ...pRes.data });
        } catch(err) { 
            console.error(err);
            alert("Failed to fetch full patient data"); 
        }
    };

    const handleIssuePrescription = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`http://localhost:3000/api/doctors/prescriptions`, {
                doctorId: user.id,
                patientId: newScript.patientId,
                medication: newScript.medication,
                instructions: newScript.instructions
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Prescription issued successfully!");
            setPrescriptions([res.data.prescription, ...prescriptions]);
            setNewScript({ patientId: '', medication: '', instructions: '' });
        } catch (err) {
            console.error(err);
            alert("Failed to issue prescription");
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

    return (
        <div className="py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Doctor Dashboard {user ? `- Welcome Dr. ${user.name}` : ''}</h1>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium">
                    <LogOut className="w-5 h-5" /> Logout
                </button>
            </div>

            <div className="flex gap-4 mb-8 overflow-x-auto pb-4">
                {[
                    { path: '/doctor/schedule', icon: User, label: 'Profile & Schedule' },
                    { path: '/doctor/appointments', icon: Clock, label: 'Appointments' },
                    { path: '/doctor/telemedicine', icon: Video, label: 'Telemedicine Session' },
                    { path: '/doctor/prescriptions', icon: FileSignature, label: 'Issue Prescription' }
                ].map(tab => (
                    <Link
                        key={tab.path}
                        to={tab.path}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition whitespace-nowrap ${location.pathname === tab.path
                                ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30'
                                : 'bg-white text-gray-600 hover:bg-teal-50'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </Link>
                ))}
            </div>

            <div className="glass-card p-8 min-h-[400px]">
                <Routes>
                    <Route path="/" element={<Navigate to="appointments" replace />} />
                    
                    <Route path="schedule" element={
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
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">Weekly Availability</label>
                                        <button
                                            type="button"
                                            onClick={() => setWeeklyAvailability(buildDefaultAvailability())}
                                            className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {dayOptions.map((day) => {
                                            const dayData = weeklyAvailability.find((entry) => entry.day === day.key) || { day: day.key, slots: [] };
                                            return (
                                                <div key={day.key} className="p-4 border rounded-xl bg-white/60">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium text-gray-700">{day.label}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => addSlot(day.key)}
                                                            className="text-xs px-3 py-1 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100"
                                                        >
                                                            Add Time
                                                        </button>
                                                    </div>
                                                    {dayData.slots.length === 0 ? (
                                                        <p className="text-xs text-gray-500 mt-3">No time slots added.</p>
                                                    ) : (
                                                        <div className="mt-3 space-y-2">
                                                            {dayData.slots.map((slot, index) => (
                                                                <div key={`${day.key}-${index}`} className="flex flex-wrap items-center gap-2">
                                                                    <select
                                                                        className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                                        value={slot.start}
                                                                        onChange={(e) => updateSlot(day.key, index, 'start', e.target.value)}
                                                                    >
                                                                        <option value="">Start</option>
                                                                        {timeOptions.map((time) => (
                                                                            <option key={`start-${time}`} value={time}>{time}</option>
                                                                        ))}
                                                                    </select>
                                                                    <span className="text-gray-400">to</span>
                                                                    <select
                                                                        className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                                        value={slot.end}
                                                                        onChange={(e) => updateSlot(day.key, index, 'end', e.target.value)}
                                                                    >
                                                                        <option value="">End</option>
                                                                        {timeOptions.map((time) => (
                                                                            <option key={`end-${time}`} value={time}>{time}</option>
                                                                        ))}
                                                                    </select>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeSlot(day.key, index)}
                                                                        className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button type="submit" className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium">Save Settings</button>
                            </form>
                        </div>
                    } />

                    <Route path="appointments" element={
                        <div className="relative">
                            <h2 className="text-xl font-semibold mb-6">Today's Appointments</h2>
                            
                            {selectedPatient && (
                                <div className="mb-6 p-6 border-2 border-teal-100 rounded-xl bg-teal-50/50 relative">
                                    <button onClick={() => setSelectedPatient(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                    <h3 className="text-lg font-bold text-teal-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5"/> Patient Health Profile</h3>
                                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p><span className="font-semibold text-gray-700">Name:</span> {selectedPatient.name}</p>
                                            <p><span className="font-semibold text-gray-700">Age:</span> {selectedPatient.age || 'N/A'}</p>
                                            <p><span className="font-semibold text-gray-700">Contact:</span> {selectedPatient.contactNumber || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p><span className="font-semibold text-gray-700">Vitals:</span> BP: {selectedPatient.vitals?.bloodPressure || '-'}, HR: {selectedPatient.vitals?.heartRate || '-'}, Wt: {selectedPatient.vitals?.weight || '-'}</p>
                                            <p><span className="font-semibold text-gray-700">Allergies:</span> {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? selectedPatient.allergies.join(', ') : 'None'}</p>
                                        </div>
                                    </div>
                                    {selectedPatient.reports && selectedPatient.reports.length > 0 && (
                                        <div className="mt-4">
                                            <p className="font-semibold text-gray-700 mb-2">Medical Reports:</p>
                                            <div className="flex gap-2 flex-wrap">
                                                {selectedPatient.reports.map((report, i) => (
                                                    <a key={i} href={report.fileUrl} target="_blank" rel="noreferrer" className="px-3 py-1 bg-white border rounded text-xs text-blue-600 hover:underline">
                                                        {report.originalName}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                {appointments.length === 0 ? <p className="text-gray-500">No appointments scheduled.</p> : appointments.map(appt => (
                                    <div key={appt._id} className={`p-4 border rounded-xl bg-white/50 flex flex-col md:flex-row justify-between md:items-center ${appt.status === 'cancelled' || appt.status === 'rejected' ? 'opacity-50' : ''}`}>
                                        <div className="mb-4 md:mb-0">
                                            <h3 className="font-bold cursor-pointer hover:text-teal-600" onClick={() => viewPatientProfile(appt.patientId)}>
                                                Patient ID: <span className="underline">{appt.patientId}</span>
                                            </h3>
                                            <p className="text-gray-500 text-sm">{appt.date} • {appt.time} • Status: <span className="font-medium capitalize">{appt.status}</span></p>
                                        </div>
                                        <div className="flex gap-2">
                                            {appt.status === 'pending' && (
                                                <>
                                                    <button onClick={() => viewPatientProfile(appt.patientId)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">View Patient</button>
                                                    <button onClick={() => handleAccept(appt._id)} className="px-4 py-2 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg hover:bg-teal-100">Accept</button>
                                                    <button onClick={() => handleReject(appt._id)} className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100">Reject</button>
                                                </>
                                            )}
                                            {appt.status === 'accepted' && (
                                                <>
                                                    <button onClick={() => viewPatientProfile(appt.patientId)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">View Patient</button>
                                                    <button onClick={() => startTelemedicine(appt._id)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Start Call</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    } />

                    <Route path="telemedicine" element={
                        <div>
                            <h2 className="text-xl font-semibold mb-6">Telemedicine Session</h2>
                            {activeCall ? (
                                <VideoCall channelName={activeCall} onEndCall={() => setActiveCall(null)} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <Video className="w-12 h-12 mb-4 text-gray-300" />
                                    <p>Select an appointment and click "Start Call" to initiate a session.</p>
                                </div>
                            )}
                        </div>
                    } />

                    <Route path="prescriptions" element={
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Issue Digital Prescription</h2>
                            
                            <div className="p-6 border rounded-xl bg-white/50">
                                <form onSubmit={handleIssuePrescription} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Patient ID</label>
                                            <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={newScript.patientId} onChange={e => setNewScript({...newScript, patientId: e.target.value})} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Medication</label>
                                            <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={newScript.medication} onChange={e => setNewScript({...newScript, medication: e.target.value})} placeholder="e.g. Amoxicillin 500mg" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Instructions</label>
                                        <textarea required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" rows="3" value={newScript.instructions} onChange={e => setNewScript({...newScript, instructions: e.target.value})} placeholder="Take 1 pill every 8 hours..."></textarea>
                                    </div>
                                    <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium">Issue Prescription</button>
                                </form>
                            </div>

                            <div className="space-y-4 mt-8">
                                <h3 className="font-medium text-lg">Past Prescriptions</h3>
                                {prescriptions.length === 0 ? <p className="text-gray-500">No prescriptions issued yet.</p> : prescriptions.map(script => (
                                    <div key={script._id} className="p-4 border rounded-xl bg-white flex flex-col md:flex-row justify-between md:items-center">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{script.medication}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{script.instructions}</p>
                                            <p className="text-xs text-gray-400 mt-2">Patient ID: {script.patientId} • Issued: {new Date(script.issuedAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    } />
                </Routes>
            </div>
        </div>
    );
}
