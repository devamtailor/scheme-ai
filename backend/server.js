const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const Scheme = require('./models/Scheme');

const app = express();
app.use(cors());
app.use(express.json());

// Fallback data if MongoDB is offline
const schemesList = [
  {
    name: "PM Scholarship",
    description: "Scholarship scheme for dependent wards and widows of ex-servicemen and Ex-Coast Guard personnel.",
    eligibility: { min_income: 0, max_income: 1000000, category: ["General", "OBC", "SC", "ST"], state: ["All"], profession: ["Student"] },
    benefits: "₹2,500/month for boys and ₹3,000/month for girls.",
    documents: ["Aadhaar", "Bank Account", "Marksheet"],
    application_steps: ["Visit Kendriya Sainik Board website", "Register online", "Upload required documents", "Submit"],
    apply_link: "https://ksb.gov.in"
  },
  {
    name: "PM Kisan Samman Nidhi",
    description: "Financial benefit to landholding farmer families.",
    eligibility: { min_income: 0, max_income: 500000, category: ["General", "OBC", "SC", "ST"], state: ["All"], profession: ["Farmer"] },
    benefits: "₹6,000 per year in three equal installments.",
    documents: ["Aadhaar", "Land holding papers", "Bank Account Detail"],
    application_steps: ["Go to PM Kisan Portal", "Click on New Farmer Registration", "Fill details and submit Aadhaar", "Submit"],
    apply_link: "https://pmkisan.gov.in/"
  },
  {
    name: "Pradhan Mantri Mudra Yojana (PMMY)",
    description: "Loans up to 10 lakhs to non-corporate, non-farm small/micro enterprises.",
    eligibility: { min_income: 0, max_income: 999999999, category: ["General", "OBC", "SC", "ST"], state: ["All"], profession: ["Self-employed", "Business Owner"] },
    benefits: "Loans up to 10 Lakhs without collateral.",
    documents: ["ID Proof", "Address Proof", "Business Plan", "Project Report"],
    application_steps: ["Visit nearby bank/NBFC", "Submit application", "Provide documents", "Sanction"],
    apply_link: "https://www.mudra.org.in/"
  },
  {
    name: "Skill India (PMKVY)",
    description: "Pradhan Mantri Kaushal Vikas Yojana for youth skill training.",
    eligibility: { min_income: 0, max_income: 999999999, category: ["General", "OBC", "SC", "ST"], state: ["All"], profession: ["Student", "Unemployed"] },
    benefits: "Free skill training, certification, and placement assistance.",
    documents: ["Aadhaar Card", "Bank Account", "Educational Certificates"],
    application_steps: ["Find nearby PMKVY center", "Enroll", "Complete training", "Get certified"],
    apply_link: "http://pmkvyofficial.org/"
  },
  {
    name: "Stand-Up India",
    description: "Bank loans between 10 lakh and 1 Crore to SC/ST or woman entrepreneur.",
    eligibility: { min_income: 0, max_income: 999999999, category: ["SC", "ST"], state: ["All"], profession: ["Business Owner", "Self-employed"] },
    benefits: "Bank loan between 10 lakh and 1 Crore.",
    documents: ["Business Plan", "Caste Certificate", "ID Proof", "Address Proof"],
    application_steps: ["Visit Stand-Up India portal", "Fill application", "Submit report", "Approval"],
    apply_link: "https://www.standupmitra.in/"
  },
  {
    name: "Ayushman Bharat",
    description: "National Health Protection Scheme providing health coverage.",
    eligibility: { min_income: 0, max_income: 500000, category: ["General", "OBC", "SC", "ST"], state: ["All"], profession: ["Farmer", "Unemployed", "Student", "Self-employed", "Salaried", "Business Owner", "Other"] },
    benefits: "Health cover of ₹5 lakhs per family per year.",
    documents: ["Aadhaar Card", "Ration Card", "Income Certificate"],
    application_steps: ["Check eligibility online", "Visit impaneled hospital", "Verify identity", "Get e-card"],
    apply_link: "https://pmjay.gov.in/"
  },
  {
    name: "MGNREGA",
    description: "Mahatma Gandhi National Rural Employment Guarantee Act guarantees right to work.",
    eligibility: { min_income: 0, max_income: 300000, category: ["General", "OBC", "SC", "ST"], state: ["All"], profession: ["Unemployed", "Farmer"] },
    benefits: "At least 100 days of wage employment in a financial year.",
    documents: ["Aadhaar", "Job Card Application", "Bank account"],
    application_steps: ["Register with Gram Panchayat", "Get Job Card", "Apply for work", "Receive wages"],
    apply_link: "https://nrega.nic.in/"
  }
];

let isDbConnected = false;
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schemeai')
  .then(() => {
    console.log('Connected to MongoDB');
    isDbConnected = true;
  })
  .catch(err => console.error('MongoDB connection error. Falling back to memory storage.', err.message));

