import React, { useState } from 'react';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const normalizeTime = (value) => {
	if (!value) return '';
	if (value.includes('AM') || value.includes('PM')) {
		const [timePart, meridiem] = value.split(' ');
		const [rawHours, rawMinutes] = timePart.split(':').map((part) => Number(part));
		if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return '';
		let hours = rawHours % 12;
		if (meridiem.toUpperCase() === 'PM') hours += 12;
		const formattedHours = String(hours).padStart(2, '0');
		const formattedMinutes = String(rawMinutes).padStart(2, '0');
		return `${formattedHours}:${formattedMinutes}`;
	}
	return value;
};

const timeToMinutes = (time) => {
	if (!time) return null;
	const parts = time.split(':').map((value) => Number(value));
	if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
	return (parts[0] * 60) + parts[1];
};

const minutesToTime = (minutes) => {
	if (!Number.isFinite(minutes)) return '';
	const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
	const mins = String(minutes % 60).padStart(2, '0');
	return `${hours}:${mins}`;
};

export default function PatientPaymentService() {
	const navigate = useNavigate();
	const location = useLocation();
	const { user, token } = useAuth();
	const paymentData = location.state || {};
	const [paying, setPaying] = useState(false);

	const appointment = paymentData.appointment || {};
	const doctorId = paymentData.doctorId || appointment.doctorId || '';
	const doctorName = paymentData.doctorName || 'Doctor';
	const consultationFee = Number(paymentData.consultationFee) || 0;
	const date = paymentData.date || appointment.date || 'N/A';
	const time = normalizeTime(paymentData.time || appointment.time || '');

	const handlePayment = async () => {
		if (!user || !token) return alert('Please login first');
		if (!doctorId || date === 'N/A' || time === 'N/A') return alert('Missing appointment details');

		setPaying(true);
		try {
			const res = await axios.post('http://localhost:3000/api/payments/payhere/checkout', {
				patientId: user.id,
				doctorId,
				date,
				time,
				amount: consultationFee,
				currency: 'LKR',
				doctorName,
				customerName: user?.name || 'Patient',
				customerEmail: user?.email || 'patient@example.com',
				customerPhone: user?.contactNumber || '0000000000'
			}, {
				headers: { Authorization: `Bearer ${token}` }
			});

			const { actionUrl, fields } = res.data || {};
			if (!actionUrl || !fields) throw new Error('Invalid PayHere response');

			const form = document.createElement('form');
			form.method = 'POST';
			form.action = actionUrl;
			Object.entries(fields).forEach(([key, value]) => {
				const input = document.createElement('input');
				input.type = 'hidden';
				input.name = key;
				input.value = String(value ?? '');
				form.appendChild(input);
			});
			document.body.appendChild(form);
			form.submit();
		} catch (err) {
			console.error(err);
			alert('Payment failed. Please try again.');
		} finally {
			setPaying(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => navigate('/patient/appointments')}
					className="p-2 rounded-full bg-white border hover:bg-gray-50 transition"
				>
					<ArrowLeft className="w-4 h-4" />
				</button>
				<h2 className="text-xl font-semibold">Payment</h2>
			</div>

			<div className="p-6 bg-white rounded-xl border space-y-4">
				<div>
					<h3 className="text-lg font-bold">Appointment Summary</h3>
					<p className="text-sm text-gray-500">Complete payment to confirm the booking.</p>
				</div>

				<div className="grid md:grid-cols-2 gap-4 text-sm">
					<div>
						<p className="text-gray-500">Doctor</p>
						<p className="font-medium text-gray-900">{doctorName}</p>
					</div>
					<div>
						<p className="text-gray-500">Date</p>
						<p className="font-medium text-gray-900">{date}</p>
					</div>
					<div>
						<p className="text-gray-500">Time</p>
						<p className="font-medium text-gray-900">{time || 'N/A'}{time ? ` - ${minutesToTime(timeToMinutes(time) + 30)}` : ''}</p>
					</div>
					<div>
						<p className="text-gray-500">Consultation Fee</p>
						<p className="font-medium text-gray-900">LKR {consultationFee.toFixed(2)}</p>
					</div>
				</div>

				<button
					type="button"
					onClick={handlePayment}
					disabled={paying}
					className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
				>
					<CreditCard className="w-4 h-4" /> {paying ? 'Processing...' : 'Pay Now'}
				</button>
			</div>
		</div>
	);
}
