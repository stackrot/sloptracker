import { PRIVATE } from "./companies";
import { board, history, isCompany, news } from "./data";
import { renderPage } from "./render";
import { sync } from "./sync";
import { renderText } from "./text";

const SECURITY_HEADERS = {
	"referrer-policy": "strict-origin-when-cross-origin",
	"strict-transport-security": "max-age=63072000; includeSubDomains; preload",
	"x-content-type-options": "nosniff",
	"x-frame-options": "DENY",
	"permissions-policy": "camera=(), microphone=(), geolocation=()",
} as const;

const CACHE = "public, max-age=60";

function isCli(ua: string | null): boolean
{
	return !!ua && /curl|wget|httpie|libfetch/i.test(ua);
}

// Cloudflare copies this per-response nonce onto the bot-detection scripts
// it injects, so they run without allowing arbitrary inline scripts.
function policy(): string
{
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	const nonce = btoa(String.fromCharCode(...bytes));
	return [
		"default-src 'self'",
		"base-uri 'none'",
		`script-src 'nonce-${nonce}' 'self' https://static.cloudflareinsights.com`,
		"style-src 'self'",
		"img-src 'self'",
		"connect-src 'self' https://cloudflareinsights.com",
		"object-src 'none'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		"upgrade-insecure-requests",
	].join("; ");
}

function json(body: unknown, status = 200): Response
{
	return new Response(JSON.stringify(body, null, "\t") + "\n", {
		status,
		headers: {
			...SECURITY_HEADERS,
			"access-control-allow-origin": "*",
			"cache-control": status === 200 ? CACHE : "no-store",
			"content-type": "application/json; charset=utf-8",
		},
	});
}

async function companies(env: Env): Promise<Response>
{
	const rows = await board(env);
	return json({
		listed: rows.map((row) => ({
			id: row.company.id,
			name: row.company.name,
			symbol: row.company.symbol,
			price: row.price,
			market_cap: Math.round(row.marketCap),
			change: Number(row.change.toFixed(6)),
			quoted_at: new Date(row.quotedAt).toISOString(),
		})),
		private: PRIVATE.map((company) => ({
			id: company.id,
			name: company.name,
			valuation: company.valuation,
			event: company.event,
			date: company.date,
			source: company.source,
		})),
	});
}

async function stories(env: Env, company?: string): Promise<Response>
{
	const items = await news(env, company, 100);
	return json({
		items: items.map((item) => ({
			title: item.title,
			url: item.url,
			source: item.source,
			published_at: new Date(item.publishedAt).toISOString(),
			companies: item.companies,
		})),
	});
}

async function status(env: Env): Promise<Response>
{
	const row = await env.DB.prepare(
		`SELECT (SELECT MAX(quoted_at) FROM quotes) AS priced,
		(SELECT MAX(published_at) FROM news) AS story`,
	).first<{ priced: number | null; story: number | null }>();
	const iso = (ms?: number | null) => ms ? new Date(ms).toISOString() : null;
	return json({
		version: env.CF_VERSION_METADATA.tag || env.CF_VERSION_METADATA.id,
		priced_at: iso(row?.priced),
		latest_story: iso(row?.story),
	});
}

async function home(request: Request, env: Env, company?: string)
	: Promise<Response>
{
	const [rows, points, items] = await Promise.all([
		board(env),
		history(env),
		news(env, company),
	]);

	if (isCli(request.headers.get("user-agent")))
		return new Response(renderText(rows, items.slice(0, 20)), {
			headers: {
				...SECURITY_HEADERS,
				"cache-control": CACHE,
				"content-type": "text/plain; charset=utf-8",
				vary: "user-agent",
			},
		});

	const html = renderPage({ board: rows, history: points, news: items,
		company });
	return new Response(html, {
		headers: {
			...SECURITY_HEADERS,
			"cache-control": CACHE,
			"content-security-policy": policy(),
			"content-type": "text/html; charset=utf-8",
			vary: "user-agent",
		},
	});
}

async function route(request: Request, env: Env): Promise<Response>
{
	const url = new URL(request.url);
	const param = url.searchParams.get("c");
	const company = isCompany(param) ? param : undefined;

	switch (url.pathname) {
	case "/":
		return home(request, env, company);
	case "/api/companies":
		return companies(env);
	case "/api/news":
		return stories(env, company);
	case "/api/status":
		return status(env);
	default:
		return url.pathname.startsWith("/api/")
			? json({ error: "not found" }, 404)
			: env.ASSETS.fetch(request);
	}
}

export default {
	async fetch(request, env): Promise<Response> {
		if (request.method !== "GET" && request.method !== "HEAD")
			return new Response(null, {
				status: 405,
				headers: { ...SECURITY_HEADERS, allow: "GET, HEAD" },
			});
		return route(request, env);
	},

	async scheduled(_controller, env, ctx): Promise<void> {
		ctx.waitUntil(sync(env));
	},
} satisfies ExportedHandler<Env>;
