import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, ArrowLeft, Sun, Sunrise, Moon, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getAppointmentServiceUrl, getDoctorServiceUrl } from '../config/api';

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

const normalizeListPayload = (payload, candidateKeys = []) => {
	if (Array.isArray(payload)) return payload;
	if (payload && typeof payload === 'object') {
		for (const key of candidateKeys) {
			if (Array.isArray(payload[key])) return payload[key];
		}
	}
	return [];
};

const toDateInputValue = (date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const formatSelectedDateLabel = (dateStr) => {
	if (!dateStr) return '';
	const date = new Date(`${dateStr}T00:00:00`);
	if (Number.isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
};

const isFutureSlot = (dateStr, timeStr, now = new Date()) => {
	if (!dateStr || !timeStr) return false;
	const normalizedTime = normalizeTime(timeStr);
	const slotMinutes = timeToMinutes(normalizedTime);
	if (slotMinutes === null) return false;

	const slotDateTime = new Date(`${dateStr}T00:00:00`);
	if (Number.isNaN(slotDateTime.getTime())) return false;
	slotDateTime.setMinutes(slotDateTime.getMinutes() + slotMinutes);

	return slotDateTime.getTime() > now.getTime();
};

export default function BookAppointment() {
	const { doctorId } = useParams();
	const navigate = useNavigate();
	const { user, token } = useAuth();

	const [doctor, setDoctor] = useState(null);
	const [availability, setAvailability] = useState([]);
	const [appointments, setAppointments] = useState([]);
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedTime, setSelectedTime] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const quickDateOptions = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const options = [];

		for (let offset = 0; offset < 7; offset += 1) {
			const date = new Date(today);
			date.setDate(today.getDate() + offset);
			options.push({
				value: toDateInputValue(date),
				weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
				day: date.toLocaleDateString('en-US', { day: '2-digit' }),
				month: date.toLocaleDateString('en-US', { month: 'short' }),
				isToday: offset === 0
			});
		}

		return options;
	}, []);

	const minBookingDate = quickDateOptions[0]?.value || '';

	useEffect(() => {
		let isMounted = true;

		const fetchDoctor = async () => {
			try {
				const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
				const [doctorRes, apptRes] = await Promise.all([
					axios.get(getDoctorServiceUrl(`/profile/${doctorId}`), config),
					axios.get(getAppointmentServiceUrl(`/doctor/${doctorId}`), config)
				]);
				if (!isMounted) return;
				const doctorPayload = doctorRes.data;
				const doctorProfile = Array.isArray(doctorPayload)
					? (doctorPayload[0] || null)
					: (doctorPayload && typeof doctorPayload === 'object' ? doctorPayload : null);
				const doctorAppointments = normalizeListPayload(apptRes.data, ['appointments', 'data']);

				setDoctor(doctorProfile);
				setAvailability(parseAvailability(doctorProfile?.availability));
				setAppointments(doctorAppointments);
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

	const bookedSlots = useMemo(() => {
		if (!selectedDate) return new Set();
		return new Set(
			normalizeListPayload(appointments)
				.filter((appt) => appt.date === selectedDate && appt.status !== 'cancelled' && appt.status !== 'rejected')
				.map((appt) => normalizeTime(appt.time))
				.filter(Boolean)
		);
	}, [appointments, selectedDate]);

	const groupedSlots = useMemo(() => {
		const groups = { morning: [], afternoon: [], evening: [] };
		availableSlots.forEach((slot) => {
			const mins = timeToMinutes(slot);
			if (mins < 720) groups.morning.push(slot);
			else if (mins < 1020) groups.afternoon.push(slot);
			else groups.evening.push(slot);
		});
		return groups;
	}, [availableSlots]);

	const handleRequestAppointment = async () => {
		if (!user || !token) return alert('Please login first');
		if (!selectedDate || !selectedTime) return alert('Please select a date and time');
		if (!isFutureSlot(selectedDate, selectedTime)) return alert('Please select a future time slot.');

		setSaving(true);
		try {
			await axios.post(getAppointmentServiceUrl('/book'), {
				patientId: user.id,
				doctorId,
				date: selectedDate,
				time: selectedTime,
				paymentStatus: 'unpaid'
			}, {
				headers: { Authorization: `Bearer ${token}` }
			});
			navigate('/patient/appointments', { state: { refresh: true } });
		} catch (err) {
			console.error('Failed to request appointment', err);
			alert('Failed to request appointment');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => navigate('/patient/search')}
					className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition shadow-sm"
				>
					<ArrowLeft className="w-4 h-4 text-slate-600" />
				</button>
				<h2 className="text-2xl font-bold text-slate-800">Book Appointment</h2>
			</div>

			{loading ? (
				<div className="p-8 bg-white rounded-2xl border border-slate-100 text-center">
					<p className="text-gray-400 font-medium">Loading doctor details...</p>
				</div>
			) : doctor ? (
				<div className="space-y-5">
					{/* Doctor Info Card */}
					<div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
						<div className="flex items-center gap-4">
							<div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
								<span className="text-2xl font-black text-brand-600">{doctor.name?.charAt(0)}</span>
							</div>
							<div>
								<h3 className="text-xl font-bold text-slate-800">Dr. {doctor.name}</h3>
								<p className="text-brand-600 font-semibold text-sm">{doctor.specialty || doctor.specialization || 'Specialist'}</p>
								{doctor.consultationFee > 0 && (
									<p className="text-xs text-slate-400 font-medium mt-0.5">Consultation Fee: Rs. {doctor.consultationFee}</p>
								)}
							</div>
						</div>
					</div>

					{/* Date Selection */}
					<div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
						<label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
							<Calendar className="w-4 h-4" /> Select Date
						</label>
						<input
							type="date"
							className="w-full px-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-brand-500 rounded-xl outline-none transition font-medium text-slate-700"
							value={selectedDate}
							min={new Date().toISOString().split('T')[0]}
							onChange={(e) => {
								setSelectedDate(e.target.value);
								setSelectedTime('');
							}}
						/>
					</div>

					{/* Time Slot Selection */}
					<div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
						<label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
							<Clock className="w-4 h-4" /> Select Time Slot
						</label>

						{!selectedDate ? (
							<div className="py-8 text-center">
								<Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
								<p className="text-sm text-slate-400 font-medium">Pick a date to see available time slots</p>
							</div>
						) : availableSlots.length === 0 ? (
							<div className="py-8 text-center">
								<Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
								<p className="text-sm text-slate-400 font-medium">No available slots for this day</p>
								<p className="text-xs text-slate-300 mt-1">Try selecting a different date</p>
							</div>
						) : (
							<div className="space-y-5">
								{/* Morning */}
								{groupedSlots.morning.length > 0 && (
									<div>
										<div className="flex items-center gap-2 mb-3">
											<Sunrise className="w-4 h-4 text-amber-500" />
											<span className="text-sm font-bold text-slate-600">Morning</span>
											<span className="text-xs text-slate-300 font-medium">Before 12:00 PM</span>
										</div>
										<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
											{groupedSlots.morning.map((slot) => {
												const isBooked = bookedSlots.has(slot);
												const isSelected = selectedTime === slot;
												return (
													<button
														key={slot}
														type="button"
														onClick={() => setSelectedTime(slot)}
														disabled={isBooked}
														className={`relative px-3 py-3 rounded-xl text-sm font-bold transition-all border ${
															isBooked
																? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
																: isSelected
																	? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-100 scale-[1.02]'
																	: 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-600 hover:shadow-md'
														}`}
													>
														{slot}
														{isBooked && <span className="block text-[10px] font-medium text-coral-400 no-underline" style={{textDecoration:'none'}}>Booked</span>}
														{isSelected && <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-brand-600 bg-white rounded-full" />}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{/* Afternoon */}
								{groupedSlots.afternoon.length > 0 && (
									<div>
										<div className="flex items-center gap-2 mb-3">
											<Sun className="w-4 h-4 text-orange-500" />
											<span className="text-sm font-bold text-slate-600">Afternoon</span>
											<span className="text-xs text-slate-300 font-medium">12:00 PM - 5:00 PM</span>
										</div>
										<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
											{groupedSlots.afternoon.map((slot) => {
												const isBooked = bookedSlots.has(slot);
												const isSelected = selectedTime === slot;
												return (
													<button
														key={slot}
														type="button"
														onClick={() => setSelectedTime(slot)}
														disabled={isBooked}
														className={`relative px-3 py-3 rounded-xl text-sm font-bold transition-all border ${
															isBooked
																? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
																: isSelected
																	? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-100 scale-[1.02]'
																	: 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-600 hover:shadow-md'
														}`}
													>
														{slot}
														{isBooked && <span className="block text-[10px] font-medium text-coral-400 no-underline" style={{textDecoration:'none'}}>Booked</span>}
														{isSelected && <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-brand-600 bg-white rounded-full" />}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{/* Evening */}
								{groupedSlots.evening.length > 0 && (
									<div>
										<div className="flex items-center gap-2 mb-3">
											<Moon className="w-4 h-4 text-navy-500" />
											<span className="text-sm font-bold text-slate-600">Evening</span>
											<span className="text-xs text-slate-300 font-medium">After 5:00 PM</span>
										</div>
										<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
											{groupedSlots.evening.map((slot) => {
												const isBooked = bookedSlots.has(slot);
												const isSelected = selectedTime === slot;
												return (
													<button
														key={slot}
														type="button"
														onClick={() => setSelectedTime(slot)}
														disabled={isBooked}
														className={`relative px-3 py-3 rounded-xl text-sm font-bold transition-all border ${
															isBooked
																? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
																: isSelected
																	? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-100 scale-[1.02]'
																	: 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-600 hover:shadow-md'
														}`}
													>
														{slot}
														{isBooked && <span className="block text-[10px] font-medium text-coral-400 no-underline" style={{textDecoration:'none'}}>Booked</span>}
														{isSelected && <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-brand-600 bg-white rounded-full" />}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{/* Legend */}
								<div className="flex items-center gap-5 pt-3 border-t border-slate-100">
									<div className="flex items-center gap-1.5">
										<div className="w-3 h-3 rounded bg-white border border-slate-200"></div>
										<span className="text-xs text-slate-400">Available</span>
									</div>
									<div className="flex items-center gap-1.5">
										<div className="w-3 h-3 rounded bg-brand-600"></div>
										<span className="text-xs text-slate-400">Selected</span>
									</div>
									<div className="flex items-center gap-1.5">
										<div className="w-3 h-3 rounded bg-slate-50 border border-slate-100"></div>
										<span className="text-xs text-slate-400">Booked</span>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Selected Summary & Book Button */}
					{selectedDate && selectedTime && (
						<div className="p-5 bg-brand-50 rounded-2xl border border-brand-100 flex items-center justify-between">
							<div>
								<p className="text-xs font-black text-brand-600 uppercase tracking-widest mb-1">Your Selection</p>
								<p className="text-sm font-bold text-slate-700">
									{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
									{' '}at <span className="text-brand-700">{selectedTime} - {minutesToTime(timeToMinutes(selectedTime) + 30)}</span>
								</p>
							</div>
						</div>
					)}

					{/* Action Button */}
					<div className="flex justify-end">
						<button
							type="button"
							onClick={handleRequestAppointment}
							disabled={saving || !selectedDate || !selectedTime}
							className="px-8 py-4 bg-navy-600 text-white rounded-2xl hover:bg-navy-700 transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm shadow-xl shadow-navy-200"
						>
							{saving ? 'Requesting...' : 'Request Appointment'}
						</button>
					</div>
				</div>
			) : (
				<div className="p-8 bg-white rounded-2xl border border-slate-100 text-center">
					<p className="text-gray-400 font-medium">Doctor not found.</p>
				</div>
			)}
		</div>
	);
}
