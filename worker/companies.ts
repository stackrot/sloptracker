export interface Listed {
	id: string;
	name: string;
	symbol: string;
	// Primary-listing shares per US depositary share, when Finnhub reports
	// the share count of the home listing rather than of the ADR.
	adrRatio?: number;
	match: RegExp[];
}

export interface Private {
	id: string;
	name: string;
	valuation: number;
	event: string;
	date: string;
	source: string;
	match: RegExp[];
}

export const LISTED: Listed[] = [
	{
		id: "nvidia",
		name: "Nvidia",
		symbol: "NVDA",
		match: [/\bnvidia\b/i, /\bJensen Huang\b/],
	},
	{
		id: "microsoft",
		name: "Microsoft",
		symbol: "MSFT",
		match: [/\bmicrosoft\b/i, /\bSatya Nadella\b/],
	},
	{
		id: "alphabet",
		name: "Alphabet",
		symbol: "GOOGL",
		match: [/\b(alphabet|google|deepmind)\b/i, /\bSundar Pichai\b/],
	},
	{
		id: "amazon",
		name: "Amazon",
		symbol: "AMZN",
		match: [/\bamazon\b/i, /\bAWS\b/, /\bAndy Jassy\b/],
	},
	{
		id: "meta",
		name: "Meta",
		symbol: "META",
		match: [/\bMeta\b/, /\bZuckerberg\b/],
	},
	{
		id: "broadcom",
		name: "Broadcom",
		symbol: "AVGO",
		match: [/\bbroadcom\b/i],
	},
	{
		id: "tsmc",
		name: "TSMC",
		symbol: "TSM",
		adrRatio: 5,
		match: [/\bTSMC\b/, /\bTaiwan Semiconductor\b/i],
	},
	{
		id: "micron",
		name: "Micron",
		symbol: "MU",
		match: [/\bmicron\b/i],
	},
	{
		id: "amd",
		name: "AMD",
		symbol: "AMD",
		match: [/\bAMD\b/, /\bLisa Su\b/],
	},
	{
		id: "palantir",
		name: "Palantir",
		symbol: "PLTR",
		match: [/\bpalantir\b/i],
	},
	{
		id: "oracle",
		name: "Oracle",
		symbol: "ORCL",
		match: [/\bOracle\b/, /\bLarry Ellison\b/],
	},
	{
		id: "arm",
		name: "Arm",
		symbol: "ARM",
		match: [/\bArm (Holdings|chips?|CEO)\b/, /\bRene Haas\b/],
	},
	{
		id: "nebius",
		name: "Nebius",
		symbol: "NBIS",
		match: [/\bnebius\b/i],
	},
	{
		id: "coreweave",
		name: "CoreWeave",
		symbol: "CRWV",
		match: [/\bcoreweave\b/i],
	},
	{
		id: "supermicro",
		name: "Super Micro",
		symbol: "SMCI",
		match: [/\bsuper ?micro\b/i],
	},
	{
		id: "spacex",
		name: "SpaceX (xAI)",
		symbol: "SPCX",
		match: [/\bSpaceX/, /\bxAI\b/, /\bGrok\b/],
	},
	{
		id: "cerebras",
		name: "Cerebras",
		symbol: "CBRS",
		match: [/\bcerebras\b/i],
	},
];

