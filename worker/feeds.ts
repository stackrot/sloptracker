import { matchCompanies } from "./companies";

export interface Feed {
	source: string;
	url: string;
}

export interface Story {
	url: string;
	title: string;
	source: string;
	publishedAt: number;
	companies: string[];
}

export const FEEDS: Feed[] = [
	{ source: "BBC", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
	{
		source: "The Guardian",
		url: "https://www.theguardian.com/technology/artificialintelligenceai/rss",
	},
	{
		source: "Financial Times",
		url: "https://www.ft.com/artificial-intelligence?format=rss",
	},
	{
		source: "Bloomberg",
		url: "https://feeds.bloomberg.com/technology/news.rss",
	},
	{
		source: "WSJ",
		url: "https://feeds.content.dowjones.io/public/rss/RSSWSJD",
	},
	{
		source: "CNBC",
		url: "https://www.cnbc.com/id/19854910/device/rss/rss.html",
	},
	{
		source: "New York Times",
		url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
	},
	{ source: "Ars Technica", url: "https://arstechnica.com/ai/feed/" },
	{
		source: "The Verge",
		url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
	},
	{
		source: "TechCrunch",
		url: "https://techcrunch.com/category/artificial-intelligence/feed/",
	},
	{
		source: "MIT Technology Review",
		url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
	},
	{ source: "Wired", url: "https://www.wired.com/feed/tag/ai/latest/rss" },
	{ source: "404 Media", url: "https://www.404media.co/rss" },
];

const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

const TRACKING_PARAMS = /^(utm_.*|syn-.*|mod|ref|cmpid|smid|taid)$/;
const ENTITY = /&(#x?[0-9a-f]+|[a-z]+);/gi;
const TAG = /<[^>]*>/g;
const SPACE = /\s+/g;
// Some feeds put whole articles in the description; the opening is enough
// to tell which companies a story is about.
const SUMMARY_LENGTH = 600;

function decode(text: string): string
{
	if (!text.includes("&"))
		return text;
	return text.replace(ENTITY, (entity, body: string) => {
		if (body[0] !== "#")
			return ENTITIES[body.toLowerCase()] ?? entity;
		const hex = body[1] === "x" || body[1] === "X";
		const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
		return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
	});
}

// Strips CDATA markers and markup, then decodes entities, so "&lt;b&gt;"
// in an escaped description ends up as text rather than as a tag.
function clean(raw: string): string
{
	const text = raw.replaceAll("<![CDATA[", "").replaceAll("]]>", "");
	return decode(text.replace(TAG, " "))
		.replace(TAG, " ")
		.replace(SPACE, " ")
		.trim();
}

function isSpace(ch: string | undefined): boolean
{
	return ch === " " || ch === "\n" || ch === "\t" || ch === "\r";
}

// Feeds are scanned with indexOf rather than regular expressions because
// each cron run starts in a cold isolate, where regex work is expensive.
// This finds the next <name> or <name ...>, skipping longer tag names that
// share the prefix, such as <items> when looking for <item>.
function openTag(xml: string, name: string, from: number): number
{
	const prefix = `<${name}`;
	for (let at = xml.indexOf(prefix, from); at !== -1;
			at = xml.indexOf(prefix, at + 1)) {
		const next = xml[at + prefix.length];
		if (next === ">" || next === "/" || isSpace(next))
			return at;
	}
	return -1;
}

function element(block: string, name: string): string | undefined
{
	const start = openTag(block, name, 0);
	if (start === -1)
		return undefined;
	const body = block.indexOf(">", start) + 1;
	if (body === 0 || block[body - 2] === "/")
		return undefined;
	const end = block.indexOf(`</${name}>`, body);
	return end === -1 ? undefined : block.slice(body, end);
}

function blocks(xml: string): string[]
{
	const name = openTag(xml, "item", 0) === -1 ? "entry" : "item";
	const close = `</${name}>`;
	const found: string[] = [];
	for (let at = openTag(xml, name, 0); at !== -1;
			at = openTag(xml, name, at + 1)) {
		const end = xml.indexOf(close, at);
		if (end === -1)
			break;
		found.push(xml.slice(at, end));
		at = end;
	}
	return found;
}

function attribute(tag: string, name: string): string | undefined
{
	const key = `${name}="`;
	for (let at = tag.indexOf(key); at !== -1; at = tag.indexOf(key, at + 1)) {
		if (!isSpace(tag[at - 1]))
			continue;
		const start = at + key.length;
		const end = tag.indexOf('"', start);
		return end === -1 ? undefined : tag.slice(start, end);
	}
	return undefined;
}

function atomLink(block: string): string | undefined
{
	for (let at = openTag(block, "link", 0); at !== -1;
			at = openTag(block, "link", at + 1)) {
		const tag = block.slice(at, block.indexOf(">", at) + 1);
		const rel = attribute(tag, "rel");
		const href = attribute(tag, "href");
		if (href && (!rel || rel === "alternate"))
			return decode(href);
	}
	return undefined;
}

export function canonicalUrl(raw: string): string | undefined
{
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return undefined;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:")
		return undefined;
	for (const key of [...url.searchParams.keys()]) {
		if (TRACKING_PARAMS.test(key))
			url.searchParams.delete(key);
	}
	url.hash = "";
	return url.toString();
}

// Only items published between since and until are parsed. The date is
// read first because it is cheap, and most items in a feed are old news.
export function parseFeed(xml: string, source: string, since = 0,
	until = Infinity): Story[]
{
	const stories: Story[] = [];

	for (const block of blocks(xml)) {
		const date = element(block, "pubDate") ?? element(block, "published") ??
			element(block, "updated") ?? element(block, "dc:date");
		const publishedAt = date ? Date.parse(clean(date)) : NaN;
		if (!(publishedAt >= since && publishedAt <= until))
			continue;

		const title = clean(element(block, "title") ?? "");
		const link = element(block, "link");
		const href = link ? clean(link) : atomLink(block);
		const url = href ? canonicalUrl(href) : undefined;
		if (!title || !url)
			continue;

		const summary = element(block, "description") ??
			element(block, "summary") ?? "";
		const lede = clean(summary.slice(0, SUMMARY_LENGTH));
		const companies = matchCompanies(`${title} ${lede}`);
		if (companies.length)
			stories.push({ url, title, source, publishedAt, companies });
	}
	return stories;
}
