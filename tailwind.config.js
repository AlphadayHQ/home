const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      california: "var(--color-california)",
      platinum: "var(--color-platinum)",
      aluminium: "var(--color-aluminium)",
      shark: "var(--color-shark)",
      blue: {
        DEFAULT: "var(--color-palatinate-blue)",
        400: "#60a5fa",
      },
      eerie: "var(--color-eerie-black)",
      white: "var(--color-white)",
      black: "var(--color-black)",
      lightblue: "var(--color-lightblue)",
      // Semantic tokens for the API landing page
      background: "#0a0b0d",
      surface: {
        DEFAULT: "#13161a",
        light: "#1d2024",
        border: "#2a2e33",
      },
      text: {
        DEFAULT: "#e2e3e9",
        muted: "#8a8f99",
      },
      primary: {
        DEFAULT: "#faa202",
        hover: "#ffb733",
      },
      success: "#10b981",
      danger: "#ef4444",
      orange: {
        400: "#fb923c",
      },
    },

    extend: {
      dropShadow: {
        eclipse: "4px 4px 0px #000000",
      },
      keyframes: {
        textFade: {
          "0% ": { marginTop: "-360px" },
          "5%": { marginTop: "-270px" },
          "25%": { marginTop: "-270px" },
          "30%": { marginTop: "-180px" },
          "50%": { marginTop: "-180px" },
          "55%": { marginTop: "-90px" },
          "75%": { marginTop: "-90px" },
          "80%": { marginTop: "0px" },
          "99.9%": { marginTop: "0px" },
          "100%": { marginTop: "-270px" },
        },
      },
      animation: {
        textFade: "textFade 10s cubic-bezier(0.23, 1, 0.32, 1.2) infinite",
      },
      fontFamily: {
        titling: ["titling", defaultTheme.fontFamily.sans],
        sans: ["titling", defaultTheme.fontFamily.sans],
        montserrat: ["Montserrat", defaultTheme.fontFamily.sans],
        display: ["titling", defaultTheme.fontFamily.sans],
        mono: defaultTheme.fontFamily.mono,
      },
      boxShadow: {
        "primary-glow": "0 0 40px -10px rgba(250,162,2,0.3)",
      },
    },
  },
  plugins: [],
};
