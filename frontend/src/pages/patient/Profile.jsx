import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
    const { user, token } = useAuth();
    const [profileData, setProfileData] = useState({ name: '', age: '', contactNumber: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;
            try {
                const res = await axios.get(`http://localhost:3000/api/patients/profile/${user.id}`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setProfileData({
                    name: res.data.name || '',
                    age: res.data.age || '',
                    contactNumber: res.data.contactNumber || ''
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
            await axios.put(`http://localhost:3000/api/patients/profile/${user.id}`, profileData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Profile updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update profile");
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading profile...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">My Profile</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Age</label>
                    <input type="number" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={profileData.age} onChange={e => setProfileData({...profileData, age: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Contact Number</label>
                    <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={profileData.contactNumber} onChange={e => setProfileData({...profileData, contactNumber: e.target.value})} placeholder="+1 234 567 890" />
                </div>
                <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Update Profile</button>
            </form>
        </div>
    );
}
