import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ASSET_VERSIONS } from "../worker/render";

function version(path: string): string
{
	const bytes = readFileSync(new URL(`../public/${path}`, import.meta.url));
	return createHash("sha256").update(bytes).digest("hex").slice(0, 8);
}

// These files are served as immutable, so every reference must change
// whenever the file does.
describe("asset versions", () => {
	test("the worker references current styles and script", () => {
		expect(ASSET_VERSIONS.css).toBe(version("styles.css"));
		expect(ASSET_VERSIONS.js).toBe(version("site.js"));
	});

	test("static pages reference current assets", () => {
		const page = readFileSync(
			new URL("../public/404.html", import.meta.url), "utf8");
		const styles = readFileSync(
			new URL("../public/styles.css", import.meta.url), "utf8");

		expect(page).toContain(`/styles.css?v=${version("styles.css")}`);
		expect(styles).toContain(`/noise.svg?v=${version("noise.svg")}`);
	});
});
