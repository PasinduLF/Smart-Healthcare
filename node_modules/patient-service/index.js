require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads dir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://lpasindu30_db_user:SdSjcC0yYyX1JIwj@cluster0.gvxgnvm.mongodb.net/?appName=Cluster0')
    .then(() => console.log('Patient Service connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Mongoose Schema
const patientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number },
    contactNumber: { type: String },
    vitals: {
        bloodPressure: { type: String, default: '' },
        heartRate: { type: String, default: '' },
        weight: { type: String, default: '' },
        height: { type: String, default: '' }
    },
    allergies: [{ type: String }],
    reports: [{
        filename: String,
        originalName: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});
const Patient = mongoose.model('Patient', patientSchema);

const jwt = require('jsonwebtoken');

// Register new patient
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingPatient = await Patient.findOne({ email });
        if (existingPatient) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newPatient = new Patient({ name, email, password: hashedPassword });
        await newPatient.save();

        res.status(201).json({ message: 'Patient registered successfully', patient: { id: newPatient._id, name, email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login patient
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const patient = await Patient.findOne({ email });
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const isMatch = await bcrypt.compare(password, patient.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: patient._id, role: 'patient' }, process.env.JWT_SECRET || 'supersecret_key', { expiresIn: '1h' });
        res.json({ message: 'Login successful', token, patient: { id: patient._id, name: patient.name, email: patient.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get patient profile
app.get('/profile/:id', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).select('-password');
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        res.json(patient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update patient profile (basic details)
app.put('/profile/:id', async (req, res) => {
    try {
        const { name, age, contactNumber } = req.body;
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            { name, age, contactNumber },
            { new: true }
        ).select('-password');
        
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        res.json({ message: 'Profile updated', patient });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update health profile
app.put('/health-profile/:id', async (req, res) => {
    try {
        const { vitals, allergies } = req.body;
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            { vitals, allergies },
            { new: true }
        ).select('-password');
        
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        res.json({ message: 'Health profile updated', patient });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload medical report
app.post('/upload-report/:id', upload.single('report'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const patient = await Patient.findById(req.params.id);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const newReport = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: `/api/patients/uploads/${req.file.filename}`
        };

        patient.reports.push(newReport);
        await patient.save();

        res.status(201).json({ message: 'Report uploaded successfully', report: newReport });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/stats', async (req, res) => {
    try {
        const count = await Patient.countDocuments();
        res.json({ totalPatients: count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'Patient Service is running' });
});

app.listen(PORT, () => console.log(`Patient Service listening on port ${PORT}`));
