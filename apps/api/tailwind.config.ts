import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — dark forest green
        brand: {
          DEFAULT: "#1B4332",
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          500: "#22c55e",
          700: "#15803d",
          800: "#166534",
          900: "#1B4332",
          950: "#0D2818",
        },
        // Score tier colors
        score: {
          green: "#16a34a",    // tier: green (≥7.0)
          greenBg: "#f0fdf4",
          greenBorder: "#bbf7d0",
          yellow: "#d97706",   // tier: yellow (4.0–6.9)
          yellowBg: "#fffbeb",
          yellowBorder: "#fde68a",
          red: "#dc2626",      // tier: red (≤3.9)
          redBg: "#fef2f2",
          redBorder: "#fecaca",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "progress": "progress 0.5s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        progress: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
