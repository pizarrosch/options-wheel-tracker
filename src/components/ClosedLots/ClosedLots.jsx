import { M, G, R, T } from '../../theme';
import { NUM, CUR } from '../../utils/calculations';
import styles from './ClosedLots.module.css';

const COLS = ['Ticker', 'Shares', 'Closed', 'Held', 'Basis → Exit', 'Stock P&L', 'Premium', 'Cycle P&L', 'Return'];

const Cycle = ({ lot }) => (
  <span
    style={{ color: lot.total >= 0 ? G : R, fontWeight: 700 }}
    title={`${CUR(lot.stockPnl)} on the shares + ${CUR(lot.premium)} in credits earned on this lot`}
  >
    {CUR(lot.total)}
  </span>
);

export function ClosedLots({ lots, isMobile }) {
  if (!lots.length) return null;

  const total  = lots.reduce((s, l) => s + l.total, 0);
  const shares = lots.reduce((s, l) => s + l.shares, 0);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.sectionLabel}>Closed Lots</div>
        <div className={styles.summary}>
          <span style={{ color: M }}>
            {lots.length} cycle{lots.length !== 1 ? 's' : ''} · {NUM(shares, 0)} sh
          </span>
          <span style={{ color: total >= 0 ? G : R, fontFamily: 'monospace', fontWeight: 700 }}>{CUR(total)}</span>
        </div>
      </div>

      {isMobile ? (
        <div className={styles.cardList}>
          {lots.map((l, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.ticker}>{l.ticker}</span>
                <span className={styles.mono} style={{ color: M }}>{NUM(l.shares, 0)} sh</span>
                <span className={styles.mono}><Cycle lot={l} /></span>
              </div>
              <div className={styles.cardGrid}>
                <div><div className={styles.fieldLabel}>Basis → Exit</div><div className={styles.mono}>${NUM(l.basis)} → ${NUM(l.exit)}</div></div>
                <div><div className={styles.fieldLabel}>Closed</div><div className={styles.mono} style={{ color: M }}>{l.date || '—'}</div></div>
                <div><div className={styles.fieldLabel}>Stock P&L</div><div className={styles.mono} style={{ color: l.stockPnl >= 0 ? G : R }}>{CUR(l.stockPnl)}</div></div>
                <div><div className={styles.fieldLabel}>Premium</div><div className={styles.mono} style={{ color: G }}>{CUR(l.premium)}</div></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>{COLS.map(h => <th key={h} className={styles.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {lots.map((l, i) => (
                <tr key={i} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: 700 }}>{l.ticker}</td>
                  <td className={`${styles.td} ${styles.mono}`}>{NUM(l.shares, 0)}</td>
                  <td className={styles.td} style={{ color: M }}>{l.date || '—'}</td>
                  <td className={`${styles.td} ${styles.mono}`} style={{ color: M }}>{l.days == null ? '—' : l.days + 'd'}</td>
                  <td className={`${styles.td} ${styles.mono}`}>
                    ${NUM(l.basis)} <span style={{ color: M }}>→</span> <span style={{ color: T }}>${NUM(l.exit)}</span>
                  </td>
                  <td className={`${styles.td} ${styles.mono}`} style={{ color: l.stockPnl >= 0 ? G : R, fontWeight: 600 }}>{CUR(l.stockPnl)}</td>
                  <td className={`${styles.td} ${styles.mono}`} style={{ color: l.premium >= 0 ? G : R }}>{CUR(l.premium)}</td>
                  <td className={`${styles.td} ${styles.mono}`}><Cycle lot={l} /></td>
                  <td className={`${styles.td} ${styles.mono}`} style={{ color: (l.pctReturn ?? 0) >= 0 ? G : R }}>
                    {l.pctReturn == null ? '—' : (l.pctReturn >= 0 ? '+' : '') + NUM(l.pctReturn, 1) + '%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
