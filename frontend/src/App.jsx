import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';

// Patient Pages
import SearchDoctors from './pages/patient/SearchDoctors';
import AIAnalyzer from './pages/patient/AIAnalyzer';
import HealthProfile from './pages/patient/HealthProfile';
import MedicalReports from './pages/patient/MedicalReports';
import Profile from './pages/patient/Profile';
import Prescriptions from './pages/patient/Prescriptions';
import Telemedicine from './pages/patient/Telemedicine';
import BookAppointment from './pages/BookAppointment';
import MyAppointments from './pages/MyAppointments';
import PatientPaymentService from './pages/PatientPaymentService';

// Doctor Pages
import DoctorSchedule from './pages/doctor/DoctorSchedule';
import DoctorAppointments from './pages/doctor/Appointments';
import DoctorPrescriptions from './pages/doctor/Prescriptions';
import DoctorTelemedicine from './pages/doctor/Telemedicine';

// Admin Pages
import UsersOverview from './pages/admin/UsersOverview';
import AdminPayments from './pages/admin/Payments';
import AdminSettings from './pages/admin/Settings';

import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useState } from 'react';

function AppContent() {
    const { user } = useAuth();
    const [activeCall, setActiveCall] = useState(null);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            
            <main className="flex-grow pt-20">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    {/* Patient Routes */}
                    <Route path="/patient" element={<div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500"><Outlet /></div>}>
                        <Route index element={<Navigate to="search" replace />} />
                        <Route path="search" element={<SearchDoctors />} />
                        <Route path="book/:doctorId" element={<BookAppointment />} />
                        <Route path="payment" element={<PatientPaymentService />} />
                        <Route path="appointments" element={<MyAppointments setActiveCall={setActiveCall} />} />
                        <Route path="telemedicine" element={<Telemedicine activeCall={activeCall} setActiveCall={setActiveCall} />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="health" element={<HealthProfile />} />
                        <Route path="prescriptions" element={<Prescriptions />} />
                        <Route path="reports" element={<MedicalReports />} />
                        <Route path="ai" element={<AIAnalyzer />} />
                    </Route>

                    {/* Doctor Routes */}
                    <Route path="/doctor" element={<div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500"><Outlet /></div>}>
                        <Route index element={<Navigate to="appointments" replace />} />
                        <Route path="schedule" element={<DoctorSchedule />} />
                        <Route path="appointments" element={<DoctorAppointments setActiveCall={setActiveCall} />} />
                        <Route path="telemedicine" element={<DoctorTelemedicine activeCall={activeCall} setActiveCall={setActiveCall} />} />
                        <Route path="prescriptions" element={<DoctorPrescriptions />} />
                    </Route>

                    {/* Admin Routes */}
                    <Route path="/admin" element={<div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500"><Outlet /></div>}>
                        <Route index element={<Navigate to="users" replace />} />
                        <Route path="users" element={<UsersOverview />} />
                        <Route path="payments" element={<AdminPayments />} />
                        <Route path="settings" element={<AdminSettings />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            <Footer />
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AppContent />
            </Router>
        </AuthProvider>
    );
}

export default App;
