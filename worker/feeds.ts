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

function decode(text: string): string
{
	return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body: string) => {
		if (body[0] !== "#")
			return ENTITIES[body.toLowerCase()] ?? entity;
		const hex = body[1] === "x" || body[1] === "X";
		const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
		return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
	});
}

// Strips CDATA and markup, then decodes entities, so "&lt;b&gt;" in an
// escaped description ends up as text rather than as a tag.
function clean(raw: string): string
{
	const text = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
	return decode(text.replace(/<[^>]*>/g, " "))
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function element(block: string, name: string): string | undefined
{
	const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
	return block.match(re)?.[1];
}

function atomLink(block: string): string | undefined
{
	for (const tag of block.match(/<link\b[^>]*>/gi) ?? []) {
		const rel = tag.match(/\brel="([^"]*)"/i)?.[1];
		const href = tag.match(/\bhref="([^"]*)"/i)?.[1];
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

export function parseFeed(xml: string, source: string): Story[]
{
	const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
	const stories: Story[] = [];

	for (const block of blocks) {
		const title = clean(element(block, "title") ?? "");
		const link = element(block, "link");
		const href = link ? clean(link) : atomLink(block);
		const url = href ? canonicalUrl(href) : undefined;
		const date = element(block, "pubDate") ?? element(block, "published") ??
			element(block, "updated") ?? element(block, "dc:date");
		const publishedAt = date ? Date.parse(clean(date)) : NaN;
		if (!title || !url || !Number.isFinite(publishedAt))
			continue;

		const summary = element(block, "description") ??
			element(block, "summary") ?? "";
		const companies = matchCompanies(`${title} ${clean(summary)}`);
		if (companies.length)
			stories.push({ url, title, source, publishedAt, companies });
	}
	return stories;
}
