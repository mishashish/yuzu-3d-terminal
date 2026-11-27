const COINS = [
  { sym: 'SOL', okx: 'SOL-USDT', binance: 'SOLUSDT', cg: 'solana' },
  { sym: 'BTC', okx: 'BTC-USDT', binance: 'BTCUSDT', cg: 'bitcoin' },
  { sym: 'ETH', okx: 'ETH-USDT', binance: 'ETHUSDT', cg: 'ethereum' },
  { sym: 'WIF', okx: 'WIF-USDT', binance: 'WIFUSDT', cg: 'dogwifcoin' },
  { sym: 'BONK', okx: 'BONK-USDT', binance: 'BONKUSDT', cg: 'bonk' },
  { sym: 'PEPE', okx: 'PEPE-USDT', binance: 'PEPEUSDT', cg: 'pepe' },
  { sym: 'JUP', okx: 'JUP-USDT', binance: 'JUPUSDT', cg: 'jupiter-exchange-solana' },
];

let refreshInFlight = null;

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchJson(url, timeoutMs = 4800, init = null) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...(init || {}), signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function updateBadge(market, focusState) {
  try {
    if (focusState?.active && focusState.endsAt > Date.now()) {
      const remMin = Math.max(1, Math.ceil((focusState.endsAt - Date.now()) / 60000));
      chrome.action.setBadgeText({ text: `${remMin}m` });
      chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });
      return;
    }
    if (!Array.isArray(market) || !market.length) return;
    const sol = market.find((m) => m.sym === 'SOL') || market[0];
    if (!sol || Number.isNaN(sol.pct)) return;
    const sign = sol.pct >= 0 ? '+' : '';
    chrome.action.setBadgeText({ text: `${sign}${sol.pct.toFixed(0)}%` });
    chrome.action.setBadgeBackgroundColor({ color: sol.pct >= 0 ? '#15803d' : '#be123c' });
  } catch {}
}

function enrichBounds(item) {
  const price = Number(item.price) || 0;
  const pct = Number(item.pct) || 0;
  const approxSpan = Math.max(Math.abs(pct) / 100, 0.025);
  const low24h = item.low24h > 0 ? Number(item.low24h) : price * (1 - approxSpan * 0.65);
  const high24h = item.high24h > 0 ? Number(item.high24h) : price * (1 + approxSpan * 0.65);
  return {
    sym: item.sym,
    price,
    pct,
    low24h: Math.min(low24h, price),
    high24h: Math.max(high24h, price),
    volUsd: Number(item.volUsd) || 0,
  };
}

function normalizeYuzuApiPayload(j) {
  if (Array.isArray(j?.market) && j.market.length >= 4) {
    return j.market.map(enrichBounds);
  }
  if (Array.isArray(j) && j.length >= 4) {
    return j
      .filter((x) => x && x.symbol && x.lastPrice != null)
      .map((x) =>
        enrichBounds({
          sym: String(x.symbol).replace(/USDT$/i, ''),
          price: parseFloat(x.lastPrice),
          pct: parseFloat(x.priceChangePercent || 0),
          high24h: parseFloat(x.highPrice || 0),
          low24h: parseFloat(x.lowPrice || 0),
          volUsd: parseFloat(x.quoteVolume || 0),
        })
      )
      .filter((x) => !Number.isNaN(x.price) && x.price > 0);
  }
  return null;
}

async function fetchFromBinance() {
  const syms = encodeURIComponent(JSON.stringify(COINS.map((c) => c.binance)));
  const arr = await fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbols=${syms}`, 4200);
  if (!Array.isArray(arr) || !arr.length) return null;
  const map = new Map(arr.map((x) => [x.symbol, x]));
  const out = COINS.map((c) => {
    const x = map.get(c.binance);
    if (!x) return null;
    return enrichBounds({
      sym: c.sym,
      price: parseFloat(x.lastPrice),
      pct: parseFloat(x.priceChangePercent),
      high24h: parseFloat(x.highPrice || 0),
      low24h: parseFloat(x.lowPrice || 0),
      volUsd: parseFloat(x.quoteVolume || 0),
    });
  }).filter(Boolean);
  return out.length >= 4 ? out : null;
}

async function fetchFromOKX() {
  const results = await Promise.all(
    COINS.map(async (c) => {
      const j = await fetchJson(`https://www.okx.com/api/v5/market/ticker?instId=${c.okx}`, 4200);
      const d = j?.data?.[0];
      if (!d) return null;
      const last = parseFloat(d.last);
      const open = parseFloat(d.open24h);
      const pct = open > 0 ? ((last - open) / open) * 100 : 0;
      return enrichBounds({
        sym: c.sym,
        price: last,
        pct,
        high24h: parseFloat(d.high24h || 0),
        low24h: parseFloat(d.low24h || 0),
        volUsd: parseFloat(d.volCcy24h || 0),
      });
    })
  );
  const valid = results.filter(Boolean);
  return valid.length >= 4 ? valid : null;
}

