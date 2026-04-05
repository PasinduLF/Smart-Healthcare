import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAiServiceUrl, getPatientServiceUrl } from '../../config/api';
import { Brain, LogOut } from 'lucide-react';

export default function AIAnalyzer() {
    const { user, token } = useAuth();
    const [symptoms, setSymptoms] = useState('');
    const [aiResponse, setAiResponse] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [symptomHistory, setSymptomHistory] = useState([]);
    const [viewModal, setViewModal] = useState(null);
    const [healthProfile, setHealthProfile] = useState(null);

    useEffect(() => {
        const fetchContext = async () => {
            if (!user?.id) return;
            try {
                const res = await axios.get(getPatientServiceUrl(`/profile/${user.id}`), { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setHealthProfile(res.data);
                fetchSymptomHistory();
            } catch (err) {
                console.error("Failed to fetch context for AI", err);
            }
        };
        fetchContext();
    }, [user, token]);

    const fetchSymptomHistory = async () => {
        try {
            const res = await axios.get(getAiServiceUrl(`/history/${user.id}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSymptomHistory(res.data);
        } catch (err) {
            console.error('Failed to fetch symptom history', err);
        }
    };

    const handleCheckSymptoms = async (e) => {
        e.preventDefault();
        if (!symptoms.trim()) return;

        setAiLoading(true);
        try {
            const res = await axios.post(getAiServiceUrl('/check-symptoms'), {
                symptoms,
                patientProfile: healthProfile,
                patientId: user?.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAiResponse(res.data);
            fetchSymptomHistory();
        } catch (err) {
            console.error(err);
            alert("Failed to analyze symptoms");
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-indigo-600" />
                <h2 className="text-2xl font-semibold">AI Symptom Checker</h2>
            </div>
            <p className="text-gray-600 italic">Describe your symptoms below. AI analyzes them with your profile for insights.</p>

            <form onSubmit={handleCheckSymptoms} className="space-y-4">
                <textarea 
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                    rows="4" 
                    placeholder="Describe your symptoms (e.g., severe headache behind right eye...)"
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    required
                ></textarea>
                <button type="submit" disabled={aiLoading} className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                    {aiLoading ? 'Analyzing...' : 'Generate AI Diagnosis'}
                </button>
            </form>

            {aiResponse && (
                <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${
                            aiResponse.severity === 'emergency' ? 'bg-red-100 text-red-700' :
                            aiResponse.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            aiResponse.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                        }`}>
                            {aiResponse.severity} severity
                        </span>
                    </div>

                    <div className="p-5 bg-white border rounded-xl shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Brain className="w-5 h-5 text-indigo-500" /> Analysis</h3>
                        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{aiResponse.analysis}</div>
                    </div>
                    {/* Simplified for brevity in layout, full modal below handles history */}
                </div>
            )}

            {symptomHistory.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                    <h3 className="font-bold text-gray-800 mb-4">Past Symptom Checks</h3>
                    <div className="space-y-3">
                        {symptomHistory.map(h => (
                            <div key={h._id} className="p-4 border rounded-xl bg-white/50 flex justify-between items-center">
                                <p className="text-sm font-medium text-gray-800 truncate flex-1">{h.symptoms}</p>
                                <button onClick={() => setViewModal(h)} className="ml-4 px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg">View Details</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal - Reusing the complex modal from Dashboard */}
            {viewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewModal(null)}>
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center bg-indigo-50">
                            <div>
                                <h3 className="text-xl font-bold">Historical AI Diagnosis</h3>
                                <p className="text-xs text-gray-500">{new Date(viewModal.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setViewModal(null)} className="p-2 hover:bg-white rounded-full"><LogOut className="w-6 h-6 rotate-180" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="p-4 bg-gray-50 rounded-xl border-l-4 border-indigo-500 font-medium italic">"{viewModal.symptoms}"</div>
                            <div className="p-5 bg-white border rounded-xl">
                                <h4 className="font-bold mb-3 flex items-center gap-2 text-indigo-600"><Brain className="w-5 h-5" /> Analysis</h4>
                                <div className="text-gray-700 text-sm whitespace-pre-wrap">{viewModal.fullAnalysis || viewModal.analysis}</div>
                            </div>
                            {/* ... more modal details as needed ... */}
                        </div>
                        <div className="p-6 border-t text-center">
                            <button onClick={() => setViewModal(null)} className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
