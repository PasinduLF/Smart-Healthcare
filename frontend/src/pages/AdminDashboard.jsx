import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Activity, LogOut, DollarSign, Settings } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

export default function AdminDashboard() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ patients: 0, doctors: 0, appointments: 0 });
    const [pendingDoctors, setPendingDoctors] = useState([]);
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        // Fetch Admin Stats
        const fetchStats = async () => {
            if (!token) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [pRes, dRes, aRes] = await Promise.all([
                    axios.get('http://localhost:3000/api/patients/stats', config),
                    axios.get('http://localhost:3000/api/doctors/stats', config),
                    axios.get('http://localhost:3000/api/appointments/stats', config)
                ]);
                setStats({
                    patients: pRes.data.totalPatients || 0,
                    doctors: dRes.data.verifiedDoctors || 0,
                    appointments: aRes.data.totalAppointments || 0
                });
            } catch (err) {
                console.error("Error fetching admin stats", err);
            }
        };

        const fetchPending = async () => {
            if (!token) return;
            try {
                const res = await axios.get('http://localhost:3000/api/doctors/pending', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPendingDoctors(res.data);
            } catch (err) {
                console.error("Error fetching pending doctors", err);
            }
        };

        const fetchTransactions = async () => {
            if (!token) return;
            try {
                const res = await axios.get('http://localhost:3000/api/payments/transactions', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTransactions(res.data);
            } catch (err) {
                console.error("Error fetching transactions", err);
            }
        };

        fetchStats();
        fetchPending();
        fetchTransactions();
    }, [token]);

    const handleVerify = async (doctorId) => {
        try {
            await axios.put(`http://localhost:3000/api/doctors/verify/${doctorId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingDoctors(pendingDoctors.filter(d => d._id !== doctorId));
            setStats(prev => ({ ...prev, doctors: prev.doctors + 1 }));
        } catch (err) {
            console.error("Error verifying doctor", err);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium">
                    <LogOut className="w-5 h-5" /> Logout
                </button>
            </div>

            <div className="flex gap-4 mb-8 overflow-x-auto pb-4">
                {[
                    { path: '/admin/users', icon: Users, label: 'Users Overview' },
                    { path: '/admin/payments', icon: DollarSign, label: 'Manage Payments' },
                    { path: '/admin/settings', icon: Settings, label: 'Platform Settings' }
                ].map(tab => (
                    <Link
                        key={tab.path}
                        to={tab.path}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition whitespace-nowrap ${location.pathname === tab.path
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white text-gray-600 hover:bg-blue-50'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </Link>
                ))}
            </div>

            <Routes>
                <Route path="/" element={<Navigate to="users" replace />} />
                
                <Route path="users" element={
                    <>
                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                            <div className="glass-card p-6 border-l-4 border-l-blue-500">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-gray-500 font-medium">Total Patients</h3>
                                    <Users className="text-blue-500" />
                                </div>
                                <p className="text-3xl font-bold">{stats.patients}</p>
                            </div>
                            <div className="glass-card p-6 border-l-4 border-l-teal-500">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-gray-500 font-medium">Verified Doctors</h3>
                                    <ShieldCheck className="text-teal-500" />
                                </div>
                                <p className="text-3xl font-bold">{stats.doctors}</p>
                            </div>
                            <div className="glass-card p-6 border-l-4 border-l-purple-500">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-gray-500 font-medium">Total Appointments</h3>
                                    <Activity className="text-purple-500" />
                                </div>
                                <p className="text-3xl font-bold">{stats.appointments}</p>
                            </div>
                        </div>

                        <div className="glass-card p-8">
                            <h2 className="text-xl font-semibold mb-6">Doctor Verification Queue</h2>
                            <div className="space-y-4">
                                {pendingDoctors.length === 0 ? <p className="text-gray-500">No doctors pending verification.</p> : pendingDoctors.map(doctor => (
                                    <div key={doctor._id} className="p-4 border rounded-xl bg-white flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold">Dr. {doctor.name}</h3>
                                            <p className="text-gray-500 text-sm">{doctor.specialty} • Registration: {new Date(doctor.createdAt).toLocaleDateString()}</p>
                                            <a href="#" className="text-blue-600 text-sm hover:underline">View Credentials (PDF)</a>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition">Reject</button>
                                            <button onClick={() => handleVerify(doctor._id)} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition">Verify & Approve</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                } />

                <Route path="payments" element={
                    <div className="glass-card p-8">
                        <h2 className="text-xl font-semibold mb-6">Recent Transactions</h2>
                        <div className="space-y-4">
                            {transactions.length === 0 ? <p className="text-gray-500">No transactions recorded.</p> : transactions.map(tx => (
                                <div key={tx._id} className="p-4 border rounded-xl bg-white flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold">{tx.description}</h3>
                                        <p className="text-gray-500 text-sm">{new Date(tx.date).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg">${(tx.amount/100).toFixed(2)} {tx.currency.toUpperCase()}</p>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium uppercase">{tx.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                } />

                <Route path="settings" element={
                    <div className="glass-card p-8">
                        <h2 className="text-xl font-semibold mb-6">Platform Settings</h2>
                        <div className="space-y-4 max-w-xl">
                            <div className="flex items-center justify-between p-4 border rounded-xl bg-gray-50">
                                <div>
                                    <h3 className="font-bold">Maintenance Mode</h3>
                                    <p className="text-sm text-gray-500">Temporarily disable patient bookings.</p>
                                </div>
                                <input type="checkbox" className="w-6 h-6 border-gray-300 rounded text-blue-600 focus:ring-blue-500" />
                            </div>
                            <div className="p-4 border rounded-xl bg-gray-50 space-y-2">
                                <h3 className="font-bold">Platform Fee Percentage</h3>
                                <input type="number" defaultValue="5" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                <button className="px-4 py-2 mt-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Save Fee Configuration</button>
                            </div>
                        </div>
                    </div>
                } />
            </Routes>
        </div>
    );
}
