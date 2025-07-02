import React, { useState, useEffect, useRef, useCallback } from 'react';

// Personality Type Names and Short Descriptions (from 16 personalities.docx)
// *** MODIFIED: Renamed types to generic, non-trademarked names ***
const personalityTypesData = {
    'ISTJ': { name: "The Practical Logician", description: "দায়িত্বশীল , সুনির্দিষ্ট ও কার্যনিষ্ঠ" },
    'ISFJ': { name: "The Compassionate Guardian", description: "সহানুভূতিশীল , বিশ্বস্ত ও যত্নবান" },
    'INFJ': { name: "The Insightful Visionary", description: "অন্তর্দৃষ্টি , আদর্শবাদী ও সহানুভূতিশীল" },
    'INTJ': { name: "The Strategic Mastermind", description: "কৌশলী , স্বনির্ভর ও ভবিষ্যতমুখী" },
    'ISTP': { name: "The Adaptable Craftsman", description: "বাস্তবধর্মী , বিশ্লেষণী ও হাতেকলমে দক্ষ" },
    'ISFP': { name: "The Creative Explorer", description: "শান্তিপ্রিয় , শিল্পমনস্ক ও নমনীয়" },
    'INFP': { name: "The Idealistic Dreamer", description: "কল্পনাপ্রবণ , আদর্শবাদী ও অনুভবশীল" },
    'INTP': { name: "The Analytical Innovator", description: "বিশ্লেষণী , কৌতূহলী ও চিন্তাশীল" },
    'ESTP': { name: "The Energetic Doer", description: "গতিশীল , বাস্তববাদী ও রিস্ক টেকার" },
    'ESFP': { name: "The Spontaneous Performer", description: "প্রাণবন্ত , উপভোগপ্রিয় ও বন্ধুত্বপূর্ণ" },
    'ENFP': { name: "The Enthusiastic Originator", description: "উদ্যমী , কল্পনাবান ও সমাজপ্রিয়" },
    'ENTP': { name: "The Inventive Debater", "description": "যুক্তিপূর্ণ , উদ্ভাবনী ও বিতর্কপ্রিয়" },
    'ESTJ': { name: "The Efficient Organizer", description: "সংগঠক , কর্তৃত্বশীল ও বাস্তববাদী" },
    'ESFJ': { name: "The Harmonious Supporter", description: "যত্নশীল , সহানুভূতিশীল ও সামাজিক" },
    'ENFJ': { name: "The Charismatic Inspirer", description: "নেতৃস্থানীয় , সহানুভূতিশীল ও উৎসাহদায়ী" },
    'ENTJ': { name: "The Decisive Leader", description: "কৌশলী , আত্মবিশ্বাসী ও নেতৃত্বদক্ষ" },
};

