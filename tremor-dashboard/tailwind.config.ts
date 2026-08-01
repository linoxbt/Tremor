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
        cs: {
          bg: "#07070a",
          elevated: "#0e0e12",
          card: "#121218",
          hover: "#1a1a22",
          border: "#23232d",
          muted: "#9a968f",
          dim: "#6b6760",
          accent: "#ff6b2c",
          green: "#3dd68c",
          red: "#ff5c6a",
          blue: "#5b9dff",
          amber: "#f5b942",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
        display: ["var(--font-display)"],
      },
      borderRadius: {
        cs: "12px",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(255, 107, 44, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
