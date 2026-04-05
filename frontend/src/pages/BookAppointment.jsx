import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
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

	const pastSlots = useMemo(() => {
		if (!selectedDate) return new Set();
		const now = new Date();
		return new Set(
			availableSlots.filter((slot) => !isFutureSlot(selectedDate, slot, now))
		);
	}, [availableSlots, selectedDate]);

	const hasSelectableSlots = useMemo(
		() => availableSlots.some((slot) => !bookedSlots.has(slot) && !pastSlots.has(slot)),
		[availableSlots, bookedSlots, pastSlots]
	);

	useEffect(() => {
		if (!selectedTime) return;
		if (bookedSlots.has(selectedTime) || pastSlots.has(selectedTime)) {
			setSelectedTime('');
		}
	}, [bookedSlots, pastSlots, selectedTime]);

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
							<div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 shadow-sm space-y-3">
								<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500">Pick from upcoming days</p>
								<div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
									{quickDateOptions.map((option) => {
										const isSelected = selectedDate === option.value;
										return (
											<button
												key={option.value}
												type="button"
												onClick={() => {
													setSelectedDate(option.value);
													setSelectedTime('');
												}}
												className={`rounded-xl border px-3 py-2 text-left transition ${isSelected
													? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100 scale-[1.02]'
													: 'bg-white/90 text-slate-700 border-blue-100 hover:border-blue-300 hover:bg-white'}`}
											>
												<p className={`text-[11px] font-semibold uppercase tracking-wide ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{option.weekday}</p>
												<p className="text-lg font-black leading-tight">{option.day}</p>
												<p className={`text-[11px] font-semibold uppercase tracking-wide ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{option.month}</p>
												{option.isToday && <p className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'text-blue-100' : 'text-blue-600'}`}>Today</p>}
											</button>
										);
									})}
								</div>

								<div className="pt-2 border-t border-blue-100/80 space-y-1.5">
									<label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Or choose another date</label>
									<input
										type="date"
										className="w-full px-4 py-3 border border-blue-100 rounded-xl bg-white text-slate-700 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
										value={selectedDate}
										min={minBookingDate}
										onChange={(e) => {
											setSelectedDate(e.target.value);
											setSelectedTime('');
										}}
									/>
								</div>

								{selectedDate && (
									<p className="text-xs text-blue-700 font-medium">
										Selected: <span className="font-bold">{formatSelectedDateLabel(selectedDate)}</span>
									</p>
								)}
							</div>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-700 flex items-center gap-2">
								<Clock className="w-4 h-4" /> Select Time (30 min)
							</label>
							{selectedDate ? (
								availableSlots.length > 0 ? (
									<>
										<div className="flex flex-wrap gap-2">
											{availableSlots.map((slot) => {
												const isBooked = bookedSlots.has(slot);
												const isPast = pastSlots.has(slot);
												const isUnavailable = isBooked || isPast;
												return (
												<button
													key={slot}
													type="button"
													onClick={() => setSelectedTime(slot)}
													disabled={isUnavailable}
													className={`px-3 py-2 rounded-lg text-sm border transition ${isUnavailable
														? isPast
															? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
															: 'bg-red-50 text-red-600 border-red-200 cursor-not-allowed'
														: selectedTime === slot
															? 'bg-green-600 text-white border-green-600'
															: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'}
													`}
												>
													{slot} - {minutesToTime(timeToMinutes(slot) + 30)}{isPast ? ' - Passed' : isBooked ? ' - Booked' : ''}
												</button>
												);
											})}
										</div>
										{!hasSelectableSlots && (
											<p className="text-xs text-amber-600">No future time slots are currently available for this date.</p>
										)}
									</>
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
							onClick={handleRequestAppointment}
							disabled={saving || !selectedDate || !selectedTime}
							className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
						>
							Request Appointment
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
