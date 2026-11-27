// =========================================================================
// $YUZU TERMINAL v2.5.0 — LARGE 3D STAGE + CUSTOM CRYPTO SEARCH & WATCHLIST
// =========================================================================

let lastBrief = '';
let lastPose = 'peace';
let isSpeaking = false;
let miniReady = false;
let currentMarket = [];
let currentFG = null;
let currentSolNet = null;
let currentBadgeSym = 'SOL';
let currentUserBags = {};
let currentScanToken = null;
let expandedCoinId = null;
let marketSort = { key: 'default', dir: 'desc' };
let selectedFocusMin = 25;
let selectedFocusMode = 'focus';
let stageVisible = true; // Large 186px 3D stage ON by default!

const CAM_MODES = [
  { key: 'mini', label: 'CAM: CLOSE' },
  { key: 'miniWaist', label: 'CAM: WAIST' },
  { key: 'miniFull', label: 'CAM: FULL' },
];
let camModeIdx = 0;

const OUTFIT_MODES = ['full', 'open', 'beach'];
let outfitModeIdx = 0;

const POPULAR_COINS = [
  { sym: 'SOL', name: 'Solana', binance: 'SOLUSDT', okx: 'SOL-USDT', cg: 'solana' },
  { sym: 'BTC', name: 'Bitcoin', binance: 'BTCUSDT', okx: 'BTC-USDT', cg: 'bitcoin' },
  { sym: 'ETH', name: 'Ethereum', binance: 'ETHUSDT', okx: 'ETH-USDT', cg: 'ethereum' },
  { sym: 'SUI', name: 'Sui', binance: 'SUIUSDT', okx: 'SUI-USDT', cg: 'sui' },
  { sym: 'DOGE', name: 'Dogecoin', binance: 'DOGEUSDT', okx: 'DOGE-USDT', cg: 'dogecoin' },
  { sym: 'XRP', name: 'XRP', binance: 'XRPUSDT', okx: 'XRP-USDT', cg: 'ripple' },
  { sym: 'HYPE', name: 'Hyperliquid', binance: null, okx: 'HYPE-USDT', cg: 'hyperliquid' },
  { sym: 'TON', name: 'Toncoin', binance: 'TONUSDT', okx: 'TON-USDT', cg: 'the-open-network' },
  { sym: 'LINK', name: 'Chainlink', binance: 'LINKUSDT', okx: 'LINK-USDT', cg: 'chainlink' },
  { sym: 'AVAX', name: 'Avalanche', binance: 'AVAXUSDT', okx: 'AVAX-USDT', cg: 'avalanche-2' },
  { sym: 'JUP', name: 'Jupiter', binance: 'JUPUSDT', okx: 'JUP-USDT', cg: 'jupiter-exchange-solana' },
  { sym: 'WIF', name: 'dogwifhat', binance: 'WIFUSDT', okx: 'WIF-USDT', cg: 'dogwifcoin' },
  { sym: 'BONK', name: 'Bonk', binance: 'BONKUSDT', okx: 'BONK-USDT', cg: 'bonk' },
  { sym: 'PEPE', name: 'Pepe', binance: 'PEPEUSDT', okx: 'PEPE-USDT', cg: 'pepe' },
  { sym: 'PENGU', name: 'Pudgy Penguins', binance: 'PENGUUSDT', okx: 'PENGU-USDT', cg: 'pudgy-penguins' },
  { sym: 'TRUMP', name: 'OFFICIAL TRUMP', binance: 'TRUMPUSDT', okx: 'TRUMP-USDT', cg: 'official-trump' },
  { sym: 'RENDER', name: 'Render', binance: 'RENDERUSDT', okx: 'RENDER-USDT', cg: 'render-token' },
];

const yuzuFrame = document.getElementById('yuzu-3d-frame');
const stageWrap = document.getElementById('mini-3d-wrap');
const stageCard = document.getElementById('mini-stage-card');
const speechEl = document.getElementById('yuzu-speech');
const speechCompactEl = document.getElementById('yuzu-speech-compact');

function checkSidePanelMode() {
  if (window.innerHeight > 605 || window.innerWidth > 440) {
    document.body.classList.add('sidepanel-mode');
  }
}
checkSidePanelMode();
window.addEventListener('resize', checkSidePanelMode);

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function stripEmojis(str) {
  return String(str ?? '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function fmtPrice(p) {
  const n = Number(p) || 0;
  if (n <= 0) return '$0.00';
  if (n >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  const s = n.toFixed(12);
  const m = s.match(/^0\.(0*)(\d{1,4})/);
  if (m) {
    const zeros = m[1].length;
    const sub = '₀₁₂₃₄₅₆₇₈₉';
    if (zeros >= 4) {
      const zSub = String(zeros).split('').map((d) => sub[d]).join('');
      return `$0.0${zSub}${m[2].slice(0, 3)}`;
    }
  }
  return `$${n.toFixed(6)}`;
}

function fmtCompactUsd(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

function fmtDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function shortCA(a) {
  return a && a.length > 12 ? `${a.slice(0, 5)}...${a.slice(-4)}` : a || '';
}

function setYuzuLine(text, pose = null) {
  const clean = stripEmojis(text);
  if (clean) {
    if (speechEl) speechEl.textContent = clean;
    if (speechCompactEl) speechCompactEl.textContent = clean;
    lastBrief = clean;
  }
  if (pose) {
    lastPose = pose;
    notify3D({ type: 'YUZU_POSE', pose });
  }
}

// =========================================================================
// LARGE INTERACTIVE 3D STAGE BRIDGE & CONTROLS
// =========================================================================
function notify3D(payload) {
  if (!miniReady) return;
  try {
    yuzuFrame?.contentWindow?.postMessage(payload, '*');
  } catch { }
}

window.addEventListener('message', (e) => {
  if (e.data?.type === 'YUZU_MINI_READY') {
    miniReady = true;
    stageWrap?.classList.add('ready');
    notify3D({ type: 'YUZU_CAM', cam: CAM_MODES[camModeIdx].key });
    notify3D({ type: 'YUZU_POSE', pose: lastPose });
  }
});

function boot3DFrameIfNeeded() {
  if (stageVisible && yuzuFrame && !yuzuFrame.getAttribute('src')) {
    yuzuFrame.src = 'https://yuzuha-simulator.vercel.app/?mini=1';
  }
}

const btnToggle3D = document.getElementById('btn-toggle-3d');
function applyStageVisibility(visible) {
  stageVisible = visible !== false;
  stageCard?.classList.toggle('compact', !stageVisible);
  if (btnToggle3D) {
    btnToggle3D.textContent = stageVisible ? '3D ON' : '3D OFF';
    btnToggle3D.classList.toggle('active', stageVisible);
  }
  if (stageVisible) boot3DFrameIfNeeded();
}

btnToggle3D?.addEventListener('click', () => {
  applyStageVisibility(!stageVisible);
  chrome.storage.local.set({ yuzuStageSizeV2: stageVisible ? 'large' : 'compact' });
});

document.querySelectorAll('.stage-chip[data-pose]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const pose = btn.getAttribute('data-pose');
    if (pose) notify3D({ type: 'YUZU_POSE', pose });
  });
});

const btnStageCam = document.getElementById('btn-stage-cam');
btnStageCam?.addEventListener('click', () => {
  camModeIdx = (camModeIdx + 1) % CAM_MODES.length;
  const m = CAM_MODES[camModeIdx];
  btnStageCam.textContent = m.label;
  notify3D({ type: 'YUZU_CAM', cam: m.key });
  chrome.storage.local.set({ yuzuMiniCam: m.key });
});

document.getElementById('btn-stage-outfit')?.addEventListener('click', () => {
  outfitModeIdx = (outfitModeIdx + 1) % OUTFIT_MODES.length;
  const outfit = OUTFIT_MODES[outfitModeIdx];
  notify3D({ type: 'YUZU_OUTFIT', outfit });
  notify3D({ type: 'YUZU_POSE', pose: 'peace' });
});

