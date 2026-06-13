export const B  = '#0d1117';
export const C  = '#161b22';
export const D  = '#30363d';
export const T  = '#e6edf3';
export const M  = '#8b949e';
export const G  = '#3fb950';
export const R  = '#f85149';
export const BL = '#58a6ff';
export const PU = '#bc8cff';
export const YL = '#e3b341';
export const OR = '#ffa657';

export const PC = { CSP: BL, CC: PU, Stock: G, 'Put Spread': YL, 'Call Spread': OR };
export const TC = [BL, PU, G, YL, OR, '#38d9a9', '#f778ba', '#79c0ff'];
export const SC = { Open: G, Expired: M, Assigned: YL, Closed: BL };

export const inputStyle = {
  background: B,
  border: `1px solid ${D}`,
  borderRadius: 6,
  padding: '8px 10px',
  color: T,
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

export const labelStyle = {
  fontSize: 11,
  color: M,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginBottom: 4,
  display: 'block',
};

export const btnStyle = (bg, cl = '#fff') => ({
  background: bg,
  border: 'none',
  color: cl,
  padding: '8px 18px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
});

export const cardStyle = {
  background: C,
  border: `1px solid ${D}`,
  borderRadius: 8,
  padding: '14px 16px',
};

export const tooltipStyle = {
  background: C,
  border: `1px solid ${D}`,
  color: T,
  fontSize: 12,
  borderRadius: 6,
};
