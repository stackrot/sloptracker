CREATE TABLE quotes (
	symbol TEXT PRIMARY KEY,
	price REAL,
	prev_close REAL,
	quoted_at INTEGER,
	shares REAL,
	shares_at INTEGER
);

CREATE TABLE history (
	day TEXT NOT NULL,
	symbol TEXT NOT NULL,
	market_cap REAL NOT NULL,
	PRIMARY KEY (day, symbol)
);

CREATE TABLE news (
	url TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	source TEXT NOT NULL,
	published_at INTEGER NOT NULL,
	companies TEXT NOT NULL
);

CREATE INDEX news_published ON news (published_at DESC);
