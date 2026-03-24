import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Lock, Mail } from 'lucide-react';
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
        <div className="min-h-[80vh] flex items-center justify-center">
            <div className="glass-card w-full max-w-md p-8">
                <div className="flex flex-col items-center mb-8">
                    <Activity className="w-12 h-12 text-blue-600 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
                    <p className="text-gray-500 text-sm">Sign in to your account</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm text-center">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="flex gap-4">
                        <label className={`flex-1 cursor-pointer py-2 text-center rounded-lg border font-medium transition ${role === 'patient' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                            <input type="radio" name="role" value="patient" className="hidden" onChange={() => setRole('patient')} checked={role === 'patient'} />
                            Patient
                        </label>
                        <label className={`flex-1 cursor-pointer py-2 text-center rounded-lg border font-medium transition ${role === 'doctor' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                            <input type="radio" name="role" value="doctor" className="hidden" onChange={() => setRole('doctor')} checked={role === 'doctor'} />
                            Doctor
                        </label>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`w-full py-3 text-white font-semibold rounded-lg transition shadow-lg ${role === 'patient' ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30' : 'bg-teal-600 hover:bg-teal-700 hover:shadow-teal-500/30'}`}
                    >
                        Sign In
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                        Register here
                    </Link>
                </p>
            </div>
        </div>
    );
}
