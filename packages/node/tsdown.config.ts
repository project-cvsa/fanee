import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["./src/index.ts"],
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
