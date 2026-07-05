import type { Config } from "tailwindcss";

/**
 * Design tokens — "night terminal" theme.
 * Deep blue-black base, warm phosphor-amber accent, cool slate text.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lessons/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07090F",
          900: "#0B0E16",
          850: "#0F1320",
          800: "#141928",
          700: "#1C2236",
          600: "#2A3350",
        },
        mist: {
          100: "#EAEDF5",
          200: "#C9CFDF",
          300: "#A6AEC5",
          400: "#7C859F",
          500: "#5A6178",
        },
        ember: {
          300: "#FFD9A0",
          400: "#FFC272",
          500: "#FFAD47",
          600: "#E88F1F",
        },
        signal: {
          green: "#4ADE80",
          red: "#F87171",
          blue: "#7DD3FC",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.06)",
        glow: "0 0 24px rgba(255,173,71,0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
