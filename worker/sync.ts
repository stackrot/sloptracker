import { LISTED, type Listed } from "./companies";
import { FEEDS, parseFeed, type Feed, type Story } from "./feeds";

const FINNHUB = "https://finnhub.io/api/v1";
const USER_AGENT = "sloptracker (+https://slop.stackrot.dev)";
const DAY = 24 * 60 * 60 * 1000;
const NEWS_MAX_AGE = 90 * DAY;
// Profiles cost one Finnhub call each, so refresh a few per run to keep
// every run well inside the Worker subrequest limit.
const PROFILES_PER_RUN = 4;
// Each run fetches one group of feeds so parsing fits the Free plan's
// 10 ms CPU limit per cron run. With the 10-minute cron, every feed is
// refreshed every 40 minutes.
const FEED_GROUPS = 4;
const RUN_INTERVAL = 10 * 60 * 1000;

interface Quote {
	c: number;
	pc: number;
	t: number;
}

interface Profile {
	shareOutstanding?: number;
}

async function get(url: string, headers: Record<string, string> = {})
{
	const response = await fetch(url, {
		headers: { "user-agent": USER_AGENT, ...headers },
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok)
		throw new Error(`HTTP ${response.status}`);
	return response;
}

async function finnhub<T>(env: Env, path: string, symbol: string): Promise<T>
{
	const url = `${FINNHUB}/${path}?symbol=${encodeURIComponent(symbol)}`;
	const response = await get(url, { "x-finnhub-token": env.FINNHUB_API_KEY });
	return response.json<T>();
}

async function staleShares(env: Env, now: number): Promise<Listed[]>
{
	const { results } = await env.DB
		.prepare("SELECT symbol, shares_at FROM quotes")
		.all<{ symbol: string; shares_at: number | null }>();
	const fetched = new Map(results.map((row) => [row.symbol, row.shares_at]));
	const age = (c: Listed) => fetched.get(c.symbol) ?? 0;
	return LISTED
		.filter((c) => now - age(c) > DAY)
		.sort((a, b) => age(a) - age(b))
		.slice(0, PROFILES_PER_RUN);
}

async function fetchShares(env: Env, company: Listed): Promise<number>
{
	const profile = await finnhub<Profile>(env, "stock/profile2",
		company.symbol);
	if (!profile.shareOutstanding)
		throw new Error("no share count");
	return profile.shareOutstanding * 1e6 / (company.adrRatio ?? 1);
}

async function syncShares(env: Env, now: number): Promise<void>
{
	const stale = await staleShares(env, now);
	const results = await Promise.allSettled(
		stale.map((company) => fetchShares(env, company)));

	const rows = [];
	for (const [i, result] of results.entries()) {
		if (result.status === "fulfilled")
			rows.push({ symbol: stale[i].symbol, shares: result.value });
		else
			console.error(`profile ${stale[i].symbol}: ${result.reason}`);
	}
	if (!rows.length)
		return;

	await env.DB.prepare(
		`INSERT INTO quotes (symbol, shares, shares_at)
		SELECT value ->> 'symbol', value ->> 'shares', ?1 FROM json_each(?2)
		WHERE true
		ON CONFLICT (symbol) DO UPDATE
		SET shares = excluded.shares, shares_at = excluded.shares_at`,
	).bind(now, JSON.stringify(rows)).run();
}

async function fetchQuotes(env: Env)
{
	const results = await Promise.allSettled(LISTED.map(
		(company) => finnhub<Quote>(env, "quote", company.symbol)));

	const rows = [];
	for (const [i, result] of results.entries()) {
		const { symbol } = LISTED[i];
		if (result.status === "rejected")
			console.error(`quote ${symbol}: ${result.reason}`);
		else if (!result.value.c || !result.value.t)
			console.error(`quote ${symbol}: empty`);
		else
			rows.push({
				symbol,
				price: result.value.c,
				prev: result.value.pc,
				at: result.value.t * 1000,
			});
	}
	return rows;
}

export function feedsFor(time: number): Feed[]
{
	const group = Math.floor(time / RUN_INTERVAL) % FEED_GROUPS;
	return FEEDS.filter((_, i) => i % FEED_GROUPS === group);
}

async function fetchNews(feeds: Feed[], now: number): Promise<Story[]>
{
	const results = await Promise.allSettled(feeds.map(async (feed) => {
		const response = await get(feed.url);
		return parseFeed(await response.text(), feed.source);
	}));

	const stories: Story[] = [];
	for (const [i, result] of results.entries()) {
		if (result.status === "rejected") {
			console.error(`feed ${feeds[i].source}: ${result.reason}`);
			continue;
		}
		// Feeds occasionally carry future-dated or long-dead items.
		stories.push(...result.value.filter((story) =>
			story.publishedAt < now + 3600_000 &&
			now - story.publishedAt < NEWS_MAX_AGE));
	}
	return stories;
}

export async function sync(env: Env, scheduledTime: number): Promise<void>
{
	const now = Date.now();
	// Share counts land first so a new symbol's first quote can be valued.
	await syncShares(env, now);
	const [quotes, stories] = await Promise.all([
		fetchQuotes(env),
		fetchNews(feedsFor(scheduledTime), now),
	]);

	const news = stories.map((story) => ({
		...story,
		companies: `,${story.companies.join(",")},`,
	}));
	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO quotes (symbol, price, prev_close, quoted_at)
			SELECT value ->> 'symbol', value ->> 'price', value ->> 'prev',
				value ->> 'at'
			FROM json_each(?1) WHERE true
			ON CONFLICT (symbol) DO UPDATE SET price = excluded.price,
				prev_close = excluded.prev_close,
				quoted_at = excluded.quoted_at`,
		).bind(JSON.stringify(quotes)),
		env.DB.prepare(
			`INSERT OR REPLACE INTO history (day, symbol, market_cap)
			SELECT date(quoted_at / 1000, 'unixepoch'), symbol, price * shares
			FROM quotes WHERE price IS NOT NULL AND shares IS NOT NULL`,
		),
		env.DB.prepare(
			`INSERT OR IGNORE INTO news
				(url, title, source, published_at, companies)
			SELECT value ->> 'url', value ->> 'title', value ->> 'source',
				value ->> 'publishedAt', value ->> 'companies'
			FROM json_each(?1)`,
		).bind(JSON.stringify(news)),
		env.DB.prepare("DELETE FROM news WHERE published_at < ?1")
			.bind(now - NEWS_MAX_AGE),
	]);
}
