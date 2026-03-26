import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SearchDoctors() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const docRes = await axios.get('http://localhost:3000/api/doctors/list', { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setDoctors(docRes.data);
            } catch (err) {
                console.error("Failed to fetch doctors", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, [token]);

    const handleBookAppointment = (doctorId) => {
        navigate(`/patient/book/${doctorId}`);
    };

    if (loading) return <div className="text-center py-10">Loading specialists...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Search for a Doctor</h2>
            <div className="flex gap-4">
                <input type="text" placeholder="Specialty (e.g., Cardiologist)" className="flex-1 px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" />
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Search</button>
            </div>
            
            <div className="mt-8 grid md:grid-cols-2 gap-4">
                {doctors.length === 0 ? (
                    <p className="text-gray-500">No doctors found matching your criteria.</p>
                ) : (
                    doctors.map(doc => (
                        <div key={doc._id} className="p-4 border rounded-xl hover:shadow-md transition bg-white/50">
                            <h3 className="font-bold text-lg">{doc.name}</h3>
                            <p className="text-gray-500 text-sm mb-4">{doc.specialty} • Max Patients: {doc.maxPatients}</p>
                            <button 
                                onClick={() => handleBookAppointment(doc._id)}
                                className="w-full py-2 bg-teal-50 text-teal-700 font-medium rounded-lg hover:bg-teal-100 transition">
                                Book Appointment
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
