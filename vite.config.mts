import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    // Tailwind's Vite plugin rather than the PostCSS one: under SSR the CSS is
    // also pulled through a `?url` transform, and Vite's postcss-import tries
    // to resolve `@import "tailwindcss"` as a file path before the PostCSS
    // plugin ever sees it. The Vite plugin owns that resolution itself.
    tailwindcss(),
    // Must come before the React plugin: it generates the route tree and
    // rewrites route modules, and React has to transform the result.
    tanstackStart(),
    react(),
  ],
  server: {
    port: 3000,
  },
  build: {
    rolldownOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
