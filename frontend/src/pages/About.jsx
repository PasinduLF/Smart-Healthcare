import React from 'react';
import { Target, Heart, Award, ShieldCheck, Users, Brain, Globe, MessageSquare } from 'lucide-react';

export default function About() {
    return (
        <div className="pt-20 pb-20">
            {/* Header */}
            <section className="container mx-auto px-6 text-center max-w-4xl mb-24">
                <h1 className="text-5xl font-black text-slate-900 mb-6">Changing the Way You Experience <span className="text-indigo-600">Health.</span></h1>
                <p className="text-xl text-slate-600 leading-relaxed">
                    SmartHealth is a multi-dimensional healthcare platform designed to bridge the gap between AI-driven diagnostics and expert medical care. Our mission is to make quality healthcare accessible, instant, and transparent for everyone.
                </p>
            </section>

            {/* Mission/Vision */}
            <section className="container mx-auto px-6 grid md:grid-cols-2 gap-12 mb-32">
                <div className="p-10 bg-indigo-600 rounded-[3rem] text-white space-y-6 flex flex-col justify-center">
                    <Target className="w-12 h-12 opacity-80" />
                    <h2 className="text-4xl font-black">Our Mission</h2>
                    <p className="text-white/80 text-lg leading-relaxed">
                        To empower every individual with immediate, data-driven medical insights while providing a seamless connection to the world's best healthcare professionals.
                    </p>
                </div>
                <div className="p-10 bg-slate-900 rounded-[3rem] text-white space-y-6 flex flex-col justify-center">
                    <Heart className="w-12 h-12 opacity-80 text-pink-400" />
                    <h2 className="text-4xl font-black">Our Vision</h2>
                    <p className="text-white/80 text-lg leading-relaxed">
                        A world where medical uncertainty is replaced by intelligent diagnostics and healthcare distance is eliminated through technology.
                    </p>
                </div>
            </section>

            {/* Core Values */}
            <section className="container mx-auto px-6 mb-32 text-center">
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-16">The Values Driving Us</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { icon: ShieldCheck, title: 'Uncompromising Trust', desc: 'Secure medical records and verified doctor credentials you can rely on.' },
                        { icon: Brain, title: 'AI-First Approach', desc: 'Leveraging Gemini 2.0 and LLMs to provide structured, accurate preliminary assessments.' },
                        { icon: Users, title: 'Patient-Centricity', desc: 'Every feature is built with the patients journey and ease of use in mind.' }
                    ].map((v, i) => (
                        <div key={i} className="p-8 bg-white border border-slate-100 rounded-3xl hover:border-indigo-100 hover:shadow-xl transition-all group">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-50 transition-colors">
                                <v.icon className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{v.title}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">{v.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
