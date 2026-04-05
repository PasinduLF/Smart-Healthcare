require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://lpasindu30_db_user:SdSjcC0yYyX1JIwj@cluster0.gvxgnvm.mongodb.net/?appName=Cluster0')
    .then(() => console.log('Payment Service connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const transactionSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    description: { type: String, required: true },
    orderId: { type: String, index: true },
    appointmentId: { type: String },
    patientId: { type: String },
    doctorId: { type: String },
    doctorName: { type: String, default: '' },
    status: { type: String, default: 'success' },
    date: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

const pendingPaymentSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    appointmentId: { type: String, required: true },
    patientId: { type: String, required: true },
    doctorId: { type: String, required: true },
    doctorName: { type: String, default: '' },
    date: { type: String, required: true },
    time: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'LKR' },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});
const PendingPayment = mongoose.model('PendingPayment', pendingPaymentSchema);

const doctorServiceUrl = (process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3002').replace(/\/+$/, '');

const normalizeDoctorName = (name = '') => String(name || '').trim();

const withDoctorPrefix = (name = '') => {
    const normalized = normalizeDoctorName(name);
    if (!normalized) return '';
    return /^dr\.?\s/i.test(normalized) ? normalized : `Dr. ${normalized}`;
};

const buildTransactionDescription = (orderId, doctorName) => {
    const doctorLabel = withDoctorPrefix(doctorName);
    return doctorLabel
        ? `PayHere payment for ${orderId} (${doctorLabel})`
        : `PayHere payment for ${orderId}`;
};

const appendDoctorToDescription = (description, doctorName, orderId) => {
    const baseDescription = (typeof description === 'string' && description.trim())
        ? description.trim()
        : `PayHere payment for ${orderId || 'N/A'}`;

    const doctorLabel = withDoctorPrefix(doctorName);
    if (!doctorLabel) return baseDescription;

    const lowerBase = baseDescription.toLowerCase();
    const lowerDoctor = doctorLabel.toLowerCase();
    const lowerName = normalizeDoctorName(doctorName).toLowerCase();

    if (lowerBase.includes(lowerDoctor) || (lowerName && lowerBase.includes(lowerName))) {
        return baseDescription;
    }

    return `${baseDescription} - ${doctorLabel}`;
};

const fetchDoctorNamesByIds = async (doctorIds) => {
    const doctorNamesById = new Map();

    await Promise.all(
        doctorIds.map(async (doctorId) => {
            try {
                const response = await axios.get(`${doctorServiceUrl}/profile/${doctorId}`, { timeout: 4000 });
                const doctorName = normalizeDoctorName(response?.data?.name);
                if (doctorName) {
                    doctorNamesById.set(doctorId, doctorName);
                }
            } catch (err) {
                // Keep history query resilient even if doctor-service lookup fails.
            }
        })
    );

    return doctorNamesById;
};

const buildPayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
    const secretHash = crypto.createHash('md5').update(merchantSecret || '').digest('hex').toUpperCase();
    const hashInput = `${merchantId}${orderId}${amount}${currency}${secretHash}`;
    return crypto.createHash('md5').update(hashInput).digest('hex').toUpperCase();
};

const syncAppointmentPayment = async (payment) => {
    const appointmentServiceUrl = process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3003';
    await axios.put(`${appointmentServiceUrl}/payment/${payment.appointmentId}`);
};

const recordSuccessfulTransaction = async (payment) => {
    const doctorName = normalizeDoctorName(payment.doctorName);
    const description = buildTransactionDescription(payment.orderId, doctorName);

    await Transaction.findOneAndUpdate(
        { orderId: payment.orderId },
        {
            $set: {
                amount: Math.round(payment.amount * 100),
                currency: payment.currency.toLowerCase(),
                description,
                orderId: payment.orderId,
                appointmentId: payment.appointmentId,
                patientId: payment.patientId,
                doctorId: payment.doctorId,
                doctorName,
                status: 'success'
            }
        },
        { upsert: true, new: true }
    );
};

