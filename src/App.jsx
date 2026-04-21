import { useState, useEffect, useMemo, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Papa from "papaparse";

const B  = '#0d1117', C = '#161b22', D = '#30363d', T = '#e6edf3', M = '#8b949e';
const G  = '#3fb950', R = '#f85149', BL = '#58a6ff', PU = '#bc8cff', YL = '#e3b341', OR = '#ffa657';
const PC = { CSP: BL, CC: PU, Stock: G };
const TC = [BL, PU, G, YL, OR, '#38d9a9', '#f778ba', '#79c0ff'];
const SC = { Open: G, Expired: M, Assigned: YL, Closed: BL };

const MUL    = p => p.phase === 'Stock' ? 1 : 100;
const DTE    = exp => exp ? Math.ceil((new Date(exp + 'T12:00:00') - Date.now()) / 86400000) : null;
const NUM    = (n, d=2) => n == null || n === '' ? '—' : (+n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const CUR    = n => { if (n == null || n === '') return '—'; const v = +n; return (v >= 0 ? '+' : '−') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const TODAY  = () => new Date().toISOString().split('T')[0];
const premTot= p => (parseFloat(p.premium)||0) * (parseInt(p.contracts)||1) * MUL(p);
const capRisk= p => { if (p.status!=='Open') return 0; if (p.phase==='CSP') return (parseFloat(p.strike)||0)*(parseInt(p.contracts)||1)*100; if (p.phase==='Stock') return (parseFloat(p.costBasis)||0)*(parseInt(p.shares)||0); return 0; };
const realPnl= p => { if (p.status==='Open') return 0; if (p.phase==='Stock') return ((parseFloat(p.closePrice)||0)-(parseFloat(p.costBasis)||0))*(parseInt(p.shares)||0); const cp=p.closePrice!==''&&p.closePrice!=null?parseFloat(p.closePrice):null; return cp===null?premTot(p):((parseFloat(p.premium)||0)-cp)*(parseInt(p.contracts)||1)*100; };
const unrlPnl= p => { if (p.status!=='Open') return 0; if (p.phase==='Stock') return ((parseFloat(p.currentMark)||0)-(parseFloat(p.costBasis)||0))*(parseInt(p.shares)||0); if (p.currentMark===''||p.currentMark==null) return 0; return ((parseFloat(p.premium)||0)-parseFloat(p.currentMark))*(parseInt(p.contracts)||1)*100; };

const BLANK = { ticker:'', phase:'CSP', strike:'', expiry:'', premium:'', contracts:'1', openDate:TODAY(), closeDate:'', status:'Open', closePrice:'', currentMark:'', delta:'', theta:'', vega:'', notes:'', shares:'', costBasis:'' };
const cardStyle = { background: C, border: `1px solid ${D}`, borderRadius: 8, padding: '16px 20px' };
const inputStyle= { background: B, border: `1px solid ${D}`, borderRadius: 6, padding: '8px 10px', color: T, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const labelStyle= { fontSize: 11, color: M, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, display: 'block' };
const btnStyle  = (bg, cl='#fff') => ({ background: bg, border: 'none', color: cl, padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 });

// ── Yahoo Finance fetch with multiple fallbacks
async function yahooFetch(url) {
    const proxies = [
        u => u,                                                          // direct
        u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        u => `https://thingproxy.freeboard.io/fetch/${u}`,
    ];
    for (const proxy of proxies) {
        try {
            const res = await fetch(proxy(url), { headers: { 'Accept': 'application/json' } });
            if (!res.ok) continue;
            const data = await res.json();
            if (data) return data;
        } catch {}
    }
    return null;
}

async function fetchMarketData(positions, setLog) {
    const open = positions.filter(p => p.status === 'Open');
    if (!open.length) return { updated: positions, log: 'No open positions.' };
    const updated = positions.map(p => ({ ...p }));
    const tickers = [...new Set(open.map(p => p.ticker))];
    const logs = [];

    for (const ticker of tickers) {
        const tickPos = open.filter(p => p.ticker === ticker);
        setLog(`Fetching ${ticker}…`);

        // ── Stock price
        const chartData = await yahooFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`);
        const price = chartData?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) {
            tickPos.filter(p => p.phase === 'Stock').forEach(p => {
                const i = updated.findIndex(x => x.id === p.id);
                if (i !== -1) { updated[i].currentMark = price.toFixed(2); }
            });
            logs.push(`${ticker} price: ${price.toFixed(2)}`);
        } else {
            logs.push(`${ticker}: price fetch failed`);
        }

        // ── Options greeks per expiry
        const optPos = tickPos.filter(p => p.phase !== 'Stock' && p.expiry);
        const expiries = [...new Set(optPos.map(p => p.expiry))];

        for (const expiry of expiries) {
            const ts = Math.floor(new Date(expiry + 'T21:00:00Z').getTime() / 1000);
            const data = await yahooFetch(`https://query1.finance.yahoo.com/v7/finance/options/${ticker}?date=${ts}`);
            const chain = data?.optionChain?.result?.[0]?.options?.[0];
            const puts  = chain?.puts  || [];
            const calls = chain?.calls || [];

            if (!chain) { logs.push(`${ticker} ${expiry}: no options chain`); continue; }

            optPos.filter(p => p.expiry === expiry).forEach(p => {
                const strike = parseFloat(p.strike);
                const list   = p.phase === 'CSP' ? puts : calls;
                const match  = list.find(c => Math.abs(c.strike - strike) < 0.51);
                if (!match) { logs.push(`${ticker} ${strike}: no match in chain`); return; }
                const i = updated.findIndex(x => x.id === p.id);
                if (i === -1) return;
                const mid = (match.bid != null && match.ask != null) ? ((match.bid + match.ask) / 2).toFixed(2) : updated[i].currentMark;
                const hasGreeks = match.delta != null;
                updated[i] = {
                    ...updated[i],
                    currentMark: mid,
                    delta: hasGreeks ? match.delta.toFixed(3) : updated[i].delta,
                    theta: hasGreeks ? match.theta.toFixed(3) : updated[i].theta,
                    vega:  hasGreeks ? match.vega.toFixed(3)  : updated[i].vega,
                };
                logs.push(`${ticker} ${strike}: mid=${mid}${hasGreeks ? ` Δ${match.delta?.toFixed(2)}` : ' (no greeks from Yahoo)'}`);
            });
        }
    }
    return { updated, log: logs.join(' · ') || 'Done' };
}

function StatCard({ label, val, color, sub }) {
    return (
        <div style={cardStyle}>
            <div style={labelStyle}>{label}</div>
            <div style={{ color: color||T, fontSize: 21, fontWeight: 700, fontFamily: 'monospace' }}>{val}</div>
            {sub && <div style={{ color: M, fontSize: 11, marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

function GreeksCard({ delta, theta, vega }) {
    const row = (lbl, val, col) => (
        <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${D}` }}>
            <span style={{ color: M, fontSize: 13 }}>{lbl}</span>
            <span style={{ color: col||T, fontFamily:'monospace', fontWeight:600 }}>{NUM(val)}</span>
        </div>
    );
    return (
        <div style={cardStyle}>
            <div style={labelStyle}>Portfolio Greeks</div>
            {row('Net Delta (Δ)', delta)}
            {row('Net Theta/day (Θ)', theta, theta > 0 ? G : R)}
            {row('Net Vega (ν)', vega)}
        </div>
    );
}

function PhaseChart({ data }) {
    if (!data.length) return <div style={{ ...cardStyle, display:'flex', alignItems:'center', justifyContent:'center', height:220, color:M, fontSize:13 }}>No open positions</div>;
    return (
        <div style={cardStyle}>
            <div style={labelStyle}>Phase Mix</div>
            <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value"
                         label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
                        {data.map((e,i) => <Cell key={e.name} fill={PC[e.name]||TC[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:C, border:`1px solid ${D}`, color:T, fontSize:12 }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

function TickerChart({ data }) {
    if (!data.length) return <div style={{ ...cardStyle, display:'flex', alignItems:'center', justifyContent:'center', height:220, color:M, fontSize:13 }}>No capital deployed</div>;
    return (
        <div style={cardStyle}>
            <div style={labelStyle}>Ticker Concentration</div>
            <ResponsiveContainer width="100%" height={190}>
                <BarChart data={data} layout="vertical" margin={{ left:10, right:24, top:4, bottom:4 }}>
                    <XAxis type="number" tick={{ fill:M, fontSize:11 }} tickFormatter={v => '$'+(v/1000).toFixed(0)+'k'} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="ticker" tick={{ fill:T, fontSize:12, fontWeight:600 }} width={52} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => ['$'+v.toLocaleString('en-US',{maximumFractionDigits:0}), 'Capital']} contentStyle={{ background:C, border:`1px solid ${D}`, color:T, fontSize:12 }} />
                    <Bar dataKey="capital" radius={[0,4,4,0]}>
                        {data.map((_,i) => <Cell key={i} fill={TC[i%TC.length]} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function ExpirationsPanel({ data }) {
    return (
        <div style={cardStyle}>
            <div style={labelStyle}>Upcoming Expirations</div>
            {!data.length && <div style={{ color:M, fontSize:13 }}>No open option positions.</div>}
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
                {data.slice(0,10).map(p => {
                    const d = p.dte, col = d <= 7 ? R : d <= 21 ? YL : G;
                    return (
                        <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:B, borderRadius:6, border:`1px solid ${D}` }}>
                            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                                <span style={{ fontWeight:700, color:T, minWidth:60 }}>{p.ticker}</span>
                                <span style={{ fontSize:11, background:PC[p.phase]+'22', color:PC[p.phase], padding:'2px 7px', borderRadius:4 }}>{p.phase}</span>
                                <span style={{ color:M, fontSize:12 }}>${p.strike}</span>
                            </div>
                            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                                <span style={{ color:M, fontSize:12 }}>{p.expiry}</span>
                                <span style={{ color:col, fontFamily:'monospace', fontWeight:700, minWidth:40, textAlign:'right' }}>{d <= 0 ? 'EXP' : d+'d'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const Inp = ({ label, k, type='text', form, f, ...rest }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        <label style={labelStyle}>{label}</label>
        <input type={type} value={form[k]} onChange={e => f(k, e.target.value)} style={inputStyle} {...rest} />
    </div>
);
const Sel = ({ label, k, opts, form, f }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        <label style={labelStyle}>{label}</label>
        <select value={form[k]} onChange={e => f(k, e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);

export default function App() {
    const [positions, setPositions]     = useState([]);
    const [view, setView]               = useState('dashboard');
    const [showForm, setShowForm]       = useState(false);
    const [showImport, setShowImport]   = useState(false);
    const [form, setForm]               = useState(BLANK);
    const [editId, setEditId]           = useState(null);
    const [filter, setFilter]           = useState({ ticker:'', phase:'', status:'' });
    const [loaded, setLoaded]           = useState(false);
    const [csvText, setCsvText]         = useState('');
    const [csvErr, setCsvErr]           = useState('');
    const editIdRef = useRef(null);
    const [refreshing, setRefreshing]   = useState(false);
    const [refreshLog, setRefreshLog]   = useState('');
    const [lastRefresh, setLastRefresh] = useState(null);
    const [refreshErr, setRefreshErr]   = useState('');

    useEffect(() => {
        (async () => {
            try { const r = await window.storage.get('wheel_v2'); if (r?.value) setPositions(JSON.parse(r.value)); } catch {
                try { const s = localStorage.getItem('wheel_v2'); if (s) setPositions(JSON.parse(s)); } catch {}
            }
            setLoaded(true);
        })();
    }, []);

    useEffect(() => {
        if (!loaded) return;
        try { window.storage.set('wheel_v2', JSON.stringify(positions)); } catch {
            try { localStorage.setItem('wheel_v2', JSON.stringify(positions)); } catch {}
        }
    }, [positions, loaded]);

    async function doRefresh() {
        setRefreshing(true); setRefreshErr(''); setRefreshLog('Starting…');
        try {
            const { updated, log } = await fetchMarketData(positions, setRefreshLog);
            setPositions(updated);
            setLastRefresh(new Date().toLocaleTimeString());
            setRefreshLog(log);
        } catch(e) {
            setRefreshErr('Error: ' + e.message);
            setRefreshLog('');
        }
        setRefreshing(false);
    }

    const st = useMemo(() => {
        const open   = positions.filter(p => p.status === 'Open');
        const closed = positions.filter(p => p.status !== 'Open');
        const totPremium  = positions.reduce((s,p) => s + premTot(p), 0);
        const totRealized = closed.reduce((s,p) => s + realPnl(p), 0);
        const totUnreal   = open.reduce((s,p) => s + unrlPnl(p), 0);
        const totCap      = open.reduce((s,p) => s + capRisk(p), 0);
        const wins        = closed.filter(p => realPnl(p) > 0).length;
        const winRate     = closed.length ? wins / closed.length * 100 : 0;
        const netDelta    = open.reduce((s,p) => s + (parseFloat(p.delta)||0), 0);
        const netTheta    = open.reduce((s,p) => s + (parseFloat(p.theta)||0), 0);
        const netVega     = open.reduce((s,p) => s + (parseFloat(p.vega)||0), 0);
        const phaseMix    = ['CSP','CC','Stock'].map(ph => ({ name:ph, value:open.filter(p=>p.phase===ph).length })).filter(x=>x.value>0);
        const tickMap = {};
        open.forEach(p => { const cap=capRisk(p); tickMap[p.ticker]=(tickMap[p.ticker]||0)+cap; });
        const tickerConc  = Object.entries(tickMap).map(([ticker,capital])=>({ticker,capital})).sort((a,b)=>b.capital-a.capital);
        const expirations = open.filter(p=>p.expiry&&p.phase!=='Stock').map(p=>({...p,dte:DTE(p.expiry)})).sort((a,b)=>a.dte-b.dte);
        return { totPremium, totRealized, totUnreal, totCap, winRate, wins, openCount:open.length, closedCount:closed.length, netDelta, netTheta, netVega, phaseMix, tickerConc, expirations };
    }, [positions]);

    const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    function submit() {
        if (!form.ticker.trim()) return;
        const id = editIdRef.current;
        const pos = { ...form, ticker: form.ticker.toUpperCase(), id: id || Date.now().toString() };
        setPositions(prev => id ? prev.map(p => p.id === id ? pos : p) : [...prev, pos]);
        editIdRef.current = null;
        setForm(BLANK); setEditId(null); setShowForm(false);
    }

    function doEdit(pos) {
        editIdRef.current = pos.id;
        setEditId(pos.id);
        setForm({ ...BLANK, ...pos });
        setShowForm(true);
    }
    function doDelete(id) { if (confirm('Delete this position?')) setPositions(prev => prev.filter(p => p.id!==id)); }

    function doImport() {
        try {
            const result = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
            const norm = h => h.trim().toLowerCase().replace(/[^a-z]/g,'');
            const mapped = result.data.map((row, i) => {
                const r = Object.fromEntries(Object.entries(row).map(([k,v]) => [norm(k), (v||'').trim()]));
                return { ...BLANK, id: Date.now().toString()+i, ticker:(r.ticker||r.symbol||'').toUpperCase(), phase:r.phase||'CSP', strike:r.strike||'', expiry:r.expiry||r.expiration||'', premium:r.premium||r.credit||'', contracts:r.contracts||r.qty||'1', openDate:r.opendate||r.date||TODAY(), status:r.status||'Open', delta:r.delta||'', theta:r.theta||'', vega:r.vega||'', notes:r.notes||'', shares:r.shares||'', costBasis:r.costbasis||r.cost||'' };
            });
            setPositions(prev => [...prev, ...mapped]);
            setCsvText(''); setCsvErr(''); setShowImport(false);
        } catch(e) { setCsvErr('Parse error: ' + e.message); }
    }

    const filtered = useMemo(() => positions.filter(p => {
        if (filter.ticker && !p.ticker.toLowerCase().includes(filter.ticker.toLowerCase())) return false;
        if (filter.phase && p.phase!==filter.phase) return false;
        if (filter.status && p.status!==filter.status) return false;
        return true;
    }), [positions, filter]);

    const navBtn = (id, icon, label) => (
        <button onClick={() => setView(id)} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 14px', background: view===id ? D : 'transparent', border:'none', borderRadius:6, color: view===id ? T : M, cursor:'pointer', fontSize:13, width:'100%', textAlign:'left' }}>
            <span>{icon}</span>{label}
        </button>
    );

    const modal = (title, onClose, children, width=640) => (
        <div style={{ position:'fixed', inset:0, background:'#000b', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
            <div style={{ background:C, border:`1px solid ${D}`, borderRadius:12, padding:28, width, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                    <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>{title}</h2>
                    <button onClick={onClose} style={{ background:'none', border:'none', color:M, cursor:'pointer', fontSize:20 }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );

    return (
        <div style={{ display:'flex', minHeight:'100vh', background:B, color:T, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize:14 }}>
            {/* Sidebar */}
            <div style={{ width:190, background:C, borderRight:`1px solid ${D}`, padding:'18px 10px', display:'flex', flexDirection:'column', gap:3, flexShrink:0 }}>
                <div style={{ padding:'0 6px', marginBottom:18 }}>
                    <div style={{ fontSize:15, fontWeight:800 }}>🎡 Wheel Tracker</div>
                    <div style={{ fontSize:11, color:M, marginTop:2 }}>{st.openCount} open · {st.closedCount} closed</div>
                </div>
                {navBtn('dashboard', '📊', 'Dashboard')}
                {navBtn('positions', '📋', 'Positions')}
                <div style={{ height:1, background:D, margin:'8px 2px' }} />
                <button onClick={() => { setForm(BLANK); setEditId(null); setShowForm(true); }}
                        style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 14px', background:BL+'22', border:`1px solid ${BL}44`, borderRadius:6, color:BL, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                    ＋ Add Trade
                </button>
                <button onClick={() => setShowImport(true)}
                        style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 14px', background:'transparent', border:`1px solid ${D}`, borderRadius:6, color:M, cursor:'pointer', fontSize:13 }}>
                    ⬆ Import CSV
                </button>

                {/* Refresh block */}
                <div style={{ height:1, background:D, margin:'8px 2px' }} />
                <button onClick={doRefresh} disabled={refreshing}
                        style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 14px', background: refreshing ? D : G+'22', border:`1px solid ${G}44`, borderRadius:6, color: refreshing ? M : G, cursor: refreshing ? 'wait' : 'pointer', fontSize:13, fontWeight:600, opacity: refreshing ? 0.7 : 1 }}>
                    {refreshing ? '⏳' : '⚡'} {refreshing ? 'Refreshing…' : 'Refresh Data'}
                </button>
                {refreshLog && !refreshErr && (
                    <div style={{ fontSize:10, color: refreshLog.includes('Done') ? G : M, padding:'2px 6px', textAlign:'center' }}>{refreshLog}</div>
                )}
                {refreshErr && <div style={{ fontSize:10, color:R, padding:'2px 6px' }}>{refreshErr}</div>}
                {lastRefresh && !refreshing && (
                    <div style={{ fontSize:10, color:M, padding:'2px 6px', textAlign:'center' }}>Updated {lastRefresh}</div>
                )}
                <div style={{ fontSize:10, color:D, padding:'4px 6px', lineHeight:1.4, marginTop:4 }}>
                    via Yahoo Finance · Tradier coming soon
                </div>
            </div>

            {/* Content */}
            <div style={{ flex:1, padding:24, overflowY:'auto' }}>

                {view === 'dashboard' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                            <StatCard label="Total Premium Collected" val={'$' + NUM(st.totPremium)} color={G} />
                            <StatCard label="Realized P&L" val={CUR(st.totRealized)} color={st.totRealized >= 0 ? G : R} />
                            <StatCard label="Unrealized P&L" val={CUR(st.totUnreal)} color={st.totUnreal >= 0 ? G : R} sub="Based on current marks" />
                            <StatCard label="Capital at Risk" val={'$' + NUM(st.totCap)} />
                            <StatCard label="Win Rate" val={NUM(st.winRate,1)+'%'} color={st.winRate>=70?G:st.winRate>=50?YL:R} sub={`${st.wins} wins of ${st.closedCount} closed`} />
                            <StatCard label="Overall P&L" val={CUR(st.totRealized + st.totUnreal)} color={(st.totRealized+st.totUnreal)>=0?G:R} sub="Realized + Unrealized" />
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr 1fr', gap:12 }}>
                            <GreeksCard delta={st.netDelta} theta={st.netTheta} vega={st.netVega} />
                            <PhaseChart data={st.phaseMix} />
                            <TickerChart data={st.tickerConc} />
                        </div>
                        <ExpirationsPanel data={st.expirations} />
                    </div>
                )}

                {view === 'positions' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                            <input placeholder="Search ticker…" value={filter.ticker} onChange={e => setFilter(f=>({...f,ticker:e.target.value}))}
                                   style={{ ...inputStyle, width:140 }} />
                            {['phase','status'].map(key => (
                                <select key={key} value={filter[key]} onChange={e => setFilter(f=>({...f,[key]:e.target.value}))}
                                        style={{ ...inputStyle, width:130, cursor:'pointer' }}>
                                    <option value="">All {key==='phase'?'Phases':'Status'}</option>
                                    {(key==='phase'?['CSP','CC','Stock']:['Open','Expired','Assigned','Closed']).map(o=><option key={o}>{o}</option>)}
                                </select>
                            ))}
                            <span style={{ color:M, fontSize:12 }}>{filtered.length} position{filtered.length!==1?'s':''}</span>
                        </div>
                        <div style={{ background:C, border:`1px solid ${D}`, borderRadius:8, overflowX:'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                                <thead>
                                <tr style={{ borderBottom:`1px solid ${D}` }}>
                                    {['Ticker','Phase','Strike','Expiry','DTE','Premium/ct','Mark','Contracts','P&L','% Captured','Status','Actions'].map(h => (
                                        <th key={h} style={{ padding:'11px 14px', textAlign:'left', color:M, fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:.7, whiteSpace:'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {filtered.length === 0 && <tr><td colSpan={11} style={{ padding:40, textAlign:'center', color:M }}>No positions. Add a trade or import CSV.</td></tr>}
                                {filtered.map(pos => {
                                    const dteVal = pos.phase!=='Stock' ? DTE(pos.expiry) : null;
                                    const dteCol = dteVal===null?M:dteVal<=0?R:dteVal<=7?R:dteVal<=21?YL:G;
                                    const pnl    = pos.status==='Open' ? unrlPnl(pos) : realPnl(pos);
                                    return (
                                        <tr key={pos.id} style={{ borderBottom:`1px solid ${D}22` }}
                                            onMouseEnter={e=>e.currentTarget.style.background=D+'33'}
                                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                            <td style={{ padding:'9px 14px', fontWeight:700 }}>{pos.ticker}</td>
                                            <td style={{ padding:'9px 14px' }}><span style={{ background:(PC[pos.phase]||M)+'22', color:PC[pos.phase]||M, padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600 }}>{pos.phase}</span></td>
                                            <td style={{ padding:'9px 14px', fontFamily:'monospace' }}>{pos.strike?'$'+pos.strike:'—'}</td>
                                            <td style={{ padding:'9px 14px', color:M, whiteSpace:'nowrap' }}>{pos.expiry||'—'}</td>
                                            <td style={{ padding:'9px 14px', color:dteCol, fontFamily:'monospace', fontWeight:600 }}>{dteVal!==null?(dteVal<=0?'EXP':dteVal+'d'):'—'}</td>
                                            <td style={{ padding:'9px 14px', fontFamily:'monospace', color:G }}>{pos.premium?'+$'+NUM(pos.premium):'—'}</td>
                                            <td style={{ padding:'9px 14px', fontFamily:'monospace', color:M }}>{pos.currentMark?'$'+NUM(pos.currentMark):'—'}</td>
                                            <td style={{ padding:'9px 14px', fontFamily:'monospace' }}>{pos.contracts}</td>
                                            <td style={{ padding:'9px 14px', fontFamily:'monospace', color:pnl>=0?G:R, fontWeight:600 }}>{pnl!==0?CUR(pnl):'—'}</td>
                                            <td style={{ padding:'9px 14px', fontFamily:'monospace' }}>{(() => {
                                                if (pos.phase === 'Stock' || pos.status === 'Open' || !pos.premium || parseFloat(pos.premium) === 0) return '—';
                                                const pct = (realPnl(pos) / premTot(pos)) * 100;
                                                const col = pct >= 90 ? G : pct >= 50 ? YL : pct >= 0 ? OR : R;
                                                return <span style={{ color: col, fontWeight: 600 }}>{pct.toFixed(1)}%</span>;
                                            })()}</td>
                                            <td style={{ padding:'9px 14px' }}><span style={{ background:(SC[pos.status]||M)+'22', color:SC[pos.status]||M, padding:'2px 8px', borderRadius:4, fontSize:11 }}>{pos.status}</span></td>
                                            <td style={{ padding:'9px 14px' }}>
                                                <div style={{ display:'flex', gap:6 }}>
                                                    <button onClick={()=>doEdit(pos)} style={{ background:BL+'22', border:`1px solid ${BL}44`, color:BL, padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:11 }}>Edit</button>
                                                    <button onClick={()=>doDelete(pos.id)} style={{ background:R+'11', border:`1px solid ${R}33`, color:R, padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:11 }}>Del</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {showForm && modal(editId ? 'Edit Trade' : 'Add Trade', () => { setShowForm(false); setForm(BLANK); setEditId(null); }, (
                <>
                    {/* Format hints */}
                    <div style={{ background:BL+'11', border:`1px solid ${BL}33`, borderRadius:6, padding:'10px 14px', marginBottom:16, fontSize:12, color:M, lineHeight:1.7 }}>
                        💡 <strong style={{color:T}}>Format guide:</strong> Premium = per-share price (e.g. <code style={{color:BL}}>1.50</code>, app ×100 auto) · Delta = position delta (CSP short → positive e.g. <code style={{color:BL}}>0.25</code>) · Theta = positive for short options · Vega = negative for short options
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                        <Inp label="Ticker" k="ticker" form={form} f={f} placeholder="AAPL" />
                        <Sel label="Phase" k="phase" opts={['CSP','CC','Stock']} form={form} f={f} />
                        {form.phase !== 'Stock' && <Inp label="Strike ($)" k="strike" type="number" form={form} f={f} />}
                        {form.phase !== 'Stock' && <Inp label="Expiry" k="expiry" type="date" form={form} f={f} />}
                        {form.phase !== 'Stock' && <Inp label="Premium / contract ($) e.g. 1.50" k="premium" type="number" form={form} f={f} placeholder="1.50" />}
                        {form.phase !== 'Stock' && <Inp label="Contracts" k="contracts" type="number" form={form} f={f} />}
                        {form.phase === 'Stock' && <Inp label="Shares" k="shares" type="number" form={form} f={f} />}
                        {form.phase === 'Stock' && <Inp label="Cost Basis / share ($)" k="costBasis" type="number" form={form} f={f} />}
                        <Inp label="Open Date" k="openDate" type="date" form={form} f={f} />
                        <Sel label="Status" k="status" opts={['Open','Expired','Assigned','Closed']} form={form} f={f} />
                        {form.status !== 'Open' && <Inp label="Close Price ($)" k="closePrice" type="number" form={form} f={f} />}
                        {form.status !== 'Open' && <Inp label="Close Date" k="closeDate" type="date" form={form} f={f} />}
                        {form.status === 'Open' && <Inp label="Current Mark ($) — auto-filled on refresh" k="currentMark" type="number" form={form} f={f} placeholder="auto or manual" />}
                        <Inp label="Delta (Δ) e.g. 0.25 for short CSP" k="delta" type="number" form={form} f={f} step="0.001" placeholder="0.250" />
                        <Inp label="Theta (Θ/day) e.g. 0.08 for short opt" k="theta" type="number" form={form} f={f} step="0.001" placeholder="0.080" />
                        <Inp label="Vega (ν) e.g. -0.12 for short opt" k="vega" type="number" form={form} f={f} step="0.001" placeholder="-0.120" />
                        <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', gap:4 }}>
                            <label style={labelStyle}>Notes</label>
                            <textarea value={form.notes} onChange={e=>f('notes',e.target.value)} rows={2} style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit' }} />
                        </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
                        <button onClick={()=>{setShowForm(false);setForm(BLANK);setEditId(null);}} style={{ background:'none', border:`1px solid ${D}`, color:M, padding:'8px 18px', borderRadius:6, cursor:'pointer' }}>Cancel</button>
                        <button onClick={submit} style={btnStyle(BL)}>{editId?'Update':'Add Trade'}</button>
                    </div>
                </>
            ))}

            {showImport && modal('Import CSV', () => setShowImport(false), (
                <>
                    <div style={{ fontSize:12, color:M, marginBottom:12, lineHeight:1.7 }}>
                        Supported headers: <code style={{ color:BL, fontSize:11 }}>ticker, phase, strike, expiry, premium, contracts, openDate, status, delta, theta, vega, notes, shares, costBasis</code>
                    </div>
                    <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={8} placeholder={"ticker,phase,strike,expiry,premium,contracts\nAAPL,CSP,170,2025-05-16,1.50,2"}
                              style={{ ...inputStyle, resize:'vertical', fontFamily:'monospace', fontSize:12 }} />
                    {csvErr && <div style={{ color:R, fontSize:12, marginTop:8 }}>{csvErr}</div>}
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16 }}>
                        <button onClick={()=>setShowImport(false)} style={{ background:'none', border:`1px solid ${D}`, color:M, padding:'8px 18px', borderRadius:6, cursor:'pointer' }}>Cancel</button>
                        <button onClick={doImport} style={btnStyle(G,'#000')}>Import</button>
                    </div>
                </>
            ), 580)}
        </div>
    );
}