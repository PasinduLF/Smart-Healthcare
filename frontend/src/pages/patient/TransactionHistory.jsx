import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowLeft, ReceiptText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPaymentServiceUrl } from '../../config/api';

export default function TransactionHistory() {
    const { user, token } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const formatAmount = (tx) => {
        const amount = Number(tx?.amount) || 0;
        const currency = String(tx?.currency || 'LKR').toUpperCase();

        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
                minimumFractionDigits: 2
            }).format(amount / 100);
        } catch {
            return `${currency} ${(amount / 100).toFixed(2)}`;
        }
    };

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user?.id || !token) {
                setTransactions([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const res = await axios.get(getPaymentServiceUrl(`/transactions/patient/${user.id}`), {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setTransactions(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Failed to fetch patient transaction history', err);
                setError('Unable to load transaction history right now.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user, token]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <ReceiptText className="w-6 h-6 text-indigo-600" />
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Transaction History</h2>
                        <p className="text-sm text-slate-500">All your previous appointment payment transactions.</p>
                    </div>
                </div>

                <Link
                    to="/patient/profile"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Profile
                </Link>
            </div>

            <div className="glass-premium p-6 md:p-8 rounded-3xl border border-slate-100">
                {loading ? (
                    <p className="text-sm text-slate-500">Loading transaction history...</p>
                ) : error ? (
                    <p className="text-sm text-rose-600">{error}</p>
                ) : transactions.length === 0 ? (
                    <p className="text-sm text-slate-500">No previous transactions found yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-slate-200">
                                    <th className="py-3 pr-4 font-semibold">Date</th>
                                    <th className="py-3 pr-4 font-semibold">Description</th>
                                    <th className="py-3 pr-4 font-semibold">Order ID</th>
                                    <th className="py-3 pr-4 font-semibold">Appointment ID</th>
                                    <th className="py-3 pr-4 font-semibold text-right">Amount</th>
                                    <th className="py-3 font-semibold text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => {
                                    const status = String(tx?.status || 'unknown').toLowerCase();
                                    const isSuccess = status === 'success' || status === 'succeeded';

                                    return (
                                        <tr key={tx._id} className="border-b border-slate-100 last:border-b-0">
                                            <td className="py-3 pr-4 text-slate-700">{new Date(tx.date).toLocaleString()}</td>
                                            <td className="py-3 pr-4 text-slate-800">{tx.description || 'Appointment payment'}</td>
                                            <td className="py-3 pr-4 text-slate-600">{tx.orderId || '-'}</td>
                                            <td className="py-3 pr-4 text-slate-600">{tx.appointmentId || '-'}</td>
                                            <td className="py-3 pr-4 text-right font-semibold text-slate-900">{formatAmount(tx)}</td>
                                            <td className="py-3 text-right">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    isSuccess
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
