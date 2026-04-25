import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: true,
    outDir: "extension/dist",
    rollupOptions: {
      input: "src/content/content.tsx",
      output: {
        entryFileNames: "content.js",
        chunkFileNames: "content-[hash].js",
        assetFileNames: "content-[hash][extname]",
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
});
