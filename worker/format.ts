const MONTHS = [
	"jan", "feb", "mar", "apr", "may", "jun",
	"jul", "aug", "sep", "oct", "nov", "dec",
];

export function escape(text: string): string
{
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function money(value: number): string
{
	if (value >= 1e12)
		return `$${(value / 1e12).toFixed(2)}T`;
	if (value >= 1e11)
		return `$${(value / 1e9).toFixed(0)}B`;
	if (value >= 1e9)
		return `$${(value / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
	return `$${(value / 1e6).toFixed(0)}M`;
}

export function price(value: number): string
{
	return `$${value.toFixed(2)}`;
}

export function change(fraction: number): string
{
	const sign = fraction < 0 ? "-" : "+";
	return `${sign}${Math.abs(fraction * 100).toFixed(2)}%`;
}

export function day(iso: string): string
{
	const [year, month, date] = iso.split("-").map(Number);
	return `${date} ${MONTHS[month - 1]} ${year}`;
}

export function stamp(ms: number): string
{
	const d = new Date(ms);
	const hh = String(d.getUTCHours()).padStart(2, "0");
	const mm = String(d.getUTCMinutes()).padStart(2, "0");
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${hh}:${mm}`;
}
