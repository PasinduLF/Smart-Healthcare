import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getPaymentServiceUrl } from '../../config/api';
import { DollarSign, Download, Filter } from 'lucide-react';

export default function AdminPayments() {
    const { token } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                if (!token) return;
                const res = await axios.get(getPaymentServiceUrl('/transactions'), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTransactions(res.data);
            } catch (err) {
                console.error("Error fetching transactions", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, [token]);

    if (loading) return <div className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing ledger...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-emerald-500" />
                        Platform Revenue Ledger
                    </h2>
                    <p className="text-slate-500 font-medium text-sm">Real-time settlement history and platform fees.</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50"><Filter className="w-4 h-4 text-slate-400" /></button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-navy-600 text-white text-xs font-black uppercase rounded-xl hover:bg-navy-700 shadow-xl shadow-navy-200"><Download className="w-4 h-4" /> Export CSV</button>
                </div>
            </div>

            <div className="glass-premium p-1 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Description</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Timestamp</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Reference</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Amount</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-10 text-center text-slate-300 font-bold italic">No financial records found.</td>
                            </tr>
                        ) : (
                            transactions.map(tx => (
                                <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-6">
                                        <p className="font-bold text-slate-800">{tx.description}</p>
                                    </td>
                                    <td className="px-8 py-6 text-xs text-slate-500 font-medium">
                                        {new Date(tx.date).toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-slate-100 rounded text-[10px] font-black text-slate-400">#{tx._id.slice(-8).toUpperCase()}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="font-black text-slate-900 tracking-tighter text-lg leading-none italic">${(tx.amount/100).toFixed(2)}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{tx.currency}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            tx.status === 'succeeded' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-coral-50 text-coral-600 border border-coral-100'
                                        }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
