import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // নিশ্চিত করুন যে এই পাথটি সঠিক
// import './App.css'; // যদি আপনার ফাইল App.css হয়

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);