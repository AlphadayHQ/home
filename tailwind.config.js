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
      blue: "var(--color-palatinate-blue)",
      eerie: "var(--color-eerie-black)",
      white: "var(--color-white)",
      black: "var(--color-black)",
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

        'textFade': "textFade 10s cubic-bezier(0.23, 1, 0.32, 1.2) infinite"
      },
      fontFamily: {
        titling: ["titling", defaultTheme.fontFamily.sans],
        sans: ["titling", defaultTheme.fontFamily.sans]
      }
    }
  },
  plugins: [],
};