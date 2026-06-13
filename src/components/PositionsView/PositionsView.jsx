import { M, G, R, BL, PC, SC, inputStyle } from '../../theme';
import { DTE, CUR, NUM, isSpread, unrlPnl, realPnl, daysHeld } from '../../utils/calculations';
import { RorBadge } from '../RorBadge/RorBadge';
import { PctBadge } from '../PctBadge/PctBadge';
import { PositionCard } from '../PositionCard/PositionCard';
import styles from './PositionsView.module.css';

const TABLE_COLS = [
  ['Ticker',      'ticker'],
  ['Phase',       'phase'],
  ['Strike',      'strike'],
  ['Expiry',      'expiry'],
  ['DTE',         'dte'],
  ['Days Held',   'daysHeld'],
  ['Premium/ct',  'premium'],
  ['Mark',        null],
  ['Contracts',   'contracts'],
  ['P&L',         'pnl'],
  ['RoR',         'ror'],
  ['% Captured',  null],
  ['Status',      'status'],
  ['Actions',     null],
];

export function PositionsView({ filtered, filter, setFilter, sort, setSort, expMonthOptions, isMobile, onEdit, onDelete }) {
  return (
    <div className={styles.root}>
      <div className={styles.filters}>
        <input
          placeholder="Search ticker…"
          value={filter.ticker}
          onChange={e => setFilter(f => ({ ...f, ticker: e.target.value }))}
          style={{ ...inputStyle, width: 130 }}
        />
        <select
          value={filter.phase}
          onChange={e => setFilter(f => ({ ...f, phase: e.target.value }))}
          style={{ ...inputStyle, width: 130, cursor: 'pointer' }}
        >
          <option value="">All Phases</option>
          {['CSP', 'CC', 'Stock', 'Put Spread', 'Call Spread'].map(o => <option key={o}>{o}</option>)}
        </select>
        <select
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          style={{ ...inputStyle, width: 120, cursor: 'pointer' }}
        >
          <option value="">All Status</option>
          {['Open', 'Expired', 'Assigned', 'Closed'].map(o => <option key={o}>{o}</option>)}
        </select>
        <select
          value={filter.expMonth}
          onChange={e => setFilter(f => ({ ...f, expMonth: e.target.value }))}
          style={{ ...inputStyle, width: 120, cursor: 'pointer' }}
        >
          <option value="">All Months</option>
          {expMonthOptions.map(m => <option key={m}>{m}</option>)}
        </select>
        {isMobile && (
          <select
            value={`${sort.field}:${sort.dir}`}
            onChange={e => { const [field, dir] = e.target.value.split(':'); setSort({ field, dir }); }}
            style={{ ...inputStyle, width: 150, cursor: 'pointer' }}
          >
            <option value="ticker:asc">Ticker A→Z</option>
            <option value="ticker:desc">Ticker Z→A</option>
            <option value="expiry:asc">Expiry ↑</option>
            <option value="expiry:desc">Expiry ↓</option>
            <option value="dte:asc">DTE ↑</option>
            <option value="dte:desc">DTE ↓</option>
            <option value="pnl:desc">P&amp;L Best</option>
            <option value="pnl:asc">P&amp;L Worst</option>
            <option value="premium:desc">Premium ↓</option>
            <option value="status:asc">Status</option>
          </select>
        )}
        <span style={{ color: M, fontSize: 12 }}>
          {filtered.length} position{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {isMobile ? (
        <div className={styles.cardList}>
          {filtered.length === 0 && (
            <div className={styles.empty}>No positions. Tap ＋ to add a trade.</div>
          )}
          {filtered.map(pos => (
            <PositionCard key={pos.id} pos={pos} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.thead}>
                {TABLE_COLS.map(([h, field]) => {
                  const active = sort.field === field;
                  return (
                    <th
                      key={h}
                      onClick={field ? () => setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' })) : undefined}
                      className={styles.th}
                      style={{ color: active ? '#e6edf3' : M, cursor: field ? 'pointer' : 'default' }}
                    >
                      {h}
                      {field && (
                        <span style={{ marginLeft: 3, opacity: active ? 1 : 0.3, fontSize: 10 }}>
                          {active && sort.dir === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={14} className={styles.emptyCell}>No positions. Add a trade or import CSV.</td></tr>
              )}
              {filtered.map(pos => {
                const dteVal = pos.phase !== 'Stock' ? DTE(pos.expiry) : null;
                const dteCol = dteVal === null ? M : dteVal <= 0 ? R : dteVal <= 7 ? R : dteVal <= 21 ? '#e3b341' : G;
                const pnl    = pos.status === 'Open' ? unrlPnl(pos) : realPnl(pos);
                const held   = daysHeld(pos);
                return (
                  <tr
                    key={pos.id}
                    className={styles.tr}
                    onMouseEnter={e => e.currentTarget.style.background = '#30363d33'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className={styles.td} style={{ fontWeight: 700 }}>{pos.ticker}</td>
                    <td className={styles.td}>
                      <span className={styles.badge} style={{ background: (PC[pos.phase] || M) + '22', color: PC[pos.phase] || M }}>
                        {pos.phase}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.mono}`}>
                      {pos.strike
                        ? (isSpread(pos) && pos.longStrike ? `$${pos.strike}/$${pos.longStrike}` : '$' + pos.strike)
                        : '—'}
                    </td>
                    <td className={styles.td} style={{ color: M, whiteSpace: 'nowrap' }}>{pos.expiry || '—'}</td>
                    <td className={`${styles.td} ${styles.mono}`} style={{ color: dteCol, fontWeight: 600 }}>
                      {dteVal !== null ? (dteVal <= 0 ? 'EXP' : dteVal + 'd') : '—'}
                    </td>
                    <td className={`${styles.td} ${styles.mono}`} style={{ color: M }}>{held !== null ? held + 'd' : '—'}</td>
                    <td className={`${styles.td} ${styles.mono}`} style={{ color: G }}>{pos.premium ? '+$' + NUM(pos.premium) : '—'}</td>
                    <td className={`${styles.td} ${styles.mono}`} style={{ color: M }}>{pos.currentMark ? '$' + NUM(pos.currentMark) : '—'}</td>
                    <td className={`${styles.td} ${styles.mono}`}>{pos.contracts}</td>
                    <td className={`${styles.td} ${styles.mono}`} style={{ color: pnl >= 0 ? G : R, fontWeight: 600 }}>
                      {pnl !== 0 ? CUR(pnl) : '—'}
                    </td>
                    <td className={`${styles.td} ${styles.mono}`}><RorBadge p={pos} /></td>
                    <td className={`${styles.td} ${styles.mono}`}><PctBadge p={pos} /></td>
                    <td className={styles.td}>
                      <span className={styles.badge} style={{ background: (SC[pos.status] || M) + '22', color: SC[pos.status] || M }}>
                        {pos.status}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.rowActions}>
                        <button onClick={() => onEdit(pos)} className={styles.btnEdit} style={{ background: BL + '22', borderColor: BL + '44', color: BL }}>Edit</button>
                        <button onClick={() => onDelete(pos.id)} className={styles.btnDel} style={{ background: R + '11', borderColor: R + '33', color: R }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
