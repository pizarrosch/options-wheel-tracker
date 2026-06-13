export async function fetchMarketData(positions, setLog) {
  const open = positions.filter(p => p.status === 'Open');
  if (!open.length) return { updated: positions, log: 'No open positions.' };

  const updated = positions.map(p => ({ ...p }));
  const tickers = [...new Set(open.map(p => p.ticker))];
  const logs = [];
  const headers = { Accept: 'application/json' };

  setLog('Fetching quotes…');
  try {
    const res = await fetch(`/tradier/v1/markets/quotes?symbols=${tickers.join(',')}&greeks=false`, { headers });
    const data = await res.json();
    const quotes = data?.quotes?.quote;
    const quoteList = Array.isArray(quotes) ? quotes : quotes ? [quotes] : [];
    quoteList.forEach(q => {
      const price = q.last ?? q.bid;
      if (!price) return;
      open
        .filter(p => p.ticker === q.symbol && p.phase === 'Stock')
        .forEach(p => {
          const i = updated.findIndex(x => x.id === p.id);
          if (i !== -1) updated[i].currentMark = price.toFixed(2);
        });
      logs.push(`${q.symbol}: $${price.toFixed(2)} ✓`);
    });
  } catch (e) {
    logs.push(`Quotes error: ${e.message}`);
  }

  const optPositions = open.filter(
    p => p.phase !== 'Stock' && p.phase !== 'Put Spread' && p.phase !== 'Call Spread' && p.expiry
  );
  const pairs = [
    ...new Map(
      optPositions.map(p => [`${p.ticker}|${p.expiry}`, { ticker: p.ticker, expiry: p.expiry }])
    ).values(),
  ];

  for (const { ticker, expiry } of pairs) {
    setLog(`Fetching ${ticker} ${expiry}…`);
    try {
      const res = await fetch(
        `/tradier/v1/markets/options/chains?symbol=${ticker}&expiration=${expiry}&greeks=true`,
        { headers }
      );
      const data = await res.json();
      const options = data?.options?.option;
      const chain = Array.isArray(options) ? options : options ? [options] : [];
      if (!chain.length) { logs.push(`${ticker} ${expiry}: no chain`); continue; }

      optPositions
        .filter(p => p.ticker === ticker && p.expiry === expiry)
        .forEach(p => {
          const type = p.phase === 'CSP' ? 'put' : 'call';
          const match = chain.find(
            o => o.option_type === type && Math.abs(o.strike - parseFloat(p.strike)) < 0.51
          );
          if (!match) { logs.push(`${ticker} $${p.strike}: no match`); return; }
          const i = updated.findIndex(x => x.id === p.id);
          if (i === -1) return;
          const mid =
            match.bid != null && match.ask != null
              ? ((match.bid + match.ask) / 2).toFixed(2)
              : updated[i].currentMark;
          const g = match.greeks;
          updated[i] = {
            ...updated[i],
            currentMark: mid,
            delta: g?.delta != null ? g.delta.toFixed(3) : updated[i].delta,
            theta: g?.theta != null ? g.theta.toFixed(3) : updated[i].theta,
            vega: g?.vega != null ? g.vega.toFixed(3) : updated[i].vega,
          };
          logs.push(`${ticker} $${p.strike}: $${mid} Δ${g?.delta?.toFixed(2) ?? '?'} ✓`);
        });
    } catch (e) {
      logs.push(`${ticker} ${expiry}: ${e.message}`);
    }
  }

  return { updated, log: logs.join(' · ') || 'Done' };
}
