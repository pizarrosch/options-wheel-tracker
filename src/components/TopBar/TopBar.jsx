import { BL, G, M } from '../../theme';
import styles from './TopBar.module.css';

export function TopBar({ openCount, closedCount, onAddMenu, onRefresh, refreshing }) {
  return (
    <header className={styles.topBar}>
      <div>
        <div className={styles.brandName}>🎡 Wheel Tracker</div>
        <div className={styles.brandSub}>{openCount} open · {closedCount} closed</div>
      </div>
      <div className={styles.actions}>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className={styles.refreshBtn}
          style={{ background: refreshing ? '#30363d' : G + '22', borderColor: G + '44', color: refreshing ? M : G }}
        >
          {refreshing ? '⏳' : '⚡'}
        </button>
        <button
          onClick={onAddMenu}
          className={styles.addBtn}
          style={{ background: BL + '22', borderColor: BL + '44', color: BL }}
        >
          ＋
        </button>
      </div>
    </header>
  );
}