async function fetchFromYuzuAPI() {
  const j = await fetchJson('https://yuzuha-simulator.vercel.app/api/crypto', 4000);
  const parsed = normalizeYuzuApiPayload(j);
  return parsed && parsed.length >= 4 ? parsed : null;
}

async function fetchFromCoinGecko() {
  const ids = COINS.map((c) => c.cg).join(',');
  const j = await fetchJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
    4500
  );
  if (!j) return null;
  const out = COINS.filter((c) => j[c.cg]?.usd != null).map((c) =>
    enrichBounds({
      sym: c.sym,
      price: Number(j[c.cg].usd),
      pct: Number(j[c.cg].usd_24h_change || 0),
      volUsd: Number(j[c.cg].usd_24h_vol || 0),
    })
  );
  return out.length >= 4 ? out : null;
}

async function fetchFearGreed(force = false) {
  try {
    const { fearGreed } = await chrome.storage.local.get('fearGreed');
    if (!force && fearGreed?.updatedAt && Date.now() - fearGreed.updatedAt < 15 * 60 * 1000) {
      return fearGreed;
    }
    const j = await fetchJson('https://api.alternative.me/fng/?limit=7', 4500);
    const rows = j?.data;
    if (!Array.isArray(rows) || !rows.length) return fearGreed || null;
    const fg = {
      value: parseInt(rows[0].value, 10) || 50,
      label: rows[0].value_classification || 'Neutral',
      history: rows.map((r) => parseInt(r.value, 10) || 50).reverse(),
      updatedAt: Date.now(),
    };
    await chrome.storage.local.set({ fearGreed: fg });
    return fg;
  } catch {
    return null;
  }
}

async function fetchSolanaTelemetry() {
  try {
    const { solNetwork } = await chrome.storage.local.get('solNetwork');
    if (solNetwork?.updatedAt && Date.now() - solNetwork.updatedAt < 60 * 1000) {
      return solNetwork;
    }
    const j = await fetchJson('https://solana-rpc.publicnode.com', 3800, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPerformanceSamples',
        params: [2],
      }),
    });
    const s = j?.result?.[0];
    if (!s || !s.samplePeriodSecs) return solNetwork || null;
    const totalTps = Math.round((s.numTransactions || 0) / s.samplePeriodSecs);
    const nonVote = s.numNonVoteTransactions != null ? Math.round(s.numNonVoteTransactions / s.samplePeriodSecs) : null;
    const status = totalTps >= 2200 ? 'OPTIMAL' : totalTps >= 1200 ? 'NORMAL' : 'BUSY';
    const info = { tps: totalTps, nonVoteTps: nonVote, status, updatedAt: Date.now() };
    await chrome.storage.local.set({ solNetwork: info });
    return info;
  } catch {
    return null;
  }
}

