require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// Gemini API ইনিশিয়ালাইজেশন
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// মিডলওয়্যার
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// স্প্যাম প্রোটেকশন (প্রতি মিনিটে সর্বোচ্চ ২০টি রিকোয়েস্ট)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { error: 'অনেক বেশি রিকোয়েস্ট পাঠানো হয়েছে, অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন।' }
});

// চ্যাট API এন্ডপয়েন্ট
app.post('/api/chat', apiLimiter, async (req, res) => {
  try {
    const { messages, language } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const systemInstruction = language === 'bn'
      ? 'তুমি NexusAI, একটি অত্যন্ত বুদ্ধিমান, সহায়ক এবং বন্ধুত্বপূর্ণ AI অ্যাসিস্ট্যান্ট। ব্যবহারকারী যে ভাষায় প্রশ্ন করবে (বাংলা বা ইংরেজি), সেই ভাষায় স্পষ্ট, নির্ভুল এবং গোছানো উত্তর দেবে। কোড লিখলে সুন্দরভাবে Markdown ফরম্যাটে দেবে।'
      : 'You are NexusAI, an intelligent, helpful, and friendly AI assistant. Respond clearly and accurately in the language the user writes in, using clean Markdown formatting.';

    // চ্যাট হিস্ট্রি ফরম্যাট করা
    const formattedContents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('AI API Error:', error);
    res.status(500).json({ error: 'সার্ভারে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
  }
});

// যেকোনো রাউটে ফ্রন্টএন্ড লোড করা
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running smoothly on port ${PORT}`);
});