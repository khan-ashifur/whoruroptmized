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

        res.json(formattedResponse);

    } catch (error) {
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