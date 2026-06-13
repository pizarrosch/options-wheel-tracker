import { BL, G, D, M, R, inputStyle, btnStyle } from '../../theme';
import { Modal } from '../Modal/Modal';
import styles from './ImportModal.module.css';

export function ImportModal({ csvText, setCsvText, csvErr, onImport, onClose, isMobile }) {
  return (
    <Modal title="Import CSV" onClose={onClose} isMobile={isMobile}>
      <div className={styles.hint}>
        Headers:{' '}
        <code className={styles.code} style={{ color: BL }}>
          ticker, phase, strike, longStrike, expiry, premium, contracts, openDate, status, delta, theta, vega, notes, shares, costBasis
        </code>
      </div>
      <textarea
        value={csvText}
        onChange={e => setCsvText(e.target.value)}
        rows={7}
        placeholder={"ticker,phase,strike,expiry,premium,contracts\nAAPL,CSP,170,2025-05-16,1.50,2"}
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
      />
      {csvErr && <div className={styles.error} style={{ color: R }}>{csvErr}</div>}
      <div className={styles.footer}>
        <button onClick={onClose} className={styles.cancelBtn} style={{ borderColor: D, color: M }}>Cancel</button>
        <button onClick={onImport} style={btnStyle(G, '#000')}>Import</button>
      </div>
    </Modal>
  );
}
