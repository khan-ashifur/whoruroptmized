// Load environment variables from .env file (for local development)
require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
// const path = require('path'); // Only needed if serving static files from backend

const app = express();
// Use Render's assigned PORT in production, or fallback to 3001 for local development
const port = process.env.PORT || 3001; 

// Middleware
app.use(cors()); 
app.use(express.json({ limit: '10mb' })); // Increased limit for large requests

// Define the API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('ত্রুটি: GEMINI_API_KEY .env ফাইলে সেট করা নেই। ব্যাকএন্ড সার্ভার চালানোর জন্য এটি সেট করুন।');
    process.exit(1); 
}

// Node.js v18+ থেকে 'fetch' বিশ্বব্যাপী উপলব্ধ।
if (typeof fetch === 'undefined') {
    console.error("গুরুত্বপূর্ণ ত্রুটি: নেটিভ 'fetch' এই Node.js পরিবেশে বিশ্বব্যাপী উপলব্ধ নেই।");
    console.error("এর অর্থ সাধারণত আপনি Node.js সংস্করণ 18 এর চেয়ে পুরানো চালাচ্ছেন বা পরিবেশগত সমস্যা আছে।");
    process.exit(1);
} else {
    console.log(`নেটিভ 'fetch' বিশ্বব্যাপী উপলব্ধ এবং এর টাইপ হলো: ${typeof fetch}`);
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


// জেমিনিতে অনুরোধ প্রক্সি করার জন্য API এন্ডপয়েন্ট
app.post('/generate-content', async (req, res) => {
    console.log('ফ্রন্টএন্ড থেকে অনুরোধ প্রাপ্তি:', JSON.stringify(req.body, null, 2));

    try {
        const { contents, generationConfig } = req.body; 

        if (!contents || !Array.isArray(contents) || contents.length === 0) {
            return res.status(400).json({ 
                error: 'অবৈধ অনুরোধ: "contents" অ্যারে প্রয়োজন।',
                received: { contents, generationConfig }
            });
        }

        const geminiPayload = {
            contents: contents,
            generationConfig: generationConfig || {
                temperature: 0.7,
                candidateCount: 1,
                maxOutputTokens: 2048
            }
        };

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        console.log('জেমিনি API তে অনুরোধ ফরওয়ার্ড করা হচ্ছে:', geminiApiUrl.replace(GEMINI_API_KEY, '[HIDDEN]')); // Hide API key in logs
        console.log('জেমিনি পেলোড:', JSON.stringify(geminiPayload, null, 2));
        
        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(geminiPayload),
        });

        if (!geminiResponse.ok) {
            let errorData;
            try {
                errorData = await geminiResponse.json();
            } catch (parseError) {
                console.error('জেমিনি API থেকে JSON পার্স করতে ব্যর্থ:', parseError);
                return res.status(geminiResponse.status).json({
                    error: `জেমিনি API ত্রুটি! স্থিতি: ${geminiResponse.status}`,
                    details: 'Response was not valid JSON'
                });
            }
            
            console.error('জেমিনি API থেকে ত্রুটি:', errorData);
            return res.status(geminiResponse.status).json({
                error: errorData.error?.message || `জেমিনি API ত্রুটি! স্থিতি: ${geminiResponse.status}`,
                details: errorData
            });
        }

        const geminiResult = await geminiResponse.json();
        console.log('জেমিনি API থেকে প্রতিক্রিয়া:', JSON.stringify(geminiResult, null, 2));
        
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(geminiResult);
        
    } catch (error) {
        console.error('জেমিনি API কলে সার্ভার ত্রুটি:', error);
        
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
            error: 'অভ্যন্তরীণ সার্ভার ত্রুটি',
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

// সার্ভার চালু করুন
app.listen(port, '0.0.0.0', () => { // '0.0.0.0' for Render compatibility
    console.log(`ব্যাকএন্ড সার্ভার http://localhost:${port} এ শুনছে`);
    console.log('এই সার্ভার শুধুমাত্র API অনুরোধ হ্যান্ডেল করছে। ফ্রন্টএন্ড আলাদাভাবে পরিবেশিত হচ্ছে।'); // Clarified log
    console.log('Available endpoints:');
    console.log(`- GET http://localhost:${port}/health`);
    console.log(`- GET http://localhost:${port}/`);
    console.log(`- POST http://localhost:${port}/generate-content`);
});
