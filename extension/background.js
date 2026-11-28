// =========================================================================
// $YUZU EXTENSION v2.6.0 — PRO SOLANA UTILITY SUITE
// - Universal Crypto Search & Custom CEX/DEX Watchlist
// - Deep Scanner: DEX Paid / CTO / Boosts + Mint/Freeze + Non-LP Top 10 Holders %
// - Inline X/Twitter CA Quick-Badge Metadata Cache
// - Read-Only Solana Wallet & Whale Portfolio Tracker (Zero Connect Risk)
// =========================================================================

const KNOWN_CEX_CATALOG = [
  { sym: 'SOL', name: 'Solana', binance: 'SOLUSDT', okx: 'SOL-USDT', cg: 'solana' },
  { sym: 'BTC', name: 'Bitcoin', binance: 'BTCUSDT', okx: 'BTC-USDT', cg: 'bitcoin' },
  { sym: 'ETH', name: 'Ethereum', binance: 'ETHUSDT', okx: 'ETH-USDT', cg: 'ethereum' },
  { sym: 'SUI', name: 'Sui', binance: 'SUIUSDT', okx: 'SUI-USDT', cg: 'sui' },
  { sym: 'JUP', name: 'Jupiter', binance: 'JUPUSDT', okx: 'JUP-USDT', cg: 'jupiter-exchange-solana' },
  { sym: 'WIF', name: 'dogwifhat', binance: 'WIFUSDT', okx: 'WIF-USDT', cg: 'dogwifcoin' },
  { sym: 'BONK', name: 'Bonk', binance: 'BONKUSDT', okx: 'BONK-USDT', cg: 'bonk' },
  { sym: 'PEPE', name: 'Pepe', binance: 'PEPEUSDT', okx: 'PEPE-USDT', cg: 'pepe' },
  { sym: 'XRP', name: 'XRP', binance: 'XRPUSDT', okx: 'XRP-USDT', cg: 'ripple' },
  { sym: 'DOGE', name: 'Dogecoin', binance: 'DOGEUSDT', okx: 'DOGE-USDT', cg: 'dogecoin' },
  { sym: 'BNB', name: 'BNB', binance: 'BNBUSDT', okx: 'BNB-USDT', cg: 'binancecoin' },
  { sym: 'ADA', name: 'Cardano', binance: 'ADAUSDT', okx: 'ADA-USDT', cg: 'cardano' },
  { sym: 'TRX', name: 'TRON', binance: 'TRXUSDT', okx: 'TRX-USDT', cg: 'tron' },
  { sym: 'AVAX', name: 'Avalanche', binance: 'AVAXUSDT', okx: 'AVAX-USDT', cg: 'avalanche-2' },
  { sym: 'TON', name: 'Toncoin', binance: 'TONUSDT', okx: 'TON-USDT', cg: 'the-open-network' },
  { sym: 'LINK', name: 'Chainlink', binance: 'LINKUSDT', okx: 'LINK-USDT', cg: 'chainlink' },
  { sym: 'HYPE', name: 'Hyperliquid', binance: null, okx: 'HYPE-USDT', cg: 'hyperliquid' },
  { sym: 'RENDER', name: 'Render', binance: 'RENDERUSDT', okx: 'RENDER-USDT', cg: 'render-token' },
  { sym: 'NEAR', name: 'NEAR Protocol', binance: 'NEARUSDT', okx: 'NEAR-USDT', cg: 'near' },
  { sym: 'APT', name: 'Aptos', binance: 'APTUSDT', okx: 'APT-USDT', cg: 'aptos' },
  { sym: 'LTC', name: 'Litecoin', binance: 'LTCUSDT', okx: 'LTC-USDT', cg: 'litecoin' },
  { sym: 'UNI', name: 'Uniswap', binance: 'UNIUSDT', okx: 'UNI-USDT', cg: 'uniswap' },
  { sym: 'DOT', name: 'Polkadot', binance: 'DOTUSDT', okx: 'DOT-USDT', cg: 'polkadot' },
  { sym: 'ARB', name: 'Arbitrum', binance: 'ARBUSDT', okx: 'ARB-USDT', cg: 'arbitrum' },
  { sym: 'OP', name: 'Optimism', binance: 'OPUSDT', okx: 'OP-USDT', cg: 'optimism' },
  { sym: 'INJ', name: 'Injective', binance: 'INJUSDT', okx: 'INJ-USDT', cg: 'injective-protocol' },
  { sym: 'TIA', name: 'Celestia', binance: 'TIAUSDT', okx: 'TIA-USDT', cg: 'celestia' },
  { sym: 'SEI', name: 'Sei', binance: 'SEIUSDT', okx: 'SEI-USDT', cg: 'sei-network' },
  { sym: 'AAVE', name: 'Aave', binance: 'AAVEUSDT', okx: 'AAVE-USDT', cg: 'aave' },
  { sym: 'RAY', name: 'Raydium', binance: 'RAYUSDT', okx: 'RAY-USDT', cg: 'raydium' },
  { sym: 'PYTH', name: 'Pyth Network', binance: 'PYTHUSDT', okx: 'PYTH-USDT', cg: 'pyth-network' },
  { sym: 'PENGU', name: 'Pudgy Penguins', binance: 'PENGUUSDT', okx: 'PENGU-USDT', cg: 'pudgy-penguins' },
  { sym: 'TRUMP', name: 'OFFICIAL TRUMP', binance: 'TRUMPUSDT', okx: 'TRUMP-USDT', cg: 'official-trump' },
  { sym: 'SHIB', name: 'Shiba Inu', binance: 'SHIBUSDT', okx: 'SHIB-USDT', cg: 'shiba-inu' },
  { sym: 'FET', name: 'Artificial Superintelligence', binance: 'FETUSDT', okx: 'FET-USDT', cg: 'fetch-ai' },
];

