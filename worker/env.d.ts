// Secrets are not in wrangler.jsonc, so `wrangler types` only sees them
// when a local .dev.vars exists.
interface Env {
	FINNHUB_API_KEY: string;
}
