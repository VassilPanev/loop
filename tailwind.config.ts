import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        night: "#100D0B",
        ink: "#1A1511",
        mist: "#E8DFD0",
        muted: "#B3A695",
        ember: "#C9B79F",
        moss: "#9D9282"
      },
      boxShadow: {
        glow: "0 0 48px rgba(201, 183, 159, 0.13)"
      }
    }
  },
  plugins: []
};

export default config;
