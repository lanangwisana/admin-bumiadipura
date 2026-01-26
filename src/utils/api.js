import { GEMINI_API_KEY, GEMINI_API_URL } from '../config';

/**
 * Call Gemini AI API for generating content
 * @param {string} prompt - User prompt
 * @param {string} systemInstruction - System instruction for AI behavior
 * @returns {Promise<string>} AI generated response
 */
export const callGeminiAPI = async (prompt, systemInstruction = "") => {
    const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    
    try {
        const response = await fetch(url, { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(payload) 
        });
        
        if (!response.ok) throw new Error('API Error');
        
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal memproses AI.";
    } catch (error) { 
        console.error('Gemini API Error:', error);
        return "Error koneksi AI."; 
    }
};
