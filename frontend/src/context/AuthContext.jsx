import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            // Decode basic info from token if needed, or rely on state for now
            // We'll set the initial user from login response or fetch profile here if we stored ID
            // For now, if there's a token, we just assume logged in. Full real-world would verify.
        } else {
            localStorage.removeItem('token');
            setUser(null);
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password, role) => {
        try {
            // Patient by default, or doctor based on role passed from login form
            const endpoint = role === 'doctor' ? '/api/doctors/login' : '/api/patients/login';
            const response = await axios.post(`http://localhost:3000${endpoint}`, { email, password });
            
            setToken(response.data.token);
            const loggedInUser = role === 'doctor' ? response.data.doctor : response.data.patient;
            setUser({ ...loggedInUser, role }); // Explicitly store role
            
            return { success: true, role };
        } catch (error) {
            console.error('Login error:', error.response?.data?.error || error.message);
            return { success: false, error: error.response?.data?.error || 'Login failed' };
        }
    };

    const register = async (userData, role) => {
        try {
            const endpoint = role === 'doctor' ? '/api/doctors/register' : '/api/patients/register';
            const response = await axios.post(`http://localhost:3000${endpoint}`, userData);
            return { success: true }; // Registration doesn't auto-login currently
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Registration failed' };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
