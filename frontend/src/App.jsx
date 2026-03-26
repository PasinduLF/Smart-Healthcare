import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';

function AppContent() {
    const location = useLocation();
    
    // Check if current path is a dashboard to hide global nav/footer
    const isDashboard = location.pathname.startsWith('/patient') || 
                        location.pathname.startsWith('/doctor') || 
                        location.pathname.startsWith('/admin');

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {!isDashboard && <Navbar />}
            
            <main className={`flex-grow ${!isDashboard ? 'pt-20' : ''}`}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    {/* Role-based Dashboards */}
                    <Route path="/patient/*" element={<PatientDashboard />} />
                    <Route path="/doctor/*" element={<DoctorDashboard />} />
                    <Route path="/admin/*" element={<AdminDashboard />} />
                </Routes>
            </main>

            {!isDashboard && <Footer />}
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
