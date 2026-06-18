import { useT, useLocale } from "@fanee/solid";
import { LocaleSwitcher } from "./LocaleSwitcher.tsx";
import { createSignal } from "solid-js";
import "./App.css";

function RootSection() {
	const t = useT();
	const [count, setCount] = createSignal(3);

	return (
		<section class="card">
			<h2>{t("greeting", { name: "Fanee" })}</h2>
			<p class="sub">{t("item_count", { count: count() })}</p>
			<div class="controls">
				<button type="button" disabled={count() <= 0} onClick={() => setCount((c) => c - 1)}>
					-
				</button>
				<button type="button" onClick={() => setCount((c) => c + 1)}>
					+
				</button>
			</div>
		</section>
	);
}

function ShopSection() {
	const t = useT({ namespace: "shop" });

	return (
		<section class="card">
			<h2>{t("shop_title")}</h2>
			<p class="sub">
				{t("product_name")} — {t("product_price", { price: 12.99 })}
			</p>
			<p class="note">{t("greeting", { name: "User" })}</p>
			<button type="button">{t("add_to_cart")}</button>
		</section>
	);
}

function CheckoutSection() {
	const t = useT({ namespace: "shop:checkout" });

	return (
		<section class="card">
			<h2>{t("checkout_title")}</h2>
			<p class="sub">{t("total", { total: 12.99 })}</p>
			<p class="sub">{t("order_date", { date: new Date("2026-06-15") })}</p>
			<p class="note">{t("greeting", { name: "User" })}</p>
			<button type="button">{t("confirm_order")}</button>
		</section>
	);
}

function App() {
	const t = useT();
	const locale = useLocale();

	return (
		<div class="app">
			<header class="header">
				<h1>{t("site_title")}</h1>
				<span class="current-locale">{locale()}</span>
				<LocaleSwitcher />
			</header>
			<main class="grid">
				<RootSection />
				<ShopSection />
				<CheckoutSection />
			</main>
		</div>
	);
}

export default App;
