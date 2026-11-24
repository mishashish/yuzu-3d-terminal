let lastBrief = '';
let lastPose = 'peace';
let isSpeaking = false;
let miniReady = false;

const yuzuFrame = document.getElementById('yuzu-3d-frame');
const stageWrap = document.getElementById('mini-3d-wrap');

function notify3D(payload) {
  if (!miniReady) return;
  try {
    yuzuFrame?.contentWindow?.postMessage(payload, '*');
  } catch {}
}

window.addEventListener('message', (e) => {
  if (e.data?.type === 'YUZU_MINI_READY') {
    miniReady = true;
    stageWrap?.classList.add('ready');
    notify3D({ type: 'YUZU_POSE', pose: lastPose });
  }
});

// Defer heavy 3D iframe boot slightly so cached prices & UI render instantaneously at 0ms
setTimeout(() => {
  if (yuzuFrame && !yuzuFrame.getAttribute('src')) {
    yuzuFrame.src = 'https://yuzuha-simulator.vercel.app/?mini=1';
  }
}, 60);

const fmtPrice = (p) => {
  if (p >= 1000) return `$${Math.round(p).toLocaleString('en-US')}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(6)}`;
};

function buildBrief(market) {
  const sorted = [...market].sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const sol = market.find((m) => m.sym === 'SOL');
  const leadText =
    best.pct >= 0
      ? `Top gainer is ${best.sym} at +${best.pct.toFixed(1)}%`
      : `Strongest holder is ${best.sym} at ${best.pct.toFixed(1)}%`;
  lastPose = best.pct > 2 ? 'dance' : worst.pct < -4 ? 'pout' : 'peace';
  return (
    `Degen market brief! ${leadText}, while ${worst.sym} dipped ${worst.pct.toFixed(1)}%. ` +
    `SOL is at ${sol ? fmtPrice(sol.price) : '—'}. ${worst.pct < -4 ? 'Time to buy the dip or wait for bounce?' : 'Market looks active, stay sharp!'}`
  );
}

function render(market, source = '', updatedAt = 0) {
  if (!Array.isArray(market) || !market.length) return;
  const sorted = [...market].sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const lblGainer = document.getElementById('lbl-gainer');
  if (lblGainer) lblGainer.textContent = best.pct >= 0 ? 'TOP GAINER' : 'STRONGEST';
  document.getElementById('top-gainer').textContent = `${best.sym} ${best.pct >= 0 ? '+' : ''}${best.pct.toFixed(1)}%`;
  document.getElementById('top-loser').textContent = `${worst.sym} ${worst.pct.toFixed(1)}%`;

  const metaEl = document.getElementById('feed-meta');
  if (metaEl) {
    const secs = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : 0;
    metaEl.textContent = source ? `${source.toUpperCase()} · ${secs < 5 ? 'NOW' : secs + 'S'}` : 'LIVE 24H';
  }

  lastBrief = buildBrief(market);
  document.getElementById('yuzu-speech').textContent = lastBrief;
  notify3D({ type: 'YUZU_POSE', pose: lastPose });

  const list = document.getElementById('coin-list');
  list.innerHTML = market
    .map((m) => {
      const cls = m.pct >= 0 ? 'up' : 'down';
      const sign = m.pct >= 0 ? '+' : '';
      const chartUrl = `https://www.tradingview.com/symbols/${m.sym}USDT/`;
      return `<a class="row" href="${chartUrl}" target="_blank" rel="noopener" title="Open ${m.sym} chart">
        <span class="sym">${m.sym}</span>
        <span class="price">${fmtPrice(m.price)}</span>
        <span class="pct ${cls}">${sign}${m.pct.toFixed(2)}%</span>
      </a>`;
    })
    .join('');
}

