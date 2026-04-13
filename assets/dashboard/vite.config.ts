import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

let supaflowConfig: Record<string, unknown> = {};
try {
  supaflowConfig = JSON.parse(readFileSync("../supaflow.json", "utf-8"));
} catch {}

export default defineConfig({
  plugins: [react()],
  server: { port: (supaflowConfig.dashboard_port as number) || 3001 },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL || supaflowConfig.supabase_url || ""
    ),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || supaflowConfig.supabase_anon_key || ""
    ),
  },
});
