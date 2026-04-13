import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Menu, X, User, LogOut, ChevronRight, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsMenuOpen(false);
    };

    const publicLinks = [
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' },
        { name: 'About', path: '/about' },
        { name: 'Contact', path: '/contact' },
    ];

    const patientLinks = [
        { name: 'Find Doctors', path: '/patient/search' },
        { name: 'My Appointments', path: '/patient/appointments' },
        { name: 'AI Checker', path: '/patient/ai' },
        { name: 'Medical Reports', path: '/patient/reports' },
    ];

    const doctorLinks = [
        { name: 'My Profile', path: '/doctor/profile' },
        { name: 'Appointments', path: '/doctor/appointments' },
        { name: 'My Schedule', path: '/doctor/schedule' },
        { name: 'Prescriptions', path: '/doctor/prescriptions' },
    ];

    const adminLinks = [
        { name: 'Overview', path: '/admin' },
        { name: 'My Profile', path: '/admin/profile' },
        { name: 'Users', path: '/admin/users' },
        { name: 'Revenue', path: '/admin/payments' },
        { name: 'Settings', path: '/admin/settings' },
    ];

    const getRoleLinks = () => {
        if (!user) return [];
        if (user.role === 'admin') return adminLinks;
        if (user.role === 'doctor') return doctorLinks;
        return patientLinks;
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed top-0 w-full z-[100] bg-white shadow-sm border-b border-slate-100">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900">
                        Smart<span className="text-blue-600">Health</span>
                    </span>
                </Link>

                {/* Desktop Navigation Links */}
                <div className="hidden lg:flex items-center gap-8">
                    {/* Public Home Links */}
                    <Link to="/" className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                        Home
                    </Link>

                    {/* Role-specific Links */}
                    {user && user.role === 'patient' && (
                        <>
                            <div className="w-px h-5 bg-slate-200"></div>
                            <Link to="/patient/search" className={`text-sm font-medium transition-colors ${isActive('/patient/search') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                Find Doctors
                            </Link>
                            <Link to="/patient/appointments" className={`text-sm font-medium transition-colors ${isActive('/patient/appointments') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                My Appointments
                            </Link>
                            <Link to="/patient/profile" className={`text-sm font-medium transition-colors ${isActive('/patient/profile') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                Patient Details
                            </Link>
                            <Link to="/patient/ai" className={`text-sm font-medium transition-colors ${isActive('/patient/ai') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                AI Checker
                            </Link>
                            <Link to="/patient/reports" className={`text-sm font-medium transition-colors ${isActive('/patient/reports') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                Prescriptions
                            </Link>
                        </>
                    )}

                    {user && user.role === 'doctor' && (
                        <>
                            <div className="w-px h-5 bg-slate-200"></div>
                            <Link to="/doctor/appointments" className={`text-sm font-medium transition-colors ${isActive('/doctor/appointments') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                Appointments
                            </Link>
                            <Link to="/doctor/schedule" className={`text-sm font-medium transition-colors ${isActive('/doctor/schedule') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                My Schedule
                            </Link>
                            <Link to="/doctor/prescriptions" className={`text-sm font-medium transition-colors ${isActive('/doctor/prescriptions') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                Prescriptions
                            </Link>
                        </>
                    )}

                    {user && user.role === 'admin' && (
                        <>
                            <div className="w-px h-5 bg-slate-200"></div>
                            <Link to="/admin" className={`text-sm font-medium transition-colors ${isActive('/admin') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                Dashboard
                            </Link>
                            <Link to="/admin/users" className={`text-sm font-medium transition-colors ${isActive('/admin/users') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                Users
                            </Link>
                            <Link to="/admin/appointments" className={`text-sm font-medium transition-colors ${isActive('/admin/appointments') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                Appointments
                            </Link>
                            <Link to="/admin/payments" className={`text-sm font-medium transition-colors ${isActive('/admin/payments') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                                Revenue
                            </Link>
                        </>
                    )}
                </div>

                {/* Right Actions */}
                <div className="hidden md:flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <button className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Notifications">
                                <Bell className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-medium text-slate-900">{user.name.split(' ')[0]}</span>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link to="/login" className="px-5 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition">
                                Sign In
                            </Link>
                            <Link to="/register" className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition ">
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 shadow-lg p-6 animate-in slide-in-from-top-4 duration-200">
                    <div className="flex flex-col gap-4">
                        {user && user.role === 'patient' ? (
                            <>
                                <Link to="/patient/search" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/patient/search') ? 'text-blue-600' : 'text-slate-700'}`}>Find Doctors<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/patient/appointments" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/patient/appointments') ? 'text-blue-600' : 'text-slate-700'}`}>My Appointments<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/patient/profile" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/patient/profile') ? 'text-blue-600' : 'text-slate-700'}`}>Patient Details<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/patient/ai" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/patient/ai') ? 'text-blue-600' : 'text-slate-700'}`}>AI Checker<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/patient/reports" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/patient/reports') ? 'text-blue-600' : 'text-slate-700'}`}>Prescriptions<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/patient/reports" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/patient/reports') ? 'text-blue-600' : 'text-slate-700'}`}>Medical Reports<ChevronRight className="w-5 h-5" /></Link>
                            </>
                        ) : user && user.role === 'doctor' ? (
                            <>
                                <Link to="/doctor/appointments" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/doctor/appointments') ? 'text-blue-600' : 'text-slate-700'}`}>Appointments<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/doctor/schedule" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/doctor/schedule') ? 'text-blue-600' : 'text-slate-700'}`}>My Schedule<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/doctor/prescriptions" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/doctor/prescriptions') ? 'text-blue-600' : 'text-slate-700'}`}>Prescriptions<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/doctor/profile" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/doctor/profile') ? 'text-blue-600' : 'text-slate-700'}`}>My Profile<ChevronRight className="w-5 h-5" /></Link>
                            </>
                        ) : user && user.role === 'admin' ? (
                            <>
                                <Link to="/admin" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/admin') ? 'text-blue-600' : 'text-slate-700'}`}>Dashboard<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/admin/users" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/admin/users') ? 'text-blue-600' : 'text-slate-700'}`}>Users<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/admin/appointments" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/admin/appointments') ? 'text-blue-600' : 'text-slate-700'}`}>Appointments<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/admin/payments" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/admin/payments') ? 'text-blue-600' : 'text-slate-700'}`}>Revenue<ChevronRight className="w-5 h-5" /></Link>
                                <Link to="/admin/settings" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/admin/settings') ? 'text-blue-600' : 'text-slate-700'}`}>Settings<ChevronRight className="w-5 h-5" /></Link>
                            </>
                        ) : (
                            <>
                                <Link to="/" onClick={() => setIsMenuOpen(false)} className={`text-lg font-semibold flex justify-between items-center ${isActive('/') ? 'text-blue-600' : 'text-slate-700'}`}>Home<ChevronRight className="w-5 h-5" /></Link>
                            </>
                        )}
                        <hr className="my-2" />
                        {user ? (
                            <button
                                onClick={handleLogout}
                                className="w-full py-3 text-red-600 font-semibold border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition"
                            >
                                Sign Out
                            </button>
                            
                        ) : (
                            <div className="space-y-3">
                                <Link
                                    to="/login"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block w-full py-3 text-center font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block w-full py-3 text-center font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                                >
                                    Join Now
                                </Link>
                            </div>
                            
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
