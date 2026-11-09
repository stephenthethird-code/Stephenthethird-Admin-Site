import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All /api calls → your S3 Hub (no CORS in dev)
      "/api": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
      "/serve-audio": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
    },
  },
});
