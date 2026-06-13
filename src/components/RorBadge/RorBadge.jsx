import { G, YL, OR, R } from '../../theme';
import { rorPct } from '../../utils/calculations';

export function RorBadge({ p }) {
  const r = rorPct(p);
  if (r === null) return <span>—</span>;
  const col = r >= 5 ? G : r >= 2 ? YL : r >= 0 ? OR : R;
  return <span style={{ color: col, fontWeight: 600 }}>{r.toFixed(2)}%</span>;
}
