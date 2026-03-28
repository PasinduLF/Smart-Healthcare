import React from 'react';
import { Video } from 'lucide-react';
import VideoCall from '../../components/VideoCall';

export default function DoctorTelemedicine({ activeCall, setActiveCall }) {
    return (
        <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" />
                Live Consultation Session
            </h2>
            {activeCall ? (
                <div className="glass-premium p-1 overflow-hidden rounded-[32px] shadow-2xl shadow-indigo-100">
                    <VideoCall appointmentId={activeCall.id} date={activeCall.date} time={activeCall.time} onEndCall={() => setActiveCall(null)} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-300 bg-slate-50/50 rounded-[40px] border-4 border-dashed border-slate-100/50">
                    <div className="p-8 bg-white rounded-full shadow-xl shadow-slate-100 mb-6">
                        <Video className="w-12 h-12 text-slate-200" />
                    </div>
                    <p className="font-black uppercase tracking-widest text-[10px] text-slate-400">Waiting for active uplink</p>
                    <p className="text-sm font-medium mt-2 max-w-xs text-center leading-relaxed">Select a patient from your appointments list and click "Start Consultation" to begin the video stream.</p>
                </div>
            )}
        </div>
    );
}