document.getElementById('btn-open-sidepanel')?.addEventListener('click', async () => {
  try {
    if (chrome.sidePanel?.open) {
      const win = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: win.id });
      window.close();
    }
  } catch { }
});

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === tabName));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tabName}`));
  if (tabName === 'focus') renderFocusAndWebStats();
  if (tabName === 'scan') probeActiveTabContext();
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
});

window.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (e.key === '/' && !inField) {
    e.preventDefault();
    switchTab('pulse');
    document.getElementById('market-search-input')?.focus();
  } else if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
    e.preventDefault();
    const map = { '1': 'pulse', '2': 'scan', '3': 'focus', '4': 'tools' };
    switchTab(map[e.key]);
  }
});

// =========================================================================
// VOICE SYNTHESIS ENGINE
// =========================================================================
let cachedVoices = [];
const loadVoices = () => {
  cachedVoices = window.speechSynthesis?.getVoices?.() || [];
};
loadVoices();
if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;

function pickCleanEnglishVoice() {
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis?.getVoices?.() || [];
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const prefs = [/aria|jenny|natural|neural|google us/i, /samantha|zira|female/i];
  for (const re of prefs) {
    const f = en.find((v) => re.test(v.name));
    if (f) return f;
  }
  return en[0] || voices[0] || null;
}

const btnSpeak = document.getElementById('btn-speak');
const btnSpeakCompact = document.getElementById('btn-speak-compact');

function setSpeakingUI(on) {
  isSpeaking = on;
  if (btnSpeak) btnSpeak.textContent = on ? 'STOP' : 'SPEAK';
  if (btnSpeakCompact) btnSpeakCompact.textContent = on ? 'STOP' : 'SPEAK';
  stageWrap?.classList.toggle('speaking', on);
  notify3D({ type: 'YUZU_SPEAK', speaking: on, pose: lastPose });
}

function speakText(text) {
  if (!window.speechSynthesis || !text) return;
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    setSpeakingUI(false);
    return;
  }
  window.speechSynthesis.cancel();
  const clean = stripEmojis(text);
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = /[а-яіїєґё]/i.test(clean) ? 'ru-RU' : 'en-US';
  u.pitch = 1.05;
  u.rate = 1.01;
  if (u.lang === 'en-US') {
    const v = pickCleanEnglishVoice();
    if (v) u.voice = v;
  }
  u.onstart = () => setSpeakingUI(true);
  u.onend = () => setSpeakingUI(false);
  u.onerror = () => setSpeakingUI(false);
  window.speechSynthesis.speak(u);
}

btnSpeak?.addEventListener('click', () => speakText(lastBrief));
btnSpeakCompact?.addEventListener('click', () => speakText(lastBrief));
window.addEventListener('pagehide', () => {
  try {
    window.speechSynthesis?.cancel();
  } catch { }
});

// =========================================================================
// UNIVERSAL CRYPTO SEARCH & POPULAR DRAWER (TAB 1)
// =========================================================================
const mSearchInput = document.getElementById('market-search-input');
const mSearchClear = document.getElementById('btn-clear-msearch');
const mSearchResults = document.getElementById('market-search-results');
const popularDrawer = document.getElementById('popular-drawer');
const btnTogglePopular = document.getElementById('btn-toggle-popular');
let searchDebounce = null;
let lastSearchQuery = '';
let cachedSearchItems = [];

function isCoinTracked(candidate) {
  return currentMarket.some(
    (m) =>
      m.id?.toLowerCase() === String(candidate.id || '').toLowerCase() ||
      (candidate.kind !== 'dex' && m.kind !== 'dex' && m.sym.toUpperCase() === String(candidate.sym).toUpperCase())
  );
}

function renderPopularChips() {
  const wrap = document.getElementById('popular-chips');
  if (!wrap) return;
  wrap.innerHTML = POPULAR_COINS.map((c) => {
    const tracked = currentMarket.some((m) => m.kind !== 'dex' && m.sym === c.sym);
    return `<button class="chip ${tracked ? 'tracked' : ''}" data-pop-sym="${esc(c.sym)}">
      <b>${esc(c.sym)}</b> ${tracked ? 'TRACKING' : '+'}
    </button>`;
  }).join('');

  wrap.querySelectorAll('button[data-pop-sym]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sym = btn.getAttribute('data-pop-sym');
      const meta = POPULAR_COINS.find((c) => c.sym === sym);
      if (!meta) return;
      const existing = currentMarket.find((m) => m.kind !== 'dex' && m.sym === sym);
      if (existing) {
        mutateWatchlist({ action: 'remove', id: existing.id }, `Removed ${sym} from watchlist.`);
      } else {
        mutateWatchlist({ action: 'add', coin: { ...meta, id: `cex:${meta.sym}`, kind: 'cex' } }, `Now tracking ${sym} in Market.`);
      }
    });
  });
}

btnTogglePopular?.addEventListener('click', () => {
  if (!popularDrawer) return;
  const nextOpen = popularDrawer.style.display === 'none';
  popularDrawer.style.display = nextOpen ? 'flex' : 'none';
  btnTogglePopular.classList.toggle('active', nextOpen);
  if (nextOpen) renderPopularChips();
});

document.getElementById('btn-reset-watchlist')?.addEventListener('click', () => {
  mutateWatchlist({ action: 'reset' }, 'Watchlist restored to default coins.');
});

function renderSearchResults(items, query) {
  if (!mSearchResults) return;
  cachedSearchItems = items || [];
  if (!query) {
    mSearchResults.style.display = 'none';
    return;
  }
  mSearchResults.style.display = 'flex';
  if (!items || !items.length) {
    mSearchResults.innerHTML = `<span class="hint-line">No coins or active pools matched "${esc(query)}".</span>`;
    return;
  }

  mSearchResults.innerHTML = items
    .map((it, idx) => {
      const tracked = isCoinTracked(it);
      const sign = it.pct >= 0 ? '+' : '';
      const pctCol = it.pct >= 0 ? '#c8ff78' : '#f87171';
      const subMetric = it.liqUsd > 0 ? `Liq ${fmtCompactUsd(it.liqUsd)}` : it.volUsd > 0 ? `Vol ${fmtCompactUsd(it.volUsd)}` : it.name;
      return `<div class="sres-row">
        <div class="sres-meta">
          <div class="sres-title">
            <span>${esc(it.sym)}</span>
            <span class="src-badge">${esc(it.sourceTag || 'SPOT')}</span>
          </div>
          <span class="sres-sub">${esc(it.name)} · ${subMetric}</span>
        </div>
        <div class="sres-quote">
          <div style="color:#ffffff;font-weight:600">${fmtPrice(it.price)}</div>
          <div style="color:${pctCol}">${sign}${Number(it.pct || 0).toFixed(1)}%</div>
        </div>
        <div class="sres-actions">
          <button class="track-btn ${tracked ? 'added' : ''}" data-track-idx="${idx}">${tracked ? 'ADDED' : '+ TRACK'}</button>
          ${it.kind === 'dex' ? `<button class="inline-btn" data-scan-idx="${idx}" title="Audit contract">SCAN</button>` : ''}
        </div>
      </div>`;
    })
    .join('');

  mSearchResults.querySelectorAll('button[data-track-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-track-idx') || '0', 10);
      const coin = cachedSearchItems[idx];
      if (!coin) return;
      if (isCoinTracked(coin)) {
        const match = currentMarket.find(
          (m) => m.id?.toLowerCase() === coin.id.toLowerCase() || (coin.kind !== 'dex' && m.kind !== 'dex' && m.sym === coin.sym)
        );
        if (match) mutateWatchlist({ action: 'remove', id: match.id }, `Removed ${coin.sym} from watchlist.`);
      } else {
        mutateWatchlist({ action: 'add', coin }, `Added ${coin.sym} to your live watchlist.`);
      }
    });
  });

  mSearchResults.querySelectorAll('button[data-scan-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-scan-idx') || '0', 10);
      const coin = cachedSearchItems[idx];
      if (!coin) return;
      switchTab('scan');
      triggerTokenScan(coin.address || coin.sym);
    });
  });
}

function runMarketSearch(raw) {
  const q = String(raw ?? mSearchInput?.value ?? '').trim();
  lastSearchQuery = q;
  if (mSearchClear) mSearchClear.style.display = q ? 'block' : 'none';
  if (!q) {
    if (mSearchResults) mSearchResults.style.display = 'none';
    renderWatchlistRows();
    return;
  }

  // Also filter existing table live if short query, while querying global crypto API
  renderWatchlistRows();

  if (mSearchResults) {
    mSearchResults.style.display = 'flex';
    mSearchResults.innerHTML = `<span class="hint-line">Searching global spot &amp; DEX feeds for "${esc(q)}"...</span>`;
  }

  chrome.runtime.sendMessage({ type: 'SEARCH_CRYPTO', query: q }, (res) => {
    if (lastSearchQuery !== q) return;
    if (chrome.runtime.lastError || !res?.ok) {
      if (mSearchResults) mSearchResults.innerHTML = `<span class="hint-line">Search temporarily unavailable.</span>`;
      return;
    }
    renderSearchResults(res.results || [], q);
  });
}

mSearchInput?.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const val = mSearchInput.value.trim();
  if (!val) {
    runMarketSearch('');
    return;
  }
  searchDebounce = setTimeout(() => runMarketSearch(val), 260);
});

mSearchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(searchDebounce);
    runMarketSearch(mSearchInput.value.trim());
  } else if (e.key === 'Escape') {
    if (mSearchInput) mSearchInput.value = '';
    runMarketSearch('');
  }
});

mSearchClear?.addEventListener('click', () => {
  if (mSearchInput) mSearchInput.value = '';
  runMarketSearch('');
  mSearchInput?.focus();
});

function mutateWatchlist(payload, speechMsg = '') {
  chrome.runtime.sendMessage({ type: 'WATCHLIST_MUTATE', ...payload }, (resp) => {
    if (chrome.runtime.lastError) return;
    if (resp?.badgeSym) currentBadgeSym = resp.badgeSym;
    if (resp?.market?.length) {
      renderPulse(resp.market, resp.source, resp.updatedAt, resp.fearGreed, resp.solNetwork, resp.badgeSym);
    }
    if (popularDrawer?.style.display !== 'none') renderPopularChips();
    if (lastSearchQuery && cachedSearchItems.length) {
      renderSearchResults(cachedSearchItems, lastSearchQuery);
    }
    if (speechMsg) setYuzuLine(speechMsg, 'peace');
  });
}

// =========================================================================
// TAB 1: MARKET KPIs, PORTFOLIO, INTERACTIVE WATCHLIST & ALERTS
// =========================================================================
function renderFGSparkline(history) {
  const svg = document.getElementById('fg-sparkline');
  if (!svg || !Array.isArray(history) || history.length < 2) return;
  const minV = Math.min(...history, 10);
  const maxV = Math.max(...history, 90);
  const span = Math.max(1, maxV - minV);
  const pts = history
    .map((v, idx) => {
      const x = (idx / (history.length - 1)) * 46;
      const y = 13 - ((v - minV) / span) * 11;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const lastVal = history[history.length - 1];
  const stroke = lastVal >= 55 ? '#c8ff78' : lastVal <= 40 ? '#f87171' : '#9be8ff';
  svg.innerHTML = `<polyline fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />`;
}

function buildBrief(market, fg, solNet) {
  const sorted = [...market].sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const primary =
    market.find((m) => m.sym.toUpperCase() === String(currentBadgeSym || 'SOL').toUpperCase()) ||
    market.find((m) => m.sym === 'SOL') ||
    best;
  const fgPart = fg ? `F&G ${fg.value} (${fg.label}). ` : '';
  const tpsPart = solNet?.tps ? `${solNet.tps.toLocaleString()} TPS.` : '';
  const leadText =
    best.pct >= 0 ? `${best.sym} +${best.pct.toFixed(1)}%` : `${best.sym} ${best.pct.toFixed(1)}%`;
  lastPose = best.pct > 2.5 ? 'dance' : worst.pct < -4 ? 'pout' : 'peace';
  return `${fgPart}${leadText}, ${worst.sym} ${worst.pct.toFixed(1)}%. ${primary.sym} ${fmtPrice(primary.price)}. ${tpsPart}`.trim();
}

function syncCoinDropdowns() {
  const alertSel = document.getElementById('alert-sym');
  const convSel = document.getElementById('conv-sym');
  if (!currentMarket.length) return;

  const prevAlert = alertSel?.value;
  const prevConv = convSel?.value;

  const optsHtml = currentMarket
    .map((m) => `<option value="${esc(m.sym)}">${esc(m.sym)}</option>`)
    .join('');

  if (alertSel) {
    alertSel.innerHTML = optsHtml;
    if (prevAlert && currentMarket.some((m) => m.sym === prevAlert)) alertSel.value = prevAlert;
  }
  if (convSel) {
    convSel.innerHTML = optsHtml;
    if (prevConv && currentMarket.some((m) => m.sym === prevConv)) {
      convSel.value = prevConv;
    } else if (currentMarket.some((m) => m.sym === 'SOL')) {
      convSel.value = 'SOL';
    }
    syncConverterRate();
  }
}

function renderWatchlistRows() {
  const list = document.getElementById('coin-list');
  const countLbl = document.getElementById('watchlist-count-lbl');
  if (!list) return;

  let rows = [...currentMarket];
  if (marketSort.key === 'pct') {
    rows.sort((a, b) => (marketSort.dir === 'desc' ? b.pct - a.pct : a.pct - b.pct));
  } else if (marketSort.key === 'price') {
    rows.sort((a, b) => (marketSort.dir === 'desc' ? b.price - a.price : a.price - b.price));
  }

  if (countLbl) countLbl.textContent = `WATCHLIST (${currentMarket.length})`;

  list.innerHTML = rows
    .map((m) => {
      const id = m.id || `cex:${m.sym}`;
      const isOpen = expandedCoinId === id;
      const isBadge = String(m.sym).toUpperCase() === String(currentBadgeSym || 'SOL').toUpperCase();
      const cls = m.pct >= 0 ? 'up' : 'down';
      const sign = m.pct >= 0 ? '+' : '';
      const span = (m.high24h || 0) - (m.low24h || 0);
      const posPct = span > 0 ? Math.min(95, Math.max(5, ((m.price - m.low24h) / span) * 100)) : 50;

      const bagQty = Number(currentUserBags[m.sym]) || 0;
      const bagUsd = bagQty * m.price;
      const subText =
        bagQty > 0
          ? `${bagQty} = ${fmtPrice(bagUsd)}`
          : m.liqUsd > 0
          ? `Liq ${fmtCompactUsd(m.liqUsd)}`
          : m.volUsd > 0
          ? `Vol ${fmtCompactUsd(m.volUsd)}`
          : m.name || 'Spot';

      return `<div class="coin-item-wrap ${isOpen ? 'open' : ''}" data-coin-id="${esc(id)}">
        <div class="row" data-toggle-row="${esc(id)}">
          <div class="asset-cell">
            <div class="sym-line">
              <span class="row-sym">${esc(m.sym)}</span>
              ${m.pinnedTop ? '<span class="mini-tag top">TOP</span>' : ''}
              ${isBadge ? '<span class="mini-tag icon">ICON</span>' : ''}
              ${m.kind === 'dex' ? '<span class="mini-tag dex">DEX</span>' : ''}
            </div>
            <span class="vol-sub ${bagQty > 0 ? 'bag-sub' : ''}">${esc(subText)}</span>
          </div>
          <div class="range-track" title="24h Low ${fmtPrice(m.low24h)} — High ${fmtPrice(m.high24h)}">
            <span class="range-thumb" style="left:${posPct.toFixed(0)}%"></span>
          </div>
          <span class="price-cell">${fmtPrice(m.price)}</span>
          <span class="pct-pill ${cls}">${sign}${m.pct.toFixed(2)}%</span>
          <button class="row-del-btn" data-del-coin="${esc(id)}" data-del-sym="${esc(m.sym)}" title="Remove ${esc(m.sym)}">×</button>
        </div>

        <div class="row-drawer">
          <div class="drawer-top">
            <div class="drawer-bag-group">
              <span class="label">HOLDINGS</span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value="${bagQty > 0 ? bagQty : ''}"
                data-inline-bag="${esc(m.sym)}"
                class="field drawer-bag-inp"
              />
              <span class="muted-mono" data-inline-bag-val="${esc(m.sym)}">${bagQty > 0 ? fmtPrice(bagUsd) : '$0.00'}</span>
            </div>
            <span class="muted-mono">L ${fmtPrice(m.low24h)} · H ${fmtPrice(m.high24h)}</span>
          </div>
          <div class="drawer-actions">
            <button class="d-btn ${m.pinnedTop ? 'active' : ''}" data-top-coin="${esc(id)}">${m.pinnedTop ? 'PINNED TOP' : 'PIN TOP'}</button>
            <button class="d-btn ${isBadge ? 'active' : ''}" data-badge-sym="${esc(m.sym)}" title="Show this coin on Chrome icon &amp; page overlay">${isBadge ? 'ON ICON' : 'SET ICON'}</button>
            <button class="d-btn" data-quick-alert="${esc(m.sym)}" data-qdir="above" data-qprice="${m.price}">+5% ALERT</button>
            <button class="d-btn" data-quick-alert="${esc(m.sym)}" data-qdir="below" data-qprice="${m.price}">-5% ALERT</button>
            <a class="d-btn" href="${esc(m.chartUrl)}" target="_blank" rel="noopener">CHART</a>
            ${m.kind === 'dex' && m.address ? `<button class="d-btn" data-open-scan="${esc(m.address)}">AUDIT</button>` : ''}
          </div>
        </div>
      </div>`;
    })
    .join('');

  // Row expand/collapse
  list.querySelectorAll('[data-toggle-row]').forEach((rowEl) => {
    rowEl.addEventListener('click', (e) => {
      if (e.target.closest('button[data-del-coin]')) return;
      const id = rowEl.getAttribute('data-toggle-row');
      expandedCoinId = expandedCoinId === id ? null : id;
      renderWatchlistRows();
    });
  });

  // Remove coin
  list.querySelectorAll('button[data-del-coin]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-del-coin');
      const sym = btn.getAttribute('data-del-sym');
      if (expandedCoinId === id) expandedCoinId = null;
      mutateWatchlist({ action: 'remove', id }, `Removed ${sym} from watchlist.`);
    });
  });

  // Inline Holdings input
  list.querySelectorAll('input[data-inline-bag]').forEach((inp) => {
    inp.addEventListener('click', (e) => e.stopPropagation());
    inp.addEventListener('input', async () => {
      const sym = inp.getAttribute('data-inline-bag');
      const v = parseFloat(inp.value || '0');
      if (v > 0) currentUserBags[sym] = v;
      else delete currentUserBags[sym];
      await chrome.storage.local.set({ userBags: currentUserBags });
      const coin = currentMarket.find((x) => x.sym === sym);
      const valSpan = list.querySelector(`[data-inline-bag-val="${CSS.escape(sym)}"]`);
      if (valSpan && coin) valSpan.textContent = v > 0 ? fmtPrice(v * coin.price) : '$0.00';
      renderPortfolioValue();
      initPortfolioEditor();
    });
  });

  // Pin to Top
  list.querySelectorAll('button[data-top-coin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mutateWatchlist({ action: 'toggleTop', id: btn.getAttribute('data-top-coin') });
    });
  });

  // Set as Chrome Toolbar Icon & Overlay Badge coin
  list.querySelectorAll('button[data-badge-sym]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sym = btn.getAttribute('data-badge-sym');
      currentBadgeSym = sym;
      mutateWatchlist({ action: 'setBadge', sym }, `${sym} is now pinned to your Chrome icon & page overlay.`);
      renderWatchlistRows();
    });
  });

  // 1-Click +5% / -5% Alert
  list.querySelectorAll('button[data-quick-alert]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const sym = btn.getAttribute('data-quick-alert');
      const cond = btn.getAttribute('data-qdir') || 'above';
      const baseP = parseFloat(btn.getAttribute('data-qprice') || '0');
      if (!(baseP > 0)) return;
      const rawTarget = cond === 'above' ? baseP * 1.05 : baseP * 0.95;
      const target = Number(rawTarget >= 100 ? Math.round(rawTarget) : rawTarget >= 1 ? rawTarget.toFixed(2) : rawTarget.toPrecision(3));
      const { priceAlerts = [] } = await chrome.storage.local.get('priceAlerts');
      const next = [
        { id: `${Date.now().toString(36)}`, sym, condition: cond, target, triggered: false, createdAt: Date.now() },
        ...priceAlerts,
      ].slice(0, 10);
      await chrome.storage.local.set({ priceAlerts: next });
      renderPriceAlerts();
      setYuzuLine(`Alert set: ${sym} ${cond === 'above' ? '>=' : '<='} $${target}.`, 'peace');
    });
  });

  // Audit DEX coin in Scanner
  list.querySelectorAll('button[data-open-scan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab('scan');
      triggerTokenScan(btn.getAttribute('data-open-scan'));
    });
  });
}

// Column header sorting
document.querySelectorAll('.th-sort').forEach((th) => {
  th.addEventListener('click', () => {
    const key = th.getAttribute('data-sort') || 'default';
    if (marketSort.key === key && key !== 'default') {
      marketSort.dir = marketSort.dir === 'desc' ? 'asc' : 'desc';
    } else {
      marketSort = { key, dir: 'desc' };
    }
    document.querySelectorAll('.th-sort').forEach((b) => b.classList.toggle('active', b === th));
    renderWatchlistRows();
  });
});

function renderPulse(market, source = '', updatedAt = 0, fg = null, solNet = null, badgeSym = null) {
  if (!Array.isArray(market) || !market.length) return;
  currentMarket = market;
  if (fg) currentFG = fg;
  if (solNet) currentSolNet = solNet;
  if (badgeSym) currentBadgeSym = badgeSym;

  const upCount = market.filter((m) => m.pct >= 0).length;
  const downCount = market.length - upCount;
  const totalVol = market.reduce((s, m) => s + (Number(m.volUsd) || 0), 0);

  const breadthEl = document.getElementById('macro-breadth');
  const volEl = document.getElementById('macro-vol');
  const tpsEl = document.getElementById('sol-tps-pill');
  const tpsStatusEl = document.getElementById('sol-net-status');

  if (breadthEl) breadthEl.textContent = `${upCount} UP / ${downCount} DN`;
  if (volEl) volEl.textContent = totalVol > 0 ? `Vol ${fmtCompactUsd(totalVol)}` : '24h Live';
  if (tpsEl && currentSolNet?.tps) {
    tpsEl.textContent = `${currentSolNet.tps.toLocaleString()} TPS`;
  }
  if (tpsStatusEl && currentSolNet?.status) {
    tpsStatusEl.textContent = `Mainnet ${currentSolNet.status}`;
  }

  if (currentFG) {
    const fgScore = document.getElementById('fg-score');
    const fgLabel = document.getElementById('fg-label');
    const fgFill = document.getElementById('fg-bar-fill');
    const col = currentFG.value >= 55 ? '#c8ff78' : currentFG.value <= 40 ? '#f87171' : '#9be8ff';
    if (fgScore) {
      fgScore.textContent = String(currentFG.value);
      fgScore.style.color = col;
    }
    if (fgLabel) fgLabel.textContent = currentFG.label;
    if (fgFill) fgFill.style.width = `${Math.min(100, Math.max(4, currentFG.value))}%`;
    renderFGSparkline(currentFG.history);
  }

  const metaEl = document.getElementById('feed-meta');
  if (metaEl) {
    const secs = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : 0;
    metaEl.textContent = source ? `${source.toUpperCase()} · ${secs < 5 ? 'LIVE' : secs + 'S'}` : 'LIVE';
  }

  const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');
  if (activeTab === 'pulse' || !lastBrief) {
    setYuzuLine(buildBrief(market, currentFG, currentSolNet), lastPose);
  }

  syncCoinDropdowns();
  renderWatchlistRows();
  initPortfolioEditor();
  renderPortfolioValue();
}

// Portfolio Estimator (Supports ALL coins in Watchlist)
async function initPortfolioEditor() {
  const { userBags = {} } = await chrome.storage.local.get('userBags');
  currentUserBags = userBags;
  const grid = document.getElementById('bag-inputs-grid');
  if (!grid) return;

  const coins = currentMarket.length ? currentMarket.map((m) => m.sym) : ['SOL', 'BTC', 'ETH', 'SUI', 'JUP', 'WIF'];
  const uniqueSyms = [...new Set(coins)].slice(0, 12);

  grid.innerHTML = uniqueSyms
    .map(
      (sym) => `<div class="calc-field">
        <label>${esc(sym)}</label>
        <input type="number" step="any" min="0" placeholder="0" data-bag-sym="${esc(sym)}" value="${currentUserBags[sym] || ''}" class="field" />
      </div>`
    )
    .join('');

  grid.querySelectorAll('input[data-bag-sym]').forEach((inp) => {
    inp.addEventListener('input', async () => {
      const s = inp.getAttribute('data-bag-sym');
      const v = parseFloat(inp.value || '0');
      if (v > 0) currentUserBags[s] = v;
      else delete currentUserBags[s];
      await chrome.storage.local.set({ userBags: currentUserBags });
      renderPortfolioValue();
      renderWatchlistRows();
    });
  });
}

async function renderPortfolioValue() {
  const { userBags = {} } = await chrome.storage.local.get('userBags');
  currentUserBags = userBags;
  const totalEl = document.getElementById('bag-total-val');
  const pnlEl = document.getElementById('bag-24h-pnl');
  if (!totalEl || !pnlEl) return;

  let totalNow = 0;
  let totalPrev = 0;
  for (const [sym, qtyRaw] of Object.entries(userBags)) {
    const qty = Number(qtyRaw) || 0;
    if (qty <= 0) continue;
    const c = currentMarket.find((m) => m.sym.toUpperCase() === sym.toUpperCase());
    if (!c) continue;
    const val = qty * c.price;
    const prev = val / (1 + (c.pct || 0) / 100);
    totalNow += val;
    totalPrev += prev;
  }

  totalEl.textContent = `$${totalNow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (totalNow <= 0) {
    pnlEl.textContent = 'Click any coin or BAGS to set qty';
    pnlEl.style.color = '#7c899e';
  } else {
    const diff = totalNow - totalPrev;
    const pct = totalPrev > 0 ? (diff / totalPrev) * 100 : 0;
    const sign = diff >= 0 ? '+' : '-';
    pnlEl.textContent = `${sign}$${Math.abs(diff).toFixed(2)} (${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%)`;
    pnlEl.style.color = diff >= 0 ? '#c8ff78' : '#f87171';
  }
}