app.post('/api/analyze', async (req, res) => {
  try {
    const { profile, chatText } = req.body;
    
    let userProfileStr = "";
    if (chatText) {
      userProfileStr = `User provided this description: "${chatText}"`;
    } else if (profile) {
      const { name, age, gender, state, city, income, category, profession, education, disability, minority } = profile;
      userProfileStr = `
- Age: ${age || 'Not specified'}
- State: ${state || 'Not specified'}
- Income: ${income || 'Not specified'}
- Category: ${category || 'Not specified'}
- Profession: ${profession || 'Not specified'}
- Education: ${education || 'Not specified'}
      `.trim();
    } else {
      return res.status(400).json({ error: "No user profile or chat text provided." });
    }

    let allSchemes = schemesList;
    if (isDbConnected) {
      allSchemes = await Scheme.find({});
      if (allSchemes.length === 0) {
        allSchemes = schemesList; // Fallback if DB is empty
      }
    }
    
    const prompt = `You are an expert in Indian Government Schemes.
    
User Profile:
${userProfileStr}

You are given a list of schemes:
${JSON.stringify(allSchemes, null, 2)}

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

    if (!process.env.GEMINI_API_KEY) {
      console.warn("WARNING: GEMINI_API_KEY is not set. Returning dummy data for demo.");
      // Fallback for demo if API key isn't set
      return res.json([
        {
          "name": "PM Scholarship",
          "description": "Scholarship scheme for dependent wards.",
          "eligible": true,
          "eligibility_reason": "You are a student and fit the income criteria.",
          "ineligibility_reason": "",
          "benefits": "₹2,500/month",
          "documents": ["Aadhaar", "Bank Account", "Marksheet"],
          "application_steps": ["Register online", "Upload documents"],
          "apply_link": "https://ksb.gov.in",
          "confidence_score": 90
        }
      ]);
    }

    let response;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt
        });
    } catch (apiError) {
        console.warn("Primary API Key failed in analyze:", apiError.message);
        try {
            if (process.env.FALLBACK_GEMINI_API_KEY) {
                console.log("Trying fallback API Key...");
                const aiFallback = new GoogleGenAI({ apiKey: process.env.FALLBACK_GEMINI_API_KEY });
                response = await aiFallback.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: prompt
                });
            } else {
                throw apiError;
            }
        } catch (fallbackError) {
            console.error("Fallback API key also failed! Returning dummy data.", fallbackError.message);
            return res.json([
                {
                  "name": "PM Scholarship (Mock Data)",
                  "description": "Scholarship scheme for dependent wards.",
                  "eligible": true,
                  "eligibility_reason": "You fit the criteria (Mock Data). API Quota exceeded.",
                  "ineligibility_reason": "",
                  "benefits": "₹2,500/month",
                  "documents": ["Aadhaar", "Bank Account", "Marksheet"],
                  "application_steps": ["Register online", "Upload documents"],
                  "apply_link": "https://ksb.gov.in",
                  "confidence_score": 90
                }
            ]);
        }
    }

    const textResult = response.text;
    let jsonResult;
    try {
        jsonResult = JSON.parse(textResult.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch(e) {
        console.error("Failed to parse JSON", textResult);
        throw new Error("Invalid output format from LLM");
    }

    res.json(jsonResult);
  } catch (err) {
    console.error("Error in /api/analyze:", err);
    res.status(500).json({ error: "Failed to analyze schemes" });
  }
});

app.post('/api/apply-assistant', async (req, res) => {
  try {
    const { schemeName, schemeSteps, profile, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("WARNING: GEMINI_API_KEY is not set.");
      return res.json({ text: "Simulated response: API Key missing. Please set it in .env." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const systemPrompt = `You are an assistant helping users navigate government websites to apply for schemes.

User Profile:
- Name: ${profile?.name || 'Unknown'}
- State: ${profile?.state || 'Unknown'}
- Income: ${profile?.income || 'Unknown'}
- Category: ${profile?.category || 'Unknown'}
- Profession: ${profile?.profession || 'Unknown'}

Current Scheme:
- Name: ${schemeName || 'Government Scheme'}

Application Steps:
${schemeSteps ? schemeSteps.join('\\n') : 'Not provided.'}

Your job:
- Guide the user step-by-step based on the scheme
- Help them locate buttons, forms, and sections on the website
- Answer questions if the user is stuck
- Suggest what to do if the website is not working

Rules:
- Do NOT ask for user details again
- Keep answers short and practical
- Focus on real actions (click, scroll, upload, etc.)`;

    const formattedContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    let response;
    try {
        response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: formattedContents,
            config: {
              systemInstruction: systemPrompt
            }
        });
    } catch (apiError) {
        console.warn("Primary API Key failed in apply-assistant:", apiError.message);
        try {
            if (process.env.FALLBACK_GEMINI_API_KEY) {
                console.log("Trying fallback API Key...");
                const aiFallback = new GoogleGenAI({ apiKey: process.env.FALLBACK_GEMINI_API_KEY });
                response = await aiFallback.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: formattedContents,
                    config: {
                      systemInstruction: systemPrompt
                    }
                });
            } else {
                throw apiError;
            }
        } catch (fallbackError) {
             console.error("Fallback API key also failed in assistant!", fallbackError.message);
             return res.json({ text: "Simulated response: Both primary and fallback API Keys have exceeded their quotas (429 Error). Please use a fresh API key."});
        }
    }

    res.json({ text: response.text });
  } catch (err) {
    console.error("Error in /api/apply-assistant:", err);
    res.status(500).json({ error: "Failed to interact with assistant." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
