import { defineConfig } from "vite";
import { resolve } from "path";

// Separate Vite config for content script.
// Chrome content scripts don't support ES modules, so we must output IIFE format
// with all dependencies inlined.
export default defineConfig({
  build: {
    emptyOutDir: false, // Don't clear dist/ (main build already ran)
    lib: {
      entry: resolve(__dirname, "src/content/index.ts"),
      name: "ScrollWatchContent",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    outDir: "dist",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
