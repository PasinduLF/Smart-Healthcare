import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Shield, Zap, Search, Calendar, Video, Brain, ArrowRight, CheckCircle, Star, Users } from 'lucide-react';

export default function Home() {
    const stats = [
        { label: 'Verified Patients', value: '12k+' },
        { label: 'Expert Doctors', value: '450+' },
        { label: 'Consultations done', value: '25k+' },
        { label: 'AI Diagnostic Acc.', value: '98%' },
    ];

    const features = [
        {
            icon: Search,
            title: 'Search Specialist',
            desc: 'Find the right doctor based on specialization, experience, and ratings with our smart search.',
            color: 'bg-blue-100 text-blue-600'
        },
        {
            icon: Calendar,
            title: 'Instant Booking',
            desc: 'Schedule, reschedule, or cancel appointments in seconds with real-time availability sync.',
            color: 'bg-indigo-100 text-indigo-600'
        },
        {
            icon: Video,
            title: 'Telemedicine',
            desc: 'High-quality video consultations with integrated chat and file sharing capabilities.',
            color: 'bg-teal-100 text-teal-600'
        },
        {
            icon: Brain,
            title: 'AI Symptom Checker',
            desc: 'Advanced Gemini-powered analysis of your symptoms with structured medical reasoning.',
            color: 'bg-purple-100 text-purple-600'
        }
    ];

    return (
        <div className="pb-20">
            {/* Hero Section */}
            <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 overflow-hidden">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl animate-drift"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-teal-100/30 rounded-full blur-3xl animate-drift"></div>

                <div className="container mx-auto px-6 relative z-10 text-center max-w-5xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-2">
                        <Star className="w-3 h-3 fill-current" />
                        Next-Gen Health Platform
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        Smart Healthcare for a <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">Smarter Future.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700">
                        Access world-class medical expertise, instant AI diagnostics, and seamless consultations—all from the comfort of your home. 
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <Link to="/register" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:-translate-y-1 flex items-center justify-center gap-2 group">
                            Get Started Now
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link to="/services" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-lg hover:-translate-y-1">
                            Explore Services
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="container mx-auto px-6 mb-32">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 p-10 bg-slate-900 rounded-[3rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(79,70,229,0.15),transparent)]"></div>
                    {stats.map((stat, i) => (
                        <div key={i} className="text-center relative z-10">
                            <h3 className="text-3xl md:text-4xl font-black text-white mb-2">{stat.value}</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Grid */}
            <section className="container mx-auto px-6 mb-32">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">Built for Reliability, Focused on You.</h2>
                    <p className="text-slate-600">Explore the powerful features that make SmartHealth the leading platform for digital medical care.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((f, i) => (
                        <div key={i} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 group hover:-translate-y-2">
                            <div className={`p-4 rounded-2xl inline-block mb-6 ${f.color} group-hover:scale-110 transition-transform duration-500`}>
                                <f.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* AI Call to Action */}
            <section className="container mx-auto px-6 mb-20">
                <div className="p-10 md:p-20 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center gap-12 group">
                    <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
                        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white rounded-full blur-[120px] animate-drift"></div>
                    </div>
                    
                    <div className="flex-1 text-center lg:text-left relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest mb-6">
                            <Zap className="w-3 h-3 fill-current" />
                            Powered by Gemini 2.0
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
                            Not feeling well? <br />Check with AI instantly.
                        </h2>
                        <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto lg:mx-0">
                            Our advanced diagnostic AI analyzes your symptoms and medical profile to provide an expert assessment in seconds—guiding you to the right care path.
                        </p>
                        <Link to="/patient/ai" className="px-10 py-5 bg-white text-indigo-600 font-bold rounded-2xl hover:shadow-2xl hover:scale-105 transition-all text-lg shadow-xl shadow-indigo-900/20 inline-block">
                            Start Symptom Check
                        </Link>
                    </div>

                    <div className="flex-1 relative z-10 flex justify-center">
                        <div className="w-64 h-64 md:w-80 md:h-80 bg-white/10 backdrop-blur-3xl rounded-[3rem] border border-white/20 flex items-center justify-center p-8 rotate-3 transition-transform duration-500 group-hover:rotate-0">
                            <Brain className="w-full h-full text-white animate-float" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonial / Social Proof */}
            <section className="container mx-auto px-6 pb-20">
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { name: 'Dr. Sarah Johnson', role: 'Head of Cardiology', text: 'The most intuitive platform for digital consultations. Pure genius.' },
                        { name: 'Michael Chen', role: 'Patient', text: 'The AI Symptom checker saved me tons of anxiety. Fast and accurate!' },
                        { name: 'Amanda Smith', role: 'Family Doctor', text: 'Managing appointments has never been this simple. Highly recommended.' }
                    ].map((t, i) => (
                        <div key={i} className="p-8 bg-slate-50 rounded-3xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all">
                            <div className="flex gap-1 text-yellow-500 mb-4">
                                {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                            </div>
                            <p className="text-slate-700 italic mb-6">"{t.text}"</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                    {t.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                                    <p className="text-xs text-slate-500">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
