require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));

// Basic middleware to parse JSON is NOT applied globally here
// because http-proxy-middleware handles raw requests better if not parsed yet.
// We apply express.json() only to specific routes if needed.

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'supersecret_key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied: Insufficient privileges' });
        }
        next();
    };
};

// --- PROXY ROUTES ---
// Gateway Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway is running' });
});

// Admin specific routes from services (protected by role)
app.get('/api/patients/stats', authenticateToken, requireRole(['admin']), createProxyMiddleware({
    target: process.env.PATIENT_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: () => '/stats'
}));

app.get('/api/doctors/stats', authenticateToken, requireRole(['admin']), createProxyMiddleware({
    target: process.env.DOCTOR_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: () => '/stats'
}));

app.get('/api/doctors/pending', authenticateToken, requireRole(['admin']), createProxyMiddleware({
    target: process.env.DOCTOR_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: () => '/pending'
}));

app.put('/api/doctors/verify/:id', authenticateToken, requireRole(['admin']), createProxyMiddleware({
    target: process.env.DOCTOR_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/doctors': '' }
}));

// Patient Service (Public routes like login/register)
app.use('/api/patients', createProxyMiddleware({
    target: process.env.PATIENT_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
}));

// Doctor Service (Public routes like list/login/register)
app.use('/api/doctors', createProxyMiddleware({
    target: process.env.DOCTOR_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
}));

// Appointment Service
app.use('/api/appointments', authenticateToken, createProxyMiddleware({
    target: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
}));

// Telemedicine Service
app.use('/api/telemedicine', authenticateToken, createProxyMiddleware({
    target: process.env.TELEMEDICINE_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
}));

// Payment Service
app.use('/api/payments/payhere/notify', createProxyMiddleware({
    target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/payments': '' } // Ensure it maps to /payhere/notify on target
}));

app.use('/api/payments', authenticateToken, createProxyMiddleware({
    target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
}));

// Notification Service (Internal access or triggered by webhook)
app.use('/api/notifications', createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
    changeOrigin: true,
}));

// AI Support & Symptom Checker Service
app.use('/api/ai/support', createProxyMiddleware({
    target: process.env.AI_SERVICE_URL || 'http://localhost:3007',
    changeOrigin: true,
    pathRewrite: () => '/support'
}));

app.use('/api/ai', authenticateToken, createProxyMiddleware({
    target: process.env.AI_SERVICE_URL || 'http://localhost:3007',
    changeOrigin: true,
}));

// Start Gateway
app.listen(PORT, () => {
    console.log(`API Gateway is running on port ${PORT}`);
});