async function refreshPinnedWatchlist() {
  try {
    const { pinnedTokens = [] } = await chrome.storage.local.get('pinnedTokens');
    if (!Array.isArray(pinnedTokens) || !pinnedTokens.length) return [];
    const addrs = pinnedTokens.map((t) => t.address).slice(0, 8).join(',');
    const j = await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(addrs)}`, 4800);
    const pairs = Array.isArray(j?.pairs) ? j.pairs : [];
    if (!pairs.length) return pinnedTokens;

    const updated = pinnedTokens.map((pt) => {
      const matching = pairs
        .filter((p) => (p.baseToken?.address || '').toLowerCase() === pt.address.toLowerCase())
        .sort((a, b) => (Number(b.liquidity?.usd) || 0) - (Number(a.liquidity?.usd) || 0))[0];
      if (!matching) return pt;
      return {
        ...pt,
        priceUsd: parseFloat(matching.priceUsd || pt.priceUsd || 0),
        pct24h: Number(matching.priceChange?.h24 ?? pt.pct24h ?? 0),
        liquidityUsd: Number(matching.liquidity?.usd ?? pt.liquidityUsd ?? 0),
        marketCap: Number(matching.marketCap || matching.fdv || pt.marketCap || 0),
        pairUrl: matching.url || pt.pairUrl,
      };
    });
    await chrome.storage.local.set({ pinnedTokens: updated });
    return updated;
  } catch {
    const { pinnedTokens = [] } = await chrome.storage.local.get('pinnedTokens');
    return pinnedTokens;
  }
}

async function maybeNotifyMoversAndTargets(market, pinned = []) {
  try {
    const st = await chrome.storage.local.get(['alertsEnabled', 'lastAlertAt', 'priceAlerts']);
    const alertsOn = st.alertsEnabled !== false;
    const allAssets = [
      ...market.map((m) => ({ sym: m.sym, price: m.price, pct: m.pct })),
      ...pinned.map((p) => ({ sym: p.symbol, price: p.priceUsd, pct: p.pct24h || 0 })),
    ];

    if (alertsOn && Array.isArray(st.priceAlerts) && st.priceAlerts.length) {
      let changed = false;
      const updatedAlerts = st.priceAlerts.map((al) => {
        if (al.triggered) return al;
        const coin = allAssets.find((m) => m.sym.toUpperCase() === String(al.sym).toUpperCase());
        if (!coin) return al;
        const hit =
          (al.condition === 'above' && coin.price >= al.target) ||
          (al.condition === 'below' && coin.price <= al.target);
        if (hit) {
          changed = true;
          const op = al.condition === 'above' ? '>=' : '<=';
          chrome.notifications.create(`yuzu-target-${al.id}-${Date.now()}`, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: `$YUZU Price Alert: ${coin.sym} ${op} $${al.target}`,
            message: `${coin.sym} is at $${coin.price >= 1 ? coin.price.toFixed(2) : coin.price.toFixed(6)} (${coin.pct >= 0 ? '+' : ''}${coin.pct.toFixed(1)}% 24h).`,
          });
          return { ...al, triggered: true, triggeredAt: Date.now() };
        }
        return al;
      });
      if (changed) await chrome.storage.local.set({ priceAlerts: updatedAlerts });
    }

    if (!alertsOn) return;
    if (Date.now() - (st.lastAlertAt || 0) < 30 * 60 * 1000) return;

    const bigMover = [...market].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
    if (!bigMover || Math.abs(bigMover.pct) < 5) return;

    const dir = bigMover.pct > 0 ? 'UP' : 'DOWN';
    const sign = bigMover.pct > 0 ? '+' : '';
    chrome.notifications.create(`yuzu-alert-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `$YUZU Market Move: ${bigMover.sym} ${dir}`,
      message: `${bigMover.sym} moved ${sign}${bigMover.pct.toFixed(1)}% over 24h.`,
    });
    await chrome.storage.local.set({ lastAlertAt: Date.now() });
  } catch {}
}

function ensureAlarm() {
  try {
    chrome.alarms.get('yuzuMarketPoll', (existing) => {
      if (!existing) chrome.alarms.create('yuzuMarketPoll', { periodInMinutes: 1 });
    });
  } catch {}
}

