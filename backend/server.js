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
    // Note: A more secure approach for production is to list specific Render URLs
    /\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' })); // Increased limit for larger requests if needed

// OpenAI setup
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('CRITICAL ERROR: OPENAI_API_KEY is missing. Please set it in your .env file (local) or Render config (production).');
  // Exit gracefully, or allow the app to run but fail on API calls
  // For production, exiting is often preferred to avoid silent failures
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Basic check for Node.js version supporting native fetch
// If your Node.js version on Render is older than 18, this will trigger.
// Render typically uses recent Node.js versions.
if (typeof fetch === 'undefined') {
  console.error("Node version doesn't support native fetch. Please ensure your Node.js environment is v18 or higher.");
  process.exit(1);
}

// Health check endpoint (useful for Render's health checks)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint for basic info
app.get('/', (req, res) => {
  res.json({
    message: 'WHORU Backend API is running! Access /health for status or /generate-content for main functionality.',
    endpoints: ['/health', '/generate-content']
  });
});

// Main route to generate content
app.post('/generate-content', async (req, res) => {
  // Enhanced logging for incoming request
  console.log("--- New Request to /generate-content ---");
  console.log("Received request body:", JSON.stringify(req.body, null, 2));

  try {
    const { contents, generationConfig } = req.body;

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      console.error('Validation Error: "contents" array is required and must not be empty.');
      return res.status(400).json({ error: '"contents" array is required.' });
    }

    // Map frontend content format to OpenAI messages format
    const messages = contents.map(item => ({
      role: item.role || 'user', // Default to 'user' if role is not specified
      content: item.parts.map(p => p.text).join('\n') // Assuming parts always have text
    }));

    const openaiPayload = {
      model: "gpt-4o", // Ensure this model is suitable and you have access
      messages: messages,
      temperature: generationConfig?.temperature || 0.7,
      max_tokens: generationConfig?.maxOutputTokens || 1500,
      response_format: { type: "json_object" } // Crucial: tell OpenAI to return JSON
    };

    console.log("Sending payload to OpenAI:", JSON.stringify(openaiPayload, null, 2));

    // Make the call to OpenAI
    const openaiResponse = await openai.chat.completions.create(openaiPayload);

    // --- ENHANCED LOGGING FOR OPENAI RESPONSE ---
    console.log("--- OpenAI API Raw Response Object ---");
    console.log(JSON.stringify(openaiResponse, null, 2));

    if (!openaiResponse || !openaiResponse.choices || openaiResponse.choices.length === 0) {
        console.error("OpenAI Response Error: No choices found in response.");
        return res.status(500).json({ error: "OpenAI did not return any content." });
    }

    const textContent = openaiResponse.choices[0].message.content;
    console.log("OpenAI choices[0].message.content BEFORE JSON.parse:", textContent);

    let parsedData;
    try {
      parsedData = JSON.parse(textContent);
      console.log("Successfully parsed OpenAI response JSON.");
    } catch (parseError) {
      console.error("--- Failed to Parse OpenAI JSON Response ---");
      console.error("Error details:", parseError.message);
      console.error("Raw textContent from OpenAI (problematic):", textContent);
      // Return a clearly stringified error, ensuring frontend can parse it
      return res.status(500).json({ error: 'OpenAI returned invalid JSON or unparseable content', raw: String(textContent) });
    }

    // Construct final response for the frontend
    const finalResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: parsedData // This should be the parsed JSON object
              }
            ]
          }
        }
      ]
    };

    console.log("Sending final response to frontend:", JSON.stringify(finalResponse, null, 2));
    res.json(finalResponse);

  } catch (error) {
    // --- ENHANCED GENERAL ERROR LOGGING ---
    console.error("--- OpenAI API Call Failed or Unhandled Error ---");
    console.error("  Error message:", error.message);
    console.error("  Error name:", error.name);
    if (error.status) console.error("  HTTP Status:", error.status); // For HTTP errors from OpenAI
    if (error.code) console.error("  OpenAI Error Code:", error.code); // Specific OpenAI error code
    if (error.type) console.error("  OpenAI Error Type:", error.type); // Specific OpenAI error type
    if (error.param) console.error("  OpenAI Error Param:", error.param); // Specific OpenAI error param
    if (error.response && error.response.data) {
        console.error("  Full OpenAI Response Data (if available):", JSON.stringify(error.response.data, null, 2));
    } else {
        // Fallback for general errors, ensuring it's stringifiable
        console.error("  Full error object (raw):", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }

    // Send a structured error response to the frontend
    const errorMessage = error.message || 'An unknown error occurred with the OpenAI API.';
    const statusCode = error.status || 500; // Use error.status if it's an HTTP error, else 500

    res.status(statusCode).json({ error: errorMessage });
  }
});

// Global error handler for unhandled exceptions
app.use((err, req, res, next) => {
  console.error('--- Unhandled Application Error ---');
  console.error('Error details:', err);
  // Ensure the response is always valid JSON
  res.status(500).json({ error: err.message || 'Internal Server Error (Unhandled)' });
});

// 404 handler for unknown endpoints
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${port}`);
  console.log(`Frontend URL for CORS: ${frontendUrl}`);
});