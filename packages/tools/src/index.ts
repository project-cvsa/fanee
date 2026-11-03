import { readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { glob } from "tinyglobby";
import { parseMessage, validate } from "messageformat";
import { z } from "zod";
import ts from "typescript";
import { scanBundle } from "@fanee/fs-scanner";
import { readSource } from "./source";
import type { Analysis, Diagnostic, KeyReference, ResourceEntry, ToolsConfig } from "./types";

export type {
	Analysis,
	Diagnostic,
	KeyReference,
	ResourceEntry,
	SourceProject,
	ToolsConfig,
	TranslationFactory,
} from "./types";

/**
 * Type helper for defining a `fanee.config.ts` configuration file with IDE autocompletion.
 */
export function defineConfig(config: ToolsConfig): ToolsConfig {
	return config;
}

const messagesSchema = z.record(z.string(), z.string());
const manifestSchema = z.object({
	sourceLocale: z.string().optional(),
	targetLocales: z.array(z.string()).optional(),
	formatting: z.string().optional(),
});

export function matchesKey(key: string, pattern: string): boolean {
	if (!pattern.includes("*")) return key === pattern;
	const parts = pattern.split("*");
	const first = parts.shift() ?? "";
	const last = parts.pop() ?? "";
	if (!key.startsWith(first) || !key.endsWith(last)) return false;
	let offset = first.length;
	const end = key.length - last.length;
	for (const part of parts) {
		const found = key.indexOf(part, offset);
		if (found < 0) return false;
		offset = found + part.length;
	}
	return offset <= end;
}

function detectDuplicateKeys(file: string, text: string, diagnostics: Diagnostic[]) {
	const json = ts.parseJsonText(file, text);
	const keys = new Set<string>();

	function walk(node: ts.Node) {
		if (ts.isPropertyAssignment(node)) {
			const key = ts.isStringLiteralLike(node.name)
				? node.name.text
				: node.name.getText(json);
			if (keys.has(key)) {
				diagnostics.push({
					file,
					code: "duplicate-key",
					severity: "error",
					message: `Duplicate message key: ${key}`,
				});
			}
			keys.add(key);
		}
		ts.forEachChild(node, walk);
	}

	walk(json);
}

function extractMessageVariables(
	key: string,
	message: string,
	formatting: string,
	file: string,
	diagnostics: Diagnostic[]
): string[] {
	if (formatting !== "mf2") return [];
	try {
		return [...validate(parseMessage(message)).variables].sort();
	} catch (error) {
		diagnostics.push({
			file,
			code: "invalid-message",
			severity: "error",
			message: `${key}: ${String(error)}`,
		});
		return [];
	}
}

interface LoadedBundle {
	entries: ResourceEntry[];
	diagnostics: Diagnostic[];
	sourceLocales: Map<string, string>;
}

async function loadBundleEntries(
	bundlePath: string,
	configSourceLocale?: string
): Promise<LoadedBundle> {
	const entries: ResourceEntry[] = [];
	const diagnostics: Diagnostic[] = [];
	const sourceLocales = new Map<string, string>();
	const files = await glob("**/messages/*.json", { cwd: bundlePath, absolute: true });

	for (const file of files.sort()) {
		const modulePath = dirname(dirname(file));
		const namespace = relative(bundlePath, modulePath)
			.split(sep)
			.filter((part) => part !== "modules" && part !== "")
			.join(":");

		const manifestFile = resolve(modulePath, "manifest.json");
		const manifestRaw = JSON.parse(await readFile(manifestFile, "utf8"));
		const manifest = manifestSchema.parse(manifestRaw);

		const locale = file.slice(file.lastIndexOf(sep) + 1, -5);
		const sourceLocale = manifest.sourceLocale ?? configSourceLocale;
		if (!sourceLocale) {
			throw new Error(
				`Missing sourceLocale for namespace '${namespace || "root"}' in '${manifestFile}'`
			);
		}
		sourceLocales.set(namespace, sourceLocale);

		const text = await readFile(file, "utf8");
		detectDuplicateKeys(file, text, diagnostics);

		const parsed = messagesSchema.safeParse(JSON.parse(text));
		if (!parsed.success) {
			diagnostics.push({
				file,
				code: "invalid-resource",
				severity: "error",
				message: parsed.error.message,
			});
			continue;
		}

		const formatting = manifest.formatting ?? "mf2";
		for (const [key, message] of Object.entries(parsed.data)) {
			const variables = extractMessageVariables(key, message, formatting, file, diagnostics);
			entries.push({ file, namespace, locale, key, message, variables });
		}

		for (const targetLocale of manifest.targetLocales ?? []) {
			const expectedFile = resolve(modulePath, "messages", `${targetLocale}.json`);
			if (!files.includes(expectedFile)) {
				diagnostics.push({
					file,
					code: "missing-locale",
					severity: "error",
					message: `Missing locale resource: ${targetLocale}`,
				});
			}
		}
	}

	return { entries, diagnostics, sourceLocales };
}

function checkVariableConsistency(
	entries: ResourceEntry[],
	resources: Analysis["resources"],
	sourceLocales: Map<string, string>,
	diagnostics: Diagnostic[]
) {
	for (const entry of entries) {
		const sourceLocale = sourceLocales.get(entry.namespace);
		if (entry.locale === sourceLocale) continue;

		const sourceMessage = sourceLocale
			? resources[entry.namespace]?.[sourceLocale]?.[entry.key]
			: undefined;
		const source = entries.find(
			(other) =>
				other.message === sourceMessage &&
				other.locale === sourceLocale &&
				other.key === entry.key
		);

		if (!source || source.variables.join() !== entry.variables.join()) {
			diagnostics.push({
				file: entry.file,
				code: "variables",
				severity: "error",
				message: `${entry.key}: source and translation variables differ`,
			});
		}
	}
}

function checkMissingTranslations(
	entries: ResourceEntry[],
	resources: Analysis["resources"],
	sourceLocales: Map<string, string>,
	missingSeverity: "warning" | "error",
	diagnostics: Diagnostic[]
) {
	const sourceEntries = entries.filter(
		(entry) => entry.locale === sourceLocales.get(entry.namespace)
	);

	for (const entry of sourceEntries) {
		const localeMap = resources[entry.namespace] ?? {};
		for (const locale of Object.keys(localeMap)) {
			if (localeMap[locale]?.[entry.key] === undefined) {
				diagnostics.push({
					file: entry.file,
					code: "missing-translation",
					severity: missingSeverity,
					message: `${entry.namespace}/${entry.key}: missing ${locale} translation`,
				});
			}
		}
	}
}

async function collectReferences(
	sources: ToolsConfig["sources"],
	cwd: string,
	diagnostics: Diagnostic[]
): Promise<{ references: KeyReference[]; indirectKeys: Set<string> }> {
	const references: KeyReference[] = [];
	const indirectKeys = new Set<string>();

	for (const project of sources) {
		const sourceFiles = await glob(project.include, {
			cwd,
			absolute: true,
			ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
		});

		for (const file of sourceFiles.sort()) {
			const source = await readFile(file, "utf8");
			const transformed = project.transform ? await project.transform(source, file) : source;
			const result = readSource(file, transformed, project);

			references.push(
				...result.references.map((reference) => ({
					...reference,
					line: project.transform ? undefined : reference.line,
				}))
			);

			diagnostics.push(
				...result.diagnostics.map((diagnostic) => ({
					...diagnostic,
					line: project.transform ? undefined : diagnostic.line,
				}))
			);

			for (const literal of result.literals) {
				indirectKeys.add(literal);
			}
		}
	}

	return { references, indirectKeys };
}

function validateReferences(
	references: KeyReference[],
	resources: Analysis["resources"],
	entries: ResourceEntry[],
	sourceLocales: Map<string, string>,
	diagnostics: Diagnostic[]
) {
	for (const reference of references) {
		const keys = new Set(
			Object.values(resources[reference.namespace] ?? {}).flatMap((messages) =>
				Object.keys(messages)
			)
		);
		const matching = [...keys].filter((key) => matchesKey(key, reference.pattern));

		if (matching.length === 0) {
			diagnostics.push({
				file: reference.file,
				line: reference.line,
				code: "missing-key",
				severity: "error",
				message: `Unknown translation: ${reference.namespace}/${reference.pattern}`,
			});
		}

		if (!reference.pattern.includes("*") && reference.variables) {
			const sourceLocale = sourceLocales.get(reference.namespace);
			const entry = entries.find(
				(e) =>
					e.key === reference.pattern &&
					e.locale === sourceLocale &&
					resources[reference.namespace]?.[e.locale]?.[e.key] === e.message
			);
			const missing =
				entry?.variables.filter((variable) => !reference.variables?.includes(variable)) ??
				[];

			if (missing.length > 0) {
				diagnostics.push({
					file: reference.file,
					line: reference.line,
					code: "variables",
					severity: "error",
					message: `${reference.pattern}: missing variables ${missing.join(", ")}`,
				});
			}
		}
	}
}

export async function analyze(config: ToolsConfig, cwd = process.cwd()): Promise<Analysis> {
	const bundlePath = resolve(cwd, config.bundlePath);
	const { entries, diagnostics, sourceLocales } = await loadBundleEntries(
		bundlePath,
		config.sourceLocale
	);
	const resources = await scanBundle(bundlePath);

	checkVariableConsistency(entries, resources, sourceLocales, diagnostics);

	checkMissingTranslations(
		entries,
		resources,
		sourceLocales,
		config.missingTranslations ?? "warning",
		diagnostics
	);

	const { references, indirectKeys } = await collectReferences(config.sources, cwd, diagnostics);

	validateReferences(references, resources, entries, sourceLocales, diagnostics);

	const unused = entries.filter(
		(entry) =>
			entry.locale === sourceLocales.get(entry.namespace) &&
			!indirectKeys.has(entry.key) &&
			!references.some(
				(reference) =>
					(entry.namespace === "" ||
						reference.namespace === entry.namespace ||
						reference.namespace.startsWith(`${entry.namespace}:`)) &&
					matchesKey(entry.key, reference.pattern)
			)
	);

	return { resources, entries, references, diagnostics, unused };
}

export function generateTypes(analysis: Analysis): string {
	const namespaces = new Map<string, Map<string, string[]>>();

	for (const [namespace, locales] of Object.entries(analysis.resources)) {
		const keys = new Map<string, string[]>();
		for (const messages of Object.values(locales)) {
			for (const [key, message] of Object.entries(messages)) {
				const entry = analysis.entries.find((e) => e.key === key && e.message === message);
				keys.set(key, entry?.variables ?? []);
			}
		}
		namespaces.set(namespace, keys);
	}

	return `export interface Messages {\n${[...namespaces]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(
			([namespace, keys]) =>
				`\t${JSON.stringify(namespace)}: {\n${[...keys]
					.sort(([a], [b]) => a.localeCompare(b))
					.map(
						([key, variables]) =>
							`\t\t${JSON.stringify(key)}: { ${variables.map((variable) => `${JSON.stringify(variable)}: unknown`).join("; ")} };`
					)
					.join("\n")}\n\t};`
		)
		.join("\n")}\n}\n`;
}
