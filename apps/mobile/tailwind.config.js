/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          900: "#1B4332",
          800: "#2D6A4F",
          600: "#40916C",
        },
        score: {
          green: "#16a34a",
          yellow: "#d97706",
          red: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};
