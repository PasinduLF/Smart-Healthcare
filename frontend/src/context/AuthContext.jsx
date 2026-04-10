import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(false);

    // Sync token + user to localStorage whenever they change
    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    const login = async (email, password, role) => {
        try {
            const endpoint = role === 'doctor' ? '/api/doctors/login' : '/api/patients/login';
            const response = await axios.post(`http://localhost:3000${endpoint}`, { email, password });
            
            const newToken = response.data.token;
            const loggedInUser = role === 'doctor' ? response.data.doctor : response.data.patient;
            const userData = { ...loggedInUser, role };

            setToken(newToken);
            setUser(userData);
            
            return { success: true, role, verified: loggedInUser.verified };
        } catch (error) {
            console.error('Login error:', error.response?.data?.error || error.message);
            return { success: false, error: error.response?.data?.error || 'Login failed' };
        }
    };

    const register = async (userData, role) => {
        try {
            const endpoint = role === 'doctor' ? '/api/doctors/register' : '/api/patients/register';
            const isFormData = userData instanceof FormData;
            const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
            const response = await axios.post(`http://localhost:3000${endpoint}`, userData, config);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Registration failed' };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
