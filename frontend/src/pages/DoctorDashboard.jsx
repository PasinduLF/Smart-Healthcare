import React, { useState } from 'react';
import { Calendar, Clock, Video, FileSignature, LogOut, User } from 'lucide-react';
import { useNavigate, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Modular Doctor components
import DoctorSchedule from './doctor/DoctorSchedule';
import DoctorAppointments from './doctor/Appointments';
import DoctorPrescriptions from './doctor/Prescriptions';
import DoctorTelemedicine from './doctor/Telemedicine';

export default function DoctorDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeCall, setActiveCall] = useState(null);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const tabs = [
        { path: '/doctor/schedule', icon: User, label: 'Profile & Schedule' },
        { path: '/doctor/appointments', icon: Clock, label: 'Appointments' },
        { path: '/doctor/telemedicine', icon: Video, label: 'Telemedicine' },
        { path: '/doctor/prescriptions', icon: FileSignature, label: 'Prescriptions' }
    ];

    return (
        <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Clinical Portal <span className="text-xs px-2 py-1 bg-teal-50 text-teal-600 rounded-lg uppercase font-black tracking-widest border border-teal-100 shadow-sm">Verified</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Welcome back, Dr. {user?.name}</p>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all font-bold shadow-sm border border-red-100">
                    <LogOut className="w-5 h-5" /> Sign Out
                </button>
            </div>

            <div className="flex gap-3 mb-10 overflow-x-auto pb-4 no-scrollbar">
                {tabs.map(tab => (
                    <Link
                        key={tab.path}
                        to={tab.path}
                        className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all whitespace-nowrap shadow-sm border ${location.pathname.startsWith(tab.path)
                                ? 'bg-teal-600 text-white border-teal-600 shadow-teal-100/50'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-100'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </Link>
                ))}
            </div>

            <div className="glass-premium p-8 lg:p-12 min-h-[500px] border-teal-50 shadow-teal-50 shadow-2xl">
                <Routes>
                    <Route path="/" element={<Navigate to="appointments" replace />} />
                    <Route path="schedule" element={<DoctorSchedule />} />
                    <Route path="appointments" element={<DoctorAppointments setActiveCall={setActiveCall} />} />
                    <Route path="telemedicine" element={<DoctorTelemedicine activeCall={activeCall} setActiveCall={setActiveCall} />} />
                    <Route path="prescriptions" element={<DoctorPrescriptions />} />
                </Routes>
            </div>
        </div>
    );
}
