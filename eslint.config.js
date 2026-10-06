import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist", ".wrangler", "worker-configuration.d.ts"] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ["**/*.{ts,tsx}"],
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
		},
	},
	{
		files: ["src/**/*.{ts,tsx}"],
		languageOptions: { globals: globals.browser },
		extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
	},
);
