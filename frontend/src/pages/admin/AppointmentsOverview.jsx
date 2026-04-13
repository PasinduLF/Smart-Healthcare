import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAppointmentServiceUrl, getDoctorServiceUrl, getPatientServiceUrl } from '../../config/api';
import { Calendar, CheckCircle } from 'lucide-react';

export default function AppointmentsOverview() {
    const { token } = useAuth();
    const [allDoctors, setAllDoctors] = useState([]);
    const [allPatients, setAllPatients] = useState([]);
    const [allAppointments, setAllAppointments] = useState([]);
    const [apptFilter, setApptFilter] = useState('all'); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [allDocsRes, allPatRes, allApptsRes] = await Promise.all([
                    axios.get(getDoctorServiceUrl('/admin/all'), config).catch(() => ({ data: [] })),
                    axios.get(getPatientServiceUrl('/admin/all'), config).catch(() => ({ data: [] })),
                    axios.get(getAppointmentServiceUrl('/admin/all'), config).catch(() => ({ data: [] }))
                ]);
                
                setAllDoctors(allDocsRes.data);
                setAllPatients(allPatRes.data);
                setAllAppointments(allApptsRes.data);
            } catch (err) {
                console.error("Error fetching admin data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    if (loading) return <div className="text-center py-10 text-slate-400 font-black uppercase tracking-widest text-[10px]">Processing appointments...</div>;

    const filteredAppts = apptFilter === 'all' 
        ? allAppointments 
        : allAppointments.filter(a => a.status === apptFilter);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Global Appointments</h1>
                <p className="text-slate-500 font-medium">Monitor all platform scheduling and session histories securely.</p>
            </div>

            <div className="glass-premium p-8 lg:p-12">
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {['all', 'pending', 'accepted', 'rejected', 'cancelled'].map(status => (
                        <button 
                            key={status}
                            onClick={() => setApptFilter(status)}
                            className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all border ${apptFilter === status ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-900'}`}
                        >
                            {status} {status !== 'all' && `(${allAppointments.filter(a => a.status === status).length})`}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {filteredAppts.length === 0 ? (
                        <div className="p-16 text-center border-4 border-dashed border-slate-100 rounded-[40px] bg-slate-50/50">
                            <p className="text-slate-400 font-bold italic text-lg">No appointments match the selected filter.</p>
                        </div>
                    ) : (
                        filteredAppts.map(appt => {
                            const doctor = allDoctors.find(d => d._id === appt.doctorId);
                            const patient = allPatients.find(p => p._id === appt.patientId);
                            
                            const statusColors = {
                                pending: 'bg-orange-50 text-orange-600 border-orange-100',
                                accepted: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                rejected: 'bg-red-50 text-red-600 border-red-100',
                                cancelled: 'bg-slate-50 text-slate-500 border-slate-200'
                            };

                            return (
                                <div key={appt._id} className="p-6 border border-slate-100 rounded-3xl bg-white flex flex-col lg:flex-row lg:items-center justify-between shadow-sm hover:shadow-xl hover:shadow-slate-100/50 transition-all">
                                    <div className="mb-4 lg:mb-0 flex gap-5 items-center">
                                        <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg tracking-tight flex items-center gap-2">
                                                {patient ? patient.name : 'Unknown Patient'}
                                                <span className="text-slate-300 font-normal">with</span>
                                                {doctor ? `Dr. ${doctor.name}` : 'Unknown Doctor'}
                                            </h3>
                                            <p className="text-slate-500 font-bold text-xs uppercase tracking-tight mt-1 items-center gap-2 flex">
                                                <span>{appt.date}</span> • <span>{appt.time}</span>
                                                <span className={`px-2 py-0.5 ml-2 text-[9px] font-black uppercase tracking-widest rounded-full border ${statusColors[appt.status] || statusColors.cancelled}`}>
                                                    {appt.status}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Payment</p>
                                        <p className={`font-bold text-sm uppercase tracking-wide flex items-center justify-end gap-1 ${appt.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {appt.paymentStatus === 'paid' && <CheckCircle className="w-4 h-4" />} {appt.paymentStatus}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
