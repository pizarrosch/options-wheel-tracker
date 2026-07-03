import express from 'express';
import pg from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

const { Pool } = pg;
const app  = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── DB
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false });

async function initDb() {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS portfolio (
                                                 id          TEXT PRIMARY KEY DEFAULT 'default',
                                                 positions   JSONB NOT NULL DEFAULT '[]'::jsonb,
                                                 updated_at  TIMESTAMPTZ DEFAULT NOW()
            );
        INSERT INTO portfolio (id, positions)
        VALUES ('default', '[]')
            ON CONFLICT (id) DO NOTHING;
    `);
    console.log('DB ready');
  } catch(e) {
    console.error('DB init failed:', e.message);
    console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
    // Don't crash — app still serves frontend, API returns empty data
  }
}

// ── Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Yahoo Finance: stock quotes
app.get('/yf/quotes', async (req, res) => {
  const symbols = String(req.query.symbols || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!symbols.length) return res.status(400).json({ error: 'symbols required' });
  try {
    const results = await Promise.all(
      symbols.map(s => yahooFinance.quote(s, {}, { validateResult: false }).catch(() => null))
    );
    const quotes = results
      .filter(Boolean)
      .map(q => ({ symbol: q.symbol, last: q.regularMarketPrice, bid: q.bid }));
    res.json({ quotes });
  } catch (e) {
    console.error('YF quotes error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Yahoo Finance: options chain with greeks
app.get('/yf/options', async (req, res) => {
  const { symbol, expiration } = req.query;
  if (!symbol || !expiration) return res.status(400).json({ error: 'symbol and expiration required' });
  try {
    // Fetch available expirations first — Yahoo stores them as timestamps,
    // not midnight UTC, so we can't construct the date ourselves.
    const meta = await yahooFinance.options(symbol, {}, { validateResult: false });
    const available = meta.expirationDates ?? [];

    // Match the YYYY-MM-DD string against each expiration Date
    const matchedDate = available.find(
      d => new Date(d).toISOString().slice(0, 10) === expiration
    );

    if (!matchedDate) {
      const avail = available.map(d => new Date(d).toISOString().slice(0, 10)).join(', ');
      console.warn(`${symbol}: no expiration matching ${expiration}. Available: ${avail}`);
      return res.json({ options: [] });
    }

    // Re-fetch only if the matched date isn't already the one Yahoo returned
    const firstAvail = available[0] && new Date(available[0]).toISOString().slice(0, 10);
    const chain = firstAvail === expiration
      ? meta
      : await yahooFinance.options(symbol, { date: matchedDate }, { validateResult: false });

    const mapOption = (o, type) => ({
      option_type: type,
      strike: o.strike,
      bid: o.bid,
      ask: o.ask,
      last: o.lastPrice,
      greeks: {
        delta: o.delta ?? null,
        theta: o.theta ?? null,
        vega: o.vega ?? null,
        gamma: o.gamma ?? null,
        impliedVolatility: o.impliedVolatility ?? null,
      },
    });

    const calls = (chain.options?.[0]?.calls ?? []).map(o => mapOption(o, 'call'));
    const puts  = (chain.options?.[0]?.puts  ?? []).map(o => mapOption(o, 'put'));
    res.json({ options: [...calls, ...puts] });
  } catch (e) {
    console.error('YF options error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── API routes
app.get('/api/positions', async (req, res) => {
  try {
    const result = await pool.query(`SELECT positions FROM portfolio WHERE id = 'default'`);
    res.json({ positions: result.rows[0]?.positions || [] });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/positions', async (req, res) => {
  try {
    const { positions } = req.body;
    await pool.query(
      `INSERT INTO portfolio (id, positions, updated_at)
       VALUES ('default', $1, NOW())
           ON CONFLICT (id) DO UPDATE SET positions = $1, updated_at = NOW()`,
      [JSON.stringify(positions)]
    );
    res.json({ ok: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── Serve React build
app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

// ── Start
initDb().then(() => app.listen(PORT, () => console.log(`Server running on :${PORT}`)));