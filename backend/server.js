// Load environment variables from .env file
require('dotenv').config(); 

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001; // Use port 3001 or whatever is available

// Middleware
app.use(cors()); // Enable CORS for all routes, allowing your frontend to connect
app.use(express.json()); // Enable parsing JSON request bodies

// Define the API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Check if the API key is provided
if (!GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not set in the .env file. Please set it to run the backend server.');
    process.exit(1); // Exit the process if the API key is missing
}

// Since Node.js v18+, 'fetch' is globally available.
// We no longer need to 'require("node-fetch")'.
// Added a direct check for fetch availability for robust logging.
if (typeof fetch === 'undefined') {
    console.error("Critical Error: Native 'fetch' is not globally available in this Node.js environment.");
    console.error("This usually means you're running Node.js version older than 18 or there's an environment issue.");
    process.exit(1);
} else {
    console.log(`Native 'fetch' is globally available and its type is: ${typeof fetch}`);
}


// API endpoint to proxy requests to Gemini
app.post('/generate-content', async (req, res) => {
    // Log the incoming request body from the frontend
    console.log('Received request from frontend:', JSON.stringify(req.body, null, 2));

    try {
        const { contents, generationConfig } = req.body; // Extract contents and generationConfig from frontend request

        // Validate the incoming request payload
        if (!contents || !Array.isArray(contents) || contents.length === 0) {
            return res.status(400).json({ error: 'Invalid request: "contents" array is required.' });
        }

        // Construct the payload for the Gemini API
        const geminiPayload = {
            contents: contents,
            generationConfig: generationConfig // Pass the schema and other config from the frontend
        };

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        console.log('Forwarding request to Gemini API:', geminiApiUrl);
        console.log('Gemini Payload:', JSON.stringify(geminiPayload, null, 2));

        // Make the request to the Gemini API using the native global fetch
        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(geminiPayload),
        });

        // Handle non-OK responses from Gemini API
        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error('Error from Gemini API:', errorData);
            return res.status(geminiResponse.status).json({
                error: errorData.error?.message || `Gemini API error! Status: ${geminiResponse.status}`
            });
        }

        const geminiResult = await geminiResponse.json();
        console.log('Response from Gemini API:', JSON.stringify(geminiResult, null, 2));

        // Send the Gemini API's result back to the frontend
        res.status(200).json(geminiResult);

    } catch (error) {
        console.error('Server error during Gemini API call:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    console.log('Remember to start your React frontend and point its API calls to this backend URL.');
});
