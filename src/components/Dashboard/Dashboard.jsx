import { B, D, M, G, R, BL, YL, PC } from '../../theme';
import { DTE, CUR, NUM } from '../../utils/calculations';
import { StatCard } from '../StatCard/StatCard';
import { GreeksCard } from '../GreeksCard/GreeksCard';
import { PhaseChart } from '../PhaseChart/PhaseChart';
import { TickerChart } from '../TickerChart/TickerChart';
import { HoldingsTable } from '../HoldingsTable/HoldingsTable';
import styles from './Dashboard.module.css';

export function Dashboard({ st, holdings, isMobile, onEdit }) {
  const stockPnl   = st.stockReal + st.stockUnreal;
  const overallPnl = st.totRealized + st.totUnreal;

  return (
    <div className={styles.root}>
      <div className={`${styles.statGrid} ${isMobile ? styles.statGridMobile : styles.statGridDesktop}`}>
        <StatCard label="Open Premium" val={'$' + NUM(st.openPremium)} color={YL} sub="Open positions" />
        <StatCard label="Realized Premium" val={CUR(st.totPremium)} color={st.totPremium >= 0 ? G : R} sub="CSP & CC" />
        <StatCard label="Unrealized P&L" val={CUR(st.optUnreal)} color={st.optUnreal >= 0 ? G : R} sub="Open option marks" />
        <StatCard
          label="Stock P&L"
          val={CUR(stockPnl)}
          color={stockPnl >= 0 ? G : R}
          sub={holdings.totals.shares ? `${NUM(holdings.totals.shares, 0)} sh held · ${CUR(st.stockReal)} realized` : 'Assigned shares'}
        />
        <StatCard label="Capital at Risk" val={'$' + NUM(st.totCap)} sub={holdings.totals.cost ? `incl. $${NUM(holdings.totals.cost)} in shares` : undefined} />
        <StatCard label="Win Rate" val={NUM(st.winRate, 1) + '%'} color={st.winRate >= 70 ? G : st.winRate >= 50 ? YL : R} sub={`${st.wins}/${st.closedCount} closed`} />
        <StatCard label="Overall P&L" val={CUR(overallPnl)} color={overallPnl >= 0 ? G : R} sub="Premium + stock" />
      </div>

      {isMobile ? (
        <>
          <GreeksCard delta={st.netDelta} theta={st.netTheta} vega={st.netVega} />
          <PhaseChart phaseMix={st.phaseMix} />
          <TickerChart tickerConc={st.tickerConc} />
        </>
      ) : (
        <div className={styles.chartsRow}>
          <GreeksCard delta={st.netDelta} theta={st.netTheta} vega={st.netVega} />
          <PhaseChart phaseMix={st.phaseMix} />
          <TickerChart tickerConc={st.tickerConc} />
        </div>
      )}

      <HoldingsTable holdings={holdings} isMobile={isMobile} />

      <div className={styles.expirations}>
        <div className={styles.sectionLabel}>Upcoming Expirations</div>
        {!st.expirations.length && (
          <div style={{ color: M, fontSize: 13 }}>No open option positions.</div>
        )}
        <div className={styles.expirationList}>
          {st.expirations.slice(0, 10).map(p => {
            const col = p.dte <= 7 ? R : p.dte <= 21 ? YL : G;
            return (
              <div key={p.id} className={styles.expirationRow} style={{ background: B, borderColor: D }}>
                <div className={styles.expirationLeft}>
                  <span className={styles.expirationTicker}>{p.ticker}</span>
                  <span className={styles.expirationBadge} style={{ background: PC[p.phase] + '22', color: PC[p.phase] }}>
                    {p.phase}
                  </span>
                  <span style={{ color: M, fontSize: 12 }}>${p.strike}</span>
                </div>
                <div className={styles.expirationRight}>
                  {!isMobile && <span style={{ color: M, fontSize: 12 }}>{p.expiry}</span>}
                  <span style={{ color: col, fontFamily: 'monospace', fontWeight: 700 }}>
                    {p.dte <= 0 ? 'EXP' : p.dte + 'd'}
                  </span>
                  <button
                    onClick={() => onEdit(p)}
                    className={styles.btnEdit}
                    style={{ background: BL + '22', borderColor: BL + '44', color: BL }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
