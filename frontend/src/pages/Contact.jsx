import React from 'react';
import { Mail, Phone, MapPin, MessageCircle, Send, Globe } from 'lucide-react';

export default function Contact() {
    return (
        <div className="pt-20 pb-20">
            {/* Header */}
            <section className="container mx-auto px-6 text-center max-w-4xl mb-24">
                <h1 className="text-5xl font-black text-navy-600 mb-6 underline decoration-brand-200 underline-offset-8">Get in Touch.</h1>
                <p className="text-xl text-slate-600 leading-relaxed">
                    Have questions about our AI diagnostics or need help with your appointment? Our team is available 24/7.
                </p>
            </section>

            <section className="container mx-auto px-6 grid lg:grid-cols-3 gap-8 mb-32">
                {/* Contact Info Cards */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
                        <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-6">
                            <Mail className="w-6 h-6 text-brand-600" />
                        </div>
                        <h3 className="text-lg font-bold text-navy-600 mb-2">Email Us</h3>
                        <p className="text-slate-500 text-sm">Our support team usually responds within 2 hours.</p>
                        <p className="mt-4 font-bold text-brand-600 text-sm">hello@smarthealth.com</p>
                    </div>
                    <div className="p-8 bg-navy-600 rounded-[2.5rem] shadow-lg text-white">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 text-white">
                            <Phone className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Call Support</h3>
                        <p className="text-white/70 text-sm">Need immediate medical assistance?</p>
                        <p className="mt-4 font-bold text-xl">+94 11 234 5678</p>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="lg:col-span-2 p-10 bg-white border border-slate-100 rounded-[3rem] shadow-sm">
                    <h3 className="text-2xl font-bold text-navy-600 mb-8">Send us a Message</h3>
                    <form className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                            <input type="text" placeholder="John Doe" className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:border-brand-500 rounded-2xl outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                            <input type="email" placeholder="john@example.com" className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:border-brand-500 rounded-2xl outline-none transition-all" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Subject</label>
                            <select className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:border-brand-500 rounded-2xl outline-none transition-all appearance-none">
                                <option>General Inquiry</option>
                                <option>Technical Support</option>
                                <option>Billing & Payments</option>
                                <option>AI Diagnostic Feedback</option>
                            </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Your Message</label>
                            <textarea rows="5" placeholder="How can we help you?" className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:border-brand-500 rounded-2xl outline-none transition-all resize-none"></textarea>
                        </div>
                        <div className="md:col-span-2 pt-4">
                            <button className="w-full py-5 bg-navy-600 text-white font-bold rounded-2xl hover:bg-navy-700 transition-all shadow-xl shadow-navy-100 flex items-center justify-center gap-3">
                                Send Message
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