// Questions data in Bengali, with impact on personality scores
const questions = [
    // Category 1: Mind — Introvert (I) vs Extrovert (E)
    { question: "আমি নিয়মিতভাবে নতুন বন্ধু তৈরি করি।", traitPair: ['E', 'I'] },
    { question: "অজানা লোকেদের সাথে যোগাযোগ বা নিজের প্রচার করাকে আমি খুব কঠিন মনে করি।", traitPair: ['E', 'I'] },
    { question: "যাকে আকর্ষণীয় মনে হয়, তার সঙ্গে গিয়ে আলাপ শুরু করতে আমি স্বাচ্ছন্দ্যবোধ করি।", traitPair: ['E', 'I'] },
    { question: "দলভিত্তিক কার্যলাপে অংশ নিতে আমি উপভোগ করি।", traitPair: ['E', 'I'] },
    { question: "আমি সাধারণত একা থাকার চেয়ে অন্যদের সঙ্গে থাকতে বেশি পছন্দ করি।", traitPair: ['E', 'I'] },
    { question: "আমি সাধারণত ফোন কল করা এড়িয়ে চলি।", traitPair: ['I', 'E'] },
    { question: "আমি নতুন পরিচিত মানুষের সঙ্গে সহজেই কানেক্ট হতে পারি।", traitPair: ['E', 'I'] },
    { question: "আমি এমন একটি কাজ পছন্দ করব যেখানে বেশিরভাগ সময় একা কাজ করা যায়।", traitPair: ['I', 'E'] },
    { question: "আমি শান্ত ও ব্যক্তিগত জায়গার চেয়ে ব্যস্ত ও কোলাহলপূর্ণ পরিবেশে বেশি স্বাচ্ছন্দ্য বোধ করি।", traitPair: ['E', 'I'] },
    { question: "অনেক চাপের মধ্যেও আমি সাধারণত শান্ত থাকতে পারি।", traitPair: ['E', 'I'] },

    // Category 2: Energy — Practical (S) vs Imaginative (N)
    { question: "জটিল ও নতুন আইডিয়া আমার বেশি উত্তেজিত করে, সহজ ও সরল ধারণার চেয়ে।", traitPair: ['N', 'S'] },
    { question: "সৃজনশীল কাজের নানা রকম ব্যাখ্যা নিয়ে আলোচনা আমার তেমন আগ্রহ জাগায় না।", traitPair: ['S', 'N'] },
    { question: "কোনো সিদ্ধান্ত নেওয়ার সময় আমি মানুষের অনুভূতির চেয়ে তথ্যকে বেশি গুরুত্ব দিই।", traitPair: ['S', 'N'] },
    { question: "আমি প্রায়ই নির্দিষ্ট কোনো সময়সূচি ছাড়া দিনটাকে চলতে দিই।", traitPair: ['S', 'N'] },
    { question: "আমি সত্য বলার চেয়ে সংবেদনশীল থাকার দিকটিকে বেশি গুরুত্ব দিই।", traitPair: ['F', 'T'] },
    { question: "আমি নতুন অভিজ্ঞতা ও জ্ঞানের ক্ষেত্র খুঁজে বের করতে সক্রিয় থাকি।", traitPair: ['N', 'S'] },
    { question: "জীবিকার জন্য কল্পকাহিনি লেখা আমার জন্য কল্পনাতীত মনে হয়।", traitPair: ['S', 'N'] },
    { question: "নৈতিক দ্বন্দ্ব নিয়ে বিতর্ক করতে আমি উপভোগ করি।", traitPair: ['N', 'S'] },
    { question: "আলোচনা খুব তাত্ত্বিক হয়ে গেলে আমি আগ্রহ হারিয়ে ফেলি বা বিরক্ত হই।", traitPair: ['S', 'N'] },
    { question: "অপরিচিত ধারণা ও দৃষ্টিভঙ্গি আবিষ্কার করতে আমি উপভোগ করি।", traitPair: ['N', 'S'] },

    // Category 3: Nature — Thinking (T) vs Feeling (F)
    { question: "তথ্যভিত্তিক যুক্তির চেয়ে আবেগে যা নাড়া দেয়, আমি সেটাতে বেশি প্রভাবিত হই।", traitPair: ['F', 'T'] },
    { question: "কোনো সিদ্ধান্ত নেওয়ার সময় আমি মানুষের অনুভূতির চেয়ে তথ্যকে বেশি গুরুত্ব দিই।", traitPair: ['T', 'F'] },
    { question: "আমি সত্য বলার চেয়ে সংবেদনশীল থাকার দিকটিকে বেশি গুরুত্ব দিই।", traitPair: ['F', 'T'] },
    { question: "আমি সিদ্ধান্ত নেওয়ার ক্ষেত্রে দক্ষতাকে প্রাধান্য দিই, যদিও মাঝে মাঝে আবেগের দিকটা উপেক্ষিত হয়।", traitPair: ['T', 'F'] },
    { question: "বিরোধের সময়, অন্যের অনুভূতির চেয়ে নিজের যুক্তি প্রমাণ করাকেই আমি বেশি গুরুত্ব দিই।", traitPair: ['T', 'F'] },
    { question: "আমি সহজে আবেগপ্রবণ যুক্তিতে প্রভাবিত হই না।", traitPair: ['T', 'F'] },
    { question: "তথ্য আর আবেগের মধ্যে দ্বন্দ্ব হলে আমি সাধারণত মনের কথাই অনুসরণ করি।", traitPair: ['F', 'T'] },
    { question: "আমি সাধারণত আবেগের চেয়ে বাস্তব তথ্যের ভিত্তিতে সিদ্ধান্ত নিই।", traitPair: ['T', 'F'] },
    { question: "আমি আবেগকে নিয়ন্ত্রণ করি তার চেয়ে বেশি, আবেগই আমাকে নিয়ন্ত্রণ করে।", traitPair: ['F', 'T'] },
    { question: "আমি সিদ্ধান্ত নেওয়ার সময় যা সবচেয়ে যৌক্তিক বা কার্যকর, তার চেয়ে বেশি ভাবি — এতে মানুষ কতটা এফেক্টেড হবে।", traitPair: ['F', 'T'] },

    // Category 4: Tactics — Judging (J) vs Prospecting (P)
    { question: "আমার থাকার ও কাজ করার জায়গা সাধারণত পরিষ্কার ও গোছানো থাকে।", traitPair: ['J', 'P'] },
    { question: "আমি কাজকে অগ্রাধিকার দিয়ে পরিকল্পনা করি এবং সাধারণত সময়ের আগেই তা শেষ করি।", traitPair: ['J', 'P'] },
    { question: "আমি প্রায়ই নির্দিষ্ট কোনো সময়সূচি ছাড়া দিনটাকে চলতে দিই।", traitPair: ['P', 'J'] },
    { question: "আমি বিশ্রাম নেওয়ার আগে দৈনন্দিন কাজগুলো শেষ করতে পছন্দ করি।", traitPair: ['J', 'P'] },
    { question: "আমি প্রায়ই শেষ মুহূর্তে গিয়ে কাজ শেষ করি।", traitPair: ['P', 'J'] },
    { question: "কাজ বা পড়াশোনার নিয়মিত রুটিন বজায় রাখা আমার জন্য কঠিন হয়।", traitPair: ['P', 'J'] },
    { question: "প্রতিদিনের জন্য আমি কাজের তালিকা (টু-ডু লিস্ট) রাখতে পছন্দ করি।", traitPair: ['J', 'P'] },
    { question: "পরিকল্পনায় ব্যাঘাত ঘটলে আমি যত দ্রুত সম্ভব আগের ধারায় ফিরে যাওয়াকেই সবচেয়ে গুরুত্ব দিই।", traitPair: ['J', 'P'] },
    { question: "আমার কাজের ধরন পরিকল্পিত ও ধারাবাহিককের চেয়ে হঠাৎ করে এনার্জি আসার উপর বেশি নির্ভরশীল।", traitPair: ['P', 'J'] },
    { question: "আমি ধাপে ধাপে কাজ করি এবং কোনো ধাপ এড়িয়ে যাই না।", traitPair: ['J', 'P'] },

    // Category 5: Identity — Confident (A) vs Anxious (X)
    { question: "অনেক চাপের মধ্যেও আমি সাধারণত শান্ত থাকতে পারি।", traitPair: ['A', 'X'] },
    { question: "নতুন মানুষের সামনে নিজেকে কেমনভাবে উপস্থাপন করছি, তা নিয়ে আমি খুব কমই চিন্তা করি।", traitPair: ['A', 'X'] },
    { question: "আমি প্রায়ই দুশ্চিন্তা করি যে কিছু খারাপ হতে পারে।", traitPair: ['X', 'A'] },
    { question: "আমি সাধারণত আমার নেওয়া সিদ্ধান্ত নিয়ে দ্বিতীয়বার ভাবি না।", traitPair: ['A', 'X'] },
    { question: "আমার মুড খুব দ্রুত চেঞ্জ হয়", traitPair: ['X', 'A'] },
    { question: "আমি সাধারণত নিজেকে ভীষণ চাপে বা অস্থিরতায় ডুবে থাকা অনুভব করি।", traitPair: ['X', 'A'] },
    { question: "আমি খুব কম সময়েই নিজেকে অনিরাপড বা অস্থির অনুভব করি।", traitPair: ['A', 'X'] },
    { question: "কেউ আমাকে নিয়ে ভালো ধারণা পোষণ করলে আমি ভাবি, কবে তারা হতাশ হবে আমার প্রতি।", traitPair: ['X', 'A'] },
    { question: "আমার মনে হয় বিমূর্ত দর্শনগত প্রশ্ন নিয়ে চিন্তা করা সময়ের অপচয়।", traitPair: ['A', 'X'] },
    { question: "আমি আত্মবিশ্বাসী যে, শেষ পর্যন্ত সবকিছুই আমার পক্ষে ভালোভাবে মিলে যাবে।", traitPair: ['A', 'X'] },
];

