import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        night: "#090A0F",
        ink: "#11131B",
        mist: "#D7D8E0",
        muted: "#989DAE",
        ember: "#E6B17E",
        moss: "#7DBA9A"
      },
      boxShadow: {
        glow: "0 0 48px rgba(230, 177, 126, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
