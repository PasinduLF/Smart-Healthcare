import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, ShieldAlert } from 'lucide-react';
import { getPatientServiceUrl } from '../../config/api';

export default function Profile() {
    const { user, token } = useAuth();
    const [profileData, setProfileData] = useState({ name: '', age: '', contactNumber: '', allergies: [] });
    const [allergyInput, setAllergyInput] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.get(getPatientServiceUrl(`/profile/${user.id}`), { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setProfileData({
                    name: res.data.name || '',
                    age: res.data.age || '',
                    contactNumber: res.data.contactNumber || '',
                    allergies: res.data.allergies || []
                });
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user, token]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await axios.put(getPatientServiceUrl(`/profile/${user.id}`), profileData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Patient details updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update details");
        }
    };

    const addAllergy = () => {
        const trimmed = allergyInput.trim();
        if (trimmed && !profileData.allergies.includes(trimmed)) {
            setProfileData({ ...profileData, allergies: [...profileData.allergies, trimmed] });
            setAllergyInput('');
        }
    };

    const removeAllergy = (allergy) => {
        setProfileData({ ...profileData, allergies: profileData.allergies.filter(a => a !== allergy) });
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading details...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-navy-600 flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient Details
            </h2>
            <p className="text-sm text-slate-500">Keep your details up to date — your doctor can view this information during consultations.</p>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                <div className="p-6 bg-white border rounded-2xl space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Personal Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Full Name</label>
                            <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Age</label>
                            <input type="number" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={profileData.age} onChange={e => setProfileData({...profileData, age: e.target.value})} placeholder="Enter your age" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Contact Number</label>
                        <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={profileData.contactNumber} onChange={e => setProfileData({...profileData, contactNumber: e.target.value})} placeholder="+94 77..." />
                    </div>
                </div>

                <div className="p-6 bg-white border rounded-2xl space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-coral-400" />
                        Allergies & Conditions
                    </h3>
                    <p className="text-xs text-slate-400">Your doctor will see these allergies when writing prescriptions.</p>
                    
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" 
                            placeholder="e.g. Penicillin, Peanuts, Latex..."
                            value={allergyInput}
                            onChange={e => setAllergyInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAllergy(); } }}
                        />
                        <button type="button" onClick={addAllergy} className="px-5 py-3 bg-coral-50 text-coral-600 font-bold text-sm rounded-lg hover:bg-coral-100 border border-coral-100 transition">
                            Add
                        </button>
                    </div>

                    {Array.isArray(profileData.allergies) && profileData.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {(Array.isArray(profileData.allergies) ? profileData.allergies : []).map((allergy, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-coral-50 text-coral-700 rounded-full text-sm font-medium border border-coral-100">
                                    {allergy}
                                    <button type="button" onClick={() => removeAllergy(allergy)} className="text-coral-400 hover:text-coral-600 transition">×</button>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic">No allergies added yet.</p>
                    )}
                </div>

                <button type="submit" className="w-full py-4 bg-navy-600 text-white font-bold rounded-xl hover:bg-navy-700 transition shadow-lg shadow-navy-100">
                    Save Patient Details
                </button>
            </form>

            <div className="bg-white border rounded-xl p-5 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                    <p className="text-sm text-gray-500">Open your separate page to view previous transactions.</p>
                </div>

                <Link
                    to="/patient/transactions"
                    className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                >
                    Open Transaction History
                </Link>
            </div>
        </div>
    );
}
