let lastBrief = '';
let lastPose = 'peace';
let isSpeaking = false;
let miniReady = false;
let currentMarket = [];
let currentFG = null;
let currentSolNet = null;
let currentPinned = [];
let currentScanToken = null;
let activePageCtx = null;
let selectedFocusMin = 25;
let selectedFocusMode = 'focus';
let stageMode = 'full';
let aiHistory = [];

const BAG_COINS = ['SOL', 'BTC', 'ETH', 'JUP'];

const yuzuFrame = document.getElementById('yuzu-3d-frame');
const stageWrap = document.getElementById('mini-3d-wrap');
const stageCard = document.getElementById('mini-stage-card');
const speechEl = document.getElementById('yuzu-speech');

// Detect Chrome Side Panel context (taller viewport than standard popup)
function checkSidePanelMode() {
  if (window.innerHeight > 605 || window.innerWidth > 420) {
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
  return a && a.length > 12 ? `${a.slice(0, 5)}…${a.slice(-4)}` : a || '';
}

function setYuzuLine(text, pose = null) {
  if (text && speechEl) {
    speechEl.textContent = text;
    lastBrief = text;
  }
  if (pose) {
    lastPose = pose;
    notify3D({ type: 'YUZU_POSE', pose });
  }
}

// =========================================================================
// MINI 3D STAGE BRIDGE, SIDE PANEL LAUNCHER & KEYBOARD SHORTCUTS
// =========================================================================
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

setTimeout(() => {
  if (yuzuFrame && !yuzuFrame.getAttribute('src')) {
    yuzuFrame.src = 'https://yuzuha-simulator.vercel.app/?mini=1';
  }
}, 60);

document.getElementById('btn-open-sidepanel')?.addEventListener('click', async () => {
  try {
    if (chrome.sidePanel?.open) {
      const win = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: win.id });
      window.close();
    }
  } catch {}
});

const btnToggle3D = document.getElementById('btn-toggle-3d');
function applyStageMode(mode) {
  stageMode = mode;
  stageCard?.classList.remove('compact', 'collapsed');
  if (mode === 'compact') stageCard?.classList.add('compact');
  if (mode === 'collapsed') stageCard?.classList.add('collapsed');
  if (btnToggle3D) {
    btnToggle3D.textContent = mode === 'full' ? '3D ▾' : mode === 'compact' ? '3D ▸' : '3D ▴';
  }
}

