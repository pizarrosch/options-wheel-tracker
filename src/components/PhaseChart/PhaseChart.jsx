import { PC, TC } from '../../theme';
import { NUM } from '../../utils/calculations';
import styles from './PhaseChart.module.css';

export function PhaseChart({ phaseMix }) {
  if (!phaseMix.length) {
    return <div className={styles.empty}>No open positions</div>;
  }
  return (
    <div className={styles.card}>
      <div className={styles.label}>Open Premium by Phase</div>
      {phaseMix.map((x, i) => (
        <div key={x.name} className={styles.row}>
          <span className={styles.rowLabel}>
            <span className={styles.dot} style={{ background: PC[x.name] || TC[i] }} />
            {x.name}
            <span className={styles.count}>×{x.count}</span>
          </span>
          <span className={styles.rowValue}>${NUM(x.premium)}</span>
        </div>
      ))}
    </div>
  );
}
