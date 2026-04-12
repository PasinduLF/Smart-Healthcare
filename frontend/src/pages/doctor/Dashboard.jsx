import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
    BarChart3, Users, CalendarCheck, Pill, Clock, CheckCircle2,
    XCircle, TrendingUp, Activity, Star
} from 'lucide-react';

export default function DoctorDashboard() {
    const { user, token } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;
            try {
                const [apptsRes, scriptsRes] = await Promise.all([
                    axios.get(`http://localhost:3000/api/appointments/doctor/${user.id}`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`http://localhost:3000/api/doctors/prescriptions/doctor/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setAppointments(Array.isArray(apptsRes.data) ? apptsRes.data : []);
                setPrescriptions(Array.isArray(scriptsRes.data) ? scriptsRes.data : []);
            } catch (err) {
                console.error('Dashboard fetch error', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, token]);

    const stats = useMemo(() => {
        const uniquePatients = [...new Set(appointments.map(a => a.patientId))];
        const accepted = appointments.filter(a => a.status === 'accepted');
        const rejected = appointments.filter(a => a.status === 'rejected');
        const pending = appointments.filter(a => a.status === 'pending');
        const cancelled = appointments.filter(a => a.status === 'cancelled');

        // Monthly data (last 6 months)
        const monthlyData = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = d.toLocaleDateString('en-US', { month: 'short' });
            const year = d.getFullYear();
            const monthAppts = appointments.filter(a => {
                const ad = new Date(a.date || a.createdAt);
                return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
            });
            const monthScripts = prescriptions.filter(p => {
                const pd = new Date(p.issuedAt);
                return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
            });
            monthlyData.push({ month: `${month} ${year}`, appointments: monthAppts.length, prescriptions: monthScripts.length });
        }

        // Acceptance rate
        const decided = accepted.length + rejected.length;
        const acceptanceRate = decided > 0 ? Math.round((accepted.length / decided) * 100) : 0;

        return {
            totalPatients: uniquePatients.length,
            totalAppointments: appointments.length,
            totalPrescriptions: prescriptions.length,
            accepted: accepted.length,
            rejected: rejected.length,
            pending: pending.length,
            cancelled: cancelled.length,
            acceptanceRate,
            monthlyData
        };
    }, [appointments, prescriptions]);

    // Simple bar chart renderer
    const maxVal = useMemo(() => {
        return Math.max(1, ...stats.monthlyData.map(m => Math.max(m.appointments, m.prescriptions)));
    }, [stats.monthlyData]);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-600 border-t-transparent"></div>
            <span className="ml-3 text-gray-500">Loading dashboard...</span>
        </div>
    );

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-navy-800 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-brand-600" />
                    Performance Dashboard
                </h2>
                <p className="text-sm text-gray-500 mt-1">Overview of your clinical performance and activity</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-navy-50 rounded-xl">
                            <Users className="w-5 h-5 text-navy-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Patients</span>
                    </div>
                    <p className="text-3xl font-black text-navy-800">{stats.totalPatients}</p>
                    <p className="text-xs text-gray-400 mt-1">Unique patients handled</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-brand-50 rounded-xl">
                            <CalendarCheck className="w-5 h-5 text-brand-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Appointments</span>
                    </div>
                    <p className="text-3xl font-black text-navy-800">{stats.totalAppointments}</p>
                    <p className="text-xs text-gray-400 mt-1">Total appointments</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl">
                            <Pill className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Prescriptions</span>
                    </div>
                    <p className="text-3xl font-black text-navy-800">{stats.totalPrescriptions}</p>
                    <p className="text-xs text-gray-400 mt-1">Prescriptions issued</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-amber-50 rounded-xl">
                            <Star className="w-5 h-5 text-amber-500" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Acceptance Rate</span>
                    </div>
                    <p className="text-3xl font-black text-navy-800">{stats.acceptanceRate}%</p>
                    <p className="text-xs text-gray-400 mt-1">Of decided appointments</p>
                </div>
            </div>

            {/* Appointment Status Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-5 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Appointment Status Breakdown
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-amber-700">Pending</span>
                        </div>
                        <p className="text-2xl font-black text-amber-800">{stats.pending}</p>
                        <div className="mt-2 w-full bg-amber-100 rounded-full h-1.5">
                            <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${stats.totalAppointments ? (stats.pending / stats.totalAppointments) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-700">Accepted</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-800">{stats.accepted}</p>
                        <div className="mt-2 w-full bg-emerald-100 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${stats.totalAppointments ? (stats.accepted / stats.totalAppointments) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                    <div className="p-4 bg-coral-50 rounded-xl border border-coral-100">
                        <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-4 h-4 text-coral-500" />
                            <span className="text-xs font-bold text-coral-700">Rejected</span>
                        </div>
                        <p className="text-2xl font-black text-coral-800">{stats.rejected}</p>
                        <div className="mt-2 w-full bg-coral-100 rounded-full h-1.5">
                            <div className="bg-coral-500 h-1.5 rounded-full transition-all" style={{ width: `${stats.totalAppointments ? (stats.rejected / stats.totalAppointments) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-bold text-gray-600">Cancelled</span>
                        </div>
                        <p className="text-2xl font-black text-gray-700">{stats.cancelled}</p>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-gray-400 h-1.5 rounded-full transition-all" style={{ width: `${stats.totalAppointments ? (stats.cancelled / stats.totalAppointments) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Activity Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Monthly Activity (Last 6 Months)
                </h3>
                <div className="flex items-end gap-4 h-48">
                    {stats.monthlyData.map((m, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex gap-1 items-end justify-center" style={{ height: '160px' }}>
                                <div className="flex-1 bg-navy-400 rounded-t-lg transition-all hover:bg-navy-500 relative group"
                                    style={{ height: `${Math.max(4, (m.appointments / maxVal) * 100)}%` }}>
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-navy-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                        {m.appointments} appts
                                    </div>
                                </div>
                                <div className="flex-1 bg-brand-400 rounded-t-lg transition-all hover:bg-brand-500 relative group"
                                    style={{ height: `${Math.max(4, (m.prescriptions / maxVal) * 100)}%` }}>
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                        {m.prescriptions} Rx
                                    </div>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium mt-1">{m.month.split(' ')[0]}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-navy-400 rounded-sm"></div>
                        <span className="text-xs text-gray-500">Appointments</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-brand-400 rounded-sm"></div>
                        <span className="text-xs text-gray-500">Prescriptions</span>
                    </div>
                </div>
            </div>

            {/* Recent Prescriptions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2">
                    <Pill className="w-4 h-4" /> Recent Prescriptions
                </h3>
                {prescriptions.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No prescriptions issued yet.</p>
                ) : (
                    <div className="space-y-3">
                        {prescriptions.slice(0, 5).map(script => (
                            <div key={script._id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl hover:bg-gray-50 transition">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                        <Pill className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-navy-800">{script.medication}</p>
                                        <p className="text-xs text-gray-400">{script.patientName || 'Patient'}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {new Date(script.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
