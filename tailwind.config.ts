import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // GraniteOS brand (named "granite" to avoid clashing with Tailwind's
        // built-in "stone" palette).
        granite: {
          green: "#0F4C35",
          green2: "#1f8a5b",
          blue: "#0F4C81",
        },
        // Premium dark "stone & gold" theme
        graphite: {
          900: "#0b0e11",
          800: "#11161b",
          700: "#161c22",
          600: "#1c2228",
          500: "#232a31",
        },
        gold: {
          DEFAULT: "#c9a24b",
          soft: "#e6c878",
        },
      },
    },
  },
  plugins: [],
};

export default config;
