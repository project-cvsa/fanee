import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["./src/index.ts"],
	deps: {
		neverBundle: ["solid-js", "solid-js/web", "solid-js/h", "@fanee/core"],
	},
	dts: {
		tsconfig: "./tsconfig.build.json",
		sourcemap: true,
	},
	outputOptions: {
		format: "esm",
		entryFileNames: "[name].js",
		chunkFileNames: "[name]-[hash].js",
	},
	sourcemap: true,
	minify: true,
	treeshake: true,
});
