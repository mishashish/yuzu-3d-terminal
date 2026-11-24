const COINS = [
  { sym: 'SOL', okx: 'SOL-USDT', binance: 'SOLUSDT', cg: 'solana' },
  { sym: 'BTC', okx: 'BTC-USDT', binance: 'BTCUSDT', cg: 'bitcoin' },
  { sym: 'ETH', okx: 'ETH-USDT', binance: 'ETHUSDT', cg: 'ethereum' },
  { sym: 'WIF', okx: 'WIF-USDT', binance: 'WIFUSDT', cg: 'dogwifcoin' },
  { sym: 'BONK', okx: 'BONK-USDT', binance: 'BONKUSDT', cg: 'bonk' },
  { sym: 'PEPE', okx: 'PEPE-USDT', binance: 'PEPEUSDT', cg: 'pepe' },
  { sym: 'JUP', okx: 'JUP-USDT', binance: 'JUPUSDT', cg: 'jupiter-exchange-solana' },
];

function updateBadge(market) {
  if (!Array.isArray(market)) return;
  const sol = market.find((m) => m.sym === 'SOL') || market[0];
  if (!sol || Number.isNaN(sol.pct)) return;
  const sign = sol.pct >= 0 ? '+' : '';
  chrome.action.setBadgeText({ text: `${sign}${sol.pct.toFixed(0)}%` });
  chrome.action.setBadgeBackgroundColor({ color: sol.pct >= 0 ? '#16a34a' : '#ff4d9e' });
}

async function fetchFromOKX() {
  const results = await Promise.all(
    COINS.map(async (c) => {
      const r = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${c.okx}`);
      if (!r.ok) return null;
      const j = await r.json();
      const d = j?.data?.[0];
      if (!d) return null;
      const last = parseFloat(d.last);
      const open = parseFloat(d.open24h);
      const pct = open > 0 ? ((last - open) / open) * 100 : 0;
      return { sym: c.sym, price: last, pct };
    })
  );
  const valid = results.filter(Boolean);
  return valid.length >= 4 ? valid : null;
}

async function fetchFromBinance() {
  const syms = encodeURIComponent(JSON.stringify(COINS.map((c) => c.binance)));
  const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${syms}`);
  if (!r.ok) return null;
  const arr = await r.json();
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr.map((x) => ({
    sym: x.symbol.replace('USDT', ''),
    price: parseFloat(x.lastPrice),
    pct: parseFloat(x.priceChangePercent),
  }));
}

async function fetchFromCoinGecko() {
  const ids = COINS.map((c) => c.cg).join(',');
  const r = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
  );
  if (!r.ok) return null;
  const j = await r.json();
  const out = COINS.filter((c) => j[c.cg]?.usd != null).map((c) => ({
    sym: c.sym,
    price: Number(j[c.cg].usd),
    pct: Number(j[c.cg].usd_24h_change || 0),
  }));
  return out.length >= 4 ? out : null;
}

async function maybeNotifyMovers(market) {
  try {
    const { alertsEnabled, lastAlertAt = 0 } = await chrome.storage.local.get(['alertsEnabled', 'lastAlertAt']);
    if (alertsEnabled === false) return;
    // Cooldown: at most 1 notification every 30 minutes so it never spams
    if (Date.now() - lastAlertAt < 30 * 60 * 1000) return;

    const bigMover = [...market].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
    if (!bigMover || Math.abs(bigMover.pct) < 5) return;

    const dir = bigMover.pct > 0 ? 'PUMPING' : 'DUMPING';
    const sign = bigMover.pct > 0 ? '+' : '';
    chrome.notifications.create(`yuzu-alert-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `$YUZU RADAR: ${bigMover.sym} ${dir}`,
      message: `${bigMover.sym} moved ${sign}${bigMover.pct.toFixed(1)}% in the last 24h.`,
    });
    await chrome.storage.local.set({ lastAlertAt: Date.now() });
  } catch {}
}

async function refreshMarket() {
  let market = null;
  let source = '';
  for (const [name, fn] of [
    ['OKX', fetchFromOKX],
    ['Binance', fetchFromBinance],
    ['CoinGecko', fetchFromCoinGecko],
  ]) {
    try {
      market = await fn();
      if (market) {
        source = name;
        break;
      }
    } catch {}
  }

  if (!market) return null;
  const updatedAt = Date.now();
  await chrome.storage.local.set({ market, source, updatedAt });
  updateBadge(market);
  maybeNotifyMovers(market);
  return { market, source, updatedAt };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('yuzuMarketPoll', { periodInMinutes: 2 });
  refreshMarket();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('yuzuMarketPoll', { periodInMinutes: 2 });
  refreshMarket();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'yuzuMarketPoll') refreshMarket();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'REFRESH_MARKET') {
    refreshMarket().then((data) => sendResponse(data ? { ok: true, ...data } : { ok: false }));
    return true;
  }
  if (msg?.type === 'UPDATE_BADGE' && Array.isArray(msg.market)) {
    updateBadge(msg.market);
    sendResponse({ ok: true });
  }
});