document.getElementById('btn-edit-bags')?.addEventListener('click', (e) => {
  const ed = document.getElementById('bag-editor');
  if (!ed) return;
  const open = ed.style.display === 'none';
  ed.style.display = open ? 'flex' : 'none';
  e.currentTarget.textContent = open ? 'CLOSE' : 'BAGS';
});

// Price Target Alerts
async function renderPriceAlerts() {
  const { priceAlerts = [] } = await chrome.storage.local.get('priceAlerts');
  const wrap = document.getElementById('alert-pills');
  const countLbl = document.getElementById('alert-count-lbl');
  const activeCount = priceAlerts.filter((a) => !a.triggered).length;
  if (countLbl) countLbl.textContent = `${activeCount} active`;
  if (!wrap) return;

  if (!priceAlerts.length) {
    wrap.innerHTML = `<span class="hint-line">Expand any coin for 1-click +/-5% alerts or enter a target above.</span>`;
    return;
  }

  wrap.innerHTML = priceAlerts
    .map((a) => {
      const op = a.condition === 'above' ? '>=' : '<=';
      return `<span class="chip ${a.triggered ? 'hit' : ''}">
        <b>${esc(a.sym)}</b> ${op} $${a.target}${a.triggered ? ' (HIT)' : ''}
        <button data-del-alert="${esc(a.id)}" title="Delete alert">×</button>
      </span>`;
    })
    .join('');

  wrap.querySelectorAll('button[data-del-alert]').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = b.getAttribute('data-del-alert');
      const st = await chrome.storage.local.get('priceAlerts');
      const next = (st.priceAlerts || []).filter((x) => x.id !== id);
      await chrome.storage.local.set({ priceAlerts: next });
      renderPriceAlerts();
    });
  });
}

