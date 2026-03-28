require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
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

// --- Fallback dictionary (used if Groq is unavailable) ---
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

    // --- Groq AI ---
    if (process.env.GROQ_API_KEY) {
        try {
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
  "recommendedSpecialty": "Choose ONLY from: General Physician, Dentist, ENT Specialist, Dermatologist, Cardiologist, Neurologist, Orthopedic Surgeon, Pediatrician, Gynecologist",
  "lifestyleAdvice": ["advice 1", "advice 2"],
  "whenToSeekEmergencyCare": ["warning sign 1", "warning sign 2"],
  "fullAnalysis": "A comprehensive 2-3 paragraph analysis of the symptoms, potential causes, and medical reasoning."
}

Rules:
- Provide 2-4 possible conditions ranked by probability
- recommendedSpecialty MUST be exactly one of: General Physician, Dentist, ENT Specialist, Dermatologist, Cardiologist, Neurologist, Orthopedic Surgeon, Pediatrician, Gynecologist. If unsure, use "General Physician".
- Severity must be one of: low, moderate, high, emergency
- Include at least 2 lifestyle advice items
- Include at least 2 emergency warning signs
- fullAnalysis should be detailed and professional`;

            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile',   // current free tier model on Groq
                temperature: 0.4,
                max_tokens: 1024,
            });

            let rawText = chatCompletion.choices[0]?.message?.content?.trim() || '';
            // Strip markdown fences if model adds them
            if (rawText.startsWith('```')) {
                rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(rawText);

            const ALLOWED_SPECIALTIES = ['General Physician','Dentist','ENT Specialist','Dermatologist','Cardiologist','Neurologist','Orthopedic Surgeon','Pediatrician','Gynecologist'];
            const specialty = ALLOWED_SPECIALTIES.includes(parsed.recommendedSpecialty) ? parsed.recommendedSpecialty : 'General Physician';

            const result = {
                severity: parsed.severity || 'moderate',
                possibleConditions: parsed.possibleConditions || [],
                riskFactors: parsed.riskFactors || [],
                recommendations: parsed.recommendations || [],
                recommendedSpecialty: specialty,
                lifestyleAdvice: parsed.lifestyleAdvice || [],
                whenToSeekEmergencyCare: parsed.whenToSeekEmergencyCare || [],
                analysis: parsed.fullAnalysis || 'Analysis unavailable.',
                recommendation: specialty,
                disclaimer: "⚠️ This is an AI-generated preliminary assessment and does NOT constitute medical advice. Always consult a licensed healthcare professional for diagnosis and treatment."
            };

            if (patientId) {
                await SymptomCheck.create({
                    patientId, symptoms,
                    severity: result.severity,
                    possibleConditions: result.possibleConditions,
                    riskFactors: result.riskFactors,
                    recommendations: result.recommendations,
                    recommendedSpecialty: result.recommendedSpecialty,
                    lifestyleAdvice: result.lifestyleAdvice,
                    whenToSeekEmergencyCare: result.whenToSeekEmergencyCare,
                    fullAnalysis: result.analysis,
                    disclaimer: result.disclaimer
                }).catch(e => console.error('Failed to save history:', e));
            }

            return res.json(result);
        } catch (err) {
            console.error('Groq API Error:', err.message);
            // fallthrough to dictionary
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
        analysis: `Based on keyword matching, your symptoms suggest you should consult a ${matchedSpecialty}. Configure GROQ_API_KEY for full AI-powered analysis.`,
        recommendation: matchedSpecialty,
        disclaimer: "⚠️ This is a basic dictionary-based assessment and does NOT constitute medical advice. Please consult a healthcare professional."
    };

    if (patientId) {
        await SymptomCheck.create({ patientId, symptoms, severity: matchedSeverity, recommendedSpecialty: matchedSpecialty, fullAnalysis: fallbackResult.analysis, disclaimer: fallbackResult.disclaimer })
            .catch(e => console.error('Failed to save history:', e));
    }

    res.json(fallbackResult);
});

// --- GET Symptom History ---
app.get('/history/:patientId', async (req, res) => {
    try {
        const history = await SymptomCheck.find({ patientId: req.params.patientId }).sort({ createdAt: -1 }).limit(20);
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// --- Health Check ---
app.get('/health', (req, res) => {
    res.json({ status: 'AI Symptom Checker Service is running', groqEnabled: !!process.env.GROQ_API_KEY });
});

app.listen(PORT, () => console.log(`AI Service listening on port ${PORT}`));
