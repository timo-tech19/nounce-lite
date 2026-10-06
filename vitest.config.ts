import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "server",
					include: ["worker/**/*.test.ts", "shared/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				plugins: [react()],
				test: {
					name: "client",
					include: ["src/**/*.test.{ts,tsx}"],
					environment: "jsdom",
					setupFiles: ["./src/test-setup.ts"],
				},
			},
		],
	},
});
