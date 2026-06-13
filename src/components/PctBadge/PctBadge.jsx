import { G, YL, OR, R } from '../../theme';
import { realPnl, premTot } from '../../utils/calculations';

export function PctBadge({ p }) {
  if (p.status === 'Open' || !p.premium || parseFloat(p.premium) === 0 || p.phase === 'Stock')
    return <span>—</span>;
  const pct = (realPnl(p) / premTot(p)) * 100;
  const col = pct >= 90 ? G : pct >= 50 ? YL : pct >= 0 ? OR : R;
  return <span style={{ color: col, fontWeight: 600 }}>{pct.toFixed(1)}%</span>;
}
