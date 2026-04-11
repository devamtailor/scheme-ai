require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testKey(name, key) {
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: "Say hi"
    });
    console.log(name, "WORKS!");
  } catch (err) {
    console.error(name, "FAILED:", err.message, err.status);
  }
}

async function main() {
  await testKey("Primary", process.env.GEMINI_API_KEY);
  await testKey("Fallback", process.env.FALLBACK_GEMINI_API_KEY);
}
main();
