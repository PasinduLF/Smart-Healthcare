import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAppointmentServiceUrl, getDoctorServiceUrl, getPatientServiceUrl } from '../../config/api';
import { Users, ShieldCheck, Activity, Search } from 'lucide-react';

export default function UsersOverview() {
    const { token } = useAuth();
    const [stats, setStats] = useState({ patients: 0, doctors: 0, appointments: 0 });
    const [pendingDoctors, setPendingDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [pRes, dRes, aRes, pendRes] = await Promise.all([
                    axios.get(getPatientServiceUrl('/stats'), config),
                    axios.get(getDoctorServiceUrl('/stats'), config),
                    axios.get(getAppointmentServiceUrl('/stats'), config),
                    axios.get(getDoctorServiceUrl('/pending'), config)
                ]);
                
                setStats({
                    patients: pRes.data.totalPatients || 0,
                    doctors: dRes.data.verifiedDoctors || 0,
                    appointments: aRes.data.totalAppointments || 0
                });
                setPendingDoctors(pendRes.data);
            } catch (err) {
                console.error("Error fetching admin data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const handleVerify = async (doctorId) => {
        try {
            await axios.put(getDoctorServiceUrl(`/verify/${doctorId}`), {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingDoctors((Array.isArray(pendingDoctors) ? pendingDoctors : []).filter(d => d._id !== doctorId));
            setStats(prev => ({ ...prev, doctors: prev.doctors + 1 }));
            alert("Doctor verified successfully!");
        } catch (err) {
            console.error("Error verifying doctor", err);
        }
    };

    if (loading) return <div className="text-center py-10 text-slate-400 font-black uppercase tracking-widest text-[10px]">Processing system metrics...</div>;

    return (
        <div className="space-y-10">
            <div className="grid md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Patients', value: stats.patients, icon: Users, color: 'brand' },
                    { label: 'Verified Doctors', value: stats.doctors, icon: ShieldCheck, color: 'brand' },
                    { label: 'Live Appointments', value: stats.appointments, icon: Activity, color: 'navy' }
                ].map((stat, i) => (
                    <div key={i} className="glass-premium p-8 relative overflow-hidden group">
                        <stat.icon className={`absolute -right-4 -bottom-4 w-24 h-24 text-${stat.color}-500/5 group-hover:scale-110 transition-transform`} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{stat.label}</h3>
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="glass-premium p-8 lg:p-12">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verification Queue</h2>
                        <p className="text-slate-500 font-medium text-sm">Reviewing medical credentials for new specialist accounts.</p>
                    </div>
                    <span className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">{pendingDoctors.length} Awaiting Review</span>
                </div>

                <div className="space-y-4">
                    {pendingDoctors.length === 0 ? (
                        <div className="p-12 text-center border-4 border-dashed border-slate-50 rounded-[40px]">
                            <p className="text-slate-300 font-bold italic">Queue stable. No pending medical verifications.</p>
                        </div>
                    ) : (
                        pendingDoctors.map(doctor => (
                            <div key={doctor._id} className="p-6 border border-slate-50 rounded-2xl bg-white flex flex-col lg:flex-row justify-between lg:items-center shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all">
                                <div className="mb-4 lg:mb-0">
                                    <h3 className="font-black text-slate-800 text-lg tracking-tight">Dr. {doctor.name}</h3>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-tight mb-3">{doctor.specialty} • Established {new Date(doctor.createdAt).toLocaleDateString()}</p>
                                    <button className="flex items-center gap-2 text-navy-600 text-xs font-black uppercase tracking-widest hover:text-navy-700">
                                        <Search className="w-3 h-3" /> View Credentials
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-6 py-3 bg-coral-50 text-coral-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-coral-100 transition-all border border-coral-100">Decline</button>
                                    <button onClick={() => handleVerify(doctor._id)} className="px-6 py-3 bg-navy-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-navy-700 transition-all shadow-lg shadow-navy-200">Approve Specialist</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