const finalizeSuccessfulPayment = async (payment) => {
    payment.status = 'success';
    await payment.save();
    await syncAppointmentPayment(payment);
    await recordSuccessfulTransaction(payment);
};

app.post('/create-checkout-session', async (req, res) => {
    const { amount, currency, description } = req.body;

    try {
        const transaction = new Transaction({ amount, currency: currency || 'usd', description });
        await transaction.save();

        if (process.env.STRIPE_SECRET_KEY === undefined || process.env.STRIPE_SECRET_KEY === 'sk_test_mock') {
            return res.json({ url: 'http://localhost:5173/payment-success-mock' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: { currency: currency || 'usd', product_data: { name: description }, unit_amount: amount },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'http://localhost:5173/success',
            cancel_url: 'http://localhost:5173/cancel',
        });
        res.json({ id: session.id, url: session.url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/payhere/checkout', async (req, res) => {
    try {
        const {
            appointmentId,
            patientId,
            doctorId,
            date,
            time,
            amount,
            currency,
            doctorName,
            customerName,
            customerEmail,
            customerPhone,
            address,
            city,
            country
        } = req.body;

        if (!appointmentId || !patientId || !doctorId || !date || !time) {
            return res.status(400).json({ error: 'Missing appointment details' });
        }

        const merchantId = (process.env.PAYHERE_MERCHANT_ID || '1220000').trim();
        const merchantSecret = (process.env.PAYHERE_MERCHANT_SECRET || '').trim();
        const amountValue = Number(amount) || 0;
        const amountFormatted = amountValue.toFixed(2);
        const currencyValue = currency || 'LKR';
        const orderId = `APPT-${Date.now()}`;

        if (!merchantId || !merchantSecret) {
            return res.status(400).json({ error: 'PayHere merchant credentials are missing' });
        }

        if (amountValue <= 0) {
            return res.status(400).json({ error: 'Invalid payment amount' });
        }

        await new PendingPayment({
            orderId,
            appointmentId,
            patientId,
            doctorId,
            doctorName: normalizeDoctorName(doctorName),
            date,
            time,
            amount: amountValue,
            currency: currencyValue
        }).save();

        const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const notifyUrl = process.env.PAYHERE_NOTIFY_URL || 'http://localhost:3000/api/payments/payhere/notify';

        const hash = buildPayHereHash(merchantId, orderId, amountFormatted, currencyValue, merchantSecret);

        console.log('PayHere checkout prepared', {
            orderId,
            merchantId,
            amount: amountFormatted,
            currency: currencyValue,
            hash
        });

        res.json({
            actionUrl: 'https://sandbox.payhere.lk/pay/checkout',
            fields: {
                merchant_id: merchantId,
                return_url: `${frontendBaseUrl}/patient/payment-success`,
                cancel_url: `${frontendBaseUrl}/patient/payment`,
                notify_url: notifyUrl,
                order_id: orderId,
                items: `Consultation with ${doctorName || 'Doctor'}`,
                currency: currencyValue,
                amount: amountFormatted,
                first_name: customerName || 'Patient',
                last_name: 'User',
                email: customerEmail || 'patient@example.com',
                phone: customerPhone || '0000000000',
                address: address || 'N/A',
                city: city || 'Colombo',
                country: country || 'Sri Lanka',
                hash
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/payhere/notify', async (req, res) => {
    try {
        const { order_id: orderId, status_code: statusCode } = req.body;
        if (!orderId) return res.status(400).send('Missing order_id');

        const payment = await PendingPayment.findOne({ orderId });
        if (!payment) return res.status(404).send('Order not found');

        if (String(statusCode) === '2') {
            await finalizeSuccessfulPayment(payment);
        } else {
            payment.status = 'failed';
            await payment.save();
        }

        res.send('OK');
    } catch (err) {
        console.error('PayHere notify error:', err.message);
        res.status(500).send('ERROR');
    }
});

app.post('/payhere/confirm', async (req, res) => {
    try {
        const orderId = req.body?.orderId || req.body?.order_id || req.query?.order_id;
        if (!orderId) return res.status(400).json({ error: 'Missing order_id' });

        const payment = await PendingPayment.findOne({ orderId });
        if (!payment) return res.status(404).json({ error: 'Order not found' });

        await finalizeSuccessfulPayment(payment);
        res.json({ message: 'Payment confirmed', orderId });
    } catch (err) {
        console.error('PayHere confirm error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/transactions', async (req, res) => {
    try {
        const txs = await Transaction.find().sort({ date: -1 });
        res.json(txs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/transactions/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        if (!patientId) return res.status(400).json({ error: 'Missing patientId' });

        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

        const directTxs = await Transaction.find({ patientId }).sort({ date: -1 }).limit(limit).lean();

        // Backward compatibility for historical data where Transaction rows were stored
        // without patientId/orderId fields. We reconcile by matching successful pending orders.
        const successfulPendingPayments = await PendingPayment.find({ patientId, status: 'success' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        if (successfulPendingPayments.length === 0) {
            return res.json(directTxs);
        }

        const pendingByOrderId = new Map(
            successfulPendingPayments
                .filter((payment) => payment.orderId)
                .map((payment) => [payment.orderId, payment])
        );

        const directOrderIds = new Set(
            directTxs
                .map((tx) => tx.orderId)
                .filter(Boolean)
        );

        const missingOrderIds = successfulPendingPayments
            .map((payment) => payment.orderId)
            .filter((orderId) => orderId && !directOrderIds.has(orderId));

        if (missingOrderIds.length === 0) {
            return res.json(directTxs);
        }

        const legacyDescriptions = missingOrderIds.map((orderId) => `PayHere payment for ${orderId}`);

        const legacyTxs = await Transaction.find({
            $or: [
                { orderId: { $in: missingOrderIds } },
                { description: { $in: legacyDescriptions } }
            ]
        }).sort({ date: -1 }).lean();

        const enrichedLegacyTxs = legacyTxs.map((tx) => {
            let resolvedOrderId = tx.orderId;
            if (!resolvedOrderId && typeof tx.description === 'string') {
                const prefix = 'PayHere payment for ';
                if (tx.description.startsWith(prefix)) {
                    resolvedOrderId = tx.description.slice(prefix.length).split(' ')[0];
                }
            }

            const paymentMeta = resolvedOrderId ? pendingByOrderId.get(resolvedOrderId) : null;

            return {
                ...tx,
                orderId: resolvedOrderId || tx.orderId,
                appointmentId: tx.appointmentId || paymentMeta?.appointmentId,
                patientId: tx.patientId || paymentMeta?.patientId || patientId,
                doctorId: tx.doctorId || paymentMeta?.doctorId,
                doctorName: normalizeDoctorName(tx.doctorName || paymentMeta?.doctorName)
            };
        });

        const mergedById = new Map();
        [...directTxs, ...enrichedLegacyTxs].forEach((tx) => {
            const key = String(tx._id || '') || `${tx.orderId || ''}:${tx.date || ''}:${tx.amount || ''}`;
            if (!mergedById.has(key)) {
                mergedById.set(key, tx);
            }
        });

        const mergedTxs = Array.from(mergedById.values())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limit);

        const doctorIdsToResolve = Array.from(
            new Set(
                mergedTxs
                    .filter((tx) => tx.doctorId && !normalizeDoctorName(tx.doctorName))
                    .map((tx) => tx.doctorId)
            )
        );

        const doctorNamesById = doctorIdsToResolve.length > 0
            ? await fetchDoctorNamesByIds(doctorIdsToResolve)
            : new Map();

        const displayTxs = mergedTxs.map((tx) => {
            const resolvedDoctorName = normalizeDoctorName(tx.doctorName || doctorNamesById.get(tx.doctorId));
            return {
                ...tx,
                doctorName: resolvedDoctorName,
                description: appendDoctorToDescription(tx.description, resolvedDoctorName, tx.orderId)
            };
        });

        res.json(displayTxs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'Payment Service is running' });
});

app.listen(PORT, () => console.log(`Payment Service listening on port ${PORT}`));
