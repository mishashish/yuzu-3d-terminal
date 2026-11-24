const PAIRS = ['SOLUSDT', 'BTCUSDT', 'ETHUSDT', 'WIFUSDT', 'BONKUSDT', 'PEPEUSDT', 'JUPUSDT'];
let lastBrief = '';

const fmtPrice = (p) => (p >= 1000 ? `$${Math.round(p)}` : p >= 1 ? `$${p.toFixed(2)}` : `$${p.toFixed(6)}`);

function buildBrief(market) {
  const sorted = [...market].sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const sol = market.find((m) => m.sym === 'SOL');
  return (
    `Degen market brief! Top gainer is ${best.sym} at ${best.pct >= 0 ? '+' : ''}${best.pct.toFixed(1)}%, ` +
    `while ${worst.sym} dipped ${worst.pct.toFixed(1)}%. ` +
    `SOL is at ${sol ? fmtPrice(sol.price) : '—'}. ${worst.pct < -4 ? 'Time to buy the dip or wait for bounce?' : 'Market looks active, stay sharp!'}`
  );
}

function render(market) {
  if (!Array.isArray(market) || !market.length) return;
  const sorted = [...market].sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  document.getElementById('top-gainer').textContent = `${best.sym} ${best.pct >= 0 ? '+' : ''}${best.pct.toFixed(1)}%`;
  document.getElementById('top-loser').textContent = `${worst.sym} ${worst.pct.toFixed(1)}%`;

  lastBrief = buildBrief(market);
  document.getElementById('yuzu-speech').textContent = lastBrief;

  const list = document.getElementById('coin-list');
  list.innerHTML = market
    .map((m) => {
      const cls = m.pct >= 0 ? 'up' : 'down';
      const sign = m.pct >= 0 ? '+' : '';
      return `<div class="row"><span class="sym">${m.sym}</span><span class="price">${fmtPrice(m.price)}</span><span class="pct ${cls}">${sign}${m.pct.toFixed(2)}%</span></div>`;
    })
    .join('');
}

async function fetchLive() {
  const speech = document.getElementById('yuzu-speech');
  try {
    const syms = encodeURIComponent(JSON.stringify(PAIRS));
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${syms}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error('Invalid response');
    const market = arr.map((x) => ({
      sym: x.symbol.replace('USDT', ''),
      price: parseFloat(x.lastPrice),
      pct: parseFloat(x.priceChangePercent),
    }));
    await chrome.storage.local.set({ market, updatedAt: Date.now() });
    chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', market }).catch(() => {});
    render(market);
  } catch {
    try {
      const stored = await chrome.storage.local.get('market');
      if (stored.market?.length) {
        render(stored.market);
      } else if (speech) {
        speech.textContent = 'Binance feed unreachable right now. Click R to retry.';
      }
    } catch {}
  }
}

document.getElementById('btn-speak')?.addEventListener('click', () => {
  if (!lastBrief || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(lastBrief);
  u.lang = 'en-US';
  u.pitch = 1.06;
  u.rate = 1.0;
  window.speechSynthesis.speak(u);
});

window.addEventListener('unload', () => {
  try { window.speechSynthesis?.cancel(); } catch {}
});

const btnWidget = document.getElementById('btn-widget');
chrome.storage.local.get('widgetEnabled').then(({ widgetEnabled }) => {
  const on = widgetEnabled !== false;
  if (btnWidget) btnWidget.textContent = on ? 'WIDGET: ON' : 'WIDGET: OFF';
});
btnWidget?.addEventListener('click', async () => {
  const { widgetEnabled } = await chrome.storage.local.get('widgetEnabled');
  const next = widgetEnabled === false;
  await chrome.storage.local.set({ widgetEnabled: next });
  btnWidget.textContent = next ? 'WIDGET: ON' : 'WIDGET: OFF';
});

document.getElementById('btn-refresh')?.addEventListener('click', fetchLive);
fetchLive();
