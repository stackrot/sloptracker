import { LISTED, type Listed } from "./companies";
import { FEEDS, parseFeed, type Feed } from "./feeds";

const FINNHUB = "https://finnhub.io/api/v1";
const USER_AGENT = "sloptracker (+https://slop.stackrot.dev)";
const MINUTE = 60 * 1000;
const NEWS_MAX_AGE = 90 * 24 * 60 * MINUTE;
// The Workers Free plan allows 10 ms of CPU per cron run, so each run
// handles one company and one feed and makes a single D1 call. With the
// cron in wrangler.jsonc firing every 2 minutes, each company is repriced
// about every 34 minutes and each feed is fetched every 26.
const RUN_INTERVAL = 2 * MINUTE;
// Parsing is the expensive part. A story older than this when its feed is
// fetched was stored by an earlier fetch, so it is skipped unparsed.
const NEWS_WINDOW = 6 * 60 * MINUTE;

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

export function jobsFor(time: number): { company: Listed; feed: Feed }
{
	const slot = Math.floor(time / RUN_INTERVAL);
	return {
		company: LISTED[slot % LISTED.length],
		feed: FEEDS[slot % FEEDS.length],
	};
}

async function shares(env: Env, company: Listed): Promise<number | null>
{
	try {
		const profile = await finnhub<Profile>(env, "stock/profile2",
			company.symbol);
		if (profile.shareOutstanding)
			return profile.shareOutstanding * 1e6 / (company.adrRatio ?? 1);
		console.error(`profile ${company.symbol}: no share count`);
	} catch (error) {
		console.error(`profile ${company.symbol}: ${error}`);
	}
	return null;
}

// A failed profile keeps the stored share count, so only the quote has to
// succeed for the company to be repriced.
async function price(env: Env, company: Listed, now: number)
	: Promise<D1PreparedStatement[]>
{
	const [quote, count] = await Promise.all([
		finnhub<Quote>(env, "quote", company.symbol),
		shares(env, company),
	]);
	if (!quote.c || !quote.t)
		throw new Error("empty quote");

	return [
		env.DB.prepare(
			`INSERT INTO quotes
				(symbol, price, prev_close, quoted_at, shares, shares_at)
			VALUES (?1, ?2, ?3, ?4, ?5, iif(?5 IS NULL, NULL, ?6))
			ON CONFLICT (symbol) DO UPDATE SET price = excluded.price,
				prev_close = excluded.prev_close,
				quoted_at = excluded.quoted_at,
				shares = coalesce(excluded.shares, shares),
				shares_at = coalesce(excluded.shares_at, shares_at)`,
		).bind(company.symbol, quote.c, quote.pc, quote.t * 1000, count, now),
		env.DB.prepare(
			`INSERT OR REPLACE INTO history (day, symbol, market_cap)
			SELECT date(quoted_at / 1000, 'unixepoch'), symbol, price * shares
			FROM quotes WHERE symbol = ?1 AND shares IS NOT NULL`,
		).bind(company.symbol),
	];
}

async function news(env: Env, feed: Feed, now: number)
	: Promise<D1PreparedStatement[]>
{
	const response = await get(feed.url);
	// The upper bound drops the occasional future-dated item.
	const stories = parseFeed(await response.text(), feed.source,
		now - NEWS_WINDOW, now + 60 * MINUTE);
	if (!stories.length)
		return [];

	const rows = stories.map((story) => ({
		...story,
		companies: `,${story.companies.join(",")},`,
	}));
	return [
		env.DB.prepare(
			`INSERT OR IGNORE INTO news
				(url, title, source, published_at, companies)
			SELECT value ->> 'url', value ->> 'title', value ->> 'source',
				value ->> 'publishedAt', value ->> 'companies'
			FROM json_each(?1)`,
		).bind(JSON.stringify(rows)),
	];
}

export async function sync(env: Env, scheduledTime: number): Promise<void>
{
	const now = Date.now();
	const { company, feed } = jobsFor(scheduledTime);
	const [priced, fetched] = await Promise.allSettled([
		price(env, company, now),
		news(env, feed, now),
	]);

	const statements: D1PreparedStatement[] = [];
	if (priced.status === "fulfilled")
		statements.push(...priced.value);
	else
		console.error(`quote ${company.symbol}: ${priced.reason}`);
	if (fetched.status === "fulfilled")
		statements.push(...fetched.value);
	else
		console.error(`feed ${feed.source}: ${fetched.reason}`);

	statements.push(env.DB.prepare("DELETE FROM news WHERE published_at < ?1")
		.bind(now - NEWS_MAX_AGE));
	await env.DB.batch(statements);
}
