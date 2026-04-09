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
      background: "#121212",
      surface: {
        DEFAULT: "#191919",
        light: "#242424",
        border: "#3b3a3a",
      },
      text: {
        DEFAULT: "#f2f2f2",
        muted: "#849399",
      },
      primary: {
        DEFAULT: "#faa202",
        hover: "#ffb84d",
      },
      success: "#6dd230",
      danger: "#f45532",
      warning: "#faa202",
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
