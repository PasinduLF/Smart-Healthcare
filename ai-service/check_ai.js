const { GoogleGenAI } = require('@google/genai');
console.log('GoogleGenAI type:', typeof GoogleGenAI);
try {
    const genAI = new GoogleGenAI('test-key');
    console.log('genAI instance methods:', Object.keys(Object.getPrototypeOf(genAI)));
} catch (e) {
    console.log('Error creating instance:', e.message);
}