async function _doRefreshMarket() {
  ensureAlarm();
  let market = null;
  let source = '';
  for (const [name, fn] of [
    ['Binance', fetchFromBinance],
    ['OKX', fetchFromOKX],
    ['YUZU API', fetchFromYuzuAPI],
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

  const [fearGreed, solNetwork, pinnedTokens, { focusState }] = await Promise.all([
    fetchFearGreed(false),
    fetchSolanaTelemetry(),
    refreshPinnedWatchlist(),
    chrome.storage.local.get('focusState'),
  ]);

  if (!market) {
    const cached = await chrome.storage.local.get(['market', 'source', 'updatedAt']);
    updateBadge(cached.market, focusState);
    return cached.market ? { ...cached, fearGreed, solNetwork, pinnedTokens } : null;
  }

  const updatedAt = Date.now();
  await chrome.storage.local.set({ market, source, updatedAt });
  updateBadge(market, focusState);
  maybeNotifyMoversAndTargets(market, pinnedTokens);
  return { market, source, updatedAt, fearGreed, solNetwork, pinnedTokens };
}

function refreshMarket() {
  if (!refreshInFlight) {
    refreshInFlight = _doRefreshMarket().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// =========================================================================
// ON-CHAIN TOKEN SCANNER (DexScreener + RugCheck v1)
// =========================================================================
async function scanToken(rawQuery) {
  const q = String(rawQuery || '').trim();
  if (!q) return { ok: false, error: 'Enter a contract address or ticker symbol.' };

  const isSolanaCA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);
  const isEvmCA = /^0x[a-fA-F0-9]{40}$/.test(q);

  const dexUrl =
    isSolanaCA || isEvmCA
      ? `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(q)}`
      : `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q.replace(/^\$/, ''))}`;

  const dexJson = await fetchJson(dexUrl, 5500);
  const pairs = Array.isArray(dexJson?.pairs) ? dexJson.pairs : [];
  if (!pairs.length) {
    return { ok: false, error: 'No active DEX liquidity pools found for that query.' };
  }

  const sortedPairs = [...pairs].sort((a, b) => {
    const liqA = (Number(a.liquidity?.usd) || 0) * (a.chainId === 'solana' ? 1.15 : 1);
    const liqB = (Number(b.liquidity?.usd) || 0) * (b.chainId === 'solana' ? 1.15 : 1);
    return liqB - liqA;
  });
  const best = sortedPairs[0];
  const baseAddr = best.baseToken?.address || q;
  const isSol = best.chainId === 'solana';

  let rug = null;
  if (isSol && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(baseAddr)) {
    rug = await fetchJson(`https://api.rugcheck.xyz/v1/tokens/${baseAddr}/report/summary`, 4200);
  }

  const priceUsd = parseFloat(best.priceUsd || 0);
  const marketCap = Number(best.marketCap || best.fdv || 0);
  const liquidityUsd = Number(best.liquidity?.usd || 0);
  const vol24h = Number(best.volume?.h24 || 0);
  const vol1h = Number(best.volume?.h1 || 0);
  const buys24h = Number(best.txns?.h24?.buys || 0);
  const sells24h = Number(best.txns?.h24?.sells || 0);
  const totalTx24h = buys24h + sells24h;
  const buyRatioPct = totalTx24h > 0 ? Math.round((buys24h / totalTx24h) * 100) : 50;

  const priceChange = {
    m5: Number(best.priceChange?.m5 || 0),
    h1: Number(best.priceChange?.h1 || 0),
    h6: Number(best.priceChange?.h6 || 0),
    h24: Number(best.priceChange?.h24 || 0),
  };

  const risks = Array.isArray(rug?.risks)
    ? rug.risks.slice(0, 4).map((r) => ({ name: r.name, level: r.level || 'warn' }))
    : [];
  const scoreNorm = rug?.score_normalised != null ? Number(rug.score_normalised) : null;
  const lpLockedPct = rug?.lpLockedPct != null ? Math.round(Number(rug.lpLockedPct)) : null;

  let safetyLevel = 'SAFE';
  const hasDangerRisk = risks.some((r) => /danger|high|critical/i.test(r.level));
  if (liquidityUsd < 5000 || hasDangerRisk || (scoreNorm != null && scoreNorm > 50)) {
    safetyLevel = 'HIGH RISK';
  } else if (liquidityUsd < 25000 || risks.length >= 2 || (scoreNorm != null && scoreNorm > 20)) {
    safetyLevel = 'CAUTION';
  } else if (!rug && !isSol) {
    safetyLevel = liquidityUsd >= 50000 ? 'VERIFIED LIQ' : 'UNVERIFIED';
  }

  let ageLabel = '—';
  if (best.pairCreatedAt) {
    const hrs = Math.max(0.1, (Date.now() - Number(best.pairCreatedAt)) / 3600000);
    ageLabel = hrs < 24 ? `${hrs.toFixed(1)}h` : hrs < 24 * 30 ? `${Math.round(hrs / 24)}d` : `${Math.round(hrs / (24 * 30))}mo`;
  }

  const volToMcRatio = marketCap > 0 ? vol24h / marketCap : 0;

  let pose = 'peace';
  const notes = [];
  if (safetyLevel === 'HIGH RISK') {
    pose = 'pout';
    notes.push(
      liquidityUsd < 5000
        ? `Thin liquidity ($${Math.round(liquidityUsd).toLocaleString()}). High slippage risk.`
        : `Audit flagged ${risks[0]?.name || 'elevated contract risk'}.`
    );
  } else if (safetyLevel === 'CAUTION') {
    pose = 'shy';
    notes.push(`Moderate risk profile (Liquidity $${Math.round(liquidityUsd / 1000)}K).`);
  } else {
    pose = priceChange.h24 > 8 && buyRatioPct >= 52 ? 'dance' : 'peace';
    notes.push(
      `Solid liquidity ($${liquidityUsd >= 1e6 ? (liquidityUsd / 1e6).toFixed(2) + 'M' : Math.round(liquidityUsd / 1000) + 'K'}) and clean contract check.`
    );
  }

  if (buyRatioPct >= 56) notes.push(`Buy flow leads (${buyRatioPct}% buys, 1h ${priceChange.h1 >= 0 ? '+' : ''}${priceChange.h1.toFixed(1)}%).`);
  else if (buyRatioPct <= 44) notes.push(`Sell pressure elevated (${100 - buyRatioPct}% sells).`);
  else notes.push(`Balanced order flow (${buyRatioPct}% buys / ${100 - buyRatioPct}% sells).`);

  const cleanSymbol = String(best.baseToken?.symbol || 'TOKEN').replace(/^\$+/, '');
  const token = {
    name: best.baseToken?.name || cleanSymbol || 'Unknown',
    symbol: cleanSymbol,
    address: baseAddr,
    chainId: best.chainId || 'solana',
    dexId: best.dexId || 'dex',
    pairUrl: best.url || `https://dexscreener.com/${best.chainId}/${baseAddr}`,
    priceUsd,
    marketCap,
    liquidityUsd,
    vol24h,
    vol1h,
    volToMcPct: Math.round(volToMcRatio * 100),
    buys24h,
    sells24h,
    buyRatioPct,
    priceChange,
    ageLabel,
    safety: {
      level: safetyLevel,
      scoreNorm,
      lpLockedPct,
      risks,
      auditedByRugCheck: !!rug,
    },
    verdict: notes.join(' '),
    pose,
    scannedAt: Date.now(),
  };

  try {
    const { recentScans = [] } = await chrome.storage.local.get('recentScans');
    const dedup = [
      { symbol: token.symbol, address: token.address, chainId: token.chainId, priceUsd: token.priceUsd, safetyLevel },
      ...recentScans.filter((s) => s.address !== token.address),
    ].slice(0, 6);
    await chrome.storage.local.set({ recentScans: dedup, lastScan: token });
  } catch {}

  return { ok: true, token };
}

// =========================================================================
// LOCAL BROWSER SCREEN-TIME ANALYTICS
// =========================================================================
function classifyDomain(host) {
  if (
    /dexscreener|tradingview|birdeye|pump\.fun|jup\.ag|raydium|coingecko|coinmarketcap|binance|okx|bybit|solscan|phantom|rugcheck|dextools|gmgn|photon|bullx|axiom|meteora/i.test(
      host
    )
  ) {
    return 'crypto';
  }
  if (
    /^(x|twitter|t|discord|reddit|instagram|tiktok|threads|warpcast)\.|telegram\.org/i.test(host) ||
    /(^|\.)(x\.com|twitter\.com|t\.me|discord\.com|reddit\.com)$/i.test(host)
  ) {
    return 'social';
  }
  if (
    /github\.com|gitlab\.com|localhost|127\.0\.0\.1|vercel\.com|cloudflare\.com|stackoverflow\.com|chatgpt\.com|claude\.ai|gemini\.google|docs\.google|notion\.so|figma\.com|linear\.app/i.test(
      host
    )
  ) {
    return 'work';
  }
  if (/youtube\.com|youtu\.be|twitch\.tv|netflix\.com|spotify\.com|soundcloud\.com|kick\.com/i.test(host)) {
    return 'media';
  }
  return 'other';
}

async function recordScreenTime(rawHost, seconds) {
  const host = String(rawHost || '').toLowerCase().replace(/^www\./, '').trim();
  const sec = Math.min(60, Math.max(1, Number(seconds) || 15));
  if (!host || host === 'newtab' || host.includes('chrome-extension')) return;

  const key = todayKey();
  const { webStats = {} } = await chrome.storage.local.get('webStats');
  const day = webStats[key] || {
    totalSec: 0,
    domains: {},
    categories: { work: 0, crypto: 0, social: 0, media: 0, other: 0 },
  };

  const cat = classifyDomain(host);
  day.totalSec = (day.totalSec || 0) + sec;
  day.domains[host] = (day.domains[host] || 0) + sec;
  day.categories[cat] = (day.categories[cat] || 0) + sec;
  webStats[key] = day;

  const keys = Object.keys(webStats).sort();
  while (keys.length > 7) {
    const old = keys.shift();
    delete webStats[old];
  }

  await chrome.storage.local.set({ webStats });
}

// =========================================================================
// FOCUS TIMER ENGINE
// =========================================================================
async function startFocusTimer(minutes = 25, mode = 'focus') {
  const mins = Math.min(180, Math.max(1, Number(minutes) || 25));
  const endsAt = Date.now() + mins * 60 * 1000;
  const focusState = {
    active: true,
    mode: mode === 'break' ? 'break' : 'focus',
    durationSec: mins * 60,
    minutes: mins,
    endsAt,
    startedAt: Date.now(),
  };
  await chrome.storage.local.set({ focusState });
  chrome.alarms.create('yuzuFocusEnd', { when: endsAt });
  const { market } = await chrome.storage.local.get('market');
  updateBadge(market, focusState);
  return focusState;
}

async function stopFocusTimer(completed = false) {
  const st = await chrome.storage.local.get(['focusState', 'focusStats', 'market', 'alertsEnabled']);
  const prev = st.focusState;
  const focusStats = st.focusStats || {};
  const key = todayKey();
  if (!focusStats[key]) focusStats[key] = { sessions: 0, minutes: 0 };

  if (completed && prev?.active && prev.mode === 'focus') {
    focusStats[key].sessions += 1;
    focusStats[key].minutes += Number(prev.minutes) || Math.round((prev.durationSec || 1500) / 60);
  }

  const nextState = { active: false, mode: 'focus', durationSec: 0, endsAt: 0 };
  await chrome.storage.local.set({ focusState: nextState, focusStats });
  chrome.alarms.clear('yuzuFocusEnd');
  updateBadge(st.market, nextState);

  if (completed && prev?.active && st.alertsEnabled !== false) {
    const isBreak = prev.mode === 'break';
    chrome.notifications.create(`yuzu-focus-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: isBreak ? '$YUZU: Break Finished' : '$YUZU: Focus Session Complete',
      message: isBreak
        ? 'Break complete. Ready for the next work session.'
        : `Completed ${prev.minutes || 25}m session (${focusStats[key].sessions} total today).`,
    });
  }
  return { focusState: nextState, todayFocus: focusStats[key] };
}

// =========================================================================
// CONTEXT MENUS & SIDE PANEL SETUP (ZERO EMOJIS, ZERO AI CALLS)
// =========================================================================
function setupContextMenus() {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'yuzu-scan-selection',
        title: 'Scan "%s" in $YUZU Scanner',
        contexts: ['selection'],
      });
    });
  } catch {}
}

chrome.contextMenus?.onClicked?.addListener(async (info, tab) => {
  const sel = String(info.selectionText || '').trim();
  if (!sel || info.menuItemId !== 'yuzu-scan-selection') return;

  await chrome.storage.local.set({
    pendingAction: { type: 'scan', query: sel.slice(0, 80), ts: Date.now() },
  });
  try {
    if (tab?.windowId && chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      return;
    }
  } catch {}
  const res = await scanToken(sel.slice(0, 80));
  if (res.ok && res.token) {
    chrome.notifications.create(`yuzu-ctx-scan-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `${res.token.symbol} (${res.token.safety.level})`,
      message: `Price $${res.token.priceUsd.toPrecision(4)} | Liq $${Math.round(res.token.liquidityUsd).toLocaleString()} | Buys ${res.token.buyRatioPct}%`,
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  setupContextMenus();
  refreshMarket();
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  setupContextMenus();
  refreshMarket();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'yuzuMarketPoll') {
    refreshMarket();
  } else if (alarm.name === 'yuzuFocusEnd') {
    stopFocusTimer(true);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'REFRESH_MARKET') {
    refreshMarket()
      .then((data) => sendResponse(data ? { ok: true, ...data } : { ok: false }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg?.type === 'SCAN_TOKEN') {
    scanToken(msg.query)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || 'Scan failed') }));
    return true;
  }
  if (msg?.type === 'TRACK_TIME') {
    recordScreenTime(msg.host, msg.seconds)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg?.type === 'FOCUS_START') {
    startFocusTimer(msg.minutes, msg.mode)
      .then((focusState) => sendResponse({ ok: true, focusState }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg?.type === 'FOCUS_STOP') {
    stopFocusTimer(false)
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg?.type === 'UPDATE_BADGE' && Array.isArray(msg.market)) {
    chrome.storage.local.get('focusState').then(({ focusState }) => {
      updateBadge(msg.market, focusState);
      sendResponse({ ok: true });
    });
    return true;
  }
});