const DEFAULT_WATCHLIST = [
  { id: 'cex:SOL', sym: 'SOL', name: 'Solana', kind: 'cex', binance: 'SOLUSDT', okx: 'SOL-USDT', cg: 'solana', pinnedTop: true },
  { id: 'cex:BTC', sym: 'BTC', name: 'Bitcoin', kind: 'cex', binance: 'BTCUSDT', okx: 'BTC-USDT', cg: 'bitcoin', pinnedTop: false },
  { id: 'cex:ETH', sym: 'ETH', name: 'Ethereum', kind: 'cex', binance: 'ETHUSDT', okx: 'ETH-USDT', cg: 'ethereum', pinnedTop: false },
  { id: 'cex:SUI', sym: 'SUI', name: 'Sui', kind: 'cex', binance: 'SUIUSDT', okx: 'SUI-USDT', cg: 'sui', pinnedTop: false },
  { id: 'cex:JUP', sym: 'JUP', name: 'Jupiter', kind: 'cex', binance: 'JUPUSDT', okx: 'JUP-USDT', cg: 'jupiter-exchange-solana', pinnedTop: false },
  { id: 'cex:WIF', sym: 'WIF', name: 'dogwifhat', kind: 'cex', binance: 'WIFUSDT', okx: 'WIF-USDT', cg: 'dogwifcoin', pinnedTop: false },
];

let refreshInFlight = null;
const quickCaCache = new Map(); // CA -> { ts, data }

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

async function getActiveWatchlist() {
  const st = await chrome.storage.local.get(['userWatchlist', 'pinnedTokens', 'watchlistMigratedV25']);
  let list = Array.isArray(st.userWatchlist) && st.userWatchlist.length ? st.userWatchlist : [...DEFAULT_WATCHLIST];

  if (!st.watchlistMigratedV25) {
    if (Array.isArray(st.pinnedTokens) && st.pinnedTokens.length) {
      for (const pt of st.pinnedTokens) {
        if (!pt?.address) continue;
        const id = `dex:${pt.chainId || 'solana'}:${pt.address}`;
        if (!list.some((x) => x.id.toLowerCase() === id.toLowerCase())) {
          list.push({
            id,
            sym: String(pt.symbol || 'TOKEN').replace(/^\$+/, '').toUpperCase(),
            name: pt.name || pt.symbol || 'Token',
            kind: 'dex',
            address: pt.address,
            chainId: pt.chainId || 'solana',
            pairUrl: pt.pairUrl || `https://dexscreener.com/${pt.chainId || 'solana'}/${pt.address}`,
            pinnedTop: false,
          });
        }
      }
    }
    await chrome.storage.local.set({ userWatchlist: list, watchlistMigratedV25: true });
  }
  return list;
}

function updateBadge(market, focusState, badgeSym = 'SOL') {
  try {
    if (focusState?.active && focusState.endsAt > Date.now()) {
      const remMin = Math.max(1, Math.ceil((focusState.endsAt - Date.now()) / 60000));
      chrome.action.setBadgeText({ text: `${remMin}m` });
      chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });
      return;
    }
    if (!Array.isArray(market) || !market.length) return;
    const target =
      market.find((m) => String(m.sym).toUpperCase() === String(badgeSym || 'SOL').toUpperCase()) ||
      market.find((m) => m.sym === 'SOL') ||
      market[0];
    if (!target || Number.isNaN(target.pct)) return;
    const sign = target.pct >= 0 ? '+' : '';
    chrome.action.setBadgeText({ text: `${sign}${target.pct.toFixed(0)}%` });
    chrome.action.setBadgeBackgroundColor({ color: target.pct >= 0 ? '#15803d' : '#be123c' });
  } catch {}
}

function enrichMarketRow(baseMeta, quote) {
  const price = Number(quote.price) || 0;
  const pct = Number(quote.pct) || 0;
  const approxSpan = Math.max(Math.abs(pct) / 100, 0.025);
  const low24h = quote.low24h > 0 ? Number(quote.low24h) : price * (1 - approxSpan * 0.65);
  const high24h = quote.high24h > 0 ? Number(quote.high24h) : price * (1 + approxSpan * 0.65);
  const defaultChart =
    baseMeta.kind === 'dex'
      ? baseMeta.pairUrl || `https://dexscreener.com/${baseMeta.chainId || 'solana'}/${baseMeta.address}`
      : `https://www.tradingview.com/symbols/${baseMeta.sym}USDT/`;

  return {
    id: baseMeta.id,
    sym: baseMeta.sym,
    name: baseMeta.name || baseMeta.sym,
    kind: baseMeta.kind || 'cex',
    address: baseMeta.address || null,
    chainId: baseMeta.chainId || null,
    pinnedTop: !!baseMeta.pinnedTop,
    chartUrl: quote.chartUrl || defaultChart,
    price,
    pct,
    low24h: Math.min(low24h, price),
    high24h: Math.max(high24h, price),
    volUsd: Number(quote.volUsd) || 0,
    liqUsd: Number(quote.liqUsd) || 0,
  };
}

