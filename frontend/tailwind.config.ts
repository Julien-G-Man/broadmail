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
        brand: "#1a1a2e",
        "brand-accent": "#e94560",
        surface: "#ffffff",
        "surface-2": "#f8f8f8",
        "surface-3": "#f0f0f0",
        border: "#e5e5e5",
        "text-primary": "#111111",
        "text-secondary": "#666666",
        "text-muted": "#999999",
        success: "#16a34a",
        warning: "#d97706",
        error: "#dc2626",
      },
      fontFamily: {
        display: ["DM Sans", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
