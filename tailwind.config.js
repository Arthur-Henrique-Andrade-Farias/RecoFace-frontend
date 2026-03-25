/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  "#eef2f9",
          100: "#d5dff0",
          200: "#adc0e2",
          300: "#7599cc",
          400: "#4a72b3",
          500: "#2d5598",
          600: "#1e3a5f",
          700: "#172d4a",
          800: "#112036",
          900: "#0a1322",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
