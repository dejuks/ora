/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        ora: {
          primary: "#7A1849",
          dark: "#531324",
          darker: "#2D0A14",
          gold: "#C59B4B",
          light: "#FCF7F9",
        },
      },
    },
  },
  plugins: [],
};