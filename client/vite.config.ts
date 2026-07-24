import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom", "react-router-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ["engaged-griffon-crucial.ngrok-free.app"],
  },
  define: {
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(new Date().toISOString()),
  },
  test: {
    include: ["src/tests/**/*.test.{ts,tsx}"],
  },
});
