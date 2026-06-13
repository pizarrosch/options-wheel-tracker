import { T, M } from '../../theme';
import styles from './StatCard.module.css';

export function StatCard({ label, val, color, sub }) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value} style={{ color: color || T }}>{val}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  );
}
