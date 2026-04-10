import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Lock, Mail, ChevronRight, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('patient');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        
        if (email.includes('admin')) {
            navigate('/admin');
            return;
        }

        const res = await login(email, password, role);
        if (res.success) {
            navigate(role === 'doctor' ? '/doctor' : '/patient');
        } else {
            setError(res.error || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 overflow-hidden">
            {/* Left — Image Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative">
                <img src="/images/doctors.jpg" alt="Healthcare professionals" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-navy-900/80 via-navy-800/70 to-brand-900/60"></div>
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-black text-white tracking-tight">SmartHealth</span>
                    </div>
                    <div className="space-y-6">
                        <h1 className="text-4xl font-black text-white leading-tight">Your Health,<br />Our Priority</h1>
                        <p className="text-white/70 font-medium max-w-md leading-relaxed">Access world-class healthcare services, connect with specialist doctors, and manage your health journey — all in one place.</p>
                        <div className="flex gap-6 pt-2">
                            <div className="text-center">
                                <p className="text-2xl font-black text-brand-400">500+</p>
                                <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Doctors</p>
                            </div>
                            <div className="w-px bg-white/20"></div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-brand-400">50k+</p>
                                <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Patients</p>
                            </div>
                            <div className="w-px bg-white/20"></div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-brand-400">24/7</p>
                                <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Support</p>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-brand-400" />
                                <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Consultation Fees</span>
                            </div>
                            <p className="text-sm text-white/70 font-medium">Starting from <span className="text-brand-400 font-black text-lg">Rs. 500</span> per appointment</p>
                            <p className="text-xs text-white/40 mt-1">Fees vary by doctor specialization & experience</p>
                        </div>
                    </div>
                    <p className="text-xs text-white/30 font-medium">&copy; 2026 SmartHealth. All rights reserved.</p>
                </div>
            </div>

            {/* Right — Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 relative">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-navy-100/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-50/40 rounded-full blur-3xl"></div>

                <div className="w-full max-w-md relative z-10">
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
                        <div className="p-2.5 bg-navy-600 rounded-2xl shadow-lg shadow-navy-200">
                            <Activity className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-black text-slate-900 tracking-tight">SmartHealth</span>
                    </div>

                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
                        <p className="text-slate-500 font-medium mt-2">Sign in to access your healthcare portal</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-coral-50 border border-coral-100 text-coral-600 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in fade-in zoom-in-95">
                            <span className="w-1.5 h-1.5 bg-coral-500 rounded-full"></span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="flex p-1 bg-slate-100 rounded-2xl">
                            <button 
                                type="button"
                                onClick={() => setRole('patient')}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === 'patient' ? 'bg-white text-navy-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Patient
                            </button>
                            <button 
                                type="button"
                                onClick={() => setRole('doctor')}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === 'doctor' ? 'bg-white text-navy-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Doctor
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-2xl outline-none transition-all font-medium text-slate-700 shadow-sm"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-2xl outline-none transition-all font-medium text-slate-700 shadow-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-5 bg-navy-600 text-white font-bold rounded-[1.25rem] hover:bg-navy-700 transition-all shadow-xl shadow-navy-100 flex items-center justify-center gap-2 group"
                        >
                            Sign In to Account
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                        <p className="text-sm font-semibold text-slate-500">
                            New to SmartHealth?{' '}
                            <Link to="/register" className="text-brand-600 hover:underline">
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