// =========================================================================
// MULTI-SOURCE CEX + DEX WATCHLIST QUOTE FETCHER
// =========================================================================
async function fetchCexQuotes(cexItems) {
  const resolved = new Map();
  if (!cexItems.length) return { resolved, source: '' };
  let primarySource = '';

  const binanceCandidates = cexItems.filter((c) => c.binance);
  if (binanceCandidates.length) {
    const symsParam = encodeURIComponent(JSON.stringify([...new Set(binanceCandidates.map((c) => c.binance))]));
    let arr = await fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symsParam}`, 4000);

    if (!Array.isArray(arr) && binanceCandidates.length > 1) {
      const indiv = await Promise.all(
        binanceCandidates.map((c) => fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${c.binance}`, 3200))
      );
      arr = indiv.filter((x) => x && x.symbol && x.lastPrice != null);
    }

    if (Array.isArray(arr) && arr.length) {
      primarySource = 'Binance';
      const byPair = new Map(arr.map((x) => [x.symbol, x]));
      for (const item of binanceCandidates) {
        const d = byPair.get(item.binance);
        if (d && parseFloat(d.lastPrice) > 0) {
          resolved.set(item.id, {
            price: parseFloat(d.lastPrice),
            pct: parseFloat(d.priceChangePercent || 0),
            high24h: parseFloat(d.highPrice || 0),
            low24h: parseFloat(d.lowPrice || 0),
            volUsd: parseFloat(d.quoteVolume || 0),
          });
        }
      }
    }
  }

  const missingAfterBinance = cexItems.filter((c) => !resolved.has(c.id));
  if (missingAfterBinance.length) {
    const okxResults = await Promise.all(
      missingAfterBinance.map(async (c) => {
        const inst = c.okx || `${c.sym}-USDT`;
        const j = await fetchJson(`https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(inst)}`, 3600);
        const d = j?.data?.[0];
        if (!d || !(parseFloat(d.last) > 0)) return null;
        const last = parseFloat(d.last);
        const open = parseFloat(d.open24h);
        return {
          id: c.id,
          quote: {
            price: last,
            pct: open > 0 ? ((last - open) / open) * 100 : 0,
            high24h: parseFloat(d.high24h || 0),
            low24h: parseFloat(d.low24h || 0),
            volUsd: parseFloat(d.volCcy24h || 0),
          },
        };
      })
    );
    for (const r of okxResults) {
      if (r) {
        resolved.set(r.id, r.quote);
        if (!primarySource) primarySource = 'OKX';
      }
    }
  }

  const missingAfterOkx = cexItems.filter((c) => !resolved.has(c.id) && c.cg);
  if (missingAfterOkx.length) {
    const ids = [...new Set(missingAfterOkx.map((c) => c.cg))].join(',');
    const j = await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
      4200
    );
    if (j) {
      for (const c of missingAfterOkx) {
        const d = j[c.cg];
        if (d?.usd != null) {
          resolved.set(c.id, {
            price: Number(d.usd),
            pct: Number(d.usd_24h_change || 0),
            volUsd: Number(d.usd_24h_vol || 0),
          });
          if (!primarySource) primarySource = 'CoinGecko';
        }
      }
    }
  }

  return { resolved, source: primarySource };
}

