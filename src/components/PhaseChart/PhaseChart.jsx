import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { C, D, T, M, PC, TC, tooltipStyle } from '../../theme';
import styles from './PhaseChart.module.css';

export function PhaseChart({ phaseMix }) {
  if (!phaseMix.length) {
    return <div className={styles.empty}>No open positions</div>;
  }
  return (
    <div className={styles.card}>
      <div className={styles.label}>Phase Mix</div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={phaseMix}
            cx="50%"
            cy="50%"
            innerRadius={44}
            outerRadius={68}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
            labelLine={false}
          >
            {phaseMix.map((e, i) => <Cell key={e.name} fill={PC[e.name] || TC[i]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