btnToggle3D?.addEventListener('click', () => {
  const next = stageMode === 'full' ? 'compact' : stageMode === 'compact' ? 'collapsed' : 'full';
  applyStageMode(next);
  chrome.storage.local.set({ stageMode: next });
});

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === tabName));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tabName}`));
  if (stageMode !== 'collapsed') {
    applyStageMode(tabName === 'pulse' ? 'full' : 'compact');
  }
  if (tabName === 'focus') renderFocusAndWebStats();
  if (tabName === 'scan') probeActiveTabContext();
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
});

// Keyboard shortcuts: '/' focuses scanner, Alt+1..4 switches tabs
window.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (e.key === '/' && !inField) {
    e.preventDefault();
    switchTab('scan');
    document.getElementById('scan-input')?.focus();
  } else if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
    e.preventDefault();
    const map = { '1': 'pulse', '2': 'scan', '3': 'focus', '4': 'ai' };
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
function setSpeakingUI(on) {
  isSpeaking = on;
  if (btnSpeak) btnSpeak.textContent = on ? 'STOP VOICE' : 'VOICE BRIEF';
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
  const u = new SpeechSynthesisUtterance(text);
  u.lang = /[а-яіїєґё]/i.test(text) ? 'ru-RU' : 'en-US';
  u.pitch = 1.06;
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
window.addEventListener('pagehide', () => {
  try {
    window.speechSynthesis?.cancel();
  } catch {}
});

// =========================================================================
// TAB 1: PULSE (MACRO + SPARKLINE + SOL TPS + BAGS + WATCHLIST + ALERTS)
// =========================================================================
function renderFGSparkline(history) {
  const svg = document.getElementById('fg-sparkline');
  if (!svg || !Array.isArray(history) || history.length < 2) return;
  const minV = Math.min(...history, 10);
  const maxV = Math.max(...history, 90);
  const span = Math.max(1, maxV - minV);
  const pts = history
    .map((v, idx) => {
      const x = (idx / (history.length - 1)) * 56;
      const y = 14 - ((v - minV) / span) * 12;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const lastVal = history[history.length - 1];
  const stroke = lastVal >= 55 ? '#b8ff65' : lastVal <= 40 ? '#ff8bcb' : '#72e7ff';
  svg.innerHTML = `<polyline fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />`;
}

function buildBrief(market, fg, solNet) {
  const sorted = [...market].sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const sol = market.find((m) => m.sym === 'SOL');
  const fgPart = fg ? `Sentiment is ${fg.value} (${fg.label}). ` : '';
  const tpsPart = solNet?.tps ? `Solana running at ${solNet.tps.toLocaleString()} TPS. ` : '';
  const leadText =
    best.pct >= 0
      ? `${best.sym} leads at +${best.pct.toFixed(1)}%`
      : `Strongest hold is ${best.sym} (${best.pct.toFixed(1)}%)`;
  lastPose = best.pct > 2.5 ? 'dance' : worst.pct < -4 ? 'pout' : 'peace';
  return `${fgPart}${leadText}, ${worst.sym} at ${worst.pct.toFixed(1)}%. SOL is ${sol ? fmtPrice(sol.price) : '—'}. ${tpsPart}`.trim();
}

function renderPulse(market, source = '', updatedAt = 0, fg = null, solNet = null, pinned = null) {
  if (!Array.isArray(market) || !market.length) return;
  currentMarket = market;
  if (fg) currentFG = fg;
  if (solNet) currentSolNet = solNet;
  if (Array.isArray(pinned)) currentPinned = pinned;

  const sorted = [...market].sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const lblGainer = document.getElementById('lbl-gainer');
  if (lblGainer) lblGainer.textContent = best.pct >= 0 ? 'TOP GAINER' : 'STRONGEST';
  document.getElementById('top-gainer').textContent = `${best.sym} ${best.pct >= 0 ? '+' : ''}${best.pct.toFixed(1)}%`;
  document.getElementById('top-loser').textContent = `${worst.sym} ${worst.pct.toFixed(1)}%`;

  // Macro Breadth, Volume & Solana TPS
  const upCount = market.filter((m) => m.pct >= 0).length;
  const downCount = market.length - upCount;
  const totalVol = market.reduce((s, m) => s + (Number(m.volUsd) || 0), 0);
  const breadthEl = document.getElementById('macro-breadth');
  const volEl = document.getElementById('macro-vol');
  const tpsEl = document.getElementById('sol-tps-pill');
  if (breadthEl) breadthEl.textContent = `${upCount} UP / ${downCount} DOWN`;
  if (volEl) volEl.textContent = totalVol > 0 ? `24h Vol ${fmtCompactUsd(totalVol)}` : 'Spot Majors';
  if (tpsEl && currentSolNet?.tps) {
    tpsEl.textContent = `⚡ ${currentSolNet.tps.toLocaleString()} TPS`;
    tpsEl.title = `Solana Mainnet: ${currentSolNet.status}`;
  }

  // Fear & Greed + 7D Sparkline
  if (currentFG) {
    const fgLabel = document.getElementById('fg-label');
    const fgFill = document.getElementById('fg-bar-fill');
    if (fgLabel) {
      fgLabel.textContent = `${currentFG.value} · ${currentFG.label.toUpperCase()}`;
      fgLabel.style.color = currentFG.value >= 55 ? '#b8ff65' : currentFG.value <= 40 ? '#ff8bcb' : '#72e7ff';
    }
    if (fgFill) fgFill.style.width = `${Math.min(100, Math.max(4, currentFG.value))}%`;
    renderFGSparkline(currentFG.history);
  }

  const metaEl = document.getElementById('feed-meta');
  if (metaEl) {
    const secs = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : 0;
    metaEl.textContent = source ? `${source.toUpperCase()} · ${secs < 5 ? 'NOW' : secs + 'S'}` : 'LIVE 24H';
  }

  const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');
  if (activeTab === 'pulse' || !lastBrief) {
    setYuzuLine(buildBrief(market, currentFG, currentSolNet), lastPose);
  }

  const list = document.getElementById('coin-list');
  list.innerHTML = market
    .map((m) => {
      const cls = m.pct >= 0 ? 'up' : 'down';
      const sign = m.pct >= 0 ? '+' : '';
      const chartUrl = `https://www.tradingview.com/symbols/${m.sym}USDT/`;
      const span = (m.high24h || 0) - (m.low24h || 0);
      const posPct = span > 0 ? Math.min(96, Math.max(4, ((m.price - m.low24h) / span) * 100)) : 50;
      const volTxt = m.volUsd > 0 ? `Vol ${fmtCompactUsd(m.volUsd)}` : '24h range';
      return `<div class="row">
        <a class="row-link sym" href="${chartUrl}" target="_blank" rel="noopener" title="Open ${esc(m.sym)} TradingView chart">${esc(m.sym)}</a>
        <div class="range-col" title="24h Low: ${fmtPrice(m.low24h)} — High: ${fmtPrice(m.high24h)}">
          <div class="range-bar"><span class="range-dot" style="left:${posPct.toFixed(0)}%"></span></div>
          <span class="vol-lbl">${volTxt}</span>
        </div>
        <span class="price">${fmtPrice(m.price)}</span>
        <span class="pct ${cls}">${sign}${m.pct.toFixed(2)}%</span>
        <button class="bell-btn" data-pick-alert="${esc(m.sym)}" data-pick-price="${m.price}" title="Set price alert for ${esc(m.sym)}">🔔</button>
      </div>`;
    })
    .join('');

  list.querySelectorAll('button[data-pick-alert]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sym = btn.getAttribute('data-pick-alert');
      const pr = parseFloat(btn.getAttribute('data-pick-price') || '0');
      const symSel = document.getElementById('alert-sym');
      const targetInp = document.getElementById('alert-target');
      if (symSel) symSel.value = sym;
      if (targetInp && pr > 0) {
        const suggested = pr * 1.05;
        targetInp.value = suggested >= 100 ? Math.round(suggested) : suggested >= 1 ? suggested.toFixed(2) : suggested.toPrecision(3);
        targetInp.focus();
      }
    });
  });

  renderPortfolioValue();
  renderPinnedWatchlist();

  const sol = market.find((m) => m.sym === 'SOL');
  if (sol?.price) syncSolConverter(sol.price);
}

