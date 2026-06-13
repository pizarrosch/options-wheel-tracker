import { inputStyle } from '../../theme';
import styles from './FormFields.module.css';

export function Inp({ label, k, type = 'text', form, f, ...rest }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        type={type}
        value={form[k]}
        onChange={e => f(k, e.target.value)}
        style={inputStyle}
        {...rest}
      />
    </div>
  );
}

export function Sel({ label, k, opts, form, f }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <select
        value={form[k]}
        onChange={e => f(k, e.target.value)}
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
