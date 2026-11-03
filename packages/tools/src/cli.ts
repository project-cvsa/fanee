#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { analyze, generateTypes } from "./index";

const VERSION = "0.9.0";

const factorySchema = z.object({
	name: z.string(),
	baseNamespace: z.string().optional(),
	argument: z.enum(["context", "namespace"]).optional(),
});

const configSchema = z.object({
	bundlePath: z.string(),
	sourceLocale: z.string().optional(),
	missingTranslations: z.enum(["warning", "error"]).optional(),
	sources: z.array(
		z.object({
			include: z.array(z.string()),
			factories: z.array(factorySchema).optional(),
			functions: z.record(z.string(), z.string()).optional(),
			namespace: z.string().optional(),
			transform: z
				.custom<(source: string, file: string) => string | Promise<string>>(
					(value) => typeof value === "function"
				)
				.optional(),
		})
	),
});

const isColorSupported =
	process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";

const colors = {
	red: (s: string) => (isColorSupported ? `\x1b[31m${s}\x1b[0m` : s),
	yellow: (s: string) => (isColorSupported ? `\x1b[33m${s}\x1b[0m` : s),
	green: (s: string) => (isColorSupported ? `\x1b[32m${s}\x1b[0m` : s),
	cyan: (s: string) => (isColorSupported ? `\x1b[36m${s}\x1b[0m` : s),
	dim: (s: string) => (isColorSupported ? `\x1b[2m${s}\x1b[0m` : s),
	bold: (s: string) => (isColorSupported ? `\x1b[1m${s}\x1b[0m` : s),
};

function printHelp(subcommand?: string) {
	if (subcommand === "check") {
		console.log(`Usage: fanee check [options]

Verify translation resources, message references, and interpolation variables.

Options:
  -c, --config <path>   Path to fanee config (default: fanee.config.ts)
      --unused          Fail if any unused source translations exist
      --json            Output results as JSON
  -h, --help            Show help for check command`);
		return;
	}

	if (subcommand === "unused") {
		console.log(`Usage: fanee unused [options]

List translation keys defined in source resources but never referenced in code.

Options:
  -c, --config <path>   Path to fanee config (default: fanee.config.ts)
      --json            Output unused translations as JSON
  -h, --help            Show help for unused command`);
		return;
	}

	if (subcommand === "types") {
		console.log(`Usage: fanee types --output <path> [options]

Generate TypeScript declarations for namespaces, message keys, and variables.

Options:
  -o, --output <path>   Output TypeScript declaration file path (required)
  -c, --config <path>   Path to fanee config (default: fanee.config.ts)
  -h, --help            Show help for types command`);
		return;
	}

	if (subcommand === "init") {
		console.log(`Usage: fanee init [options]

Scaffold a starter fanee.config.ts in the current working directory.

Options:
  -h, --help            Show help for init command`);
		return;
	}

	console.log(`Usage: fanee <command> [options]

A next-generation i18n toolchain and AST scanner for Open Translation Bundle (OTB).

Commands:
  check     Verify bundle resources and code references (default)
  unused    Find translations defined but unreferenced in code
  types     Generate TypeScript declarations for messages
  init      Scaffold a new fanee.config.ts

Options:
  -c, --config <path>   Path to config file (default: fanee.config.ts)
  -v, --version         Show CLI version
  -h, --help            Show this help message

Run 'fanee <command> --help' for details on a specific command.`);
}

const DEFAULT_CONFIG_CANDIDATES = ["fanee.config.ts", "fanee.config.js", "fanee.config.mjs"];

function resolveConfigFile(explicitPath?: string): string {
	if (explicitPath) {
		const resolved = resolve(explicitPath);
		if (!existsSync(resolved)) {
			console.error(
				`${colors.red("error:")} Configuration file not found at '${explicitPath}'`
			);
			process.exit(2);
		}
		return resolved;
	}
	for (const candidate of DEFAULT_CONFIG_CANDIDATES) {
		const candidatePath = resolve(candidate);
		if (existsSync(candidatePath)) {
			return candidatePath;
		}
	}
	console.error(
		`${colors.red("error:")} Configuration file 'fanee.config.ts' not found in current directory.\nRun '${colors.cyan("fanee init")}' to scaffold one.`
	);
	process.exit(1);
}

async function handleInit() {
	const targetPath = resolve("fanee.config.ts");
	if (existsSync(targetPath)) {
		console.error(
			`${colors.yellow("warning:")} fanee.config.ts already exists at ${targetPath}`
		);
		return;
	}
	const template = `import { defineConfig } from "@fanee/tools";

export default defineConfig({
	bundlePath: "locale",
	sourceLocale: "en",
	missingTranslations: "warning",
	sources: [
		{
			include: ["src/**/*.{ts,tsx,js,jsx}"],
		},
	],
});
`;
	await writeFile(targetPath, template, "utf8");
	console.log(
		`${colors.green("✔")} Created starter configuration at ${colors.cyan("fanee.config.ts")}`
	);
}

