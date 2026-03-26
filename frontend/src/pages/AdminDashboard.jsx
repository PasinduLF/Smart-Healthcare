import React from 'react';
import { Users, LogOut, DollarSign, Settings, ShieldCheck } from 'lucide-react';
import { useNavigate, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Modular Admin components
import UsersOverview from './admin/UsersOverview';
import AdminPayments from './admin/Payments';
import AdminSettings from './admin/Settings';

export default function AdminDashboard() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const tabs = [
        { path: '/admin/users', icon: Users, label: 'Master Overview' },
        { path: '/admin/payments', icon: DollarSign, label: 'Revenue Ledger' },
        { path: '/admin/settings', icon: Settings, label: 'Core Settings' }
    ];

    return (
        <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                         System Admin <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-lg uppercase font-black tracking-widest border border-blue-100 shadow-sm">Root Access</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Control Center • Global Infrastructure</p>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all font-bold shadow-sm border border-red-100">
                    <LogOut className="w-5 h-5" /> Terminate Session
                </button>
            </div>

            <div className="flex gap-3 mb-10 overflow-x-auto pb-4 no-scrollbar">
                {tabs.map(tab => (
                    <Link
                        key={tab.path}
                        to={tab.path}
                        className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all whitespace-nowrap shadow-sm border ${location.pathname.startsWith(tab.path)
                                ? 'bg-slate-900 text-white border-slate-900 shadow-slate-200'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-100'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </Link>
                ))}
            </div>

            <div className="min-h-[500px]">
                <Routes>
                    <Route path="/" element={<Navigate to="users" replace />} />
                    <Route path="users" element={<UsersOverview />} />
                    <Route path="payments" element={<AdminPayments />} />
                    <Route path="settings" element={<AdminSettings />} />
                </Routes>
            </div>
        </div>
    );
}
