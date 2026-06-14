import { useLocale, useSetLocale } from "@fanee/react";

const LOCALES = [
	{ code: "en", label: "English" },
	{ code: "zh-CN", label: "中文" },
	{ code: "ja", label: "日本語" },
] as const;

export function LocaleSwitcher() {
	const locale = useLocale();
	const setLocale = useSetLocale();

	return (
		<div className="locale-switcher">
			{LOCALES.map(({ code, label }) => (
				<button
					key={code}
					type="button"
					data-active={locale === code ? "true" : undefined}
					onClick={() => setLocale(code)}
				>
					{label}
				</button>
			))}
		</div>
	);
}
