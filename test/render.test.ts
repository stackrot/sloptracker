import { describe, expect, test } from "bun:test";
import { LISTED } from "../worker/companies";
import type { Board, Item } from "../worker/data";
import { renderPage } from "../worker/render";
import { renderText } from "../worker/text";
import worker from "../worker/index";

const board: Board[] = [{
	company: LISTED[0],
	price: 200,
	marketCap: 4.82e12,
	change: -0.0317,
	quotedAt: Date.UTC(2026, 10, 4, 21),
}];

const news: Item[] = [{
	url: "https://example.com/a?x=1&y=2",
	title: "Nvidia <script>alert(1)</script>",
	source: "Example",
	publishedAt: Date.UTC(2026, 10, 5, 9, 5),
	companies: ["nvidia"],
}];

describe("render", () => {
	test("escapes feed text in HTML", () => {
		const html = renderPage({ board, history: [], news });

		expect(html).toContain("Nvidia &lt;script&gt;alert(1)&lt;/script&gt;");
		expect(html).toContain('href="https://example.com/a?x=1&amp;y=2"');
		expect(html).not.toContain("<script>alert");
	});

	test("shows market caps and day changes", () => {
		const html = renderPage({ board, history: [], news: [] });

		expect(html).toContain("$4.82T");
		expect(html).toContain("-3.17%");
		expect(html).toContain("no stories yet.");
	});

	test("draws the chart once there are two days", () => {
		const history = [
			{ day: "2026-11-03", total: 23e12 },
			{ day: "2026-11-04", total: 23.4e12 },
		];
		const html = renderPage({ board, history, news: [] });

		expect(html).toContain("<polyline");
		expect(html).toContain("3 nov 2026");
	});

	test("renders a plain-text board for the terminal", () => {
		const text = renderText(board, news);

		expect(text).toContain("01  Nvidia          NVDA        $4.82T    -3.17%");
		expect(text).toContain("5 nov 09:05 utc · Example · Nvidia");
	});
});

describe("routing", () => {
	const env = {} as Env;

	test("rejects other methods", async () => {
		const response = await worker.fetch(
			new Request("https://slop.stackrot.dev/", { method: "POST" }), env);

		expect(response.status).toBe(405);
	});

	test("returns JSON 404 for unknown API paths", async () => {
		const response = await worker.fetch(
			new Request("https://slop.stackrot.dev/api/nope"), env);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "not found" });
	});
});
