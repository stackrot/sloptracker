import { describe, expect, test } from "bun:test";
import { COMPANIES, LISTED, matchCompanies } from "../worker/companies";
import { canonicalUrl, FEEDS, parseFeed } from "../worker/feeds";
import { jobsFor } from "../worker/sync";

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

	test("skips items outside the time window", () => {
		const at = Date.UTC(2026, 10, 4, 21, 10);

		expect(parseFeed(RSS, "Example", at, at)).toHaveLength(1);
		expect(parseFeed(RSS, "Example", at + 1)).toEqual([]);
		expect(parseFeed(RSS, "Example", 0, at - 1)).toEqual([]);
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

describe("job rotation", () => {
	const start = Date.UTC(2026, 10, 5, 11, 30);
	const runs = (count: number) => Array.from({ length: count },
		(_, i) => jobsFor(start + i * 120_000));

	test("fetches every feed once per cycle", () => {
		const feeds = runs(FEEDS.length).map((job) => job.feed.url);

		expect(feeds.sort()).toEqual(FEEDS.map((feed) => feed.url).sort());
	});

	test("reprices every company once per cycle", () => {
		const symbols = runs(LISTED.length).map((job) => job.company.symbol);

		expect(symbols.sort()).toEqual(LISTED.map((c) => c.symbol).sort());
	});
});

describe("keywords", () => {
	test("are unique and at most two words", () => {
		const keywords = COMPANIES.flatMap((company) => company.keywords);

		expect(new Set(keywords).size).toBe(keywords.length);
		for (const keyword of keywords)
			expect(keyword).toMatch(/^\w+( \w+)?$/);
	});

	test("match pairs only when separated by a single space", () => {
		expect(matchCompanies("Jensen Huang speaks")).toEqual(["nvidia"]);
		expect(matchCompanies("Mona Lisa. Su said")).toEqual([]);
		expect(matchCompanies("SUPER MICRO shares")).toEqual(["supermicro"]);
		expect(matchCompanies("Grok and grok")).toEqual(["spacex"]);
		expect(matchCompanies("grok it")).toEqual([]);
	});
});
