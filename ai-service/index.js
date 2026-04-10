require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json());

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://lpasindu30_db_user:SdSjcC0yYyX1JIwj@cluster0.gvxgnvm.mongodb.net/smart-health-ai?appName=Cluster0';
mongoose.connect(MONGO_URI)
    .then(() => console.log('AI Service connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Symptom Check History Schema ---
const symptomCheckSchema = new mongoose.Schema({
    patientId: { type: String, required: true },
    symptoms: { type: String, required: true },
    severity: { type: String, enum: ['low', 'moderate', 'high', 'emergency'], default: 'low' },
    possibleConditions: [{ name: String, probability: String, description: String }],
    riskFactors: [String],
    recommendations: [String],
    recommendedSpecialty: String,
    lifestyleAdvice: [String],
    whenToSeekEmergencyCare: [String],
    fullAnalysis: String,
    disclaimer: String,
    createdAt: { type: Date, default: Date.now }
});
const SymptomCheck = mongoose.model('SymptomCheck', symptomCheckSchema);

// --- AI Setup ---
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

const DEFAULT_GEMINI_MODELS = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash'
].filter(Boolean);

const isRetriableModelError = (err) => {
    const msg = (err && err.message ? err.message : '').toLowerCase();
    return msg.includes('404') || msg.includes('not found') || msg.includes('not supported');
};

const runWithGeminiModelFallback = async (runner) => {
    let lastErr;

    for (const modelName of DEFAULT_GEMINI_MODELS) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: modelName });
            return await runner(model, modelName);
        } catch (err) {
            lastErr = err;
            if (!isRetriableModelError(err)) {
                throw err;
            }
            console.warn(`Gemini model ${modelName} unavailable, trying next fallback.`);
        }
    }

    throw lastErr || new Error('No supported Gemini model available.');
};

const symptomDictionary = {
    "fever": { specialty: "General Physician / Infectious Disease Specialist", severity: "moderate" },
    "headache": { specialty: "Neurologist / General Physician", severity: "low" },
    "chest pain": { specialty: "Cardiologist", severity: "high" },
    "skin rash": { specialty: "Dermatologist", severity: "low" },
    "stomach ache": { specialty: "Gastroenterologist", severity: "moderate" },
    "shortness of breath": { specialty: "Pulmonologist / Cardiologist", severity: "high" },
    "dizziness": { specialty: "Neurologist / ENT Specialist", severity: "moderate" },
    "back pain": { specialty: "Orthopedic / General Physician", severity: "low" },
    "cough": { specialty: "General Physician / Pulmonologist", severity: "low" },
    "fatigue": { specialty: "General Physician / Endocrinologist", severity: "low" },
    "nausea": { specialty: "Gastroenterologist", severity: "moderate" },
    "joint pain": { specialty: "Rheumatologist / Orthopedic", severity: "moderate" },
    "anxiety": { specialty: "Psychiatrist / Psychologist", severity: "moderate" },
    "blurred vision": { specialty: "Ophthalmologist", severity: "moderate" },
    "sore throat": { specialty: "ENT Specialist / General Physician", severity: "low" }
};

