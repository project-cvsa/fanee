import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fanee } from "@fanee/vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		fanee({
			bundlePath: "./i18n",
		}),
		react(),
	],
});