document.getElementById('btn-add-alert')?.addEventListener('click', async () => {
  const sym = document.getElementById('alert-sym')?.value || 'SOL';
  const condition = document.getElementById('alert-cond')?.value || 'above';
  const targetInput = document.getElementById('alert-target');
  const target = parseFloat(targetInput?.value || '');
  if (!target || target <= 0) return;

  const { priceAlerts = [] } = await chrome.storage.local.get('priceAlerts');
  const next = [
    { id: `${Date.now().toString(36)}`, sym, condition, target, triggered: false, createdAt: Date.now() },
    ...priceAlerts,
  ].slice(0, 10);
  await chrome.storage.local.set({ priceAlerts: next });
  if (targetInput) targetInput.value = '';
  renderPriceAlerts();
  setYuzuLine(`Alert set: ${sym} ${condition === 'above' ? '>=' : '<='} $${target}.`, 'peace');
});

// =========================================================================
// TAB 2: ON-CHAIN TOKEN SCANNER (UNIFIED WITH MARKET WATCHLIST)
// =========================================================================
async function renderScanCard(token) {
  const card = document.getElementById('scan-result-card');
  if (!card || !token) return;
  currentScanToken = token;

  const dexId = `dex:${token.chainId || 'solana'}:${token.address}`;
  const isTracked = currentMarket.some(
    (m) => m.id?.toLowerCase() === dexId.toLowerCase() || (m.address && m.address.toLowerCase() === token.address.toLowerCase())
  );

  const lvl = token.safety?.level || 'SAFE';
  const badgeCls = lvl === 'SAFE' || lvl === 'VERIFIED LIQ' ? 'safe' : lvl === 'HIGH RISK' ? 'risk' : 'warn';
  const buyPct = token.buyRatioPct ?? 50;
  const sellPct = 100 - buyPct;

  const momCell = (lbl, val) => {
    const v = Number(val) || 0;
    const col = v >= 0 ? '#c8ff78' : '#f87171';
    return `<div class="mom-cell"><div class="label" style="font-size:8px">${lbl}</div><b style="color:${col}">${v >= 0 ? '+' : ''}${v.toFixed(1)}%</b></div>`;
  };

  const risks = token.safety?.risks || [];
  const lpTxt =
    token.safety?.lpLockedPct != null
      ? `LP Locked: ${token.safety.lpLockedPct}%`
      : token.safety?.auditedByRugCheck
        ? 'RugCheck Verified'
        : `${token.chainId.toUpperCase()} Pool`;
  const volRatioTxt = token.volToMcPct != null ? ` · Vol/MCap ${token.volToMcPct}%` : '';
  const riskTxt = risks.length
    ? `Flags: ${risks.map((r) => esc(r.name)).join(' · ')}`
    : `${esc(lpTxt)}${esc(volRatioTxt)} · No critical contract flags`;

  const jupUrl =
    token.chainId === 'solana'
      ? `https://jup.ag/swap/SOL-${encodeURIComponent(token.address)}`
      : token.pairUrl;
  const rugUrl =
    token.chainId === 'solana'
      ? `https://rugcheck.xyz/tokens/${encodeURIComponent(token.address)}`
      : token.pairUrl;

  card.innerHTML = `
    <div class="scan-top">
      <div>
        <div class="scan-title">${esc(token.symbol)} <span class="muted-mono">${esc(token.name)}</span></div>
        <div class="muted-mono" style="margin-top:2px">${esc(token.chainId.toUpperCase())} · ${esc(token.dexId.toUpperCase())} · Age ${esc(token.ageLabel)} · ${esc(shortCA(token.address))}</div>
      </div>
      <div class="scan-badges">
        <button id="btn-pin-token" class="pin-btn ${isTracked ? 'pinned' : ''}">${isTracked ? 'TRACKING' : '+ TRACK'}</button>
        <span class="status-tag ${badgeCls}">${esc(lvl)}</span>
      </div>
    </div>

    <div class="kpi-grid-4">
      <div class="stat-cell"><span class="label" style="font-size:8px">PRICE</span><b>${fmtPrice(token.priceUsd)}</b></div>
      <div class="stat-cell"><span class="label" style="font-size:8px">MCAP</span><b>${fmtCompactUsd(token.marketCap)}</b></div>
      <div class="stat-cell"><span class="label" style="font-size:8px">LIQUIDITY</span><b>${fmtCompactUsd(token.liquidityUsd)}</b></div>
      <div class="stat-cell"><span class="label" style="font-size:8px">24H VOL</span><b>${fmtCompactUsd(token.vol24h)}</b></div>
    </div>

    <div class="flow-wrap">
      <div class="flow-labels">
        <span style="color:#c8ff78">BUYS ${buyPct}% (${token.buys24h.toLocaleString()})</span>
        <span style="color:#f87171">SELLS ${sellPct}% (${token.sells24h.toLocaleString()})</span>
      </div>
      <div class="flow-bar"><div class="flow-buy" style="width:${buyPct}%"></div></div>
    </div>

    <div class="mom-grid">
      ${momCell('5M', token.priceChange?.m5)}
      ${momCell('1H', token.priceChange?.h1)}
      ${momCell('6H', token.priceChange?.h6)}
      ${momCell('24H', token.priceChange?.h24)}
    </div>

    <div class="audit-note" style="color:${risks.length ? '#fbbf24' : '#cbd5e1'}">${riskTxt}</div>

    <div class="scan-links">
      <a href="${esc(token.pairUrl)}" target="_blank" rel="noopener">DEXSCREENER</a>
      <a href="${esc(jupUrl)}" target="_blank" rel="noopener">${token.chainId === 'solana' ? 'JUPITER' : 'TRADE'}</a>
      <a href="${esc(rugUrl)}" target="_blank" rel="noopener">${token.chainId === 'solana' ? 'RUGCHECK' : 'CHART'}</a>
      <button id="btn-copy-scanned-ca" data-ca="${esc(token.address)}">COPY CA</button>
    </div>
  `;

  document.getElementById('btn-pin-token')?.addEventListener('click', () => {
    const existing = currentMarket.find(
      (m) => m.id?.toLowerCase() === dexId.toLowerCase() || (m.address && m.address.toLowerCase() === token.address.toLowerCase())
    );
    if (existing) {
      chrome.runtime.sendMessage({ type: 'WATCHLIST_MUTATE', action: 'remove', id: existing.id }, (resp) => {
        if (resp?.market) renderPulse(resp.market, resp.source, resp.updatedAt, resp.fearGreed, resp.solNetwork, resp.badgeSym);
        renderScanCard(token);
        setYuzuLine(`Removed ${token.symbol} from Market watchlist.`, 'shy');
      });
    } else {
      const coin = {
        id: dexId,
        sym: token.symbol,
        name: token.name,
        kind: 'dex',
        address: token.address,
        chainId: token.chainId,
        pairUrl: token.pairUrl,
      };
      chrome.runtime.sendMessage({ type: 'WATCHLIST_MUTATE', action: 'add', coin }, (resp) => {
        if (resp?.market) renderPulse(resp.market, resp.source, resp.updatedAt, resp.fearGreed, resp.solNetwork, resp.badgeSym);
        renderScanCard(token);
        setYuzuLine(`Added ${token.symbol} to your live Market watchlist.`, 'dance');
      });
    }
  });

  document.getElementById('btn-copy-scanned-ca')?.addEventListener('click', (e) => {
    const ca = e.currentTarget.getAttribute('data-ca');
    if (ca) {
      navigator.clipboard?.writeText(ca);
      e.currentTarget.textContent = 'COPIED';
      setTimeout(() => {
        if (e.currentTarget) e.currentTarget.textContent = 'COPY CA';
      }, 1200);
    }
  });
}

