<<<<<<< HEAD
// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai'); // Import the OpenAI library

const app = express();
const port = process.env.PORT || 3001; // Use Render's assigned PORT or fallback to 3001

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173' // Allow requests from your frontend origin
}));
app.use(express.json()); // To parse JSON request bodies

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Ensure you have OPENAI_API_KEY in your .env
});

console.log("Backend server starting...");
console.log("CORS enabled for origin:", process.env.FRONTEND_URL || 'http://localhost:5173');

// API endpoint to generate content
app.post('/generate-content', async (req, res) => {
    console.log("Request received at /generate-content");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const { contents, generationConfig } = req.body;

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
        return res.status(400).json({ error: "Invalid request: 'contents' array is missing or empty." });
    }
    if (!contents[0].parts || !Array.isArray(contents[0].parts) || contents[0].parts.length === 0 || !contents[0].parts[0].text) {
        return res.status(400).json({ error: "Invalid request: 'promptText' is missing from contents." });
    }

    const promptText = contents[0].parts[0].text;
    const responseSchema = generationConfig?.responseSchema; // Get the schema if provided

    // Validate OpenAI API Key
    if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not set in environment variables.");
        return res.status(500).json({ error: "Server configuration error: OpenAI API Key is missing." });
    }

    try {
        console.log("Sending prompt to OpenAI...");

        // Construct the message for OpenAI's chat completion API.
        // Important: For structured JSON output with OpenAI, it's best practice
        // to put the schema instructions directly into the prompt message.
        let fullPrompt;
        if (responseSchema) {
            fullPrompt = `${promptText}\n\nStrictly adhere to the following JSON schema for your response:\n${JSON.stringify(responseSchema, null, 2)}\n\nYour entire response MUST be a valid JSON object matching this schema.`;
        } else {
            fullPrompt = promptText;
        }

        console.log("Full prompt sent to OpenAI (first 500 chars):", fullPrompt.substring(0, 500));
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Using gpt-4o for best results with JSON and instruction following
            messages: [{ role: "user", content: fullPrompt }],
            response_format: { type: "json_object" }, // Crucial for getting JSON output
            temperature: 0.7, // Adjust creativity as needed
            max_tokens: 1500, // Adjust based on expected response length
        });

        const aiResponseContent = completion.choices[0].message.content;
        console.log("Raw OpenAI response content received (first 500 chars):", aiResponseContent ? aiResponseContent.substring(0, 500) : 'No content');

        // Parse the JSON string received from OpenAI
        let parsedData;
        try {
            parsedData = JSON.parse(aiResponseContent);
            console.log("Successfully parsed AI response as JSON.");
        } catch (parseError) {
            console.error("Failed to parse AI response as JSON:", parseError);
            console.error("Problematic AI Response:", aiResponseContent);
            // If parsing fails, try to return a generic error or the raw content if possible
            return res.status(500).json({ 
                error: "AI did not return valid JSON. Please try again.",
                rawAiResponse: aiResponseContent // Optionally send raw response for debugging
=======
// Load environment variables from .env file (for local development)
require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
// const path = require('path'); // Only needed if serving static files from backend

const app = express();
// Use Render's assigned PORT in production, or fallback to 3001 for local development
const port = process.env.PORT || 3001; 

// Middleware
// IMPORTANT CORS FIX: Explicitly allow frontend origin
// Get the frontend URL from Render's environment variable (if set) or use localhost for dev
// You MUST set FRONTEND_URL in Render UI for the backend service.
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'; 

app.use(cors({
    origin: [
        'http://localhost:5173', // Vite dev server (for local testing)
        'http://127.0.0.1:5173', // Another common localhost variant
        frontendUrl, // Your deployed Render frontend URL
        /\.onrender\.com$/, // Fallback for any other Render subdomains (less specific, but can be useful)
        // Add any other specific origins if needed (e.g., if you have a custom domain)
    ],
    credentials: true, // Allow cookies/auth headers if you ever use them
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed request headers
}));

app.use(express.json({ limit: '10mb' })); // Increased limit for potentially large requests

// Define the API key from environment variables (This is your OpenAI API Key)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 

if (!OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is not configured. Please set it in Render environment variables or your local .env file.');
    process.exit(1); 
}

// Check if native 'fetch' is globally available (Node.js v18+)
if (typeof fetch === 'undefined') {
    console.error("Critical Error: Native 'fetch' is not globally available in this Node.js environment.");
    console.error("This usually means you're running a Node.js version older than 18 or there's an environment issue.");
    process.exit(1);
} else {
    console.log(`Native 'fetch' is globally available and its type is: ${typeof fetch}`);
}

// Health check endpoint for debugging
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        port: port,
        nodeVersion: process.version
    });
});

// Basic root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'WHORU Backend API is running!',
        endpoints: ['/health', '/generate-content'],
        status: 'active'
    });
});


// API endpoint to proxy requests to OpenAI
app.post('/generate-content', async (req, res) => {
    console.log('Received request from frontend:', JSON.stringify(req.body, null, 2));

    try {
        const { contents, generationConfig } = req.body; 
        
        if (!contents || !Array.isArray(contents) || contents.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid request: "contents" array is required.',
                received: { contents, generationConfig }
>>>>>>> 58eb5f3fc7f46efab2410e053e8cc44256ca6e00
            });
        }
        
        // Format the OpenAI response to match the structure expected by your frontend (App.js)
        const formattedResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify(parsedData) // Frontend expects a JSON string here
                            }
                        ]
                    }
                }
            ]
        };

