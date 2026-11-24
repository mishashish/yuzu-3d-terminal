const PAIRS = ['SOLUSDT', 'BTCUSDT', 'ETHUSDT', 'WIFUSDT', 'BONKUSDT', 'PEPEUSDT', 'JUPUSDT'];

function updateBadge(market) {
  if (!Array.isArray(market)) return;
  const sol = market.find((m) => m.sym === 'SOL');
  if (!sol || Number.isNaN(sol.pct)) return;
  const sign = sol.pct >= 0 ? '+' : '';
  chrome.action.setBadgeText({ text: `${sign}${sol.pct.toFixed(0)}%` });
  chrome.action.setBadgeBackgroundColor({ color: sol.pct >= 0 ? '#16a34a' : '#ff4d9e' });
}

async function refreshMarket() {
  try {
    const syms = encodeURIComponent(JSON.stringify(PAIRS));
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${syms}`);
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr)) return null;
    const market = arr.map((x) => ({
      sym: x.symbol.replace('USDT', ''),
      price: parseFloat(x.lastPrice),
      pct: parseFloat(x.priceChangePercent),
    }));
    await chrome.storage.local.set({ market, updatedAt: Date.now() });
    updateBadge(market);
    return market;
  } catch {
    return null;
  }
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
    refreshMarket().then((market) => sendResponse({ ok: !!market, market }));
    return true;
  }
  if (msg?.type === 'UPDATE_BADGE' && Array.isArray(msg.market)) {
    updateBadge(msg.market);
    sendResponse({ ok: true });
  }
});
