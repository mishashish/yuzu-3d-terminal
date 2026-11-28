(async function () {
  if (window.top !== window || !chrome?.runtime?.id || !document.body) return;

  const currentHost = location.hostname.toLowerCase().replace(/^www\./, '');
  const isYuzuTerminal = /yuzuha-simulator\.vercel\.app$/i.test(currentHost);

  // =========================================================================
  // 1. ANTI-DRAINER & TYPOSQUAT PHISHING SHIELD (100% LOCAL, ZERO LATENCY)
  // =========================================================================
  const PROTECTED_BRANDS = [
    { brand: 'Phantom Wallet', official: 'phantom.app', aliases: ['phantom.com'], keywords: ['phantom'] },
    { brand: 'Jupiter Exchange', official: 'jup.ag', aliases: ['station.jup.ag', 'jup.eco'], keywords: ['jupiter', 'jup-ag', 'jupag'] },
    { brand: 'Raydium DEX', official: 'raydium.io', aliases: [], keywords: ['raydium'] },
    { brand: 'pump.fun', official: 'pump.fun', aliases: [], keywords: ['pumpfun', 'pump-fun'] },
    { brand: 'DexScreener', official: 'dexscreener.com', aliases: [], keywords: ['dexscreener'] },
    { brand: 'Solflare Wallet', official: 'solflare.com', aliases: [], keywords: ['solflare'] },
    { brand: 'Backpack', official: 'backpack.app', aliases: ['backpack.exchange'], keywords: ['backpack'] },
    { brand: 'Meteora', official: 'meteora.ag', aliases: [], keywords: ['meteora'] },
    { brand: 'Magic Eden', official: 'magiceden.io', aliases: ['magiceden.us'], keywords: ['magiceden'] },
    { brand: 'Orca DEX', official: 'orca.so', aliases: [], keywords: ['orca-dex'] },
    { brand: 'MetaMask', official: 'metamask.io', aliases: [], keywords: ['metamask'] },
    { brand: 'Uniswap', official: 'uniswap.org', aliases: [], keywords: ['uniswap'] },
  ];

  const SAFE_MAINSTREAM_ROOTS = [
    'google.com', 'youtube.com', 'x.com', 'twitter.com', 'github.com', 'reddit.com',
    'discord.com', 'telegram.org', 't.me', 'coingecko.com', 'coinmarketcap.com',
    'binance.com', 'okx.com', 'bybit.com', 'solscan.io', 'rugcheck.xyz', 'birdeye.so',
    'tradingview.com', 'vercel.app', 'medium.com', 'mirror.xyz', 'localhost', '127.0.0.1',
  ];

  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 99;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[a.length][b.length];
  }

  function normalizeHomoglyphs(s) {
    return String(s || '')
      .replace(/rn/g, 'm')
      .replace(/vv/g, 'w')
      .replace(/cl/g, 'd')
      .replace(/0/g, 'o')
      .replace(/1/g, 'l')
      .replace(/-/g, '');
  }

  function detectPhishingClone(host) {
    if (!host || SAFE_MAINSTREAM_ROOTS.some((r) => host === r || host.endsWith('.' + r))) return null;

    for (const item of PROTECTED_BRANDS) {
      const validDomains = [item.official, ...item.aliases];
      if (validDomains.some((d) => host === d || host.endsWith('.' + d))) return null;
    }

    const parts = host.split('.');
    const sld = parts.length >= 2 ? parts[parts.length - 2] : host;
    const normSld = normalizeHomoglyphs(sld);

    for (const item of PROTECTED_BRANDS) {
      const offSld = item.official.split('.')[0];
      const normOff = normalizeHomoglyphs(offSld);
      // 1. Punycode homograph check
      if (host.includes('xn--') && host.includes(offSld.slice(0, 3))) {
        return { brand: item.brand, official: item.official, reason: 'Punycode homograph domain' };
      }
      // 2. Visual homoglyph or 1-char typosquatting (e.g. raydiurn.io, phant0m.app, dexscrener.com)
      if (offSld.length >= 4 && sld !== offSld && (normSld === normOff || editDistance(normSld, normOff) <= 1 || editDistance(sld, offSld) <= 1)) {
        return { brand: item.brand, official: item.official, reason: `Lookalike typosquat of ${item.official}` };
      }
      // 3. Wrong TLD impersonation (e.g. phantom-wallet.org, raydium.app, pumpfun.com)
      if (sld === offSld && host !== item.official) {
        return { brand: item.brand, official: item.official, reason: `Unofficial domain extension for ${item.official}` };
      }
      // 4. Deceptive claim / airdrop / connect lure domain containing brand name
      const lureRe = /(claim|airdrop|reward|drop|bonus|verify|connect|sync|restore|support|v2|portal|swap)/i;
      if (item.keywords.some((kw) => host.includes(kw) || normSld.includes(kw)) && lureRe.test(host)) {
        return { brand: item.brand, official: item.official, reason: `Suspected ${item.brand} drainer lure domain` };
      }
    }
    return null;
  }

  function mountPhishingWarning(threat) {
    if (document.getElementById('yuzu-phish-shield')) return;
    const banner = document.createElement('div');
    banner.id = 'yuzu-phish-shield';
    Object.assign(banner.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '2147483647',
      background: 'linear-gradient(90deg, #450a0a 0%, #7f1d1d 50%, #450a0a 100%)',
      borderBottom: '2px solid #f87171',
      color: '#ffffff',
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '14px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '12px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.85)',
    });

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <span style="background:#f87171;color:#05070a;font-weight:800;padding:3px 8px;border-radius:4px;letter-spacing:0.08em">SECURITY ALERT</span>
        <span><b>$YUZU SHIELD:</b> <u>${currentHost}</u> looks like a phishing clone (${threat.reason}). Do NOT connect your wallet or sign transactions.</span>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <a href="https://${threat.official}" style="background:#ffffff;color:#05070a;text-decoration:none;font-weight:700;padding:6px 12px;border-radius:5px;font-size:11px">GO TO ${threat.official.toUpperCase()}</a>
        <button id="yuzu-phish-dismiss" style="background:rgba(0,0,0,0.4);color:#fecaca;border:1px solid rgba(255,255,255,0.3);padding:6px 10px;border-radius:5px;cursor:pointer;font-size:11px">DISMISS</button>
      </div>
    `;
    document.body.appendChild(banner);
    banner.querySelector('#yuzu-phish-dismiss')?.addEventListener('click', () => banner.remove());
  }

  const phishCheck = detectPhishingClone(currentHost);
  if (phishCheck) mountPhishingWarning(phishCheck);

  // =========================================================================
  // 2. LOCAL SCREEN-TIME HEARTBEAT
  // =========================================================================
  setInterval(() => {
    try {
      if (document.visibilityState === 'visible' && document.hasFocus() && chrome.runtime?.id) {
        chrome.runtime.sendMessage(
          { type: 'TRACK_TIME', host: location.hostname, seconds: 15 },
          () => void chrome.runtime.lastError
        );
      }
    } catch {}
  }, 15000);

  // =========================================================================
  // 3. SOLANA CA DETECTOR + LIVE INLINE X/TWITTER & FEED CA X-RAY BADGES
  // =========================================================================
  function isLikelySolanaCA(s) {
    if (!s || s.length < 32 || s.length > 44) return false;
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return false;
    return /[0-9]/.test(s) && /[A-Z]/.test(s) && /[a-z]/.test(s);
  }

  function extractPageSignals() {
    const caSet = new Set();
    const tickerSet = new Set();

    const urlParts = (location.pathname + ' ' + location.search).split(/[/?&=]+/);
    for (const part of urlParts) {
      if (isLikelySolanaCA(part)) caSet.add(part);
    }

    const links = document.querySelectorAll('a[href]');
    for (let i = 0; i < Math.min(links.length, 250); i++) {
      const href = links[i].getAttribute('href') || '';
      if (/dexscreener|pump\.fun|jup\.ag|raydium|birdeye|solscan|rugcheck|photon|gmgn/i.test(href)) {
        const segs = href.split(/[/?&#=]+/);
        for (const seg of segs) {
          if (isLikelySolanaCA(seg)) caSet.add(seg);
        }
      }
    }

    const rawText = (document.body?.innerText || '').slice(0, 32000);
    const caMatches = rawText.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g) || [];
    for (const m of caMatches) {
      if (isLikelySolanaCA(m)) caSet.add(m);
      if (caSet.size >= 6) break;
    }

    const tickerMatches = rawText.match(/\$[A-Za-z][A-Za-z0-9]{1,8}\b/g) || [];
    for (const t of tickerMatches) {
      const up = t.toUpperCase();
      if (!/^\$(USD|EUR|GBP|CAD|AUD)$/.test(up)) tickerSet.add(up);
      if (tickerSet.size >= 6) break;
    }

    return {
      detectedCAs: [...caSet].slice(0, 5),
      detectedTickers: [...tickerSet].slice(0, 6),
      rawText,
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'GET_PAGE_CONTEXT') {
      try {
        const selection = (window.getSelection?.()?.toString() || '').trim().slice(0, 1400);
        const { detectedCAs, detectedTickers, rawText } = extractPageSignals();
        const cleanSnippet = rawText.replace(/\s+/g, ' ').trim().slice(0, 2000);
        sendResponse({
          ok: true,
          title: document.title || location.hostname,
          url: location.href,
          host: currentHost,
          selection,
          snippet: cleanSnippet,
          detectedCAs,
          detectedTickers,
        });
      } catch {
        sendResponse({ ok: false });
      }
      return true;
    }
  });

  if (isYuzuTerminal) return;

  function fmtPrice(p) {
    const n = Number(p) || 0;
    if (n >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`;
    if (n >= 1) return `$${n.toFixed(2)}`;
    if (n >= 0.01) return `$${n.toFixed(4)}`;
    const s = n.toFixed(12);
    const m = s.match(/^0\.(0*)(\d{1,4})/);
    if (m && m[1].length >= 4) {
      const sub = '₀₁₂₃₄₅₆₇₈₉';
      const z = String(m[1].length).split('').map((d) => sub[d]).join('');
      return `$0.0${z}${m[2].slice(0, 3)}`;
    }
    return `$${n.toFixed(5)}`;
  }

  const fmtCompact = (n) =>
    n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`;
  const shortCA = (a) => (a ? `${a.slice(0, 5)}...${a.slice(-4)}` : '');

  // Inject clean inline CA X-Ray badges directly inside X/Twitter posts, Telegram Web, Reddit & articles!
  let inlineBadgesEnabled = true;
  let injectedBadgeCount = 0;

  function createInlineCaBadge(ca) {
    const pill = document.createElement('span');
    pill.className = 'yuzu-inline-ca-badge';
    pill.setAttribute('data-yuzu-ca', ca);
    Object.assign(pill.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      margin: '0 4px',
      padding: '2px 7px',
      borderRadius: '5px',
      background: 'rgba(8, 12, 19, 0.94)',
      border: '1px solid rgba(155, 232, 255, 0.35)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '10.5px',
      lineHeight: '1.35',
      color: '#e2e8f0',
      verticalAlign: 'middle',
      whiteSpace: 'nowrap',
      boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
    });
    pill.textContent = 'YUZU: scanning CA...';

    chrome.runtime.sendMessage({ type: 'QUICK_CA_META', ca }, (res) => {
      if (chrome.runtime.lastError || !res?.ok || !res.meta) {
        pill.remove();
        return;
      }
      const m = res.meta;
      const pctVal = Math.abs(m.pct24h) < 0.05 ? 0 : m.pct24h;
      const pctCol = pctVal >= 0 ? '#c8ff78' : '#f87171';
      const sign = pctVal >= 0 ? '+' : '';
      const paidTag = m.dexPaid
        ? `<span style="color:#c8ff78;background:rgba(200,255,120,0.14);padding:0 4px;border-radius:3px;font-size:9px;font-weight:700">PAID</span>`
        : m.cto
        ? `<span style="color:#9be8ff;background:rgba(155,232,255,0.14);padding:0 4px;border-radius:3px;font-size:9px;font-weight:700">CTO</span>`
        : `<span style="color:#94a3b8;font-size:9px">UNPAID</span>`;

      pill.innerHTML = `
        <b style="color:#ffffff">$${m.sym}</b>
        <span style="color:#cbd5e1">MC ${fmtCompact(m.mcap)}</span>
        <span style="color:#94a3b8">Liq ${fmtCompact(m.liqUsd)}</span>
        <b style="color:${pctCol}">${sign}${pctVal.toFixed(1)}%</b>
        ${paidTag}
        <button data-act="audit" title="Open full $YUZU audit" style="background:#e6ecf5;color:#05070a;border:none;border-radius:3px;padding:1px 5px;font-size:9px;font-weight:800;cursor:pointer">SCAN</button>
        <a href="https://jup.ag/swap/SOL-${encodeURIComponent(m.address)}" target="_blank" rel="noopener" style="color:#9be8ff;text-decoration:none;font-size:9px;font-weight:700">JUP</a>
      `;

      pill.querySelector('button[data-act="audit"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: 'OPEN_SCAN_SIDEPANEL', ca: m.address });
        // Also populate floating drawer right on page if mounted!
        expanded = true;
        if (drawer) drawer.style.display = 'block';
        inlineScanningCA = m.address;
        renderWidget();
        chrome.runtime.sendMessage({ type: 'SCAN_TOKEN', query: m.address }, (sr) => {
          inlineScanningCA = '';
          if (!chrome.runtime.lastError && sr?.ok && sr.token) inlineScanResult = sr.token;
          renderWidget();
        });
      });
    });

    return pill;
  }

  function scanDomForInlineBadges(root = document.body) {
    if (!inlineBadgesEnabled || !root || injectedBadgeCount >= 18) return;
    // Skip DEX terminal apps that already render native contract tables
    if (/dexscreener\.com|birdeye\.so|solscan\.io|photon|gmgn\.ai|bullx\.io/i.test(currentHost)) return;

    const selectors =
      /x\.com|twitter\.com/i.test(currentHost)
        ? '[data-testid="tweetText"]'
        : 'p, article, [class*="message"], [class*="post"], li, div';
    const containers = root.querySelectorAll ? root.querySelectorAll(selectors) : [];

    for (let i = 0; i < Math.min(containers.length, 60); i++) {
      if (injectedBadgeCount >= 18) break;
      const el = containers[i];
      if (!el || el.dataset?.yuzuCaScanned === '1') continue;
      if (el.closest('#yuzu-ext-floating, #yuzu-phish-shield, input, textarea, pre, code, script, style')) continue;
      // Only scan leaf-like text containers to avoid touching big layout wrappers
      if (el.children.length > 8 && !el.matches?.('[data-testid="tweetText"]')) continue;

      const txt = el.textContent || '';
      if (txt.length < 32 || txt.length > 1200) continue;
      const matches = txt.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g);
      if (!matches) continue;

      const validCa = matches.find(isLikelySolanaCA);
      if (!validCa) continue;

      el.dataset.yuzuCaScanned = '1';
      if (el.querySelector(`.yuzu-inline-ca-badge[data-yuzu-ca="${validCa}"]`)) continue;

      injectedBadgeCount++;
      el.appendChild(createInlineCaBadge(validCa));
    }
  }

  let domScanTimer = null;
  const domObserver = new MutationObserver(() => {
    if (!inlineBadgesEnabled) return;
    clearTimeout(domScanTimer);
    domScanTimer = setTimeout(() => scanDomForInlineBadges(document.body), 650);
  });
  domObserver.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => scanDomForInlineBadges(document.body), 800);

  // =========================================================================
  // 4. SMOKED OBSIDIAN & CHROME FLOATING WIDGET
  // =========================================================================
  let host = null;
  let drawer = null;
  let latestMarket = null;
  let latestFG = null;
  let latestSolNet = null;
  let latestFocus = null;
  let latestBadgeSym = 'SOL';
  let inlineScanResult = null;
  let inlineScanningCA = '';
  let expanded = false;
  let onMoveRef = null;
  let onUpRef = null;

  function fmtCountdown(endsAt) {
    const sec = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderWidget() {
    if (!host) return;
    const pill = host.querySelector('#yuzu-ext-pill');
    if (!pill) return;

    const focusActive = latestFocus?.active && latestFocus.endsAt > Date.now();

    if (!Array.isArray(latestMarket) || !latestMarket.length) {
      pill.innerHTML =
        `<span style="color:#e6ecf5;font-weight:700;letter-spacing:0.06em">$YUZU</span>` +
        `<span style="color:#8b95a7">${focusActive ? 'FOCUS ' + fmtCountdown(latestFocus.endsAt) : 'SYNCING'}</span>`;
      return;
    }

    const sorted = [...latestMarket].sort((a, b) => b.pct - a.pct);
    const best = sorted[0];
    const primary =
      latestMarket.find((x) => String(x.sym).toUpperCase() === String(latestBadgeSym || 'SOL').toUpperCase()) ||
      latestMarket.find((x) => x.sym === 'SOL') ||
      latestMarket[0];
    const col = primary.pct >= 0 ? '#c8ff78' : '#f87171';
    const sign = primary.pct >= 0 ? '+' : '';

    const rightChunk = focusActive
      ? `<span style="color:#9be8ff;font-weight:600">FOCUS ${fmtCountdown(latestFocus.endsAt)}</span>`
      : best && best.sym !== primary.sym
      ? `<span style="color:#94a3b8">${best.sym} ${best.pct >= 0 ? '+' : ''}${best.pct.toFixed(1)}%</span>`
      : `<span style="color:#94a3b8">${latestMarket.length} TRACKED</span>`;

    pill.innerHTML =
      `<span style="width:6px;height:6px;border-radius:50%;background:${col};box-shadow:0 0 6px ${col};flex:none"></span>` +
      `<b style="color:#e6ecf5;letter-spacing:0.05em">YUZU</b>` +
      `<span style="color:#cbd5e1">${primary.sym} ${fmtPrice(primary.price)} <b style="color:${col}">${sign}${primary.pct.toFixed(1)}%</b></span>` +
      `<span style="color:rgba(255,255,255,0.2)">|</span>` +
      rightChunk;

    if (!drawer || !expanded) return;

    const tpsBadge = latestSolNet?.tps ? ` | ${latestSolNet.tps.toLocaleString()} TPS` : '';
    const fgHtml = latestFG
      ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;margin-bottom:7px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px">
          <span style="color:#94a3b8">F&amp;G ${latestFG.value}${tpsBadge}</span>
          <b style="color:${latestFG.value >= 55 ? '#c8ff78' : latestFG.value <= 40 ? '#f87171' : '#9be8ff'}">${latestFG.label.toUpperCase()}</b>
        </div>`
      : '';

    const rowsHtml = latestMarket
      .slice(0, 10)
      .map((m) => {
        const c = m.pct >= 0 ? '#c8ff78' : '#f87171';
        const s = m.pct >= 0 ? '+' : '';
        return `<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 2px;border-bottom:1px solid rgba(255,255,255,0.06);font-variant-numeric:tabular-nums">
          <b style="color:#e2e8f0;width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.sym}</b>
          <span style="flex:1;text-align:right;color:#cbd5e1">${fmtPrice(m.price)}</span>
          <b style="color:${c};width:56px;text-align:right">${s}${m.pct.toFixed(1)}%</b>
        </div>`;
      })
      .join('');

    const { detectedCAs } = extractPageSignals();
    let caSectionHtml = '';
    if (detectedCAs.length || inlineScanResult) {
      const caItems = detectedCAs
        .slice(0, 3)
        .map(
          (ca) => `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px;padding:4px 7px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(226,236,250,0.14)">
            <span style="font-size:10px;color:#cbd5e1">${shortCA(ca)}</span>
            <button data-yuzu-scan="${ca}" style="background:#e6ecf5;color:#05070a;border:none;border-radius:4px;padding:2px 7px;font-size:9px;font-weight:700;letter-spacing:0.05em;cursor:pointer">
              ${inlineScanningCA === ca ? 'WAIT' : 'SCAN'}
            </button>
          </div>`
        )
        .join('');

      const resultHtml = inlineScanResult
        ? `<div style="margin-top:6px;padding:7px;border-radius:6px;background:rgba(155,232,255,0.07);border:1px solid rgba(155,232,255,0.3);font-size:10px;line-height:1.45">
            <div style="display:flex;justify-content:space-between">
              <b style="color:#ffffff">${inlineScanResult.symbol} · ${fmtPrice(inlineScanResult.priceUsd)}</b>
              <b style="color:${inlineScanResult.safety.level === 'SAFE' ? '#c8ff78' : '#f87171'}">${inlineScanResult.safety.level}</b>
            </div>
            <div style="color:#94a3b8;margin-top:2px">MCap ${fmtCompact(inlineScanResult.marketCap)} · Liq ${fmtCompact(inlineScanResult.liquidityUsd)} · ${inlineScanResult.dexStatus?.paid ? 'DEX PAID' : 'UNPAID'}${inlineScanResult.holders?.top10Pct != null ? ' · Top10 ' + inlineScanResult.holders.top10Pct + '%' : ''}</div>
          </div>`
        : '';

      caSectionHtml = `<div style="margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.1)">
        <div style="font-size:9px;letter-spacing:0.08em;color:#9be8ff;font-weight:700">DETECTED ON PAGE</div>
        ${caItems}
        ${resultHtml}
      </div>`;
    }

    drawer.innerHTML = fgHtml + rowsHtml + caSectionHtml;

    drawer.querySelectorAll('button[data-yuzu-scan]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const ca = btn.getAttribute('data-yuzu-scan');
        if (!ca || inlineScanningCA) return;
        inlineScanningCA = ca;
        renderWidget();
        chrome.runtime.sendMessage({ type: 'SCAN_TOKEN', query: ca }, (res) => {
          inlineScanningCA = '';
          if (!chrome.runtime.lastError && res?.ok && res.token) {
            inlineScanResult = res.token;
          }
          renderWidget();
        });
      });
    });
  }

  function unmountWidget() {
    if (onMoveRef) {
      window.removeEventListener('pointermove', onMoveRef);
      onMoveRef = null;
    }
    if (onUpRef) {
      window.removeEventListener('pointerup', onUpRef);
      onUpRef = null;
    }
    if (host) {
      host.remove();
      host = null;
      drawer = null;
      expanded = false;
    }
  }

  function mountWidget() {
    if (host || !document.body) return;
    host = document.createElement('div');
    host.id = 'yuzu-ext-floating';
    Object.assign(host.style, {
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '6px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '11px',
      color: '#ffffff',
      userSelect: 'none',
    });

    drawer = document.createElement('div');
    Object.assign(drawer.style, {
      display: 'none',
      width: '280px',
      padding: '10px 12px',
      borderRadius: '10px',
      background: 'rgba(6, 8, 12, 0.96)',
      border: '1px solid rgba(226, 236, 250, 0.18)',
      borderTop: '1px solid rgba(255, 255, 255, 0.32)',
      boxShadow: '0 16px 40px rgba(0,0,0,0.78)',
      backdropFilter: 'blur(12px)',
    });

    const bar = document.createElement('div');
    Object.assign(bar.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      borderRadius: '8px',
      background: 'rgba(8, 11, 16, 0.94)',
      border: '1px solid rgba(226, 236, 250, 0.22)',
      borderTop: '1px solid rgba(255, 255, 255, 0.36)',
      boxShadow: '0 10px 28px rgba(0,0,0,0.65)',
      cursor: 'grab',
      backdropFilter: 'blur(12px)',
    });

    const pill = document.createElement('div');
    pill.id = 'yuzu-ext-pill';
    Object.assign(pill.style, { display: 'flex', alignItems: 'center', gap: '7px' });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.title = 'Hide on this tab';
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      color: 'rgba(226,236,250,0.55)',
      cursor: 'pointer',
      fontSize: '13px',
      padding: '0 2px',
      lineHeight: '1',
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      unmountWidget();
    });

    let dragging = false, moved = false, startX = 0, startY = 0, startRight = 18, startBottom = 18;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target === closeBtn) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      startRight = parseFloat(host.style.right) || 18;
      startBottom = parseFloat(host.style.bottom) || 18;
      bar.style.cursor = 'grabbing';
    });
    onMoveRef = (e) => {
      if (!dragging || !host) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > 4) moved = true;
      host.style.right = `${Math.max(8, startRight - dx)}px`;
      host.style.bottom = `${Math.max(8, startBottom - dy)}px`;
    };
    onUpRef = () => {
      if (!dragging || !drawer) return;
      dragging = false;
      bar.style.cursor = 'grab';
      if (!moved) {
        expanded = !expanded;
        drawer.style.display = expanded ? 'block' : 'none';
        if (expanded) renderWidget();
      }
    };
    window.addEventListener('pointermove', onMoveRef);
    window.addEventListener('pointerup', onUpRef);

    bar.append(pill, closeBtn);
    host.append(drawer, bar);
    document.body.appendChild(host);
    renderWidget();
  }

  setInterval(() => {
    if (latestFocus?.active && host) {
      if (latestFocus.endsAt <= Date.now()) latestFocus.active = false;
      renderWidget();
    }
  }, 1000);

  try {
    const st = await chrome.storage.local.get(['widgetEnabled', 'market', 'fearGreed', 'solNetwork', 'focusState', 'badgeSym']);
    latestMarket = st.market || null;
    latestFG = st.fearGreed || null;
    latestSolNet = st.solNetwork || null;
    latestFocus = st.focusState || null;
    latestBadgeSym = st.badgeSym || 'SOL';
    inlineBadgesEnabled = st.widgetEnabled !== false;
    if (st.widgetEnabled !== false) mountWidget();

    if (!Array.isArray(latestMarket) || !latestMarket.length) {
      chrome.runtime.sendMessage({ type: 'REFRESH_MARKET' }, (resp) => {
        if (chrome.runtime.lastError) return;
        if (resp?.market) latestMarket = resp.market;
        if (resp?.fearGreed) latestFG = resp.fearGreed;
        if (resp?.solNetwork) latestSolNet = resp.solNetwork;
        if (resp?.badgeSym) latestBadgeSym = resp.badgeSym;
        renderWidget();
      });
    }

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.market) latestMarket = changes.market.newValue;
      if (changes.fearGreed) latestFG = changes.fearGreed.newValue;
      if (changes.solNetwork) latestSolNet = changes.solNetwork.newValue;
      if (changes.focusState) latestFocus = changes.focusState.newValue;
      if (changes.badgeSym) latestBadgeSym = changes.badgeSym.newValue || 'SOL';
      if (changes.widgetEnabled) {
        inlineBadgesEnabled = changes.widgetEnabled.newValue !== false;
        if (changes.widgetEnabled.newValue === false) {
          unmountWidget();
          document.querySelectorAll('.yuzu-inline-ca-badge').forEach((b) => b.remove());
          injectedBadgeCount = 0;
        } else {
          mountWidget();
          scanDomForInlineBadges(document.body);
        }
      }
      renderWidget();
    });
  } catch {}
})();
