import { render } from "solid-js/web";
import { FaneeRuntime } from "@fanee/core";
import { FaneeProvider } from "@fanee/solid";
import { resources } from "virtual:fanee";
import "./index.css";
import App from "./App.tsx";

const runtime = new FaneeRuntime().config({
	defaultLocale: "en",
	currentLocale: "en",
	resources,
});

await runtime.ready();

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

render(
	() => (
		<FaneeProvider runtime={runtime}>
			<App />
		</FaneeProvider>
	),
	rootElement
);
