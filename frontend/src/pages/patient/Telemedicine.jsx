import React from 'react';
import { Video } from 'lucide-react';
import VideoCall from '../../components/VideoCall';

export default function Telemedicine({ activeCall, setActiveCall }) {
    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Telemedicine Session</h2>
            {activeCall ? (
                <VideoCall
                    appointmentId={activeCall.id}
                    date={activeCall.date}
                    time={activeCall.time}
                    onEndCall={() => setActiveCall(null)}
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Video className="w-12 h-12 mb-4 text-gray-300" />
                    <p>Select an appointment and click "Join Call" to start a session.</p>
                </div>
            )}
        </div>
    );
}
