import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getPatientServiceUrl, getPaymentServiceUrl } from '../../config/api';

export default function Profile() {
    const { user, token } = useAuth();
    const [profileData, setProfileData] = useState({ name: '', age: '', contactNumber: '' });
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [transactionsLoading, setTransactionsLoading] = useState(true);
    const [transactionsError, setTransactionsError] = useState('');

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
        const fetchProfile = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.get(getPatientServiceUrl(`/profile/${user.id}`), { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setProfileData({
                    name: res.data.name || '',
                    age: res.data.age || '',
                    contactNumber: res.data.contactNumber || ''
                });
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user, token]);

    useEffect(() => {
        const fetchTransactions = async () => {
            if (!user?.id || !token) {
                setTransactions([]);
                setTransactionsError('');
                setTransactionsLoading(false);
                return;
            }

            setTransactionsLoading(true);
            try {
                setTransactionsError('');
                const res = await axios.get(getPaymentServiceUrl(`/transactions/patient/${user.id}`), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTransactions(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Failed to fetch transaction history', err);
                setTransactionsError('Unable to load transaction history right now.');
            } finally {
                setTransactionsLoading(false);
            }
        };

        fetchTransactions();
    }, [user, token]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await axios.put(getPatientServiceUrl(`/profile/${user.id}`), profileData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Profile updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update profile");
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading profile...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">My Profile</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Age</label>
                    <input type="number" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={profileData.age} onChange={e => setProfileData({...profileData, age: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Contact Number</label>
                    <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={profileData.contactNumber} onChange={e => setProfileData({...profileData, contactNumber: e.target.value})} placeholder="+1 234 567 890" />
                </div>
                <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Update Profile</button>
            </form>

            <div className="bg-white border rounded-xl p-5 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Previous Transactions</h3>
                    <p className="text-sm text-gray-500">Your payment history for appointments.</p>
                </div>

                {transactionsLoading ? (
                    <p className="text-sm text-gray-400">Loading transaction history...</p>
                ) : transactionsError ? (
                    <p className="text-sm text-red-500">{transactionsError}</p>
                ) : transactions.length === 0 ? (
                    <p className="text-sm text-gray-500">No previous transactions found yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b">
                                    <th className="py-2 pr-4 font-medium">Date</th>
                                    <th className="py-2 pr-4 font-medium">Description</th>
                                    <th className="py-2 pr-4 font-medium">Order ID</th>
                                    <th className="py-2 pr-4 font-medium text-right">Amount</th>
                                    <th className="py-2 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => {
                                    const status = String(tx?.status || 'unknown').toLowerCase();
                                    const isSuccess = status === 'success' || status === 'succeeded';

                                    return (
                                        <tr key={tx._id} className="border-b last:border-b-0">
                                            <td className="py-3 pr-4 text-gray-700">{new Date(tx.date).toLocaleString()}</td>
                                            <td className="py-3 pr-4 text-gray-800">{tx.description || 'Appointment payment'}</td>
                                            <td className="py-3 pr-4 text-gray-600">{tx.orderId || '-'}</td>
                                            <td className="py-3 pr-4 text-right font-medium text-gray-900">{formatAmount(tx)}</td>
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
