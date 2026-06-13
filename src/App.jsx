import { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';

import { B, T } from './theme';
import { BLANK, TODAY, isSpread, capRisk, realPnl, unrlPnl, premTot, DTE, daysHeld, rorPct } from './utils/calculations';
import { fetchMarketData } from './utils/marketData';
import { useIsMobile } from './hooks/useIsMobile';

import { Sidebar }      from './components/Sidebar/Sidebar';
import { TopBar }       from './components/TopBar/TopBar';
import { BottomNav }    from './components/BottomNav/BottomNav';
import { ActionSheet }  from './components/ActionSheet/ActionSheet';
import { Dashboard }    from './components/Dashboard/Dashboard';
import { PositionsView } from './components/PositionsView/PositionsView';
import { AnalyticsView } from './components/AnalyticsView/AnalyticsView';
import { TradeForm }    from './components/TradeForm/TradeForm';
import { ImportModal }  from './components/ImportModal/ImportModal';

import styles from './App.module.css';

const VIEWS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'positions', icon: '📋', label: 'Positions' },
  { id: 'analytics', icon: '📈', label: 'Analytics' },
];

export default function App() {
  const isMobile = useIsMobile();

  const [positions, setPositions]     = useState([]);
  const [view, setView]               = useState('dashboard');
  const [showForm, setShowForm]       = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const [form, setForm]               = useState({ ...BLANK, openDate: TODAY() });
  const [editId, setEditId]           = useState(null);
  const editIdRef                     = useRef(null);
  const [filter, setFilter]           = useState({ ticker: '', phase: '', status: '', expMonth: '' });
  const [sort, setSort]               = useState({ field: 'ticker', dir: 'asc' });
  const [loaded, setLoaded]           = useState(false);
  const [csvText, setCsvText]         = useState('');
  const [csvErr, setCsvErr]           = useState('');
  const [refreshing, setRefreshing]   = useState(false);
  const [refreshLog, setRefreshLog]   = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshErr, setRefreshErr]   = useState('');

  useEffect(() => {
    fetch('/api/positions')
      .then(r => r.json())
      .then(data => { setPositions(data.positions || []); setLoaded(true); })
      .catch(() => {
        try { const s = localStorage.getItem('wheel_v2'); if (s) setPositions(JSON.parse(s)); } catch {}
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    fetch('/api/positions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ positions }) })
      .catch(() => { try { localStorage.setItem('wheel_v2', JSON.stringify(positions)); } catch {} });
  }, [positions, loaded]);

  async function doRefresh() {
    setRefreshing(true); setRefreshErr(''); setRefreshLog('Starting…');
    try {
      const { updated, log } = await fetchMarketData(positions, setRefreshLog);
      setPositions(updated); setLastRefresh(new Date().toLocaleTimeString()); setRefreshLog(log);
    } catch (e) {
      setRefreshErr('Error: ' + e.message); setRefreshLog('');
    }
    setRefreshing(false);
  }

  const st = useMemo(() => {
    const open   = positions.filter(p => p.status === 'Open');
    const closed = positions.filter(p => p.status !== 'Open');
    const totPremium   = closed.filter(p => p.phase !== 'Stock').reduce((s, p) => s + realPnl(p), 0);
    const openPremium  = open.filter(p => p.phase !== 'Stock').reduce((s, p) => s + premTot(p), 0);
    const totRealized = closed.reduce((s, p) => s + realPnl(p), 0);
    const totUnreal   = open.reduce((s, p) => s + unrlPnl(p), 0);
    const totCap      = open.reduce((s, p) => s + capRisk(p), 0);
    const wins        = closed.filter(p => realPnl(p) > 0).length;
    const winRate     = closed.length ? (wins / closed.length) * 100 : 0;
    const netDelta    = open.reduce((s, p) => s + (parseFloat(p.delta) || 0), 0);
    const netTheta    = open.reduce((s, p) => s + (parseFloat(p.theta) || 0), 0);
    const netVega     = open.reduce((s, p) => s + (parseFloat(p.vega) || 0), 0);
    const phaseMix    = ['CSP', 'CC', 'Stock', 'Put Spread', 'Call Spread']
      .map(ph => ({ name: ph, value: open.filter(p => p.phase === ph).length }))
      .filter(x => x.value > 0);
    const tickMap = {};
    open.forEach(p => { const cap = capRisk(p); tickMap[p.ticker] = (tickMap[p.ticker] || 0) + cap; });
    const tickerConc = Object.entries(tickMap)
      .map(([ticker, capital]) => ({ ticker, capital }))
      .sort((a, b) => b.capital - a.capital);
    const expirations = open
      .filter(p => p.expiry && p.phase !== 'Stock')
      .map(p => ({ ...p, dte: DTE(p.expiry) }))
      .sort((a, b) => a.dte - b.dte);
    return { totPremium, openPremium, totRealized, totUnreal, totCap, winRate, wins, openCount: open.length, closedCount: closed.length, netDelta, netTheta, netVega, phaseMix, tickerConc, expirations };
  }, [positions]);

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  function submit() {
    if (!form.ticker.trim()) return;
    const id = editIdRef.current;
    const pos = { ...form, ticker: form.ticker.toUpperCase(), id: id || Date.now().toString() };
    setPositions(prev => id ? prev.map(p => p.id === id ? pos : p) : [...prev, pos]);
    editIdRef.current = null; setForm({ ...BLANK, openDate: TODAY() }); setEditId(null); setShowForm(false);
  }

  function doEdit(pos) {
    editIdRef.current = pos.id; setEditId(pos.id); setForm({ ...BLANK, ...pos }); setShowForm(true);
  }

  function doDelete(id) {
    if (confirm('Delete this position?')) setPositions(prev => prev.filter(p => p.id !== id));
  }

  function doImport() {
    try {
      const result = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
      const norm = h => h.trim().toLowerCase().replace(/[^a-z]/g, '');
      const mapped = result.data.map((row, i) => {
        const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [norm(k), (v || '').trim()]));
        return {
          ...BLANK,
          id:        Date.now().toString() + i,
          ticker:    (r.ticker || r.symbol || '').toUpperCase(),
          phase:     r.phase || 'CSP',
          strike:    r.strike || '',
          longStrike: r.longstrike || r.longstk || '',
          expiry:    r.expiry || r.expiration || '',
          premium:   r.premium || r.credit || '',
          contracts: r.contracts || r.qty || '1',
          openDate:  r.opendate || r.date || TODAY(),
          status:    r.status || 'Open',
          delta:     r.delta || '',
          theta:     r.theta || '',
          vega:      r.vega || '',
          notes:     r.notes || '',
          shares:    r.shares || '',
          costBasis: r.costbasis || r.cost || '',
        };
      });
      setPositions(prev => [...prev, ...mapped]); setCsvText(''); setCsvErr(''); setShowImport(false);
    } catch (e) {
      setCsvErr('Parse error: ' + e.message);
    }
  }

  const expMonthOptions = useMemo(() => {
    const months = new Set();
    positions.forEach(p => {
      if (p.expiry) {
        const d = new Date(p.expiry + 'T00:00:00');
        if (!isNaN(d)) months.add(d.toLocaleString('default', { month: 'short', year: 'numeric' }));
      }
    });
    return [...months].sort((a, b) => new Date(a) - new Date(b));
  }, [positions]);

  const filtered = useMemo(() => {
    const list = positions.filter(p => {
      if (filter.ticker && !p.ticker.toLowerCase().includes(filter.ticker.toLowerCase())) return false;
      if (filter.phase && p.phase !== filter.phase) return false;
      if (filter.status && p.status !== filter.status) return false;
      if (filter.expMonth) {
        if (!p.expiry) return false;
        const d = new Date(p.expiry + 'T00:00:00');
        const label = isNaN(d) ? '' : d.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (label !== filter.expMonth) return false;
      }
      return true;
    });
    if (!sort.field) return list;
    const val = p => {
      switch (sort.field) {
        case 'ticker':    return p.ticker;
        case 'phase':     return p.phase;
        case 'strike':    return parseFloat(p.strike) || 0;
        case 'expiry':    return p.expiry || '';
        case 'dte':       { const d = DTE(p.expiry); return d === null ? Infinity : d; }
        case 'daysHeld':  return daysHeld(p) ?? 0;
        case 'premium':   return parseFloat(p.premium) || 0;
        case 'contracts': return parseInt(p.contracts) || 0;
        case 'pnl':       return p.status === 'Open' ? unrlPnl(p) : realPnl(p);
        case 'ror':       return rorPct(p) ?? -Infinity;
        case 'status':    return p.status;
        default:          return '';
      }
    };
    return [...list].sort((a, b) => {
      const av = val(a), bv = val(b);
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [positions, filter, sort]);

  function openAddForm() {
    setForm({ ...BLANK, openDate: TODAY() }); setEditId(null); editIdRef.current = null; setShowForm(true);
  }
  function closeForm() {
    setShowForm(false); setForm({ ...BLANK, openDate: TODAY() }); setEditId(null); editIdRef.current = null;
  }

  return (
    <div className={`${styles.root} ${isMobile ? styles.rootMobile : styles.rootDesktop}`} style={{ background: B, color: T }}>

      {!isMobile && (
        <Sidebar
          view={view} setView={setView} views={VIEWS}
          openCount={st.openCount} closedCount={st.closedCount}
          onAddTrade={openAddForm}
          onImport={() => setShowImport(true)}
          onRefresh={doRefresh}
          refreshing={refreshing} refreshLog={refreshLog} refreshErr={refreshErr} lastRefresh={lastRefresh}
        />
      )}

      {isMobile && (
        <TopBar
          openCount={st.openCount} closedCount={st.closedCount}
          onAddMenu={() => setShowMenu(true)}
          onRefresh={doRefresh}
          refreshing={refreshing}
        />
      )}

      <main className={styles.main} style={{ padding: isMobile ? '14px 12px 80px' : '24px' }}>
        {view === 'dashboard' && <Dashboard st={st} isMobile={isMobile} />}
        {view === 'positions' && (
          <PositionsView
            filtered={filtered} filter={filter} setFilter={setFilter}
            sort={sort} setSort={setSort}
            expMonthOptions={expMonthOptions}
            isMobile={isMobile}
            onEdit={doEdit} onDelete={doDelete}
          />
        )}
        {view === 'analytics' && <AnalyticsView positions={positions} isMobile={isMobile} />}
      </main>

      {isMobile && <BottomNav view={view} setView={setView} views={VIEWS} />}

      {isMobile && showMenu && (
        <ActionSheet
          onAddTrade={() => { openAddForm(); setShowMenu(false); }}
          onImport={() => { setShowImport(true); setShowMenu(false); }}
          onClose={() => setShowMenu(false)}
        />
      )}

      {showForm && (
        <TradeForm
          form={form} f={f} editId={editId}
          isMobile={isMobile}
          onSubmit={submit}
          onClose={closeForm}
        />
      )}

      {showImport && (
        <ImportModal
          csvText={csvText} setCsvText={setCsvText}
          csvErr={csvErr}
          onImport={doImport}
          onClose={() => setShowImport(false)}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
