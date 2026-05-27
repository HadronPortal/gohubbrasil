import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        oswald: ["Oswald", "sans-serif"],
        sans: ["Open Sans", "sans-serif"],
      },
      colors: {
        border: "#2a3347",
        input: "#141b2a",
        ring: "#f0c040",
        background: "#1c2333",
        foreground: "#c8d4e8",
        primary: {
          DEFAULT: "#f0c040",
          foreground: "#1c2333",
        },
        secondary: {
          DEFAULT: "#141b2a",
          foreground: "#8a9ab5",
        },
        destructive: {
          DEFAULT: "#8b0000",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#141b2a",
          foreground: "#8a9ab5",
        },
        accent: {
          DEFAULT: "#f0c040",
          foreground: "#1c2333",
        },
        popover: {
          DEFAULT: "#1c2333",
          foreground: "#c8d4e8",
        },
        card: {
          DEFAULT: "#141b2a",
          foreground: "#c8d4e8",
        },
      },
      borderRadius: {
        lg: "4px",
        md: "4px",
        sm: "4px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;