async function renderRecentScans() {
  const { recentScans = [] } = await chrome.storage.local.get('recentScans');
  const box = document.getElementById('recent-scans-box');
  const wrap = document.getElementById('recent-scan-chips');
  if (!box || !wrap) return;
  if (!recentScans.length) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'flex';
  wrap.innerHTML = recentScans
    .map(
      (s) =>
        `<button class="chip" data-scan-q="${esc(s.address)}"><b>${esc(String(s.symbol).replace(/^\$+/, ''))}</b> ${fmtPrice(s.priceUsd)}</button>`
    )
    .join('');
  wrap.querySelectorAll('button[data-scan-q]').forEach((b) => {
    b.addEventListener('click', () => triggerTokenScan(b.getAttribute('data-scan-q')));
  });
}

function triggerTokenScan(query) {
  const inp = document.getElementById('scan-input');
  const btn = document.getElementById('btn-scan-go');
  const card = document.getElementById('scan-result-card');
  const q = String(query ?? inp?.value ?? '').trim();
  if (!q) return;
  if (inp) inp.value = q;
  if (btn) {
    btn.textContent = 'WAIT';
    btn.disabled = true;
  }
  if (card) {
    card.innerHTML = `<div class="empty-state"><p class="empty-desc">Querying DEX pools and RugCheck contract report for <b>${esc(shortCA(q))}</b>...</p></div>`;
  }

  chrome.runtime.sendMessage({ type: 'SCAN_TOKEN', query: q }, (res) => {
    if (btn) {
      btn.textContent = 'SCAN';
      btn.disabled = false;
    }
    if (chrome.runtime.lastError || !res?.ok || !res.token) {
      const errMsg = res?.error || 'Scanner unavailable right now.';
      if (card) card.innerHTML = `<div class="empty-state"><p class="empty-desc" style="color:#f87171">${esc(errMsg)}</p></div>`;
      setYuzuLine(errMsg, 'pout');
      return;
    }
    renderScanCard(res.token);
    renderRecentScans();
    setYuzuLine(`${res.token.symbol}: ${res.token.verdict}`, res.token.pose || 'peace');
  });
}