// Last reported valuations, updated by hand when a round closes.
export const PRIVATE: Private[] = [
	{
		id: "anthropic",
		name: "Anthropic",
		valuation: 965e9,
		event: "Series H",
		date: "2026-05-28",
		source: "https://www.cnbc.com/2026/05/28/anthropic-open-ai-startup-value.html",
		match: [/\banthropic\b/i, /\bClaude\b/, /\bDario Amodei\b/],
	},
	{
		id: "openai",
		name: "OpenAI",
		valuation: 852e9,
		event: "employee share sale",
		date: "2026-08-10",
		source: "https://www.cnbc.com/2026/08/10/openai-wraps-7-billion-share-sale-ahead-of-potential-ipo-.html",
		match: [/\bopenai\b/i, /\bchatgpt\b/i, /\bSam Altman\b/],
	},
	{
		id: "databricks",
		name: "Databricks",
		valuation: 190e9,
		event: "funding round",
		date: "2026-08-13",
		source: "https://www.cnbc.com/2026/08/13/databricks-funding-round-190-billion-valuation.html",
		match: [/\bdatabricks\b/i],
	},
	{
		id: "cognition",
		name: "Cognition",
		valuation: 48e9,
		event: "Series E",
		date: "2026-09-08",
		source: "https://techcrunch.com/2026/09/08/cognition-hits-48b-valuation-signaling-investors-believe-ai-coding-is-far-from-a-winner-take-all-market/",
		match: [/\bCognition (AI|Labs)\b/, /\bWindsurf\b/],
	},
	{
		id: "prometheus",
		name: "Project Prometheus",
		valuation: 41e9,
		event: "funding round",
		date: "2026-06-11",
		source: "https://www.cnbc.com/2026/06/11/project-prometheus-bezos-bajaj-live-updates.html",
		match: [/\bProject Prometheus\b/i],
	},
	{
		id: "figure",
		name: "Figure AI",
		valuation: 39e9,
		event: "Series C",
		date: "2025-09-16",
		source: "https://www.figure.ai/news/series-c",
		match: [/\bFigure AI\b/i],
	},
	{
		id: "ssi",
		name: "Safe Superintelligence",
		valuation: 32e9,
		event: "funding round",
		date: "2025-04-12",
		source: "https://techcrunch.com/2025/04/12/openai-co-founder-ilya-sutskevers-safe-superintelligence-reportedly-valued-at-32b/",
		match: [/\bSafe Superintelligence\b/i, /\bSutskever\b/],
	},
	{
		id: "crusoe",
		name: "Crusoe",
		valuation: 30.9e9,
		event: "Series F",
		date: "2026-09-17",
		source: "https://www.crusoe.ai/resources/newsroom/crusoe-announces-series-f-funding",
		match: [/\bCrusoe\b/],
	},
	{
		id: "vast",
		name: "VAST Data",
		valuation: 30e9,
		event: "Series F",
		date: "2026-04-22",
		source: "https://www.cnbc.com/2026/04/22/nvidia-backs-ai-company-vast-data.html",
		match: [/\bVAST Data\b/i],
	},
	{
		id: "scale",
		name: "Scale AI",
		valuation: 29e9,
		event: "Meta investment",
		date: "2025-06-12",
		source: "https://scale.com/blog/scale-ai-announces-next-phase-of-company-evolution",
		match: [/\bScale AI\b/i],
	},
	{
		id: "mistral",
		name: "Mistral AI",
		valuation: 24e9,
		event: "Series D",
		date: "2026-09-08",
		source: "https://www.cnbc.com/2026/09/08/mistral-ai-funding-valuation-samsung.html",
		match: [/\bmistral\b/i],
	},
	{
		id: "elevenlabs",
		name: "ElevenLabs",
		valuation: 22e9,
		event: "employee tender",
		date: "2026-09-30",
		source: "https://elevenlabs.io/blog/tender-22bn",
		match: [/\belevenlabs\b/i],
	},
	{
		id: "perplexity",
		name: "Perplexity",
		valuation: 20e9,
		event: "funding round",
		date: "2025-09-10",
		source: "https://techcrunch.com/2025/09/10/perplexity-reportedly-raised-200m-at-20b-valuation/",
		match: [/\bPerplexity\b/, /\bAravind Srinivas\b/],
	},
	{
		id: "thinking-machines",
		name: "Thinking Machines Lab",
		valuation: 12e9,
		event: "seed round",
		date: "2025-07-15",
		source: "https://techcrunch.com/2025/07/15/mira-muratis-thinking-machines-lab-is-worth-12b-in-seed-round/",
		match: [/\bThinking Machines\b/, /\bMira Murati\b/],
	},
];

export const COMPANIES: Array<Listed | Private> = [...LISTED, ...PRIVATE];

export function matchCompanies(text: string): string[]
{
	return COMPANIES
		.filter((company) => company.match.some((re) => re.test(text)))
		.map((company) => company.id);
}
