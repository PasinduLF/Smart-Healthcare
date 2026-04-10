import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { ShieldCheck, AlertTriangle, Pill, User, Stethoscope, Calendar, FileText, Activity, Hash } from 'lucide-react';

export default function VerifyPrescription() {
    const { id } = useParams();
    const [prescription, setPrescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPrescription = async () => {
            if (!id) { setError('No prescription ID provided.'); setLoading(false); return; }
            try {
                const res = await axios.get(`${API_BASE_URL}/api/doctors/prescriptions/verify/${id}`);
                setPrescription(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Prescription not found or could not be verified.');
            } finally {
                setLoading(false);
            }
        };
        fetchPrescription();
    }, [id]);

    const prescId = prescription ? `PRES-${prescription._id.slice(-6).toUpperCase()}` : '';
    const issuedDate = prescription
        ? new Date(prescription.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        : '';

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-500 font-semibold text-sm tracking-widest uppercase">Verifying Prescription…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-red-100 p-10 text-center space-y-6 border border-red-100">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto border-2 border-red-100">
                        <AlertTriangle className="w-10 h-10 text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verification Failed</h1>
                        <p className="text-slate-500 mt-2 text-sm">{error}</p>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                        <p className="text-xs text-red-500 font-bold">This QR code may be invalid, expired, or tampered with.</p>
                    </div>
                    <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl text-sm hover:bg-slate-800 transition-all">
                        <Activity className="w-4 h-4" /> Go to SmartHealth
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/30 py-10 px-4">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="p-2 bg-teal-500 rounded-xl shadow-lg shadow-teal-200">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-black text-slate-900 tracking-tight">SmartHealth</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-sm font-bold">
                        <ShieldCheck className="w-4 h-4" />
                        Prescription Verified & Authentic
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/80 overflow-hidden border border-slate-100">

                    {/* Card Header Bar */}
                    <div className="bg-gradient-to-r from-[#1A2B4C] to-[#2563eb] px-8 py-6 flex items-center justify-between">
                        <div>
                            <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">Digital Prescription</p>
                            <h1 className="text-white text-2xl font-black tracking-tight">Rx Document</h1>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">ID</p>
                            <p className="text-white font-black text-lg font-mono">{prescId}</p>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">

                        {/* Doctor & Patient Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl border border-blue-100 space-y-1">
                                <div className="flex items-center gap-2 text-blue-600 mb-2">
                                    <Stethoscope className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">Prescribing Doctor</span>
                                </div>
                                <p className="text-slate-900 font-black text-lg">Dr. {prescription.doctorName || 'Unknown'}</p>
                                <p className="text-slate-400 text-xs font-semibold">Licensed Medical Practitioner</p>
                            </div>
                            <div className="p-5 bg-gradient-to-br from-teal-50 to-slate-50 rounded-2xl border border-teal-100 space-y-1">
                                <div className="flex items-center gap-2 text-teal-600 mb-2">
                                    <User className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">Patient</span>
                                </div>
                                <p className="text-slate-900 font-black text-lg">{prescription.patientName || 'Unknown'}</p>
                                <p className="text-slate-400 text-xs font-semibold">Registered Patient</p>
                            </div>
                        </div>

                        {/* Medication */}
                        <div className="p-6 bg-gradient-to-r from-[#1A2B4C]/5 to-[#00D2D3]/10 rounded-2xl border border-[#00D2D3]/20">
                            <div className="flex items-center gap-2 text-[#00D2D3] mb-3">
                                <Pill className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-widest">Medication Prescribed</span>
                            </div>
                            <p className="text-slate-900 font-black text-2xl leading-tight">{prescription.medication}</p>
                        </div>

                        {/* Instructions */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500 mb-3">
                                <FileText className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-widest">Clinical Instructions</span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed">{prescription.instructions}</p>
                        </div>

                        {/* Meta Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100 space-y-1">
                                <div className="flex items-center gap-1.5 text-orange-500 mb-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Date Issued</span>
                                </div>
                                <p className="text-slate-800 font-bold text-sm">{issuedDate}</p>
                            </div>
                            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-1">
                                <div className="flex items-center gap-1.5 text-purple-500 mb-1">
                                    <Hash className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Prescription ID</span>
                                </div>
                                <p className="text-slate-800 font-bold text-sm font-mono">{prescId}</p>
                            </div>
                        </div>

                        {/* Digital Signature */}
                        {prescription.signature && (
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Digital Signature</p>
                                <div className="flex items-end gap-4">
                                    <img src={prescription.signature} alt="Doctor Signature" className="h-14 object-contain" />
                                    <div>
                                        <p className="text-slate-700 font-bold text-sm">Dr. {prescription.doctorName}</p>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#00D2D3] uppercase tracking-wide">
                                            <ShieldCheck className="w-3 h-3" /> Digitally Signed
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Authenticity Footer */}
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                            <ShieldCheck className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                            <div>
                                <p className="text-emerald-800 font-black text-sm">Verified by SmartHealth</p>
                                <p className="text-emerald-600 text-xs font-medium mt-0.5">This prescription is digitally verified and has not been tampered with.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-400 font-medium pb-6">
                    © {new Date().getFullYear()} SmartHealth · Secure Digital Health Records
                </p>
            </div>
        </div>
    );
}
