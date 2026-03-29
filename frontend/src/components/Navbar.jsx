import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Menu, X, User, LogOut, ChevronRight } from 'lucide-react';
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
        { name: 'Appointments', path: '/doctor/appointments' },
        { name: 'My Schedule', path: '/doctor/schedule' },
        { name: 'Prescriptions', path: '/doctor/prescriptions' },
    ];

    const adminLinks = [
        { name: 'Overview', path: '/admin' },
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
        <nav className={`fixed top-0 w-full z-[100] transition-all duration-300 ${isScrolled ? 'py-3 bg-white/80 backdrop-blur-lg shadow-sm border-b' : 'py-5 bg-transparent'
            }`}>
            <div className="container mx-auto px-6 flex justify-between items-center">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="p-2 bg-indigo-600 rounded-xl group-hover:rotate-12 transition-transform duration-300">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-slate-900">
                        Smart<span className="text-indigo-600">Health</span>
                    </span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden lg:flex items-center gap-6">
                    {publicLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`text-sm font-semibold transition-colors hover:text-indigo-600 ${isActive(link.path) ? 'text-indigo-600' : 'text-slate-600'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                    {user && <div className="h-4 w-[1px] bg-slate-200 mx-2" />}
                    {getRoleLinks().map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`text-sm font-bold transition-colors hover:text-indigo-600 ${isActive(link.path) ? 'text-indigo-600' : 'text-slate-900'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* Auth Actions */}
                <div className="hidden md:flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <Link
                                to={user.role === 'patient' ? '/patient/profile' : user.role === 'doctor' ? '/doctor/schedule' : '/admin/settings'}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-100 transition-all border border-slate-100"
                            >
                                <User className="w-4 h-4" />
                                {user.name.split(' ')[0]}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link to="/login" className="px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-indigo-600 transition">
                                Sign In
                            </Link>
                            <Link to="/register" className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">
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
                <div className="md:hidden absolute top-full left-0 w-full bg-white border-b shadow-xl p-6 animate-in slide-in-from-top-4 duration-200 overflow-y-auto max-h-[80vh]">
                    <div className="flex flex-col gap-4">
                        {[...publicLinks, ...getRoleLinks()].map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsMenuOpen(false)}
                                className={`text-lg font-bold flex justify-between items-center ${isActive(link.path) ? 'text-indigo-600' : 'text-slate-700'
                                    }`}
                            >
                                {link.name}
                                <ChevronRight className="w-5 h-5 opacity-50" />
                            </Link>
                        ))}
                        <hr className="my-2" />
                        {user ? (
                            <div className="space-y-3">
                                <button
                                    onClick={handleLogout}
                                    className="w-full py-4 text-red-600 font-bold border border-red-100 rounded-2xl bg-red-50"
                                >
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Link
                                    to="/login"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block w-full py-4 text-center font-bold text-slate-700 bg-slate-50 rounded-2xl"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block w-full py-4 text-center font-bold text-white bg-indigo-600 rounded-2xl"
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
