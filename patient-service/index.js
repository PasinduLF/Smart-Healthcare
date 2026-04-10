require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v2: cloudinary } = require('cloudinary');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads dir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Config
const reportStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: reportStorage });

const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Only image files are allowed'));
    }
});

const profileImageUpload = avatarUpload.any();

const getUploadedProfileImage = (req) => {
    if (req.file) return req.file;
    if (Array.isArray(req.files) && req.files.length > 0) return req.files[0];
    if (req.files?.avatar?.[0]) return req.files.avatar[0];
    if (req.files?.profileImage?.[0]) return req.files.profileImage[0];
    if (req.files?.image?.[0]) return req.files.image[0];
    return null;
};

const uploadProfileImageToCloudinary = (file, folder) => new Promise((resolve, reject) => {
    if (!cloudinaryConfigured) {
        reject(new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'));
        return;
    }

    const stream = cloudinary.uploader.upload_stream(
        {
            folder,
            resource_type: 'image'
        },
        (error, result) => {
            if (error) return reject(error);
            resolve(result);
        }
    );

    stream.end(file.buffer);
});

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
        category: { type: String, default: 'Other' },
        doctorId: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now }
    }],
    avatarUrl: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Patient = mongoose.model('Patient', patientSchema);

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    avatarUrl: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Admin = mongoose.model('Admin', adminSchema);

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

// Login patient (with Admin fallback)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check Patients first
        let user = await Patient.findOne({ email });
        let role = 'patient';
        
        // If not found, check Admins
        if (!user) {
            user = await Admin.findOne({ email });
            role = 'admin';
        }
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ id: user._id, role }, process.env.JWT_SECRET || 'supersecret_key', { expiresIn: role === 'admin' ? '1d' : '1h' });
        
        const responseData = { message: 'Login successful', token };
        if (role === 'admin') responseData.admin = { id: user._id, name: user.name, email: user.email, role: 'admin' };
        else responseData.patient = { id: user._id, name: user.name, email: user.email };
        
        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Login
app.post('/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(404).json({ error: 'Admin account not found' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'supersecret_key', { expiresIn: '1d' });
        res.json({ message: 'Admin login successful', token, admin: { id: admin._id, name: admin.name, email: admin.email, role: 'admin' } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get admin profile
app.get('/admin/profile/:id', async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id).select('-password');
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        res.json(admin);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update admin profile
app.put('/admin/profile/:id', async (req, res) => {
    try {
        const { name, email } = req.body;

        if (typeof email === 'string' && email.trim()) {
            const existingAdmin = await Admin.findOne({ email: email.trim(), _id: { $ne: req.params.id } });
            if (existingAdmin) return res.status(400).json({ error: 'Email already exists' });
        }

        const update = {};
        if (typeof name === 'string') update.name = name.trim();
        if (typeof email === 'string') update.email = email.trim();

        const admin = await Admin.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        res.json({ message: 'Admin profile updated', admin });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/admin/profile/:id/avatar', profileImageUpload, async (req, res) => {
    try {
        const uploadedImage = getUploadedProfileImage(req);
        if (!uploadedImage) return res.status(400).json({ error: 'Profile image is required' });

        const cloudinaryResult = await uploadProfileImageToCloudinary(uploadedImage, 'smart-healthcare/admin-avatars');
        const avatarUrl = cloudinaryResult.secure_url;

        const admin = await Admin.findByIdAndUpdate(req.params.id, { avatarUrl }, { new: true }).select('-password');
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        res.json({ message: 'Avatar updated', avatarUrl, admin });
    } catch (err) {
        const status = err.message && err.message.includes('Cloudinary is not configured') ? 503 : 500;
        res.status(status).json({ error: err.message });
    }
});

app.put('/admin/change-password/:id', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (String(newPassword).length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'New password must be different from current password' });
        }

        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

        admin.password = await bcrypt.hash(newPassword, 10);
        await admin.save();

        res.json({ message: 'Password updated successfully' });
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
        const { name, age, contactNumber, allergies } = req.body;
        const update = { name, age, contactNumber };
        if (allergies !== undefined) update.allergies = allergies;
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true }
        ).select('-password');
        
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        res.json({ message: 'Profile updated', patient });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/profile/:id/avatar', profileImageUpload, async (req, res) => {
    try {
        const uploadedImage = getUploadedProfileImage(req);
        if (!uploadedImage) return res.status(400).json({ error: 'Profile image is required' });

        const cloudinaryResult = await uploadProfileImageToCloudinary(uploadedImage, 'smart-healthcare/patient-avatars');
        const avatarUrl = cloudinaryResult.secure_url;

        const patient = await Patient.findByIdAndUpdate(req.params.id, { avatarUrl }, { new: true }).select('-password');
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        res.json({ message: 'Avatar updated', avatarUrl, patient });
    } catch (err) {
        const status = err.message && err.message.includes('Cloudinary is not configured') ? 503 : 500;
        res.status(status).json({ error: err.message });
    }
});

app.put('/change-password/:id', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (String(newPassword).length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'New password must be different from current password' });
        }

        const patient = await Patient.findById(req.params.id);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const isMatch = await bcrypt.compare(currentPassword, patient.password);
        if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

        patient.password = await bcrypt.hash(newPassword, 10);
        await patient.save();

        res.json({ message: 'Password updated successfully' });
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
            url: `/api/patients/uploads/${req.file.filename}`,
            category: req.body.category || 'Other',
            doctorId: req.body.doctorId || ''
        };

        patient.reports.push(newReport);
        await patient.save();

        const savedReport = patient.reports[patient.reports.length - 1];
        res.status(201).json({ message: 'Report uploaded successfully', report: savedReport });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a medical report
app.delete('/report/:patientId/:reportId', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const reportIndex = patient.reports.findIndex(r => r._id.toString() === req.params.reportId);
        if (reportIndex === -1) return res.status(404).json({ error: 'Report not found' });

        // Remove file from disk
        const reportFile = patient.reports[reportIndex];
        const filePath = path.join(uploadDir, reportFile.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        patient.reports.splice(reportIndex, 1);
        await patient.save();
        res.json({ message: 'Report deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get reports assigned to a specific doctor (across all patients)
app.get('/reports/doctor/:doctorId', async (req, res) => {
    try {
        const patients = await Patient.find({ 'reports.doctorId': req.params.doctorId }).select('-password');
        const results = [];
        patients.forEach(patient => {
            patient.reports
                .filter(r => r.doctorId === req.params.doctorId)
                .forEach(report => {
                    results.push({
                        ...report.toObject(),
                        patientId: patient._id,
                        patientName: patient.name
                    });
                });
        });
        results.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        res.json(results);
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

app.use((err, req, res, next) => {
    if (err && err.message && (err.message.includes('Only image files are allowed') || err.message.includes('File too large'))) {
        return res.status(400).json({ error: err.message });
    }
    if (err && err.name === 'MulterError') {
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        return res.status(500).json({ error: err.message || 'Server error' });
    }
    next();
});

// Seed Admin if not exists
const seedAdmin = async () => {
    try {
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const defaultAdmin = new Admin({
                name: 'System Administrator',
                email: 'admin@smarthealth.com',
                password: hashedPassword
            });
            await defaultAdmin.save();
            console.log('Default admin seeded: admin@smarthealth.com / admin123');
        }
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
};

app.listen(PORT, () => {
    console.log(`Patient Service listening on port ${PORT}`);
    seedAdmin();
});
