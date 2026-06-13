import { BL, G, M, D } from '../../theme';
import styles from './Sidebar.module.css';

export function Sidebar({ view, setView, views, openCount, closedCount, onAddTrade, onImport, onRefresh, refreshing, refreshLog, refreshErr, lastRefresh }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandName}>🎡 Wheel Tracker</div>
        <div className={styles.brandSub}>{openCount} open · {closedCount} closed</div>
      </div>

      {views.map(v => (
        <button
          key={v.id}
          onClick={() => setView(v.id)}
          className={styles.navBtn}
          style={{
            background: view === v.id ? D : 'transparent',
            color:      view === v.id ? '#e6edf3' : M,
          }}
        >
          <span>{v.icon}</span>{v.label}
        </button>
      ))}

      <div className={styles.divider} />

      <button onClick={onAddTrade} className={styles.addBtn} style={{ background: BL + '22', borderColor: BL + '44', color: BL }}>
        ＋ Add Trade
      </button>
      <button onClick={onImport} className={styles.importBtn} style={{ borderColor: D, color: M }}>
        ⬆ Import CSV
      </button>

      <div className={styles.divider} />

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className={styles.refreshBtn}
        style={{
          background:  refreshing ? D : G + '22',
          borderColor: G + '44',
          color:       refreshing ? M : G,
          cursor:      refreshing ? 'wait' : 'pointer',
          opacity:     refreshing ? 0.7 : 1,
        }}
      >
        {refreshing ? '⏳' : '⚡'} {refreshing ? 'Refreshing…' : 'Refresh Data'}
      </button>

      {refreshLog && !refreshErr && (
        <div className={styles.logMsg} style={{ color: refreshLog.includes('✓') ? G : M }}>{refreshLog}</div>
      )}
      {refreshErr && <div className={styles.logMsg} style={{ color: '#f85149' }}>{refreshErr}</div>}
      {lastRefresh && !refreshing && (
        <div className={styles.logMsg} style={{ color: M }}>Updated {lastRefresh}</div>
      )}
    </aside>
  );
}
