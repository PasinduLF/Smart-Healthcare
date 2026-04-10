require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3003;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006';
const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || 'http://patient-service:3001';
const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3002';

app.use(cors());
app.use(express.json());

// Helper to send in-app notification (fire-and-forget)
const sendNotification = async (data) => {
    try {
        await axios.post(`${NOTIFICATION_SERVICE_URL}/notifications`, data);
    } catch (err) {
        console.error('[Appointment] Failed to send notification:', err.message);
    }
};

// Helper to send rich HTML email (fire-and-forget)
const sendEmail = async (to, subject, type, templateData, fallbackText) => {
    if (!to) return;
    try {
        await axios.post(`${NOTIFICATION_SERVICE_URL}/send-email`, {
            to,
            subject,
            text: fallbackText || subject,
            type,
            templateData
        });
        console.log(`[Appointment] ✅ Email dispatched → ${to} [${type}]`);
    } catch (err) {
        console.error(`[Appointment] ❌ Email failed → ${to}:`, err.response?.data?.error || err.message);
    }
};

// Helper to send real SMS (fire-and-forget)
const sendSMS = async (to, text) => {
    if (!to) return;
    try {
        await axios.post(`${NOTIFICATION_SERVICE_URL}/send-sms`, { to, text });
        console.log(`[Appointment] SMS dispatched to ${to}`);
    } catch (err) {
        console.error('[Appointment] Failed to send SMS:', err.message);
    }
};

// Helper to fetch patient profile
const fetchPatientProfile = async (patientId) => {
    try {
        const res = await axios.get(`${PATIENT_SERVICE_URL}/profile/${patientId}`);
        return res.data;
    } catch (err) {
        console.error('[Appointment] Failed to fetch patient:', err.message);
        return null;
    }
};

