/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#653F84",
          60: "#8A68A5",
          70: "#774F95",
          80: "#653F84",
          90: "#4B2E66",
        },
        secondary: "#B79AE0",
        tertiary: "#231134",
        neutral: "#05030A",
        surface: "#120B1A",
        "on-surface": "#FFFFFF",
        error: "#D94B5F",
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '28px',
        full: '9999px',
      },
      spacing: {
        xs: '8px',
        sm: '16px',
        md: '28px',
        lg: '48px',
        xl: '80px',
      }
    },
  },
  plugins: [],
}
