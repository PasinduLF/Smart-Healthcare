import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { FileText } from 'lucide-react';

export default function MedicalReports() {
    const { user, token } = useAuth();
    const [reports, setReports] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            if (!user?.id) return;
            try {
                const res = await axios.get(`http://localhost:3000/api/patients/profile/${user.id}`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setReports(res.data.reports || []);
            } catch (err) {
                console.error("Failed to fetch reports", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [user, token]);

    const handleUploadReport = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;
        
        const formData = new FormData();
        formData.append('report', selectedFile);

        setUploading(true);
        try {
            const res = await axios.post(`http://localhost:3000/api/patients/upload-report/${user.id}`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}` 
                }
            });
            alert("Report uploaded successfully!");
            setReports([...reports, res.data.report]);
            setSelectedFile(null);
            e.target.reset();
        } catch (err) {
            console.error(err);
            alert("Failed to upload report");
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading documents...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Medical Reports</h2>
            
            <div className="p-6 border rounded-xl bg-white/50">
                <h3 className="font-medium mb-4">Upload New Report</h3>
                <form onSubmit={handleUploadReport} className="flex gap-4 items-center">
                    <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    <button type="submit" disabled={!selectedFile || uploading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                        {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                </form>
            </div>

            <div className="space-y-4 mt-8">
                <h3 className="font-medium">My Documents</h3>
                {reports.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                        {reports.map(report => (
                            <div key={report._id} className="p-4 border rounded-xl bg-white flex justify-between items-center shadow-sm">
                                <div className="overflow-hidden">
                                    <p className="font-medium text-gray-800 truncate" title={report.originalName}>{report.originalName}</p>
                                    <p className="text-xs text-gray-500">{new Date(report.uploadedAt).toLocaleDateString()}</p>
                                </div>
                                <a href={`http://localhost:3000${report.url}`} target="_blank" rel="noreferrer" className="flex-shrink-0 ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                                    View
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No medical reports uploaded yet.</p>
                )}
            </div>
        </div>
    );
}
