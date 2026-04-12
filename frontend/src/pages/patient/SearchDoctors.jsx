import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDoctorServiceUrl } from '../../config/api';
import { Search, Filter, Stethoscope } from 'lucide-react';

export default function SearchDoctors() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('All');

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const docRes = await axios.get(getDoctorServiceUrl('/list'), {
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

    const normalizeSpecialty = (specialty) => {
        if (!specialty || typeof specialty !== 'string') return 'General Doctor';
        const cleaned = specialty.trim().toLowerCase();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };

    const categories = useMemo(() => {
        const set = new Set(['All']);
        doctors.forEach((doc) => set.add(normalizeSpecialty(doc.specialty)));
        return Array.from(set);
    }, [doctors]);

    const filteredDoctors = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return doctors.filter((doc) => {
            const docName = (doc.name || '').toLowerCase();
            const docSpecialty = normalizeSpecialty(doc.specialty);
            const specialtyMatch = selectedSpecialty === 'All' || docSpecialty === selectedSpecialty;
            const searchMatch =
                term.length === 0 ||
                docName.includes(term) ||
                docSpecialty.toLowerCase().includes(term);

            return specialtyMatch && searchMatch;
        });
    }, [doctors, searchTerm, selectedSpecialty]);

    if (loading) return <div className="text-center py-10">Loading specialists...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-[40px] leading-tight font-bold text-slate-800">Find a Doctor</h2>

            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by doctor name or specialty..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                        />
                    </div>
                    <div className="relative lg:w-[220px]">
                        <Filter className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            value={selectedSpecialty}
                            onChange={(e) => setSelectedSpecialty(e.target.value)}
                            className="w-full appearance-none pl-10 pr-9 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-slate-700"
                        >
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                    <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedSpecialty(category)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                            selectedSpecialty === category
                                ? 'bg-blue-600 text-white shadow'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                        }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-5">
                {filteredDoctors.length === 0 ? (
                    <p className="text-gray-500">No doctors found matching your selected filters.</p>
                ) : (
                    filteredDoctors.map((doc) => (
                        <div key={doc._id} className="p-5 border border-slate-200 rounded-2xl hover:shadow-md transition bg-white">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                    <Stethoscope className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-2xl text-slate-800 leading-none">Dr. {doc.name}</h3>
                                    <p className="text-cyan-600 font-semibold mt-2">{normalizeSpecialty(doc.specialty)}</p>
                                    <p className="text-slate-400 text-sm mt-1">Max {doc.maxPatients || 0} patients</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleBookAppointment(doc._id)}
                                className="w-full py-3 bg-[#1f335d] text-white font-semibold rounded-xl hover:bg-[#18294a] transition"
                            >
                                Book Appointment
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
