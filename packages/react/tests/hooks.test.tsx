import { describe, test, expect } from "bun:test";
import { render, screen, act } from "@testing-library/react";
import { FaneeRuntime } from "@fanee/core";
import { FaneeProvider, useT, useLocale, useSetLocale, useFanee } from "@/index";

function TestComponent() {
	const t = useT();
	const locale = useLocale();
	const setLocale = useSetLocale();
	const { runtime } = useFanee();

	return (
		<div>
			<p data-testid="greeting">{t("hello")}</p>
			<p data-testid="locale">{locale}</p>
			<button type="button" data-testid="switch" onClick={() => setLocale("fr")}>
				Switch
			</button>
			<p data-testid="runtime-locale">{runtime.getLocale()}</p>
		</div>
	);
}

async function renderWithProvider(runtime: FaneeRuntime) {
	await runtime.ready();
	return render(
		<FaneeProvider runtime={runtime}>
			<TestComponent />
		</FaneeProvider>
	);
}

describe("@fanee/react", () => {
	test("translates keys using runtime resources", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "en",
			resources: {
				"": {
					en: { hello: "Hello" },
				},
			},
		});

		await renderWithProvider(runtime);
		expect(screen.getByTestId("greeting").textContent).toBe("Hello");
	});

	test("reacts to locale changes", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "en",
			resources: {
				"": {
					en: { hello: "Hello" },
					fr: { hello: "Bonjour" },
				},
			},
		});

		await renderWithProvider(runtime);
		expect(screen.getByTestId("greeting").textContent).toBe("Hello");
		expect(screen.getByTestId("locale").textContent).toBe("en");

		act(() => {
			screen.getByTestId("switch").click();
		});

		expect(screen.getByTestId("greeting").textContent).toBe("Bonjour");
		expect(screen.getByTestId("locale").textContent).toBe("fr");
	});

	test("useT respects namespace context", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "en",
			resources: {
				"": {
					en: { hello: "Hello" },
				},
				errors: {
					en: { hello: "Error hello" },
				},
			},
		});

		function Namespaced() {
			const t = useT({ namespace: "errors" });
			return <p data-testid="namespaced">{t("hello")}</p>;
		}

		await runtime.ready();
		render(
			<FaneeProvider runtime={runtime}>
				<Namespaced />
			</FaneeProvider>
		);

		expect(screen.getByTestId("namespaced").textContent).toBe("Error hello");
	});
});
