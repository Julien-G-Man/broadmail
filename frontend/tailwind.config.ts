import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand:          "#1a1a2e",
        "brand-light":  "#252542",
        "brand-accent": "#e94560",
        surface:        "#ffffff",
        "surface-2":    "#f4f5f7",
        "surface-3":    "#ecedf0",
        border:         "#e4e5e9",
        "text-primary":   "#111118",
        "text-secondary": "#5c5c70",
        "text-muted":     "#9898aa",
        success:  "#16a34a",
        warning:  "#d97706",
        error:    "#dc2626",
      },
      fontFamily: {
        display: ["DM Sans", "sans-serif"],
        sans:    ["Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