// --- MAIN ENDPOINT: AI Symptom Check ---
app.post('/check-symptoms', async (req, res) => {
    const { symptoms, patientProfile, patientId } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Symptoms are required' });

    // --- Try Gemini AI first ---
    if (process.env.GEMINI_API_KEY) {
        try {
            let contextStr = "Patient Context: No additional history provided.";
            if (patientProfile) {
                contextStr = `Patient Context:
- Age: ${patientProfile.age || 'N/A'}
- Vitals: BP ${patientProfile.vitals?.bloodPressure || 'N/A'}, HR ${patientProfile.vitals?.heartRate || 'N/A'}, Weight ${patientProfile.vitals?.weight || 'N/A'}kg, Height ${patientProfile.vitals?.height || 'N/A'}cm
- Allergies: ${(patientProfile.allergies || []).join(', ') || 'None reported'}`;
            }

            const prompt = `You are an advanced medical AI diagnostic assistant. A patient reports the following symptoms:
"${symptoms}"

${contextStr}

You MUST respond ONLY with valid JSON in this exact structure (no markdown, no code fences, just raw JSON):
{
  "severity": "low|moderate|high|emergency",
  "possibleConditions": [
    { "name": "Condition Name", "probability": "High|Medium|Low", "description": "Brief explanation" }
  ],
  "riskFactors": ["risk factor 1", "risk factor 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "recommendedSpecialty": "Specialty Name",
  "lifestyleAdvice": ["advice 1", "advice 2"],
  "whenToSeekEmergencyCare": ["warning sign 1", "warning sign 2"],
  "fullAnalysis": "A comprehensive 2-3 paragraph analysis of the symptoms, potential causes, and medical reasoning."
}

Rules:
- Provide 2-4 possible conditions ranked by probability
- Severity must be one of: low, moderate, high, emergency
- Consider the patient's vitals and allergies when making assessments
- Include at least 2 lifestyle advice items
- Include at least 2 emergency warning signs to watch for
- The fullAnalysis should be detailed and professional`;

            let rawText = await runWithGeminiModelFallback(async (model, modelName) => {
                const result_ai = await model.generateContent(prompt);
                const response_ai = await result_ai.response;
                console.log(`Gemini model used for symptom check: ${modelName}`);
                return response_ai.text().trim();
            });

            // Strip markdown code fences if present
            if (rawText.startsWith('```')) {
                rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(rawText);

            const result = {
                severity: parsed.severity || 'moderate',
                possibleConditions: parsed.possibleConditions || [],
                riskFactors: parsed.riskFactors || [],
                recommendations: parsed.recommendations || [],
                recommendedSpecialty: parsed.recommendedSpecialty || 'General Physician',
                lifestyleAdvice: parsed.lifestyleAdvice || [],
                whenToSeekEmergencyCare: parsed.whenToSeekEmergencyCare || [],
                analysis: parsed.fullAnalysis || 'Analysis unavailable.',
                recommendation: parsed.recommendedSpecialty || 'General Physician',
                disclaimer: "⚠️ This is an AI-generated preliminary assessment and does NOT constitute medical advice. Always consult a licensed healthcare professional for diagnosis and treatment."
            };

            // Save to history
            if (patientId) {
                try {
                    await SymptomCheck.create({
                        patientId,
                        symptoms,
                        severity: result.severity,
                        possibleConditions: result.possibleConditions,
                        riskFactors: result.riskFactors,
                        recommendations: result.recommendations,
                        recommendedSpecialty: result.recommendedSpecialty,
                        lifestyleAdvice: result.lifestyleAdvice,
                        whenToSeekEmergencyCare: result.whenToSeekEmergencyCare,
                        fullAnalysis: result.analysis,
                        disclaimer: result.disclaimer
                    });
                } catch (saveErr) {
                    console.error('Failed to save symptom check history:', saveErr);
                }
            }

            return res.json(result);
        } catch (err) {
            console.error('Gemini API Error:', err.message);
            // Fallthrough to dictionary
        }
    }

    // --- FALLBACK: Dictionary-based analysis ---
    const lowerSymptoms = symptoms.toLowerCase();
    let matchedSpecialty = "General Physician";
    let matchedSeverity = "low";
    const matchedConditions = [];

    for (const [key, value] of Object.entries(symptomDictionary)) {
        if (lowerSymptoms.includes(key)) {
            matchedSpecialty = value.specialty;
            matchedSeverity = value.severity;
            matchedConditions.push({
                name: key.charAt(0).toUpperCase() + key.slice(1) + '-related condition',
                probability: 'Medium',
                description: `Your symptoms mention "${key}", which commonly requires a ${value.specialty}.`
            });
        }
    }

    const fallbackResult = {
        severity: matchedSeverity,
        possibleConditions: matchedConditions.length > 0 ? matchedConditions : [{ name: 'General Assessment Needed', probability: 'N/A', description: 'Your symptoms require an in-person evaluation.' }],
        riskFactors: ['Incomplete data — visit a doctor for a complete assessment'],
        recommendations: ['Schedule an appointment with the recommended specialist', 'Keep track of symptom changes'],
        recommendedSpecialty: matchedSpecialty,
        lifestyleAdvice: ['Stay hydrated and get adequate rest', 'Maintain a balanced diet'],
        whenToSeekEmergencyCare: ['If symptoms worsen suddenly', 'If you experience difficulty breathing or chest pain'],
        analysis: `Based on keyword matching, your symptoms suggest you should consult a ${matchedSpecialty}. This is a basic assessment — for a comprehensive AI-powered analysis, ensure the Gemini API key is configured.`,
        recommendation: matchedSpecialty,
        disclaimer: "⚠️ This is a basic dictionary-based assessment and does NOT constitute medical advice. Please consult a healthcare professional."
    };

    // Save fallback to history too
    if (patientId) {
        try {
            await SymptomCheck.create({ patientId, symptoms, severity: matchedSeverity, recommendedSpecialty: matchedSpecialty, fullAnalysis: fallbackResult.analysis, disclaimer: fallbackResult.disclaimer });
        } catch (saveErr) {
            console.error('Failed to save symptom check history:', saveErr);
        }
    }

    res.json(fallbackResult);
});

// --- AI Prescription Suggestion Endpoint ---
app.post('/suggest-prescription', async (req, res) => {
    const { symptoms, allergies, pastPrescriptions } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Symptoms are required' });

    // Build allergy set for conflict detection
    const allergySet = (allergies || []).map(a => a.toLowerCase());

    // Common medication database for fallback
    const medicationDB = {
        'fever': [{ name: 'Paracetamol 500mg', dosage: 'Twice daily after meals', reason: 'Antipyretic for fever reduction' }, { name: 'Ibuprofen 200mg', dosage: 'As needed, max 3 times daily', reason: 'Anti-inflammatory and antipyretic' }],
        'headache': [{ name: 'Paracetamol 500mg', dosage: 'Twice daily', reason: 'Pain relief' }, { name: 'Aspirin 325mg', dosage: 'Once daily', reason: 'Analgesic' }],
        'cough': [{ name: 'Dextromethorphan 10mg/5ml', dosage: '10ml every 6 hours', reason: 'Cough suppressant' }, { name: 'Ambroxol 30mg', dosage: 'Twice daily', reason: 'Mucolytic agent' }],
        'cold': [{ name: 'Cetirizine 10mg', dosage: 'Once daily', reason: 'Antihistamine for cold symptoms' }, { name: 'Pseudoephedrine 60mg', dosage: 'Twice daily', reason: 'Nasal decongestant' }],
        'stomach': [{ name: 'Omeprazole 20mg', dosage: 'Once daily before breakfast', reason: 'Proton pump inhibitor' }, { name: 'Antacid Suspension', dosage: '10ml after meals', reason: 'Acid neutralizer' }],
        'infection': [{ name: 'Amoxicillin 500mg', dosage: 'Three times daily for 7 days', reason: 'Broad-spectrum antibiotic' }, { name: 'Azithromycin 500mg', dosage: 'Once daily for 3 days', reason: 'Macrolide antibiotic' }],
        'pain': [{ name: 'Ibuprofen 400mg', dosage: 'Twice daily after meals', reason: 'NSAID for pain relief' }, { name: 'Diclofenac 50mg', dosage: 'Twice daily', reason: 'Anti-inflammatory analgesic' }],
        'allergy': [{ name: 'Cetirizine 10mg', dosage: 'Once daily at night', reason: 'Second-gen antihistamine' }, { name: 'Loratadine 10mg', dosage: 'Once daily', reason: 'Non-drowsy antihistamine' }],
        'anxiety': [{ name: 'Alprazolam 0.25mg', dosage: 'As needed, max twice daily', reason: 'Anxiolytic' }],
        'diabetes': [{ name: 'Metformin 500mg', dosage: 'Twice daily with meals', reason: 'Blood sugar regulation' }],
        'hypertension': [{ name: 'Amlodipine 5mg', dosage: 'Once daily', reason: 'Calcium channel blocker' }, { name: 'Losartan 50mg', dosage: 'Once daily', reason: 'ARB for blood pressure' }],
        'skin': [{ name: 'Hydrocortisone Cream 1%', dosage: 'Apply twice daily', reason: 'Topical anti-inflammatory' }, { name: 'Cetirizine 10mg', dosage: 'Once daily', reason: 'Antihistamine for itching' }],
    };

    // Known allergy-drug conflicts
    const allergyConflicts = {
        'penicillin': ['Amoxicillin', 'Ampicillin', 'Penicillin'],
        'aspirin': ['Aspirin', 'Ibuprofen', 'Diclofenac', 'Naproxen'],
        'nsaid': ['Ibuprofen', 'Diclofenac', 'Aspirin', 'Naproxen'],
        'sulfa': ['Sulfamethoxazole', 'Sulfasalazine'],
        'ibuprofen': ['Ibuprofen'],
        'codeine': ['Codeine'],
        'morphine': ['Morphine', 'Codeine'],
        'latex': [],
        'egg': [],
        'peanut': [],
    };

    // Try Gemini AI first
    if (process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `You are a clinical pharmacology AI assistant helping a doctor write a prescription.

Patient symptoms: "${symptoms}"
Patient allergies: ${allergies?.length ? allergies.join(', ') : 'None reported'}
Past prescriptions: ${pastPrescriptions?.length ? pastPrescriptions.map(p => p.medication).join(', ') : 'None'}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "suggestions": [
    { "name": "Drug name with dosage", "dosage": "Frequency and duration", "reason": "Clinical reason" }
  ],
  "allergyWarnings": [
    { "drug": "Drug name", "allergen": "Allergy that conflicts", "severity": "high|medium", "message": "Warning description" }
  ],
  "notes": "Brief clinical note about the prescription approach"
}

Rules:
- Suggest 2-4 medications appropriate for the symptoms
- CHECK every suggested drug against the patient's allergies — flag ANY conflicts
- Consider past prescriptions to avoid duplicates and interactions
- Include dosage instructions
- This is a SUGGESTION only — the doctor makes the final decision`;

            const result_ai = await model.generateContent(prompt);
            const response_ai = await result_ai.response;
            let rawText = response_ai.text().trim();
            if (rawText.startsWith('```')) {
                rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }
            const parsed = JSON.parse(rawText);
            return res.json({
                suggestions: parsed.suggestions || [],
                allergyWarnings: parsed.allergyWarnings || [],
                notes: parsed.notes || '',
                source: 'ai'
            });
        } catch (err) {
            console.error('Gemini prescription suggestion error:', err.message);
        }
    }

    // Fallback: dictionary-based suggestions
    const lowerSymptoms = symptoms.toLowerCase();
    const suggestions = [];
    const allergyWarnings = [];

    for (const [keyword, meds] of Object.entries(medicationDB)) {
        if (lowerSymptoms.includes(keyword)) {
            meds.forEach(med => {
                // Check for allergy conflicts
                let conflicted = false;
                for (const allergy of allergySet) {
                    const conflicts = allergyConflicts[allergy] || [];
                    if (conflicts.some(c => med.name.toLowerCase().includes(c.toLowerCase()))) {
                        allergyWarnings.push({
                            drug: med.name,
                            allergen: allergy,
                            severity: 'high',
                            message: `${med.name} may conflict with patient's ${allergy} allergy`
                        });
                        conflicted = true;
                    }
                }
                // Check if already prescribed
                const alreadyPrescribed = (pastPrescriptions || []).some(p =>
                    p.medication && p.medication.toLowerCase().includes(med.name.split(' ')[0].toLowerCase())
                );
                if (!alreadyPrescribed) {
                    suggestions.push({ ...med, conflicted });
                }
            });
        }
    }

    if (suggestions.length === 0) {
        suggestions.push({ name: 'General consultation recommended', dosage: 'N/A', reason: 'Symptoms require clinical evaluation before prescribing' });
    }

    res.json({
        suggestions: suggestions.slice(0, 4),
        allergyWarnings,
        notes: 'Dictionary-based suggestion. For AI-powered suggestions, configure Gemini API key.',
        source: 'dictionary'
    });
});

