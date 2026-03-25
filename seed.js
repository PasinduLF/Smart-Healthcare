/**
 * Seed Script — creates sample Patient, Doctor (auto-verified), and Admin accounts
 * 
 * Usage:  node seed.js
 * 
 * Prerequisites: All services must be running (docker compose up -d)
 */

const axios = require('axios');

const API = 'http://localhost:3000';

const patients = [
    { name: 'Alice Johnson', email: 'alice@test.com', password: 'password123' },
    { name: 'Bob Williams', email: 'bob@test.com', password: 'password123' },
];

const doctors = [
    { name: 'Sarah Chen', email: 'sarah@test.com', password: 'password123', specialty: 'Cardiology', maxPatients: 15 },
    { name: 'James Wilson', email: 'james@test.com', password: 'password123', specialty: 'Dermatology', maxPatients: 12 },
    { name: 'Emily Park', email: 'emily@test.com', password: 'password123', specialty: 'General Medicine', maxPatients: 20 },
    { name: 'Rahul', email: 'rahul@gmail.com', password: 'Rahul@123', specialty: 'Neurology', maxPatients: 18 },
];

const admin = { name: 'Admin User', email: 'admin@test.com', password: 'admin123', role: 'admin' };

async function seed() {
    console.log('=== SmartHealthCare Seed Script ===\n');

    // 1. Register patients
    console.log('--- Registering Patients ---');
    const patientIds = [];
    for (const p of patients) {
        try {
            const res = await axios.post(`${API}/api/patients/register`, p);
            const id = res.data.patient.id;
            patientIds.push(id);
            console.log(`  ✓ Patient "${p.name}" created (ID: ${id})`);
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            console.log(`  ⚠ Patient "${p.name}": ${msg}`);
        }
    }

    // 2. Update Alice with health profile and sample report note
    if (patientIds[0]) {
        try {
            await axios.put(`${API}/api/patients/profile/${patientIds[0]}`, { name: 'Alice Johnson', age: 30, contactNumber: '+1 555 100 2000' });
            await axios.put(`${API}/api/patients/health-profile/${patientIds[0]}`, {
                vitals: { bloodPressure: '120/80', heartRate: '72', weight: '65', height: '168' },
                allergies: ['Penicillin', 'Peanuts']
            });
            console.log('  ✓ Alice health profile updated (vitals + allergies)');
        } catch (err) { console.log('  ⚠ Could not update Alice profile:', err.response?.data?.error || err.message); }
    }

    // 3. Register doctors
    console.log('\n--- Registering Doctors ---');
    const doctorIds = [];
    for (const d of doctors) {
        try {
            const res = await axios.post(`${API}/api/doctors/register`, d);
            const id = res.data.doctor.id;
            doctorIds.push(id);
            console.log(`  ✓ Doctor "${d.name}" created (ID: ${id})`);
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            console.log(`  ⚠ Doctor "${d.name}": ${msg}`);
            // Try to login to get the ID if already exists
            try {
                const loginRes = await axios.post(`${API}/api/doctors/login`, { email: d.email, password: d.password });
                doctorIds.push(loginRes.data.doctor.id);
            } catch { doctorIds.push(null); }
        }
    }

    // 4. Auto-verify all doctors
    console.log('\n--- Verifying Doctors ---');
    for (let i = 0; i < doctorIds.length; i++) {
        if (!doctorIds[i]) continue;
        try {
            await axios.put(`${API}/api/doctors/verify/${doctorIds[i]}`);
            console.log(`  ✓ Dr. ${doctors[i].name} verified`);
        } catch (err) { console.log(`  ⚠ Could not verify Dr. ${doctors[i].name}:`, err.response?.data?.error || err.message); }
    }

    // 5. Set doctor profiles (availability, phone, experience)
    console.log('\n--- Updating Doctor Profiles ---');
    const profiles = [
        { experience: 12, availability: 'Mon-Fri 9AM-5PM', phone: '+1 555 200 3001' },
        { experience: 8, availability: 'Tue-Sat 10AM-6PM', phone: '+1 555 200 3002' },
        { experience: 15, availability: 'Mon-Sat 8AM-4PM', phone: '+1 555 200 3003' },
        { experience: 10, availability: 'Mon-Fri 11AM-7PM', phone: '+1 555 200 3004' },
    ];
    for (let i = 0; i < doctorIds.length; i++) {
        if (!doctorIds[i]) continue;
        try {
            await axios.put(`${API}/api/doctors/profile/${doctorIds[i]}`, profiles[i]);
            console.log(`  ✓ Dr. ${doctors[i].name} profile updated`);
        } catch (err) { console.log(`  ⚠ Could not update Dr. ${doctors[i].name}:`, err.response?.data?.error || err.message); }
    }

    // 6. Register admin patient account (role is set via manual DB update or gateway)
    console.log('\n--- Registering Admin ---');
    try {
        await axios.post(`${API}/api/patients/register`, admin);
        console.log(`  ✓ Admin "${admin.name}" created`);
    } catch (err) {
        console.log(`  ⚠ Admin: ${err.response?.data?.error || err.message}`);
    }

    // 7. Create a sample appointment (Alice → Dr. Sarah)
    if (patientIds[0] && doctorIds[0]) {
        console.log('\n--- Creating Sample Appointment ---');
        try {
            // Login as Alice to get token
            const loginRes = await axios.post(`${API}/api/patients/login`, { email: 'alice@test.com', password: 'password123' });
            const token = loginRes.data.token;

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];

            const apptRes = await axios.post(`${API}/api/appointments/book`, {
                patientId: patientIds[0],
                doctorId: doctorIds[0],
                date: dateStr,
                time: '10:00'
            }, { headers: { Authorization: `Bearer ${token}` } });
            console.log(`  ✓ Appointment booked: Alice → Dr. Sarah on ${dateStr} at 10:00`);
            console.log(`    (Appointment ID: ${apptRes.data.appointment._id})`);
        } catch (err) { console.log(`  ⚠ Appointment: ${err.response?.data?.error || err.message}`); }
    }

    // Summary
    console.log('\n=== Seed Complete ===');
    console.log('\nTest Accounts:');
    console.log('┌──────────────┬────────────────────┬───────────────┬──────────┐');
    console.log('│ Role         │ Name               │ Email         │ Password │');
    console.log('├──────────────┼────────────────────┼───────────────┼──────────┤');
    console.log('│ Patient      │ Alice Johnson      │ alice@test.com│ password123 │');
    console.log('│ Patient      │ Bob Williams       │ bob@test.com  │ password123 │');
    console.log('│ Doctor       │ Dr. Sarah Chen     │ sarah@test.com│ password123 │');
    console.log('│ Doctor       │ Dr. James Wilson   │ james@test.com│ password123 │');
    console.log('│ Doctor       │ Dr. Emily Park     │ emily@test.com│ password123 │');
    console.log('│ Doctor       │ Dr. Rahul          │ rahul@gmail.com│ Rahul@123  │');
    console.log('│ Admin        │ Admin User         │ admin@test.com│ admin123    │');
    console.log('└──────────────┴────────────────────┴───────────────┴──────────┘');
    console.log('\nOpen http://localhost:5173 to test');
}

seed().catch(err => console.error('Seed failed:', err.message));