async function fetchDirectFallback() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4500);
  try {
    const r = await fetch('https://yuzuha-simulator.vercel.app/api/crypto', { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    if (Array.isArray(j?.market) && j.market.length) {
      const updatedAt = Date.now();
      await chrome.storage.local.set({ market: j.market, source: 'YUZU API', updatedAt });
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', market: j.market }, () => void chrome.runtime.lastError);
      return { market: j.market, source: 'YUZU API', updatedAt };
    }
  } catch {
  } finally {
    clearTimeout(t);
  }
  return null;
}

function requestRefresh() {
  const btn = document.getElementById('btn-refresh');
  const speech = document.getElementById('yuzu-speech');
  btn?.classList.add('spinning');

  let settled = false;
  const finish = async (resp) => {
    if (settled) return;
    settled = true;
    clearTimeout(watchdog);
    btn?.classList.remove('spinning');
    if (resp?.ok && resp.market?.length) {
      render(resp.market, resp.source, resp.updatedAt);
      return;
    }
    const direct = await fetchDirectFallback();
    if (direct?.market?.length) {
      render(direct.market, direct.source, direct.updatedAt);
      return;
    }
    try {
      const stored = await chrome.storage.local.get(['market', 'source', 'updatedAt']);
      if (stored.market?.length) {
        render(stored.market, stored.source, stored.updatedAt);
      } else if (speech) {
        speech.textContent = 'Live feed unreachable right now. Click R to retry.';
      }
    } catch {}
  };

  // Watchdog: if MV3 Service Worker cold-start stalls > 4.2s, fall back directly from popup!
  const watchdog = setTimeout(() => finish(null), 4200);

  try {
    chrome.runtime.sendMessage({ type: 'REFRESH_MARKET' }, (resp) => {
      if (chrome.runtime.lastError) finish(null);
      else finish(resp);
    });
  } catch {
    finish(null);
  }
}

let cachedVoices = [];
const loadVoices = () => {
  cachedVoices = window.speechSynthesis?.getVoices?.() || [];
};
loadVoices();
if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;

function pickCleanEnglishVoice() {
  const voices = cachedVoices.length ? cachedVoices : (window.speechSynthesis?.getVoices?.() || []);
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const prefs = [/aria|jenny|natural|neural|google us/i, /samantha|zira|female/i];
  for (const re of prefs) {
    const f = en.find((v) => re.test(v.name));
    if (f) return f;
  }
  return en[0] || voices[0] || null;
}

const btnSpeak = document.getElementById('btn-speak');
const setSpeakingUI = (on) => {
  isSpeaking = on;
  if (btnSpeak) btnSpeak.textContent = on ? 'STOP VOICE' : 'VOICE BRIEF';
  stageWrap?.classList.toggle('speaking', on);
  notify3D({ type: 'YUZU_SPEAK', speaking: on, pose: lastPose });
};

btnSpeak?.addEventListener('click', () => {
  if (!window.speechSynthesis) return;
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    setSpeakingUI(false);
    return;
  }
  if (!lastBrief) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(lastBrief);
  u.lang = 'en-US';
  u.pitch = 1.06;
  u.rate = 1.0;
  const v = pickCleanEnglishVoice();
  if (v) u.voice = v;
  u.onstart = () => setSpeakingUI(true);
  u.onend = () => setSpeakingUI(false);
  u.onerror = () => setSpeakingUI(false);
  window.speechSynthesis.speak(u);
});

window.addEventListener('pagehide', () => {
  try { window.speechSynthesis?.cancel(); } catch {}
});

const btnWidget = document.getElementById('btn-widget');
const btnAlerts = document.getElementById('btn-alerts');

chrome.storage.local.get(['widgetEnabled', 'alertsEnabled', 'market', 'source', 'updatedAt']).then((st) => {
  const wOn = st.widgetEnabled !== false;
  const aOn = st.alertsEnabled !== false;
  if (btnWidget) {
    btnWidget.textContent = wOn ? 'WIDGET: ON' : 'WIDGET: OFF';
    btnWidget.classList.toggle('off', !wOn);
  }
  if (btnAlerts) {
    btnAlerts.textContent = aOn ? 'ALERTS: ON' : 'ALERTS: OFF';
    btnAlerts.classList.toggle('off', !aOn);
  }
  if (st.market?.length) render(st.market, st.source, st.updatedAt);
  requestRefresh();
});

btnWidget?.addEventListener('click', async () => {
  const { widgetEnabled } = await chrome.storage.local.get('widgetEnabled');
  const next = widgetEnabled === false;
  await chrome.storage.local.set({ widgetEnabled: next });
  btnWidget.textContent = next ? 'WIDGET: ON' : 'WIDGET: OFF';
  btnWidget.classList.toggle('off', !next);
});

btnAlerts?.addEventListener('click', async () => {
  const { alertsEnabled } = await chrome.storage.local.get('alertsEnabled');
  const next = alertsEnabled === false;
  await chrome.storage.local.set({ alertsEnabled: next });
  btnAlerts.textContent = next ? 'ALERTS: ON' : 'ALERTS: OFF';
  btnAlerts.classList.toggle('off', !next);
});

document.getElementById('btn-refresh')?.addEventListener('click', requestRefresh);
