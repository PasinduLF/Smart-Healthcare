import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
    FileText, Trash2, Filter, Upload, Search, Download, Eye, X,
    ChevronUp, ChevronDown, LayoutGrid, List, FolderOpen, Calendar,
    Stethoscope, Image, FileSpreadsheet, File, Syringe, ClipboardList
} from 'lucide-react';

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

const CATEGORY_ICONS = {
    'Blood Test': FileSpreadsheet,
    'X-Ray': Image,
    'MRI / CT Scan': Image,
    'Prescription': ClipboardList,
    'Discharge Summary': FileText,
    'Lab Report': FileSpreadsheet,
    'Vaccination Record': Syringe,
    'Other': File
};

const CATEGORY_COLORS = {
    'Blood Test': 'bg-red-50 text-red-600 border-red-200',
    'X-Ray': 'bg-blue-50 text-blue-600 border-blue-200',
    'MRI / CT Scan': 'bg-purple-50 text-purple-600 border-purple-200',
    'Prescription': 'bg-brand-50 text-brand-600 border-brand-200',
    'Discharge Summary': 'bg-amber-50 text-amber-600 border-amber-200',
    'Lab Report': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Vaccination Record': 'bg-indigo-50 text-indigo-600 border-indigo-200',
    'Other': 'bg-gray-50 text-gray-600 border-gray-200'
};

