import React from 'react';
import { Settings, Shield, Percent, Save } from 'lucide-react';

export default function AdminSettings() {
    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Settings className="w-6 h-6 text-slate-400" />
                Global Platform Configurations
            </h2>

            <div className="grid lg:grid-cols-2 gap-8">
                <div className="glass-premium p-8 border-slate-50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-coral-50 rounded-2xl">
                            <Shield className="w-6 h-6 text-coral-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">Maintenance Protocol</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">System Health & Stability</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-100 mb-6">
                        <div className="pr-4">
                            <p className="font-bold text-slate-800 text-sm">Lock Booking Service</p>
                            <p className="text-xs text-slate-500 font-medium">Temporarily disable patient appointments for all specialists.</p>
                        </div>
                        <input type="checkbox" className="w-10 h-6 appearance-none bg-slate-200 checked:bg-navy-600 rounded-full cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all checked:after:left-5 transition-all" />
                    </div>

                    <button className="w-full py-4 bg-navy-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-navy-700 transition-all shadow-xl shadow-navy-200">
                        Update Protocol Status
                    </button>
                </div>

                <div className="glass-premium p-8 border-slate-50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-emerald-50 rounded-2xl">
                            <Percent className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">Fee Infrastructure</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform Revenue Model</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Commission Percentage (%)</label>
                            <input type="number" defaultValue="5" className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:border-brand-100 transition-all" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-1">This fee is automatically deducted from every doctor's consultation payout.</p>
                    </div>

                    <button className="w-full py-4 bg-navy-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-navy-700 transition-all shadow-xl shadow-navy-200 flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> Save Fee Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
