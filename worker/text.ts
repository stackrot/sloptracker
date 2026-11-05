import { COMPANIES, PRIVATE } from "./companies";
import type { Board, Item } from "./data";
import { change, money, stamp } from "./format";

const NAMES = new Map(COMPANIES.map((company) => [company.id, company.name]));

function row(cells: string[], widths: number[]): string
{
	return cells
		.map((cell, i) => widths[i] < 0
			? cell.padStart(-widths[i])
			: cell.padEnd(widths[i]))
		.join("  ")
		.trimEnd();
}

function listed(board: Board[]): string[]
{
	if (!board.length)
		return ["waiting for the first quotes."];

	const widths = [2, 14, 6, -10, -8];
	const total = board.reduce((sum, r) => sum + r.marketCap, 0);
	const before = board.reduce((sum, r) => sum + r.marketCap / (1 + r.change),
		0);
	const quotedAt = Math.max(...board.map((r) => r.quotedAt));
	return [
		`listed, priced ${stamp(quotedAt)} utc`,
		"",
		row(["#", "company", "ticker", "market cap", "1d"], widths),
		...board.map((r, i) => row([
			String(i + 1).padStart(2, "0"),
			r.company.name,
			r.company.symbol,
			money(r.marketCap),
			change(r.change),
		], widths)),
		row(["", "combined", "", money(total), change(total / before - 1)],
			widths),
	];
}

function unlisted(): string[]
{
	if (!PRIVATE.length)
		return [];

	const widths = [18, -10, 10];
	const rows = [...PRIVATE].sort((a, b) => b.valuation - a.valuation);
	return [
		"",
		"private, last reported valuation",
		"",
		row(["company", "valuation", "reported"], widths),
		...rows.map((r) => row([r.name, money(r.valuation), r.date], widths)),
	];
}

function stories(news: Item[]): string[]
{
	return [
		"",
		"news",
		"",
		...news.flatMap((item) => [
			`${stamp(item.publishedAt)} utc · ${item.source} · ` +
				item.companies.map((id) => NAMES.get(id)).join(", "),
			`  ${item.title}`,
			`  ${item.url}`,
		]),
	];
}

export function renderText(board: Board[], news: Item[]): string
{
	return [
		"sloptracker · ai market caps · valuations · news",
		"",
		...listed(board),
		...unlisted(),
		...stories(news),
		"",
		"quotes: Finnhub. news: outlet RSS feeds. not investment advice.",
		"",
	].join("\n");
}