// Local Portfolio / Bags Estimator
async function initPortfolioEditor() {
  const { userBags = {} } = await chrome.storage.local.get('userBags');
  const grid = document.getElementById('bag-inputs-grid');
  if (grid) {
    grid.innerHTML = BAG_COINS.map(
      (sym) => `<div class="calc-field">
        <label>${sym}</label>
        <input type="number" step="any" min="0" placeholder="0" data-bag-sym="${sym}" value="${userBags[sym] || ''}" class="cyber-input" />
      </div>`
    ).join('');

    grid.querySelectorAll('input[data-bag-sym]').forEach((inp) => {
      inp.addEventListener('input', async () => {
        const st = await chrome.storage.local.get('userBags');
        const next = { ...(st.userBags || {}) };
        const s = inp.getAttribute('data-bag-sym');
        const v = parseFloat(inp.value || '0');
        if (v > 0) next[s] = v;
        else delete next[s];
        await chrome.storage.local.set({ userBags: next });
        renderPortfolioValue();
      });
    });
  }
  renderPortfolioValue();
}

async function renderPortfolioValue() {
  const { userBags = {} } = await chrome.storage.local.get('userBags');
  const totalEl = document.getElementById('bag-total-val');
  const pnlEl = document.getElementById('bag-24h-pnl');
  if (!totalEl || !pnlEl) return;

  let totalNow = 0;
  let totalPrev = 0;
  for (const sym of BAG_COINS) {
    const qty = Number(userBags[sym]) || 0;
    if (qty <= 0) continue;
    const c = currentMarket.find((m) => m.sym === sym);
    if (!c) continue;
    const val = qty * c.price;
    const prev = val / (1 + (c.pct || 0) / 100);
    totalNow += val;
    totalPrev += prev;
  }

  totalEl.textContent = `$${totalNow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (totalNow <= 0) {
    pnlEl.textContent = 'Click EDIT to track holdings';
    pnlEl.style.color = 'rgba(217,217,232,0.65)';
  } else {
    const diff = totalNow - totalPrev;
    const pct = totalPrev > 0 ? (diff / totalPrev) * 100 : 0;
    const sign = diff >= 0 ? '+' : '-';
    pnlEl.textContent = `${sign}$${Math.abs(diff).toFixed(2)} (${diff >= 0 ? '+' : ''}${pct.toFixed(1)}% 24h)`;
    pnlEl.style.color = diff >= 0 ? '#b8ff65' : '#ff8bcb';
  }
}

document.getElementById('btn-edit-bags')?.addEventListener('click', (e) => {
  const ed = document.getElementById('bag-editor');
  if (!ed) return;
  const open = ed.style.display === 'none';
  ed.style.display = open ? 'flex' : 'none';
  e.currentTarget.textContent = open ? 'DONE' : 'EDIT';
});

// Pinned On-Chain Watchlist
async function renderPinnedWatchlist() {
  const { pinnedTokens = [] } = await chrome.storage.local.get('pinnedTokens');
  currentPinned = pinnedTokens;
  const box = document.getElementById('pinned-watchlist-box');
  const list = document.getElementById('pinned-list');
  const cnt = document.getElementById('pinned-count-lbl');
  if (!box || !list) return;

  if (!pinnedTokens.length) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'flex';
  if (cnt) cnt.textContent = `${pinnedTokens.length} pinned`;

  list.innerHTML = pinnedTokens
    .map((t) => {
      const pct = Number(t.pct24h || 0);
      const cls = pct >= 0 ? 'up' : 'down';
      const sign = pct >= 0 ? '+' : '';
      return `<div class="row">
        <button class="row-link sym" data-open-scan="${esc(t.address)}" title="Audit $${esc(t.symbol)}">$${esc(t.symbol)}</button>
        <span class="vol-lbl">Liq ${fmtCompactUsd(t.liquidityUsd || 0)}</span>
        <span class="price">${fmtPrice(t.priceUsd)}</span>
        <span class="pct ${cls}">${sign}${pct.toFixed(1)}%</span>
        <button class="bell-btn" data-unpin="${esc(t.address)}" title="Unpin token">×</button>
      </div>`;
    })
    .join('');

  list.querySelectorAll('button[data-open-scan]').forEach((b) => {
    b.addEventListener('click', () => {
      switchTab('scan');
      triggerTokenScan(b.getAttribute('data-open-scan'));
    });
  });
  list.querySelectorAll('button[data-unpin]').forEach((b) => {
    b.addEventListener('click', async () => {
      const addr = b.getAttribute('data-unpin');
      const st = await chrome.storage.local.get('pinnedTokens');
      const next = (st.pinnedTokens || []).filter((x) => x.address !== addr);
      await chrome.storage.local.set({ pinnedTokens: next });
      renderPinnedWatchlist();
      if (currentScanToken?.address === addr) renderScanCard(currentScanToken);
    });
  });
}

// Price Target Alerts UI
async function renderPriceAlerts() {
  const { priceAlerts = [] } = await chrome.storage.local.get('priceAlerts');
  const wrap = document.getElementById('alert-pills');
  const countLbl = document.getElementById('alert-count-lbl');
  const activeCount = priceAlerts.filter((a) => !a.triggered).length;
  if (countLbl) countLbl.textContent = `${activeCount} active`;
  if (!wrap) return;

  if (!priceAlerts.length) {
    wrap.innerHTML = `<span class="sub-micro">Click 🔔 on any coin or enter a target price above.</span>`;
    return;
  }

  wrap.innerHTML = priceAlerts
    .map((a) => {
      const op = a.condition === 'above' ? '≥' : '≤';
      return `<span class="alert-pill ${a.triggered ? 'hit' : ''}">
        <b>${esc(a.sym)}</b> ${op} $${a.target} ${a.triggered ? '✓' : ''}
        <button data-del-alert="${esc(a.id)}" title="Remove alert">×</button>
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
  ].slice(0, 8);
  await chrome.storage.local.set({ priceAlerts: next });
  if (targetInput) targetInput.value = '';
  renderPriceAlerts();
  setYuzuLine(`Target locked! I'll ping you as soon as ${sym} goes ${condition} $${target}.`, 'peace');
});

