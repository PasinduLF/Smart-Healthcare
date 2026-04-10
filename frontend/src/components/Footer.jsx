import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Instagram, Twitter, Linkedin, Github, Mail, Globe, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
    const { user } = useAuth();
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-navy-600 pt-20 pb-10 text-slate-400">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                    {/* Brand Section */}
                    <div className="space-y-6">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="p-2 bg-brand-500 rounded-xl">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-white">
                                Smart<span className="text-brand-400">Health</span>
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed">
                            Revolutionizing healthcare through accessible AI diagnostics, seamless appointments, and professional telemedicine. Your health, our mission.
                        </p>
                        <div className="flex gap-4">
                            {[Twitter, Linkedin, Instagram, Github].map((Icon, i) => (
                                <a key={i} href="#" className="p-2 bg-navy-700 hover:bg-brand-500 text-slate-300 hover:text-white rounded-lg transition-all">
                                    <Icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-bold mb-6">Platform</h4>
                        <ul className="space-y-4 text-sm">
                            <li><Link to="/services" className="hover:text-brand-400 transition">Services</Link></li>
                            <li><Link to="/about" className="hover:text-brand-400 transition">About Us</Link></li>
                            {user ? (
                                <li><Link to={user.role === 'patient' ? '/patient/profile' : '/doctor/schedule'} className="hover:text-brand-400 transition font-bold text-white">My Account Profile</Link></li>
                            ) : (
                                <li><Link to="/login" className="hover:text-brand-400 transition">Health Portal (Login)</Link></li>
                            )}
                            {!user && <li><Link to="/register" className="hover:text-brand-400 transition">Join as Doctor</Link></li>}
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-white font-bold mb-6">Support</h4>
                        <ul className="space-y-4 text-sm">
                            <li><Link to="/contact" className="hover:text-brand-400 transition">Contact Center</Link></li>
                            <li><a href="#" className="hover:text-brand-400 transition">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-brand-400 transition">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-brand-400 transition">FAQ</a></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-white font-bold mb-6">Get in Touch</h4>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-brand-400 mt-0.5" />
                                <span>123 Medical Plaza, Health District,<br />Colombo 07, Sri Lanka</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-brand-400" />
                                <span>+94 11 234 5678</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-brand-400" />
                                <span>hello@smarthealth.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-navy-500 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold uppercase tracking-widest">
                    <p>&copy; {currentYear} SmartHealth Platform. All Rights Reserved.</p>
                    <div className="flex items-center gap-2 text-brand-400">
                        <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></div>
                        <span>AI Diagnostic Engine Active</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
