require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json());

const { GoogleGenAI } = require('@google/genai');

const symptomDictionary = {
    "fever": "General Physician / Infectious Disease Specialist",
    "headache": "Neurologist / General Physician",
    "chest pain": "Cardiologist",
    "skin rash": "Dermatologist",
    "stomach ache": "Gastroenterologist"
};

app.post('/check-symptoms', async (req, res) => {
    const { symptoms, patientProfile } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Symptoms are required' });

    if (process.env.GEMINI_API_KEY) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            let contextStr = "Patient Context: No additional history provided.";
            if (patientProfile) {
                contextStr = `Patient Context:\n- Vitals: BP ${patientProfile.vitals?.bloodPressure || 'N/A'}, HR ${patientProfile.vitals?.heartRate || 'N/A'}, Weight ${patientProfile.vitals?.weight || 'N/A'}\n- Allergies: ${(patientProfile.allergies || []).join(', ') || 'None'}`;
            }

            const prompt = `Act as an advanced medical AI diagnostic assistant. 
The user reports the following symptoms: "${symptoms}".
${contextStr}

Based on these symptoms and context, provide a comprehensive preliminary analysis (2-3 paragraphs) discussing potential causes taking their vitals and allergies into account. Then, explicitly recommend a medical specialty they should consult.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            return res.json({
                analysis: response.text,
                recommendation: "AI Evaluated Specialty",
                disclaimer: "This is a preliminary AI suggestion and does not substitute professional medical advice."
            });
        } catch (err) {
            console.error('Gemini API Error:', err);
            // Fallthrough to mock dictionary
        }
    }

    const lowerSymptoms = symptoms.toLowerCase();
    let recommendation = "General Physician"; // fallback
    for (const [key, value] of Object.entries(symptomDictionary)) {
        if (lowerSymptoms.includes(key)) {
            recommendation = value;
            break;
        }
    }

    res.json({
        analysis: "Mock dictionary analysis complete.",
        recommendation: recommendation,
        disclaimer: "This is a preliminary suggestion and does not substitute professional medical advice."
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'AI Symptom Checker Service is running' });
});

app.listen(PORT, () => console.log(`AI Service listening on port ${PORT}`));