// =========================================================================
// TAB 2: ON-CHAIN TOKEN SCANNER & WATCHLIST PINNING
// =========================================================================
async function renderScanCard(token) {
  const card = document.getElementById('scan-result-card');
  if (!card || !token) return;
  currentScanToken = token;

  const { pinnedTokens = [] } = await chrome.storage.local.get('pinnedTokens');
  const isPinned = pinnedTokens.some((p) => p.address.toLowerCase() === token.address.toLowerCase());

  const lvl = token.safety?.level || 'SAFE';
  const badgeCls = lvl === 'SAFE' || lvl === 'LIQ OK' ? 'safe' : lvl === 'HIGH RISK' ? 'risk' : 'warn';
  const buyPct = token.buyRatioPct ?? 50;
  const sellPct = 100 - buyPct;

  const momCell = (lbl, val) => {
    const v = Number(val) || 0;
    const col = v >= 0 ? '#b8ff65' : '#ff8bcb';
    return `<div class="mom-cell"><div class="micro">${lbl}</div><b style="color:${col}">${v >= 0 ? '+' : ''}${v.toFixed(1)}%</b></div>`;
  };

  const risks = token.safety?.risks || [];
  const lpTxt =
    token.safety?.lpLockedPct != null
      ? `LP Locked: ${token.safety.lpLockedPct}%`
      : token.safety?.auditedByRugCheck
      ? 'RugCheck Verified'
      : `${token.chainId.toUpperCase()} Pair`;
  const volRatioTxt = token.volToMcPct != null ? ` · Vol/MCap ${token.volToMcPct}%` : '';
  const riskTxt = risks.length
    ? `⚠️ Flags: ${risks.map((r) => esc(r.name)).join(' · ')}`
    : `✓ ${esc(lpTxt)}${esc(volRatioTxt)} · No critical contract risks`;

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
        <div class="scan-title">$${esc(token.symbol)} <span class="sub-micro">${esc(token.name)}</span></div>
        <div class="sub-micro">${esc(token.chainId.toUpperCase())} · ${esc(token.dexId.toUpperCase())} · Age ${esc(token.ageLabel)} · ${esc(shortCA(token.address))}</div>
      </div>
      <div class="scan-badges">
        <button id="btn-pin-token" class="pin-star-btn ${isPinned ? 'pinned' : ''}" title="Pin to PULSE Watchlist">${isPinned ? '★ PINNED' : '☆ PIN'}</button>
        <span class="safety-badge ${badgeCls}">${esc(lvl)}</span>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-box"><span class="micro">PRICE</span><b>${fmtPrice(token.priceUsd)}</b></div>
      <div class="kpi-box"><span class="micro">MCAP</span><b>${fmtCompactUsd(token.marketCap)}</b></div>
      <div class="kpi-box"><span class="micro">LIQUIDITY</span><b>${fmtCompactUsd(token.liquidityUsd)}</b></div>
      <div class="kpi-box"><span class="micro">24H VOL</span><b>${fmtCompactUsd(token.vol24h)}</b></div>
    </div>

    <div class="flow-wrap">
      <div class="flow-labels">
        <span class="lime-txt">BUYS ${token.buys24h.toLocaleString()} (${buyPct}%)</span>
        <span class="pink-txt">SELLS ${token.sells24h.toLocaleString()} (${sellPct}%)</span>
      </div>
      <div class="flow-bar"><div class="flow-buy" style="width:${buyPct}%"></div></div>
    </div>

    <div class="mom-grid">
      ${momCell('5M', token.priceChange?.m5)}
      ${momCell('1H', token.priceChange?.h1)}
      ${momCell('6H', token.priceChange?.h6)}
      ${momCell('24H', token.priceChange?.h24)}
    </div>

    <div class="risk-list" style="color:${risks.length ? '#ffd166' : '#b8ff65'}">${riskTxt}</div>

    <div class="scan-links">
      <a href="${esc(token.pairUrl)}" target="_blank" rel="noopener">DEXSCREENER ↗</a>
      <a href="${esc(jupUrl)}" target="_blank" rel="noopener">${token.chainId === 'solana' ? 'JUPITER ↗' : 'TRADE ↗'}</a>
      <a href="${esc(rugUrl)}" target="_blank" rel="noopener">${token.chainId === 'solana' ? 'RUGCHECK ↗' : 'CHART ↗'}</a>
      <button id="btn-copy-scanned-ca" data-ca="${esc(token.address)}">COPY CA</button>
    </div>
  `;

  document.getElementById('btn-pin-token')?.addEventListener('click', async () => {
    const st = await chrome.storage.local.get('pinnedTokens');
    const list = st.pinnedTokens || [];
    const exists = list.some((p) => p.address.toLowerCase() === token.address.toLowerCase());
    let next;
    if (exists) {
      next = list.filter((p) => p.address.toLowerCase() !== token.address.toLowerCase());
      setYuzuLine(`Removed $${token.symbol} from your Pulse watchlist.`, 'shy');
    } else {
      next = [
        {
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          chainId: token.chainId,
          priceUsd: token.priceUsd,
          pct24h: token.priceChange?.h24 || 0,
          liquidityUsd: token.liquidityUsd,
          marketCap: token.marketCap,
          pairUrl: token.pairUrl,
        },
        ...list,
      ].slice(0, 8);
      setYuzuLine(`Pinned $${token.symbol} to your Pulse tab! I'll keep its price & alerts updated.`, 'dance');
    }
    await chrome.storage.local.set({ pinnedTokens: next });
    renderScanCard(token);
    renderPinnedWatchlist();
  });

  document.getElementById('btn-copy-scanned-ca')?.addEventListener('click', (e) => {
    const ca = e.currentTarget.getAttribute('data-ca');
    if (ca) {
      navigator.clipboard?.writeText(ca);
      e.currentTarget.textContent = 'COPIED!';
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
        `<button class="chip-btn" data-scan-q="${esc(s.address)}">$${esc(String(s.symbol).replace(/^\$+/, ''))} · ${fmtPrice(s.priceUsd)}</button>`
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
    btn.textContent = '...';
    btn.disabled = true;
  }
  if (card) card.innerHTML = `<div class="empty-hint">Scanning DEX liquidity pools &amp; RugCheck contract audit for <b>${esc(shortCA(q))}</b>...</div>`;

  chrome.runtime.sendMessage({ type: 'SCAN_TOKEN', query: q }, (res) => {
    if (btn) {
      btn.textContent = 'SCAN';
      btn.disabled = false;
    }
    if (chrome.runtime.lastError || !res?.ok || !res.token) {
      const errMsg = res?.error || 'Could not reach DEX scanner right now.';
      if (card) card.innerHTML = `<div class="empty-hint pink-txt">${esc(errMsg)}</div>`;
      setYuzuLine(errMsg, 'pout');
      return;
    }
    renderScanCard(res.token);
    renderRecentScans();
    setYuzuLine(`$${res.token.symbol}: ${res.token.verdict}`, res.token.pose || 'peace');
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
        activePageCtx = ctx;
        const hostLbl = document.getElementById('ai-tab-host');
        if (hostLbl && ctx.host) hostLbl.textContent = ctx.host;

        const items = [
          ...(ctx.detectedCAs || []).map((ca) => ({ label: `CA ${shortCA(ca)}`, q: ca })),
          ...(ctx.detectedTickers || []).slice(0, 4).map((t) => ({ label: t, q: t })),
        ];
        const box = document.getElementById('page-detected-box');
        const wrap = document.getElementById('page-detected-chips');
        if (box && wrap && items.length) {
          box.style.display = 'flex';
          wrap.innerHTML = items
            .slice(0, 6)
            .map((it) => `<button class="chip-btn" data-page-q="${esc(it.q)}">${esc(it.label)}</button>`)
            .join('');
          wrap.querySelectorAll('button[data-page-q]').forEach((b) => {
            b.addEventListener('click', () => triggerTokenScan(b.getAttribute('data-page-q')));
          });
        }
      });
    });
  } catch {}
}

