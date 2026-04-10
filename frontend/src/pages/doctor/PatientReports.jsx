import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { FileText, Filter } from 'lucide-react';

const REPORT_CATEGORIES = [
    'Blood Test',
    'X-Ray',
    'MRI / CT Scan',
    'Prescription',
    'Discharge Summary',
    'Lab Report',
    'Vaccination Record',
    'Other'
];

export default function PatientReports() {
    const { user, token } = useAuth();
    const [reports, setReports] = useState([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            if (!user?.id) return;
            try {
                const res = await axios.get(`http://localhost:3000/api/patients/reports/doctor/${user.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setReports(res.data);
            } catch (err) {
                console.error("Failed to fetch patient reports", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [user, token]);

    const filteredReports = filterCategory
        ? reports.filter(r => r.category === filterCategory)
        : reports;

    if (loading) return <div className="text-center py-10 text-gray-400">Loading patient reports...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-600" />
                    Patient-Uploaded Reports
                </h2>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                        <option value="">All Categories</option>
                        {REPORT_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {filteredReports.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <p className="text-slate-400">No patient reports assigned to you yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReports.map(report => (
                        <div key={report._id} className="p-5 border rounded-2xl bg-white/50 flex flex-col md:flex-row justify-between md:items-center shadow-sm hover:shadow-md transition-all">
                            <div className="mb-3 md:mb-0">
                                <h4 className="font-bold text-slate-800">{report.originalName}</h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {report.category && (
                                        <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full text-[10px] font-bold border border-brand-100">{report.category}</span>
                                    )}
                                    <span className="text-xs text-slate-400">Patient: <span className="font-medium text-slate-600">{report.patientName}</span></span>
                                    <span className="text-xs text-slate-400">{new Date(report.uploadedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <a
                                href={`http://localhost:3000${report.url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-5 py-2.5 bg-brand-50 text-brand-700 rounded-xl text-sm font-bold hover:bg-brand-100 border border-brand-100 transition"
                            >
                                View Report
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
