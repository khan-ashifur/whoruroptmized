// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.post('/api/generate-description', async (req, res) => {
    const { personalityType, promptKey } = req.body;

    if (!personalityType) {
        return res.status(400).json({ error: 'Personality type is required.' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not set in .env!");
        return res.status(500).json({ error: 'Server configuration error: OpenAI API key missing.' });
    }

    // 👇 PROMPT TEMPLATE FOR GPT
    let prompt = "";

    if (promptKey === 'initial_description') {
        prompt = `
আপনি একজন বাংলা ভাষাভাষী ব্যক্তিত্ব বিশ্লেষক। একজন ব্যবহারকারীর MBTI টাইপ হল ${personalityType}।

তাকে একটি আবেগময়, বাস্তবসম্মত ও আত্মউন্নয়নমুখী রিপোর্ট দিন। JSON অবজেক্ট আকারে লিখুন, নিচের কাঠামো মেনে। শুধু JSON ফেরত দিন, কোনো ব্যাখ্যা বা হেডার ছাড়া।

{
  "general_summary": "৫–৬ লাইনে ব্যবহারকারীর বৈশিষ্ট্য বর্ণনা করুন।",
  "strengths": [
    {"name": "শক্তির নাম", "explanation": "সংক্ষিপ্ত ব্যাখ্যা"},
    ...
  ],
  "challenges": [
    {"description": "চ্যালেঞ্জ", "advice": "উপদেশ"},
    ...
  ],
  "career_advice": [
    {"field": "পেশা", "reason": "কারণ", "action": "শুরু করার কাজ"},
    ...
  ],
  "relationship_tips": [
    {"general_behavior": "সম্পর্কে স্বভাব", "tip": "উন্নয়নের উপায়"}
  ],
  "self_improvement_habits": [
    {"habit": "অভ্যাস", "benefit": "উপকার"}
  ],
  "coach_message": "একটি অনুপ্রেরণাদায়ক শেষ বার্তা দিন, যার শেষে আহ্বান থাকে (যেমন: 'আজই শুরু করুন!')"
}
        `;
    } else if (promptKey === 'career_sub_prompt') {
        prompt = `
আপনি একজন বাংলা ভাষাভাষী ক্যারিয়ার কোচ। একজন ব্যবহারকারীর MBTI টাইপ হল ${personalityType}।

এই ব্যবহারকারীর জন্য পেশা বাছাই এবং সফলতার জন্য একটি JSON গাইড দিন:

{
  "career_guidance_message": "সংক্ষিপ্ত, অনুপ্রেরণামূলক বার্তা",
  "specific_actions": [
    "ধাপ ১: এটি করুন",
    "ধাপ ২: এটি শিখুন",
    "ধাপ ৩: এই অভ্যাস গড়ে তুলুন"
  ]
}
        `;
    } else if (promptKey === 'relationship_sub_prompt') {
        prompt = `
আপনি একজন বাংলা ভাষাভাষী সম্পর্ক পরামর্শদাতা।

ব্যবহারকারীর MBTI টাইপ: ${personalityType}

এই ব্যবহারকারীর সম্পর্ক উন্নয়নের জন্য একটি JSON গাইড দিন:

{
  "relationship_insight": "ব্যবহারকারীর সম্পর্কধর্মী আচরণ",
  "actionable_tips": [
    "টিপ ১: এটি করুন",
    "টিপ ২: এইভাবে কথা বলুন",
    "টিপ ৩: এটিতে মনোযোগ দিন"
  ]
}
        `;
    } else {
        return res.status(400).json({ error: 'Invalid prompt key.' });
    }

    try {
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o", // You can change to gpt-4 or gpt-3.5-turbo if needed
                messages: [
                    { role: "system", content: "You are a helpful, empathetic, Bangla-speaking personality coach. Respond ONLY in JSON format." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        const result = await openaiResponse.json();

        const rawText = result.choices?.[0]?.message?.content;
        const parsed = JSON.parse(rawText);

        res.json({ description: parsed });

    } catch (error) {
        console.error('OpenAI API error:', error);
        res.status(500).json({ error: error.message || 'Failed to get response from OpenAI' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
