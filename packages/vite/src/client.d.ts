declare module "virtual:fanee" {
	import type { BundleResources } from "@fanee/core";
	export const resources: BundleResources;
}

declare module "virtual:fanee/*" {
	import type { BundleResources } from "@fanee/core";
	export const resources: BundleResources;
}