async function main() {
	let parsedArgs: ReturnType<typeof parseArgs>;
	try {
		parsedArgs = parseArgs({
			allowPositionals: true,
			options: {
				config: { type: "string", short: "c" },
				help: { type: "boolean", short: "h", default: false },
				json: { type: "boolean", default: false },
				output: { type: "string", short: "o" },
				unused: { type: "boolean", default: false },
				version: { type: "boolean", short: "v", default: false },
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`${colors.red("error:")} ${message}`);
		console.error(`Run '${colors.cyan("fanee --help")}' for usage information.`);
		process.exit(2);
	}

	const { positionals, values } = parsedArgs;

	if (values.version) {
		console.log(`fanee v${VERSION}`);
		return;
	}

	const command = positionals[0] ?? "check";

	if (values.help) {
		printHelp(command !== "check" || positionals.length > 0 ? command : undefined);
		return;
	}

	if (!["check", "unused", "types", "init"].includes(command)) {
		console.error(`${colors.red("error:")} Unknown command '${command}'`);
		console.error(`Run '${colors.cyan("fanee --help")}' for available commands.`);
		process.exit(2);
	}

	if (command === "init") {
		await handleInit();
		return;
	}

	const configArg = typeof values.config === "string" ? values.config : undefined;
	const configPath = resolveConfigFile(configArg);
	let imported: unknown;
	try {
		imported = await import(pathToFileURL(configPath).href);
	} catch (error) {
		console.error(`${colors.red("error:")} Failed to load config from '${configPath}':`);
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}

	const moduleSchema = z.object({ default: configSchema });
	const parsedConfig = moduleSchema.safeParse(imported);
	if (!parsedConfig.success) {
		console.error(`${colors.red("error:")} Invalid configuration in '${configPath}':`);
		for (const issue of parsedConfig.error.issues) {
			const path = issue.path.filter((p) => p !== "default").join(".");
			console.error(
				`  ${colors.dim("•")} ${path ? `${colors.cyan(path)}: ` : ""}${issue.message}`
			);
		}
		process.exit(1);
	}

	const config = parsedConfig.data.default;
	const analysis = await analyze(config, dirname(configPath));

	if (command === "types") {
		if (typeof values.output !== "string" || !values.output) {
			console.error(
				`${colors.red("error:")} The 'types' command requires the '${colors.cyan("--output <path>")}' option.`
			);
			process.exit(2);
		}
		const outputPath = values.output;
		const content = generateTypes(analysis);
		let current: string | undefined;
		try {
			current = await readFile(outputPath, "utf8");
		} catch (error) {
			if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
				throw error;
		}
		if (current !== content) {
			await writeFile(outputPath, content, "utf8");
			console.log(
				`${colors.green("✔")} Generated TypeScript types in ${colors.cyan(outputPath)}`
			);
		} else {
			console.log(
				`${colors.green("✔")} TypeScript types in ${colors.cyan(outputPath)} are already up to date.`
			);
		}
		return;
	}

	if (values.json) {
		console.log(JSON.stringify(command === "unused" ? analysis.unused : analysis, null, 2));
		if (analysis.diagnostics.some((d) => d.severity === "error")) process.exitCode = 1;
		if ((command === "unused" || values.unused) && analysis.unused.length > 0)
			process.exitCode = 1;
		return;
	}

	const cwd = process.cwd();
	const formatPath = (filePath: string) => {
		const rel = relative(cwd, filePath);
		return rel.startsWith("..") ? filePath : rel;
	};

	if (command === "unused") {
		if (analysis.unused.length === 0) {
			console.log(`${colors.green("✔")} No unused source translation messages found.`);
		} else {
			console.log(
				`${colors.yellow("Found")} ${colors.bold(String(analysis.unused.length))} ${colors.yellow("unused source translation messages:")}`
			);
			for (const entry of analysis.unused) {
				const loc = colors.dim(`(${formatPath(entry.file)})`);
				console.log(
					`  ${colors.dim("•")} ${colors.cyan(entry.namespace ? `${entry.namespace}:` : "")}${colors.bold(entry.key)} ${loc}`
				);
			}
			process.exitCode = 1;
		}
		return;
	}

	// command === "check"
	let errorCount = 0;
	let warningCount = 0;

	for (const diagnostic of analysis.diagnostics) {
		if (diagnostic.severity === "error") errorCount += 1;
		else warningCount += 1;

		const badge =
			diagnostic.severity === "error" ? colors.red("error") : colors.yellow("warning");
		const loc = diagnostic.line
			? `${colors.dim(formatPath(diagnostic.file))}:${colors.cyan(String(diagnostic.line))}`
			: colors.dim(formatPath(diagnostic.file));
		const code = colors.dim(`[${diagnostic.code}]`);

		console.log(`${loc} - ${badge} ${code}: ${diagnostic.message}`);
	}

	const namespaceCount = Object.keys(analysis.resources).length;
	const summaryParts = [
		`${analysis.entries.length} messages`,
		`${analysis.references.length} references across ${namespaceCount} namespaces`,
		`${analysis.unused.length} unused source messages`,
	];

	if (errorCount > 0) {
		console.log(
			`\n${colors.red("✖ Check failed:")} ${errorCount} error${errorCount > 1 ? "s" : ""}, ${warningCount} warning${warningCount > 1 ? "s" : ""}. (${summaryParts.join(", ")})`
		);
		process.exitCode = 1;
	} else if (values.unused && analysis.unused.length > 0) {
		console.log(
			`\n${colors.red("✖ Check failed:")} ${analysis.unused.length} unused source message${analysis.unused.length > 1 ? "s" : ""}. (${summaryParts.join(", ")})`
		);
		process.exitCode = 1;
	} else if (warningCount > 0) {
		console.log(
			`\n${colors.yellow("✔ Checked with warnings:")} ${warningCount} warning${warningCount > 1 ? "s" : ""}. (${summaryParts.join(", ")})`
		);
	} else {
		console.log(
			`\n${colors.green("✔ Check passed:")} 0 errors, 0 warnings. (${summaryParts.join(", ")})`
		);
	}
}

main().catch((error) => {
	console.error(`${colors.red("error:")} Unexpected failure:`, error);
	process.exit(1);
});