document.getElementById('btn-scan-go')?.addEventListener('click', () => triggerTokenScan());
document.getElementById('scan-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') triggerTokenScan();
});

function probeActiveTabContext() {
  try {
    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab?.id || /^chrome:|^edge:|^about:/i.test(tab.url || '')) return;
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT' }, (ctx) => {
        if (chrome.runtime.lastError || !ctx?.ok) return;
        const items = [
          ...(ctx.detectedCAs || []).map((ca) => ({ label: shortCA(ca), q: ca })),
          ...(ctx.detectedTickers || []).slice(0, 4).map((t) => ({ label: t, q: t })),
        ];
        const box = document.getElementById('page-detected-box');
        const wrap = document.getElementById('page-detected-chips');
        if (box && wrap && items.length) {
          box.style.display = 'flex';
          wrap.innerHTML = items
            .slice(0, 6)
            .map((it) => `<button class="chip" data-page-q="${esc(it.q)}">${esc(it.label)}</button>`)
            .join('');
          wrap.querySelectorAll('button[data-page-q]').forEach((b) => {
            b.addEventListener('click', () => triggerTokenScan(b.getAttribute('data-page-q')));
          });
        }
      });
    });
  } catch { }
}

// =========================================================================
// TAB 3: ACTIVITY (FOCUS TIMER & LOCAL SCREEN-TIME BREAKDOWN)
// =========================================================================
const CAT_META = [
  { key: 'work', label: 'Development & Work', color: '#9be8ff' },
  { key: 'crypto', label: 'Markets & Charts', color: '#c8ff78' },
  { key: 'social', label: 'Social & Feeds', color: '#e2e8f0' },
  { key: 'media', label: 'Video & Media', color: '#64748b' },
  { key: 'other', label: 'General Web', color: '#475569' },
];

