import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, User, Mail, Lock, Phone, Clipboard, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [role, setRole] = useState('patient');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        contactNumber: '',
        specialization: '', // for doctor
        experience: '' // for doctor
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await register(formData, role);
        if (res.success) {
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } else {
            setError(res.error || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-50">
            {/* Background Blobs */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-50/50 rounded-full blur-3xl animate-drift"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-3xl animate-drift"></div>

            <div className="glass-premium w-full max-w-2xl p-10 relative z-10 shadow-2xl">
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="p-3 bg-teal-600 rounded-2xl shadow-lg shadow-teal-100 mb-6">
                        <Activity className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create your Account</h2>
                    <p className="text-slate-500 font-medium mt-1 max-w-sm">Join the next generation of healthcare and start your journey today.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 rounded-2xl text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        Registration successful! Redirecting to login...
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
                        <button 
                            type="button"
                            onClick={() => setRole('patient')}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === 'patient' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Patient
                        </button>
                        <button 
                            type="button"
                            onClick={() => setRole('doctor')}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === 'doctor' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Doctor
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input name="name" type="text" required placeholder="John Doe" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-teal-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input name="email" type="email" required placeholder="john@example.com" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-teal-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input name="password" type="password" required placeholder="••••••••" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-teal-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Contact Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input name="contactNumber" type="text" required placeholder="+94 77..." onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-teal-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                            </div>
                        </div>

                        {role === 'doctor' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Specialization</label>
                                    <div className="relative">
                                        <Clipboard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input name="specialization" type="text" required placeholder="Cardiology" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-teal-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Years of Experience</label>
                                    <div className="relative">
                                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input name="experience" type="number" required placeholder="10" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-teal-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full py-5 bg-slate-900 text-white font-bold rounded-[1.25rem] hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group mt-6"
                    >
                        Create My Account
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                    <p className="text-sm font-semibold text-slate-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-teal-600 hover:underline">
                            Sign in instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
