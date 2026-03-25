import React, { useState, useEffect } from 'react';
import { Search, Calendar, Video, FileText, Brain, LogOut, Activity, User, Pill } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import VideoCall from '../components/VideoCall';
import { useNavigate, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import BookAppointment from './BookAppointment';
import MyAppointments from './MyAppointments';

export default function PatientDashboard() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [doctors, setDoctors] = useState([]);
    const [doctorMap, setDoctorMap] = useState({});
    const [appointments, setAppointments] = useState([]);
    const [healthProfile, setHealthProfile] = useState({ vitals: { bloodPressure: '', heartRate: '', weight: '', height: '' }, allergies: [], reports: [] });
    const [loading, setLoading] = useState(false);
    const [activeCall, setActiveCall] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    
    // AI State
    const [symptoms, setSymptoms] = useState('');
    const [aiResponse, setAiResponse] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    
    // Profile & Prescriptions
    const [profileData, setProfileData] = useState({ name: '', age: '', contactNumber: '' });
    const [myPrescriptions, setMyPrescriptions] = useState([]);
    
    // Reschedule state
    const [rescheduleData, setRescheduleData] = useState({ id: null, date: '', time: '' });

    useEffect(() => {
        if (!token || !user) return;
        
        const fetchAll = async () => {
            try {
                const docRes = await axios.get('http://localhost:3000/api/doctors/list', { headers: { Authorization: `Bearer ${token}` }});
                setDoctors(docRes.data);
                setDoctorMap(docRes.data.reduce((acc, doc) => {
                    acc[doc._id] = doc.name;
                    return acc;
                }, {}));
                
                const apptRes = await axios.get(`http://localhost:3000/api/appointments/patient/${user.id}`, { headers: { Authorization: `Bearer ${token}` }});
                setAppointments(apptRes.data);
                
                const profRes = await axios.get(`http://localhost:3000/api/patients/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` }});
                setHealthProfile(prev => ({ 
                    ...prev, 
                    vitals: profRes.data.vitals || prev.vitals, 
                    allergies: profRes.data.allergies || [],
                    reports: profRes.data.reports || []
                }));
                setProfileData({
                    name: profRes.data.name || '',
                    age: profRes.data.age || '',
                    contactNumber: profRes.data.contactNumber || ''
                });

                const presRes = await axios.get(`http://localhost:3000/api/doctors/prescriptions/patient/${user.id}`, { headers: { Authorization: `Bearer ${token}` }});
                setMyPrescriptions(presRes.data);
            } catch (err) {
                console.error("Failed to fetch patient data", err);
            }
        };

        fetchAll();
    }, [token, user]);

    const handleBookAppointment = (doctorId) => {
        if (!user || !token) return alert('Please login first');
        navigate(`/patient/book/${doctorId}`);
    };

    const handleCancelAppointment = async (apptId) => {
        try {
            await axios.put(`http://localhost:3000/api/appointments/cancel/${apptId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(appointments.map(a => a._id === apptId ? { ...a, status: 'cancelled' } : a));
        } catch (err) {
            console.error(err);
            alert('Failed to cancel appointment');
        }
    };

    const handleReschedule = async (apptId) => {
        if (!rescheduleData.date || !rescheduleData.time) return alert("Please select date and time");
        try {
            await axios.put(`http://localhost:3000/api/appointments/reschedule/${apptId}`, { date: rescheduleData.date, time: rescheduleData.time }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(appointments.map(a => a._id === apptId ? { ...a, date: rescheduleData.date, time: rescheduleData.time, status: 'pending' } : a));
            setRescheduleData({ id: null, date: '', time: '' });
            alert('Appointment rescheduled and is pending approval!');
        } catch (err) {
            console.error(err);
            alert('Failed to reschedule');
        }
    };

    const startTelemedicine = (apptId) => {
        setActiveCall(`channel-${apptId}`);
        navigate('/patient/telemedicine');
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:3000/api/patients/profile/${user.id}`, profileData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Profile updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update profile");
        }
    };

    const handleUpdateHealthProfile = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:3000/api/patients/health-profile/${user.id}`, healthProfile, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Health profile updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update health profile");
        }
    };

    const handleUploadReport = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;
        
        const formData = new FormData();
        formData.append('report', selectedFile);

        setUploading(true);
        try {
            const res = await axios.post(`http://localhost:3000/api/patients/upload-report/${user.id}`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}` 
                }
            });
            alert("Report uploaded successfully!");
            setHealthProfile(prev => ({
                ...prev,
                reports: [...(prev.reports || []), res.data.report]
            }));
            setSelectedFile(null);
            e.target.reset();
        } catch (err) {
            console.error(err);
            alert("Failed to upload report");
        } finally {
            setUploading(false);
        }
    };

    const handleCheckSymptoms = async (e) => {
        e.preventDefault();
        if (!symptoms.trim()) return;

        setAiLoading(true);
        try {
            const res = await axios.post(`http://localhost:3000/api/ai/check-symptoms`, {
                symptoms,
                patientProfile: healthProfile
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAiResponse(res.data);
        } catch (err) {
            console.error(err);
            alert("Failed to analyze symptoms");
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Patient Dashboard {user ? `- Welcome ${user.name}` : ''}</h1>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium">
                    <LogOut className="w-5 h-5" /> Logout
                </button>
            </div>

            <div className="flex gap-4 mb-8 overflow-x-auto pb-4">
                {[
                    { path: '/patient/profile', icon: User, label: 'My Profile' },
                    { path: '/patient/search', icon: Search, label: 'Find Doctors' },
                    { path: '/patient/appointments', icon: Calendar, label: 'My Appointments' },
                    { path: '/patient/telemedicine', icon: Video, label: 'Video Consult' },
                    { path: '/patient/health', icon: Activity, label: 'Health Profile' },
                    { path: '/patient/prescriptions', icon: Pill, label: 'Prescriptions' },
                    { path: '/patient/reports', icon: FileText, label: 'Medical Reports' },
                    { path: '/patient/ai', icon: Brain, label: 'Symptom Checker' }
                ].map(tab => (
                    <Link
                        key={tab.path}
                        to={tab.path}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition whitespace-nowrap ${location.pathname === tab.path
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white text-gray-600 hover:bg-blue-50'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </Link>
                ))}
            </div>

            <div className="glass-card p-8 min-h-[400px]">
                <Routes>
                    <Route path="/" element={<Navigate to="search" replace />} />
                    
                    <Route path="search" element={
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Search for a Doctor</h2>
                            <div className="flex gap-4">
                                <input type="text" placeholder="Specialty (e.g., Cardiologist)" className="flex-1 px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" />
                                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Search</button>
                            </div>
                            
                            <div className="mt-8 grid md:grid-cols-2 gap-4">
                                {doctors.length === 0 ? <p className="text-gray-500">No expected doctors found.</p> : doctors.map(doc => (
                                    <div key={doc._id} className="p-4 border rounded-xl hover:shadow-md transition bg-white/50">
                                        <h3 className="font-bold text-lg">{doc.name}</h3>
                                        <p className="text-gray-500 text-sm mb-4">{doc.specialty} • Max Patients: {doc.maxPatients}</p>
                                        <button 
                                            onClick={() => handleBookAppointment(doc._id)}
                                            className="w-full py-2 bg-teal-50 text-teal-700 font-medium rounded-lg hover:bg-teal-100 transition">
                                            Book Appointment
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    } />

                    <Route path="book/:doctorId" element={<BookAppointment />} />

                    <Route
                        path="appointments"
                        element={
                            <MyAppointments
                                appointments={appointments}
                                doctorMap={doctorMap}
                                rescheduleData={rescheduleData}
                                setRescheduleData={setRescheduleData}
                                handleReschedule={handleReschedule}
                                handleCancelAppointment={handleCancelAppointment}
                                startTelemedicine={startTelemedicine}
                            />
                        }
                    />

                    <Route path="telemedicine" element={
                        <div>
                            <h2 className="text-xl font-semibold mb-6">Telemedicine Session</h2>
                            {activeCall ? (
                                <VideoCall channelName={activeCall} onEndCall={() => setActiveCall(null)} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <Video className="w-12 h-12 mb-4 text-gray-300" />
                                    <p>Select an appointment and click "Join Call" to start a session.</p>
                                </div>
                            )}
                        </div>
                    } />

                    <Route path="profile" element={
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">My Profile</h2>
                            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                                    <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Age</label>
                                    <input type="number" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={profileData.age} onChange={e => setProfileData({...profileData, age: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Contact Number</label>
                                    <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={profileData.contactNumber} onChange={e => setProfileData({...profileData, contactNumber: e.target.value})} placeholder="+1 234 567 890" />
                                </div>
                                <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Update Profile</button>
                            </form>
                        </div>
                    } />

                    <Route path="health" element={
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">My Health Profile (Vitals & Allergies)</h2>
                            <form onSubmit={handleUpdateHealthProfile} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Blood Pressure (mmHg)</label>
                                        <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 120/80" value={healthProfile.vitals.bloodPressure} onChange={e => setHealthProfile({ ...healthProfile, vitals: { ...healthProfile.vitals, bloodPressure: e.target.value } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Heart Rate (bpm)</label>
                                        <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 72" value={healthProfile.vitals.heartRate} onChange={e => setHealthProfile({ ...healthProfile, vitals: { ...healthProfile.vitals, heartRate: e.target.value } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Weight (kg)</label>
                                        <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 70" value={healthProfile.vitals.weight} onChange={e => setHealthProfile({ ...healthProfile, vitals: { ...healthProfile.vitals, weight: e.target.value } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Height (cm)</label>
                                        <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 175" value={healthProfile.vitals.height} onChange={e => setHealthProfile({ ...healthProfile, vitals: { ...healthProfile.vitals, height: e.target.value } })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Allergies (comma separated)</label>
                                    <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Peanuts, Penicillin" value={healthProfile.allergies.join(', ')} onChange={e => setHealthProfile({ ...healthProfile, allergies: e.target.value.split(',').map(a => a.trim()) })} />
                                </div>
                                <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">Save Health Profile</button>
                            </form>
                        </div>
                    } />

                    <Route path="prescriptions" element={
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">My Digital Prescriptions</h2>
                            <div className="space-y-4">
                                {myPrescriptions.length === 0 ? <p className="text-gray-500">No prescriptions found.</p> : myPrescriptions.map(script => (
                                    <div key={script._id} className="p-4 border rounded-xl bg-white flex flex-col md:flex-row justify-between md:items-center">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{script.medication}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{script.instructions}</p>
                                            <p className="text-xs text-blue-500 font-medium mt-2">Prescribed By Doctor ID: {script.doctorId} • Issued: {new Date(script.issuedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    } />

                    <Route path="reports" element={
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Medical Reports</h2>
                            
                            <div className="p-6 border rounded-xl bg-white/50">
                                <h3 className="font-medium mb-4">Upload New Report</h3>
                                <form onSubmit={handleUploadReport} className="flex gap-4 items-center">
                                    <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                    <button type="submit" disabled={!selectedFile || uploading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                                        {uploading ? 'Uploading...' : 'Upload'}
                                    </button>
                                </form>
                            </div>

                            <div className="space-y-4 mt-8">
                                <h3 className="font-medium">My Documents</h3>
                                {healthProfile.reports && healthProfile.reports.length > 0 ? (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {healthProfile.reports.map(report => (
                                            <div key={report._id} className="p-4 border rounded-xl bg-white flex justify-between items-center">
                                                <div className="overflow-hidden">
                                                    <p className="font-medium text-gray-800 truncate" title={report.originalName}>{report.originalName}</p>
                                                    <p className="text-xs text-gray-500">{new Date(report.uploadedAt).toLocaleDateString()}</p>
                                                </div>
                                                <a href={`http://localhost:3000${report.url}`} target="_blank" rel="noreferrer" className="flex-shrink-0 ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                                                    View
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No medical reports uploaded yet.</p>
                                )}
                            </div>
                        </div>
                    } />
                    
                    <Route path="ai" element={
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Brain className="w-8 h-8 text-indigo-600" />
                                <h2 className="text-2xl font-semibold">Context-Aware AI Diagnostics</h2>
                            </div>
                            <p className="text-gray-600">Enter your symptoms below. The AI will securely analyze your input alongside your saved Health Profile (Vitals & Allergies) to provide a detailed preliminary analysis.</p>

                            <form onSubmit={handleCheckSymptoms} className="space-y-4">
                                <textarea 
                                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                                    rows="4" 
                                    placeholder="Describe your symptoms in detail (e.g., I have had a severe headache behind my right eye for two days...)"
                                    value={symptoms}
                                    onChange={e => setSymptoms(e.target.value)}
                                    required
                                ></textarea>
                                <button type="submit" disabled={aiLoading} className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                                    {aiLoading ? 'Analyzing...' : 'Generate AI Diagnosis'}
                                </button>
                            </form>

                            {aiResponse && (
                                <div className="mt-8 p-6 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4">
                                    <div>
                                        <h3 className="font-bold text-indigo-900 mb-2">Detailed Analysis</h3>
                                        <div className="text-gray-700 whitespace-pre-wrap">{aiResponse.analysis}</div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-indigo-200">
                                        <h3 className="font-bold text-indigo-900 mb-2">Recommended Specialty</h3>
                                        <p className="text-lg font-medium text-indigo-700">{aiResponse.recommendation}</p>
                                    </div>
                                    <p className="text-xs text-indigo-400 font-medium italic mt-4">{aiResponse.disclaimer}</p>
                                </div>
                            )}
                        </div>
                    } />
                </Routes>
            </div>
        </div>
    );
}
