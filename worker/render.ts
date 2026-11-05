import { COMPANIES, LISTED, PRIVATE } from "./companies";
import type { Board, Item, Point } from "./data";
import { FEEDS } from "./feeds";
import { change, day, escape, money, price, stamp } from "./format";

// First 8 hex digits of each file's SHA-256; test/static.test.ts checks them.
export const ASSET_VERSIONS = {
	css: "459e0467",
	js: "03c18ca3",
};

export const ORIGIN = "https://slop.stackrot.dev";

export interface Page {
	board: Board[];
	history: Point[];
	news: Item[];
	company?: string;
}

const NAMES = new Map(COMPANIES.map((company) => [company.id, company.name]));

function time(ms: number): string
{
	const iso = new Date(ms).toISOString();
	return `<time datetime="${iso}" data-local>${stamp(ms)} utc</time>`;
}

function delta(fraction: number): string
{
	const up = fraction >= 0;
	return `<span class="delta ${up ? "up" : "down"}">` +
		`<span aria-hidden="true">${up ? "▲" : "▼"}</span> ` +
		`${change(fraction)}</span>`;
}

function chart(points: Point[]): string
{
	if (points.length < 2) {
		const since = points[0] ? ` began ${day(points[0].day)}` : "";
		return `<p class="note">history${since}; the chart draws ` +
			`once two trading days are in.</p>`;
	}

	const width = 640;
	const height = 140;
	const totals = points.map((p) => p.total);
	const low = Math.min(...totals);
	const high = Math.max(...totals);
	const span = high - low || high * 0.01;
	const x = (i: number) => (i / (points.length - 1)) * width;
	const y = (v: number) => 8 + (1 - (v - low) / span) * (height - 16);
	const line = points
		.map((p, i) => `${x(i).toFixed(1)},${y(p.total).toFixed(1)}`)
		.join(" ");
	const first = points[0];
	const last = points[points.length - 1];
	const label = `Combined market cap from ${day(first.day)} ` +
		`(${money(first.total)}) to ${day(last.day)} (${money(last.total)}), ` +
		`ranging from ${money(low)} to ${money(high)}.`;

	return `<figure class="chart">
<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}"
	preserveAspectRatio="none">
<polygon class="area" points="0,${height} ${line} ${width},${height}"/>
<polyline class="line" points="${line}" vector-effect="non-scaling-stroke"/>
</svg>
<figcaption><span>${day(first.day)}</span>` +
		`<span>${money(low)} to ${money(high)}</span>` +
		`<span>${day(last.day)}</span></figcaption>
</figure>`;
}

function listedSection(page: Page): string
{
	const rows = page.board;
	if (!rows.length)
		return `<section class="section" aria-labelledby="listed-heading">
<h2 id="listed-heading">listed</h2>
<p class="note">waiting for the first quotes.</p>
</section>`;

	const total = rows.reduce((sum, row) => sum + row.marketCap, 0);
	const before = rows.reduce(
		(sum, row) => sum + row.marketCap / (1 + row.change), 0);
	const quotedAt = Math.max(...rows.map((row) => row.quotedAt));
	const body = rows.map((row, i) => `<tr>
<td class="rank">${String(i + 1).padStart(2, "0")}</td>
<td><a href="/?c=${row.company.id}#news">${escape(row.company.name)}</a></td>
<td class="ticker">${row.company.symbol}</td>
<td class="num">${money(row.marketCap)}</td>
<td class="num">${delta(row.change)}</td>
<td class="num price">${price(row.price)}</td>
</tr>`).join("\n");

	return `<section class="section" aria-labelledby="listed-heading">
<h2 id="listed-heading">listed</h2>
<p class="headline"><span class="figure">${money(total)}</span>
${delta(total / before - 1)}</p>
<p class="note">combined market cap of ${rows.length} companies, ` +
		`priced ${time(quotedAt)}</p>
${chart(page.history)}
<table class="board">
<thead><tr><th scope="col"><span class="sr">rank</span>#</th>
<th scope="col">company</th><th scope="col" class="ticker">ticker</th>
<th scope="col" class="num">market cap</th>
<th scope="col" class="num">1d</th>
<th scope="col" class="num price">price</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
</section>`;
}

