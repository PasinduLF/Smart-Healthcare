import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { User, Mail, Phone, Clock3, Stethoscope, ShieldCheck, BadgeCheck, Save, ImagePlus, Lock, Languages, MapPin, ReceiptText } from 'lucide-react';

const API_BASE = API_BASE_URL;

const roleTheme = {
    patient: {
        badge: 'Patient',
        panel: 'from-blue-50 to-cyan-50',
        accent: 'text-blue-700',
        button: 'bg-blue-600 hover:bg-blue-700'
    },
    doctor: {
        badge: 'Doctor',
        panel: 'from-teal-50 to-emerald-50',
        accent: 'text-teal-700',
        button: 'bg-teal-600 hover:bg-teal-700'
    },
    admin: {
        badge: 'Administrator',
        panel: 'from-violet-50 to-fuchsia-50',
        accent: 'text-violet-700',
        button: 'bg-violet-600 hover:bg-violet-700'
    }
};

export default function MyProfile() {
    const { user, token } = useAuth();
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        avatarUrl: '',
        age: '',
        contactNumber: '',
        specialty: '',
        experience: 0,
        consultationFee: 0,
        bio: '',
        languagesInput: '',
        clinicLocation: '',
        createdAt: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [messages, setMessages] = useState({ profile: '', avatar: '', password: '' });

    const currentRole = user?.role || 'patient';
    const theme = roleTheme[currentRole] || roleTheme.patient;

    const profileConfig = useMemo(() => {
        if (currentRole === 'doctor') {
            return {
                getUrl: `${API_BASE}/api/doctors/profile/${user?.id}`,
                putUrl: `${API_BASE}/api/doctors/profile/${user?.id}`,
                avatarUrl: `${API_BASE}/api/doctors/profile/${user?.id}/avatar`,
                passwordUrl: `${API_BASE}/api/doctors/change-password/${user?.id}`,
                toState: (data) => ({
                    name: data.name || '',
                    email: data.email || '',
                    avatarUrl: data.avatarUrl || '',
                    specialty: data.specialty || data.specialization || '',
                    experience: Number(data.experience) || 0,
                    consultationFee: Number(data.consultationFee) || 0,
                    bio: data.bio || '',
                    languagesInput: Array.isArray(data.languages) ? data.languages.join(', ') : '',
                    clinicLocation: data.clinicLocation || '',
                    createdAt: data.createdAt || ''
                }),
                toPayload: (data) => ({
                    name: data.name,
                    specialization: data.specialty,
                    experience: Number(data.experience) || 0,
                    consultationFee: Number(data.consultationFee) || 0,
                    bio: data.bio,
                    languages: data.languagesInput
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    clinicLocation: data.clinicLocation
                })
            };
        }

        if (currentRole === 'admin') {
            return {
                getUrl: `${API_BASE}/api/patients/admin/profile/${user?.id}`,
                putUrl: `${API_BASE}/api/patients/admin/profile/${user?.id}`,
                avatarUrl: `${API_BASE}/api/patients/admin/profile/${user?.id}/avatar`,
                passwordUrl: `${API_BASE}/api/patients/admin/change-password/${user?.id}`,
                toState: (data) => ({
                    name: data.name || '',
                    email: data.email || '',
                    avatarUrl: data.avatarUrl || '',
                    createdAt: data.createdAt || ''
                }),
                toPayload: (data) => ({
                    name: data.name,
                    email: data.email
                })
            };
        }

        return {
            getUrl: `${API_BASE}/api/patients/profile/${user?.id}`,
            putUrl: `${API_BASE}/api/patients/profile/${user?.id}`,
                avatarUrl: `${API_BASE}/api/patients/profile/${user?.id}/avatar`,
                passwordUrl: `${API_BASE}/api/patients/change-password/${user?.id}`,
            toState: (data) => ({
                name: data.name || '',
                email: data.email || '',
                    avatarUrl: data.avatarUrl || '',
                age: data.age || '',
                contactNumber: data.contactNumber || '',
                createdAt: data.createdAt || ''
            }),
            toPayload: (data) => ({
                name: data.name,
                age: data.age === '' ? undefined : Number(data.age),
                contactNumber: data.contactNumber
            })
        };
    }, [currentRole, user?.id]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id || !token) return;
            try {
                const response = await axios.get(profileConfig.getUrl, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProfile((prev) => ({ ...prev, ...profileConfig.toState(response.data) }));
            } catch (err) {
                setMessages((prev) => ({ ...prev, profile: err.response?.data?.error || 'Failed to load profile data.' }));
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [profileConfig, token, user?.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessages((prev) => ({ ...prev, profile: '' }));

        try {
            await axios.put(profileConfig.putUrl, profileConfig.toPayload(profile), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages((prev) => ({ ...prev, profile: 'Profile updated successfully.' }));
        } catch (err) {
            setMessages((prev) => ({ ...prev, profile: err.response?.data?.error || 'Unable to update profile right now.' }));
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async () => {
        if (!avatarFile) {
            setMessages((prev) => ({ ...prev, avatar: 'Please select an image first.' }));
            return;
        }

        setUploadingAvatar(true);
        setMessages((prev) => ({ ...prev, avatar: '' }));
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        try {
            const response = await axios.post(profileConfig.avatarUrl, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setProfile((prev) => ({ ...prev, avatarUrl: response.data.avatarUrl || prev.avatarUrl }));
            setAvatarFile(null);
            setMessages((prev) => ({ ...prev, avatar: 'Avatar updated successfully.' }));
        } catch (err) {
            setMessages((prev) => ({ ...prev, avatar: err.response?.data?.error || 'Avatar upload failed.' }));
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMessages((prev) => ({ ...prev, password: '' }));

        const { currentPassword, newPassword, confirmPassword } = passwordForm;
        if (!currentPassword || !newPassword || !confirmPassword) {
            setMessages((prev) => ({ ...prev, password: 'Please fill in all password fields.' }));
            return;
        }

        if (newPassword.length < 8) {
            setMessages((prev) => ({ ...prev, password: 'New password must be at least 8 characters long.' }));
            return;
        }

        if (newPassword === currentPassword) {
            setMessages((prev) => ({ ...prev, password: 'New password must be different from current password.' }));
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessages((prev) => ({ ...prev, password: 'Confirm password does not match new password.' }));
            return;
        }

        setChangingPassword(true);
        try {
            const payload = { currentPassword, newPassword };
            await axios.put(profileConfig.passwordUrl, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setMessages((prev) => ({ ...prev, password: 'Password changed successfully.' }));
        } catch (err) {
            setMessages((prev) => ({ ...prev, password: err.response?.data?.error || 'Password update failed.' }));
        } finally {
            setChangingPassword(false);
        }
    };

    if (loading) {
        return <div className="text-center py-12 text-slate-400 font-semibold">Loading your profile workspace...</div>;
    }

    return (
        <div className="space-y-6">
            <div className={`rounded-3xl border border-white/60 p-6 md:p-8 bg-gradient-to-br ${theme.panel} shadow-xl shadow-slate-100`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="shrink-0">
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border border-white shadow-md" />
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-white border border-white shadow-md flex items-center justify-center">
                                    <User className="w-7 h-7 text-slate-400" />
                                </div>
                            )}
                        </div>
                        <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">My Profile</p>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">{profile.name || user?.name || 'Account Owner'}</h2>
                        <p className="text-sm text-slate-600 mt-2">Manage your role-specific information, identity details, and account metadata from one place.</p>
                        </div>
                    </div>
                    <div className={`self-start px-4 py-2 rounded-full bg-white border border-white shadow-sm text-xs font-black uppercase tracking-widest ${theme.accent}`}>
                        {theme.badge}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                    <div className="bg-white/80 border border-white rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account Email</p>
                        <p className="font-bold text-slate-800 mt-1 break-all">{profile.email || 'Not available'}</p>
                    </div>
                    <div className="bg-white/80 border border-white rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Role</p>
                        <p className="font-bold text-slate-800 mt-1">{theme.badge}</p>
                    </div>
                    <div className="bg-white/80 border border-white rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Member Since</p>
                        <p className="font-bold text-slate-800 mt-1">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>

                <div className="mt-6 grid md:grid-cols-[1fr_auto] gap-3 items-end">
                    <div>
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Avatar Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                            className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 bg-white"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold transition-all disabled:opacity-70 ${theme.button}`}
                    >
                        <ImagePlus className="w-4 h-4" />
                        {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                    </button>
                </div>
                {messages.avatar && (
                    <p className={`text-sm font-semibold mt-1 ${messages.avatar.toLowerCase().includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {messages.avatar}
                    </p>
                )}

                {currentRole === 'patient' && (
                    <div className="mt-4">
                        <Link
                            to="/patient/transactions"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-white shadow-sm text-blue-700 font-bold hover:bg-blue-50 transition"
                        >
                            <ReceiptText className="w-4 h-4" />
                            View Transaction History
                        </Link>
                    </div>
                )}

                {currentRole === 'doctor' && (
                    <div className="mt-4">
                        <Link
                            to="/doctor/consultation-fee"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-white shadow-sm text-teal-700 font-bold hover:bg-teal-50 transition"
                        >
                            <ReceiptText className="w-4 h-4" />
                            Consultation Fee Calculation
                        </Link>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="glass-premium p-6 md:p-8 rounded-3xl border border-slate-100 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <label className="space-y-2 block">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><User className="w-4 h-4" /> Full Name</span>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            required
                        />
                    </label>

                    <label className="space-y-2 block">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Mail className="w-4 h-4" /> Email</span>
                        <input
                            type="email"
                            value={profile.email}
                            onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                            disabled={currentRole !== 'admin'}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </label>
                </div>

                {currentRole === 'patient' && (
                    <div className="grid md:grid-cols-2 gap-4">
                        <label className="space-y-2 block">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> Age</span>
                            <input
                                type="number"
                                min="0"
                                value={profile.age}
                                onChange={(e) => setProfile((prev) => ({ ...prev, age: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </label>

                        <label className="space-y-2 block">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Phone className="w-4 h-4" /> Contact Number</span>
                            <input
                                type="text"
                                value={profile.contactNumber}
                                onChange={(e) => setProfile((prev) => ({ ...prev, contactNumber: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </label>
                    </div>
                )}

                {currentRole === 'doctor' && (
                    <div className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                        <label className="space-y-2 block">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Specialization</span>
                            <input
                                type="text"
                                value={profile.specialty}
                                onChange={(e) => setProfile((prev) => ({ ...prev, specialty: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </label>

                        <label className="space-y-2 block">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Clock3 className="w-4 h-4" /> Experience</span>
                            <input
                                type="number"
                                min="0"
                                value={profile.experience}
                                onChange={(e) => setProfile((prev) => ({ ...prev, experience: Number(e.target.value) || 0 }))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </label>

                        <label className="space-y-2 block">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Consultation Fee</span>
                            <input
                                type="number"
                                min="0"
                                value={profile.consultationFee}
                                onChange={(e) => setProfile((prev) => ({ ...prev, consultationFee: Number(e.target.value) || 0 }))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </label>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <label className="space-y-2 block">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Languages className="w-4 h-4" /> Languages</span>
                                <input
                                    type="text"
                                    value={profile.languagesInput}
                                    onChange={(e) => setProfile((prev) => ({ ...prev, languagesInput: e.target.value }))}
                                    placeholder="English, Sinhala, Tamil"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                            </label>

                            <label className="space-y-2 block">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><MapPin className="w-4 h-4" /> Clinic Location</span>
                                <input
                                    type="text"
                                    value={profile.clinicLocation}
                                    onChange={(e) => setProfile((prev) => ({ ...prev, clinicLocation: e.target.value }))}
                                    placeholder="Colombo 07 / Main branch"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                            </label>
                        </div>

                        <label className="space-y-2 block">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Professional Bio</span>
                            <textarea
                                value={profile.bio}
                                onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                                placeholder="Brief doctor profile shown to patients"
                            />
                        </label>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all disabled:opacity-70 ${theme.button}`}
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                    {messages.profile && (
                        <p className={`text-sm font-semibold ${messages.profile.toLowerCase().includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {messages.profile}
                        </p>
                    )}
                </div>
            </form>

            <form onSubmit={handlePasswordChange} className="glass-premium p-6 md:p-8 rounded-3xl border border-slate-100 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Lock className="w-5 h-5 text-slate-500" />
                        Change Password
                    </h3>

                    {currentRole === 'patient' && (
                        <Link
                            to="/patient/transactions"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-blue-700 font-bold hover:bg-blue-50 transition"
                        >
                            <ReceiptText className="w-4 h-4" />
                            Transactions History
                        </Link>
                    )}

                    {currentRole === 'doctor' && (
                        <Link
                            to="/doctor/consultation-fee"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-teal-700 font-bold hover:bg-teal-50 transition"
                        >
                            <ReceiptText className="w-4 h-4" />
                            Consultation Fee Calculation
                        </Link>
                    )}
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <label className="space-y-2 block">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Current Password</span>
                        <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            required
                        />
                    </label>

                    <label className="space-y-2 block">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">New Password</span>
                        <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            required
                        />
                    </label>

                    <label className="space-y-2 block">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Confirm New Password</span>
                        <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            required
                        />
                    </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                        type="submit"
                        disabled={changingPassword}
                        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all disabled:opacity-70 ${theme.button}`}
                    >
                        <Lock className="w-4 h-4" />
                        {changingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                    {messages.password && (
                        <p className={`text-sm font-semibold ${messages.password.toLowerCase().includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {messages.password}
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
}
