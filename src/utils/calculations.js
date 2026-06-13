export const MUL = p => p.phase === 'Stock' ? 1 : 100;

export const DTE = exp =>
  exp ? Math.ceil((new Date(exp + 'T12:00:00') - Date.now()) / 86400000) : null;

export const NUM = (n, d = 2) =>
  n == null || n === '' ? '—' : (+n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export const CUR = n => {
  if (n == null || n === '') return '—';
  const v = +n;
  return (v >= 0 ? '+' : '−') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const TODAY = () => new Date().toISOString().split('T')[0];

export const BLANK = {
  ticker: '', phase: 'CSP', strike: '', longStrike: '', expiry: '', premium: '',
  contracts: '1', openDate: TODAY(), closeDate: '', status: 'Open', closePrice: '',
  currentMark: '', delta: '', theta: '', vega: '', notes: '', shares: '', costBasis: '',
};

export const isSpread = p => p.phase === 'Put Spread' || p.phase === 'Call Spread';

export const premTot = p =>
  (parseFloat(p.premium) || 0) * (parseInt(p.contracts) || 1) * MUL(p);

export const spreadMaxRisk = p => {
  const width = Math.abs((parseFloat(p.strike) || 0) - (parseFloat(p.longStrike) || 0));
  return (width - (parseFloat(p.premium) || 0)) * (parseInt(p.contracts) || 1) * 100;
};

export const capRisk = p => {
  if (p.status !== 'Open') return 0;
  if (p.phase === 'CSP') return (parseFloat(p.strike) || 0) * (parseInt(p.contracts) || 1) * 100;
  if (isSpread(p)) return spreadMaxRisk(p);
  if (p.phase === 'Stock') return (parseFloat(p.costBasis) || 0) * (parseInt(p.shares) || 0);
  return 0;
};

export const capAtOpen = p => {
  if (p.phase === 'CSP' || p.phase === 'CC')
    return (parseFloat(p.strike) || 0) * (parseInt(p.contracts) || 1) * 100;
  if (isSpread(p)) return spreadMaxRisk(p);
  if (p.phase === 'Stock') return (parseFloat(p.costBasis) || 0) * (parseInt(p.shares) || 0);
  return 0;
};

export const realPnl = p => {
  if (p.status === 'Open') return 0;
  if (p.phase === 'Stock')
    return ((parseFloat(p.closePrice) || 0) - (parseFloat(p.costBasis) || 0)) * (parseInt(p.shares) || 0);
  const cp = p.closePrice !== '' && p.closePrice != null ? parseFloat(p.closePrice) : null;
  return cp === null
    ? premTot(p)
    : ((parseFloat(p.premium) || 0) - cp) * (parseInt(p.contracts) || 1) * 100;
};

export const unrlPnl = p => {
  if (p.status !== 'Open') return 0;
  if (p.phase === 'Stock')
    return ((parseFloat(p.currentMark) || 0) - (parseFloat(p.costBasis) || 0)) * (parseInt(p.shares) || 0);
  if (p.currentMark === '' || p.currentMark == null) return 0;
  return ((parseFloat(p.premium) || 0) - parseFloat(p.currentMark)) * (parseInt(p.contracts) || 1) * 100;
};

export const rorPct = p => {
  const cap = capAtOpen(p);
  if (!cap) return null;
  const pnl = p.status === 'Open' ? unrlPnl(p) : realPnl(p);
  return (pnl / cap) * 100;
};

export const daysHeld = p => {
  if (!p.openDate) return null;
  const end = p.closeDate ? new Date(p.closeDate) : new Date();
  return Math.floor((end - new Date(p.openDate)) / 86400000);
};
