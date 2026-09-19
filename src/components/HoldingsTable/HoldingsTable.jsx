import { M, G, R, YL, T } from '../../theme';
import { NUM, CUR } from '../../utils/calculations';
import styles from './HoldingsTable.module.css';

const COLS = ['Ticker', 'Shares', 'Avg Basis', 'Adj. Basis', 'Last', 'Market Value', 'Unrealized', 'vs Basis'];

// Basis less the put credit that bought the shares plus every covered call
// realized since — the price the shares must reach for the cycle to be flat.
const AdjBasis = ({ row }) => (
  <span style={{ color: row.premium > 0 ? G : M }} title={`$${NUM(row.premium)} put credit + covered calls since ${row.acquired || 'acquisition'}`}>
    ${NUM(row.adjBasis)}
  </span>
);

export function HoldingsTable({ holdings, isMobile }) {
  const { rows, totals, warnings } = holdings;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.sectionLabel}>Assigned Shares</div>
        {rows.length > 0 && (
          <div className={styles.summary}>
            <span style={{ color: M }}>{NUM(totals.shares, 0)} sh · cost ${NUM(totals.cost)}</span>
            <span style={{ color: totals.unrealized >= 0 ? G : R, fontFamily: 'monospace', fontWeight: 700 }}>
              {CUR(totals.unrealized)}
            </span>
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <div className={styles.warning} style={{ color: YL, borderColor: YL + '44', background: YL + '11' }}>
          {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      {!rows.length ? (
        <div style={{ color: M, fontSize: 13 }}>
          No shares held. Set a cash-secured put to <strong style={{ color: T }}>Assigned</strong> and its shares appear here.
        </div>
      ) : isMobile ? (
        <div className={styles.cardList}>
          {rows.map(r => (
            <div key={r.ticker} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.ticker}>{r.ticker}</span>
                <span className={styles.mono} style={{ color: M }}>{NUM(r.shares, 0)} sh</span>
                <span className={styles.mono} style={{ color: (r.unrealized ?? 0) >= 0 ? G : R, fontWeight: 700 }}>
                  {r.unrealized == null ? '—' : CUR(r.unrealized)}
                </span>
              </div>
              <div className={styles.cardGrid}>
                <div><div className={styles.fieldLabel}>Avg Basis</div><div className={styles.mono}>${NUM(r.avgBasis)}</div></div>
                <div><div className={styles.fieldLabel}>Adj. Basis</div><div className={styles.mono}><AdjBasis row={r} /></div></div>
                <div><div className={styles.fieldLabel}>Last</div><div className={styles.mono}>{r.last == null ? '—' : '$' + NUM(r.last)}</div></div>
                <div><div className={styles.fieldLabel}>Value</div><div className={styles.mono}>{r.value == null ? '—' : '$' + NUM(r.value)}</div></div>
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
              {rows.map(r => (
                <tr key={r.ticker} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: 700 }}>{r.ticker}</td>
                  <td className={`${styles.td} ${styles.mono}`}>{NUM(r.shares, 0)}</td>
                  <td className={`${styles.td} ${styles.mono}`}>${NUM(r.avgBasis)}</td>
                  <td className={`${styles.td} ${styles.mono}`}><AdjBasis row={r} /></td>
                  <td className={`${styles.td} ${styles.mono}`} style={{ color: M }}>{r.last == null ? '—' : '$' + NUM(r.last)}</td>
                  <td className={`${styles.td} ${styles.mono}`}>{r.value == null ? '—' : '$' + NUM(r.value)}</td>
                  <td className={`${styles.td} ${styles.mono}`} style={{ color: (r.unrealized ?? 0) >= 0 ? G : R, fontWeight: 600 }}>
                    {r.unrealized == null ? '—' : CUR(r.unrealized)}
                  </td>
                  <td className={`${styles.td} ${styles.mono}`} style={{ color: (r.pctVsBasis ?? 0) >= 0 ? G : R }}>
                    {r.pctVsBasis == null ? '—' : (r.pctVsBasis >= 0 ? '+' : '') + NUM(r.pctVsBasis, 1) + '%'}
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
