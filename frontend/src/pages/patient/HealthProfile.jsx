import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function HealthProfile() {
    const { user, token } = useAuth();
    const [healthProfile, setHealthProfile] = useState({ 
        vitals: { bloodPressure: '', heartRate: '', weight: '', height: '' }, 
        allergies: [] 
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHealth = async () => {
            if (!user?.id) return;
            try {
                const res = await axios.get(`http://localhost:3000/api/patients/profile/${user.id}`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setHealthProfile(prev => ({ 
                    ...prev, 
                    vitals: res.data.vitals || prev.vitals, 
                    allergies: res.data.allergies || []
                }));
            } catch (err) {
                console.error("Failed to fetch health profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHealth();
    }, [user, token]);

    const handleUpdateHealthProfile = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:3000/api/patients/health-profile/${user.id}`, healthProfile, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Health profile updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update health profile");
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading health data...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">My Health Profile (Vitals & Allergies)</h2>
            <form onSubmit={handleUpdateHealthProfile} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Blood Pressure (mmHg)</label>
                        <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 120/80" value={healthProfile.vitals.bloodPressure} onChange={e => setHealthProfile({ ...healthProfile, vitals: { ...healthProfile.vitals, bloodPressure: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Heart Rate (bpm)</label>
                        <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 72" value={healthProfile.vitals.heartRate} onChange={e => setHealthProfile({ ...healthProfile, vitals: { ...healthProfile.vitals, heartRate: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Weight (kg)</label>
                        <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 70" value={healthProfile.vitals.weight} onChange={e => setHealthProfile({ ...healthProfile, vitals: { ...healthProfile.vitals, weight: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Height (cm)</label>
                        <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 175" value={healthProfile.vitals.height} onChange={e => setHealthProfile({ ...healthProfile, vitals: { ...healthProfile.vitals, height: e.target.value } })} />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Allergies (comma separated)</label>
                    <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Peanuts, Penicillin" value={healthProfile.allergies.join(', ')} onChange={e => setHealthProfile({ ...healthProfile, allergies: e.target.value.split(',').map(a => a.trim()) })} />
                </div>
                <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">Save Health Profile</button>
            </form>
        </div>
    );
}
