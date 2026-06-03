import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import Scheme from './models/Scheme.js';
import CachedSchemeResponse from './models/SchemeCache.js';
import User from './models/User.js';
import { searchRateLimiter, validateAnalyzeInput } from './middleware/security.js';

// Load environment variables
dotenv.config();

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

let isDbConnected = false;

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schemeai';
mongoose.connect(mongoURI)
  .then(() => {
    console.log('Connected to MongoDB successfully.');
    isDbConnected = true;
  })
  .catch(err => {
    console.error('MongoDB connection error. Caching layer is offline. Falling back to direct API calls.', err.message);
  });

/**
 * Helper to generate a deterministic cache key from input payloads
 */
function generateQueryKey(profile, chatText) {
  if (chatText) {
    return `chat:${chatText.trim().toLowerCase()}`;
  }
  if (profile) {
    const sortedKeys = Object.keys(profile).sort();
    const parts = sortedKeys.map(key => `${key}:${String(profile[key]).trim().toLowerCase()}`);
    return `profile:${parts.join('|')}`;
  }
  return '';
}

/**
 * Wrapper to call Google Gemini API with fallback key handling
 */
async function callGemini(contents, config = {}) {
  // Cascade fallback models list
  const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash'];

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  // Fallback API keys array
  const keys = [
    { name: 'Primary', value: process.env.GEMINI_API_KEY },
    { name: 'Fallback', value: process.env.FALLBACK_GEMINI_API_KEY }
  ].filter(k => k.value);

  let lastError = null;

  // Try each model sequentially
  for (const model of models) {
    // Try each API key for the current model
    for (const key of keys) {
      try {
        console.log(`[Gemini API] Trying model "${model}" using ${key.name} API key...`);
        const ai = new GoogleGenAI({ apiKey: key.value });
        const response = await ai.models.generateContent({
          model,
          contents,
          ...config
        });
        console.log(`[Gemini API] Success: model "${model}" with ${key.name} API key.`);
        return response;
      } catch (err) {
        lastError = err;
        const isTransientError =
          err.message?.includes('429') ||
          err.status === 429 ||
          err.message?.includes('503') ||
          err.status === 503;

        console.warn(`[Gemini API] Failed: model "${model}" with ${key.name} API key. Error: ${err.message}`);

        if (!isTransientError) {
          // Break immediately on structural/validation errors to avoid wasteful API cycles
          throw err;
        }
      }
    }
  }

  // Throw the last recorded error if all permutations failed
  throw lastError;
}

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required.' });

  jwt.verify(token, process.env.JWT_SECRET || 'schemesync_dev_secret_key', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session token.' });
    req.userId = decoded.userId;
    next();
  });
};

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Valid email and a password of at least 6 characters are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'schemesync_dev_secret_key', { expiresIn: '7d' });
    res.status(201).json({
      token,
      email: user.email,
      profile: user.profile,
      savedSchemes: user.savedSchemes,
      searchHistory: user.searchHistory
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'schemesync_dev_secret_key', { expiresIn: '7d' });
    res.json({
      token,
      email: user.email,
      profile: user.profile,
      savedSchemes: user.savedSchemes,
      searchHistory: user.searchHistory
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/sync
app.post('/api/auth/sync', authenticateToken, async (req, res) => {
  try {
    const { profile, savedSchemes, searchHistory } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // 1. Merge Profile data
    if (profile && Object.keys(profile).length > 0) {
      user.profile = { ...user.profile.toObject(), ...profile };
    }

    // 2. Merge Saved Schemes
    if (savedSchemes && Array.isArray(savedSchemes)) {
      const mergedSchemes = [...user.savedSchemes];
      for (const localScheme of savedSchemes) {
        const dbSchemeIdx = mergedSchemes.findIndex(s => s.id === localScheme.id || s.name === localScheme.name);
        if (dbSchemeIdx > -1) {
          const dbScheme = mergedSchemes[dbSchemeIdx].toObject();
          mergedSchemes[dbSchemeIdx] = {
            ...dbScheme,
            status: localScheme.status || dbScheme.status,
            completedSteps: Array.from(new Set([...(dbScheme.completedSteps || []), ...(localScheme.completedSteps || [])])),
            updatedAt: localScheme.updatedAt || dbScheme.updatedAt
          };
        } else {
          mergedSchemes.push(localScheme);
        }
      }
      user.savedSchemes = mergedSchemes;
    }

    // 3. Merge Search History
    if (searchHistory && Array.isArray(searchHistory)) {
      const mergedHistory = [...user.searchHistory];
      for (const localHist of searchHistory) {
        const exists = mergedHistory.some(h => h.query.trim().toLowerCase() === localHist.query.trim().toLowerCase() && 
                                              Math.abs(new Date(h.timestamp) - new Date(localHist.timestamp)) < 5000);
        if (!exists) {
          mergedHistory.push(localHist);
        }
      }
      user.searchHistory = mergedHistory;
    }

    await user.save();

    res.json({
      email: user.email,
      profile: user.profile,
      savedSchemes: user.savedSchemes,
      searchHistory: user.searchHistory
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Server error during sync.' });
  }
});

/**
 * Route: Analyze and discover government schemes
 * Implements IP rate limit, input sanitization, write-through caching, and Gemini search grounding.
 */
app.post('/api/analyze', searchRateLimiter, validateAnalyzeInput, async (req, res) => {
  try {
    const { profile, chatText } = req.body;

    // 1. Generate Deterministic Cache Key
    const queryKey = generateQueryKey(profile, chatText);

    // 2. Query Cache Layer (MongoDB)
    if (isDbConnected && queryKey) {
      try {
        const cached = await CachedSchemeResponse.findOne({ queryKey });
        if (cached) {
          console.log(`[Cache Hit] Serving cached results for: ${queryKey}`);
          return res.json(cached.response);
        }
      } catch (cacheErr) {
        console.error('[Warning] Failed to query cache:', cacheErr.message);
      }
    }

    // 3. Cache Miss - Build profile string and search using AI
    let userProfileStr = '';
    if (chatText) {
      userProfileStr = `User's Description: "${chatText}"`;
    } else if (profile) {
      const { name, age, gender, state, city, income, category, profession, education, disability, minority } = profile;
      userProfileStr = `
- Name: ${name || 'Not specified'}
- Age: ${age || 'Not specified'}
- Gender: ${gender || 'Not specified'}
- State: ${state || 'Not specified'}
- City: ${city || 'Not specified'}
- Income: ₹${income || 'Not specified'}
- Category: ${category || 'Not specified'}
- Profession: ${profession || 'Not specified'}
- Education: ${education || 'Not specified'}
- Disability Status: ${disability || 'No'}
- Minority Status: ${minority || 'No'}
      `.trim();
    }

    const prompt = `You are a Principal Architect and Indian Government Schemes expert.

User Profile:
${userProfileStr}

Task:
1. Search and discover real-world, active Indian Government schemes (central or state-level) that match this user's profile. Use Google Search grounding to find active schemes, official application links, and actual eligibility details.
2. Select the top most relevant schemes (up to 5).
3. For each scheme:
   * Explain why user is eligible or ineligible
   * Explain why NOT eligible (if applicable)
   * Give benefits in simple language
   * List required documents
   * Provide step-by-step application steps
   * Provide the official government portal URL as the "apply_link"
   * Assign a confidence match score (0-100%)

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
Do not use markdown formatting or markdown code blocks like \`\`\`json. Return raw JSON string.`;

    console.log(`[Cache Miss] Fetching fresh recommendations from Gemini for: ${queryKey}`);
    const response = await callGemini(prompt, {
      config: {
        tools: [{ googleSearch: {} }] // Enable Google Search grounding for real-time web verification
      }
    });

    const textResult = response.text;
    let jsonResult;
    try {
      const cleanText = textResult.replace(/```json/gi, '').replace(/```/gi, '').trim();
      jsonResult = JSON.parse(cleanText);
    } catch (e) {
      console.error('Failed to parse Gemini response:', textResult);
      return res.status(502).json({ error: 'Received invalid formatting from AI. Please try again.' });
    }

    // 4. Update Cache (Write-Through Cache strategy)
    if (isDbConnected && queryKey && jsonResult && Array.isArray(jsonResult)) {
      try {
        await CachedSchemeResponse.findOneAndUpdate(
          { queryKey },
          {
            queryKey,
            queryType: chatText ? 'chat' : 'profile',
            response: jsonResult,
            createdAt: new Date()
          },
          { upsert: true, new: true }
        );
        console.log(`[Cache Write] Cached response for key: ${queryKey}`);
      } catch (cacheErr) {
        console.error('[Warning] Failed to write response to cache:', cacheErr.message);
      }
    }

    res.json(jsonResult);
  } catch (err) {
    console.error('Error in /api/analyze:', err.message);
    if (err.message?.includes('429') || err.status === 429) {
      return res.status(429).json({ error: 'Gemini API limit reached. Please try again shortly.' });
    }
    res.status(500).json({ error: 'Failed to analyze user profile and match schemes.' });
  }
});

/**
 * Route: Application navigation assistant
 */
app.post('/api/apply-assistant', async (req, res) => {
  try {
    const { schemeName, schemeSteps, profile, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

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
${schemeSteps ? schemeSteps.join('\n') : 'Not provided.'}

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

    const response = await callGemini(formattedContents, {
      config: { systemInstruction: systemPrompt }
    });

    res.json({ text: response.text });
  } catch (err) {
    console.error('Error in /api/apply-assistant:', err.message);
    if (err.message?.includes('429') || err.status === 429) {
      return res.status(429).json({ error: 'API quota exceeded. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to interact with assistant.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