<<<<<<< HEAD
        res.json(formattedResponse);
=======
        // Prepare payload for OpenAI Chat Completions API
        const messages = contents.map(part => ({
            role: part.role,
            content: part.parts.map(p => p.text).join('\n') 
        }));

        const openaiPayload = {
            model: "gpt-3.5-turbo", 
            messages: messages,
            temperature: generationConfig?.temperature || 0.7,
            max_tokens: generationConfig?.maxOutputTokens || 2048,
            // *** IMPORTANT: Request JSON object from OpenAI ***
            response_format: { type: "json_object" } 
        };
>>>>>>> 58eb5f3fc7f46efab2410e053e8cc44256ca6e00

        const openaiApiUrl = `https://api.openai.com/v1/chat/completions`;
        
        console.log('Forwarding request to OpenAI API:', openaiApiUrl);
        console.log('OpenAI Payload (messages hidden):', JSON.stringify({ ...openaiPayload, messages: '[HIDDEN]' }, null, 2));
        
        const openaiResponse = await fetch(openaiApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`, 
            },
            body: JSON.stringify(openaiPayload),
        });

        if (!openaiResponse.ok) {
            let errorData;
            try {
                errorData = await openaiResponse.json();
            } catch (parseError) {
                console.error('Failed to parse JSON from OpenAI API response:', parseError);
                return res.status(openaiResponse.status).json({
                    error: `OpenAI API Error! Status: ${openaiResponse.status}`,
                    details: 'Response was not valid JSON'
                });
            }
            
            console.error('Error from OpenAI API:', errorData);
            return res.status(openaiResponse.status).json({
                error: errorData.error?.message || `OpenAI API Error! Status: ${openaiResponse.status}`,
                details: errorData
            });
        }

        const openaiResult = await openaiResponse.json();
        console.log('Response from OpenAI API:', JSON.stringify(openaiResult, null, 2));

        // Extract generated content from OpenAI response
        let generatedContent = null; 
        if (openaiResult.choices && openaiResult.choices.length > 0 && openaiResult.choices[0].message && typeof openaiResult.choices[0].message.content === 'string') {
            try {
                // Attempt to parse the content as JSON, as we requested json_object
                generatedContent = JSON.parse(openaiResult.choices[0].message.content);
                console.log("Parsed OpenAI content as JSON object.");
            } catch (e) {
                console.error("OpenAI content was NOT valid JSON despite request:", e, "Raw content:", openaiResult.choices[0].message.content);
                // If parsing fails, it means OpenAI didn't return valid JSON.
                // We'll return an error to the frontend, as the frontend expects structured JSON.
                return res.status(500).json({
                    error: 'OpenAI did not return valid JSON for the structured description.',
                    details: openaiResult.choices[0].message.content,
                    openaiResponse: openaiResult
                });
            }
        } 
        
        if (!generatedContent || typeof generatedContent !== 'object') {
            console.error('No valid JSON object content was generated by OpenAI:', openaiResult);
            return res.status(500).json({
                error: 'No valid JSON object content was generated by OpenAI',
                openaiResponse: openaiResult
            });
        }

        // Format response into the Gemini-style structure expected by the frontend
        // *** IMPORTANT CHANGE: Pass the parsed object directly, not a string ***
        const finalResponseForFrontend = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                // Pass the actual JavaScript object here
                                text: generatedContent 
                            }
                        ]
                    }
                }
            ]
        };

        console.log("✅ Final response to frontend:", JSON.stringify(finalResponseForFrontend, null, 2));

        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(finalResponseForFrontend);
        
    } catch (error) {
<<<<<<< HEAD
        console.error("Error generating content from OpenAI:", error);
        // More detailed error logging for OpenAI API specific errors
        if (error instanceof OpenAI.APIError) {
            console.error(error.status); // e.g. 401
            console.error(error.message); // e.g. The authentication token you passed was invalid...
            console.error(error.code); // e.g. 'invalid_api_key'
            console.error(error.type); // e.g. 'authentication_error'
            return res.status(error.status || 500).json({ 
                error: `OpenAI API Error: ${error.message}`, 
                code: error.code 
            });
        } else {
            return res.status(500).json({ error: "Failed to generate content: " + error.message });
        }
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
    console.log(`Access at http://localhost:${port}`);
});
=======
        console.error('Server error during OpenAI API call:', error);
        
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Start the server
app.listen(port, '0.0.0.0', () => { // '0.0.0.0' for Render compatibility
    console.log(`Backend server listening at http://localhost:${port}`);
    console.log('This server is handling API requests. The frontend is served separately.'); 
    console.log('Available endpoints:');
    console.log(`- GET http://localhost:${port}/health`);
    console.log(`- GET http://localhost:${port}/`);
    console.log(`- POST http://localhost:${port}/generate-content`);
});
>>>>>>> 58eb5f3fc7f46efab2410e053e8cc44256ca6e00