// =========================================================================
// TAB 3: FOCUS TIMER & LOCAL BROWSER SCREEN-TIME ANALYTICS
// =========================================================================
const CAT_META = [
  { key: 'work', label: 'Work / Dev', color: '#72e7ff' },
  { key: 'crypto', label: 'Crypto / Charts', color: '#b8ff65' },
  { key: 'social', label: 'Social / X', color: '#ff8bcb' },
  { key: 'media', label: 'Media', color: '#a66bff' },
  { key: 'other', label: 'Web', color: '#8e95b3' },
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
    streakLbl.textContent = `⚡ ${sess} session${sess === 1 ? '' : 's'} · ${mins}m focused today`;
  }

  if (focusTickInterval) {
    clearInterval(focusTickInterval);
    focusTickInterval = null;
  }

  if (focusState?.active && focusState.endsAt > Date.now()) {
    if (btn) btn.textContent = 'STOP';
    if (modeLbl) modeLbl.textContent = focusState.mode === 'break' ? 'RECHARGE // SHORT BREAK' : 'POMODORO // LOCKED IN';

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
    if (btn) btn.textContent = selectedFocusMode === 'break' ? 'START BREAK' : 'START FOCUS';
    if (modeLbl) modeLbl.textContent = selectedFocusMode === 'break' ? 'RECHARGE // SHORT BREAK' : 'POMODORO // DEEP FOCUS';
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
    totalEl.textContent = totalSec > 0 ? `${fmtDuration(totalSec)} · ${workShare}% Work` : 'Tracking active tabs...';
  }

  const stackBar = document.getElementById('cat-stack-bar');
  const legend = document.getElementById('cat-legend');
  if (stackBar && legend) {
    if (totalSec === 0) {
      stackBar.innerHTML = `<span style="width:100%;background:rgba(255,255,255,0.12)"></span>`;
      legend.innerHTML = CAT_META.slice(0, 4)
        .map((c) => `<span><i class="cat-dot" style="background:${c.color}"></i>${c.label} 0m</span>`)
        .join('');
    } else {
      stackBar.innerHTML = CAT_META.map((c) => {
        const val = day.categories?.[c.key] || 0;
        const pct = (val / totalSec) * 100;
        return pct > 0 ? `<span style="width:${pct.toFixed(1)}%;background:${c.color}"></span>` : '';
      }).join('');
      legend.innerHTML = CAT_META.filter((c) => (day.categories?.[c.key] || 0) > 0)
        .map((c) => {
          const val = day.categories?.[c.key] || 0;
          return `<span><i class="cat-dot" style="background:${c.color}"></i>${c.label} <b>${fmtDuration(val)}</b></span>`;
        })
        .join('');
    }
  }

  const domList = document.getElementById('top-domains-list');
  if (domList) {
    const entries = Object.entries(day.domains || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!entries.length) {
      domList.innerHTML = `<div class="empty-hint">Browse normally — Yuzu privately tallies active time per domain right in local storage (never uploaded).</div>`;
    } else {
      const maxSec = entries[0][1] || 1;
      domList.innerHTML = entries
        .map(([host, sec]) => {
          const w = Math.max(6, Math.round((sec / maxSec) * 100));
          return `<div class="domain-row">
            <div class="domain-meta"><b>${esc(host)}</b><span class="sub-micro">${fmtDuration(sec)}</span></div>
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
      setYuzuLine('Focus timer paused. Ready whenever you want to lock back in!', 'shy');
    });
  } else {
    chrome.runtime.sendMessage({ type: 'FOCUS_START', minutes: selectedFocusMin, mode: selectedFocusMode }, () => {
      renderFocusAndWebStats();
      setYuzuLine(
        selectedFocusMode === 'break'
          ? `5-minute breather started. Stretch and hydrate~`
          : `Locked in for ${selectedFocusMin} minutes! Close the noisy tabs — I'm watching the clock.`,
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
// TAB 4: MULTI-TURN AI COPILOT + PNL SIZER + ALPHA SCRATCHPAD
// =========================================================================
async function askYuzuAI(userPrompt, fallbackBuilder) {
  const outTxt = document.getElementById('ai-output-text');
  const outActs = document.getElementById('ai-out-actions');
  const sendBtn = document.getElementById('btn-ai-send');
  if (outTxt) {
    outTxt.classList.remove('ai-placeholder');
    outTxt.textContent = 'Yuzu is thinking...';
  }
  if (outActs) outActs.style.display = 'none';
  if (sendBtn) sendBtn.disabled = true;

  const sysPrompt =
    'You are Yuzu ($YUZU), a sharp, witty Cyber-Y2K 3D AI companion living in the user’s Chrome browser. ' +
    'Reply in the SAME language the user writes in (Russian, Ukrainian, or English). ' +
    'Keep answers concise (max 3 short sentences or 3 crisp bullets), insightful, zero cringe clichés, no rocket emojis.';

  let reply = '';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9500);
    const messages = [
      { role: 'system', content: sysPrompt },
      ...aiHistory.slice(-4),
      { role: 'user', content: userPrompt },
    ];
    const r = await fetch('https://yuzuha-simulator.vercel.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ messages }),
    });
    clearTimeout(timer);
    if (r.ok) {
      const j = await r.json();
      if (j?.content) reply = String(j.content).trim();
    }
  } catch {}

  if (!reply) {
    reply = fallbackBuilder ? fallbackBuilder() : 'Signal is rate-limited right now — try again in a few seconds!';
  }

  aiHistory.push({ role: 'user', content: userPrompt.slice(0, 350) }, { role: 'assistant', content: reply.slice(0, 350) });
  if (aiHistory.length > 6) aiHistory = aiHistory.slice(-6);

  if (outTxt) outTxt.textContent = reply;
  if (outActs) outActs.style.display = 'flex';
  if (sendBtn) sendBtn.disabled = false;
  setYuzuLine(reply.slice(0, 175) + (reply.length > 175 ? '…' : ''), 'peace');
}

document.querySelectorAll('button[data-ai-act]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const act = btn.getAttribute('data-ai-act');
    const st = await chrome.storage.local.get(['webStats', 'focusStats']);
    const dayWeb = st.webStats?.[todayKey()];
    const dayFocus = st.focusStats?.[todayKey()];

    if (act === 'summarize') {
      const srcText = activePageCtx?.selection || activePageCtx?.snippet || '';
      const title = activePageCtx?.title || 'Current Tab';
      if (!srcText) {
        askYuzuAI(`Give me a quick productivity tip since this browser tab has no readable article text.`, () =>
          `Open any article, docs page, or X thread (or highlight text first) and hit Summarize Tab — I'll boil it down into 3 bullets.`
        );
        return;
      }
      askYuzuAI(
        `Summarize this webpage ("${title}") into 3 ultra-crisp bullet points:\n\n${srcText.slice(0, 1600)}`,
        () => {
          const sentences = srcText.split(/(?<=[.!?])\s+/).filter((s) => s.length > 25).slice(0, 3);
          return `• ${title}\n• ${sentences.join('\n• ') || srcText.slice(0, 220)}`;
        }
      );
    } else if (act === 'xreply') {
      const tweet = activePageCtx?.selection || activePageCtx?.snippet?.slice(0, 700) || '';
      askYuzuAI(
        tweet
          ? `Write 2 short, witty, non-banal X/Twitter reply options (under 180 chars each, no hashtags, no emojis) responding to this post:\n"${tweet}"`
          : `Write 2 short, witty, non-banal Crypto Twitter observation lines from Yuzu's perspective (no hashtags, no rocket emojis).`,
        () =>
          `1) Everyone wants conviction until the chart tests their patience for 20 minutes.\n2) Noise fades fast — ship something people actually use.`
      );
    } else if (act === 'market') {
      const mSummary = currentMarket.map((m) => `${m.sym} $${m.price} (${m.pct >= 0 ? '+' : ''}${m.pct.toFixed(1)}%)`).join(', ');
      const fgTxt = currentFG ? `Fear & Greed: ${currentFG.value} (${currentFG.label})` : '';
      const tpsTxt = currentSolNet?.tps ? `Solana TPS: ${currentSolNet.tps}` : '';
      askYuzuAI(
        `Give a sharp 3-sentence market read based on live tape: ${fgTxt}, ${tpsTxt}. Prices: ${mSummary}.`,
        () => buildBrief(currentMarket, currentFG, currentSolNet)
      );
    } else if (act === 'roast') {
      const tot = fmtDuration(dayWeb?.totalSec || 0);
      const soc = fmtDuration(dayWeb?.categories?.social || 0);
      const cry = fmtDuration(dayWeb?.categories?.crypto || 0);
      const wrk = fmtDuration(dayWeb?.categories?.work || 0);
      const fSessions = dayFocus?.sessions || 0;
      askYuzuAI(
        `Playfully roast my browser habits today in 2-3 witty sentences: Total screen time ${tot}, Work/Dev ${wrk}, Social/Twitter ${soc}, Charts/Crypto ${cry}, Pomodoro sessions completed: ${fSessions}.`,
        () =>
          `${tot} online today (${soc} scrolling socials, ${cry} staring at candles, and ${fSessions} focus sessions). Start a 25m timer before the timeline eats your whole afternoon!`
      );
    }
  });
});