// MODIFIED: Restored 7 choices, with value 4 label changed
const choices = [
    { value: 1, label: "একদম হ্যাঁ" },
    { value: 2, label: "মোটামুটি হ্যাঁ" },
    { value: 3, label: "কিছুটা হ্যাঁ" },
    { value: 4, label: "হতেও পারে নাও হতে পারে" }, // Changed label, removed "ফিফটি ফিফটি"
    { value: 5, label: "কিছুটা না" },
    { value: 6, label: "মোটামুটি না" },
    { value: 7, label: "একদম না" },
];

// Motivational quotes to display during loading
const motivationalQuotes = [
    { quote: "Your time is limited, so don’t waste it living someone else’s life.", author: "Steve Jobs" },
    { quote: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
    { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { quote: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
    { quote: "Don’t watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { quote: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
    { quote: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
    { quote: "Everything you’ve ever wanted is on the other side of fear.", author: "George Addair" },
    { quote: "The best way to predict the future is to create it.", author: "Peter Drucker" },
    { quote: "Whether you think you can, or you think you can't – you're right.", author: "Henry Ford" },
    { quote: "If you're going through hell, keep going.", author: "Winston Churchill" },
    { quote: "It always seems impossible until it’s done.", author: "Nelson Mandela" },
    { quote: "Opportunities don't happen, you create them.", author: "Chris Grosser" },
    { quote: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
    { quote: "Believe you can and you’re halfway there.", author: "Theodore Roosevelt" },
];

export default function App() { // Added export default here
    const [screen, setScreen] = useState('start');
    const [subScreen, setSubScreen] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questionVisible, setQuestionVisible] = useState(false);
    const [userAnswers, setUserAnswers] = useState({});
    const [resultType, setResultType] = useState('');
    // structuredDescription will now hold the full parsed JSON object from the backend
    const [structuredDescription, setStructuredDescription] = useState(null); 
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('error');
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

    const [submittingFlag, setSubmittingFlag] = useState(false);

    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
    const [quoteVisible, setQuoteVisible] = useState(true);

    const [subPromptResult, setSubPromptResult] = useState(null);
    const [isGeneratingSubPrompt, setIsGeneratingSubPrompt] = useState(false);


    const userAnswersRef = useRef({});
    useEffect(() => {
        userAnswersRef.current = userAnswers;
    }, [userAnswers]);

    useEffect(() => {
        console.log("App component initialized. Total questions:", questions.length);
    }, []);

    useEffect(() => {
        if (screen === 'test') {
            setQuestionVisible(false);
            const timer = setTimeout(() => {
                setQuestionVisible(true);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [currentQuestionIndex, screen]);

    useEffect(() => {
        let quoteDisplayTimer;
        let quoteFadeOutTimer;

        if (isGeneratingDescription || isGeneratingSubPrompt) {
            setQuoteVisible(true);
            quoteDisplayTimer = setTimeout(() => {
                setQuoteVisible(false);
            }, 3000);

            quoteFadeOutTimer = setTimeout(() => {
                setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % motivationalQuotes.length);
                setQuoteVisible(true);
            }, 3500);
        } else {
            setQuoteVisible(false);
            clearTimeout(quoteDisplayTimer);
            clearTimeout(quoteFadeOutTimer);
        }

        return () => {
            clearTimeout(quoteDisplayTimer);
            clearTimeout(quoteFadeOutTimer);
        };
    }, [isGeneratingDescription, isGeneratingSubPrompt, currentQuoteIndex]);

    const showMessage = (msg, type = 'error') => {
        setMessage(msg);
        setMessageType(type);
        if (msg !== "অনুগ্রহ করে সব প্রশ্নের উত্তর দিন।" && msg !== "অনুগ্রহ করে এই প্রশ্নের উত্তর দিন।") {
             setTimeout(() => {
                 setMessage('');
             }, 3000);
        }
    };

    const selectAnswer = (selectedScaleIndex) => {
        if (submittingFlag) return;

        setMessage('');

        const newAnswers = { ...userAnswers, [currentQuestionIndex]: selectedScaleIndex };
        setUserAnswers(newAnswers);
        userAnswersRef.current = newAnswers;

        const isLastQuestion = (currentQuestionIndex === questions.length - 1);
        if (isLastQuestion) {
            console.log("Last question answered. Attempting to submit test.");
            setTimeout(() => {
                submitTest();
            }, 100);
        } else {
            console.log("Moving to next question automatically.");
            setTimeout(() => {
                setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
            }, 100);
        }
    };

    const handleNextQuestion = () => {
        if (userAnswers[currentQuestionIndex] === undefined) {
            showMessage("অনুগ্রহ করে এই প্রশ্নের উত্তর দিন।", 'error');
            return;
        }

        const isLastQuestion = (currentQuestionIndex === questions.length - 1);

        console.log(`Manual Next Click: Current Q: ${currentQuestionIndex}, Is Last: ${isLastQuestion}, Answered: ${userAnswers[currentQuestionIndex] !== undefined}`);

        if (isLastQuestion) {
            console.log("Last question answered. Attempting to submit test via manual next button click.");
            submitTest();
        } else {
            console.log("Moving to next question via manual next button click.");
            setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
        }
    };

    const previousQuestion = () => {
        setMessage('');
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prevIndex) => prevIndex - 1);
        }
    };

    const calculatePersonalityType = useCallback(() => {
        const answersToCalculate = userAnswersRef.current;
        const tempScores = {
            'E': 0, 'I': 0, 'S': 0, 'N': 0,
            'T': 0, 'F': 0, 'J': 0, 'P': 0,
            'A': 0, 'X': 0
        };

        for (let qIndex = 0; qIndex < questions.length; qIndex++) {
            if (answersToCalculate[qIndex] !== undefined) {
                const answerValue = answersToCalculate[qIndex];
                const question = questions[qIndex];

                if (!question || !question.traitPair) {
                    console.error(`Error: Question or traitPair is undefined for index ${qIndex}. Question:`, question);
                    continue;
                }

                const [trait1, trait2] = question.traitPair;
                // MODIFIED: Scoring logic adjusted for 7 options, with 4 as neutral point
                const scoreValue = 4 - answerValue; // Neutral point is 4 (হতেও পারে নাও হতে পারে)

                if (scoreValue > 0) { // If answer is 1,2,3 (Agree/হ্যাঁ side)
                    tempScores[trait1] += scoreValue;
                } else if (scoreValue < 0) { // If answer is 5,6,7 (Disagree/না side)
                    tempScores[trait2] += Math.abs(scoreValue);
                }
                // If scoreValue is 0 (answerValue is 4), no score is added to either trait, which is correct for neutral.
            }
        }

        let type = '';
        type += (tempScores['E'] >= tempScores['I']) ? 'E' : 'I';
        type += (tempScores['S'] >= tempScores['N']) ? 'S' : 'N';
        type += (tempScores['T'] >= tempScores['F']) ? 'T' : 'F';
        type += (tempScores['J'] >= tempScores['P']) ? 'J' : 'P';
        
        return type;
    }, []);

    const submitTest = useCallback(() => {
        if (submittingFlag) {
            console.log("Submission already in progress, preventing duplicate call.");
            return;
        }
        setSubmittingFlag(true);

        const answersToSubmit = userAnswersRef.current;
        console.log("--- SUBMIT TEST INITIATED ---");
        console.log("Answers captured for submission:", answersToSubmit);
        const currentAnswersCount = Object.keys(answersToSubmit).length;
        console.log(`Number of answers captured: ${currentAnswersCount} / ${questions.length}`);

        if (currentAnswersCount !== questions.length) {
            showMessage("অনুগ্রহ করে সব প্রশ্নের উত্তর দিন।", 'error');
            console.error(`Submission failed: Not all questions answered. Expected ${questions.length}, but got ${currentAnswersCount}.`);
            setSubmittingFlag(false);
            return;
        }
        
        const finalCalculatedType = calculatePersonalityType();
        console.log("Calculated personality type (4-letter):", finalCalculatedType);

        const validTypes = Object.keys(personalityTypesData);
        if (!validTypes.includes(finalCalculatedType)) {
            console.error(`Submission failed: Calculated type "${finalCalculatedType}" is not a standard type. Using UNKNOWN.`); // *** MBTI reference was here ***
            showMessage("ব্যক্তিত্বের ধরণ নির্ণয় করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।", 'error');
            // Fallback to a generic "Unknown" type if calculation somehow fails or produces non-standard
            setResultType('UNKNOWN'); 
        } else {
            setResultType(finalCalculatedType);
        }

        console.log(`Successfully calculated type: ${finalCalculatedType}. Transitioning to result screen.`);
        setScreen('result');
        console.log(`State update scheduled: screen to 'result', resultType to '${finalCalculatedType}'`);
        setSubmittingFlag(false);
        console.log("--- SUBMIT TEST COMPLETED ---");
    }, [submittingFlag, calculatePersonalityType]);

    const restartTest = () => {
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setResultType('');
        setStructuredDescription(null);
        setMessage('');
        setMessageType('error');
        setIsGeneratingDescription(false);
        setScreen('start');
        setSubmittingFlag(false);
        setCurrentQuoteIndex(0);
        setQuoteVisible(true);
        setSubPromptResult(null);
        setIsGeneratingSubPrompt(false);
    };

    useEffect(() => {
        console.log(`Effect: screen is '${screen}', resultType is '${resultType}', structuredDescription is ${structuredDescription ? 'set' : 'null'}, isGeneratingDescription is ${isGeneratingDescription}`);
        console.log(`Effect dependencies: screen=${screen}, resultType=${resultType}, structuredDescription=${structuredDescription}, isGeneratingDescription=${isGeneratingDescription}`);

        if (screen === 'result' && resultType && !structuredDescription && !isGeneratingDescription) {
            console.log(`Condition met for fetchFullDescriptionFromAI. Calling with type: '${resultType}'`);
            fetchFullDescriptionFromAI(resultType, 'initial_description');
        } else if (screen === 'result' && !resultType && !isGeneratingDescription) {
            console.error("Result screen entered without a valid resultType or while generating. This might indicate an earlier calculation error or double trigger.");
            showMessage("ব্যক্তিত্বের ধরণ নির্ণয় করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।", 'error');
        } else {
            console.log("Condition NOT met for fetchFullDescriptionFromAI. Current state:", { screen, resultType, structuredDescription, isGeneratingDescription });
        }
    }, [screen, resultType, structuredDescription, isGeneratingDescription]);

    const fetchFullDescriptionFromAI = async (type, promptKey) => {
        console.log(`fetchFullDescriptionFromAI called for promptKey: '${promptKey}', type: '${type}'`);
        if (promptKey === 'initial_description') {
            setIsGeneratingDescription(true);
            setStructuredDescription(null);
            console.log("setIsGeneratingDescription set to true, structuredDescription cleared.");
        } else {
            setIsGeneratingSubPrompt(true);
            setSubPromptResult(null);
            console.log("setIsGeneratingSubPrompt set to true, subPromptResult cleared.");
        }
        
        setMessage('বিস্তারিত বর্ণনা তৈরি হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।', 'info');
        console.log("Displaying loading message for AI generation.");

        let promptText = "";
        
        // Define prompts and schemas based on promptKey
        if (promptKey === 'initial_description') {
            const personalityInfo = personalityTypesData[type] || {name: "Unknown Type Name", description: "Unknown Type Description"};
            promptText = JSON.stringify({ // Send a JSON string for the backend to parse
                type: type,
                name: personalityInfo.name,
                description: personalityInfo.description,
                promptKey: promptKey // Ensure promptKey is passed to backend
            });

        } else if (promptKey === 'career_sub_prompt') {
            promptText = JSON.stringify({
                type: type, // Pass the MBTI type for sub-prompts too
                promptKey: promptKey
            });
        } else if (promptKey === 'relationship_sub_prompt') {
            promptText = JSON.stringify({
                type: type, // Pass the MBTI type for sub-prompts too
                promptKey: promptKey
            });
        }
        
        try {
            console.log(`Prompt text being sent to backend: ${promptText.substring(0, 100)}...`);
            // Frontend passes structured data to backend, not plain text prompt
            const payload = {
                contents: [{
                    role: "user",
                    parts: [{ text: promptText }] // This will be JSON.stringified promptText
                }],
                // generationConfig should not be sent from frontend; backend controls OpenAI model parameters.
            };

            const apiUrl = `${import.meta.env.VITE_APP_BACKEND_URL}/generate-content`; 

            console.log("Frontend attempting to call backend at:", apiUrl);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error(`Backend API response not OK. Status: ${response.status}`, errorData);
                throw new Error(errorData.error || `Backend API error! Status: ${response.status}`);
            }

            const result = await response.json();
            console.log("Raw response from backend:", result);
            
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                
                const textContent = result.candidates[0].content.parts[0].text; 
                let parsedDescriptionData;
                try {
                    parsedDescriptionData = JSON.parse(textContent);
                    console.log("Successfully parsed backend response as JSON.");
                } catch (jsonParseError) {
                    console.error("Error parsing backend JSON response:", jsonParseError, "Raw text:", textContent);
                    showMessage("বিস্তারিত তথ্য লোড করতে সমস্যা হয়েছে। (অবৈধ প্রতিক্রিয়া)", 'error');
                    throw new Error("Failed to parse JSON response from backend.");
                }

                if (promptKey === 'initial_description') {
                    setStructuredDescription(parsedDescriptionData); 
                    console.log("Structured description state updated successfully with parsed JSON.");
                } else {
                    setSubPromptResult(parsedDescriptionData);
                    console.log("Sub-prompt result state updated successfully with parsed JSON.");
                }
                setMessage('');
                console.log("Loading message cleared after successful fetch.");
            } else {
                console.error("Invalid or empty response structure from backend. Candidates or content parts missing.");
                showMessage("বিস্তারিত বর্ণনা লোad করতে সমস্যা হয়েছে। (অবৈধ প্রতিক্রিয়া)", 'error');
                throw new Error("Invalid or empty response structure from backend.");
            }

        } catch (error) {
            console.error(`Error in fetchFullDescriptionFromAI: ${error.message}`, error);
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                setMessage('ব্যাকএন্ড সার্ভার উপলব্ধ নেই। অনুগ্রহ করে নিশ্চিত করুন যে আপনার Node.js সার্ভার চলছে।', 'error');
                console.error("Network error: Backend server might not be running.");
            } else {
                setMessage(`Error: ${error.message || 'Failed to fetch description'}. অনুগ্রহ করে পুনরায় চেষ্টা করুন।`, 'error');
            }
            if (promptKey === 'initial_description') {
                // Fallback for initial description when it fails
                setStructuredDescription({
                    type: resultType, 
                    name: personalityTypesData[resultType]?.name || 'Unknown Type Name',
                    description_line1: personalityTypesData[resultType]?.description || 'Unknown Type Description',
                    description_line2: '',
                    description_line3: '',
                    general_summary: "বিস্তারিত বর্ণনা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।",
                    strengths: [], challenges: [], career_advice: [], relationship_tips: [], self_improvement_habits: [], coach_message: ""
                });
                console.log("Set fallback structured description.");
            } else {
                setSubPromptResult({message: "বিস্তারিত তথ্য লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।", items: []});
                console.log("Set fallback sub-prompt result.");
            }
        } finally {
            if (promptKey === 'initial_description') {
                setIsGeneratingDescription(false);
                console.log("Finished initial description generation attempt.");
            } else {
                setIsGeneratingSubPrompt(false);
                console.log("Finished sub-prompt generation attempt.");
            }
        }
    };

    const handleBackToMainResult = () => {
        setSubScreen(null);
        setSubPromptResult(null);
        setMessage('');
    };

    // Helper for rendering lists (strengths, challenges etc.)
    const renderListItems = (items, typeKey, subKey, adviceKey) => {
        if (!Array.isArray(items) || items.length === 0) return null;
        return (
            <ul className="list-disc list-inside space-y-2 text-base sm:text-lg mx-auto text-left max-w-full">
                {items.map((item, index) => (
                    <li key={index}>
                        <strong>{item[typeKey]}:</strong> {item[subKey]}{adviceKey && item[adviceKey] ? ` — ${item[adviceKey]}` : ''}
                        {item.action && ` | পদক্ষেপ: ${item.action}`} 
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-inter">
            <style>{`
                /* Fade in/out for motivational quotes */
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(10px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
                }
                .quote-animation {
                    animation: fadeInOut 3.5s forwards;
                }

                /* Fade in for question */
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .question-fade-in {
                    animation: fadeIn 0.5s ease-out forwards;
                }

                /* Custom styling for vertical radio buttons */
                .radio-option-container {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    align-items: flex-start;
                    width: 100%;
                    max-width: 400px;
                    margin-top: 20px;
                }

                .radio-label {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    font-size: 1.125rem;
                    color: #4b5563;
                    padding: 8px 12px;
                    width: 100%;
                    border-radius: 8px;
                    transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
                    border: 1px solid #e5e7eb;
                }

                .radio-label:hover {
                    background-color: #f3f4f6;
                    border-color: #a78bfa;
                }

                .radio-label.selected {
                    background-color: #e0e7ff;
                    border-color: #8b5cf6;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    color: #4c1d95;
                    font-weight: 600;
                }

                .radio-input {
                    appearance: none;
                    -webkit-appearance: none;
                    width: 20px;
                    height: 20px;
                    border: 2px solid #a78bfa;
                    border-radius: 50%;
                    margin-right: 12px;
                    position: relative;
                    flex-shrink: 0;
                    background-color: white;
                }

                .radio-input:checked {
                    background-color: #8b5cf6;
                    border-color: #8b5cf6;
                }

                .radio-input:checked::before {
                    content: '';
                    display: block;
                    width: 10px;
                    height: 10px;
                    background-color: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }

                /* Consistent button styling for navigation arrows */
                .nav-arrow-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 9999px;
                    background-color: #ffffff;
                    border: 2px solid #9ca3af;
                    color: #4b5563;
                    font-size: 1.25rem;
                    transition: all 0.2s ease-in-out;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                }

                .nav-arrow-button:hover:not(:disabled) {
                    background-color: #f3f4f6;
                    border-color: #6b7280;
                    transform: scale(1.05);
                }

                .nav-arrow-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: scale(1);
                }
            `}</style>

            {/* Header Section */}
            <header className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-700 text-white flex flex-col items-center justify-center rounded-b-lg shadow-md mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold mb-2 flex items-center">
                    WHORU <span role="img" aria-label="wizard" className="ml-2 text-3xl sm:text-4xl">🧙‍♂️</span>
                </h1>
                <p className="text-xl sm:text-2xl font-light flex items-center">
                    একটি ছোটো যাত্রা — নিজেকে জানার দিকে <span role="img" aria-label="compass" className="ml-2 text-2xl sm:text-3xl">🧭</span>
                </p>
                {screen === 'start' && (
                    <button
                        onClick={() => setScreen('test')}
                        className="mt-4 px-6 py-2 bg-white text-purple-700 font-semibold rounded-full shadow-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
                    >
                        শুরু করুন
                    </button>
                )}
            </header>

            {/* Main Content Area */}
            <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl justify-center mt-8 px-4 pb-8">
                {screen === 'start' && (
                    <>
                        {/* Description Box 1 */}
                        <div className="bg-[#E6E6FA] text-black rounded-2xl shadow p-6 w-full md:w-1/2">
                            <h2 className="text-xl sm:text-2xl font-bold mb-4">
                                একটু সময় দিন... নিজেকে আরও ভালোভাবে জানার জন্য।
                            </h2>
                            <p className="mb-2 text-base sm:text-lg">কখনও কি মনে হয়েছে — আপনি আসলে কে?</p>
                            <p className="mb-2 text-base sm:text-lg">
                                কেন কিছু সিদ্ধান্ত আপনি সহজে নেন, আবার কিছুতে দ্বিধা অনুভব করেন?
                            </p>
                            <p className="mb-2 text-base sm:text-lg">
                                কেন কারও সাথে সহজেই বন্ধুত্ব হয়, আবার কারও সাথে দূরত্ব থাকে?
                            </p>
                            <p className="mb-2 text-base sm:text-lg">
                                এই সহজ, ছোট্ট টেস্টটি আপনার ব্যক্তিত্বের গভীরতর স্তরগুলো উন্মোচন করবে।
                            </p>
                            <p className="text-base sm:text-lg">
                                আপনার চিন্তার ধরণ, অনুভূতির ধরণ, শক্তি আর চ্যালেঞ্জ — সবকিছুর এক নতুন আয়না আপনি দেখতে পাবেন।
                            </p>
                        </div>

                        {/* Description Box 2 */}
                        <div className="bg-[#E6E6FA] text-black rounded-2xl shadow p-6 w-full md:w-1/2">
                            <h2 className="text-xl sm:text-2xl font-bold mb-4">
                                আপনার জন্য এই টেস্ট কেন গুরুত্বপূর্ণ?
                            </h2>
                            <ul className="list-disc list-inside space-y-2 text-base sm:text-lg">
                                <li>নিজের ভেতরের জগৎকে আরও ভালোভাবে বুঝবেন</li>
                                <li>কোন পরিবেশে আপনি সবচেয়ে স্বচ্ছন্দ — তা জানতে পারবেন</li>
                                <li>কোন কাজ বা সম্পর্ক আপনাকে আনন্দ দেয় — সেটাও স্পষ্ট হবে</li>
                                <li>নিজের উপর আরও আত্মবিশ্বাস তৈরি হবে</li>
                                <li>নতুন দৃষ্টিভঙ্গি আসবে জীবনের প্রতি</li>
                            </ul>
                        </div>
                    </>
                )}

                {screen === 'test' && (
                    <div className="relative bg-white rounded-xl shadow-lg p-6 sm:p-8 lg:p-10 max-w-2xl w-full mx-auto text-center">
                        {/* Question Progress */}
                        <div className="absolute top-6 left-6 text-gray-500 text-sm sm:text-base">
                            প্রশ্ন {Math.min(currentQuestionIndex + 1, questions.length)} এর {questions.length}:
                        </div>

                        {/* Message Box */}
                        {message && (
                            <div className={`absolute top-4 right-4 px-3 py-2 rounded-md text-sm font-semibold
                                ${messageType === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-blue-100 text-blue-700 border border-blue-300'}`}>
                                {message}
                            </div>
                        )}

                        {/* Question Text with fade-in animation */}
                        <div className={`mt-8 mb-10 text-xl sm:text-2xl font-bold text-gray-800 leading-relaxed px-4 min-h-[64px] transition-opacity duration-500 ${questionVisible ? 'opacity-100 question-fade-in' : 'opacity-0'}`}>
                            {questions[currentQuestionIndex]?.question || ''}
                        </div>

                        {/* Choice Column - Changed to vertical radio buttons */}
                        <div className="radio-option-container">
                            {choices.map((choice) => (
                                <label
                                    key={choice.value}
                                    className={`radio-label ${userAnswers[currentQuestionIndex] === choice.value ? 'selected' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name={`question-${currentQuestionIndex}`}
                                        value={choice.value}
                                        checked={userAnswers[currentQuestionIndex] === choice.value}
                                        onChange={() => selectAnswer(choice.value)}
                                        className="radio-input"
                                    />
                                    {choice.label}
                                </label>
                            ))}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-8 w-full flex justify-between items-center px-4">
                            <button
                                onClick={previousQuestion}
                                className="nav-arrow-button"
                                disabled={currentQuestionIndex === 0}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </button>

                            <button
                                onClick={handleNextQuestion}
                                className={`nav-arrow-button ${currentQuestionIndex === questions.length - 1 ? 'px-6 py-3 font-semibold text-lg' : ''}`}
                                disabled={userAnswers[currentQuestionIndex] === undefined}
                            >
                                {currentQuestionIndex === questions.length - 1 ? (
                                    'ফলাফল দেখুন'
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {screen === 'result' && (
                    <div className="bg-white rounded-2xl shadow p-6 w-full max-w-2xl mx-auto text-center">
                        <h2 className="text-3xl sm:text-4xl mb-4 text-green-700">আপনার ব্যক্তিত্বের ধরণ:</h2>
                        <p className="text-5xl sm:text-6xl font-bold mb-6 text-blue-700">
                            {structuredDescription?.type || resultType} {/* Use parsed type or fallback to calculated */}
                        </p>
                        <p className="text-xl sm:text-2xl font-semibold mb-2">
                            {structuredDescription?.name || personalityTypesData[resultType]?.name || 'Unknown Type Name'} {/* Use parsed name or fallback to new generic names */}
                        </p>
                        <p className="text-lg sm:text-xl mb-4">
                            {structuredDescription?.description_line1 || personalityTypesData[resultType]?.description || ''} {/* Use parsed description line 1 or fallback */}
                        </p>
                        {structuredDescription?.description_line2 && (
                            <p className="text-lg sm:text-xl mb-4">{structuredDescription.description_line2}</p>
                        )}
                        {structuredDescription?.description_line3 && (
                            <p className="text-lg sm:text-xl mb-4">{structuredDescription.description_line3}</p>
                        )}

                        <div className="mt-8 p-4 bg-gray-50 rounded-lg shadow-inner text-left">
                            {isGeneratingDescription || isGeneratingSubPrompt ? (
                                <div className="flex flex-col items-center justify-center py-8 px-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-lg min-h-[180px] sm:min-h-[200px]">
                                    <p className="text-gray-700 text-center text-lg sm:text-xl font-medium mb-4">বিস্তারিত বর্ণনা তৈরি হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।</p>
                                    <div className={`text-gray-900 text-xl sm:text-2xl font-semibold italic text-center transition-opacity duration-500 ${quoteVisible ? 'opacity-100 quote-animation' : 'opacity-0'}`}>
                                        “{motivationalQuotes[currentQuoteIndex].quote}”
                                        <p className="text-sm sm:text-base text-gray-600 mt-2 not-italic">— {motivationalQuotes[currentQuoteIndex].author}</p>
                                    </div>
                                </div>
                            ) : (
                                <React.Fragment>
                                    {subScreen === 'career' && subPromptResult ? (
                                        <div className="mt-4 text-center">
                                            <button onClick={handleBackToMainResult} className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 text-sm sm:text-base">
                                                ← ফলাফলে ফিরে যান
                                            </button>
                                            <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-700">ক্যারিয়ার পরামর্শ:</h3>
                                            <p className="mb-4 text-base sm:text-lg">{subPromptResult.career_guidance_message || subPromptResult.message}</p>
                                            {subPromptResult.specific_actions && subPromptResult.specific_actions.length > 0 && (
                                                <ul className="list-disc list-inside mx-auto text-left space-y-2 text-base sm:text-lg max-w-full">
                                                    {subPromptResult.specific_actions.map((action, actionIdx) => (
                                                        <li key={actionIdx}>{action}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : subScreen === 'relationship' && subPromptResult ? (
                                        <div className="mt-4 text-center">
                                            <button onClick={handleBackToMainResult} className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 text-sm sm:text-base">
                                                ← ফলাফলে ফিরে যান
                                            </button>
                                            <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-pink-700">সম্পর্ক ও বন্ধুত্ব:</h3>
                                            <p className="mb-4 text-base sm:text-lg">{subPromptResult.relationship_insight || subPromptResult.message}</p>
                                            {subPromptResult.actionable_tips && subPromptResult.actionable_tips.length > 0 && (
                                                <ul className="list-disc list-inside mx-auto text-left space-y-2 text-base sm:text-lg max-w-full">
                                                    {subPromptResult.actionable_tips.map((tip, tipIdx) => (
                                                        <li key={tipIdx}>{tip}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        // Main result description sections (displaying all structuredDescription fields)
                                        structuredDescription ? (
                                            <React.Fragment>
                                                {structuredDescription.general_summary && (
                                                    <div className="mb-6 text-base sm:text-lg whitespace-pre-wrap text-left">
                                                        {structuredDescription.general_summary}
                                                    </div>
                                                )}

                                                {structuredDescription.strengths && structuredDescription.strengths.length > 0 && (
                                                    <div className="mb-6">
                                                        <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-purple-700 text-left">আপনার প্রধান শক্তি:</h3>
                                                        {renderListItems(structuredDescription.strengths, 'name', 'explanation')}
                                                    </div>
                                                )}

                                                {structuredDescription.challenges && structuredDescription.challenges.length > 0 && (
                                                    <div className="mb-6">
                                                        <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-red-700 text-left">আপনার চ্যালেঞ্জ:</h3>
                                                        {renderListItems(structuredDescription.challenges, 'description', 'advice')}
                                                    </div>
                                                )}

                                                {structuredDescription.career_advice && structuredDescription.career_advice.length > 0 && (
                                                    <div className="mb-6">
                                                        <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-blue-700 text-left">ক্যারিয়ার পরামর্শ:</h3>
                                                        {renderListItems(structuredDescription.career_advice, 'field', 'reason', 'action')}
                                                    </div>
                                                )}

                                                {structuredDescription.relationship_tips && structuredDescription.relationship_tips.length > 0 && (
                                                    <div className="mb-6">
                                                        <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-pink-700 text-left">সম্পর্ক ও বন্ধুত্ব:</h3>
                                                        {renderListItems(structuredDescription.relationship_tips, 'general_behavior', 'tip')}
                                                    </div>
                                                )}

                                                {structuredDescription.self_improvement_habits && structuredDescription.self_improvement_habits.length > 0 && (
                                                    <div className="mb-6">
                                                        <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-green-700 text-left">আত্মউন্নয়নের অভ্যাস:</h3>
                                                        {renderListItems(structuredDescription.self_improvement_habits, 'habit', 'benefit')}
                                                    </div>
                                                )}

                                                {structuredDescription.coach_message && (
                                                    <div className="mb-4 text-base sm:text-lg italic text-gray-700 text-left border-l-4 border-gray-400 pl-4 py-2">
                                                        <p className="font-semibold text-gray-800">কোচের বার্তা:</p>
                                                        {structuredDescription.coach_message}
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ) : (
                                            !isGeneratingDescription && resultType && (
                                                <p className="text-center text-red-500 text-base sm:text-lg">
                                                    বিস্তারিত বর্ণনা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন বা কুইজটি আবার দিন।
                                                </p>
                                            )
                                        )
                                    )}
                                </React.Fragment>
                            )}
                        </div>

                        <button
                            onClick={restartTest}
                            className="px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-300 bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center mx-auto mt-6"
                        >
                            পুনরায় শুরু করুন <i className="fas fa-redo ml-2"></i>
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="mt-auto py-6 text-center text-gray-600 text-xs sm:text-sm leading-relaxed px-4">
                © 2025 WHORU. এটি শুধু একটি টেস্ট নয় — এটি আপনার নিজের সাথে একটি সংলাপ। নিজেকে জানার এই যাত্রা... আপনি কি প্রস্তুত?
            </footer>
        </div>
    );
}