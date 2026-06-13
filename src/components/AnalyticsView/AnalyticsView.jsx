import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Cell,
} from 'recharts';
import { G, R, M, D, tooltipStyle } from '../../theme';
import { CUR, NUM, realPnl } from '../../utils/calculations';
import { RANGES, rangeStart, buildPnlSeries, buildBarSeries, buildMonthlySeries } from '../../utils/pnlSeries';
import { StatCard } from '../StatCard/StatCard';
import styles from './AnalyticsView.module.css';

const fmtDate = d => { const dt = new Date(d); return `${dt.getMonth() + 1}/${dt.getDate()}`; };
const fmtFull = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function AnalyticsView({ positions, isMobile }) {
  const [range, setRange] = useState('MTD');

  const series        = useMemo(() => buildPnlSeries(positions, range), [positions, range]);
  const barSeries     = useMemo(() => buildBarSeries(positions, range), [positions, range]);
  const monthlySeries = useMemo(() => buildMonthlySeries(positions), [positions]);

  const start    = rangeStart(range);
  const closed   = positions.filter(p => p.status !== 'Open' && p.closeDate && new Date(p.closeDate) >= start);
  const totPnl   = closed.reduce((s, p) => s + realPnl(p), 0);
  const wins     = closed.filter(p => realPnl(p) > 0).length;
  const winRate  = closed.length ? (wins / closed.length) * 100 : 0;
  const bestDay  = barSeries.length ? Math.max(...barSeries.map(d => d.pnl)) : 0;
  const worstDay = barSeries.length ? Math.min(...barSeries.map(d => d.pnl)) : 0;
  const finalCum = series.length ? series[series.length - 1].cumulative : 0;
  const isPos    = finalCum >= 0;

  const chartHeight = isMobile ? 160 : 220;
  const barHeight   = isMobile ? 140 : 180;
  const chartMargin = { left: isMobile ? 0 : 10, right: 8, top: 4, bottom: 4 };
  const yWidth      = isMobile ? 45 : 55;

  return (
    <div className={styles.root}>
      <div className={styles.rangePicker}>
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={styles.rangeBtn}
            style={{
              borderColor:  range === r ? '#58a6ff' : '#30363d',
              background:   range === r ? '#58a6ff22' : 'transparent',
              color:        range === r ? '#58a6ff' : M,
              fontWeight:   range === r ? 700 : 400,
            }}
          >
            {r}
          </button>
        ))}
      </div>

      <div className={`${styles.statGrid} ${isMobile ? styles.statGridMobile : styles.statGridDesktop}`}>
        <StatCard label={`P&L (${range})`} val={CUR(totPnl)} color={totPnl >= 0 ? G : R} />
        <StatCard label="Win Rate" val={NUM(winRate, 1) + '%'} color={winRate >= 70 ? G : winRate >= 50 ? '#e3b341' : R} sub={`${wins}/${closed.length} trades`} />
        <StatCard label="Best Day" val={CUR(bestDay)} color={G} />
        <StatCard label="Worst Day" val={CUR(worstDay)} color={R} />
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartLabel}>Cumulative P&L — {range}</div>
          <div className={styles.chartTotal} style={{ color: isPos ? G : R }}>{CUR(finalCum)}</div>
        </div>
        {series.length === 0 ? (
          <div className={styles.empty} style={{ height: 180 }}>No closed positions in this period.</div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={series} margin={chartMargin}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPos ? G : R} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={isPos ? G : R} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={D} />
              <XAxis dataKey="date" tick={{ fill: M, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtDate} />
              <YAxis tick={{ fill: M, fontSize: 10 }} axisLine={false} tickLine={false} width={yWidth} tickFormatter={v => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [CUR(v), n === 'cumulative' ? 'Cumulative' : 'Daily']} labelFormatter={fmtFull} />
              <ReferenceLine y={0} stroke={D} strokeWidth={1.5} />
              <Area type="monotone" dataKey="cumulative" stroke={isPos ? G : R} strokeWidth={2.5} fill="url(#pnlGrad)" dot={{ fill: isPos ? G : R, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartLabel}>Daily P&L — {range}</div>
        {barSeries.length === 0 ? (
          <div className={styles.empty} style={{ height: 140 }}>No closed positions in this period.</div>
        ) : (
          <ResponsiveContainer width="100%" height={barHeight}>
            <BarChart data={barSeries} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={D} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: M, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtDate} />
              <YAxis tick={{ fill: M, fontSize: 10 }} axisLine={false} tickLine={false} width={yWidth} tickFormatter={v => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [CUR(v), 'P&L']} labelFormatter={fmtFull} />
              <ReferenceLine y={0} stroke={D} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {barSeries.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? G : R} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartLabel}>Monthly Income — All Time</div>
        {monthlySeries.length === 0 ? (
          <div className={styles.empty} style={{ height: 140 }}>No closed positions yet.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart data={monthlySeries} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke={D} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: M, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: M, fontSize: 10 }} axisLine={false} tickLine={false} width={yWidth} tickFormatter={v => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [CUR(v), 'P&L']} labelFormatter={l => l} />
                <ReferenceLine y={0} stroke={D} />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {monthlySeries.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? G : R} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className={styles.monthlyTable}>
              <div className={styles.monthlyHeader}>
                <span>Month</span>
                <span className={styles.right}>Trades</span>
                <span className={styles.right}>P&L</span>
              </div>
              {[...monthlySeries].reverse().map(row => (
                <>
                  <span key={row.key + 'l'} className={styles.monthlyCell}>{row.label}</span>
                  <span key={row.key + 't'} className={`${styles.monthlyCell} ${styles.mono} ${styles.right}`} style={{ color: M }}>{row.trades}</span>
                  <span key={row.key + 'p'} className={`${styles.monthlyCell} ${styles.mono} ${styles.right}`} style={{ color: row.pnl >= 0 ? G : R, fontWeight: 600 }}>{CUR(row.pnl)}</span>
                </>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
