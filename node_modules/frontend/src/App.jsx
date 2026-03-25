import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Activity, LogOut } from 'lucide-react';

import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';

function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            <div className="p-8 glass-card max-w-2xl transform transition-all hover:scale-105 duration-300">
                <Activity className="w-20 h-20 text-blue-600 mx-auto mb-6" />
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400 mb-4">
                    Smart Healthcare Platform
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    Your health, our priority. Book appointments, consult online, and check your symptoms with AI.
                </p>
                <div className="flex justify-center gap-4">
                    <Link to="/login" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition shadow-lg hover:shadow-blue-500/30">
                        Login
                    </Link>
                    <Link to="/register" className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-full border border-blue-200 hover:border-blue-600 transition shadow-lg hover:shadow-blue-200/50">
                        Register
                    </Link>
                </div>
            </div>
        </div>
    );
}

import { AuthProvider } from './context/AuthContext';

function App() {
    return (
        <AuthProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 pt-16">
                    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center z-50">
                        <Link to="/" className="flex items-center gap-2 group">
                            <Activity className="w-8 h-8 text-blue-600 group-hover:scale-110 transition" />
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                                SmartHealth
                            </span>
                        </Link>
                        <div className="flex gap-4">
                            <Link to="/login" className="text-gray-600 hover:text-blue-600 font-medium transition">Login</Link>
                        </div>
                    </nav>

                    <main className="container mx-auto px-4">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/patient/*" element={<PatientDashboard />} />
                            <Route path="/doctor/*" element={<DoctorDashboard />} />
                            <Route path="/admin/*" element={<AdminDashboard />} />
                        </Routes>
                    </main>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
