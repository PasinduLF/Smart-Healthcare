require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Ensure uploads dir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer config for certificate PDFs
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

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
    certificate: {
        filename: { type: String, default: '' },
        originalName: { type: String, default: '' },
        url: { type: String, default: '' },
        uploadedAt: { type: Date }
    },
    availability: { type: Array, default: [] },
    verified: { type: Boolean, default: false },
    maxPatients: { type: Number, default: 10 },
    createdAt: { type: Date, default: Date.now }
});
const Doctor = mongoose.model('Doctor', doctorSchema);

const prescriptionSchema = new mongoose.Schema({
    doctorId: { type: String, required: true },
    doctorName: { type: String, default: '' },
    patientId: { type: String, required: true },
    patientName: { type: String, default: '' },
    medication: { type: String, required: true },
    instructions: { type: String, required: true },
    signature: { type: String, default: '' },
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

app.post('/register', upload.single('certificate'), async (req, res) => {
    try {
        const { name, email, password, specialty, experience, maxPatients, consultationFee } = req.body;
        const existingDoc = await Doctor.findOne({ email });
        if (existingDoc) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newDoc = new Doctor({
            name, email, password: hashedPassword, specialty,
            experience: Number(experience) || 0,
            consultationFee: Number(consultationFee) || 0,
            maxPatients
        });

        if (req.file) {
            newDoc.certificate = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                url: `/api/doctors/uploads/${req.file.filename}`,
                uploadedAt: new Date()
            };
        }

        await newDoc.save();

        res.status(201).json({ message: 'Doctor registered, pending verification', doctor: { id: newDoc._id, name, email, specialty } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const doctor = await Doctor.findOne({ email });
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

        const isMatch = await bcrypt.compare(password, doctor.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        // Generate token even if not verified yet, but frontend/auth middleware checks verification status if needed. 
        // We'll pass the verification status to the frontend.
        const token = jwt.sign({ id: doctor._id, role: 'doctor', verified: doctor.verified }, process.env.JWT_SECRET || 'supersecret_key', { expiresIn: '1h' });
        res.json({ message: 'Login successful', token, doctor: { id: doctor._id, name: doctor.name, email: doctor.email, verified: doctor.verified } });
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
        const { doctorId, doctorName, patientId, patientName, medication, instructions, signature } = req.body;
        const newPrescription = new Prescription({ doctorId, doctorName, patientId, patientName, medication, instructions, signature: signature || '' });
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

app.delete('/prescriptions/:id', async (req, res) => {
    try {
        const script = await Prescription.findByIdAndDelete(req.params.id);
        if (!script) return res.status(404).json({ error: 'Prescription not found' });
        res.json({ message: 'Prescription deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'Doctor Service is running' });
});

app.listen(PORT, () => console.log(`Doctor Service listening on port ${PORT}`));
