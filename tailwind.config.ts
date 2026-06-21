import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

// Theming: the palette tokens below point at CSS variables (RGB triplets)
// defined in globals.css. `:root` holds the dark theme (the brand default);
// `html.light` overrides the same variables for light mode. Because every
// component already uses these token classes (text-white, bg-white/[0.04],
// border-graphite-600, text-slate-400 …), the whole app re-themes from one
// place — no per-component changes needed.
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;
// Accent text shades (chips, statuses) need a darker value on light
// backgrounds to stay legible; same var trick, scale by scale.
const accent = (name: string, shades: number[]) =>
  Object.fromEntries(shades.map((s) => [s, v(`--c-${name}-${s}`)]));

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      colors: {
        white: v("--c-white"),
        slate: { ...colors.slate, ...accent("slate", [100, 200, 300, 400, 500, 600]) },
        red: { ...colors.red, ...accent("red", [200, 300, 400]) },
        rose: { ...colors.rose, ...accent("rose", [200, 300, 400]) },
        amber: { ...colors.amber, ...accent("amber", [200, 300, 400]) },
        emerald: { ...colors.emerald, ...accent("emerald", [200, 300, 400]) },
        sky: { ...colors.sky, ...accent("sky", [300, 400]) },
        violet: { ...colors.violet, ...accent("violet", [300, 400]) },
        blue: { ...colors.blue, ...accent("blue", [300, 400]) },
        stone: { ...colors.stone, ...accent("stone", [300, 400]) },
        orange: { ...colors.orange, ...accent("orange", [300, 400]) },
        // GraniteOS brand (named "granite" to avoid clashing with Tailwind's
        // built-in "stone" palette).
        granite: {
          green: "#0F4C35",
          green2: v("--c-granite-green2"),
          blue: "#0F4C81",
        },
        // Premium "stone & gold" surfaces — dark by default, light via html.light
        graphite: {
          900: v("--c-graphite-900"),
          800: v("--c-graphite-800"),
          700: v("--c-graphite-700"),
          600: v("--c-graphite-600"),
          500: v("--c-graphite-500"),
        },
        gold: {
          DEFAULT: v("--c-gold"),
          soft: v("--c-gold-soft"),
          tint: "var(--gold-tint)",
          hairline: "var(--gold-hairline)",
        },
        // Royal Sapphire: navy is THE action color; gold stays a jewel accent.
        navy: {
          DEFAULT: "var(--navy)",
          2: "var(--navy-2)",
          on: "var(--on-navy)",
        },
        pos: { DEFAULT: "var(--pos)", bg: "var(--pos-bg)" },
        warn: { DEFAULT: "var(--warn)", bg: "var(--warn-bg)" },
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
        ondark: { DEFAULT: v("--c-ondark"), muted: v("--c-ondark-muted") },
        onlight: { DEFAULT: "#14181c", muted: "#5c636b" },
        positive: "#1f8a70",
        negative: "#d96a5b",
        info: "#2c7a8c",
        stonegreen: "#7c8c5d",
        line: {
          dark: "rgb(var(--c-line) / 0.10)",
          light: "rgba(20,24,28,0.10)",
        },
      },
      boxShadow: {
        slab: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.45)",
        "soft-sm": "var(--shadow-sm)",
        "soft-md": "var(--shadow-md)",
        "soft-lg": "var(--shadow-lg)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        panel: "var(--radius-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
