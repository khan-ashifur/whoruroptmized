/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // আপনার React কম্পোনেন্ট ফাইলগুলোর পাথ এখানে দিন
  ],
  theme: {
    extend: {
      fontFamily: { // Inter ফন্ট যোগ করার জন্য
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}