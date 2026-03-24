import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, User, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [role, setRole] = useState('patient');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        
        const payload = { name, email, password };
        if (role === 'doctor') {
            payload.specialty = 'General Practice'; // Default for MVP
            payload.maxPatients = 10;
        }

        const res = await register(payload, role);
        if (res.success) {
            navigate('/login');
        } else {
            setError(res.error || 'Registration failed');
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-10">
            <div className="glass-card w-full max-w-md p-8">
                <div className="flex flex-col items-center mb-8">
                    <Activity className="w-12 h-12 text-teal-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
                    <p className="text-gray-500 text-sm">Join the Smart Healthcare Platform</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm text-center">{error}</div>}

                <form onSubmit={handleRegister} className="space-y-5">
                    <div className="flex gap-4 mb-4">
                        <label className={`flex-1 cursor-pointer py-2 text-center rounded-lg border font-medium transition ${role === 'patient' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                            <input type="radio" name="role" value="patient" className="hidden" onChange={() => setRole('patient')} checked={role === 'patient'} />
                            Patient
                        </label>
                        <label className={`flex-1 cursor-pointer py-2 text-center rounded-lg border font-medium transition ${role === 'doctor' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                            <input type="radio" name="role" value="doctor" className="hidden" onChange={() => setRole('doctor')} checked={role === 'doctor'} />
                            Doctor
                        </label>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="John Doe" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input required value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="you@example.com" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input required value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="••••••••" />
                        </div>
                    </div>

                    <button type="submit" className={`w-full py-3 text-white font-semibold rounded-lg transition shadow-lg ${role === 'patient' ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30' : 'bg-teal-600 hover:bg-teal-700 hover:shadow-teal-500/30'}`}>
                        Register as {role === 'patient' ? 'Patient' : 'Doctor'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-teal-600 font-semibold hover:underline">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