async function fetchDexQuotes(dexItems) {
  const resolved = new Map();
  if (!dexItems.length) return resolved;

  const addrs = [...new Set(dexItems.map((d) => d.address).filter(Boolean))].slice(0, 25);
  if (!addrs.length) return resolved;

  const j = await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(addrs.join(','))}`, 4800);
  const pairs = Array.isArray(j?.pairs) ? j.pairs : [];
  for (const item of dexItems) {
    const matching = pairs
      .filter((p) => (p.baseToken?.address || '').toLowerCase() === String(item.address).toLowerCase())
      .sort((a, b) => (Number(b.liquidity?.usd) || 0) - (Number(a.liquidity?.usd) || 0))[0];
    if (!matching) continue;
    resolved.set(item.id, {
      price: parseFloat(matching.priceUsd || 0),
      pct: Number(matching.priceChange?.h24 || 0),
      volUsd: Number(matching.volume?.h24 || 0),
      liqUsd: Number(matching.liquidity?.usd || 0),
      chartUrl: matching.url || item.pairUrl,
    });
  }
  return resolved;
}

// =========================================================================
// UNIVERSAL CRYPTO SEARCH (CEX SPOT + COINGECKO + ON-CHAIN DEX)
// =========================================================================
async function searchCrypto(rawQuery) {
  const q = String(rawQuery || '').trim();
  if (!q) return { ok: true, results: [] };

  const cleanQ = q.replace(/^\$/, '');
  const upperQ = cleanQ.toUpperCase();
  const lowerQ = cleanQ.toLowerCase();
  const isSolanaCA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);
  const isEvmCA = /^0x[a-fA-F0-9]{40}$/.test(q);

  if (isSolanaCA || isEvmCA) {
    const dexJson = await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(q)}`, 5000);
    const pairs = Array.isArray(dexJson?.pairs) ? dexJson.pairs : [];
    const seen = new Set();
    const results = [];
    for (const p of pairs.sort((a, b) => (Number(b.liquidity?.usd) || 0) - (Number(a.liquidity?.usd) || 0))) {
      const addr = p.baseToken?.address;
      if (!addr || seen.has(addr.toLowerCase())) continue;
      seen.add(addr.toLowerCase());
      const sym = String(p.baseToken?.symbol || 'TOKEN').replace(/^\$+/, '').toUpperCase();
      results.push({
        id: `dex:${p.chainId || 'solana'}:${addr}`,
        sym,
        name: p.baseToken?.name || sym,
        kind: 'dex',
        sourceTag: `${String(p.chainId || 'DEX').toUpperCase()} DEX`,
        address: addr,
        chainId: p.chainId || 'solana',
        pairUrl: p.url || `https://dexscreener.com/${p.chainId}/${addr}`,
        price: parseFloat(p.priceUsd || 0),
        pct: Number(p.priceChange?.h24 || 0),
        volUsd: Number(p.volume?.h24 || 0),
        liqUsd: Number(p.liquidity?.usd || 0),
      });
      if (results.length >= 6) break;
    }
    return { ok: true, results };
  }

  const catalogMatches = KNOWN_CEX_CATALOG.filter(
    (c) => c.sym.includes(upperQ) || c.name.toLowerCase().includes(lowerQ)
  ).slice(0, 5);

  const directBinanceSym = /^[A-Z0-9]{2,10}$/.test(upperQ) ? `${upperQ}USDT` : null;

  const [directBin, cgSearch, dexSearch] = await Promise.all([
    directBinanceSym ? fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${directBinanceSym}`, 2800) : Promise.resolve(null),
    fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(cleanQ)}`, 3600),
    fetchJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(cleanQ)}`, 3800),
  ]);

  const cexCandidates = new Map();
  for (const c of catalogMatches) {
    cexCandidates.set(c.sym, { ...c });
  }

  if (directBin && directBin.symbol && parseFloat(directBin.lastPrice) > 0) {
    const existing = cexCandidates.get(upperQ) || {
      sym: upperQ,
      name: upperQ,
      binance: directBinanceSym,
      okx: `${upperQ}-USDT`,
      cg: null,
    };
    existing._quote = {
      price: parseFloat(directBin.lastPrice),
      pct: parseFloat(directBin.priceChangePercent || 0),
      volUsd: parseFloat(directBin.quoteVolume || 0),
    };
    cexCandidates.set(upperQ, existing);
  }

  const cgCoins = Array.isArray(cgSearch?.coins) ? cgSearch.coins.slice(0, 5) : [];
  for (const cg of cgCoins) {
    const sym = String(cg.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!sym) continue;
    if (!cexCandidates.has(sym)) {
      cexCandidates.set(sym, {
        sym,
        name: cg.name || sym,
        binance: `${sym}USDT`,
        okx: `${sym}-USDT`,
        cg: cg.id || null,
      });
    } else if (!cexCandidates.get(sym).cg && cg.id) {
      cexCandidates.get(sym).cg = cg.id;
      if (cexCandidates.get(sym).name === sym && cg.name) cexCandidates.get(sym).name = cg.name;
    }
  }

  const cexList = [...cexCandidates.values()].slice(0, 5).map((c) => ({
    id: `cex:${c.sym}`,
    sym: c.sym,
    name: c.name,
    kind: 'cex',
    binance: c.binance,
    okx: c.okx,
    cg: c.cg,
    _quote: c._quote || null,
  }));

  const needQuote = cexList.filter((c) => !c._quote);
  if (needQuote.length) {
    const { resolved } = await fetchCexQuotes(needQuote);
    for (const c of needQuote) {
      if (resolved.has(c.id)) {
        c._quote = resolved.get(c.id);
      } else {
        c.binance = null;
      }
    }
  }

  const results = [];
  const usedSyms = new Set();

  for (const c of cexList) {
    if (!c._quote || !(c._quote.price > 0)) continue;
    usedSyms.add(c.sym);
    results.push({
      id: c.id,
      sym: c.sym,
      name: c.name,
      kind: 'cex',
      sourceTag: 'SPOT',
      binance: c.binance,
      okx: c.okx,
      cg: c.cg,
      price: c._quote.price,
      pct: c._quote.pct || 0,
      volUsd: c._quote.volUsd || 0,
      liqUsd: 0,
    });
  }

  const dexPairs = Array.isArray(dexSearch?.pairs) ? dexSearch.pairs : [];
  const sortedDex = [...dexPairs]
    .filter((p) => (Number(p.liquidity?.usd) || 0) >= 2500 && parseFloat(p.priceUsd || 0) > 0)
    .sort((a, b) => {
      const boostA = a.chainId === 'solana' ? 1.35 : 1;
      const boostB = b.chainId === 'solana' ? 1.35 : 1;
      return (Number(b.liquidity?.usd) || 0) * boostB - (Number(a.liquidity?.usd) || 0) * boostA;
    });

  const seenAddrs = new Set();
  for (const p of sortedDex) {
    const addr = p.baseToken?.address;
    if (!addr || seenAddrs.has(addr.toLowerCase())) continue;
    seenAddrs.add(addr.toLowerCase());
    const sym = String(p.baseToken?.symbol || 'TOKEN').replace(/^\$+/, '').toUpperCase();
    if (usedSyms.has(sym) && /^(SOL|WSOL|BTC|WBTC|ETH|WETH|USDC|USDT)$/.test(sym)) continue;

    results.push({
      id: `dex:${p.chainId || 'solana'}:${addr}`,
      sym,
      name: p.baseToken?.name || sym,
      kind: 'dex',
      sourceTag: `${String(p.chainId || 'DEX').toUpperCase()} DEX`,
      address: addr,
      chainId: p.chainId || 'solana',
      pairUrl: p.url || `https://dexscreener.com/${p.chainId}/${addr}`,
      price: parseFloat(p.priceUsd || 0),
      pct: Number(p.priceChange?.h24 || 0),
      volUsd: Number(p.volume?.h24 || 0),
      liqUsd: Number(p.liquidity?.usd || 0),
    });
    if (results.length >= 8) break;
  }

  return { ok: true, results };
}

