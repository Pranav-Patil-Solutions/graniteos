import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // GraniteOS brand (named "granite" to avoid clashing with Tailwind's
        // built-in "stone" palette).
        granite: {
          green: "#0F4C35",
          blue: "#0F4C81",
        },
      },
    },
  },
  plugins: [],
};

export default config;
