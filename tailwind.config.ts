import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
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
          DEFAULT: "#c8a24b",
          soft: "#e4c97e",
        },
        // ── Premium Stone redesign tokens (spec §2) ──
        shell: {
          base: "#0b0e11",
          elevated: "#15191e",
          elevated2: "#1c2127",
        },
        slab: {
          DEFAULT: "#f7f6f3",
          muted: "#eceae5",
        },
        ondark: { DEFAULT: "#f2f0eb", muted: "#9aa1a9" },
        onlight: { DEFAULT: "#14181c", muted: "#5c636b" },
        positive: "#1f8a70",
        negative: "#d96a5b",
        info: "#2c7a8c",
        stonegreen: "#7c8c5d",
        line: {
          dark: "rgba(242,240,235,0.08)",
          light: "rgba(20,24,28,0.10)",
        },
      },
      boxShadow: {
        slab: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
