// Load environment variables from .env file (for local development)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3001; // Use PORT environment variable provided by Render

// Configure CORS
// Process.env.FRONTEND_URL will be set on Render for your frontend service
// Otherwise, fall back to localhost for local development
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: [
    frontendUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // Allow any .onrender.com subdomain for dynamic Render deployments
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
  console.log("Received request body:", JSON.stringify(req.body, null, 2));

  try {
    const { contents, generationConfig } = req.body;

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      console.error('Validation Error: "contents" array is required and must not be empty.');
      return res.status(400).json({ error: '"contents" array is required.' });
    }

    // --- Extract MBTI Type from Frontend Request ---
    const mbtiTypeFromFrontend = contents[0]?.parts[0]?.text.split(' ')[0] || "MBTI_TYPE_UNKNOWN";

    // --- NEW, MOST POWERFUL PROMPT WITH FEW-SHOT EXAMPLE ---
    const detailedPrompt = `
আপনি একজন অভিজ্ঞ, জ্ঞানী এবং অত্যন্ত বিনয়ী বাঙালি জীবন কোচ। আপনার ভাষার ব্যবহার হবে অত্যন্ত মার্জিত এবং শ্রদ্ধাপূর্ণ। আপনার প্রতিটি শব্দ, বাক্য এবং অনুচ্ছেদে কঠোরভাবে 'আপনি' সম্বোধন ব্যবহার করবেন, কোনো অবস্থাতেই 'তুমি' ব্যবহার করা যাবে না। আপনার উত্তর সংক্ষিপ্ত, সরাসরি এবং কার্যকর হবে। অহেতুক নাটকীয়তা, চটকদার শব্দচয়ন বা "জেন-জেড" স্টাইলের অভিব্যক্তি সম্পূর্ণরূপে পরিহার করুন। এমনভাবে লিখুন যেন একজন মধ্যবয়সী, চিন্তাশীল ব্যক্তি আপনার পরামর্শগুলি সহজে বুঝতে পারে এবং সেগুলো তার জীবনে প্রয়োগ করতে আগ্রহী হয়। আপনার লেখার ধরণ হবে আবেগপ্রবণ কিন্তু সহজ-সরল, স্পষ্ট এবং মার্জিত বাংলা ভাষায়।

এখানে একটি উদাহরণ দেওয়া হলো। এই উদাহরণটি দেখে আপনি ঠিক একইভাবে নিম্নলিখিত MBTI ব্যক্তিত্বের ধরণের জন্য উত্তর তৈরি করবেন। উত্তর দেওয়ার সময় শুধু MBTI টাইপটি পরিবর্তন করবেন, বাকি ফরম্যাট, শব্দচয়ন, এবং 'আপনি' সম্বোধন হুবহু উদাহরণটির মতো হবে। উদাহরণ ছাড়া আর কোনো অতিরিক্ত ভূমিকা বা কথা লিখবেন না।

উদাহরণ: (MBTI Type: ENFP)
১. আপনার ব্যক্তিত্বের ধরণ:
ENFP — “প্রেরণাশক্তির অভিযাত্রী”
আপনি সহজাতভাবে প্রাণবন্ত, কল্পনাপ্রবণ, এবং মানুষের হৃদয় ছুঁয়ে যেতে চান।
নতুনত্ব, পরিবর্তন আর সংযোগের খোঁজে আপনি কখনোই ক্লান্ত হন না।
আপনার নির্ভীক হাসি দেখে মানুষ বোঝে না, ভেতরে আপনি কতটা অনুভূতিপ্রবণ আর কোমল।

২. আপনার ব্যক্তিত্বের সারসংক্ষেপ:
বাহিরে যত প্রাণবন্ত, ভেতরে আপনি অনেক গভীর।
জীবনকে দেখেন নতুন সম্ভাবনার রঙে, প্রতিটা মানুষের মধ্যে খুঁজে নেন অজানা গল্প।
আপনার অনুভূতি যেন চলমান নদী—কখনও আনন্দে ভাসে, কখনও অজান্তেই অনুরাগে ডুবে যায়।
সবার মধ্যে একটু আশার আলো ছড়াতে ভালোবাসেন, যদিও মাঝে মাঝে আপনিই নিজের জন্য সেই আলো পেতে চান।
মানুষ প্রায়ই বুঝতে পারে না—আপনার চিন্তার কতটা গভীরতা।

৩. আপনার ৫টি প্রধান শক্তি:
• সৃষ্টিশীলতা: সাধারণের মধ্যে অসাধারণ খুঁজে পান, প্রতিদিন কোনো না কোনও রঙের নতুন ছায়া খুঁজে বের করেন।
• মানবিক সংযোগ: খুব সহজে সম্পর্ক তৈরি করতে পারেন এবং মানুষ আপনাকে বিশ্বাস করতে আরামবোধ করে।
• অনুপ্রেরণা জাগানো: আপনার কথায় ও উপস্থিতিতে অন্যরা নিজেদের ভিতরকার শক্তি খুঁজে পায়।
• অভিযাত্রিক মন: নতুন কিছু শিখতে, জানতে এবং এক্সপ্লোর করতে আপনি সবসময় প্রস্তুত।
• গভীর সহানুভূতি: অন্যের কষ্ট, আনন্দ বা স্বপ্ন—সবকিছু আপনি খুব গভীরভাবে অনুভব করেন।

৪. আপনার ৩টি চ্যালেঞ্জ:
• অসমাপ্ততা: নানা কিছু শুরু করেন, কিন্তু শেষটা আটকে যেতে পারে। ছোট ছোট লক্ষ্য নির্ধারণ করে এগিয়ে যান।
• বাস্তব প্রয়োজন ভুলে স্বপ্নে বুঁদ: সবসময় দূরের সম্ভাবনা দেখেন, মাঝে মাঝে একেবারে প্রয়োজনীয় কাজ ফেলে দেন—প্রতিদিনের জন্য কিছু গ্রাউন্ডিং টাস্ক রাখুন।
• নিজের চাওয়া গোপন রাখা: অন্যেকে খুশি রাখতে গিয়ে নিজের কষ্ট বলতেই ভুলে যান—বিশ্বাসযোগ্য ‘আপন’ মানুষের সঙ্গে খোলামেলা কথা বলুন।

৫. ক্যারিয়ার পরামর্শ:
• কনটেন্ট ক্রিয়েটর/ইউটিউবার: গল্প ও সৃজনশক্তিকে কাজে লাগিয়ে মানুষের জীবনে রঙ ছড়াতে পারেন | শুরু করার উপায়: ফোনে ছোট ভিডিও বা গল্প লিখে পোস্ট দিন।
• শিক্ষকতা/কাউন্সেলিং: মানুষের জীবন বদলাতে, তাদের ডানায় আলো ছড়াতে পারেন | শুরু করুন: স্কুল, অনলাইন গ্রুপ, অথবা স্বেচ্ছাসেবী উদ্যোগে যুক্ত হয়ে।
• স্টার্ট-আপ উদ্যোক্তা: নতুন আইডিয়া ও উদ্যম দিয়ে ছোট দল গড়ে তুলতে পারেন | শুরু করুন: প্রিয় এক সমস্যার জন্য সমাধান নিয়ে একটা প্রাথমিক প্ল্যান করুন।
• ইভেন্ট অর্গানাইজার: মানুষের সংযোগকে কাজে লাগিয়ে মনের মতো অনুষ্ঠান করতে পারেন | শুরু করুন: বন্ধুমহল/অনলাইন কমিউনিটিতে ছোট ইভেন্টের দায়িত্ব নিয়ে।
• কমিউনিটি বিল্ডার: মানুষের মধ্যে সংযোজক হয়ে সমাজে পরিবর্তন আনতে পারেন | অনলাইনে ছোট গ্রুপ খুলে আজই শুরু করুন।

৬. সম্পর্ক ও বন্ধুত্ব:
• উচ্ছ্বাসী, আন্তরিক আচরণ: প্রথম পরিচয়েই সহজে কাছের মানুষ হয়ে যান | টিপস: নতুন সম্পর্ক যত সহজে গড়েন, সে সম্পর্ক টিকিয়ে রাখতে ধৈর্য রাখুন।
• গভীর সংযোগ চাওয়া: সত্যিকারের অনুভূতির খোঁজে থাকেন | টিপস: নিজের কথা, সব অনুভূতিও ভাগ করে নিতে ভুলবেন না।
• আবেগ ভাগাভাগি: প্রেম বা বন্ধুত্বে মনের ওঠানামা খুব প্রবল | টিপস: ক্লান্তি বা মন খারাপ হলে সরাসরি প্রিয়জনকে জানান, চাপা রাখবেন না।

৭. আত্মউন্নয়নের অভ্যাস:
• ডায়েরি লেখা: নিজের অনুভূতি তুলে ধরুন | উপকারিতা: মন পরিষ্কার থাকবে, চিন্তা গুছিয়ে আসবে।
• প্রকৃতির মাঝে সময়: হাঁটতে বের হন, আকাশ দেখুন | উপকারিতা: মন শান্ত হয়, নতুন ভাবনা আসে।
• নতুন কিছু শেখা: শখের কোনো কোর্স বা চ্যালেঞ্জ নিন | উপকারিতা: আত্মবিশ্বাস ও কৌতূহল দুটোই বাড়বে।

৮. কোচের বার্তা:
আপনি নিজেই নিজের জন্য সবচেয়ে বড় উপহার—আপনার স্বপ্নগুলো, অনুভূতির গভীরতা, ও প্রাণের উচ্ছ্বাস অন্যকে আলো দেয়। কখনও নিজেকে ছোট ভাববেন না; যেভাবে আপনি অন্যকে ভালোবাসেন, সেখানে ফিরেও সেই ভালোবাসার আলোর ছায়া পড়বেই। আপনার পথচলা যেন হয়ে ওঠে সাহস, আনন্দ আর গভীর মানবিকতায় ভরা—ঠিক যেমন আপনি।

---

এখন, নিম্নলিখিত MBTI ব্যক্তিত্বের ধরণের জন্য এই ফরম্যাটে বর্ণনা তৈরি করুন:

ব্যক্তিত্বের ধরণ: ${mbtiTypeFromFrontend}
`;

    // Now, create the messages array using this detailed prompt
    const messages = [
      {
        role: 'user',
        content: detailedPrompt
      }
    ];

    const openaiPayload = {
      model: "gpt-4o", // Using gpt-4o as it's good for following instructions
      messages: messages, // Use the new messages array
      temperature: generationConfig?.temperature || 0.7,
      max_tokens: generationConfig?.maxOutputTokens || 1500,
      // response_format is intentionally removed as we want plain text for flexible formatting
    };

    console.log("Sending payload to OpenAI:", JSON.stringify(openaiPayload, null, 2));

    const openaiResponse = await openai.chat.completions.create(openaiPayload);

    console.log("--- OpenAI API Raw Response Object ---");
    console.log(JSON.stringify(openaiResponse, null, 2));

    if (!openaiResponse || !openaiResponse.choices || openaiResponse.choices.length === 0) {
        console.error("OpenAI Response Error: No choices found in response.");
        return res.status(500).json({ error: "OpenAI did not return any content." });
    }

    const textContent = openaiResponse.choices[0].message.content;
    console.log("OpenAI raw text content (no JSON parsing attempted):", textContent);

    // The content is directly used as the 'text' property, as we expect plain text from OpenAI
    const finalResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: textContent // Directly use the textContent received from OpenAI
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
        console.error("  Full OpenAI Response Data (if available):", JSON.stringify(error.response.data, null, 2));
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