let focusTickInterval = null;

function syncFocusTimerUI(focusState, todayFocus) {
  const disp = document.getElementById('focus-timer-display');
  const btn = document.getElementById('btn-focus-toggle');
  const modeLbl = document.getElementById('focus-mode-lbl');
  const streakLbl = document.getElementById('focus-streak-lbl');

  if (streakLbl) {
    const sess = todayFocus?.sessions || 0;
    const mins = todayFocus?.minutes || 0;
    streakLbl.textContent = `Completed today: ${sess} ${sess === 1 ? 'session' : 'sessions'} (${mins}m)`;
  }

  if (focusTickInterval) {
    clearInterval(focusTickInterval);
    focusTickInterval = null;
  }

  if (focusState?.active && focusState.endsAt > Date.now()) {
    if (btn) btn.textContent = 'STOP SESSION';
    if (modeLbl) modeLbl.textContent = focusState.mode === 'break' ? 'FOCUS TIMER // BREAK' : 'FOCUS TIMER // ACTIVE';

    const tick = () => {
      const rem = Math.max(0, Math.ceil((focusState.endsAt - Date.now()) / 1000));
      const mm = String(Math.floor(rem / 60)).padStart(2, '0');
      const ss = String(rem % 60).padStart(2, '0');
      if (disp) disp.textContent = `${mm}:${ss}`;
      if (rem <= 0) {
        clearInterval(focusTickInterval);
        renderFocusAndWebStats();
      }
    };
    tick();
    focusTickInterval = setInterval(tick, 1000);
  } else {
    if (btn) btn.textContent = selectedFocusMode === 'break' ? 'START BREAK' : 'START SESSION';
    if (modeLbl) modeLbl.textContent = selectedFocusMode === 'break' ? 'FOCUS TIMER // BREAK' : 'FOCUS TIMER // READY';
    if (disp) disp.textContent = `${String(selectedFocusMin).padStart(2, '0')}:00`;
  }
}

async function renderFocusAndWebStats() {
  const key = todayKey();
  const st = await chrome.storage.local.get(['webStats', 'focusState', 'focusStats']);
  const todayFocus = st.focusStats?.[key] || { sessions: 0, minutes: 0 };
  syncFocusTimerUI(st.focusState, todayFocus);

  const day = st.webStats?.[key] || {
    totalSec: 0,
    domains: {},
    categories: { work: 0, crypto: 0, social: 0, media: 0, other: 0 },
  };

  const totalEl = document.getElementById('web-total-time');
  const totalSec = Math.max(0, day.totalSec || 0);
  const workShare = totalSec > 0 ? Math.round(((day.categories?.work || 0) / totalSec) * 100) : 0;
  if (totalEl) {
    totalEl.textContent = totalSec > 0 ? `${fmtDuration(totalSec)} (${workShare}% Work)` : '0m tracked';
  }

  const stackBar = document.getElementById('cat-stack-bar');
  const legend = document.getElementById('cat-legend');
  if (stackBar && legend) {
    if (totalSec === 0) {
      stackBar.innerHTML = `<span style="width:100%;background:rgba(255,255,255,0.08)"></span>`;
      legend.innerHTML = CAT_META.slice(0, 4)
        .map(
          (c) =>
            `<div class="cat-item"><span><i class="cat-swatch" style="background:${c.color}"></i>${c.label}</span><b>0m</b></div>`
        )
        .join('');
    } else {
      stackBar.innerHTML = CAT_META.map((c) => {
        const val = day.categories?.[c.key] || 0;
        const pct = (val / totalSec) * 100;
        return pct > 0 ? `<span style="width:${pct.toFixed(1)}%;background:${c.color}"></span>` : '';
      }).join('');
      legend.innerHTML = CAT_META.filter((c) => (day.categories?.[c.key] || 0) > 0 || c.key !== 'other')
        .slice(0, 4)
        .map((c) => {
          const val = day.categories?.[c.key] || 0;
          return `<div class="cat-item"><span><i class="cat-swatch" style="background:${c.color}"></i>${c.label}</span><b>${fmtDuration(val)}</b></div>`;
        })
        .join('');
    }
  }

  const domList = document.getElementById('top-domains-list');
  if (domList) {
    const entries = Object.entries(day.domains || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!entries.length) {
      domList.innerHTML = `<p class="hint-line">Active tab time is tallied locally in browser storage as you browse.</p>`;
    } else {
      const maxSec = entries[0][1] || 1;
      domList.innerHTML = entries
        .map(([host, sec], idx) => {
          const w = Math.max(5, Math.round((sec / maxSec) * 100));
          const rank = String(idx + 1).padStart(2, '0');
          return `<div class="domain-row">
            <div class="domain-meta"><span><span class="muted-mono">${rank}</span> <b>${esc(host)}</b></span><span>${fmtDuration(sec)}</span></div>
            <div class="domain-bar-bg"><div class="domain-bar-fill" style="width:${w}%"></div></div>
          </div>`;
        })
        .join('');
    }
  }
}

document.querySelectorAll('button[data-fmin]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('button[data-fmin]').forEach((b) => b.classList.toggle('active', b === btn));
    selectedFocusMin = parseInt(btn.getAttribute('data-fmin') || '25', 10);
    selectedFocusMode = btn.getAttribute('data-fmode') || 'focus';
    chrome.storage.local.get(['focusState', 'focusStats']).then((st) => {
      if (!st.focusState?.active) {
        syncFocusTimerUI(null, st.focusStats?.[todayKey()]);
      }
    });
  });
});

document.getElementById('btn-focus-toggle')?.addEventListener('click', async () => {
  const { focusState } = await chrome.storage.local.get('focusState');
  if (focusState?.active && focusState.endsAt > Date.now()) {
    chrome.runtime.sendMessage({ type: 'FOCUS_STOP' }, () => {
      renderFocusAndWebStats();
      setYuzuLine('Session stopped. Ready when you want to resume.', 'shy');
    });
  } else {
    chrome.runtime.sendMessage({ type: 'FOCUS_START', minutes: selectedFocusMin, mode: selectedFocusMode }, () => {
      renderFocusAndWebStats();
      setYuzuLine(
        selectedFocusMode === 'break'
          ? `5-minute break started.`
          : `Focus timer set for ${selectedFocusMin} minutes.`,
        'dance'
      );
    });
  }
});

document.getElementById('btn-reset-webstats')?.addEventListener('click', async () => {
  const key = todayKey();
  const { webStats = {} } = await chrome.storage.local.get('webStats');
  delete webStats[key];
  await chrome.storage.local.set({ webStats });
  renderFocusAndWebStats();
});

// =========================================================================
// TAB 4: LOCAL TOOLS (ANY-COIN CONVERTER, R:R SIZER & NOTES)
// =========================================================================
const convSymSel = document.getElementById('conv-sym');
const convCoinInp = document.getElementById('conv-coin');
const convUsdInp = document.getElementById('conv-usd');

function getSelectedConvPrice() {
  const sym = convSymSel?.value || 'SOL';
  const c = currentMarket.find((m) => m.sym === sym);
  return { sym, price: Number(c?.price) || 0 };
}

