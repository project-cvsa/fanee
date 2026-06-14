import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FaneeRuntime } from "@fanee/core";
import { FaneeProvider } from "@fanee/react";
import { resources } from "virtual:fanee";
import "./index.css";
import App from "./App.tsx";

const runtime = new FaneeRuntime().config({
	defaultLocale: "en",
	currentLocale: "en",
	resources,
});

runtime.ready();

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<FaneeProvider runtime={runtime}>
			<App />
		</FaneeProvider>
	</StrictMode>
);
