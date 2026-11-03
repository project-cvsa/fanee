import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["./src/index.ts", "./src/cli.ts"],
	deps: { alwaysBundle: ["@fanee/fs-scanner"] },
	dts: { tsconfig: "./tsconfig.build.json" },
	platform: "node",
	outputOptions: { entryFileNames: "[name].js", chunkFileNames: "[name]-[hash].js" },
	sourcemap: true,
});
