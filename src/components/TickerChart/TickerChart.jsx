import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { T, M, tooltipStyle, TC } from '../../theme';
import styles from './TickerChart.module.css';

export function TickerChart({ tickerConc }) {
  if (!tickerConc.length) {
    return <div className={styles.empty}>No capital deployed</div>;
  }
  return (
    <div className={styles.card}>
      <div className={styles.label}>Ticker Concentration</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={tickerConc} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            tick={{ fill: M, fontSize: 10 }}
            tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'k'}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="ticker"
            tick={{ fill: T, fontSize: 12, fontWeight: 600 }}
            width={48}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={v => ['$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 }), 'Capital']}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="capital" radius={[0, 4, 4, 0]}>
            {tickerConc.map((_, i) => <Cell key={i} fill={TC[i % TC.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
