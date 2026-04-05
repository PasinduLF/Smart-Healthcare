import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getPaymentServiceUrl } from '../config/api';

export default function PaymentSuccess() {
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = useAuth();

    useEffect(() => {
        let mounted = true;
        let timer;

        const syncAndRedirect = async () => {
            const orderId = new URLSearchParams(location.search).get('order_id');
            if (orderId && token) {
                try {
                    await axios.post(getPaymentServiceUrl('/payhere/confirm'), { orderId }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (err) {
                    console.error('Failed to confirm payment after return', err);
                }
            }

            if (!mounted) return;
            timer = setTimeout(() => {
                navigate('/patient/appointments', { state: { refresh: true } });
            }, 1400);
        };

        syncAndRedirect();
        return () => {
            mounted = false;
            if (timer) clearTimeout(timer);
        };
    }, [location.search, navigate, token]);

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
                <p className="mt-2 text-slate-500">Your appointment is confirmed. Thank you!</p>
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