document.getElementById('btn-ai-send')?.addEventListener('click', () => {
  const inp = document.getElementById('ai-prompt-input');
  const q = inp?.value?.trim();
  if (!q) return;
  inp.value = '';
  askYuzuAI(q, () => `I'm right here! Free AI relay is catching its breath — ask me again in a moment.`);
});
document.getElementById('ai-prompt-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-ai-send')?.click();
});

document.getElementById('btn-ai-copy')?.addEventListener('click', (e) => {
  const txt = document.getElementById('ai-output-text')?.textContent || '';
  if (txt) {
    navigator.clipboard?.writeText(txt);
    e.currentTarget.textContent = 'COPIED';
    setTimeout(() => (e.currentTarget.textContent = 'COPY'), 1200);
  }
});
document.getElementById('btn-ai-speak')?.addEventListener('click', () => {
  const txt = document.getElementById('ai-output-text')?.textContent || '';
  speakText(txt);
});

// SOL Converter & Position PnL Sizer
let liveSolPrice = 0;
const convSol = document.getElementById('conv-sol');
const convUsd = document.getElementById('conv-usd');

function syncSolConverter(solPrice) {
  liveSolPrice = Number(solPrice) || 0;
  const rateEl = document.getElementById('calc-sol-rate');
  if (rateEl && liveSolPrice > 0) rateEl.textContent = `1 SOL = ${fmtPrice(liveSolPrice)}`;
  if (convSol && convUsd && liveSolPrice > 0 && document.activeElement !== convUsd) {
    const s = parseFloat(convSol.value || '1') || 0;
    convUsd.value = (s * liveSolPrice).toFixed(2);
  }
}