// --- GET Symptom History for a Patient ---
app.get('/history/:patientId', async (req, res) => {
    try {
        const history = await SymptomCheck.find({ patientId: req.params.patientId }).sort({ createdAt: -1 }).limit(20);
        res.json(history);
    } catch (err) {
        console.error('Failed to fetch symptom history:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// --- DELETE a single symptom check ---
app.delete('/history/:id', async (req, res) => {
    try {
        await SymptomCheck.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to delete symptom check:', err);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// --- DELETE all symptom checks for a patient ---
app.delete('/history/patient/:patientId', async (req, res) => {
    try {
        await SymptomCheck.deleteMany({ patientId: req.params.patientId });
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to clear symptom history:', err);
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

// --- CAREBOT: Groq-powered symptom chat ---
app.post('/carebot', async (req, res) => {
    const { symptoms, patientId } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Symptoms are required' });

    // Check if Groq is available
    if (!process.env.GROQ_API_KEY) {
        console.error('CareBot Error: GROQ_API_KEY not set');
        return res.json({
            severity: 'low',
            possibleConditions: ['AI service temporarily unavailable'],
            recommendedSpecialty: 'General Physician',
            advice: ['Please consult a healthcare professional directly', 'Monitor your symptoms'],
            urgentSigns: ['Severe symptoms', 'Sudden changes', 'Difficulty breathing']
        });
    }

    const ALLOWED_SPECIALTIES = [
        'General Physician', 'Dentist', 'ENT Specialist', 'Dermatologist',
        'Cardiologist', 'Neurologist', 'Orthopedic Surgeon', 'Pediatrician', 'Gynecologist'
    ];

    const prompt = `You are CareBot, a medical AI symptom checker. A patient reports: "${symptoms}"

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "severity": "low|medium|high",
  "possibleConditions": ["condition1", "condition2"],
  "recommendedSpecialty": "one from the allowed list",
  "advice": ["advice1", "advice2"],
  "urgentSigns": ["sign1", "sign2"]
}

Rules:
- severity must be exactly: low, medium, or high
- recommendedSpecialty MUST be one of: ${ALLOWED_SPECIALTIES.join(', ')}. If unsure, use "General Physician"
- possibleConditions: 2-4 items
- advice: 2-4 practical tips
- urgentSigns: 2-3 warning signs to watch for`;

    try {
        console.log('CareBot: Calling Groq API for symptoms:', symptoms.substring(0, 50));
        
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            max_tokens: 512,
            temperature: 0.4
        });

        let rawText = completion.choices[0]?.message?.content?.trim() || '';
        console.log('CareBot: Groq raw response:', rawText.substring(0, 200));

        // Strip markdown code fences
        if (rawText.includes('```')) {
            rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }

        // Extract JSON object if there's surrounding text
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('CareBot: No JSON found in response:', rawText.substring(0, 200));
            throw new Error('No JSON found in response');
        }
        rawText = jsonMatch[0];

        let parsed;
        try {
            parsed = JSON.parse(rawText);
            console.log('CareBot: Successfully parsed JSON');
        } catch (parseErr) {
            console.error('CareBot: JSON parse failed:', parseErr.message);
            console.error('CareBot: Raw text was:', rawText.substring(0, 200));
            throw parseErr;
        }

        // Enforce allowed specialty
        if (!ALLOWED_SPECIALTIES.includes(parsed.recommendedSpecialty)) {
            parsed.recommendedSpecialty = 'General Physician';
        }

        const result = {
            severity: parsed.severity || 'low',
            possibleConditions: parsed.possibleConditions || [],
            recommendedSpecialty: parsed.recommendedSpecialty,
            advice: parsed.advice || [],
            urgentSigns: parsed.urgentSigns || []
        };

        // Save to history
        if (patientId) {
            try {
                await SymptomCheck.create({
                    patientId,
                    symptoms,
                    severity: result.severity === 'medium' ? 'moderate' : result.severity,
                    recommendedSpecialty: result.recommendedSpecialty,
                    recommendations: result.advice,
                    whenToSeekEmergencyCare: result.urgentSigns,
                    fullAnalysis: JSON.stringify(result)
                });
            } catch (saveErr) {
                console.error('Failed to save carebot history:', saveErr);
            }
        }

        return res.json(result);
    } catch (err) {
        console.error('CareBot Error:', err.message);
        console.error('CareBot Full Error:', err);
        
        // Fallback response if AI fails
        const fallbackResult = {
            severity: 'low',
            possibleConditions: ['Unable to analyze - please consult a doctor'],
            recommendedSpecialty: 'General Physician',
            advice: ['Consult a healthcare professional for proper diagnosis', 'Monitor your symptoms closely'],
            urgentSigns: ['Severe pain', 'High fever', 'Difficulty breathing']
        };
        
        return res.json(fallbackResult);
    }
});

// --- Health Check ---
app.get('/health', (req, res) => {
    res.json({ status: 'AI Symptom Checker Service is running', geminiEnabled: !!process.env.GEMINI_API_KEY });
});

// --- SYSTEM SUPPORT CHAT ---
const systemKnowledgeBase = `
You are the Smart Healthcare Platform Assistant. Your ONLY goal is to help users navigate and use the Smart Healthcare system.
If a user asks a question NOT related to the system or health, politely redirect them.

SYSTEM MANUAL:
1. Registration & Login:
   - Users can join as a Patient or a Doctor.
   - Admins can log in through the standard portal using their credentials.
   - Profile management is available in the top-right user menu.

2. Booking Appointments:
   - Go to "Find Doctors" to search by specialty.
   - Select a doctor, choose an available time slot, and proceed to payment.
   - Payments are handled via PayHere (Visa/MasterCard/Amex).

3. AI Symptom Checker (AI Analyzer):
   - Access the "AI Checker" link in the navbar.
   - Describe your symptoms in detail.
   - The AI provides a preliminary assessment and recommends a specialist. 
   - NOTE: This is NOT medical advice, only a suggestion.

4. Telemedicine & Appointments:
   - Navigate to "My Appointments" to see your scheduled sessions.
   - For video consultations, click "Start Call" when your appointment time arrives.
   - Doctors can issue Digital Prescriptions during or after the call.

5. Medical Reports:
   - Patients can upload PDFs/Images to "Medical Reports".
   - Doctors assigned to your appointment can view these reports.

6. Refunds & Support:
   - For all payment issues or account problems, use the "Contact" page to reach administration.
   - The system is online 24/7.
`;

const getOfflineSupportResponse = (message = '') => {
    const text = message.toLowerCase();

    if (text.includes('book') || text.includes('appointment') || text.includes('find doctor')) {
        return 'You can book an appointment in 3 steps: open "Find Doctors", choose a specialist and available time slot, then complete payment. After booking, check "My Appointments" for updates.';
    }

    if (text.includes('login') || text.includes('register') || text.includes('sign up') || text.includes('account')) {
        return 'Use the main portal to register or log in as Patient or Doctor. Admin users also log in from the same portal with their credentials. After login, you can manage your profile from the top-right user menu.';
    }

    if (text.includes('ai') || text.includes('symptom') || text.includes('analyzer') || text.includes('checker')) {
        return 'To use the AI Symptom Checker, open the "AI Checker" link in the navbar and describe your symptoms in detail. It will provide a preliminary assessment and suggest a specialist. This is guidance only, not a medical diagnosis.';
    }

    if (text.includes('call') || text.includes('video') || text.includes('telemedicine')) {
        return 'For telemedicine, open "My Appointments" and click "Start Call" when the scheduled time arrives. Doctors can issue digital prescriptions during or after the consultation.';
    }

    if (text.includes('report') || text.includes('upload') || text.includes('pdf') || text.includes('image')) {
        return 'Patients can upload PDF/image records in "Medical Reports". Doctors assigned to your appointment can review those reports from their dashboard.';
    }

    if (text.includes('payment') || text.includes('refund') || text.includes('payhere')) {
        return 'Payments are handled through PayHere. For payment failures, refunds, or billing disputes, please use the Contact page so the admin team can assist you quickly.';
    }

    return 'I am currently in offline support mode. I can still help with navigation: booking appointments, login/register, AI Checker, telemedicine, reports, and payments. For account or payment issues, please use the Contact page.';
};

app.post('/support', async (req, res) => {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;

    if (!hasGroq && !hasGemini) {
        return res.json({ response: getOfflineSupportResponse(message) });
    }

    try {
        let responseText;

        if (hasGroq) {
            // --- Groq path (primary in production) ---
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

            const messages = [
                { role: 'system', content: systemKnowledgeBase },
                ...((history || [])
                    .filter(h => h.text)
                    .map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text }))
                ),
                { role: 'user', content: message }
            ];

            const completion = await groq.chat.completions.create({
                messages,
                model: 'llama3-8b-8192',
                max_tokens: 512,
                temperature: 0.6
            });

            responseText = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        } else {
            // --- Gemini fallback path ---
            const normalizedHistory = [
                { role: 'user', parts: [{ text: 'Context: ' + systemKnowledgeBase }] },
                { role: 'model', parts: [{ text: 'Understood. I will help the user based on these instructions.' }] },
                ...((history || [])
                    .filter(h => h.text)
                    .map(h => ({
                        role: h.role === 'user' ? 'user' : 'model',
                        parts: [{ text: h.text }]
                    }))
                    .filter((h, i) => i > 0 || h.role === 'user')
                )
            ];

            const geminiResponse = await runWithGeminiModelFallback(async (model) => {
                const chat = model.startChat({ history: normalizedHistory });
                const result = await chat.sendMessage(message);
                return (await result.response).text();
            });

            responseText = geminiResponse;
        }

        res.json({ response: responseText });
    } catch (err) {
        process.stdout.write(`Support Chat Error: ${err.message}\n`);
        res.json({ response: getOfflineSupportResponse(message) });
    }
});

app.listen(PORT, () => console.log(`AI Service listening on port ${PORT}`));