export default function MedicalReports() {
    const { user, token } = useAuth();
    const [reports, setReports] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [category, setCategory] = useState('');
    const [doctorId, setDoctorId] = useState('');
    const [description, setDescription] = useState('');
    const [doctors, setDoctors] = useState([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [viewMode, setViewMode] = useState('grid');
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [previewReport, setPreviewReport] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;
            try {
                const [reportRes, doctorRes] = await Promise.all([
                    axios.get(`http://localhost:3000/api/patients/profile/${user.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get('http://localhost:3000/api/doctors/list', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                setReports(reportRes.data.reports || []);
                setDoctors(doctorRes.data || []);
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, token]);

    const handleUploadReport = async (e) => {
        e.preventDefault();
        if (!selectedFile || !category) return alert('Please select a file and category');

        const formData = new FormData();
        formData.append('report', selectedFile);
        formData.append('category', category);
        if (doctorId) formData.append('doctorId', doctorId);

        setUploading(true);
        try {
            const res = await axios.post(`http://localhost:3000/api/patients/upload-report/${user.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            setReports([...reports, res.data.report]);
            setSelectedFile(null);
            setCategory('');
            setDoctorId('');
            setDescription('');
            setShowUploadForm(false);
            e.target.reset();
        } catch (err) {
            console.error(err);
            alert("Failed to upload report");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!window.confirm('Delete this report permanently?')) return;
        try {
            await axios.delete(`http://localhost:3000/api/patients/report/${user.id}/${reportId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(reports.filter(r => r._id !== reportId));
            if (previewReport?._id === reportId) setPreviewReport(null);
        } catch (err) {
            console.error(err);
            alert("Failed to delete report");
        }
    };

    const handleDownload = (report) => {
        const link = document.createElement('a');
        link.href = `http://localhost:3000${report.url}`;
        link.download = report.originalName || 'report';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
            setShowUploadForm(true);
        }
    };

    const filteredReports = useMemo(() => {
        let result = [...reports];
        if (filterCategory) result = result.filter(r => r.category === filterCategory);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                (r.originalName && r.originalName.toLowerCase().includes(q)) ||
                (r.category && r.category.toLowerCase().includes(q))
            );
        }
        result.sort((a, b) => {
            const dateA = new Date(a.uploadedAt);
            const dateB = new Date(b.uploadedAt);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
        return result;
    }, [reports, filterCategory, searchQuery, sortOrder]);

    const categoryStats = useMemo(() => {
        const stats = {};
        reports.forEach(r => {
            stats[r.category] = (stats[r.category] || 0) + 1;
        });
        return stats;
    }, [reports]);

    const getFileExtension = (name) => {
        if (!name) return '';
        return name.split('.').pop().toUpperCase();
    };

    const isImageFile = (name) => {
        if (!name) return false;
        const ext = name.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
    };

    const getDoctorName = (docId) => {
        const doc = doctors.find(d => d._id === docId);
        return doc ? `Dr. ${doc.name}` : null;
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-600 border-t-transparent"></div>
            <span className="ml-3 text-gray-500">Loading your reports...</span>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-navy-800">Medical Reports</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage and organize your medical documents</p>
                </div>
                <button
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-navy-600 text-white rounded-xl hover:bg-navy-700 transition-all shadow-lg shadow-navy-600/20 font-medium"
                >
                    <Upload className="w-4 h-4" />
                    Upload Report
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-navy-50 rounded-lg">
                            <FolderOpen className="w-5 h-5 text-navy-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-navy-800">{reports.length}</p>
                            <p className="text-xs text-gray-500">Total Reports</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-50 rounded-lg">
                            <Filter className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-navy-800">{Object.keys(categoryStats).length}</p>
                            <p className="text-xs text-gray-500">Categories</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <Stethoscope className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-navy-800">{reports.filter(r => r.doctorId).length}</p>
                            <p className="text-xs text-gray-500">Doctor Assigned</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-navy-800">
                                {reports.filter(r => {
                                    const d = new Date(r.uploadedAt);
                                    const now = new Date();
                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                }).length}
                            </p>
                            <p className="text-xs text-gray-500">This Month</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Form (collapsible) */}
            {showUploadForm && (
                <div className="p-6 border border-brand-200 rounded-2xl bg-gradient-to-br from-white to-brand-50/30 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-semibold text-navy-800 flex items-center gap-2">
                            <Upload className="w-4 h-4 text-brand-500" /> Upload New Report
                        </h3>
                        <button onClick={() => setShowUploadForm(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                    <form onSubmit={handleUploadReport} className="space-y-4">
                        {/* Drag & Drop Zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                                dragOver ? 'border-brand-400 bg-brand-50' : selectedFile ? 'border-brand-300 bg-brand-50/50' : 'border-gray-300 hover:border-brand-300 hover:bg-gray-50'
                            }`}
                            onClick={() => document.getElementById('fileInput').click()}
                        >
                            <input
                                id="fileInput"
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                className="hidden"
                            />
                            {selectedFile ? (
                                <div className="flex items-center justify-center gap-3">
                                    <FileText className="w-8 h-8 text-brand-500" />
                                    <div className="text-left">
                                        <p className="font-medium text-navy-700">{selectedFile.name}</p>
                                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                        className="ml-3 p-1 hover:bg-gray-200 rounded-full transition">
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">Drag & drop your file here, or <span className="text-brand-600 font-medium">browse</span></p>
                                    <p className="text-xs text-gray-400 mt-1">PDF, Images, Documents up to 10MB</p>
                                </>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Category *</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {(Array.isArray(REPORT_CATEGORIES) ? REPORT_CATEGORIES : []).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Assign to Doctor</label>
                                <select
                                    value={doctorId}
                                    onChange={(e) => setDoctorId(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white"
                                >
                                    <option value="">No specific doctor</option>
                                    {(Array.isArray(doctors) ? doctors : []).map(doc => (
                                        <option key={doc._id} value={doc._id}>Dr. {doc.name} — {doc.specialty}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Fasting blood sugar test results"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setShowUploadForm(false)}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition">
                                Cancel
                            </button>
                            <button type="submit" disabled={!selectedFile || !category || uploading}
                                className="px-6 py-2.5 bg-navy-600 text-white rounded-xl hover:bg-navy-700 transition disabled:opacity-50 text-sm font-medium flex items-center gap-2 shadow-lg shadow-navy-600/20">
                                {uploading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Uploading...
                                    </>
                                ) : (
                                    <><Upload className="w-4 h-4" /> Upload Report</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search + Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search reports by name or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    >
                        <option value="">All Categories</option>
                        {(Array.isArray(REPORT_CATEGORIES) ? REPORT_CATEGORIES : []).map(cat => (
                            <option key={cat} value={cat}>{cat} {categoryStats[cat] ? `(${categoryStats[cat]})` : ''}</option>
                        ))}
                    </select>
                    <button onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
                        className="flex items-center gap-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition bg-white"
                        title={sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}>
                        {sortOrder === 'newest' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        <span className="hidden sm:inline">Date</span>
                    </button>
                    <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                        <button onClick={() => setViewMode('grid')}
                            className={`p-2.5 transition ${viewMode === 'grid' ? 'bg-navy-50 text-navy-600' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('list')}
                            className={`p-2.5 transition ${viewMode === 'list' ? 'bg-navy-50 text-navy-600' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Reports */}
            {filteredReports.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(Array.isArray(filteredReports) ? filteredReports : []).map(report => {
                            const CatIcon = CATEGORY_ICONS[report.category] || File;
                            const catColor = CATEGORY_COLORS[report.category] || CATEGORY_COLORS['Other'];
                            const docName = getDoctorName(report.doctorId);
                            return (
                                <div key={report._id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                    {/* Card Header */}
                                    <div className="p-4 pb-3">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2.5 rounded-xl border ${catColor} flex-shrink-0`}>
                                                <CatIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-navy-800 truncate text-sm" title={report.originalName}>
                                                    {report.originalName}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catColor}`}>
                                                        {report.category}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {getFileExtension(report.originalName)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Card Meta */}
                                    <div className="px-4 pb-2 space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(report.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </div>
                                        {docName && (
                                            <div className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
                                                <Stethoscope className="w-3 h-3" />
                                                {docName}
                                            </div>
                                        )}
                                    </div>
                                    {/* Card Actions */}
                                    <div className="flex border-t border-gray-50 divide-x divide-gray-50">
                                        <button onClick={() => setPreviewReport(report)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-600 hover:bg-navy-50 hover:text-navy-600 transition font-medium">
                                            <Eye className="w-3.5 h-3.5" /> View
                                        </button>
                                        <button onClick={() => handleDownload(report)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition font-medium">
                                            <Download className="w-3.5 h-3.5" /> Download
                                        </button>
                                        <button onClick={() => handleDeleteReport(report._id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-600 hover:bg-coral-50 hover:text-coral-600 transition font-medium">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* List View */
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="text-left px-5 py-3 font-semibold">File</th>
                                    <th className="text-left px-5 py-3 font-semibold">Category</th>
                                    <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Doctor</th>
                                    <th className="text-left px-5 py-3 font-semibold">Date</th>
                                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(Array.isArray(filteredReports) ? filteredReports : []).map(report => {
                                    const CatIcon = CATEGORY_ICONS[report.category] || File;
                                    const catColor = CATEGORY_COLORS[report.category] || CATEGORY_COLORS['Other'];
                                    const docName = getDoctorName(report.doctorId);
                                    return (
                                        <tr key={report._id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-lg border ${catColor}`}>
                                                        <CatIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-navy-800 truncate max-w-[200px]" title={report.originalName}>
                                                            {report.originalName}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">{getFileExtension(report.originalName)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catColor}`}>
                                                    {report.category}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 hidden md:table-cell">
                                                <span className="text-xs text-gray-600">{docName || '—'}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-xs text-gray-500">
                                                    {new Date(report.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setPreviewReport(report)}
                                                        className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition" title="Preview">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDownload(report)}
                                                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition" title="Download">
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteReport(report._id)}
                                                        className="p-1.5 text-gray-400 hover:text-coral-600 hover:bg-coral-50 rounded-lg transition" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No reports found</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {searchQuery || filterCategory ? 'Try adjusting your filters' : 'Upload your first medical report to get started'}
                    </p>
                    {!showUploadForm && !searchQuery && !filterCategory && (
                        <button onClick={() => setShowUploadForm(true)}
                            className="mt-4 px-5 py-2 bg-navy-600 text-white rounded-xl hover:bg-navy-700 transition text-sm font-medium inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Upload Report
                        </button>
                    )}
                </div>
            )}

            {/* Preview Modal */}
            {previewReport && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewReport(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-2 rounded-xl border ${CATEGORY_COLORS[previewReport.category] || CATEGORY_COLORS['Other']}`}>
                                    {(() => { const Icon = CATEGORY_ICONS[previewReport.category] || File; return <Icon className="w-5 h-5" />; })()}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-navy-800 truncate">{previewReport.originalName}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{previewReport.category}</span>
                                        <span>·</span>
                                        <span>{new Date(previewReport.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <button onClick={() => handleDownload(previewReport)}
                                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition" title="Download">
                                    <Download className="w-5 h-5" />
                                </button>
                                <button onClick={() => setPreviewReport(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {/* Modal Body */}
                        <div className="flex-1 overflow-auto p-5">
                            {isImageFile(previewReport.originalName) ? (
                                <img
                                    src={`http://localhost:3000${previewReport.url}`}
                                    alt={previewReport.originalName}
                                    className="max-w-full mx-auto rounded-lg"
                                />
                            ) : previewReport.originalName?.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={`http://localhost:3000${previewReport.url}`}
                                    className="w-full h-[60vh] rounded-lg border"
                                    title={previewReport.originalName}
                                />
                            ) : (
                                <div className="text-center py-16">
                                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">Preview not available for this file type</p>
                                    <button onClick={() => handleDownload(previewReport)}
                                        className="mt-4 px-5 py-2 bg-navy-600 text-white rounded-xl hover:bg-navy-700 transition text-sm font-medium inline-flex items-center gap-2">
                                        <Download className="w-4 h-4" /> Download to view
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* Modal Footer */}
                        <div className="px-5 py-3 border-t bg-gray-50/50 rounded-b-2xl flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-4">
                                <span>{getFileExtension(previewReport.originalName)} File</span>
                                {getDoctorName(previewReport.doctorId) && (
                                    <span className="flex items-center gap-1 text-brand-600 font-medium">
                                        <Stethoscope className="w-3 h-3" />
                                        {getDoctorName(previewReport.doctorId)}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => { handleDeleteReport(previewReport._id); }}
                                className="text-coral-500 hover:text-coral-700 font-medium transition">
                                Delete Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
