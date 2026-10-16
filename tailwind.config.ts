import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            950: "#070D1E",
            900: "#0B132B",
            800: "#1C2541",
            700: "#2B3A67",
            600: "#3A506B",
            500: "#4F6D91",
            400: "#6B88B0",
            100: "#E6ECF5",
            50: "#F1F5FA",
          },
          teal: {
            900: "#014F59",
            800: "#026773",
            700: "#028090",
            600: "#00A896",
            500: "#02C39A",
            400: "#2EC4B6",
            300: "#5CE1E6",
            200: "#A7F3D0",
            100: "#E0F7F6",
            50: "#F0FDFA",
          },
          coral: {
            600: "#D90429",
            500: "#E63946",
            400: "#EF4444",
            100: "#FEE2E2",
            50: "#FEF2F2",
          },
          amber: {
            600: "#D97706",
            500: "#F59E0B",
            400: "#FBBF24",
            100: "#FEF3C7",
            50: "#FFFBEB",
          },
          emerald: {
            600: "#059669",
            500: "#10B981",
            400: "#34D399",
            100: "#D1FAE5",
            50: "#ECFDF5",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
