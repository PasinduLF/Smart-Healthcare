import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Lock, Mail, ChevronRight } from 'lucide-react';
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
        
        const res = await login(email, password, role);
        if (res.success) {
            navigate('/');
        } else {
            setError(res.error || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-50">
            {/* Background Blobs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl animate-drift"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-50/50 rounded-full blur-3xl animate-drift"></div>

            <div className="glass-premium w-full max-w-md p-10 relative z-10 shadow-2xl">
                <div className="flex flex-col items-center mb-10">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 mb-6">
                        <Activity className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
                    <p className="text-slate-500 font-medium mt-1">Access your healthcare portal</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in fade-in zoom-in-95">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="flex p-1 bg-slate-100 rounded-2xl">
                        <button 
                            type="button"
                            onClick={() => setRole('patient')}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${role === 'patient' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Patient
                        </button>
                        <button 
                            type="button"
                            onClick={() => setRole('doctor')}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${role === 'doctor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
                                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium text-slate-700 shadow-sm"
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
                                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium text-slate-700 shadow-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-5 bg-indigo-600 text-white font-bold rounded-[1.25rem] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group"
                    >
                        Sign In to Account
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                    <p className="text-sm font-semibold text-slate-500">
                        New to SmartHealth?{' '}
                        <Link to="/register" className="text-indigo-600 hover:underline">
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
