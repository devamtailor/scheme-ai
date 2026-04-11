require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function main() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are an expert in Indian Government Schemes.
    
User Profile:
User provided this description: "test"

You are given a list of schemes:
[]

Task:
1. Select only relevant schemes
2. For each scheme:
   * Explain why user is eligible
   * Explain why NOT eligible (if applicable)
   * Give benefits in simple language
   * List required documents
   * Provide application steps
   * Assign a confidence score (0-100%)

IMPORTANT:
* Do NOT invent schemes
* Only use provided schemes
* Keep explanations simple

Return ONLY a valid JSON array of objects. Format each object like this:
{
  "name": "Scheme Name",
  "description": "Short Description",
  "eligible": true,
  "eligibility_reason": "why user is eligible",
  "ineligibility_reason": "why user is NOT eligible (leave empty if eligible)",
  "benefits": "benefits",
  "documents": ["doc1", "doc2"],
  "application_steps": ["step1", "step2"],
  "apply_link": "URL",
  "confidence_score": 85
}
Do not use markdown code blocks like \`\`\`json. Return raw JSON string array.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
    });

    const textResult = response.text;
    console.log("TEXT RESULT:", textResult);
    
    let jsonResult;
    try {
        jsonResult = JSON.parse(textResult.replace(/```json/g, '').replace(/```/g, '').trim());
        console.log("JSON PARSED OK:", jsonResult);
    } catch(e) {
        console.error("Failed to parse JSON.");
    }
  } catch(e) {
    console.error("API Error", e);
  }
}

main();
