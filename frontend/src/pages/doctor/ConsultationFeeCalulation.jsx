import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calculator, HandCoins, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPaymentServiceUrl } from '../../config/api';

const formatMoney = (minorAmount, currency = 'LKR') => {
    const amount = Number(minorAmount) || 0;
    const normalizedCurrency = String(currency || 'LKR').toUpperCase();

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: normalizedCurrency,
            minimumFractionDigits: 2
        }).format(amount / 100);
    } catch {
        return `${normalizedCurrency} ${(amount / 100).toFixed(2)}`;
    }
};

const computeSplit = (minorAmount) => {
    const gross = Number(minorAmount) || 0;
    const doctorIncome = Math.round(gross * 0.9);
    const websiteCommission = gross - doctorIncome;
    return { doctorIncome, websiteCommission };
};

export default function ConsultationFeeCalulation() {
    const { user, token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({
        grossTotal: 0,
        doctorIncome: 0,
        websiteCommission: 0,
        transactionCount: 0,
        currency: 'LKR'
    });

    useEffect(() => {
        const fetchDoctorConsultationSummary = async () => {
            if (!user?.id || !token) {
                setTransactions([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');
            setNotice('');

            try {
                const res = await axios.get(getPaymentServiceUrl(`/transactions/doctor/${user.id}`), {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const payload = res.data || {};
                const txs = Array.isArray(payload.transactions)
                    ? payload.transactions
                    : Array.isArray(payload)
                        ? payload
                        : [];

                const grossTotal = Number(payload.grossTotal) || txs.reduce((sum, tx) => sum + (Number(tx?.amount) || 0), 0);
                const doctorIncome = Number(payload.doctorIncome) || Math.round(grossTotal * 0.9);
                const websiteCommission = Number(payload.websiteCommission) || (grossTotal - doctorIncome);
                const currency = String(payload.currency || txs[0]?.currency || 'LKR').toUpperCase();

                setTransactions(txs);
                setSummary({
                    grossTotal,
                    doctorIncome,
                    websiteCommission,
                    transactionCount: Number(payload.transactionCount) || txs.length,
                    currency
                });
            } catch (err) {
                const status = err?.response?.status;

                // Compatibility fallback for older payment-service deployments.
                if (status === 404) {
                    try {
                        const fallbackRes = await axios.get(getPaymentServiceUrl('/transactions'), {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        const allTransactions = Array.isArray(fallbackRes.data) ? fallbackRes.data : [];
                        const doctorTransactions = allTransactions.filter((tx) => tx?.doctorId === user.id);

                        const grossTotal = doctorTransactions.reduce((sum, tx) => sum + (Number(tx?.amount) || 0), 0);
                        const doctorIncome = Math.round(grossTotal * 0.9);
                        const websiteCommission = grossTotal - doctorIncome;
                        const currency = String(doctorTransactions[0]?.currency || 'LKR').toUpperCase();

                        setTransactions(doctorTransactions);
                        setSummary({
                            grossTotal,
                            doctorIncome,
                            websiteCommission,
                            transactionCount: doctorTransactions.length,
                            currency
                        });
                        setNotice('Showing fallback totals from legacy API. Update payment service for dedicated doctor calculations.');
                    } catch (fallbackErr) {
                        console.error('Fallback doctor consultation fee request failed', fallbackErr);
                        setError('Unable to load consultation fee calculation right now.');
                    }
                } else {
                    console.error('Failed to fetch doctor consultation fee summary', err);
                    setError('Unable to load consultation fee calculation right now.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDoctorConsultationSummary();
    }, [user, token]);

    if (loading) {
        return <div className="text-center py-12 text-slate-400 font-semibold">Loading consultation fee calculation...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Calculator className="w-6 h-6 text-teal-600" />
                        Consultation Fee Calculation
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Doctor income split: 90% doctor, 10% website commission.</p>
                </div>

                <Link
                    to="/doctor/profile"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Profile
                </Link>
            </div>

            {notice && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 font-medium">
                    {notice}
                </div>
            )}

            {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
                    {error}
                </div>
            ) : (
                <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Consultation Fee (100%)</p>
                            <p className="text-xl font-black text-slate-900 mt-2">{formatMoney(summary.grossTotal, summary.currency)}</p>
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Doctor Income (90%)</p>
                            <p className="text-xl font-black text-emerald-700 mt-2">{formatMoney(summary.doctorIncome, summary.currency)}</p>
                        </div>

                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Website Commission (10%)</p>
                            <p className="text-xl font-black text-indigo-700 mt-2">{formatMoney(summary.websiteCommission, summary.currency)}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paid Consultations</p>
                            <p className="text-xl font-black text-slate-900 mt-2">{summary.transactionCount}</p>
                        </div>
                    </div>

                    <div className="glass-premium p-6 md:p-8 rounded-3xl border border-slate-100">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 mb-4">
                            <HandCoins className="w-5 h-5 text-teal-600" />
                            Consultation Payment Records
                        </h3>

                        {transactions.length === 0 ? (
                            <p className="text-sm text-slate-500">No paid consultation records found yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[920px] text-sm">
                                    <thead>
                                        <tr className="text-left text-slate-500 border-b border-slate-200">
                                            <th className="py-3 pr-4 font-semibold">Date</th>
                                            <th className="py-3 pr-4 font-semibold">Description</th>
                                            <th className="py-3 pr-4 font-semibold">Order ID</th>
                                            <th className="py-3 pr-4 font-semibold text-right">Total Fee</th>
                                            <th className="py-3 pr-4 font-semibold text-right">Doctor 90%</th>
                                            <th className="py-3 font-semibold text-right">Commission 10%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((tx) => {
                                            const amount = Number(tx?.amount) || 0;
                                            const split = computeSplit(amount);
                                            const currency = String(tx?.currency || summary.currency || 'LKR').toUpperCase();

                                            return (
                                                <tr key={tx._id} className="border-b border-slate-100 last:border-b-0">
                                                    <td className="py-3 pr-4 text-slate-700">{new Date(tx.date).toLocaleString()}</td>
                                                    <td className="py-3 pr-4 text-slate-800">{tx.description || 'Consultation payment'}</td>
                                                    <td className="py-3 pr-4 text-slate-600">{tx.orderId || '-'}</td>
                                                    <td className="py-3 pr-4 text-right font-semibold text-slate-900">{formatMoney(amount, currency)}</td>
                                                    <td className="py-3 pr-4 text-right font-semibold text-emerald-700">{formatMoney(split.doctorIncome, currency)}</td>
                                                    <td className="py-3 text-right font-semibold text-indigo-700">{formatMoney(split.websiteCommission, currency)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Income split formula per consultation: doctor income = consultation fee x 0.90, website commission = consultation fee x 0.10.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
