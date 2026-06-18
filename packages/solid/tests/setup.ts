import { Window } from "happy-dom";

const window = new Window({
	url: "http://localhost:3000",
});

globalThis.window = window as unknown as typeof globalThis.window;
globalThis.document = window.document as unknown as typeof globalThis.document;
globalThis.navigator = window.navigator as unknown as typeof globalThis.navigator;

// Solid runtime requires these DOM globals
globalThis.Element = window.Element as unknown as typeof globalThis.Element;
globalThis.HTMLElement = window.HTMLElement as unknown as typeof globalThis.HTMLElement;
globalThis.HTMLButtonElement = window.HTMLButtonElement as unknown as typeof globalThis.HTMLButtonElement;
globalThis.HTMLDivElement = window.HTMLDivElement as unknown as typeof globalThis.HTMLDivElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement as unknown as typeof globalThis.HTMLParagraphElement;
globalThis.Node = window.Node as unknown as typeof globalThis.Node;
globalThis.Text = window.Text as unknown as typeof globalThis.Text;
globalThis.Comment = window.Comment as unknown as typeof globalThis.Comment;
globalThis.Event = window.Event as unknown as typeof globalThis.Event;
globalThis.CustomEvent = window.CustomEvent as unknown as typeof globalThis.CustomEvent;
globalThis.MouseEvent = window.MouseEvent as unknown as typeof globalThis.MouseEvent;

// SVG support needed by Solid's DOM handling
globalThis.SVGElement = window.SVGElement as unknown as typeof globalThis.SVGElement;
globalThis.SVGSVGElement = window.SVGSVGElement as unknown as typeof globalThis.SVGSVGElement;