// =========================================================================
// FAST INLINE X/TWITTER CA BADGE METADATA (90s IN-MEMORY CACHE)
// =========================================================================
async function getQuickCaMeta(rawCa) {
  const ca = String(rawCa || '').trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ca)) return { ok: false };

  const cached = quickCaCache.get(ca);
  if (cached && Date.now() - cached.ts < 90 * 1000) {
    return { ok: true, meta: cached.data };
  }

  const [dexJson, ordersJson] = await Promise.all([
    fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(ca)}`, 4000),
    fetchJson(`https://api.dexscreener.com/orders/v1/solana/${encodeURIComponent(ca)}`, 3200),
  ]);

  const pairs = Array.isArray(dexJson?.pairs) ? dexJson.pairs : [];
  if (!pairs.length) return { ok: false };

  const best = [...pairs].sort((a, b) => (Number(b.liquidity?.usd) || 0) - (Number(a.liquidity?.usd) || 0))[0];
  const liqUsd = Number(best.liquidity?.usd || 0);
  const mcap = Number(best.marketCap || best.fdv || 0);
  const pct24h = Number(best.priceChange?.h24 || 0);
  const priceUsd = parseFloat(best.priceUsd || 0);
  const sym = String(best.baseToken?.symbol || 'TOKEN').replace(/^\$+/, '').toUpperCase();

  const orders = Array.isArray(ordersJson?.orders) ? ordersJson.orders : [];
  const hasApprovedProfile = orders.some((o) => o.type === 'tokenProfile' && o.status === 'approved') || !!best.info;
  const hasApprovedCto = orders.some((o) => o.type === 'communityTakeover' && o.status === 'approved');
  const boosts = Number(best.boosts?.active || 0);

  const meta = {
    address: best.baseToken?.address || ca,
    sym,
    name: best.baseToken?.name || sym,
    chainId: best.chainId || 'solana',
    priceUsd,
    mcap,
    liqUsd,
    pct24h,
    dexPaid: hasApprovedProfile,
    cto: hasApprovedCto,
    boosts,
    pairUrl: best.url || `https://dexscreener.com/solana/${ca}`,
    riskFlag: liqUsd < 8000 ? 'LOW LIQ' : 'LIQ OK',
  };

  quickCaCache.set(ca, { ts: Date.now(), data: meta });
  return { ok: true, meta };
}

// =========================================================================
// READ-ONLY SOLANA WALLET & WHALE TRACKER (ZERO CONNECT RISK)
// =========================================================================
async function fetchReadOnlyWallet(rawAddr) {
  const address = String(rawAddr || '').trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return { ok: false, error: 'Enter a valid base58 Solana wallet address.' };
  }

  // 1. Fetch SOL + SPL accounts via Yuzu Vercel RPC proxy, with direct publicnode getBalance fallback
  const [proxyData, directBal, st] = await Promise.all([
    fetchJson(`https://yuzuha-simulator.vercel.app/api/wallet?address=${encodeURIComponent(address)}`, 6500),
    fetchJson('https://solana-rpc.publicnode.com', 4200, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
    }),
    chrome.storage.local.get('market'),
  ]);

  let solAmount = 0;
  if (proxyData?.ok && typeof proxyData.sol === 'number') {
    solAmount = proxyData.sol;
  } else if (typeof directBal?.result?.value === 'number') {
    solAmount = directBal.result.value / 1e9;
  } else if (!proxyData?.ok) {
    return { ok: false, error: 'Solana RPC temporarily busy. Try again in a moment.' };
  }

  // Get live SOL price
  let solPrice = Number((st.market || []).find((m) => m.sym === 'SOL')?.price || 0);
  if (!(solPrice > 0)) {
    const b = await fetchJson('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT', 3000);
    solPrice = parseFloat(b?.price || 0);
  }

  const rawTokens = Array.isArray(proxyData?.tokens) ? proxyData.tokens : [];
  const holdings = [];

  if (solAmount > 0) {
    holdings.push({
      sym: 'SOL',
      name: 'Solana',
      mint: null,
      amount: solAmount,
      priceUsd: solPrice,
      valueUsd: solAmount * solPrice,
      pct24h: Number((st.market || []).find((m) => m.sym === 'SOL')?.pct || 0),
    });
  }

  // Enrich SPL token mints via DexScreener + Stablecoin recognition
  const STABLES = {
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { sym: 'USDC', name: 'USD Coin', price: 1 },
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { sym: 'USDT', name: 'Tether USD', price: 1 },
  };

  const dexMints = [];
  for (const t of rawTokens) {
    if (STABLES[t.mint]) {
      holdings.push({
        sym: STABLES[t.mint].sym,
        name: STABLES[t.mint].name,
        mint: t.mint,
        amount: t.amount,
        priceUsd: 1,
        valueUsd: t.amount,
        pct24h: 0,
      });
    } else {
      dexMints.push(t);
    }
  }

  if (dexMints.length) {
    const mintSlice = dexMints.slice(0, 24);
    const j = await fetchJson(
      `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mintSlice.map((x) => x.mint).join(','))}`,
      5000
    );
    const pairs = Array.isArray(j?.pairs) ? j.pairs : [];
    for (const item of mintSlice) {
      const best = pairs
        .filter((p) => (p.baseToken?.address || '').toLowerCase() === item.mint.toLowerCase())
        .sort((a, b) => (Number(b.liquidity?.usd) || 0) - (Number(a.liquidity?.usd) || 0))[0];
      if (!best) continue;
      const pr = parseFloat(best.priceUsd || 0);
      const val = item.amount * pr;
      if (val < 0.05) continue; // hide dust / spam air-drops worth < $0.05
      holdings.push({
        sym: String(best.baseToken?.symbol || 'SPL').replace(/^\$+/, '').toUpperCase(),
        name: best.baseToken?.name || 'SPL Token',
        mint: item.mint,
        pairUrl: best.url,
        amount: item.amount,
        priceUsd: pr,
        valueUsd: val,
        pct24h: Number(best.priceChange?.h24 || 0),
      });
    }
  }

  holdings.sort((a, b) => b.valueUsd - a.valueUsd);
  const totalUsd = holdings.reduce((s, h) => s + h.valueUsd, 0);

  const walletSnap = {
    address,
    solAmount,
    totalUsd,
    holdings: holdings.slice(0, 15),
    updatedAt: Date.now(),
  };

  await chrome.storage.local.set({ trackedWalletSnap: walletSnap, trackedWalletAddr: address });
  return { ok: true, wallet: walletSnap };
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

