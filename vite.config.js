import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Lets `npm run dev` hit the Netlify Functions via `netlify dev`
      // running on 8888 alongside Vite, without CORS/path juggling.
      "/.netlify/functions": "http://localhost:8888",
    },
  },
});
