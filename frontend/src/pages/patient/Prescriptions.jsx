import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getDoctorServiceUrl } from '../../config/api';

export default function Prescriptions() {
    const { user, token } = useAuth();
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrescriptions = async () => {
            if (!user?.id) return;
            try {
                const res = await axios.get(getDoctorServiceUrl(`/prescriptions/patient/${user.id}`), {
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setPrescriptions(res.data);
            } catch (err) {
                console.error("Failed to fetch prescriptions", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPrescriptions();
    }, [user, token]);

    if (loading) return <div className="text-center py-10 text-gray-400">Loading prescriptions...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">My Digital Prescriptions</h2>
            <div className="space-y-4">
                {prescriptions.length === 0 ? (
                    <p className="text-gray-500">No prescriptions found.</p>
                ) : (
                    prescriptions.map(script => (
                        <div key={script._id} className="p-4 border rounded-xl bg-white flex flex-col md:flex-row justify-between md:items-center shadow-sm">
                            <div>
                                <h4 className="font-bold text-gray-800">{script.medication}</h4>
                                <p className="text-sm text-gray-600 mt-1">{script.instructions}</p>
                                <p className="text-xs text-blue-500 font-medium mt-2">Prescribed By Doctor • Issued: {new Date(script.issuedAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
