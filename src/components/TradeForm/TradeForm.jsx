import { BL, M, D, inputStyle, labelStyle, btnStyle } from '../../theme';
import { isSpread } from '../../utils/calculations';
import { Inp, Sel } from '../FormFields/FormFields';
import { Modal } from '../Modal/Modal';
import styles from './TradeForm.module.css';

export function TradeForm({ form, f, editId, isMobile, onSubmit, onClose }) {
  return (
    <Modal title={editId ? 'Edit Trade' : 'Add Trade'} onClose={onClose} isMobile={isMobile}>
      <div className={styles.hint} style={{ borderColor: BL + '33', color: M }}>
        💡 Premium = net credit per contract (×100 auto) · Spreads: enter short strike + long strike · Mark refresh skips spreads (enter manually)
      </div>
      <div className={`${styles.grid} ${isMobile ? styles.gridMobile : styles.gridDesktop}`}>
        <Inp label="Ticker" k="ticker" form={form} f={f} placeholder="AAPL" />
        <Sel label="Phase" k="phase" opts={['CSP', 'CC', 'Stock', 'Put Spread', 'Call Spread']} form={form} f={f} />
        {form.phase !== 'Stock' && (
          <Inp label={isSpread(form) ? 'Short Strike ($)' : 'Strike ($)'} k="strike" type="number" form={form} f={f} />
        )}
        {isSpread(form) && <Inp label="Long Strike ($)" k="longStrike" type="number" form={form} f={f} />}
        {form.phase !== 'Stock' && <Inp label="Expiry" k="expiry" type="date" form={form} f={f} />}
        {form.phase !== 'Stock' && (
          <Inp label={isSpread(form) ? 'Net Credit / contract ($)' : 'Premium / contract ($)'} k="premium" type="number" form={form} f={f} placeholder="1.50" />
        )}
        {form.phase !== 'Stock' && <Inp label="Contracts" k="contracts" type="number" form={form} f={f} />}
        {form.phase === 'Stock' && <Inp label="Shares" k="shares" type="number" form={form} f={f} />}
        {form.phase === 'Stock' && <Inp label="Cost Basis / share ($)" k="costBasis" type="number" form={form} f={f} />}
        <Inp label="Open Date" k="openDate" type="date" form={form} f={f} />
        <Sel label="Status" k="status" opts={['Open', 'Expired', 'Assigned', 'Closed']} form={form} f={f} />
        {form.status !== 'Open' && <Inp label="Close Price ($)" k="closePrice" type="number" form={form} f={f} />}
        {form.status !== 'Open' && <Inp label="Close Date" k="closeDate" type="date" form={form} f={f} />}
        {form.status === 'Open' && (
          <Inp label="Current Mark ($)" k="currentMark" type="number" form={form} f={f} placeholder="auto on refresh" />
        )}
        <Inp label="Delta (Δ)" k="delta" type="number" form={form} f={f} step="0.001" placeholder="0.250" />
        <Inp label="Theta (Θ/day)" k="theta" type="number" form={form} f={f} step="0.001" placeholder="0.080" />
        <Inp label="Vega (ν)" k="vega" type="number" form={form} f={f} step="0.001" placeholder="-0.120" />
        <div className={styles.notesField}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => f('notes', e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>
      </div>
      <div className={styles.footer}>
        <button onClick={onClose} className={styles.cancelBtn} style={{ borderColor: D, color: M }}>Cancel</button>
        <button onClick={onSubmit} style={btnStyle(BL)}>{editId ? 'Update' : 'Add Trade'}</button>
      </div>
    </Modal>
  );
}
