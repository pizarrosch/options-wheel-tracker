import { BL, M } from '../../theme';
import styles from './BottomNav.module.css';

export function BottomNav({ view, setView, views }) {
  return (
    <nav className={styles.nav}>
      {views.map(v => (
        <button
          key={v.id}
          onClick={() => setView(v.id)}
          className={styles.navBtn}
          style={{ color: view === v.id ? BL : M, fontWeight: view === v.id ? 700 : 400 }}
        >
          <span className={styles.icon}>{v.icon}</span>
          {v.label}
        </button>
      ))}
    </nav>
  );
}
