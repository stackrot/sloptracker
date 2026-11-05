// News stories are tagged with a company when they contain one of its
// keywords as whole words. A keyword in lower case matches in any case; one
// with capitals matches exactly, for names that are also ordinary words.
// Keywords are one or two words.
export interface Listed {
	id: string;
	name: string;
	symbol: string;
	// Primary-listing shares per US depositary share, when Finnhub reports
	// the share count of the home listing rather than of the ADR.
	adrRatio?: number;
	keywords: string[];
}

export interface Private {
	id: string;
	name: string;
	valuation: number;
	event: string;
	date: string;
	source: string;
	keywords: string[];
}

export const LISTED: Listed[] = [
	{
		id: "nvidia",
		name: "Nvidia",
		symbol: "NVDA",
		keywords: ["nvidia", "Jensen Huang"],
	},
	{
		id: "microsoft",
		name: "Microsoft",
		symbol: "MSFT",
		keywords: ["microsoft", "Satya Nadella"],
	},
	{
		id: "alphabet",
		name: "Alphabet",
		symbol: "GOOGL",
		keywords: ["alphabet", "google", "deepmind", "Sundar Pichai"],
	},
	{
		id: "amazon",
		name: "Amazon",
		symbol: "AMZN",
		keywords: ["amazon", "AWS", "Andy Jassy"],
	},
	{
		id: "meta",
		name: "Meta",
		symbol: "META",
		keywords: ["Meta", "Zuckerberg"],
	},
	{
		id: "broadcom",
		name: "Broadcom",
		symbol: "AVGO",
		keywords: ["broadcom"],
	},
	{
		id: "tsmc",
		name: "TSMC",
		symbol: "TSM",
		adrRatio: 5,
		keywords: ["TSMC", "taiwan semiconductor"],
	},
	{
		id: "micron",
		name: "Micron",
		symbol: "MU",
		keywords: ["micron"],
	},
	{
		id: "amd",
		name: "AMD",
		symbol: "AMD",
		keywords: ["AMD", "Lisa Su"],
	},
	{
		id: "palantir",
		name: "Palantir",
		symbol: "PLTR",
		keywords: ["palantir"],
	},
	{
		id: "oracle",
		name: "Oracle",
		symbol: "ORCL",
		keywords: ["Oracle", "Larry Ellison"],
	},
	{
		id: "arm",
		name: "Arm",
		symbol: "ARM",
		keywords: [
			"Arm Holdings", "Arm chip", "Arm chips", "Arm CEO", "Rene Haas",
		],
	},
	{
		id: "nebius",
		name: "Nebius",
		symbol: "NBIS",
		keywords: ["nebius"],
	},
	{
		id: "coreweave",
		name: "CoreWeave",
		symbol: "CRWV",
		keywords: ["coreweave"],
	},
	{
		id: "supermicro",
		name: "Super Micro",
		symbol: "SMCI",
		keywords: ["supermicro", "super micro"],
	},
	{
		id: "spacex",
		name: "SpaceX (xAI)",
		symbol: "SPCX",
		keywords: ["SpaceX", "SpaceXAI", "xAI", "Grok"],
	},
	{
		id: "cerebras",
		name: "Cerebras",
		symbol: "CBRS",
		keywords: ["cerebras"],
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
		keywords: ["anthropic", "Claude", "Dario Amodei"],
	},
	{
		id: "openai",
		name: "OpenAI",
		valuation: 852e9,
		event: "employee share sale",
		date: "2026-08-10",
		source: "https://www.cnbc.com/2026/08/10/openai-wraps-7-billion-share-sale-ahead-of-potential-ipo-.html",
		keywords: ["openai", "chatgpt", "Sam Altman"],
	},
	{
		id: "databricks",
		name: "Databricks",
		valuation: 190e9,
		event: "funding round",
		date: "2026-08-13",
		source: "https://www.cnbc.com/2026/08/13/databricks-funding-round-190-billion-valuation.html",
		keywords: ["databricks"],
	},
	{
		id: "cognition",
		name: "Cognition",
		valuation: 48e9,
		event: "Series E",
		date: "2026-09-08",
		source: "https://techcrunch.com/2026/09/08/cognition-hits-48b-valuation-signaling-investors-believe-ai-coding-is-far-from-a-winner-take-all-market/",
		keywords: ["Cognition AI", "Cognition Labs", "Windsurf"],
	},
	{
		id: "prometheus",
		name: "Project Prometheus",
		valuation: 41e9,
		event: "funding round",
		date: "2026-06-11",
		source: "https://www.cnbc.com/2026/06/11/project-prometheus-bezos-bajaj-live-updates.html",
		keywords: ["project prometheus"],
	},
	{
		id: "figure",
		name: "Figure AI",
		valuation: 39e9,
		event: "Series C",
		date: "2025-09-16",
		source: "https://www.figure.ai/news/series-c",
		keywords: ["figure ai"],
	},
	{
		id: "ssi",
		name: "Safe Superintelligence",
		valuation: 32e9,
		event: "funding round",
		date: "2025-04-12",
		source: "https://techcrunch.com/2025/04/12/openai-co-founder-ilya-sutskevers-safe-superintelligence-reportedly-valued-at-32b/",
		keywords: ["safe superintelligence", "Sutskever"],
	},
	{
		id: "crusoe",
		name: "Crusoe",
		valuation: 30.9e9,
		event: "Series F",
		date: "2026-09-17",
		source: "https://www.crusoe.ai/resources/newsroom/crusoe-announces-series-f-funding",
		keywords: ["Crusoe"],
	},
	{
		id: "vast",
		name: "VAST Data",
		valuation: 30e9,
		event: "Series F",
		date: "2026-04-22",
		source: "https://www.cnbc.com/2026/04/22/nvidia-backs-ai-company-vast-data.html",
		keywords: ["vast data"],
	},
	{
		id: "scale",
		name: "Scale AI",
		valuation: 29e9,
		event: "Meta investment",
		date: "2025-06-12",
		source: "https://scale.com/blog/scale-ai-announces-next-phase-of-company-evolution",
		keywords: ["scale ai"],
	},
	{
		id: "mistral",
		name: "Mistral AI",
		valuation: 24e9,
		event: "Series D",
		date: "2026-09-08",
		source: "https://www.cnbc.com/2026/09/08/mistral-ai-funding-valuation-samsung.html",
		keywords: ["mistral"],
	},
	{
		id: "elevenlabs",
		name: "ElevenLabs",
		valuation: 22e9,
		event: "employee tender",
		date: "2026-09-30",
		source: "https://elevenlabs.io/blog/tender-22bn",
		keywords: ["elevenlabs"],
	},
	{
		id: "perplexity",
		name: "Perplexity",
		valuation: 20e9,
		event: "funding round",
		date: "2025-09-10",
		source: "https://techcrunch.com/2025/09/10/perplexity-reportedly-raised-200m-at-20b-valuation/",
		keywords: ["Perplexity", "Aravind Srinivas"],
	},
	{
		id: "thinking-machines",
		name: "Thinking Machines Lab",
		valuation: 12e9,
		event: "seed round",
		date: "2025-07-15",
		source: "https://techcrunch.com/2025/07/15/mira-muratis-thinking-machines-lab-is-worth-12b-in-seed-round/",
		keywords: ["Thinking Machines", "Mira Murati"],
	},
];

export const COMPANIES: Array<Listed | Private> = [...LISTED, ...PRIVATE];

const WORD = /\w+/g;

// Built once per isolate: keyword to company index.
const EXACT = new Map<string, number>();
const FOLDED = new Map<string, number>();
COMPANIES.forEach((company, i) => {
	for (const keyword of company.keywords) {
		const folded = keyword.toLowerCase();
		(keyword === folded ? FOLDED : EXACT).set(keyword, i);
	}
});

// Looks words and space-separated word pairs up in the keyword tables, which
// is far cheaper in a cold isolate than running a regex per keyword.
export function matchCompanies(text: string): string[]
{
	const found = new Set<number>();
	const look = (term: string) => {
		const i = EXACT.get(term) ?? FOLDED.get(term.toLowerCase());
		if (i !== undefined)
			found.add(i);
	};

	let previous = "";
	let previousEnd = -2;
	for (const word of text.matchAll(WORD)) {
		look(word[0]);
		if (word.index === previousEnd + 1 && text[previousEnd] === " ")
			look(`${previous} ${word[0]}`);
		previous = word[0];
		previousEnd = word.index + word[0].length;
	}
	return [...found].sort((a, b) => a - b).map((i) => COMPANIES[i].id);
}
