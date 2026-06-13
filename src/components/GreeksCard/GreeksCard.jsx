import { G, R } from '../../theme';
import { NUM } from '../../utils/calculations';
import styles from './GreeksCard.module.css';

export function GreeksCard({ delta, theta, vega }) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>Portfolio Greeks</div>
      <Row label="Net Delta (Δ)" val={delta} />
      <Row label="Net Theta/day (Θ)" val={theta} color={theta > 0 ? G : R} />
      <Row label="Net Vega (ν)" val={vega} />
    </div>
  );
}

function Row({ label, val, color }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue} style={color ? { color } : undefined}>{NUM(val)}</span>
    </div>
  );
}
