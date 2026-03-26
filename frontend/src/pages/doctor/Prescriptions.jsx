import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Pill, UserPlus } from 'lucide-react';

export default function DoctorPrescriptions() {
    const { user, token } = useAuth();
    const [prescriptions, setPrescriptions] = useState([]);
    const [newScript, setNewScript] = useState({ patientId: '', medication: '', instructions: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrescriptions = async () => {
            if (!user?.id) return;
            try {
                const res = await axios.get(`http://localhost:3000/api/doctors/prescriptions/doctor/${user.id}`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setPrescriptions(res.data);
            } catch (err) {
                console.error("Error fetching prescriptions", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPrescriptions();
    }, [user, token]);

    const handleIssuePrescription = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`http://localhost:3000/api/doctors/prescriptions`, {
                doctorId: user.id,
                patientId: newScript.patientId,
                medication: newScript.medication,
                instructions: newScript.instructions
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Prescription issued successfully!");
            setPrescriptions([res.data.prescription, ...prescriptions]);
            setNewScript({ patientId: '', medication: '', instructions: '' });
        } catch (err) {
            console.error(err);
            alert("Failed to issue prescription");
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Accessing medical vault...</div>;

    return (
        <div className="space-y-8">
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-600" />
                Issue Digital Prescription
            </h2>
            
            <div className="p-8 border rounded-3xl bg-white shadow-xl shadow-slate-100/50">
                <form onSubmit={handleIssuePrescription} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Patient Identification</label>
                            <input type="text" required className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl focus:border-teal-100 focus:bg-teal-50/20 outline-none transition-all placeholder:text-slate-300 font-medium" value={newScript.patientId} onChange={e => setNewScript({...newScript, patientId: e.target.value})} placeholder="ENTR_PX_789" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Medication & Dosage</label>
                            <input type="text" required className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl focus:border-teal-100 focus:bg-teal-50/20 outline-none transition-all placeholder:text-slate-300 font-medium" value={newScript.medication} onChange={e => setNewScript({...newScript, medication: e.target.value})} placeholder="Atorvastatin 20mg" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Clinical Instructions</label>
                        <textarea required className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl focus:border-teal-100 focus:bg-teal-50/20 outline-none transition-all placeholder:text-slate-300 font-medium resize-none" rows="4" value={newScript.instructions} onChange={e => setNewScript({...newScript, instructions: e.target.value})} placeholder="One tablet daily at bedtime. Avoid grapefruit juice during treatment."></textarea>
                    </div>
                    <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">Issue Verified Digital Script</button>
                </form>
            </div>

            <div className="space-y-6 mt-12 pt-10 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Global Issued History</h3>
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
                                        <h4 className="font-black text-slate-800 tracking-tight text-lg">{script.medication}</h4>
                                        <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-400">#PRES-{script._id.slice(-4).toUpperCase()}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed italic">{script.instructions}</p>
                                    <div className="mt-6 flex flex-wrap gap-4 border-t border-slate-50 pt-4">
                                        <div><span className="text-[10px] font-black uppercase text-slate-300">Patient Ref</span><br/><span className="text-xs font-bold text-slate-600">{script.patientId}</span></div>
                                        <div><span className="text-[10px] font-black uppercase text-slate-300">Timestamp</span><br/><span className="text-xs font-bold text-slate-600">{new Date(script.issuedAt).toLocaleDateString()}</span></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
