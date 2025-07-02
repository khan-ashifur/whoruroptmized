// Load environment variables from .env file (for local development)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3001; // Use PORT environment variable provided by Render

// Configure CORS
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: [
    frontendUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    /\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('CRITICAL ERROR: OPENAI_API_KEY is missing. Please set it in your .env file (local) or Render config (production).');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

if (typeof fetch === 'undefined') {
  console.error("Node version doesn't support native fetch. Please ensure your Node.js environment is v18 or higher.");
  process.exit(1);
}

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'WHORU Backend API is running! Access /health for status or /generate-content for main functionality.',
    endpoints: ['/health', '/generate-content']
  });
});

// Main route to generate content
app.post('/generate-content', async (req, res) => {
  console.log("--- New Request to /generate-content ---");
  console.log("Received request body:", JSON.stringify(req.body, null, 2)); // Log full request for debugging

  try {
    const { contents, generationConfig } = req.body;

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      console.error('Validation Error: "contents" array is required and must not be empty.');
      return res.status(400).json({ error: '"contents" array is required.' });
    }

    // --- Extract MBTI Type and its details from Frontend Request ---
    // Assuming frontend sends the calculated type, its name, and short description
    const mbtiTypeFromFrontend = contents[0]?.parts[0]?.type || "MBTI_TYPE_UNKNOWN";
    const mbtiTypeName = contents[0]?.parts[0]?.name || 'Unknown Type Name';
    const mbtiTypeDescription = contents[0]?.parts[0]?.description || 'Unknown Type Description';
    const promptKey = contents[0]?.parts[0]?.promptKey || 'initial_description'; // Assuming promptKey is also passed in contents[0].parts[0]

    console.log("Extracted MBTI Type from Frontend:", mbtiTypeFromFrontend);
    console.log("Extracted Type Name:", mbtiTypeName);
    console.log("Extracted Type Description:", mbtiTypeDescription);
    console.log("Extracted Prompt Key:", promptKey);

    let promptText = "";
    let responseSchema = {}; // This will be used for both main and sub-prompts now

    if (promptKey === 'initial_description') {
        // MODIFIED: Simplified prompt for main description, focusing on JSON output
        // REMOVED: Few-shot example for the main description to avoid content leakage.
        // The AI is now directly instructed to generate for the provided type.
        promptText = `
প্রিয় OpenAI,
আপনি একজন অভিজ্ঞ, জ্ঞানী এবং অত্যন্ত বিনয়ী বাঙালি জীবন কোচ। আপনার ভাষার ব্যবহার হবে অত্যন্ত মার্জিত এবং শ্রদ্ধাপূর্ণ। আপনার প্রতিটি শব্দ, বাক্য এবং অনুচ্ছেদে কঠোরভাবে 'আপনি' সম্বোধন ব্যবহার করবেন, কোনো অবস্থাতেই 'তুমি' ব্যবহার করা যাবে না। আপনার উত্তর সংক্ষিপ্ত, সরাসরি এবং কার্যকর হবে। অহেতুক নাটকীয়তা, চটকদার শব্দচয়ন বা "জেন-জেড" স্টাইলের অভিব্যক্তি সম্পূর্ণরূপে পরিহার করুন। এমনভাবে লিখুন যেন একজন মধ্যবয়সী, চিন্তাশীল ব্যক্তি আপনার পরামর্শগুলি সহজে বুঝতে পারে এবং সেগুলো তার জীবনে প্রয়োগ করতে আগ্রহী হয়। আপনার লেখার ধরণ হবে আবেগপ্রবণ কিন্তু সহজ-সরল, স্পষ্ট এবং মার্জিত বাংলা ভাষায়।

MBTI ব্যক্তিত্বের ধরণ "${mbtiTypeFromFrontend}" (${mbtiTypeName} - ${mbtiTypeDescription}) এর জন্য একটি গভীর অন্তর্দৃষ্টিপূর্ণ, আবেগপ্রবণ এবং সাংস্কৃতিকভাবে প্রাসঙ্গিক ব্যক্তিত্বের বর্ণনা একটি JSON অবজেক্ট আকারে তৈরি করুন। আপনার উত্তরে কোনো ধরনের ভূমিকা, অতিরিক্ত টেক্সট, বা "MBTI Type:" / "ব্যক্তিত্বের ধরণ:" এর মতো কোনো লাইন অন্তর্ভুক্ত করবেন না। আপনার উত্তরটি সরাসরি JSON অবজেক্ট দিয়ে শুরু হবে।

JSON অবজেক্টের নিম্নলিখিত কীগুলি এবং তাদের মানগুলি থাকতে হবে:
- \`personality_type_info\`: (object) এই অবজেক্টে নিম্নলিখিত কীগুলি থাকবে:
    - \`type\`: (string) MBTI টাইপ কোড (যেমন: ENFP, ESFJ)। এই মানটি অবশ্যই "${mbtiTypeFromFrontend}" হবে।
    - \`name\`: (string) টাইপের নাম (যেমন: “প্রেরণাশক্তির অভিযাত্রী”, “The Consul”)। এই মানটি অবশ্যই "${mbtiTypeName}" হবে।
    - \`description_line1\`: (string) টাইপের প্রথম বর্ণনা লাইন (যেমন: আপনি সহজাতভাবে প্রাণবন্ত, কল্পনাপ্রবণ, এবং মানুষের হৃদয় ছুঁয়ে যেতে চান।)।
    - \`description_line2\`: (string) টাইপের দ্বিতীয় বর্ণনা লাইন (যেমন: নতুনত্ব, পরিবর্তন আর সংযোগের খোঁজে আপনি কখনোই ক্লান্ত হন না।)।
    - \`description_line3\`: (string) টাইপের তৃতীয় বর্ণনা লাইন (যেমন: আপনার নির্ভীক হাসি দেখে মানুষ বোঝে না, ভেতরে আপনি কতটা অনুভূতিপ্রবণ আর কোমল।)।
- \`general_summary\`: (string) একটি সমৃদ্ধ, কাব্যিক অনুচ্ছেদ যা ব্যক্তির ভেতরের প্রকৃতি, আবেগিক গভীরতা, সিদ্ধান্ত গ্রহণের ধরণ এবং তারা পৃথিবীকে কীভাবে দেখে তা বর্ণনা করবে। নরম, কোচিং-স্টাইলের ভাষা ব্যবহার করুন যাতে "আহ্, এটা সত্যিই আমি" এমন অনুভূতি তৈরি হয়। এতে নিম্নলিখিত দুটি লাইন অবশ্যই অন্তর্ভুক্ত করবেন: "সবার মধ্যে একটু আশার আলো ছড়াতে ভালোবাসেন, যদিও মাঝে মাঝে আপনিই নিজের জন্য সেই আলো পেতে চান।" এবং "মানুষ প্রায়ই বুঝতে পারে না—আপনার চিন্তার কতটা গভীরতা।" এই লাইনগুলো প্রাকৃতিক ভাবে অনুচ্ছেদে মিশে যাবে।
- \`strengths\`: (array of objects) ৫টি প্রধান শক্তির তালিকা। প্রতিটি অবজেক্টে \`name\` (string, বাংলায়) এবং \`explanation\` (string, ১-২ লাইনের ব্যাখ্যা) থাকতে হবে।
- \`challenges\`: (array of objects) ৩টি ব্যক্তিত্বের চ্যালেঞ্জের তালিকা। প্রতিটি অবজেক্টে \`description\` (string, সংক্ষিপ্ত আবেগিক চ্যালেঞ্জ) এবং \`advice\` (string, উষ্ণ, কোচ-স্টাইলের পরামর্শ) থাকতে হবে।
- \`career_advice\`: (array of objects) ৩-৫টি পেশার তালিকা যা ব্যক্তির প্রকৃতির সাথে সামঞ্জস্যপূর্ণ, আধুনিক পেশা যেমন - কন্টেন্ট ক্রিয়েটর, ডেটা অ্যানালিস্ট, স্টার্টআপ উদ্যোক্তা, ডিজিটাল মার্কেটিং স্পেশালিস্ট, কমিউনিটি ম্যানেজার, ফ্রিল্যান্স লেখক, সফটওয়্যার ডেভেলপার, প্রজেক্ট ম্যানেজার, সামাজিক কর্মী, শিক্ষক, কাউন্সেলর, ইভেন্ট অর্গানাইজার ইত্যাদি অন্তর্ভুক্ত করুন। প্রতিটি অবজেক্টে \`field\` (string, বাংলায়), \`reason\` (string, কেন এই পেশা উপযুক্ত), এবং \`action\` (string, ঐচ্ছিক, ১-লাইনের পদক্ষেপ) থাকতে হবে।
- \`relationship_tips\`: (array of objects) ৩-৫টি অন্তর্দৃষ্টির তালিকা। প্রতিটি অবজেক্টে \`general_behavior\` (string, প্রেম/বন্ধুত্বে সাধারণ আচরণ) এবং \`tip\` (string, সম্পর্ক উন্নত করার জন্য ব্যবহারিক/আবেগিক পরামর্শ) থাকতে হবে।
- \`self_improvement_habits\`: (array of objects) ৩টি দৈনিক বা মানসিকতার অভ্যাসের তালিকা। প্রতিটি অবজেক্টে \`habit\` (string, প্রস্তাবিত অভ্যাস) এবং \`benefit\` (string, এর মানসিক/ব্যক্তিগত সুবিধা) থাকতে হবে।
- \`coach_message\`: (string) একটি চূড়ান্ত আবেগপ্রবণ অনুচ্ছেদ যা একজন জ্ঞানী বাঙালি জীবন কোচের মতো শোনাবে, যা গভীর প্রতিফলন এবং আরও অন্বেষণের আকাঙ্ক্ষা জাগাবে, সর্বদা 'আপনি' সম্বোধন ব্যবহার করে। এটি অবশ্যই সহজ-সরল এবং মার্জিত বাংলা ভাষায় হবে, কোনো অহেতুক নাটকীয়তা বা চটকদার শব্দ ব্যবহার করবেন না।

আপনার প্রতিক্রিয়া অবশ্যই একটি বৈধ JSON অবজেক্ট হতে হবে এবং JSON অবজেক্ট ছাড়া আর কোনো অতিরিক্ত টেক্সট থাকবে না।
`;
            responseSchema = {
                type: "OBJECT",
                properties: {
                    "personality_type_info": {
                        type: "OBJECT",
                        properties: {
                            "type": { "type": "STRING" },
                            "name": { "type": "STRING" },
                            "description_line1": { "type": "STRING" },
                            "description_line2": { "type": "STRING" },
                            "description_line3": { "type": "STRING" }
                        },
                        required: ["type", "name", "description_line1", "description_line2", "description_line3"]
                    },
                    "general_summary": { "type": "STRING" },
                    "strengths": {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: { "name": { "type": "STRING" }, "explanation": { "type": "STRING" } },
                            required: ["name", "explanation"]
                        }
                    },
                    "challenges": {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: { "description": { "type": "STRING" }, "advice": { "type": "STRING" } },
                            required: ["description", "advice"]
                        }
                    },
                    "career_advice": {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: { "field": { "type": "STRING" }, "reason": { "type": "STRING" }, "action": { "type": "STRING" } },
                            required: ["field", "reason"]
                        }
                    },
                    "relationship_tips": {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: { "general_behavior": { "type": "STRING" }, "tip": { "type": "STRING" } },
                            required: ["general_behavior", "tip"]
                        }
                    },
                    "self_improvement_habits": {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: { "habit": { "type": "STRING" }, "benefit": { "type": "STRING" } },
                            required: ["habit", "benefit"]
                        }
                    },
                    "coach_message": { "type": "STRING" }
                },
                required: [
                    "personality_type_info",
                    "general_summary",
                    "strengths",
                    "challenges",
                    "career_advice",
                    "relationship_tips",
                    "self_improvement_habits",
                    "coach_message"
                ]
            };
        } else if (promptKey === 'career_sub_prompt') {
            promptText = `For MBTI personality type ${mbtiTypeFromFrontend}, provide expanded and modern career guidance in Bengali.The response must be a JSON object with:

- \`career_guidance_message\`: (string) A warm, intuitive paragraph that explains what kind of career environments are ideal for this personality — e.g., team-based, solo, creative, structured, growth-driven. Mention emotional needs too (freedom, meaning, recognition, impact).

- \`specific_actions\`: (array of strings) List 3–5 specific, actionable suggestions.
  Examples:
  - “একটি ফ্রিল্যান্সিং প্ল্যাটফর্মে প্রোফাইল খুলে লেখালেখি বা ডিজাইন শুরু করুন।”
  - “একটি ডেটা অ্যানালাইসিস কোর্সে নাম লেখান এবং প্রজেক্ট তৈরি করে দেখান।”
  - “নিজের একটি ব্র্যান্ড বা সেবার পেছনে কাজ শুরু করুন, ধাপে ধাপে।”
All output must be in Bengali. Style should be coaching-focused and motivational, with real-world relevance. Output must be a valid JSON object only. **নিশ্চিত করুন যে আপনার প্রতিক্রিয়া একটি বৈধ JSON অবজেক্ট।**`;
            responseSchema = {
                type: "OBJECT",
                properties: {
                    career_guidance_message: { type: "STRING" },
                    specific_actions: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["career_guidance_message", "specific_actions"]
            };
        } else if (promptKey === 'relationship_sub_prompt') {
            promptText = `For MBTI personality type ${mbtiTypeFromFrontend}, provide deeper relationship and friendship guidance in Bengali.The response must be a JSON object with:

- \`relationship_insight\`: (string) An emotional, intuitive paragraph explaining how this type typically behaves in love and friendships — their strengths, emotional needs, and common challenges. Should be heart-touching and insightful.

- \`actionable_tips\`: (array of strings) 3–5 emotionally intelligent suggestions, examples:
  - “নিজের চাওয়া-মনের কথা স্পষ্টভাবে প্রকাশ করতে শিখুন।”
  - “সবসময় অন্যকে খুশি করতে গিয়ে নিজেকে ভুলে যাবেন না।”
  - “ঘনিষ্ঠতা থেকে না পালিয়ে ধীরে ধীরে সম্পর্কের গভীরে প্রবেশ করুন।”
Must be written in Bengali. Tone must feel like a wise friend or life coach offering heartfelt guidance.
Output must be a valid JSON object. Do not include explanations outside the JSON format. **নিশ্চিত করুন যে আপনার প্রতিক্রিয়া একটি বৈধ JSON অবজেক্ট।**`;
            responseSchema = {
                type: "OBJECT",
                properties: {
                    relationship_insight: { type: "STRING" },
                    actionable_tips: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["relationship_insight", "actionable_tips"]
            };
        }

    const openaiPayload = {
      model: "gpt-4o",
      messages: [{ role: 'user', content: promptText }],
      temperature: generationConfig?.temperature || 0.7,
      max_tokens: generationConfig?.maxOutputTokens || 1500,
      ...(Object.keys(responseSchema).length > 0 && {
        response_format: { type: "json_object" }
      })
    };

    console.log("Sending payload to OpenAI:", JSON.stringify(openaiPayload, null, 2));

    const openaiResponse = await openai.chat.completions.create(openaiPayload);

    console.log("--- OpenAI API Raw Response Object ---");
    console.log(JSON.stringify(openaiResponse, null, 2));

    if (!openaiResponse || !openaiResponse.choices || openaiResponse.choices.length === 0) {
        console.error("OpenAI Response Error: No choices found in response.");
        return res.status(500).json({ error: "OpenAI did not return any content." });
    }

    const generatedTextContent = openaiResponse.choices[0].message.content; 
    console.log("OpenAI generated text content:", generatedTextContent);

    let finalResponseData;
    // For initial_description, parse the JSON. For sub-prompts, they are already JSON.
    if (promptKey === 'initial_description') {
        try {
            finalResponseData = JSON.parse(generatedTextContent);
            console.log("Parsed AI data for initial description:", finalResponseData);
        } catch (jsonParseError) {
            console.error("Error parsing initial description JSON:", jsonParseError, "Raw text:", generatedTextContent);
            return res.status(500).json({ error: 'OpenAI returned invalid JSON for initial description', raw: generatedTextContent });
        }
    } else {
        // Sub-prompts are already expected to be JSON from the AI
        finalResponseData = JSON.parse(generatedTextContent); // Assuming sub-prompts always return valid JSON
    }

    const finalResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify(finalResponseData) // Stringify the parsed data before sending to frontend
              }
            ]
          }
        }
      ]
    };

    console.log("Sending final response to frontend:", JSON.stringify(finalResponse, null, 2));
    res.json(finalResponse);

  } catch (error) {
    console.error("--- OpenAI API Call Failed or Unhandled Error ---");
    console.error("  Error message:", error.message);
    console.error("  Error name:", error.name);
    if (error.status) console.error("  HTTP Status:", error.status);
    if (error.code) console.error("  OpenAI Error Code:", error.code);
    if (error.type) console.error("  OpenAI Error Type:", error.type);
    if (error.param) console.error("  OpenAI Error Param:", error.param);
    if (error.response && error.response.data) {
        console.error("  Full error object (raw):", JSON.stringify(error.response.data, null, 2));
    } else {
        console.error("  Full error object (raw):", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }

    const errorMessage = error.message || 'An unknown error occurred with the OpenAI API.';
    const statusCode = error.status || 500;

    res.status(statusCode).json({ error: errorMessage });
  }
});

app.use((err, req, res, next) => {
  console.error('--- Unhandled Application Error ---');
  console.error('Error details:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error (Unhandled)' });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${port}`);
  console.log(`Frontend URL for CORS: ${frontendUrl}`);
});