import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['./src/index.ts'],
    deps: {
        alwaysBundle: ['messageformat', 'messageformat/functions'],
    },
    dts: {
        tsconfig: "./tsconfig.build.json",
        sourcemap: true,
    },
    sourcemap: true,
    minify: true,
    treeshake: true
})