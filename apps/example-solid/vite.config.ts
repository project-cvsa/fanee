import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { fanee } from "@fanee/vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		fanee({
			bundlePath: "./i18n",
		}),
		solid(),
	],
});