async function maybeNotifyMoversAndTargets(market) {
  try {
    const st = await chrome.storage.local.get(['alertsEnabled', 'lastAlertAt', 'priceAlerts']);
    const alertsOn = st.alertsEnabled !== false;

    if (alertsOn && Array.isArray(st.priceAlerts) && st.priceAlerts.length) {
      let changed = false;
      const updatedAlerts = st.priceAlerts.map((al) => {
        if (al.triggered) return al;
        const coin = market.find((m) => m.sym.toUpperCase() === String(al.sym).toUpperCase());
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
            message: `${coin.sym} reached $${coin.price >= 1 ? coin.price.toFixed(2) : coin.price.toFixed(6)} (${coin.pct >= 0 ? '+' : ''}${coin.pct.toFixed(1)}% 24h).`,
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
  const watchlist = await getActiveWatchlist();
  const ordered = [
    ...watchlist.filter((w) => w.pinnedTop),
    ...watchlist.filter((w) => !w.pinnedTop),
  ];

  const cexItems = ordered.filter((w) => w.kind !== 'dex');
  const dexItems = ordered.filter((w) => w.kind === 'dex');

  const [cexOut, dexMap, fearGreed, solNetwork, st] = await Promise.all([
    fetchCexQuotes(cexItems),
    fetchDexQuotes(dexItems),
    fetchFearGreed(false),
    fetchSolanaTelemetry(),
    chrome.storage.local.get(['focusState', 'badgeSym', 'market']),
  ]);

  const prevById = new Map((st.market || []).map((m) => [m.id || `cex:${m.sym}`, m]));
  const market = [];

  for (const item of ordered) {
    const quote = item.kind === 'dex' ? dexMap.get(item.id) : cexOut.resolved.get(item.id);
    if (quote && quote.price > 0) {
      market.push(enrichMarketRow(item, quote));
    } else if (prevById.has(item.id)) {
      market.push({ ...prevById.get(item.id), pinnedTop: !!item.pinnedTop });
    }
  }

  const badgeSym = st.badgeSym || 'SOL';
  if (!market.length) {
    const cached = await chrome.storage.local.get(['market', 'source', 'updatedAt']);
    updateBadge(cached.market, st.focusState, badgeSym);
    return cached.market ? { ...cached, fearGreed, solNetwork, badgeSym } : null;
  }

  const source = cexOut.source || (dexItems.length ? 'DexScreener' : 'Live');
  const updatedAt = Date.now();
  await chrome.storage.local.set({ market, source, updatedAt });
  updateBadge(market, st.focusState, badgeSym);
  maybeNotifyMoversAndTargets(market);
  return { market, source, updatedAt, fearGreed, solNetwork, badgeSym };
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
// WATCHLIST MUTATIONS (ADD / REMOVE / PIN TOP / RESET / BADGE COIN)
// =========================================================================
async function mutateWatchlist(msg) {
  let list = await getActiveWatchlist();

  if (msg.action === 'add' && msg.coin) {
    const c = msg.coin;
    const id = c.id || (c.kind === 'dex' ? `dex:${c.chainId || 'solana'}:${c.address}` : `cex:${String(c.sym).toUpperCase()}`);
    const exists = list.some((x) => x.id.toLowerCase() === id.toLowerCase());
    if (!exists) {
      const cleanSym = String(c.sym || 'TOKEN').replace(/^\$+/, '').toUpperCase();
      const entry =
        c.kind === 'dex'
          ? {
            id,
            sym: cleanSym,
            name: c.name || cleanSym,
            kind: 'dex',
            address: c.address,
            chainId: c.chainId || 'solana',
            pairUrl: c.pairUrl || `https://dexscreener.com/${c.chainId || 'solana'}/${c.address}`,
            pinnedTop: false,
          }
          : {
            id,
            sym: cleanSym,
            name: c.name || cleanSym,
            kind: 'cex',
            binance: c.binance !== undefined ? c.binance : `${cleanSym}USDT`,
            okx: c.okx || `${cleanSym}-USDT`,
            cg: c.cg || null,
            pinnedTop: false,
          };
      list = [...list, entry].slice(0, 24);
      await chrome.storage.local.set({ userWatchlist: list });
    }
  } else if (msg.action === 'remove' && msg.id) {
    list = list.filter((x) => x.id !== msg.id);
    if (!list.length) list = [...DEFAULT_WATCHLIST];
    await chrome.storage.local.set({ userWatchlist: list });
  } else if (msg.action === 'toggleTop' && msg.id) {
    list = list.map((x) => (x.id === msg.id ? { ...x, pinnedTop: !x.pinnedTop } : x));
    await chrome.storage.local.set({ userWatchlist: list });
  } else if (msg.action === 'reset') {
    list = [...DEFAULT_WATCHLIST];
    await chrome.storage.local.set({ userWatchlist: list, badgeSym: 'SOL' });
  } else if (msg.action === 'setBadge' && msg.sym) {
    const badgeSym = String(msg.sym).toUpperCase();
    await chrome.storage.local.set({ badgeSym });
    const st = await chrome.storage.local.get(['market', 'focusState']);
    updateBadge(st.market, st.focusState, badgeSym);
    return { ok: true, badgeSym, market: st.market };
  }

  const data = await refreshMarket();
  return data ? { ok: true, ...data } : { ok: true, userWatchlist: list };
}

// =========================================================================
// DEEP ON-CHAIN TOKEN SCANNER (DEX PAID + MINT/FREEZE + TOP 10 HOLDERS %)
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
  const chainId = best.chainId || 'solana';
  const isSol = chainId === 'solana';

  // Fetch Full RugCheck Report (Mint/Freeze + Top Holders + Insiders) & DexScreener Orders (DEX Paid / CTO) in parallel!
  const [rugFull, ordersJson] = await Promise.all([
    isSol && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(baseAddr)
      ? fetchJson(`https://api.rugcheck.xyz/v1/tokens/${baseAddr}/report`, 5200)
      : Promise.resolve(null),
    fetchJson(`https://api.dexscreener.com/orders/v1/${encodeURIComponent(chainId)}/${encodeURIComponent(baseAddr)}`, 3600),
  ]);

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

  // DEX Paid / CTO / Boosts analysis
  const orders = Array.isArray(ordersJson?.orders) ? ordersJson.orders : [];
  const dexPaid = orders.some((o) => o.type === 'tokenProfile' && o.status === 'approved') || !!best.info;
  const dexCto = orders.some((o) => o.type === 'communityTakeover' && o.status === 'approved');
  const dexAd = orders.some((o) => o.type === 'tokenAd' && o.status === 'approved');
  const boosts = Number(best.boosts?.active || 0);

  // RugCheck Authorities, LP Lock & Non-LP Holder Concentration
  const risks = Array.isArray(rugFull?.risks)
    ? rugFull.risks.slice(0, 4).map((r) => ({ name: r.name, level: r.level || 'warn' }))
    : [];
  const scoreNorm = rugFull?.score_normalised != null ? Number(rugFull.score_normalised) : null;
  const mintRevoked = rugFull ? rugFull.mintAuthority === null : null;
  const freezeRevoked = rugFull ? rugFull.freezeAuthority === null : null;
  const totalHolders = Number(rugFull?.totalHolders || 0);

  // Compute LP Lock % across markets if available
  let lpLockedPct = null;
  if (rugFull?.lpLockedPct != null) {
    lpLockedPct = Math.round(Number(rugFull.lpLockedPct));
  } else if (Array.isArray(rugFull?.markets) && rugFull.markets.length) {
    const mLP = rugFull.markets
      .map((m) => Number(m.lp?.lpLockedPct || 0))
      .filter((v) => v > 0);
    if (mLP.length) lpLockedPct = Math.round(Math.max(...mLP));
  }

  // Filter out known AMM/LP pool vaults & major CEX custody wallets when calculating Top 10 Holder Concentration
  const knownMap = rugFull?.knownAccounts || {};
  const rawHolders = Array.isArray(rugFull?.topHolders) ? rugFull.topHolders : [];
  const nonLpHolders = rawHolders.filter((h) => {
    const kOwner = knownMap[h.owner];
    const kAddr = knownMap[h.address];
    const t = String(kOwner?.type || kAddr?.type || '').toUpperCase();
    const nm = String(kOwner?.name || kAddr?.name || '').toUpperCase();
    if (/AMM|POOL|LOCKER|VAULT|RAYDIUM|ORCA|METEORA|PUMP\.FUN|EXCHANGE|CEX|BINANCE|COINBASE|OKX|BYBIT|KRAKEN|CRYPTO\.COM|UPBIT|KUCOIN|GATE\.IO/i.test(t + ' ' + nm)) {
      return false;
    }
    return true;
  });

  const top10Slice = nonLpHolders.slice(0, 10);
  const insidersCount = top10Slice.filter((h) => !!h.insider).length;
  const top10Pct = top10Slice.length
    ? Number(top10Slice.reduce((s, h) => s + Number(h.pct || 0), 0).toFixed(1))
    : null;
  const top1Pct = top10Slice.length ? Number(Number(top10Slice[0].pct || 0).toFixed(1)) : null;

  let safetyLevel = 'SAFE';
  const hasDangerRisk = risks.some((r) => /danger|high|critical/i.test(r.level)) || !!rugFull?.rugged;
  if (
    liquidityUsd < 5000 ||
    hasDangerRisk ||
    mintRevoked === false ||
    (top10Pct != null && top10Pct > 55) ||
    (scoreNorm != null && scoreNorm > 50)
  ) {
    safetyLevel = 'HIGH RISK';
  } else if (
    liquidityUsd < 25000 ||
    freezeRevoked === false ||
    (top10Pct != null && top10Pct > 32) ||
    risks.length >= 2 ||
    (scoreNorm != null && scoreNorm > 20)
  ) {
    safetyLevel = 'CAUTION';
  } else if (!rugFull && !isSol) {
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
    if (mintRevoked === false) notes.push('Mint authority is still ACTIVE.');
    else if (top10Pct != null && top10Pct > 55) notes.push(`Top 10 wallets hold ${top10Pct}% of supply.`);
    else if (liquidityUsd < 5000) notes.push(`Thin liquidity ($${Math.round(liquidityUsd).toLocaleString()}).`);
    else notes.push(`Audit flagged ${risks[0]?.name || 'elevated contract risk'}.`);
  } else if (safetyLevel === 'CAUTION') {
    pose = 'shy';
    notes.push(
      top10Pct != null && top10Pct > 32
        ? `Watch holder concentration (Top 10: ${top10Pct}%).`
        : `Moderate risk profile (Liq $${Math.round(liquidityUsd / 1000)}K).`
    );
  } else {
    pose = priceChange.h24 > 8 && buyRatioPct >= 52 ? 'dance' : 'peace';
    notes.push(
      `Clean check (${dexPaid ? 'DEX Paid' : 'Unpaid profile'}, Liq $${liquidityUsd >= 1e6 ? (liquidityUsd / 1e6).toFixed(2) + 'M' : Math.round(liquidityUsd / 1000) + 'K'}).`
    );
  }

  if (buyRatioPct >= 56) notes.push(`Buys lead ${buyRatioPct}%.`);
  else if (buyRatioPct <= 44) notes.push(`Sells elevated (${100 - buyRatioPct}%).`);

  const cleanSymbol = String(best.baseToken?.symbol || 'TOKEN').replace(/^\$+/, '');
  const token = {
    id: `dex:${chainId}:${baseAddr}`,
    name: best.baseToken?.name || cleanSymbol || 'Unknown',
    symbol: cleanSymbol,
    address: baseAddr,
    chainId,
    dexId: best.dexId || 'dex',
    pairUrl: best.url || `https://dexscreener.com/${chainId}/${baseAddr}`,
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
    dexStatus: {
      paid: dexPaid,
      cto: dexCto,
      ad: dexAd,
      boosts,
    },
    holders: {
      top10Pct,
      top1Pct,
      totalHolders,
      insidersCount,
    },
    safety: {
      level: safetyLevel,
      scoreNorm,
      lpLockedPct,
      mintRevoked,
      freezeRevoked,
      risks,
      auditedByRugCheck: !!rugFull,
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
  const st = await chrome.storage.local.get(['market', 'badgeSym']);
  updateBadge(st.market, focusState, st.badgeSym || 'SOL');
  return focusState;
}

async function stopFocusTimer(completed = false) {
  const st = await chrome.storage.local.get(['focusState', 'focusStats', 'market', 'alertsEnabled', 'badgeSym']);
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
  updateBadge(st.market, nextState, st.badgeSym || 'SOL');

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
// CONTEXT MENUS & MESSAGE ROUTER (ZERO EMOJIS, ZERO AI CALLS)
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
      message: `Price $${res.token.priceUsd.toPrecision(4)} | Liq $${Math.round(res.token.liquidityUsd).toLocaleString()} | ${res.token.dexStatus.paid ? 'DEX PAID' : 'UNPAID'}`,
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'REFRESH_MARKET') {
    refreshMarket()
      .then((data) => sendResponse(data ? { ok: true, ...data } : { ok: false }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg?.type === 'SEARCH_CRYPTO') {
    searchCrypto(msg.query)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || 'Search failed') }));
    return true;
  }
  if (msg?.type === 'WATCHLIST_MUTATE') {
    mutateWatchlist(msg)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || 'Update failed') }));
    return true;
  }
  if (msg?.type === 'SCAN_TOKEN') {
    scanToken(msg.query)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || 'Scan failed') }));
    return true;
  }
  if (msg?.type === 'QUICK_CA_META') {
    getQuickCaMeta(msg.ca)
      .then((res) => sendResponse(res))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg?.type === 'OPEN_SCAN_SIDEPANEL' && msg.ca) {
    chrome.storage.local.set({ pendingAction: { type: 'scan', query: msg.ca, ts: Date.now() } }).then(async () => {
      try {
        if (sender?.tab?.windowId && chrome.sidePanel?.open) {
          await chrome.sidePanel.open({ windowId: sender.tab.windowId });
        }
      } catch {}
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg?.type === 'TRACK_WALLET') {
    fetchReadOnlyWallet(msg.address)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || 'Wallet lookup failed') }));
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
    chrome.storage.local.get(['focusState', 'badgeSym']).then(({ focusState, badgeSym }) => {
      updateBadge(msg.market, focusState, badgeSym || 'SOL');
      sendResponse({ ok: true });
    });
    return true;
  }
});
