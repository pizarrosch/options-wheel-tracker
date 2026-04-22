import express from 'express';
import pg from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

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

// ── Tradier proxy (replaces nginx proxy in production)
app.use('/tradier', async (req, res) => {
  try {
    const url = `https://api.tradier.com${req.path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': req.headers['authorization'] || '',
        'Accept': 'application/json',
      }
    });
    const data = await response.json();
    res.json(data);
  } catch(e) {
    console.error('Tradier proxy error:', e.message);
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