function syncConverterRate() {
  const { sym, price } = getSelectedConvPrice();
  const rateEl = document.getElementById('calc-coin-rate');
  if (rateEl && price > 0) rateEl.textContent = `1 ${sym} = ${fmtPrice(price)}`;
  if (convCoinInp && convUsdInp && price > 0 && document.activeElement !== convUsdInp) {
    const qty = parseFloat(convCoinInp.value || '1') || 0;
    convUsdInp.value = (qty * price).toFixed(2);
  }
}

convSymSel?.addEventListener('change', syncConverterRate);
convCoinInp?.addEventListener('input', () => {
  const { price } = getSelectedConvPrice();
  if (price > 0 && convUsdInp) {
    convUsdInp.value = ((parseFloat(convCoinInp.value || '0') || 0) * price).toFixed(2);
  }
});
convUsdInp?.addEventListener('input', () => {
  const { price } = getSelectedConvPrice();
  if (price > 0 && convCoinInp) {
    convCoinInp.value = ((parseFloat(convUsdInp.value || '0') || 0) / price).toFixed(4);
  }
});

function recalcPnL() {
  const size = parseFloat(document.getElementById('pnl-size')?.value || '0') || 0;
  const entry = parseFloat(document.getElementById('pnl-entry')?.value || '0') || 0;
  const target = parseFloat(document.getElementById('pnl-target')?.value || '0') || 0;
  const stop = parseFloat(document.getElementById('pnl-stop')?.value || '0') || 0;
  const outTarget = document.getElementById('pnl-result');
  const outRisk = document.getElementById('pnl-risk');
  const rrBadge = document.getElementById('rr-badge');
  if (entry <= 0 || size <= 0) return;

  const targetRoi = ((target - entry) / entry) * 100;
  const targetUsd = size * (targetRoi / 100);
  const tSign = targetRoi >= 0 ? '+' : '-';
  if (outTarget) {
    outTarget.textContent = `TARGET: ${tSign}${Math.abs(targetRoi).toFixed(1)}% (${tSign}$${Math.abs(targetUsd).toFixed(2)})`;
  }

  const stopRoi = stop > 0 ? ((stop - entry) / entry) * 100 : 0;
  const stopUsd = size * (stopRoi / 100);
  const sSign = stopRoi >= 0 ? '+' : '-';
  if (outRisk) {
    outRisk.textContent =
      stop > 0 ? `STOP: ${sSign}${Math.abs(stopRoi).toFixed(1)}% (${sSign}$${Math.abs(stopUsd).toFixed(2)})` : 'STOP: —';
  }

  const rewardAbs = Math.abs(target - entry);
  const riskAbs = stop > 0 ? Math.abs(entry - stop) : 0;
  if (rrBadge) {
    rrBadge.textContent = riskAbs > 0 ? `R:R 1 : ${(rewardAbs / riskAbs).toFixed(2)}` : 'R:R —';
  }
}
['pnl-size', 'pnl-entry', 'pnl-target', 'pnl-stop'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', recalcPnL);
});
recalcPnL();

// Notes Scratchpad
const alphaNotesEl = document.getElementById('alpha-notes');
let notesTimer = null;
alphaNotesEl?.addEventListener('input', () => {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    chrome.storage.local.set({ alphaNotes: alphaNotesEl.value });
  }, 200);
});
document.getElementById('btn-copy-notes')?.addEventListener('click', (e) => {
  if (alphaNotesEl?.value) {
    navigator.clipboard?.writeText(alphaNotesEl.value);
    e.currentTarget.textContent = 'COPIED';
    setTimeout(() => (e.currentTarget.textContent = 'COPY'), 1200);
  }
});
document.getElementById('btn-clear-notes')?.addEventListener('click', () => {
  if (alphaNotesEl) alphaNotesEl.value = '';
  chrome.storage.local.set({ alphaNotes: '' });
});

// =========================================================================
// RIGHT-CLICK CONTEXT MENU HANDOFF
// =========================================================================
async function consumePendingAction(action) {
  if (!action || Date.now() - (action.ts || 0) > 60000) return;
  await chrome.storage.local.remove('pendingAction');
  if (action.type === 'scan' && action.query) {
    switchTab('scan');
    triggerTokenScan(action.query);
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.pendingAction?.newValue) {
    consumePendingAction(changes.pendingAction.newValue);
  }
});

// =========================================================================
// INITIAL BOOT & REFRESH
// =========================================================================
function requestRefresh() {
  const btn = document.getElementById('btn-refresh');
  btn?.classList.add('spinning');

  let settled = false;
  const finish = async (resp) => {
    if (settled) return;
    settled = true;
    clearTimeout(watchdog);
    btn?.classList.remove('spinning');
    if (resp?.ok && resp.market?.length) {
      renderPulse(resp.market, resp.source, resp.updatedAt, resp.fearGreed, resp.solNetwork, resp.badgeSym);
      renderPriceAlerts();
      if (currentScanToken) renderScanCard(currentScanToken);
      return;
    }
    try {
      const stored = await chrome.storage.local.get(['market', 'source', 'updatedAt', 'fearGreed', 'solNetwork', 'badgeSym']);
      if (stored.market?.length) {
        renderPulse(stored.market, stored.source, stored.updatedAt, stored.fearGreed, stored.solNetwork, stored.badgeSym);
      } else {
        setYuzuLine('Market feed unreachable. Click REFRESH to retry.');
      }
    } catch { }
  };

  const watchdog = setTimeout(() => finish(null), 5000);
  try {
    chrome.runtime.sendMessage({ type: 'REFRESH_MARKET' }, (resp) => {
      if (chrome.runtime.lastError) finish(null);
      else finish(resp);
    });
  } catch {
    finish(null);
  }
}

const btnWidget = document.getElementById('btn-widget');
const btnAlerts = document.getElementById('btn-alerts');

chrome.storage.local
  .get([
    'widgetEnabled',
    'alertsEnabled',
    'market',
    'source',
    'updatedAt',
    'fearGreed',
    'solNetwork',
    'badgeSym',
    'userBags',
    'lastScan',
    'yuzuStageSizeV2',
    'yuzuMiniCam',
    'alphaNotes',
    'pendingAction',
  ])
  .then((st) => {
    const wOn = st.widgetEnabled !== false;
    const aOn = st.alertsEnabled !== false;
    if (btnWidget) {
      btnWidget.textContent = wOn ? 'OVERLAY: ON' : 'OVERLAY: OFF';
      btnWidget.classList.toggle('off', !wOn);
    }
    if (btnAlerts) {
      btnAlerts.textContent = aOn ? 'ALERTS: ON' : 'ALERTS: OFF';
      btnAlerts.classList.toggle('off', !aOn);
    }

    currentBadgeSym = st.badgeSym || 'SOL';
    currentUserBags = st.userBags || {};

    if (st.yuzuMiniCam) {
      const idx = CAM_MODES.findIndex((c) => c.key === st.yuzuMiniCam);
      if (idx >= 0) {
        camModeIdx = idx;
        if (btnStageCam) btnStageCam.textContent = CAM_MODES[idx].label;
      }
    }

    // Default to LARGE 186px 3D stage unless user explicitly hid 3D in v2.5
    applyStageVisibility(st.yuzuStageSizeV2 !== 'compact');

    if (alphaNotesEl && st.alphaNotes) alphaNotesEl.value = st.alphaNotes;
    if (st.market?.length) {
      renderPulse(st.market, st.source, st.updatedAt, st.fearGreed, st.solNetwork, currentBadgeSym);
    } else {
      initPortfolioEditor();
    }
    if (st.lastScan) renderScanCard(st.lastScan);
    renderPriceAlerts();
    renderRecentScans();
    renderFocusAndWebStats();
    probeActiveTabContext();
    if (st.pendingAction) consumePendingAction(st.pendingAction);
    requestRefresh();
  });

btnWidget?.addEventListener('click', async () => {
  const { widgetEnabled } = await chrome.storage.local.get('widgetEnabled');
  const next = widgetEnabled === false;
  await chrome.storage.local.set({ widgetEnabled: next });
  btnWidget.textContent = next ? 'OVERLAY: ON' : 'OVERLAY: OFF';
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
