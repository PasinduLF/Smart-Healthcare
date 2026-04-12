import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Pill, ShieldAlert, PenTool, Eraser, Trash2, Search, X } from 'lucide-react';

export default function DoctorPrescriptions() {
    const { user, token } = useAuth();
    const [prescriptions, setPrescriptions] = useState([]);
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [newScript, setNewScript] = useState({ patientId: '', medication: '', instructions: '', dosage: '' });
    const [loading, setLoading] = useState(true);
    const [patientSearch, setPatientSearch] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const patientSearchRef = useRef(null);

    // Signature pad state
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signatureData, setSignatureData] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;
            try {
                const [scriptsRes, apptsRes] = await Promise.all([
                    axios.get(`http://localhost:3000/api/doctors/prescriptions/doctor/${user.id}`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`http://localhost:3000/api/appointments/doctor/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                const scripts = Array.isArray(scriptsRes.data) ? scriptsRes.data : [];
                const appts = Array.isArray(apptsRes.data) ? apptsRes.data : [];
                setPrescriptions(scripts);

                const patientIds = [...new Set(appts.map(a => a.patientId).filter(Boolean))];
                const patientProfiles = await Promise.all(
                    patientIds.map(pid =>
                        axios.get(`http://localhost:3000/api/patients/profile/${pid}`, { headers: { Authorization: `Bearer ${token}` } })
                            .then(r => r.data)
                            .catch(() => null)
                    )
                );
                setPatients(patientProfiles.filter(Boolean));
            } catch (err) {
                console.error("Error fetching data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, token]);

    // --- Signature Pad ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#1A2B4C';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getCanvasPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => {
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const pos = getCanvasPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const pos = getCanvasPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const endDraw = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        setSignatureData(canvasRef.current.toDataURL('image/png'));
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData('');
    };

    const handlePatientSelect = (patientId) => {
        setNewScript({ ...newScript, patientId });
        const patient = patients.find(p => p._id === patientId);
        setSelectedPatient(patient || null);
        setPatientSearch(patient ? `${patient.name} (${patient.email})` : '');
        setShowPatientDropdown(false);
    };

    const handleDeletePrescription = async (scriptId) => {
        if (!window.confirm('Are you sure you want to delete this prescription?')) return;
        try {
            await axios.delete(`http://localhost:3000/api/doctors/prescriptions/${scriptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPrescriptions(prescriptions.filter(p => p._id !== scriptId));
        } catch (err) {
            console.error(err);
            alert('Failed to delete prescription');
        }
    };

    const handleIssuePrescription = async (e) => {
        e.preventDefault();
        try {
            const patientName = selectedPatient?.name || '';
            const res = await axios.post(`http://localhost:3000/api/doctors/prescriptions`, {
                doctorId: user.id,
                doctorName: user.name || 'Doctor',
                patientId: newScript.patientId,
                patientName,
                medication: newScript.medication,
                dosage: newScript.dosage,
                instructions: newScript.instructions,
                signature: signatureData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPrescriptions([res.data.prescription, ...prescriptions]);
            setNewScript({ patientId: '', medication: '', instructions: '', dosage: '' });
            setSelectedPatient(null);
            clearSignature();
        } catch (err) {
            console.error(err);
            alert("Failed to issue prescription");
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Accessing medical vault...</div>;

    return (
        <div className="space-y-8">
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Pill className="w-5 h-5 text-brand-600" />
                Issue Digital Prescription
            </h2>
            
            <div className="p-8 border rounded-3xl bg-white shadow-xl shadow-slate-100/50">
                <form onSubmit={handleIssuePrescription} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Select Patient</label>
                        {patients.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No patients with appointments found.</p>
                        ) : (
                            <div className="relative" ref={patientSearchRef}>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search patient by name or email..."
                                        value={patientSearch}
                                        onChange={e => {
                                            setPatientSearch(e.target.value);
                                            setShowPatientDropdown(true);
                                            if (!e.target.value) {
                                                setSelectedPatient(null);
                                                setNewScript(prev => ({ ...prev, patientId: '' }));
                                            }
                                        }}
                                        onFocus={() => setShowPatientDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowPatientDropdown(false), 150)}
                                        className="w-full pl-11 pr-10 py-4 border-2 border-slate-50 rounded-2xl focus:border-brand-100 focus:bg-brand-50/20 outline-none transition-all font-medium text-slate-700"
                                    />
                                    {patientSearch && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPatientSearch('');
                                                setSelectedPatient(null);
                                                setNewScript(prev => ({ ...prev, patientId: '' }));
                                                setShowPatientDropdown(false);
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                {showPatientDropdown && (
                                    <div className="absolute z-20 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                                        {patients
                                            .filter(p =>
                                                p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
                                                p.email?.toLowerCase().includes(patientSearch.toLowerCase())
                                            )
                                            .length === 0 ? (
                                            <div className="px-5 py-4 text-sm text-slate-400 italic">No patients match your search</div>
                                        ) : (
                                            patients
                                                .filter(p =>
                                                    p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
                                                    p.email?.toLowerCase().includes(patientSearch.toLowerCase())
                                                )
                                                .map(p => (
                                                    <button
                                                        key={p._id}
                                                        type="button"
                                                        onMouseDown={() => handlePatientSelect(p._id)}
                                                        className={`w-full text-left px-5 py-3.5 hover:bg-brand-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0 ${
                                                            newScript.patientId === p._id ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                                                        }`}
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-black text-brand-600">{p.name?.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold">{p.name}</p>
                                                            <p className="text-xs text-slate-400">{p.email}</p>
                                                        </div>
                                                    </button>
                                                ))
                                        )}
                                    </div>
                                )}
                                {/* hidden required input to trigger form validation */}
                                <input type="text" required readOnly value={newScript.patientId} className="sr-only" tabIndex={-1} />
                            </div>
                        )}
                    </div>

                    {/* Allergy Alert */}
                    {selectedPatient && selectedPatient.allergies?.length > 0 && (
                        <div className="p-4 bg-coral-50 border border-coral-100 rounded-2xl flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-coral-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-black uppercase text-coral-700 tracking-wider mb-1">Patient Allergies</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedPatient.allergies.map((a, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-white text-coral-600 rounded-full text-xs font-bold border border-coral-100">{a}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dosage Section */}
                    {selectedPatient && (
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Medical Doses</label>
                            <textarea
                                required
                                className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl focus:border-brand-100 focus:bg-brand-50/20 outline-none transition-all placeholder:text-slate-300 font-medium resize-none"
                                rows="4"
                                value={newScript.dosage}
                                onChange={e => setNewScript({...newScript, dosage: e.target.value})}
                                placeholder="e.g.&#10;Paracetamol 500mg — 2 tablets, 3 times daily (after meals)&#10;Amoxicillin 250mg — 1 capsule, 2 times daily for 5 days&#10;Omeprazole 20mg — 1 tablet, once daily (before breakfast)"
                            />
                            <p className="text-[10px] text-slate-400 font-medium px-1">Specify medication name, strength, number of doses per day, frequency, and duration</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Medication & Dosage</label>
                        <textarea
                            required
                            className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl focus:border-brand-100 focus:bg-brand-50/20 outline-none transition-all placeholder:text-slate-300 font-medium resize-none"
                            rows="5"
                            value={newScript.medication}
                            onChange={e => setNewScript({...newScript, medication: e.target.value})}
                            placeholder="e.g.&#10;Atorvastatin 20mg — 1 tablet daily at bedtime&#10;Metformin 500mg — 1 tablet twice daily after meals&#10;Amlodipine 5mg — 1 tablet once daily in the morning"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Patient ID Reference</label>
                        <input type="text" readOnly className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl bg-slate-50/50 text-slate-500 font-mono text-sm" value={newScript.patientId} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Clinical Instructions</label>
                        <textarea required className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl focus:border-brand-100 focus:bg-brand-50/20 outline-none transition-all placeholder:text-slate-300 font-medium resize-none" rows="4" value={newScript.instructions} onChange={e => setNewScript({...newScript, instructions: e.target.value})} placeholder="One tablet daily at bedtime. Avoid grapefruit juice during treatment."></textarea>
                    </div>

                    {/* Digital Signature Pad */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                <PenTool className="w-3.5 h-3.5" /> Doctor's Digital Signature
                            </label>
                            <button type="button" onClick={clearSignature} className="text-xs text-slate-400 hover:text-coral-500 transition flex items-center gap-1">
                                <Eraser className="w-3 h-3" /> Clear
                            </button>
                        </div>
                        <div className="relative border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
                            <canvas
                                ref={canvasRef}
                                width={600}
                                height={120}
                                className="w-full cursor-crosshair touch-none"
                                onMouseDown={startDraw}
                                onMouseMove={draw}
                                onMouseUp={endDraw}
                                onMouseLeave={endDraw}
                                onTouchStart={startDraw}
                                onTouchMove={draw}
                                onTouchEnd={endDraw}
                            />
                            {!signatureData && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <p className="text-slate-200 text-sm font-medium">Sign here ✍️</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button type="submit" disabled={!newScript.patientId} className="w-full py-5 bg-navy-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-navy-700 transition-all shadow-xl shadow-navy-200 disabled:opacity-50">Issue Verified Digital Script</button>
                </form>
            </div>

            <div className="space-y-6 mt-12 pt-10 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Issued Prescriptions</h3>
                {prescriptions.length === 0 ? (
                    <div className="p-10 text-center border-2 border-dashed border-slate-50 rounded-3xl">
                        <p className="text-slate-300 font-bold italic">No prescriptions found in your active ledger.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {prescriptions.map(script => (
                            <div key={script._id} className="p-6 border border-slate-50 rounded-2xl bg-slate-50/20 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-white transition-all">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-black text-slate-800 tracking-tight text-lg whitespace-pre-line">{script.medication}</h4>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-400">#PRES-{script._id.slice(-4).toUpperCase()}</span>
                                            <button
                                                onClick={() => handleDeletePrescription(script._id)}
                                                className="p-2 rounded-xl text-slate-300 hover:text-coral-500 hover:bg-coral-50 transition-all"
                                                title="Delete prescription"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed italic">{script.instructions}</p>
                                    <div className="mt-6 flex flex-wrap gap-4 border-t border-slate-50 pt-4">
                                        <div><span className="text-[10px] font-black uppercase text-slate-300">Patient</span><br/><span className="text-xs font-bold text-slate-600">{script.patientName || script.patientId}</span></div>
                                        <div><span className="text-[10px] font-black uppercase text-slate-300">Timestamp</span><br/><span className="text-xs font-bold text-slate-600">{new Date(script.issuedAt).toLocaleDateString()}</span></div>
                                    </div>
                                    {script.signature && (
                                        <div className="mt-3 pt-3 border-t border-slate-50">
                                            <span className="text-[10px] font-black uppercase text-slate-300">Signature</span>
                                            <img src={script.signature} alt="Signature" className="h-10 mt-1 opacity-70" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
