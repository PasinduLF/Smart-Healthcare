import React from 'react';
import { Search, Calendar, Video, Brain, Shield, Clock, Users, Database, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Services() {
    const serviceList = [
        {
            title: 'Specialist Search',
            icon: Search,
            desc: 'Browse through hundreds of verified medical specialists. Filter by experience, ratings, and real-time availability.',
            features: ['Verified Credentials', 'Expert Ratings', 'Advanced Filtering']
        },
        {
            title: 'Smart Appointments',
            icon: Calendar,
            desc: 'Book, reschedule, or cancel consultations instantly. Receive instant email and SMS confirmations.',
            features: ['Instant Confirmations', 'Easy Rescheduling', 'Calendar Sync']
        },
        {
            title: 'Telemedicine',
            icon: Video,
            desc: 'Experience high-definition video consultations with your doctor. Includes secure file sharing and integrated chat.',
            features: ['HD Video Quality', 'Secure Chat', 'Document Sharing']
        },
        {
            title: 'AI Symptom Checker',
            icon: Brain,
            desc: 'Get an intelligent, structured assessment of your health symptoms using our Gemini 2.0-powered diagnostic engine.',
            features: ['24/7 Availability', 'Context-Aware', 'Medical Reasoning']
        },
        {
            title: 'Digital Health Records',
            icon: Database,
            desc: 'Securely store and manage your vitals, allergies, and medical reports in one centralized, encrypted portal.',
            features: ['Encrypted Storage', 'Instant Access', 'Vitals Tracking']
        },
        {
            title: 'Global Health Network',
            icon: Globe,
            desc: 'Access a worldwide network of healthcare facilities and experts, ensuring you get the best second opinions.',
            features: ['Second Opinions', 'International Experts', 'Seamless Transfers']
        }
    ];

    return (
        <div className="pt-20 pb-20">
            {/* Header */}
            <section className="container mx-auto px-6 text-center max-w-4xl mb-24">
                <h1 className="text-5xl font-black text-slate-900 mb-6 underline decoration-indigo-200 underline-offset-8">Our Medical Ecosystem.</h1>
                <p className="text-xl text-slate-600 leading-relaxed">
                    SmartHealth provides a comprehensive suite of digital healthcare tools designed for the modern patient and doctor.
                </p>
            </section>

            {/* Services Grid */}
            <section className="container mx-auto px-6 mb-32">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {serviceList.map((s, i) => (
                        <div key={i} className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 group flex flex-col">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <s.icon className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">{s.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-1">{s.desc}</p>
                            <ul className="space-y-3 mb-10">
                                {s.features.map((f, index) => (
                                    <li key={index} className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/register" className="w-full py-4 text-center font-bold text-indigo-600 border border-indigo-100 rounded-2xl bg-indigo-50/50 hover:bg-indigo-600 hover:text-white transition-all">
                                Learn More
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* Trust Banner */}
            <section className="container mx-auto px-6">
                <div className="p-12 md:p-20 bg-slate-900 rounded-[4rem] text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.3),transparent)]"></div>
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <Shield className="w-16 h-16 text-indigo-400 mx-auto mb-8 animate-float" />
                        <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Your Data and Health, <span className="text-indigo-400">Secured.</span></h2>
                        <p className="text-slate-400 mb-10 italic">"Security is at the heart of everything we do. From encrypted consultations to verified credentials—your privacy is our priority."</p>
                        <hr className="border-slate-800 mb-10 w-24 mx-auto" />
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <h4 className="font-bold text-xl mb-1">256-bit</h4>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500">Encryption</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-xl mb-1">99.9%</h4>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500">Uptime</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-xl mb-1">HIPAA</h4>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500">Compliant Mock</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
