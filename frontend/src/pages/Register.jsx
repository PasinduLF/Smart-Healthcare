import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, User, Mail, Lock, Phone, Clipboard, ChevronRight, FileUp } from 'lucide-react';
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
        specialty: '', // for doctor
        experience: '', // for doctor
        consultationFee: '' // for doctor
    });
    const [certificateFile, setCertificateFile] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (role === 'doctor' && !certificateFile) {
            setError('Please upload your medical certificate (PDF) for verification.');
            return;
        }

        let submitData;
        if (role === 'doctor') {
            submitData = new FormData();
            Object.entries(formData).forEach(([key, val]) => {
                if (val) submitData.append(key, val);
            });
            submitData.append('certificate', certificateFile);
        } else {
            submitData = formData;
        }

        const res = await register(submitData, role);
        if (res.success) {
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } else {
            setError(res.error || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 overflow-hidden">
            {/* Left — Image Panel */}
            <div className="hidden lg:flex lg:w-5/12 relative">
                <img src="/images/doctors.jpg" alt="Healthcare professionals" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-brand-900/80 via-navy-800/70 to-navy-900/60"></div>
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-black text-white tracking-tight">SmartHealth</span>
                    </div>
                    <div className="space-y-6">
                        <h1 className="text-4xl font-black text-white leading-tight">Start Your<br />Health Journey</h1>
                        <p className="text-white/70 font-medium max-w-sm leading-relaxed">Join thousands of patients and doctors who trust SmartHealth for seamless, modern healthcare management.</p>
                        <div className="flex items-center gap-4 pt-2">
                            <div className="flex -space-x-2">
                                {[...'ABCD'].map((l, i) => (
                                    <div key={i} className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-xs font-bold text-white">{l}</div>
                                ))}
                            </div>
                            <p className="text-sm text-white/60 font-medium">Trusted by <span className="text-brand-400 font-bold">50,000+</span> users</p>
                        </div>
                    </div>
                    <p className="text-xs text-white/30 font-medium">&copy; 2026 SmartHealth. All rights reserved.</p>
                </div>
            </div>

            {/* Right — Register Form */}
            <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-50/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-navy-50/30 rounded-full blur-3xl"></div>

                <div className="w-full max-w-xl relative z-10">
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
                        <div className="p-2.5 bg-brand-600 rounded-2xl shadow-lg shadow-brand-100">
                            <Activity className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-black text-slate-900 tracking-tight">SmartHealth</span>
                    </div>

                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create your Account</h2>
                        <p className="text-slate-500 font-medium mt-2">Join the next generation of healthcare today.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-coral-50 border border-coral-100 text-coral-600 rounded-2xl text-sm font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-coral-500 rounded-full"></span>
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
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === 'patient' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Patient
                            </button>
                            <button 
                                type="button"
                                onClick={() => setRole('doctor')}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === 'doctor' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Doctor
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input name="name" type="text" required placeholder="John Doe" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input name="email" type="email" required placeholder="john@example.com" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input name="password" type="password" required placeholder="••••••••" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Contact Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input name="contactNumber" type="text" required placeholder="+94 77..." onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                                </div>
                            </div>

                            {role === 'doctor' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Specialty</label>
                                        <div className="relative">
                                            <Clipboard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input name="specialty" type="text" required placeholder="Cardiology" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Years of Experience</label>
                                        <div className="relative">
                                            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input name="experience" type="number" required placeholder="10" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Consultation Fee (Rs.)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs</span>
                                            <input name="consultationFee" type="number" min="0" required placeholder="1500" onChange={handleChange} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-2xl outline-none transition-all font-medium text-slate-700 text-sm" />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium px-1">Set your starting consultation fee per appointment</p>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Medical Certificate (PDF)</label>
                                        <div className="relative">
                                            <label className={`flex items-center gap-3 w-full px-5 py-4 rounded-2xl cursor-pointer transition-all border ${certificateFile ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-transparent hover:border-brand-200'}`}>
                                                <FileUp className={`w-5 h-5 flex-shrink-0 ${certificateFile ? 'text-green-500' : 'text-slate-400'}`} />
                                                <span className={`text-sm font-medium truncate ${certificateFile ? 'text-green-700' : 'text-slate-400'}`}>
                                                    {certificateFile ? certificateFile.name : 'Upload your medical certificate'}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file && file.type === 'application/pdf') {
                                                            setCertificateFile(file);
                                                        } else if (file) {
                                                            setError('Only PDF files are allowed');
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium px-1">Upload your valid medical license or certification for admin verification (PDF only)</p>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full py-5 bg-navy-600 text-white font-bold rounded-[1.25rem] hover:bg-navy-700 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group mt-6"
                        >
                            Create My Account
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                        <p className="text-sm font-semibold text-slate-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-brand-600 hover:underline">
                                Sign in instead
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
