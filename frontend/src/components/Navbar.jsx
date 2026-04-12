import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Menu, X, User, LogOut, ChevronRight, Bell, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Navbar() {
    const { user, token, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close notification dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!user?.id || !token) return;
        try {
            const res = await axios.get(`http://localhost:3000/api/notifications/notifications/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    }, [user, token]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const deleteNotification = async (id) => {
        try {
            await axios.delete(`http://localhost:3000/api/notifications/notifications/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => (Array.isArray(prev) ? prev : []).filter(n => n._id !== id));
        } catch (err) {
            console.error('Failed to delete notification', err);
        }
    };

    const clearAllNotifications = async () => {
        try {
            await axios.delete(`http://localhost:3000/api/notifications/notifications/user/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications([]);
        } catch (err) {
            console.error('Failed to clear notifications', err);
        }
    };

    const markAllRead = async (currentNotifications) => {
        const unread = (Array.isArray(currentNotifications) ? currentNotifications : []).filter(n => !n.read);
        if (unread.length === 0) return;
        await Promise.allSettled(
            unread.map(n =>
                axios.put(`http://localhost:3000/api/notifications/notifications/${n._id}/read`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            )
        );
        setNotifications(prev => (Array.isArray(prev) ? prev : []).map(n => ({ ...n, read: true })));
    };

    const unreadCount = (Array.isArray(notifications) ? notifications : []).filter(n => !n.read).length;

    const publicLinks = [
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' },
        { name: 'About', path: '/about' },
        { name: 'Contact', path: '/contact' },
    ];

    const patientLinks = [
        { name: 'Find Doctors', path: '/patient/search' },
        { name: 'My Appointments', path: '/patient/appointments' },
        { name: 'Patient Details', path: '/patient/profile' },
        { name: 'AI Checker', path: '/patient/ai' },
        { name: 'Prescriptions', path: '/patient/prescriptions' },
        { name: 'Medical Reports', path: '/patient/reports' },
    ];

    const doctorLinks = [
        { name: 'My Profile', path: '/doctor/profile' },
        { name: 'Appointments', path: '/doctor/appointments' },
        { name: 'My Schedule', path: '/doctor/schedule' },
        { name: 'Prescriptions', path: '/doctor/prescriptions' },
        { name: 'Patient Reports', path: '/doctor/reports' },
        { name: 'Dashboard', path: '/doctor/dashboard' },
    ];

    const adminLinks = [
        { name: 'Overview', path: '/admin' },
        { name: 'My Profile', path: '/admin/profile' },
        { name: 'Users', path: '/admin/users' },
        { name: 'Revenue', path: '/admin/payments' },
        { name: 'Email Delivery Logs', path: '/admin/emails' },
        { name: 'System Settings', path: '/admin/settings' },
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
                    <div className="p-2 bg-navy-600 rounded-xl group-hover:rotate-12 transition-transform duration-300">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-navy-600">
                        Smart<span className="text-brand-500">Health</span>
                    </span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden lg:flex items-center gap-5">
                    {!user && publicLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`text-sm font-semibold whitespace-nowrap transition-colors hover:text-brand-500 ${isActive(link.path) ? 'text-brand-500' : 'text-slate-600'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                    {user && getRoleLinks().map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`text-sm font-bold whitespace-nowrap transition-colors hover:text-brand-500 ${isActive(link.path) ? 'text-brand-500' : 'text-navy-600'
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
                            {/* Notification Bell */}
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={() => {
                                        const next = !showNotifications;
                                        setShowNotifications(next);
                                        if (next) markAllRead(notifications);
                                    }}
                                    className="relative p-2.5 text-slate-500 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-colors"
                                    title="Notifications"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-coral-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/50 z-[200] overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                                            <h3 className="text-sm font-bold text-slate-700">Notifications</h3>
                                            {notifications.length > 0 && (
                                                <button
                                                    onClick={clearAllNotifications}
                                                    className="text-[10px] font-bold text-coral-400 hover:text-coral-600 uppercase tracking-wider"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <p className="text-sm text-slate-400 text-center py-8">No notifications</p>
                                            ) : (
                                                notifications.map(notif => (
                                                    <div key={notif._id} className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50/50 transition ${!notif.read ? 'bg-brand-50/30' : ''}`}>
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-slate-700">{notif.title}</p>
                                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                                                <p className="text-[10px] text-slate-300 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                                                                className="p-1 text-slate-300 hover:text-coral-400 hover:bg-coral-50 rounded-lg transition flex-shrink-0"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Link
                                to={user.role === 'patient' ? '/patient/profile' : user.role === 'doctor' ? '/doctor/profile' : '/admin/profile'}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-100 transition-all border border-slate-100"
                            >
                                <User className="w-4 h-4" />
                                {user.name.split(' ')[0]}
                            </Link>
                            <button
                                onClick={logout}
                                className="p-2.5 text-slate-400 hover:text-coral-400 hover:bg-coral-50 rounded-xl transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link to="/login" className="px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-brand-500 transition">
                                Sign In
                            </Link>
                            <Link to="/register" className="px-6 py-2.5 bg-navy-600 text-white text-sm font-bold rounded-xl hover:bg-navy-700 transition shadow-lg shadow-navy-100">
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
                        {(!user ? publicLinks : getRoleLinks()).map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsMenuOpen(false)}
                                className={`text-lg font-bold flex justify-between items-center ${isActive(link.path) ? 'text-brand-500' : 'text-slate-700'
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
                                    onClick={() => { logout(); setIsMenuOpen(false); }}
                                    className="w-full py-4 text-coral-400 font-bold border border-coral-100 rounded-2xl bg-coral-50"
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
                                    className="block w-full py-4 text-center font-bold text-white bg-navy-600 rounded-2xl"
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