function privateSection(): string
{
	if (!PRIVATE.length)
		return "";

	const rows = [...PRIVATE].sort((a, b) => b.valuation - a.valuation);
	const total = rows.reduce((sum, row) => sum + row.valuation, 0);
	const body = rows.map((row) => `<tr>
<td><a href="/?c=${row.id}#news">${escape(row.name)}</a></td>
<td class="num">${money(row.valuation)}</td>
<td class="event"><a href="${escape(row.source)}" rel="noopener">` +
		`↳ ${escape(row.event)}, ${day(row.date)}</a></td>
</tr>`).join("\n");

	return `<section class="section" aria-labelledby="private-heading">
<h2 id="private-heading">private</h2>
<p class="headline"><span class="figure">${money(total)}</span></p>
<p class="note">combined last reported valuation of ${rows.length} ` +
		`private companies</p>
<table class="board">
<thead><tr><th scope="col">company</th>
<th scope="col" class="num">valuation</th>
<th scope="col" class="event">reported</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
</section>`;
}

function filters(current?: string): string
{
	const link = (href: string, label: string, active: boolean) =>
		`<a href="${href}"${active ? ' aria-current="page"' : ""}>${label}</a>`;
	const links = [
		link("/#news", "all", !current),
		...LISTED.map((c) =>
			link(`/?c=${c.id}#news`, escape(c.name), c.id === current)),
		...PRIVATE.map((c) =>
			link(`/?c=${c.id}#news`, escape(c.name), c.id === current)),
	];
	return `<nav class="filters" aria-label="Filter news by company">` +
		`${links.join("\n")}</nav>`;
}

function newsSection(page: Page): string
{
	const items = page.news.map((item) => {
		const tags = item.companies
			.map((id) => NAMES.get(id))
			.filter(Boolean)
			.map((name) => escape(name!).toLowerCase())
			.join(" · ");
		return `<li>
<p class="meta">${time(item.publishedAt)} · ${escape(item.source)}</p>
<a href="${escape(item.url)}" rel="noopener">${escape(item.title)}</a>
<p class="tags">${tags}</p>
</li>`;
	}).join("\n");

	const heading = page.company
		? `news · ${escape(NAMES.get(page.company)!.toLowerCase())}`
		: "news";
	return `<section class="section" id="news" aria-labelledby="news-heading">
<h2 id="news-heading">${heading}</h2>
${filters(page.company)}
${items ? `<ol class="stories">\n${items}\n</ol>`
		: `<p class="note">no stories yet.</p>`}
</section>`;
}

function hints(): string
{
	const sources = FEEDS.map((feed) => escape(feed.source)).join(", ");
	return `<section class="section hints" aria-label="Sources and endpoints">
<p><span class="prompt" aria-hidden="true">$</span> curl ${ORIGIN}</p>
<p><span class="prompt" aria-hidden="true">$</span> curl ${ORIGIN}/api/companies</p>
<p><span class="prompt" aria-hidden="true">$</span> curl ${ORIGIN}/api/news?c=nvidia</p>
<p class="sources">quotes and share counts from Finnhub. news from the ` +
		`RSS feeds of ${sources}. private valuations link to their report. ` +
		`not investment advice.</p>
<button id="cycle-phosphor" class="phosphor-control" type="button" hidden>` +
		`↳ phosphor: amber</button>
</section>`;
}

export function renderPage(page: Page): string
{
	const description = "Market caps, private valuations and news for the " +
		"companies riding the AI boom.";
	return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${description}">
<meta name="theme-color" content="#080806">
<link rel="canonical" href="${ORIGIN}/">
<meta property="og:title" content="sloptracker">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:url" content="${ORIGIN}/">
<meta property="og:image" content="${ORIGIN}/icon.png">
<meta name="twitter:card" content="summary">
<title>sloptracker · ai market caps and news</title>
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icon.png">
<link rel="stylesheet" href="/styles.css?v=${ASSET_VERSIONS.css}">
<script src="/site.js?v=${ASSET_VERSIONS.js}" defer></script>
</head>
<body>
<div class="overlay grain" aria-hidden="true"></div>
<div class="overlay scanlines" aria-hidden="true"></div>
<div class="overlay vignette" aria-hidden="true"></div>
<main>
<div class="content">
<p class="login-line"><a href="https://stackrot.dev">stackrot.dev</a>` +
		` / slop</p>
<h1 class="title">sloptracker<span class="cursor" aria-hidden="true">_</span></h1>
<p class="tagline">ai market caps · valuations · news</p>
<div class="divider" aria-hidden="true"></div>
${listedSection(page)}
${privateSection()}
<div class="divider" aria-hidden="true"></div>
${newsSection(page)}
<div class="divider" aria-hidden="true"></div>
${hints()}
</div>
</main>
<span class="stack-addr" id="stack-addr" aria-hidden="true">0x7ffd00000000</span>
<span class="phosphor-status" id="phosphor-status" role="status" aria-live="polite"></span>
</body>
</html>
`;
}
