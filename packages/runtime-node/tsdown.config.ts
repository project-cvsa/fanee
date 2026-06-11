import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['./src/index.ts'],
    dts: {
        tsconfig: "./tsconfig.build.json",
        sourcemap: true,
    },
    sourcemap: true,
    minify: true,
    treeshake: true
})