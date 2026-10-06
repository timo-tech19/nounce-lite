import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// One dev server runs both the SPA and the Worker (inside workerd, the real Workers runtime).
export default defineConfig({
	plugins: [react(), tailwindcss(), cloudflare()],
});
