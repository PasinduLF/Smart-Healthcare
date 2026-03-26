import React, { useState } from 'react';
import { Search, Calendar, Video, FileText, Brain, LogOut, Activity, User, Pill } from 'lucide-react';
import { useNavigate, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Modular Patient components
import SearchDoctors from './patient/SearchDoctors';
import PatientAppointments from './patient/Appointments';
import AIAnalyzer from './patient/AIAnalyzer';
import HealthProfile from './patient/HealthProfile';
import MedicalReports from './patient/MedicalReports';
import Profile from './patient/Profile';
import Prescriptions from './patient/Prescriptions';
import Telemedicine from './patient/Telemedicine';
import BookAppointment from './BookAppointment';

export default function PatientDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeCall, setActiveCall] = useState(null);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const tabs = [
        { path: '/patient/profile', icon: User, label: 'My Profile' },
        { path: '/patient/search', icon: Search, label: 'Find Doctors' },
        { path: '/patient/appointments', icon: Calendar, label: 'My Appointments' },
        { path: '/patient/telemedicine', icon: Video, label: 'Video Consult' },
        { path: '/patient/health', icon: Activity, label: 'Health Profile' },
        { path: '/patient/prescriptions', icon: Pill, label: 'Prescriptions' },
        { path: '/patient/reports', icon: FileText, label: 'Medical Reports' },
        { path: '/patient/ai', icon: Brain, label: 'Symptom Checker' }
    ];

    return (
        <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Patient Portal</h1>
                    <p className="text-slate-500 font-medium">Welcome back, {user?.name}</p>
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
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-100'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </Link>
                ))}
            </div>

            <div className="glass-premium p-8 lg:p-12 min-h-[500px]">
                <Routes>
                    <Route path="/" element={<Navigate to="search" replace />} />
                    <Route path="search" element={<SearchDoctors />} />
                    <Route path="book/:doctorId" element={<BookAppointment />} />
                    <Route path="appointments" element={<PatientAppointments setActiveCall={setActiveCall} />} />
                    <Route path="telemedicine" element={<Telemedicine activeCall={activeCall} setActiveCall={setActiveCall} />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="health" element={<HealthProfile />} />
                    <Route path="prescriptions" element={<Prescriptions />} />
                    <Route path="reports" element={<MedicalReports />} />
                    <Route path="ai" element={<AIAnalyzer />} />
                </Routes>
            </div>
        </div>
    );
}
