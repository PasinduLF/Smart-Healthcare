import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const dayKeyFromDate = (dateStr) => {
	if (!dateStr) return null;
	const date = new Date(`${dateStr}T00:00:00`);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const parseAvailability = (raw) => {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw;
	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch (err) {
			return [];
		}
	}
	return [];
};

const timeToMinutes = (time) => {
	if (!time) return null;
	const parts = time.split(':').map((value) => Number(value));
	if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
	return (parts[0] * 60) + parts[1];
};

const minutesToTime = (minutes) => {
	const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
	const mins = String(minutes % 60).padStart(2, '0');
	return `${hours}:${mins}`;
};

const buildSlotsForDay = (dayAvailability) => {
	if (!dayAvailability || !Array.isArray(dayAvailability.slots)) return [];
	const slots = [];

	dayAvailability.slots.forEach((slot) => {
		const startMinutes = timeToMinutes(slot?.start);
		const endMinutes = timeToMinutes(slot?.end);
		if (startMinutes === null || endMinutes === null) return;
		if (endMinutes <= startMinutes) return;

		for (let current = startMinutes; current + 30 <= endMinutes; current += 30) {
			slots.push(minutesToTime(current));
		}
	});

	return Array.from(new Set(slots)).sort();
};

export default function BookAppointment() {
	const { doctorId } = useParams();
	const navigate = useNavigate();
	const { user, token } = useAuth();

	const [doctor, setDoctor] = useState(null);
	const [availability, setAvailability] = useState([]);
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedTime, setSelectedTime] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const fetchDoctor = async () => {
			try {
				const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
				const res = await axios.get(`http://localhost:3000/api/doctors/profile/${doctorId}`, config);
				if (!isMounted) return;
				setDoctor(res.data);
				setAvailability(parseAvailability(res.data.availability));
			} catch (err) {
				console.error('Failed to load doctor profile', err);
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		fetchDoctor();
		return () => { isMounted = false; };
	}, [doctorId, token]);

	const availableSlots = useMemo(() => {
		const dayKey = dayKeyFromDate(selectedDate);
		if (!dayKey) return [];
		const dayAvailability = availability.find((entry) => entry?.day === dayKey);
		return buildSlotsForDay(dayAvailability);
	}, [availability, selectedDate]);

	const handleConfirm = async () => {
		if (!user || !token) return alert('Please login first');
		if (!selectedDate || !selectedTime) return alert('Please select a date and time');

		setSaving(true);
		try {
			await axios.post('http://localhost:3000/api/appointments/book', {
				patientId: user.id,
				doctorId,
				date: selectedDate,
				time: selectedTime
			}, {
				headers: { Authorization: `Bearer ${token}` }
			});
			alert('Appointment booked successfully!');
			navigate('/patient/appointments');
		} catch (err) {
			console.error(err);
			alert('Failed to book appointment');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => navigate('/patient/search')}
					className="p-2 rounded-full bg-white border hover:bg-gray-50 transition"
				>
					<ArrowLeft className="w-4 h-4" />
				</button>
				<h2 className="text-xl font-semibold">Book Appointment</h2>
			</div>

			{loading ? (
				<div className="p-6 bg-white rounded-xl border">
					<p className="text-gray-500">Loading doctor details...</p>
				</div>
			) : doctor ? (
				<div className="p-6 bg-white rounded-xl border space-y-4">
					<div>
						<h3 className="text-lg font-bold">Dr. {doctor.name}</h3>
						<p className="text-sm text-gray-500">{doctor.specialty || doctor.specialization || 'Specialist'}</p>
					</div>

					<div className="grid md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-700 flex items-center gap-2">
								<Calendar className="w-4 h-4" /> Select Date
							</label>
							<input
								type="date"
								className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
								value={selectedDate}
								min={new Date().toISOString().split('T')[0]}
								onChange={(e) => {
									setSelectedDate(e.target.value);
									setSelectedTime('');
								}}
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-700 flex items-center gap-2">
								<Clock className="w-4 h-4" /> Select Time (30 min)
							</label>
							{selectedDate ? (
								availableSlots.length > 0 ? (
									<div className="flex flex-wrap gap-2">
										{availableSlots.map((slot) => (
											<button
												key={slot}
												type="button"
												onClick={() => setSelectedTime(slot)}
												className={`px-3 py-2 rounded-lg text-sm border transition ${selectedTime === slot
													? 'bg-blue-600 text-white border-blue-600'
													: 'bg-white text-gray-700 hover:bg-blue-50'}
												`}
											>
												{slot} - {minutesToTime(timeToMinutes(slot) + 30)}
											</button>
										))}
									</div>
								) : (
									<p className="text-sm text-gray-500">No available slots for this day.</p>
								)
							) : (
								<p className="text-sm text-gray-500">Pick a date to see available slots.</p>
							)}
						</div>
					</div>

					<div className="flex justify-end">
						<button
							type="button"
							onClick={handleConfirm}
							disabled={saving || !selectedDate || !selectedTime}
							className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
						>
							{saving ? 'Booking...' : 'Confirm Appointment'}
						</button>
					</div>
				</div>
			) : (
				<div className="p-6 bg-white rounded-xl border">
					<p className="text-gray-500">Doctor not found.</p>
				</div>
			)}
		</div>
	);
}
