const DEFAULT_PAIRS = JSON.stringify(['SOLUSDT', 'BTCUSDT', 'ETHUSDT', 'WIFUSDT', 'BONKUSDT', 'JUPUSDT']);

export default async function handler(req, res) {
  try {
    const symbols = req.query?.symbols || DEFAULT_PAIRS;
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`;
    const r = await fetch(url);
    if (!r.ok) {
      res.status(r.status).json({ error: `Binance HTTP ${r.status}` });
      return;
    }
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
