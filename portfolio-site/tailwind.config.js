/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Brand amber
        gold: {
          DEFAULT: "#fbbf24",
          light:   "#fcd34d",
          dark:    "#d97706",
        },
        // Dark backgrounds
        surface: {
          900: "#050505",
          800: "#090909",
          700: "#0e0e0e",
          600: "#141414",
        },
      },
      letterSpacing: {
        widest2: "0.25em",
        widest3: "0.35em",
      },
    },
  },
  plugins: [],
};
