const CG_MAP = [
  { id: 'solana', sym: 'SOLUSDT' },
  { id: 'bitcoin', sym: 'BTCUSDT' },
  { id: 'ethereum', sym: 'ETHUSDT' },
  { id: 'dogwifcoin', sym: 'WIFUSDT' },
  { id: 'bonk', sym: 'BONKUSDT' },
  { id: 'jupiter-exchange-solana', sym: 'JUPUSDT' },
];

export default async function handler(req, res) {
  try {
    // 1. Primary: CoinGecko public API (works globally including US Vercel regions where Binance returns 451!)
    const ids = CG_MAP.map((c) => c.id).join(',');
    const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const r = await fetch(cgUrl, { headers: { accept: 'application/json' } });
    if (r.ok) {
      const j = await r.json();
      const out = CG_MAP.filter((c) => j[c.id]?.usd != null).map((c) => ({
        symbol: c.sym,
        lastPrice: String(j[c.id].usd),
        priceChangePercent: String((j[c.id].usd_24h_change ?? 0).toFixed(2)),
      }));
      if (out.length) {
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
        res.status(200).json(out);
        return;
      }
    }

    // 2. Fallback: Binance.com
    const syms = JSON.stringify(CG_MAP.map((c) => c.sym));
    const br = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(syms)}`);
    if (br.ok) {
      const data = await br.json();
      res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
      res.status(200).json(data);
      return;
    }

    res.status(502).json({ error: 'Crypto feed temporarily unavailable' });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
