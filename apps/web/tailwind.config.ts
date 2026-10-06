import type { Config } from "tailwindcss";

// Brand + score colors mirror apps/mobile/tailwind.config.js so web and app
// stay visually one product. Keep the two in sync.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F1F8F4",
          100: "#DCEFE3",
          600: "#40916C",
          800: "#2D6A4F",
          900: "#1B4332",
        },
        cream: "#FAF8F3",
        score: {
          green: "#16a34a",
          yellow: "#d97706",
          red: "#dc2626",
        },
      },
      fontFamily: {
        serif: ["var(--font-lora)", "Georgia", "serif"],
        sans: ["var(--font-raleway)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