// Helper to fetch doctor profile
const fetchDoctorProfile = async (doctorId) => {
    try {
        const res = await axios.get(`${DOCTOR_SERVICE_URL}/profile/${doctorId}`);
        return res.data;
    } catch (err) {
        console.error('[Appointment] Failed to fetch doctor:', err.message);
        return null;
    }
};

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://lpasindu30_db_user:SdSjcC0yYyX1JIwj@cluster0.gvxgnvm.mongodb.net/?appName=Cluster0')
    .then(() => console.log('Appointment Service connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Mongoose Schema
const appointmentSchema = new mongoose.Schema({
    patientId: { type: String, required: true },
    doctorId: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Appointment = mongoose.model('Appointment', appointmentSchema);

app.post('/book', async (req, res) => {
    try {
        const { patientId, doctorId, date, time, paymentStatus } = req.body;
        const newAppt = new Appointment({
            patientId,
            doctorId,
            date,
            time,
            paymentStatus: paymentStatus || 'unpaid'
        });
        await newAppt.save();

        // Fetch patient & doctor profiles for contact info
        const [patient, doctor] = await Promise.all([
            fetchPatientProfile(patientId),
            fetchDoctorProfile(doctorId)
        ]);

        const patientName = patient?.name || 'Patient';
        const doctorName = doctor?.name ? `Dr. ${doctor.name}` : 'your doctor';
        const patientEmail = patient?.email;
        const patientPhone = patient?.contactNumber;
        const doctorEmail = doctor?.email;

        // In-app notifications
        sendNotification({
            userId: patientId,
            userRole: 'patient',
            type: 'appointment_booked',
            title: 'Appointment Booked',
            message: `Your appointment with ${doctorName} on ${date} at ${time} has been booked and is pending doctor approval.`
        });
        sendNotification({
            userId: doctorId,
            userRole: 'doctor',
            type: 'appointment_booked',
            title: 'New Appointment Request',
            message: `${patientName} has requested an appointment on ${date} at ${time}. Please review and accept/reject.`
        });

        // Rich HTML EMAIL to patient
        sendEmail(
            patientEmail,
            'Appointment Booked — SmartHealth',
            'appointment_booked_patient',
            { patientName, doctorName, date, time },
            `Dear ${patientName}, your appointment with ${doctorName} on ${date} at ${time} has been booked.`
        );

        // Rich HTML EMAIL to doctor
        sendEmail(
            doctorEmail,
            'New Appointment Request — SmartHealth',
            'appointment_booked_doctor',
            { patientName, doctorName, date, time },
            `Dear ${doctorName}, ${patientName} has requested an appointment on ${date} at ${time}.`
        );

        // Real SMS to patient
        sendSMS(
            patientPhone,
            `Dear ${patientName}, your appointment with ${doctorName} has been successfully scheduled for ${date} at ${time}. It is currently pending doctor approval. You will receive a confirmation once accepted. Thank you for choosing SmartHealth.`
        );

        res.status(201).json({ message: 'Appointment booked', appointment: newAppt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/patient/:patientId', async (req, res) => {
    try {
        const myAppts = await Appointment.find({ patientId: req.params.patientId });
        res.json(myAppts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/doctor/:doctorId', async (req, res) => {
    try {
        const myAppts = await Appointment.find({ doctorId: req.params.doctorId });
        
        // Enrich appointments with patient names
        const enrichedAppts = await Promise.all(
            myAppts.map(async (appt) => {
                const patient = await fetchPatientProfile(appt.patientId);
                return {
                    ...appt.toObject(),
                    patientName: patient?.name || 'Unknown Patient',
                    patientEmail: patient?.email || '',
                    patientPhone: patient?.contactNumber || ''
                };
            })
        );
        
        res.json(enrichedAppts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/cancel/:id', async (req, res) => {
    try {
        const appt = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true }
        );
        if (!appt) return res.status(404).json({ error: 'Appointment not found' });

        const [patient, doctor] = await Promise.all([
            fetchPatientProfile(appt.patientId),
            fetchDoctorProfile(appt.doctorId)
        ]);
        const patientName = patient?.name || 'A patient';
        const doctorName = doctor?.name ? `Dr. ${doctor.name}` : 'Doctor';

        // In-app notification to doctor
        sendNotification({
            userId: appt.doctorId,
            userRole: 'doctor',
            type: 'appointment_cancelled',
            title: 'Appointment Cancelled',
            message: `${patientName} has cancelled their appointment on ${appt.date} at ${appt.time}.`
        });

        // Rich HTML email to doctor
        sendEmail(
            doctor?.email,
            'Appointment Cancelled — SmartHealth',
            'appointment_cancelled',
            { doctorName, patientName, date: appt.date, time: appt.time },
            `Dear ${doctorName}, ${patientName} has cancelled their appointment on ${appt.date} at ${appt.time}.`
        );

        // Rich HTML email to patient
        sendEmail(
            patient?.email,
            'Appointment Cancelled — SmartHealth',
            'appointment_cancelled',
            { patientName, date: appt.date, time: appt.time },
            `Dear ${patientName}, your appointment on ${appt.date} at ${appt.time} has been cancelled.`
        );

        // Real SMS to patient
        sendSMS(
            patient?.contactNumber,
            `Dear ${patientName}, your appointment on ${appt.date} at ${appt.time} has been cancelled as per your request. You may book a new appointment at your convenience through the SmartHealth portal. Thank you.`
        );

        res.json({ message: 'Appointment cancelled', appointment: appt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/accept/:id', async (req, res) => {
    try {
        const appt = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: 'accepted' },
            { new: true }
        );
        if (!appt) return res.status(404).json({ error: 'Appointment not found' });

        const [patient, doctor] = await Promise.all([
            fetchPatientProfile(appt.patientId),
            fetchDoctorProfile(appt.doctorId)
        ]);
        const patientName = patient?.name || 'Patient';
        const doctorName = doctor?.name ? `Dr. ${doctor.name}` : 'your doctor';
        const patientEmail = patient?.email;
        const patientPhone = patient?.contactNumber;

        console.log(`[Appointment] Accepting appointment - Patient: ${patientName}, Email: ${patientEmail}, Phone: ${patientPhone}`);

        // In-app notification
        sendNotification({
            userId: appt.patientId,
            userRole: 'patient',
            type: 'appointment_accepted',
            title: 'Appointment Accepted',
            message: `Your appointment with ${doctorName} on ${appt.date} at ${appt.time} has been accepted.`
        });

        // Rich HTML email to patient
        if (patientEmail) {
            sendEmail(
                patientEmail,
                'Appointment Confirmed ✅ — SmartHealth',
                'appointment_accepted',
                { patientName, doctorName, date: appt.date, time: appt.time },
                `Dear ${patientName}, your appointment with ${doctorName} on ${appt.date} at ${appt.time} is confirmed!`
            );
        } else {
            console.warn(`[Appointment] ⚠️ Cannot send email - patient email is missing for ${patientName}`);
        }

        // Real SMS to patient
        if (patientPhone) {
            sendSMS(
                patientPhone,
                `Dear ${patientName}, great news! Your appointment with ${doctorName} on ${appt.date} at ${appt.time} has been confirmed. Please arrive 10 minutes early and bring any relevant medical documents. Thank you for choosing SmartHealth.`
            );
        } else {
            console.warn(`[Appointment] ⚠️ Cannot send SMS - patient phone is missing for ${patientName}`);
        }

        res.json({ message: 'Appointment accepted', appointment: appt });
    } catch (err) {
        console.error('[Appointment] Error accepting appointment:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/reject/:id', async (req, res) => {
    try {
        const { reason } = req.body;
        const appt = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected', rejectionReason: reason || '' },
            { new: true }
        );
        if (!appt) return res.status(404).json({ error: 'Appointment not found' });

        const patient = await fetchPatientProfile(appt.patientId);
        const patientName = patient?.name || 'Patient';
        const reasonText = reason ? ` Reason: ${reason}` : '';

        // In-app notification
        sendNotification({
            userId: appt.patientId,
            userRole: 'patient',
            type: 'appointment_rejected',
            title: 'Appointment Rejected',
            message: `Your appointment on ${appt.date} at ${appt.time} has been rejected.${reasonText} Please try another time.`
        });

        // Rich HTML email to patient
        sendEmail(
            patient?.email,
            'Appointment Request Update — SmartHealth',
            'appointment_rejected',
            { patientName, date: appt.date, time: appt.time, reason: reason || '' },
            `Dear ${patientName}, your appointment on ${appt.date} at ${appt.time} was not accepted.${reasonText}`
        );

        // Real SMS to patient
        sendSMS(
            patient?.contactNumber,
            `Dear ${patientName}, we regret to inform you that your appointment on ${appt.date} at ${appt.time} could not be confirmed.${reasonText} We kindly request you to select an alternative time slot through the SmartHealth portal. We apologize for any inconvenience.`
        );

        res.json({ message: 'Appointment rejected', appointment: appt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/reschedule/:id', async (req, res) => {
    try {
        const { date, time } = req.body;
        const appt = await Appointment.findByIdAndUpdate(
            req.params.id,
            { date, time, status: 'pending' },
            { new: true }
        );
        if (!appt) return res.status(404).json({ error: 'Appointment not found' });
        res.json({ message: 'Appointment rescheduled', appointment: appt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/payment/:id', async (req, res) => {
    try {
        const appt = await Appointment.findByIdAndUpdate(
            req.params.id,
            { paymentStatus: 'paid' },
            { new: true }
        );
        if (!appt) return res.status(404).json({ error: 'Appointment not found' });
        res.json({ message: 'Payment marked as paid', appointment: appt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/stats', async (req, res) => {
    try {
        const count = await Appointment.countDocuments();
        res.json({ totalAppointments: count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'Appointment Service is running' });
});

app.listen(PORT, () => console.log(`Appointment Service listening on port ${PORT}`));
