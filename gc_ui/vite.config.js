// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("swiper")) return "vendor_swiper";
            if (id.includes("react")) return "vendor_react";
            return "vendor";
          }
        }
      }
    }
  }
});
