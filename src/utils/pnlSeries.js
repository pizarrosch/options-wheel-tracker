import { realPnl } from './calculations';
import { buildHoldings } from './holdings';

// Realized P&L per date: option premium off the rows themselves, stock legs off
// the assignment ledger. Stock rows are excluded here — the ledger books them.
function realizedByDate(positions, start) {
  const byDate = {};
  const add = (date, pnl) => { if (date && new Date(date) >= start) byDate[date] = (byDate[date] || 0) + pnl; };
  positions
    .filter(p => p.status !== 'Open' && p.phase !== 'Stock' && p.closeDate)
    .forEach(p => add(p.closeDate, realPnl(p)));
  buildHoldings(positions).realizedEvents.forEach(e => add(e.date, e.pnl));
  return byDate;
}

export function realizedTrades(positions, start) {
  return positions.filter(
    p => p.status !== 'Open' && p.phase !== 'Stock' && p.closeDate && new Date(p.closeDate) >= start
  );
}

export const RANGES = ['1D', '1W', 'MTD', '3M', '6M', 'YTD', '1Y', 'All'];

export function rangeStart(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case '1D':  return new Date(now - 86400000);
    case '1W':  return new Date(now - 7 * 86400000);
    case 'MTD': return new Date(y, m, 1);
    case '3M':  return new Date(y, m - 3, 1);
    case '6M':  return new Date(y, m - 6, 1);
    case 'YTD': return new Date(y, 0, 1);
    case '1Y':  return new Date(y - 1, m, now.getDate());
    default:    return new Date('2000-01-01');
  }
}

export function buildPnlSeries(positions, range) {
  const byDate = realizedByDate(positions, rangeStart(range));
  if (!Object.keys(byDate).length) return [];
  let cum = 0;
  return Object.keys(byDate)
    .sort()
    .map(date => { cum += byDate[date]; return { date, cumulative: parseFloat(cum.toFixed(2)) }; });
}

export function buildBarSeries(positions, range) {
  const byDate = realizedByDate(positions, rangeStart(range));
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }));
}

export function buildMonthlySeries(positions) {
  const byDate = realizedByDate(positions, new Date('2000-01-01'));
  const trades = realizedTrades(positions, new Date('2000-01-01'));
  const byMonth = {};
  const bucket = key => (byMonth[key] ||= { pnl: 0, trades: 0 });
  Object.entries(byDate).forEach(([date, pnl]) => { bucket(date.slice(0, 7)).pnl += pnl; });
  trades.forEach(p => { bucket(p.closeDate.slice(0, 7)).trades += 1; });
  return Object.keys(byMonth)
    .sort()
    .map(key => ({
      key,
      label: new Date(key + '-15').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      pnl: parseFloat(byMonth[key].pnl.toFixed(2)),
      trades: byMonth[key].trades,
    }));
}
