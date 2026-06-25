const path = require('path');

module.exports = {
  content: [
    path.join(__dirname, "./src/**/*.{js,ts,jsx,tsx,mdx}"),
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "#27272a",
        background: "#09090b",
        foreground: "#fafafa",
        card: {
          DEFAULT: "#18181b",
          foreground: "#fafafa",
        },
        popover: {
          DEFAULT: "#09090b",
          foreground: "#fafafa",
        },
        primary: {
          DEFAULT: "#8b5cf6", // Indigo/violet
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#27272a",
          foreground: "#fafafa",
        },
        muted: {
          DEFAULT: "#27272a",
          foreground: "#a1a1aa",
        },
        accent: {
          DEFAULT: "#f97316", // Stellar Orange
          foreground: "#ffffff",
        },
        stellar: {
          orange: "#f97316",
          dark: "#0f172a",
          purple: "#7c3aed",
        }
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
}
