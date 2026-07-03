import express from 'express';
import pg from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import yahooFinance from 'yahoo-finance2';

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
    // Yahoo expects a Date for the specific expiry
    const expiryDate = new Date(expiration + 'T00:00:00Z');
    const chain = await yahooFinance.options(symbol, { date: expiryDate }, { validateResult: false });
    const calls = (chain.options?.[0]?.calls ?? []).map(o => ({
      option_type: 'call',
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
    }));
    const puts = (chain.options?.[0]?.puts ?? []).map(o => ({
      option_type: 'put',
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
    }));
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