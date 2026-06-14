import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { scanBundle } from "@/index";

async function createBundle(root: string, structure: Record<string, unknown>) {
	for (const [filePath, content] of Object.entries(structure)) {
		const fullPath = join(root, filePath);
		const dir = join(fullPath, "..");
		await Bun.$`mkdir -p ${dir}`;
		if (typeof content === "string") {
			await writeFile(fullPath, content);
		} else {
			await writeFile(fullPath, JSON.stringify(content, null, 2));
		}
	}
}

describe("scanBundle", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "fanee-vite-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	test("loads root messages", async () => {
		await createBundle(tempDir, {
			"manifest.json": { format: "otb", specVersion: "0.4.0" },
			"messages/en.json": { greeting: "Hello" },
		});

		const resources = await scanBundle(tempDir);
		expect(resources[""]?.en?.greeting).toBe("Hello");
	});

	test("merges namespace hierarchy", async () => {
		await createBundle(tempDir, {
			"manifest.json": { format: "otb", specVersion: "0.4.0" },
			"messages/en.json": { rootKey: "root" },
			"modules/web/manifest.json": { format: "otb", specVersion: "0.4.0" },
			"modules/web/messages/en.json": { webKey: "web" },
			"modules/web/modules/billing/manifest.json": {
				format: "otb",
				specVersion: "0.4.0",
			},
			"modules/web/modules/billing/messages/en.json": {
				billingKey: "billing",
				rootKey: "billing override",
			},
		});

		const resources = await scanBundle(tempDir);
		expect(resources.web?.en?.rootKey).toBe("root");
		expect(resources.web?.en?.webKey).toBe("web");
		expect(resources["web:billing"]?.en?.rootKey).toBe("billing override");
		expect(resources["web:billing"]?.en?.webKey).toBe("web");
		expect(resources["web:billing"]?.en?.billingKey).toBe("billing");
	});

	test("standalone modules do not inherit ancestors", async () => {
		await createBundle(tempDir, {
			"manifest.json": { format: "otb", specVersion: "0.4.0" },
			"messages/en.json": { key: "root" },
			"modules/web/manifest.json": { format: "otb", specVersion: "0.4.0" },
			"modules/web/messages/en.json": { key: "web" },
			"modules/web/modules/standalone/manifest.json": {
				format: "otb",
				specVersion: "0.4.0",
				standalone: true,
			},
			"modules/web/modules/standalone/messages/en.json": {
				key: "standalone",
			},
		});

		const resources = await scanBundle(tempDir);
		expect(resources.web?.en?.key).toBe("web");
		expect(resources["web:standalone"]?.en?.key).toBe("standalone");
		expect(resources["web:standalone"]?.en?.rootKey).toBeUndefined();
	});

	test("throws on invalid manifest format", async () => {
		await createBundle(tempDir, {
			"manifest.json": { format: "invalid", specVersion: "0.4.0" },
		});

		await expect(scanBundle(tempDir)).rejects.toThrow("Invalid bundle format");
	});
});
