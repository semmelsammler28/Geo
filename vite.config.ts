import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// v1 läuft nur am PC im Browser (siehe Briefing). Logik (data/, scripts/) ist
// bewusst von der Darstellung (src/) getrennt, damit die spätere Capacitor-/
// iOS-Migration nicht erschwert wird.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
