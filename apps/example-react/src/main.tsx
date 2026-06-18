import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { i18n } from "@fanee/core";
import { resources } from "virtual:fanee";
import "./index.css";
import App from "./App.tsx";

i18n.config({
	defaultLocale: "en",
	currentLocale: "en",
	resources,
});

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>
);
