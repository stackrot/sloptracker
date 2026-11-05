import { describe, expect, test } from "bun:test";
import { matchCompanies } from "../worker/companies";
import { canonicalUrl, FEEDS, parseFeed } from "../worker/feeds";
import { feedsFor } from "../worker/sync";

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Feed</title>
<atom:link href="https://example.com/feed" rel="self"/>
<item>
	<title><![CDATA[Nvidia &amp; TSMC sign &#8216;deal&#8217;]]></title>
	<link>https://example.com/a?utm_source=rss&amp;id=7</link>
	<pubDate>Wed, 04 Nov 2026 21:10:00 GMT</pubDate>
	<description>&lt;p&gt;Chips &lt;b&gt;again&lt;/b&gt;&lt;/p&gt;</description>
</item>
<item>
	<title>A story about gardening</title>
	<link>https://example.com/b</link>
	<pubDate>Wed, 04 Nov 2026 20:00:00 GMT</pubDate>
</item>
<item>
	<title>No date for OpenAI</title>
	<link>https://example.com/c</link>
</item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry>
	<title type="html">Anthropic ships a model</title>
	<link rel="replies" href="https://example.com/comments"/>
	<link rel="alternate" type="text/html" href="https://example.com/d#top"/>
	<published>2026-11-04T19:30:00-05:00</published>
	<summary>Claude, again.</summary>
</entry>
</feed>`;

describe("feeds", () => {
	test("parses RSS items that mention a tracked company", () => {
		const stories = parseFeed(RSS, "Example");

		expect(stories).toEqual([{
			url: "https://example.com/a?id=7",
			title: "Nvidia & TSMC sign ‘deal’",
			source: "Example",
			publishedAt: Date.UTC(2026, 10, 4, 21, 10),
			companies: ["nvidia", "tsmc"],
		}]);
	});

	test("parses Atom entries using the alternate link", () => {
		const [story] = parseFeed(ATOM, "Example");

		expect(story.url).toBe("https://example.com/d");
		expect(story.publishedAt).toBe(Date.UTC(2026, 10, 5, 0, 30));
	});

	test("strips tracking parameters and rejects non-web links", () => {
		expect(canonicalUrl("https://www.ft.com/content/x?syn-25a6b1a6=1"))
			.toBe("https://www.ft.com/content/x");
		expect(canonicalUrl("javascript:alert(1)")).toBeUndefined();
		expect(canonicalUrl("not a url")).toBeUndefined();
	});

	test("matches ambiguous names only in context", () => {
		expect(matchCompanies("Meta raises capex")).toEqual(["meta"]);
		expect(matchCompanies("a meta take on prediction markets")).toEqual([]);
		expect(matchCompanies("Arm Holdings beats estimates")).toEqual(["arm"]);
		expect(matchCompanies("robot arm picks up a cup")).toEqual([]);
		expect(matchCompanies("AWS outage hits Amazon sellers"))
			.toEqual(["amazon"]);
	});
});

describe("feed rotation", () => {
	test("covers every feed once across four consecutive runs", () => {
		const start = Date.UTC(2026, 10, 5, 11, 30);
		const runs = [0, 1, 2, 3].map((i) => feedsFor(start + i * 600_000));
		const seen = runs.flat().map((feed) => feed.url);

		expect(runs.every((feeds) => feeds.length >= 3)).toBe(true);
		expect(seen.sort()).toEqual(FEEDS.map((feed) => feed.url).sort());
	});
});
