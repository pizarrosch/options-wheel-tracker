import { BL, D, T, M } from '../../theme';
import styles from './ActionSheet.module.css';

export function ActionSheet({ onAddTrade, onImport, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <button onClick={onAddTrade} className={styles.primaryBtn} style={{ background: BL, color: '#fff' }}>
          ＋ Add Trade
        </button>
        <button onClick={onImport} className={styles.secondaryBtn} style={{ borderColor: D, color: T }}>
          ⬆ Import CSV
        </button>
        <button onClick={onClose} className={styles.cancelBtn} style={{ color: M }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
