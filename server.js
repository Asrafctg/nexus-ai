require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey });

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { error: 'অনেক বেশি রিকোয়েস্ট পাঠানো হয়েছে, অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন।' }
});

app.post('/api/chat', apiLimiter, async (req, res) => {
  try {
    const { messages, language } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY সেট করা নেই। Render Environment Variables-এ কী যুক্ত করুন।' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const systemInstruction = language === 'bn'
      ? 'তুমি NexusAI, একটি অত্যন্ত বুদ্ধিমান, সহায়ক এবং বন্ধুত্বপূর্ণ AI অ্যাসিস্ট্যান্ট। ব্যবহারকারী যে ভাষায় প্রশ্ন করবে (বাংলা বা ইংরেজি), সেই ভাষায় স্পষ্ট, নির্ভুল এবং গোছানো উত্তর দেবে। কোড লিখলে সুন্দরভাবে Markdown ফরম্যাটে দেবে।'
      : 'You are NexusAI, an intelligent, helpful, and friendly AI assistant. Respond clearly and accurately in the language the user writes in, using clean Markdown formatting.';

    const formattedContents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText =
      response?.text ||
      response?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ||
      'কোনো উত্তর পাওয়া যায়নি।';

    res.json({ reply: replyText });
  } catch (error) {
    console.error('AI API Error:', error);
    res.status(500).json({ error: 'সার্ভারে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running smoothly on port ${PORT}`);
});