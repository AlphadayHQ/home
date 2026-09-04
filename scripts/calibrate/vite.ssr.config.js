import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dedicated SSR build for the render calibration. Separate from the app config
 * so the measurement never perturbs the real build output, and so `ssr: true`
 * externalises node_modules the way a real TanStack Start server build does.
 */
export default defineConfig({
  plugins: [react()],
  logLevel: "warn",
  // Nothing in public/ belongs in an SSR bundle; copying it just adds noise
  // and I/O to a build whose only job is to produce one renderable module.
  publicDir: false,
  build: {
    ssr: "scripts/calibrate/ssr-entry.jsx",
    outDir: "node_modules/.cache/alphaday-calibrate",
    emptyOutDir: true,
    // Production settings: this must not measure a dev transform.
    minify: "oxc",
    sourcemap: false,
  },
  define: {
    "import.meta.env.DEV": "false",
  },
});
