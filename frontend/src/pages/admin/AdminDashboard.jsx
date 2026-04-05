import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAppointmentServiceUrl, getDoctorServiceUrl, getPatientServiceUrl, getPaymentServiceUrl } from '../../config/api';
import { 
    Users, 
    ShieldCheck, 
    Activity, 
    DollarSign, 
    TrendingUp, 
    Clock, 
    ArrowRight,
    Search
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
    const { token } = useAuth();
    const [stats, setStats] = useState({ 
        patients: 0, 
        doctors: 0, 
        appointments: 0, 
        revenue: 0 
    });
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [pendingDoctors, setPendingDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [pRes, dRes, aRes, pendRes, txRes] = await Promise.all([
                    axios.get(getPatientServiceUrl('/stats'), config),
                    axios.get(getDoctorServiceUrl('/stats'), config),
                    axios.get(getAppointmentServiceUrl('/stats'), config),
                    axios.get(getDoctorServiceUrl('/pending'), config),
                    axios.get(getPaymentServiceUrl('/transactions'), config)
                ]);

                // Calculate total revenue from transactions
                const totalRevenue = txRes.data.reduce((acc, tx) => acc + (tx.amount || 0), 0);

                setStats({
                    patients: pRes.data.totalPatients || 0,
                    doctors: dRes.data.verifiedDoctors || 0,
                    appointments: aRes.data.totalAppointments || 0,
                    revenue: totalRevenue / 100 // Convert cents/smallest unit to dollars
                });
                setPendingDoctors(pendRes.data.slice(0, 3)); // Only show top 3
                setRecentTransactions(txRes.data.slice(0, 5)); // Only show top 5
            } catch (err) {
                console.error("Error fetching dashboard overview", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [token]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 bg-indigo-100 rounded-full mb-4"></div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Synchronizing System Metrics...</p>
        </div>
    );

    const metrics = [
        { label: 'Total Patients', value: stats.patients, icon: Users, color: 'blue', trend: '+12%' },
        { label: 'Verified Doctors', value: stats.doctors, icon: ShieldCheck, color: 'emerald', trend: '+5%' },
        { label: 'System Revenue', value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'indigo', trend: '+24%' },
        { label: 'Total Consultations', value: stats.appointments, icon: Activity, color: 'rose', trend: '+18%' }
    ];

    return (
        <div className="space-y-10 pb-20">
            {/* System Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Command Center.</h1>
                    <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-widest">Global Healthcare Platform Administrator</p>
                </div>
                <div className="flex items-center gap-4 px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-600">System Online: active</span>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((m, i) => (
                    <div key={i} className="glass-premium p-8 relative overflow-hidden group hover:-translate-y-1 transition-all duration-500">
                        <m.icon className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-500/5 group-hover:scale-110 transition-transform" />
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-slate-50 text-slate-900 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <m.icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{m.trend}</span>
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{m.label}</h3>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter">{m.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Recent Financial Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-premium p-1 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                                Recent Financial Activity
                            </h2>
                            <Link to="/admin/payments" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                                View Full Ledger <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-slate-50 bg-white">
                                    {recentTransactions.length === 0 ? (
                                        <tr>
                                            <td className="p-10 text-center text-slate-300 font-bold italic">No financial records current.</td>
                                        </tr>
                                    ) : (
                                        recentTransactions.map(tx => (
                                            <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <p className="font-bold text-slate-800 text-sm">{tx.description}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 italic">ID: #{tx._id.slice(-6).toUpperCase()}</p>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <p className="font-black text-slate-900 tracking-tighter italic text-lg leading-none">${(tx.amount/100).toFixed(2)}</p>
                                                    <span className="text-[9px] font-black tracking-widest uppercase text-emerald-500 mt-1 block">CONFIRMED</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Verification Queue & Shortcuts */}
                <div className="space-y-8">
                    {/* Verification Queue */}
                    <div className="glass-premium p-8">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 mb-6">
                            <ShieldCheck className="w-5 h-5 text-orange-500" />
                            Verification Queue
                        </h2>
                        <div className="space-y-4">
                            {pendingDoctors.length === 0 ? (
                                <p className="text-center py-6 text-slate-300 font-bold italic text-sm">All specialists verified.</p>
                            ) : (
                                pendingDoctors.map(doctor => (
                                    <div key={doctor._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="font-black text-slate-800 text-sm">Dr. {doctor.name.split(' ')[1] || doctor.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{doctor.specialty}</p>
                                        </div>
                                        <Link to="/admin/users" className="p-2 bg-white rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors shadow-sm">
                                            <Search className="w-4 h-4 text-indigo-600" />
                                        </Link>
                                    </div>
                                ))
                            )}
                            <Link to="/admin/users" className="w-full py-4 text-center font-black uppercase text-[10px] tracking-widest text-slate-400 border border-dashed border-slate-200 rounded-2xl hover:text-indigo-600 hover:border-indigo-200 transition-all block">
                                Enter Verification Portal
                            </Link>
                        </div>
                    </div>

                    {/* Quick Access */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/admin/settings" className="p-6 bg-slate-900 rounded-[2rem] text-white flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform group shadow-xl shadow-slate-200">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20">
                                <Activity className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Config</span>
                        </Link>
                        <button className="p-6 bg-indigo-600 rounded-[2rem] text-white flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform group shadow-xl shadow-indigo-100">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Logs</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