convSol?.addEventListener('input', () => {
  if (liveSolPrice > 0 && convUsd) {
    convUsd.value = ((parseFloat(convSol.value || '0') || 0) * liveSolPrice).toFixed(2);
  }
});
convUsd?.addEventListener('input', () => {
  if (liveSolPrice > 0 && convSol) {
    convSol.value = ((parseFloat(convUsd.value || '0') || 0) / liveSolPrice).toFixed(4);
  }
});

function recalcPnL() {
  const size = parseFloat(document.getElementById('pnl-size')?.value || '0') || 0;
  const entry = parseFloat(document.getElementById('pnl-entry')?.value || '0') || 0;
  const target = parseFloat(document.getElementById('pnl-target')?.value || '0') || 0;
  const out = document.getElementById('pnl-result');
  if (!out || entry <= 0 || size <= 0) return;
  const roi = ((target - entry) / entry) * 100;
  const profit = size * (roi / 100);
  const sign = roi >= 0 ? '+' : '';
  out.textContent = `ROI: ${sign}${roi.toFixed(1)}% · Net PnL: ${sign}$${profit.toFixed(2)} (Total $${(size + profit).toFixed(2)})`;
  out.style.color = roi >= 0 ? '#b8ff65' : '#ff8bcb';
  out.style.borderColor = roi >= 0 ? 'rgba(184,255,101,0.38)' : 'rgba(255,139,203,0.45)';
}
['pnl-size', 'pnl-entry', 'pnl-target'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', recalcPnL);
});
recalcPnL();

