import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getNotificationServiceUrl } from '../../config/api';
import { Mail, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Search, ChevronRight } from 'lucide-react';

export default function EmailLogs() {
    const { token } = useAuth();
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({ sent: 0, failed: 0, skipped: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const statusQuery = filter ? `?status=${filter}` : '';
            
            const [logsRes, statsRes] = await Promise.all([
                axios.get(getNotificationServiceUrl(`/email-logs${statusQuery}`), config),
                axios.get(getNotificationServiceUrl('/email-logs/stats'), config)
            ]);
            
            // Ensure logs is always an array
            setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
            setStats(statsRes.data);
        } catch (err) {
            console.error("Error fetching email logs", err);
            setLogs([]); // fallback to empty array on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filter, token]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'sent': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'skipped': return <AlertCircle className="w-5 h-5 text-amber-500" />;
            default: return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'sent': return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">Sent Successfully</span>;
            case 'failed': return <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-100">Delivery Failed</span>;
            case 'skipped': return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-100">Skipped (Invalid)</span>;
            default: return <span className="px-2.5 py-1 bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200">{status}</span>;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Mail className="w-7 h-7 text-brand-500" /> System Email Logs
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Track and monitor outbound email delivery status to patients and doctors.</p>
                </div>
                <button 
                    onClick={fetchLogs} 
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
                    Refresh Logs
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Processed</p>
                    <p className="text-3xl font-black text-slate-800">{stats.total}</p>
                </div>
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70 mb-1">Delivered</p>
                    <p className="text-3xl font-black text-emerald-600">{stats.sent}</p>
                </div>
                <div className="p-5 bg-red-50 rounded-2xl border border-red-100 flex flex-col justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600/70 mb-1">Failed to Send</p>
                    <p className="text-3xl font-black text-red-600">{stats.failed}</p>
                </div>
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70 mb-1">Skipped (Invalid Email)</p>
                    <p className="text-3xl font-black text-amber-600">{stats.skipped}</p>
                </div>
            </div>

            {/* Filters & Log List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">Recent Deliveries</h2>
                    
                    <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                        <button 
                            onClick={() => setFilter('')} 
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filter === '' ? 'bg-white text-navy-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            All Logs
                        </button>
                        <button 
                            onClick={() => setFilter('sent')} 
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filter === 'sent' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Sent
                        </button>
                        <button 
                            onClick={() => setFilter('failed')} 
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filter === 'failed' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Failed
                        </button>
                    </div>
                </div>

                {loading && logs.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                        Fetching delivery records...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-100 flex-shrink-0">
                            <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-700 text-lg mb-1">No Logs Found</h3>
                        <p className="text-slate-400 text-sm">There are no email delivery records matching your criteria.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {logs.map((log) => (
                            <div key={log._id} className="p-5 md:p-6 flex flex-col lg:flex-row gap-5 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="mt-1 flex-shrink-0">
                                        {getStatusIcon(log.status)}
                                    </div>
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h4 className="font-bold text-slate-800 text-base truncate pr-2">{log.subject}</h4>
                                            {getStatusBadge(log.status)}
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium break-all">
                                            To: <span className="font-bold text-slate-700">{log.to}</span>
                                        </p>
                                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                                            <span>{new Date(log.sentAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="uppercase tracking-widest">{log.type.replace(/_/g, ' ')}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {log.status === 'failed' || log.status === 'skipped' ? (
                                    <div className="lg:w-1/3 p-3 bg-red-50/50 border border-red-100 rounded-xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Error Details</p>
                                        <p className="text-red-700 text-xs font-bold line-clamp-2" title={log.error}>{log.error}</p>
                                        {log.status === 'skipped' && <p className="text-xs text-red-500 mt-1">This email format is invalid. System blocked sending to prevent bounce.</p>}
                                    </div>
                                ) : (
                                    <div className="lg:w-1/3 flex items-center justify-end lg:justify-start gap-2">
                                        <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 truncate w-full lg:w-auto text-center font-mono">
                                            ID: {log.messageId ? log.messageId.split('@')[0].slice(1, -1) || log.messageId.slice(0, 15) : 'N/A'}...
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
