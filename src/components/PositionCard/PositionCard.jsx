import { C, D, M, G, R, BL, YL, PC, SC } from '../../theme';
import { DTE, NUM, CUR, isSpread, unrlPnl, realPnl, daysHeld } from '../../utils/calculations';
import { RorBadge } from '../RorBadge/RorBadge';
import { PctBadge } from '../PctBadge/PctBadge';
import styles from './PositionCard.module.css';

export function PositionCard({ pos, onEdit, onDelete }) {
  const dteVal = pos.phase !== 'Stock' ? DTE(pos.expiry) : null;
  const dteCol = dteVal === null ? M : dteVal <= 7 ? R : dteVal <= 21 ? YL : G;
  const pnl    = pos.status === 'Open' ? unrlPnl(pos) : realPnl(pos);
  const held   = daysHeld(pos);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.badges}>
          <span className={styles.ticker}>{pos.ticker}</span>
          <span className={styles.badge} style={{ background: (PC[pos.phase] || M) + '22', color: PC[pos.phase] || M }}>
            {pos.phase}
          </span>
          <span className={styles.badge} style={{ background: (SC[pos.status] || M) + '22', color: SC[pos.status] || M }}>
            {pos.status}
          </span>
        </div>
        <div className={styles.actions}>
          <button
            onClick={() => onEdit(pos)}
            className={styles.btnEdit}
            style={{ background: BL + '22', borderColor: BL + '44', color: BL }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(pos.id)}
            className={styles.btnDel}
            style={{ background: R + '11', borderColor: R + '33', color: R }}
          >
            Del
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {pos.strike && (
          <div>
            <div className={styles.fieldLabel}>{isSpread(pos) ? 'Short/Long' : 'Strike'}</div>
            <div className={styles.mono}>
              {isSpread(pos) && pos.longStrike ? `$${pos.strike}/$${pos.longStrike}` : '$' + pos.strike}
            </div>
          </div>
        )}
        {pos.expiry && (
          <div>
            <div className={styles.fieldLabel}>Expiry</div>
            <div style={{ color: M, fontSize: 12 }}>{pos.expiry}</div>
          </div>
        )}
        {dteVal !== null && (
          <div>
            <div className={styles.fieldLabel}>DTE</div>
            <div className={styles.mono} style={{ color: dteCol, fontWeight: 600 }}>
              {dteVal <= 0 ? 'EXP' : dteVal + 'd'}
            </div>
          </div>
        )}
        {pos.premium && (
          <div>
            <div className={styles.fieldLabel}>Premium</div>
            <div className={styles.mono} style={{ color: G }}>+${NUM(pos.premium)}</div>
          </div>
        )}
        {pos.contracts && (
          <div>
            <div className={styles.fieldLabel}>Contracts</div>
            <div className={styles.mono}>{pos.contracts}</div>
          </div>
        )}
        {pos.currentMark && (
          <div>
            <div className={styles.fieldLabel}>Mark</div>
            <div className={styles.mono} style={{ color: M }}>${NUM(pos.currentMark)}</div>
          </div>
        )}
        {held !== null && (
          <div>
            <div className={styles.fieldLabel}>Days Held</div>
            <div className={styles.mono} style={{ color: M }}>{held}d</div>
          </div>
        )}
        <div>
          <div className={styles.fieldLabel}>P&L</div>
          <div className={styles.mono} style={{ color: pnl >= 0 ? G : R, fontWeight: 600 }}>
            {pnl !== 0 ? CUR(pnl) : '—'}
          </div>
        </div>
        <div>
          <div className={styles.fieldLabel}>RoR</div>
          <RorBadge p={pos} />
        </div>
        <div>
          <div className={styles.fieldLabel}>% Captured</div>
          <PctBadge p={pos} />
        </div>
      </div>
    </div>
  );
}
