import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, UserCheck, Star, Filter } from 'lucide-react';

export default function SearchDoctors() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('');

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

    const specialties = useMemo(() => {
        const set = new Set(doctors.map(d => d.specialty).filter(Boolean));
        return Array.from(set).sort();
    }, [doctors]);

    const filteredDoctors = useMemo(() => {
        return doctors.filter(doc => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = !term || 
                (doc.name && doc.name.toLowerCase().includes(term)) || 
                (doc.specialty && doc.specialty.toLowerCase().includes(term));
            const matchesSpecialty = !selectedSpecialty || doc.specialty === selectedSpecialty;
            return matchesSearch && matchesSpecialty;
        });
    }, [doctors, searchTerm, selectedSpecialty]);

    const handleBookAppointment = (doctorId) => {
        navigate(`/patient/book/${doctorId}`);
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading specialists...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Find a Doctor</h2>

            {/* Search & Filter Controls */}
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or specialty..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-xl outline-none transition font-medium text-slate-700 text-sm"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={selectedSpecialty}
                            onChange={(e) => setSelectedSpecialty(e.target.value)}
                            className="pl-11 pr-8 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-xl outline-none transition font-medium text-slate-700 text-sm appearance-none cursor-pointer min-w-[200px]"
                        >
                            <option value="">All Specialties</option>
                            {specialties.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {(searchTerm || selectedSpecialty) && (
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
                        </p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedSpecialty(''); }}
                            className="text-xs font-bold text-brand-600 hover:underline"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Specialty Quick Chips */}
            {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {specialties.map(s => (
                        <button
                            key={s}
                            onClick={() => setSelectedSpecialty(selectedSpecialty === s ? '' : s)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition border ${
                                selectedSpecialty === s
                                    ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-100'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Doctor Cards */}
            <div className="grid md:grid-cols-2 gap-4">
                {filteredDoctors.length === 0 ? (
                    <div className="col-span-2 text-center py-16">
                        <p className="text-gray-400 text-lg font-medium">No doctors found matching your criteria.</p>
                        <p className="text-gray-300 text-sm mt-1">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    filteredDoctors.map(doc => (
                        <div key={doc._id} className="p-5 border border-slate-100 rounded-2xl hover:shadow-lg transition bg-white group">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                                    <UserCheck className="w-6 h-6 text-brand-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-slate-800">Dr. {doc.name}</h3>
                                    <p className="text-brand-600 font-semibold text-sm">{doc.specialty || 'General'}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 font-medium">
                                        {doc.experience > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Star className="w-3 h-3" /> {doc.experience} yrs experience
                                            </span>
                                        )}
                                        <span>Max {doc.maxPatients} patients</span>
                                        {doc.consultationFee > 0 && (
                                            <span>Fee: Rs. {doc.consultationFee}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleBookAppointment(doc._id)}
                                className="w-full mt-4 py-2.5 bg-navy-600 text-white font-bold text-sm rounded-xl hover:bg-navy-700 transition shadow-lg shadow-slate-100 group-hover:shadow-slate-200">
                                Book Appointment
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
