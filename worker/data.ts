import { COMPANIES, LISTED, type Listed } from "./companies";

export interface Board {
	company: Listed;
	price: number;
	marketCap: number;
	change: number;
	quotedAt: number;
}

export interface Point {
	day: string;
	total: number;
}

export interface Item {
	url: string;
	title: string;
	source: string;
	publishedAt: number;
	companies: string[];
}

interface QuoteRow {
	symbol: string;
	price: number | null;
	prev_close: number | null;
	quoted_at: number | null;
	shares: number | null;
}

interface NewsRow {
	url: string;
	title: string;
	source: string;
	published_at: number;
	companies: string;
}

export async function board(env: Env): Promise<Board[]>
{
	const { results } = await env.DB
		.prepare("SELECT * FROM quotes").all<QuoteRow>();
	const quotes = new Map(results.map((row) => [row.symbol, row]));

	const rows: Board[] = [];
	for (const company of LISTED) {
		const q = quotes.get(company.symbol);
		if (!q?.price || !q.prev_close || !q.shares || !q.quoted_at)
			continue;
		rows.push({
			company,
			price: q.price,
			marketCap: q.price * q.shares,
			change: q.price / q.prev_close - 1,
			quotedAt: q.quoted_at,
		});
	}
	return rows.sort((a, b) => b.marketCap - a.marketCap);
}

// Totals only count days on which every listed company has a value, so a
// missed quote or a newly added company never shows up as a crash.
export async function history(env: Env): Promise<Point[]>
{
	const { results } = await env.DB.prepare(
		`SELECT day, symbol, market_cap FROM history
		WHERE day >= date('now', '-1 year') ORDER BY day`,
	).all<{ day: string; symbol: string; market_cap: number }>();

	const symbols = new Set(LISTED.map((company) => company.symbol));
	const days = new Map<string, { total: number; count: number }>();
	for (const row of results) {
		if (!symbols.has(row.symbol))
			continue;
		const entry = days.get(row.day) ?? { total: 0, count: 0 };
		entry.total += row.market_cap;
		entry.count++;
		days.set(row.day, entry);
	}
	return [...days]
		.filter(([, entry]) => entry.count === symbols.size)
		.map(([day, entry]) => ({ day, total: entry.total }));
}

export function isCompany(id: string | null): id is string
{
	return !!id && COMPANIES.some((company) => company.id === id);
}

export async function news(env: Env, company?: string, limit = 60)
	: Promise<Item[]>
{
	const { results } = await env.DB.prepare(
		`SELECT * FROM news WHERE companies LIKE ?1
		ORDER BY published_at DESC LIMIT ?2`,
	).bind(company ? `%,${company},%` : "%", limit).all<NewsRow>();

	return results.map((row) => ({
		url: row.url,
		title: row.title,
		source: row.source,
		publishedAt: row.published_at,
		companies: row.companies.split(",").filter(Boolean),
	}));
}
