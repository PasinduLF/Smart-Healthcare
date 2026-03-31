import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

export default function PaymentSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { token } = useAuth();
    const [statusMessage, setStatusMessage] = useState('Finalizing payment...');

    useEffect(() => {
        const appointmentId = searchParams.get('appointmentId');
        const orderId = searchParams.get('orderId');

        const finalizePayment = async () => {
            if (!appointmentId) {
                setStatusMessage('Payment confirmed. Updating appointments...');
                return;
            }
            try {
                await axios.put(`${API_BASE_URL}/api/appointments/payment/${appointmentId}`, {}, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined
                });
                setStatusMessage('Payment confirmed. Updating appointments...');
            } catch (err) {
                console.error('Failed to update payment status', err);
                setStatusMessage(`Payment recorded. Please refresh your appointments. ${orderId ? `Order ${orderId}` : ''}`.trim());
            }
        };

        finalizePayment();

        const timer = setTimeout(() => {
            navigate('/patient/appointments', { state: { refresh: true } });
        }, 1600);
        return () => clearTimeout(timer);
    }, [navigate, orderId, searchParams, token]);

    return (
        <div className="relative overflow-hidden rounded-2xl border bg-white p-10 text-center">
            <style>{`
                @keyframes confetti-fall {
                    0% { transform: translateY(-120%) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(120vh) rotate(360deg); opacity: 0; }
                }
                .confetti {
                    position: absolute;
                    width: 10px;
                    height: 18px;
                    opacity: 0.9;
                    animation: confetti-fall 2.6s linear infinite;
                }
            `}</style>

            {Array.from({ length: 36 }).map((_, index) => {
                const left = (index * 2.7) % 100;
                const delay = (index % 12) * 0.2;
                const colors = ['#f43f5e', '#22c55e', '#3b82f6', '#f59e0b', '#10b981'];
                return (
                    <span
                        key={index}
                        className="confetti"
                        style={{
                            left: `${left}%`,
                            top: '-10%',
                            backgroundColor: colors[index % colors.length],
                            animationDelay: `${delay}s`,
                            borderRadius: index % 2 === 0 ? '999px' : '4px'
                        }}
                    />
                );
            })}

            <div className="relative z-10">
                <h2 className="text-2xl font-bold text-slate-900">Payment Successful</h2>
                <p className="mt-2 text-slate-500">{statusMessage}</p>
                <div className="mt-6">
                    <Link
                        to="/patient/appointments"
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                    >
                        View My Appointments
                    </Link>
                </div>
            </div>
        </div>
    );
}
