import { MUL, realPnl } from './calculations';

// Futures options settle in cash for our purposes — they never deliver shares.
export const isFutures = t => (t || '').startsWith('/');

// Shares an option contract delivers on assignment.
export const contractShares = p => (parseInt(p.contracts) || 1) * MUL(p);

// Best-effort date an event actually happened.
const eventDate = p => p.closeDate || p.expiry || p.openDate || '';

// Shares an assigned option row moves: CSP delivers them, CC takes them away.
export function assignmentDelta(p) {
  if (p.status !== 'Assigned' || isFutures(p.ticker)) return null;
  if (p.phase !== 'CSP' && p.phase !== 'CC') return null;
  const shares = contractShares(p);
  const price  = parseFloat(p.strike) || 0;
  if (!shares) return null;
  return { shares, price, dir: p.phase === 'CSP' ? 1 : -1 };
}

function collectEvents(positions) {
  const events = [];
  positions.forEach(p => {
    if (isFutures(p.ticker) || !p.ticker) return;

    if (p.phase === 'Stock') {
      const shares = parseInt(p.shares) || 0;
      if (!shares) return;
      events.push({
        type: 'buy', ticker: p.ticker, date: p.openDate || '', shares,
        price: parseFloat(p.costBasis) || 0, id: p.id, source: 'Purchase',
      });
      if (p.status !== 'Open') {
        events.push({
          type: 'sell', ticker: p.ticker, date: eventDate(p), shares,
          price: parseFloat(p.closePrice) || 0, id: p.id, source: 'Sale',
        });
      }
      return;
    }

    // A realized covered call credits whichever lot was open when it settled.
    if (p.phase === 'CC' && p.status !== 'Open') {
      events.push({
        type: 'credit', ticker: p.ticker, date: eventDate(p),
        amount: realPnl(p), id: p.id, source: 'Covered call',
      });
    }

    const d = assignmentDelta(p);
    if (!d) return;
    events.push({
      type: d.dir > 0 ? 'buy' : 'sell', ticker: p.ticker, date: eventDate(p),
      shares: d.shares, price: d.price, id: p.id,
      // The assigning put's collateral converted into these shares, so its
      // credit belongs to the lot.
      credit: d.dir > 0 ? realPnl(p) : 0,
      source: d.dir > 0 ? 'Put assignment' : 'Called away',
    });
  });
  // Undated rows sort last so they can't consume shares they never had. On a
  // shared date shares arrive, then credits land, then shares leave — so a call
  // that is assigned credits its own cycle before closing it.
  const ORDER = { buy: 0, credit: 1, sell: 2 };
  return events.sort(
    (a, b) => (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99') || ORDER[a.type] - ORDER[b.type]
  );
}

/**
 * Folds assignment + stock events into a per-ticker share ledger.
 *
 * Basis is raw (strike paid), never premium-adjusted: option premium is its own
 * realized stream, so baking it into basis would double-count it in overall P&L.
 * `adjBasis` is the display-only wheel breakeven — basis less every premium
 * realized on the ticker since the current lot was opened.
 */
export function buildHoldings(positions, quotes = {}) {
  const events = collectEvents(positions);
  const book = {};
  const realizedEvents = [];
  const closedLots = [];

  const get = t => (book[t] ||= {
    ticker: t, shares: 0, cost: 0, realizedPnl: 0, premium: 0,
    acquired: null, lots: [], warnings: [],
  });

  events.forEach(e => {
    const h = get(e.ticker);
    if (e.type === 'buy') {
      if (h.shares === 0) { h.acquired = e.date; h.lots = []; h.premium = 0; }
      h.premium += e.credit || 0;
      h.shares += e.shares;
      h.cost   += e.shares * e.price;
      h.lots.push(e);
      return;
    }
    if (e.type === 'credit') {
      // Credits only belong to a lot that was actually open to write against.
      if (h.shares > 0) h.premium += e.amount;
      return;
    }

    const sold = Math.min(e.shares, h.shares);
    if (sold < e.shares) {
      h.warnings.push(`${e.source} of ${e.shares} sh on ${e.date || 'unknown date'} exceeds the ${h.shares} sh on record`);
    }
    if (!sold) return;
    const basis = h.cost / h.shares;
    const pnl   = (e.price - basis) * sold;
    // Credits leave with the shares they were earned on, so a partial exit
    // can't spend the whole lot's premium and neither can what remains.
    const premiumOut = h.premium * (sold / h.shares);
    h.realizedPnl += pnl;
    closedLots.push({
      ticker: e.ticker, shares: sold, acquired: h.acquired, date: e.date,
      basis, exit: e.price, stockPnl: pnl, premium: premiumOut,
      total: pnl + premiumOut, source: e.source,
      days: h.acquired && e.date ? Math.round((new Date(e.date) - new Date(h.acquired)) / 86400000) : null,
      pctReturn: basis * sold ? ((pnl + premiumOut) / (basis * sold)) * 100 : null,
    });
    realizedEvents.push({ date: e.date, ticker: e.ticker, pnl, source: e.source, shares: sold });
    h.cost    -= basis * sold;
    h.premium -= premiumOut;
    h.shares  -= sold;
    if (h.shares === 0) { h.cost = 0; h.acquired = null; h.premium = 0; }
  });

  const rows = Object.values(book)
    .filter(h => h.shares > 0)
    .map(h => {
      const avgBasis = h.cost / h.shares;
      const adjBasis = avgBasis - h.premium / h.shares;
      const last     = parseFloat(quotes[h.ticker]);
      const hasLast  = Number.isFinite(last);
      return {
        ...h,
        avgBasis,
        adjBasis,
        last:       hasLast ? last : null,
        value:      hasLast ? last * h.shares : null,
        // vs raw basis — the only one that may be summed with realized premium.
        unrealized: hasLast ? (last - avgBasis) * h.shares : null,
        // vs adjusted basis: the lot all-in, credits included. Display only —
        // those credits are already booked as realized premium, so adding this
        // to premium would count them twice.
        unrealizedAdj: hasLast ? (last - adjBasis) * h.shares : null,
        pctVsBasis: hasLast && avgBasis ? ((last - avgBasis) / avgBasis) * 100 : null,
      };
    })
    .sort((a, b) => b.cost - a.cost);

  const totals = {
    shares:     rows.reduce((s, r) => s + r.shares, 0),
    cost:       rows.reduce((s, r) => s + r.cost, 0),
    value:      rows.reduce((s, r) => s + (r.value ?? r.cost), 0),
    unrealized:    rows.reduce((s, r) => s + (r.unrealized ?? 0), 0),
    unrealizedAdj: rows.reduce((s, r) => s + (r.unrealizedAdj ?? 0), 0),
    realizedPnl: Object.values(book).reduce((s, h) => s + h.realizedPnl, 0),
  };

  const warnings = Object.values(book).flatMap(h => h.warnings.map(w => `${h.ticker}: ${w}`));

  closedLots.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return { rows, byTicker: book, totals, closedLots, realizedEvents, warnings };
}
