import { Window } from "happy-dom";

const window = new Window({
	url: "http://localhost:3000",
});

globalThis.window = window as unknown as typeof globalThis.window;
globalThis.document = window.document as unknown as typeof globalThis.document;
globalThis.navigator = window.navigator as unknown as typeof globalThis.navigator;
