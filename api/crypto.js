const PAIRS = [
  { okx: 'SOL-USDT', cg: 'solana', sym: 'SOLUSDT' },
  { okx: 'BTC-USDT', cg: 'bitcoin', sym: 'BTCUSDT' },
  { okx: 'ETH-USDT', cg: 'ethereum', sym: 'ETHUSDT' },
  { okx: 'WIF-USDT', cg: 'dogwifcoin', sym: 'WIFUSDT' },
  { okx: 'BONK-USDT', cg: 'bonk', sym: 'BONKUSDT' },
  { okx: 'JUP-USDT', cg: 'jupiter-exchange-solana', sym: 'JUPUSDT' },
];

export default async function handler(req, res) {
  try {
    // 1. Primary: OKX public spot tickers (fast, global, no US IP block)
    try {
      const results = await Promise.all(
        PAIRS.map(async (p) => {
          const r = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${p.okx}`);
          if (!r.ok) return null;
          const j = await r.json();
          const d = j?.data?.[0];
          if (!d) return null;
          const last = parseFloat(d.last);
          const open = parseFloat(d.open24h);
          const pct = open > 0 ? ((last - open) / open) * 100 : 0;
          return { symbol: p.sym, lastPrice: String(last), priceChangePercent: pct.toFixed(2) };
        })
      );
      const valid = results.filter(Boolean);
      if (valid.length >= 3) {
        res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
        res.status(200).json(valid);
        return;
      }
    } catch {}

    // 2. Secondary: CoinGecko public API
    try {
      const ids = PAIRS.map((c) => c.cg).join(',');
      const r = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
        { headers: { accept: 'application/json', 'user-agent': 'YuzuTerminal/1.0' } }
      );
      if (r.ok) {
        const j = await r.json();
        const out = PAIRS.filter((c) => j[c.cg]?.usd != null).map((c) => ({
          symbol: c.sym,
          lastPrice: String(j[c.cg].usd),
          priceChangePercent: String((j[c.cg].usd_24h_change ?? 0).toFixed(2)),
        }));
        if (out.length) {
          res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
          res.status(200).json(out);
          return;
        }
      }
    } catch {}

    res.status(502).json({ error: 'Crypto feed temporarily unavailable' });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