// Persistent Alpha Scratchpad
const alphaNotesEl = document.getElementById('alpha-notes');
let notesTimer = null;
alphaNotesEl?.addEventListener('input', () => {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    chrome.storage.local.set({ alphaNotes: alphaNotesEl.value });
  }, 250);
});
document.getElementById('btn-copy-notes')?.addEventListener('click', (e) => {
  if (alphaNotesEl?.value) {
    navigator.clipboard?.writeText(alphaNotesEl.value);
    e.currentTarget.textContent = 'COPIED!';
    setTimeout(() => (e.currentTarget.textContent = 'COPY'), 1200);
  }
});
document.getElementById('btn-clear-notes')?.addEventListener('click', () => {
  if (alphaNotesEl) alphaNotesEl.value = '';
  chrome.storage.local.set({ alphaNotes: '' });
});

// =========================================================================
// RIGHT-CLICK CONTEXT MENU HANDOFF (pendingAction)
// =========================================================================
async function consumePendingAction(action) {
  if (!action || Date.now() - (action.ts || 0) > 60000) return;
  await chrome.storage.local.remove('pendingAction');
  if (action.type === 'scan' && action.query) {
    switchTab('scan');
    triggerTokenScan(action.query);
  } else if (action.type === 'ai' && action.text) {
    switchTab('ai');
    askYuzuAI(
      `Explain this selection concisely or suggest a sharp reply if it's a social post:\n"${action.text}"`,
      () => `Selected: "${action.text.slice(0, 180)}..."`
    );
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.pendingAction?.newValue) {
    consumePendingAction(changes.pendingAction.newValue);
  }
});

// =========================================================================
// REFRESH & FOOTER CONTROLS
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
      renderPulse(resp.market, resp.source, resp.updatedAt, resp.fearGreed, resp.solNetwork, resp.pinnedTokens);
      renderPriceAlerts();
      return;
    }
    try {
      const stored = await chrome.storage.local.get(['market', 'source', 'updatedAt', 'fearGreed', 'solNetwork', 'pinnedTokens']);
      if (stored.market?.length) {
        renderPulse(stored.market, stored.source, stored.updatedAt, stored.fearGreed, stored.solNetwork, stored.pinnedTokens);
      } else if (speechEl) {
        speechEl.textContent = 'Live feed unreachable right now. Click ↻ to retry.';
      }
    } catch {}
  };

  const watchdog = setTimeout(() => finish(null), 4800);
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
    'pinnedTokens',
    'lastScan',
    'stageMode',
    'alphaNotes',
    'pendingAction',
  ])
  .then((st) => {
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
    if (st.stageMode) applyStageMode(st.stageMode);
    if (alphaNotesEl && st.alphaNotes) alphaNotesEl.value = st.alphaNotes;
    initPortfolioEditor();
    if (st.market?.length) {
      renderPulse(st.market, st.source, st.updatedAt, st.fearGreed, st.solNetwork, st.pinnedTokens);
    } else {
      renderPinnedWatchlist();
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
