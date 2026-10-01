import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#0A0A0F",
          soft: "#14141C",
          mid: "#1E1E2C",
          muted: "#2A2A3C",
        },
        ghost: {
          DEFAULT: "#F0EFE8",
          dim: "#C8C7BC",
          faint: "#7A7970",
        },
        acid: {
          DEFAULT: "#C8FF00",
          dim: "#A0CC00",
          glow: "rgba(200, 255, 0, 0.15)",
        },
        status: {
          applied: "#4ADECD",
          interview: "#FFD166",
          offer: "#06D6A0",
          rejected: "#FF6B6B",
          error: "#FF4444",
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(200,255,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,255,0,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-40": "40px 40px",
      },
      boxShadow: {
        "acid-glow": "0 0 20px rgba(200, 255, 0, 0.2)",
        "acid-sm": "0 0 8px rgba(200, 255, 0, 0.15)",
        "card": "0 1px 0 rgba(200,255,0,0.06), 0 4px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "pulse-acid": "pulseAcid 2s ease-in-out infinite",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
      },
      keyframes: {
        pulseAcid: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
