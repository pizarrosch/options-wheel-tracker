import { realPnl } from './calculations';

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
  const start = rangeStart(range);
  const closed = positions.filter(
    p => p.status !== 'Open' && p.closeDate && new Date(p.closeDate) >= start
  );
  if (!closed.length) return [];
  const byDate = {};
  closed.forEach(p => { byDate[p.closeDate] = (byDate[p.closeDate] || 0) + realPnl(p); });
  let cum = 0;
  return Object.keys(byDate)
    .sort()
    .map(date => { cum += byDate[date]; return { date, cumulative: parseFloat(cum.toFixed(2)) }; });
}

export function buildBarSeries(positions, range) {
  const start = rangeStart(range);
  const closed = positions.filter(
    p => p.status !== 'Open' && p.closeDate && new Date(p.closeDate) >= start
  );
  const byDate = {};
  closed.forEach(p => { byDate[p.closeDate] = (byDate[p.closeDate] || 0) + realPnl(p); });
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }));
}

export function buildMonthlySeries(positions) {
  const closed = positions.filter(p => p.status !== 'Open' && p.closeDate);
  const byMonth = {};
  closed.forEach(p => {
    const key = p.closeDate.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = { pnl: 0, trades: 0 };
    byMonth[key].pnl += realPnl(p);
    byMonth[key].trades += 1;
  });
  return Object.keys(byMonth)
    .sort()
    .map(key => ({
      key,
      label: new Date(key + '-15').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      pnl: parseFloat(byMonth[key].pnl.toFixed(2)),
      trades: byMonth[key].trades,
    }));
}
