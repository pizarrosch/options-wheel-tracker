import { M } from '../../theme';
import styles from './Modal.module.css';

export function Modal({ title, onClose, isMobile, children }) {
  return (
    <div className={styles.overlay}>
      <div className={`${styles.panel} ${isMobile ? styles.panelMobile : styles.panelDesktop}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button onClick={onClose} className={styles.closeBtn} style={{ color: M }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
