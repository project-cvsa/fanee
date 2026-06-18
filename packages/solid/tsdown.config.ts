import { defineConfig } from "tsdown";
import solid from 'unplugin-solid/rolldown';

export default defineConfig({
	entry: ["./src/index.ts"],
	deps: {
		neverBundle: ["@fanee/core"],
	},
	dts: {
		tsconfig: "./tsconfig.build.json",
		sourcemap: true,
	},
	platform: 'neutral',
	outputOptions: {
		format: "esm",
	},
	sourcemap: true,
	minify: true,
	treeshake: true,
	plugins: [solid()],
});
