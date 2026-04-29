/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  "var(--color-primary-50, #eef2f9)",
          100: "var(--color-primary-100, #d5dff0)",
          200: "var(--color-primary-200, #adc0e2)",
          300: "var(--color-primary-300, #7599cc)",
          400: "var(--color-primary-400, #4a72b3)",
          500: "var(--color-primary-500, #2d5598)",
          600: "var(--color-primary-600, #1e3a5f)",
          700: "var(--color-primary-700, #172d4a)",
          800: "var(--color-primary-800, #112036)",
          900: "var(--color-primary-900, #0a1322)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
