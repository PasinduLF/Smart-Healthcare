require('dotenv').config();
const express = require('express');
const cors = require('cors');

const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

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
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});
const Appointment = mongoose.model('Appointment', appointmentSchema);

app.post('/book', async (req, res) => {
    try {
        const { patientId, doctorId, date, time } = req.body;
        const newAppt = new Appointment({ patientId, doctorId, date, time });
        await newAppt.save();
        // Ideally this would emit an event to Payment/Notification service
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
        res.json(myAppts);
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
        res.json({ message: 'Appointment accepted', appointment: appt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/reject/:id', async (req, res) => {
    try {
        const appt = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected' },
            { new: true }
        );
        if (!appt) return res.status(404).json({ error: 'Appointment not found' });
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
