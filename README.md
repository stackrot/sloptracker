# sloptracker

Market caps, private valuations and news for the companies riding the AI boom. Live at <https://slop.stackrot.dev>.

A Cloudflare Worker renders the page from a D1 database, and a cron trigger refreshes the data every 10 minutes.

Listed companies are priced with Finnhub's `/quote`. Share counts come from `/stock/profile2` and are refreshed daily, and market cap is price times shares. For ADRs, `adrRatio` converts the home-listing share count Finnhub reports into ADR-equivalent shares.

Private companies show their last reported valuation, kept by hand in `worker/companies.ts` with a link to the report.

News comes from the RSS feeds of BBC, The Guardian, Financial Times, Bloomberg, WSJ, CNBC, New York Times, Ars Technica, The Verge, TechCrunch, MIT Technology Review, Wired and 404 Media. Stories that don't mention a tracked company are dropped, and the rest are kept for 90 days.

The combined market cap chart only plots days when every listed company has a value, so adding a company starts its history fresh.

## Endpoints

```
curl https://slop.stackrot.dev                    # plain-text board
curl https://slop.stackrot.dev/api/companies
curl https://slop.stackrot.dev/api/news?c=nvidia  # c is any company id
curl https://slop.stackrot.dev/api/status         # deployed version, last quote and story
```

## Local dev

```bash
bun install
echo "FINNHUB_API_KEY=..." > .dev.vars
bunx wrangler d1 migrations apply DB --local
bun run dev
curl localhost:8787/cdn-cgi/handler/scheduled   # run one sync
bun run check                                   # types and tests
```

Each sync fetches four share counts, so a fresh database needs a few runs before every company has a market cap.

## Changing companies

Edit `worker/companies.ts`. `match` holds the patterns used to tag news stories. Use case-sensitive patterns for names that are also ordinary words (`Meta`, `Arm`, `Perplexity`).

When a private company lists, move it to `LISTED` with its ticker. If Finnhub's profile reports the home listing rather than the ADR, set `adrRatio`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which checks the Worker, applies any new D1 migrations from `migrations/` and deploys with `wrangler deploy`.

| Secret | Where | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub Actions | `sloptracker-ci` account token: Workers Scripts and D1 write, plus Workers Routes write and Zone read on `stackrot.dev` |
| `FINNHUB_API_KEY` | Worker (`wrangler secret put`) | Finnhub free-tier key |

`styles.css` and `site.js` are served as immutable. Their `?v=` references in `worker/render.ts` and `public/404.html` must match the first 8 hex digits of the file's SHA-256, and `bun test` fails with the expected value when they don't.

The look comes from [stackrot.dev](https://stackrot.dev).

Not investment advice.
