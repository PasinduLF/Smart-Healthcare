require('dotenv').config();
const express = require('express');
const cors = require('cors');

const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://lpasindu30_db_user:SdSjcC0yYyX1JIwj@cluster0.gvxgnvm.mongodb.net/?appName=Cluster0')
    .then(() => console.log('Doctor Service connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mongoose Schema
const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    specialty: { type: String, required: true },
    experience: { type: Number, default: 0 },
    consultationFee: { type: Number, default: 0 },
    availability: { type: Array, default: [] },
    verified: { type: Boolean, default: false },
    maxPatients: { type: Number, default: 10 },
    createdAt: { type: Date, default: Date.now }
});
const Doctor = mongoose.model('Doctor', doctorSchema);

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now }
});
const Admin = mongoose.model('Admin', adminSchema);

const prescriptionSchema = new mongoose.Schema({
    doctorId: { type: String, required: true },
    patientId: { type: String, required: true },
    medication: { type: String, required: true },
    instructions: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now }
});
const Prescription = mongoose.model('Prescription', prescriptionSchema);

app.get('/list', async (req, res) => {
    try {
        const doctors = await Doctor.find({ verified: true }).select('-password');
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, password, specialty, maxPatients } = req.body;
        const existingDoc = await Doctor.findOne({ email });
        if (existingDoc) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newDoc = new Doctor({ name, email, password: hashedPassword, specialty, maxPatients });
        await newDoc.save();

        res.status(201).json({ message: 'Doctor registered, pending verification', doctor: { id: newDoc._id, name, email, specialty } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login doctor (with Admin fallback)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check Doctors first
        let user = await Doctor.findOne({ email });
        let role = 'doctor';
        
        // If not found, check Admins
        if (!user) {
            user = await Admin.findOne({ email });
            role = 'admin';
        }
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ 
            id: user._id, 
            role, 
            verified: role === 'doctor' ? user.verified : true 
        }, process.env.JWT_SECRET || 'supersecret_key', { expiresIn: role === 'admin' ? '1d' : '1h' });
        
        const responseData = { message: 'Login successful', token };
        if (role === 'admin') responseData.admin = { id: user._id, name: user.name, email: user.email, role: 'admin' };
        else responseData.doctor = { id: user._id, name: user.name, email: user.email, verified: user.verified };
        
        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const parseAvailability = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }
    return [];
};

app.get('/profile/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).select('-password');
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
        res.json(doctor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/profile/:id', async (req, res) => {
    try {
        const { name, specialty, specialization, experience, availability, consultationFee } = req.body;

        const update = {};
        if (typeof name === 'string') update.name = name;
        if (typeof specialty === 'string') update.specialty = specialty;
        if (typeof specialization === 'string' && !update.specialty) update.specialty = specialization;

        const parsedExperience = Number.isFinite(Number(experience)) ? Number(experience) : undefined;
        if (parsedExperience !== undefined) update.experience = parsedExperience;

        const parsedFee = Number.isFinite(Number(consultationFee)) ? Number(consultationFee) : undefined;
        if (parsedFee !== undefined) update.consultationFee = parsedFee;

        if (availability !== undefined) update.availability = parseAvailability(availability);

        const doctor = await Doctor.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

        res.json(doctor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/:id/availability', async (req, res) => {
    try {
        const availability = parseAvailability(req.body?.availability);
        const doctor = await Doctor.findByIdAndUpdate(req.params.id, { availability }, { new: true }).select('-password');
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
        res.json({ message: 'Availability updated successfully', doctor });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/pending', async (req, res) => {
    try {
        const doctors = await Doctor.find({ verified: false }).select('-password');
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/verify/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
        res.json(doctor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/stats', async (req, res) => {
    try {
        const count = await Doctor.countDocuments({ verified: true });
        res.json({ verifiedDoctors: count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Prescriptions
app.post('/prescriptions', async (req, res) => {
    try {
        const { doctorId, patientId, medication, instructions } = req.body;
        const newPrescription = new Prescription({ doctorId, patientId, medication, instructions });
        await newPrescription.save();
        res.status(201).json({ message: 'Prescription issued successfully', prescription: newPrescription });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/prescriptions/patient/:patientId', async (req, res) => {
    try {
        const scripts = await Prescription.find({ patientId: req.params.patientId }).sort({ issuedAt: -1 });
        res.json(scripts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/prescriptions/doctor/:doctorId', async (req, res) => {
    try {
        const scripts = await Prescription.find({ doctorId: req.params.doctorId }).sort({ issuedAt: -1 });
        res.json(scripts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'Doctor Service is running' });
});

app.listen(PORT, () => console.log(`Doctor Service listening on port ${PORT}`));
