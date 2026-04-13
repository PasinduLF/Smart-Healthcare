import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAppointmentServiceUrl, getDoctorServiceUrl, getPatientServiceUrl, getGatewayUrl } from '../../config/api';
import { Users, ShieldCheck, Activity, Search, Ban, Trash2, CheckCircle, X } from 'lucide-react';

export default function UsersOverview() {
    const { token } = useAuth();
    const [stats, setStats] = useState({ patients: 0, doctors: 0, appointments: 0 });
    const [pendingDoctors, setPendingDoctors] = useState([]);
    const [allDoctors, setAllDoctors] = useState([]);
    const [allPatients, setAllPatients] = useState([]);
    const [activeTab, setActiveTab] = useState('queue'); // queue | doctors | patients
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [pRes, dRes, aRes, pendRes, allDocsRes, allPatRes] = await Promise.all([
                    axios.get(getPatientServiceUrl('/stats'), config),
                    axios.get(getDoctorServiceUrl('/stats'), config),
                    axios.get(getAppointmentServiceUrl('/stats'), config),
                    axios.get(getDoctorServiceUrl('/pending'), config),
                    axios.get(getDoctorServiceUrl('/admin/all'), config).catch(() => ({ data: [] })),
                    axios.get(getPatientServiceUrl('/admin/all'), config).catch(() => ({ data: [] }))
                ]);
                
                setStats({
                    patients: pRes.data.totalPatients || 0,
                    doctors: dRes.data.verifiedDoctors || 0,
                    appointments: aRes.data.totalAppointments || 0
                });
                setPendingDoctors(pendRes.data);
                setAllDoctors(allDocsRes.data);
                setAllPatients(allPatRes.data);
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
            const verifiedDoc = pendingDoctors.find(d => d._id === doctorId);
            setPendingDoctors(pendingDoctors.filter(d => d._id !== doctorId));
            if (verifiedDoc) {
                verifiedDoc.verified = true;
                setAllDoctors(prev => [...prev, verifiedDoc]);
            }
            setStats(prev => ({ ...prev, doctors: prev.doctors + 1 }));
            alert("Doctor verified successfully!");
        } catch (err) {
            console.error("Error verifying doctor", err);
        }
    };

    const handleSuspend = async (id, type) => {
        try {
            const url = type === 'doctor' 
                ? getDoctorServiceUrl(`/admin/suspend/${id}`)
                : getPatientServiceUrl(`/admin/suspend/${id}`);
                
            const res = await axios.put(url, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (type === 'doctor') {
                setAllDoctors(prev => prev.map(d => d._id === id ? { ...d, isSuspended: res.data.isSuspended } : d));
            } else {
                setAllPatients(prev => prev.map(p => p._id === id ? { ...p, isSuspended: res.data.isSuspended } : p));
            }
        } catch (err) {
            console.error(`Error suspending ${type}`, err);
            alert(`Failed to suspend ${type}`);
        }
    };

    const handleDelete = async (id, type) => {
        if (!window.confirm(`Are you absolutely sure you want to permanently delete this ${type}? This cannot be undone.`)) return;
        
        try {
            const url = type === 'doctor' 
                ? getDoctorServiceUrl(`/admin/${id}`)
                : getPatientServiceUrl(`/admin/${id}`);
                
            await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
            
            if (type === 'doctor') {
                setAllDoctors(prev => prev.filter(d => d._id !== id));
                setStats(prev => ({ ...prev, doctors: Math.max(0, prev.doctors - 1) }));
            } else {
                setAllPatients(prev => prev.filter(p => p._id !== id));
                setStats(prev => ({ ...prev, patients: Math.max(0, prev.patients - 1) }));
            }
        } catch (err) {
            console.error(`Error deleting ${type}`, err);
            alert(`Failed to delete ${type}`);
        }
    };

    if (loading) return <div className="text-center py-10 text-slate-400 font-black uppercase tracking-widest text-[10px]">Processing system metrics...</div>;

    const renderVerificationQueue = () => (
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
                            <button onClick={() => setSelectedUser({ ...doctor, _type: 'doctor' })} className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-widest hover:text-indigo-700">
                                <Search className="w-3 h-3" /> View Credentials
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleDelete(doctor._id, 'doctor')} className="px-6 py-3 bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all border border-red-100">Decline</button>
                            <button onClick={() => handleVerify(doctor._id)} className="px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Approve Specialist</button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderManageList = (list, type) => (
        <div className="space-y-4">
            {list.length === 0 ? (
                <div className="p-12 text-center border-4 border-dashed border-slate-50 rounded-[40px]">
                    <p className="text-slate-300 font-bold italic">No active {type}s found in the system registry.</p>
                </div>
            ) : (
                list.map(user => (
                    <div key={user._id} className={`p-6 border rounded-2xl flex flex-col lg:flex-row justify-between lg:items-center shadow-sm transition-all ${user.isSuspended ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-50 hover:shadow-xl hover:shadow-slate-100'}`}>
                        <div className="mb-4 lg:mb-0 flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${user.isSuspended ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg tracking-tight flex items-center gap-2">
                                    {type === 'doctor' ? `Dr. ${user.name}` : user.name}
                                    {user.isSuspended && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-full">Suspended</span>}
                                </h3>
                                <p className="text-slate-400 font-bold text-xs tracking-tight mb-1">
                                    {user.email} {type === 'doctor' && `• ${user.specialty}`}
                                </p>
                                <p className="text-slate-300 font-medium text-[10px] uppercase tracking-widest">
                                    Registered: {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSelectedUser({ ...user, _type: type })}
                                className="px-4 py-2.5 flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
                            >
                                <Search className="w-4 h-4"/> View
                            </button>
                            <button 
                                onClick={() => handleSuspend(user._id, type)} 
                                className={`px-4 py-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all border ${user.isSuspended ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'}`}
                            >
                                {user.isSuspended ? <><CheckCircle className="w-4 h-4"/> Restore</> : <><Ban className="w-4 h-4"/> Suspend</>}
                            </button>
                            <button 
                                onClick={() => handleDelete(user._id, type)} 
                                className="px-4 py-2.5 flex items-center gap-2 bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all border border-red-100"
                            >
                                <Trash2 className="w-4 h-4"/> Delete
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderModal = () => {
        if (!selectedUser) return null;
        const isDoctor = selectedUser._type === 'doctor';

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
                <div className="bg-white rounded-[32px] w-full max-w-2xl p-8 lg:p-12 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    
                    <div className="flex items-center gap-6 mb-8 border-b border-slate-100 pb-8">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-3xl font-black">
                            {selectedUser.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {isDoctor ? `Dr. ${selectedUser.name}` : selectedUser.name}
                            </h2>
                            <p className="text-slate-500 font-bold">{selectedUser.email}</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                                {isDoctor ? selectedUser.specialty : 'Patient Account'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {isDoctor ? (
                            <>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Experience</h4>
                                    <p className="font-medium text-slate-900">{selectedUser.experience || 0} Years</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Consultation Fee</h4>
                                    <p className="font-medium text-slate-900">${selectedUser.consultationFee || 0}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Max Patients</h4>
                                    <p className="font-medium text-slate-900">{selectedUser.maxPatients}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Clinic</h4>
                                    <p className="font-medium text-slate-900">{selectedUser.clinicLocation || 'Not specified'}</p>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Biography</h4>
                                    <p className="font-medium text-slate-900 text-sm leading-relaxed">{selectedUser.bio || 'No biography provided.'}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Age</h4>
                                    <p className="font-medium text-slate-900">{selectedUser.age || 'Not specified'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Contact</h4>
                                    <p className="font-medium text-slate-900">{selectedUser.contactNumber || 'Not specified'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Blood Pressure</h4>
                                    <p className="font-medium text-slate-900">{selectedUser.vitals?.bloodPressure || 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Heart Rate</h4>
                                    <p className="font-medium text-slate-900">{selectedUser.vitals?.heartRate || 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Weight</h4>
                                    <p className="font-medium text-slate-900">{selectedUser.vitals?.weight || 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Height</h4>
                                    <p className="font-medium text-slate-900">{selectedUser.vitals?.height || 'N/A'}</p>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Allergies</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {selectedUser.allergies?.length > 0 ? selectedUser.allergies.map((a, i) => (
                                            <span key={i} className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full">{a}</span>
                                        )) : <span className="font-medium text-slate-400">None reported</span>}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-10">
            <div className="grid md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Patients', value: stats.patients, icon: Users, color: 'blue' },
                    { label: 'Verified Doctors', value: stats.doctors, icon: ShieldCheck, color: 'teal' },
                    { label: 'Live Appointments', value: stats.appointments, icon: Activity, color: 'indigo' }
                ].map((stat, i) => (
                    <div key={i} className="glass-premium p-8 relative overflow-hidden group">
                        <stat.icon className={`absolute -right-4 -bottom-4 w-24 h-24 text-${stat.color}-500/5 group-hover:scale-110 transition-transform`} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{stat.label}</h3>
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="glass-premium overflow-hidden">
                <div className="flex overflow-x-auto border-b border-slate-100">
                    <button 
                        onClick={() => setActiveTab('queue')}
                        className={`px-8 py-5 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'queue' ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50 border-b-2 border-transparent'}`}
                    >
                        Verification Queue <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full ml-1">{pendingDoctors.length}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('doctors')}
                        className={`px-8 py-5 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'doctors' ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50 border-b-2 border-transparent'}`}
                    >
                        Manage Doctors
                    </button>
                    <button 
                        onClick={() => setActiveTab('patients')}
                        className={`px-8 py-5 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'patients' ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50 border-b-2 border-transparent'}`}
                    >
                        Manage Patients
                    </button>
                </div>

                <div className="p-8 lg:p-12">
                    {activeTab === 'queue' && (
                        <>
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verification Queue</h2>
                                <p className="text-slate-500 font-medium text-sm">Reviewing medical credentials for new specialist accounts.</p>
                            </div>
                            {renderVerificationQueue()}
                        </>
                    )}
                    
                    {activeTab === 'doctors' && (
                        <>
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Doctors Directory</h2>
                                <p className="text-slate-500 font-medium text-sm">Manage established practitioners on the platform.</p>
                            </div>
                            {renderManageList(allDoctors.filter(d => d.verified), 'doctor')}
                        </>
                    )}

                    {activeTab === 'patients' && (
                        <>
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Patient Directory</h2>
                                <p className="text-slate-500 font-medium text-sm">Manage registered platform members and their access.</p>
                            </div>
                            {renderManageList(allPatients, 'patient')}
                        </>
                    )}
                </div>
            </div>
            {renderModal()}
        </div>
    );
}
