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

// --- Gemini AI Setup ---
const { GoogleGenAI } = require('@google/genai');

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
            const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

            const result_ai = await model.generateContent(prompt);
            const response_ai = await result_ai.response;
            let rawText = response_ai.text().trim();
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

// --- Health Check ---
app.get('/health', (req, res) => {
    res.json({ status: 'AI Symptom Checker Service is running', geminiEnabled: !!process.env.GEMINI_API_KEY });
});

app.listen(PORT, () => console.log(`AI Service listening on port ${PORT}`));
