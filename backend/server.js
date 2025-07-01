// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3001;

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

// OpenAI setup
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is missing. Set it in your .env or Render config.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

if (typeof fetch === 'undefined') {
  console.error("Node version doesn't support native fetch. Use Node 18+.");
  process.exit(1);
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'WHORU Backend API is running!',
    endpoints: ['/health', '/generate-content']
  });
});

// Main route to generate content
app.post('/generate-content', async (req, res) => {
  console.log("Received request:", JSON.stringify(req.body, null, 2));

  try {
    const { contents, generationConfig } = req.body;

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ error: '"contents" array is required.' });
    }

    const messages = contents.map(item => ({
      role: item.role || 'user',
      content: item.parts.map(p => p.text).join('\n')
    }));

    const openaiPayload = {
      model: "gpt-4o",
      messages: messages,
      temperature: generationConfig?.temperature || 0.7,
      max_tokens: generationConfig?.maxOutputTokens || 1500,
      response_format: { type: "json_object" }
    };

    const response = await openai.chat.completions.create(openaiPayload);
    const textContent = response.choices[0].message.content;

    let parsedData;
    try {
      parsedData = JSON.parse(textContent);
    } catch (err) {
      console.error("Failed to parse OpenAI JSON:", textContent);
      return res.status(500).json({ error: 'OpenAI returned invalid JSON', raw: textContent });
    }

    const finalResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: parsedData
              }
            ]
          }
        }
      ]
    };

    res.json(finalResponse);
  } catch (error) {
    console.error("OpenAI Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
