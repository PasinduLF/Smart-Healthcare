import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Download, Pill, ShieldCheck, PenTool, Eye, X, QrCode, User, Stethoscope, Calendar, FileText, Hash } from 'lucide-react';
import QRCode from 'qrcode';

export default function Prescriptions() {
    const { user, token } = useAuth();
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedScript, setSelectedScript] = useState(null);  // for modal
    const [qrDataUrl, setQrDataUrl] = useState('');
    const modalRef = useRef(null);

    useEffect(() => {
        const fetchPrescriptions = async () => {
            if (!user?.id) return;
            try {
                const res = await axios.get(`http://localhost:3000/api/doctors/prescriptions/patient/${user.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPrescriptions(res.data);
            } catch (err) {
                console.error('Failed to fetch prescriptions', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPrescriptions();
    }, [user, token]);

    // Build QR text data — all details embedded, NO URL
    const buildQrText = (script) => {
        const doctorName = script.doctorName || 'Unknown';
        const patientName = script.patientName || user?.name || 'Unknown';
        const date = new Date(script.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const prescId = `PRES-${script._id.slice(-6).toUpperCase()}`;

        return `SmartHealth — Digital Prescription
━━━━━━━━━━━━━━━━━━━━━━
ID: ${prescId}
Date: ${date}
━━━━━━━━━━━━━━━━━━━━━━
DOCTOR: Dr. ${doctorName}
PATIENT: ${patientName}
━━━━━━━━━━━━━━━━━━━━━━
Rx MEDICATION:
${script.medication}

INSTRUCTIONS:
${script.instructions}
━━━━━━━━━━━━━━━━━━━━━━
✓ Verified by SmartHealth
Platform: SmartHealth Healthcare`;
    };

    // Open modal for a prescription and generate QR
    const openDetails = async (script) => {
        setSelectedScript(script);
        setQrDataUrl('');
        try {
            const text = buildQrText(script);
            const url = await QRCode.toDataURL(text, {
                width: 220,
                margin: 2,
                color: { dark: '#1A2B4C', light: '#FFFFFF' },
                errorCorrectionLevel: 'M'
            });
            setQrDataUrl(url);
        } catch (err) {
            console.error('QR generation failed', err);
        }
    };

    const closeModal = () => {
        setSelectedScript(null);
        setQrDataUrl('');
    };

    // Click outside closes modal
    const handleBackdrop = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) closeModal();
    };

    // Download (print) the prescription PDF
    const downloadPrescription = async (script) => {
        const doctorName = script.doctorName || 'Doctor';
        const patientName = script.patientName || user?.name || 'Patient';
        const date = new Date(script.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const prescId = `PRES-${script._id.slice(-6).toUpperCase()}`;

        let printQrDataUrl = '';
        try {
            const text = buildQrText(script);
            printQrDataUrl = await QRCode.toDataURL(text, {
                width: 160,
                margin: 2,
                color: { dark: '#1A2B4C', light: '#FFFFFF' }
            });
        } catch (err) {
            console.error('QR generation failed', err);
        }

        const signatureHtml = script.signature
            ? `<div class="signature"><img src="${script.signature}" alt="Doctor Signature" style="height:50px;margin-bottom:6px;" /><p>Dr. ${doctorName}</p><p style="font-size:9px;color:#00D2D3;font-weight:700;margin-top:2px;">✓ Digitally Signed</p></div>`
            : `<div class="signature"><div class="line"></div><p>Dr. ${doctorName}</p></div>`;

        const qrHtml = printQrDataUrl
            ? `<div class="qr-section"><img src="${printQrDataUrl}" alt="QR Code" /><p>Scan QR to see prescription details</p></div>`
            : '';

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Prescription ${prescId}</title>
<style>
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1A2B4C; position: relative; min-height: 100vh; }
.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 72px; font-weight: 900; color: rgba(26,43,76,0.04); white-space: nowrap; pointer-events: none; z-index: 0; letter-spacing: 8px; }
.content { position: relative; z-index: 1; max-width: 700px; margin: 0 auto; }
.header { text-align: center; border-bottom: 3px solid #00D2D3; padding-bottom: 20px; margin-bottom: 30px; }
.header h1 { margin: 0; font-size: 28px; color: #1A2B4C; letter-spacing: 2px; }
.header .subtitle { color: #00D2D3; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; margin-top: 4px; }
.doctor-info { background: #f0fdfd; border: 1px solid #b3f0f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
.doctor-info h2 { margin: 0 0 4px 0; font-size: 18px; color: #1A2B4C; }
.doctor-info p { margin: 0; font-size: 13px; color: #5a7ba8; }
.rx { font-size: 48px; color: #00D2D3; font-weight: 900; margin-right: 12px; float: left; line-height: 1; }
.section { margin-bottom: 20px; }
.section-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #a3b7d1; margin-bottom: 6px; }
.section-value { font-size: 15px; line-height: 1.6; }
.medication { font-size: 22px; font-weight: 800; color: #1A2B4C; }
.meta { display: flex; gap: 40px; border-top: 1px solid #e8edf4; padding-top: 20px; margin-top: 30px; }
.meta-item .label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #a3b7d1; }
.meta-item .value { font-size: 13px; font-weight: 600; color: #1A2B4C; }
.footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e8edf4; }
.footer p { font-size: 11px; color: #a3b7d1; margin: 4px 0; }
.signature { margin-top: 40px; text-align: right; }
.signature .line { border-top: 1px solid #1A2B4C; display: inline-block; width: 200px; }
.signature p { font-size: 12px; color: #5a7ba8; margin-top: 6px; }
.bottom-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
.qr-section { text-align: center; }
.qr-section img { width: 140px; height: 140px; border: 2px solid #e8edf4; border-radius: 8px; padding: 4px; }
.qr-section p { font-size: 9px; color: #a3b7d1; margin-top: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
.verified-badge { display: inline-flex; align-items: center; gap: 6px; background: #f0fdfd; border: 1px solid #b3f0f0; border-radius: 20px; padding: 6px 14px; font-size: 11px; font-weight: 700; color: #00D2D3; margin-top: 12px; }
</style></head><body>
<div class="watermark">Dr. ${doctorName}</div>
<div class="content">
<div class="header">
  <h1>SmartHealth</h1>
  <div class="subtitle">Digital Prescription</div>
  <div class="verified-badge">🛡️ Verified Digital Prescription</div>
</div>
<div class="doctor-info"><h2>Dr. ${doctorName}</h2><p>Prescribing Physician</p></div>
<div class="section"><div class="section-label">Patient Name</div><div class="section-value">${patientName}</div></div>
<div class="section"><span class="rx">Rx</span><div class="section-label">Medication</div><div class="medication">${script.medication}</div></div>
<div style="clear:both"></div>
<div class="section" style="margin-top:16px;"><div class="section-label">Clinical Instructions</div><div class="section-value">${script.instructions}</div></div>
<div class="meta">
<div class="meta-item"><div class="label">Date Issued</div><div class="value">${date}</div></div>
<div class="meta-item"><div class="label">Prescription ID</div><div class="value">${prescId}</div></div>
</div>
<div class="bottom-row">
  ${qrHtml}
  ${signatureHtml}
</div>
<div class="footer">
  <p>This is a digitally issued and verified prescription from SmartHealth</p>
  <p>Scan the QR code to view full prescription details — no internet needed</p>
</div>
</div></body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
                URL.revokeObjectURL(url);
            };
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading prescriptions...</div>;

    const sel = selectedScript;
    const selDate = sel ? new Date(sel.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const selPrescId = sel ? `PRES-${sel._id.slice(-6).toUpperCase()}` : '';

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-navy-600 flex items-center gap-2">
                <Pill className="w-5 h-5" />
                My Digital Prescriptions
            </h2>

            <div className="space-y-4">
                {Array.isArray(prescriptions) ? prescriptions : []).map(script => (
                    <div key={script._id} className="p-5 border rounded-2xl bg-white flex flex-col md:flex-row justify-between md:items-center shadow-sm hover:shadow-md transition-all">
                        <div className="mb-3 md:mb-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-bold text-slate-800 text-lg">{script.medication}</h4>
                                <span className="px-2 py-0.5 bg-slate-50 text-[10px] font-black text-slate-400 rounded-full border border-slate-100">
                                    #{script._id.slice(-4).toUpperCase()}
                                </span>
                                {script.signature && (
                                    <span className="px-2 py-0.5 bg-brand-50 text-[10px] font-bold text-brand-600 rounded-full border border-brand-100 flex items-center gap-1">
                                        <PenTool className="w-2.5 h-2.5" /> Signed
                                    </span>
                                )}
                                <span className="px-2 py-0.5 bg-emerald-50 text-[10px] font-bold text-emerald-600 rounded-full border border-emerald-100 flex items-center gap-1">
                                    <ShieldCheck className="w-2.5 h-2.5" /> QR Verified
                                </span>
                            </div>
                            <p className="text-sm text-slate-500">{script.instructions}</p>
                            <p className="text-xs text-brand-600 font-bold mt-2">
                                Prescribed by Dr. {script.doctorName || 'Doctor'} · {new Date(script.issuedAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button
                                onClick={() => openDetails(script)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition border border-slate-200"
                            >
                                <Eye className="w-4 h-4" /> View Details
                            </button>
                            <button
                                onClick={() => downloadPrescription(script)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-navy-600 text-white text-xs font-bold rounded-xl hover:bg-navy-700 transition shadow-lg shadow-navy-100"
                            >
                                <Download className="w-4 h-4" /> Download
                            </button>
                        </div>
                    </div>
                ))
            </div>

            {/* ── Details Modal ── */}
            {sel && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={handleBackdrop}
                >
                    <div
                        ref={modalRef}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#1A2B4C] to-[#2563eb] px-8 py-6 rounded-t-3xl flex items-center justify-between">
                            <div>
                                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Digital Prescription</p>
                                <h2 className="text-white text-xl font-black tracking-tight">{sel.medication}</h2>
                            </div>
                            <button onClick={closeModal} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Verified badge */}
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl w-fit">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-700 text-xs font-black uppercase tracking-widest">Verified Digital Prescription</span>
                            </div>

                            {/* Doctor / Patient */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                                        <Stethoscope className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Prescribing Doctor</span>
                                    </div>
                                    <p className="text-slate-900 font-black text-lg">Dr. {sel.doctorName || 'Unknown'}</p>
                                    <p className="text-slate-400 text-xs font-semibold">Licensed Medical Practitioner</p>
                                </div>
                                <div className="p-5 bg-teal-50 rounded-2xl border border-teal-100">
                                    <div className="flex items-center gap-2 text-teal-600 mb-2">
                                        <User className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Patient</span>
                                    </div>
                                    <p className="text-slate-900 font-black text-lg">{sel.patientName || user?.name || 'Unknown'}</p>
                                    <p className="text-slate-400 text-xs font-semibold">Registered Patient</p>
                                </div>
                            </div>

                            {/* Medication */}
                            <div className="p-6 bg-gradient-to-r from-[#1A2B4C]/5 to-[#00D2D3]/10 rounded-2xl border border-[#00D2D3]/20">
                                <div className="flex items-center gap-2 text-[#00D2D3] mb-2">
                                    <Pill className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">Medication Prescribed</span>
                                </div>
                                <p className="text-slate-900 font-black text-2xl leading-tight">{sel.medication}</p>
                            </div>

                            {/* Instructions */}
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">Clinical Instructions</span>
                                </div>
                                <p className="text-slate-700 font-medium leading-relaxed">{sel.instructions}</p>
                            </div>

                            {/* Date & ID */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                    <div className="flex items-center gap-1.5 text-orange-500 mb-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Date Issued</span>
                                    </div>
                                    <p className="text-slate-800 font-bold text-sm">{selDate}</p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                    <div className="flex items-center gap-1.5 text-purple-500 mb-1">
                                        <Hash className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Prescription ID</span>
                                    </div>
                                    <p className="text-slate-800 font-bold text-sm font-mono">{selPrescId}</p>
                                </div>
                            </div>

                            {/* Digital Signature */}
                            {sel.signature && (
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Digital Signature</p>
                                    <div className="flex items-end gap-4">
                                        <img src={sel.signature} alt="Doctor Signature" className="h-14 object-contain" />
                                        <div>
                                            <p className="text-slate-700 font-bold text-sm">Dr. {sel.doctorName}</p>
                                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#00D2D3] uppercase tracking-wide">
                                                <ShieldCheck className="w-3 h-3" /> Digitally Signed
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* QR Code Preview */}
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center gap-6">
                                <div className="flex-shrink-0">
                                    {qrDataUrl ? (
                                        <img
                                            src={qrDataUrl}
                                            alt="QR Code"
                                            className="w-40 h-40 rounded-2xl border-2 border-slate-200 p-1 bg-white"
                                        />
                                    ) : (
                                        <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                                            <QrCode className="w-12 h-12 text-slate-200" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1 text-center sm:text-left">
                                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                                        <QrCode className="w-4 h-4 text-slate-500" />
                                        <p className="text-slate-800 font-black text-sm">Scan this QR Code</p>
                                    </div>
                                    <p className="text-slate-500 text-xs leading-relaxed">
                                        Scan with any phone camera or QR scanner app to instantly view all prescription details — works offline, no internet needed.
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-semibold">
                                        All prescription data is embedded directly in the QR
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => downloadPrescription(sel)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-navy-600 text-white font-bold rounded-2xl hover:bg-navy-700 transition shadow-lg shadow-navy-100 text-sm"
                                >
                                    <Download className="w-4 h-4" /> Download / Print Prescription
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="px-6 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
