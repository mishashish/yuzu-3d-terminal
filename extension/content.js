(async function () {
  if (window.top !== window || !chrome?.runtime?.id || !document.body) return;

  const isYuzuTerminal = /yuzuha-simulator\.vercel\.app$/i.test(location.hostname);

  // =======================================================================
  // 1. PRIVACY-FIRST LOCAL SCREEN-TIME HEARTBEAT (every 15s while focused)
  // =======================================================================
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

  // =======================================================================
  // 2. SOLANA CA & $TICKER PAGE SCANNER + ACTIVE TAB CONTEXT
  // =======================================================================
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
          host: location.hostname.replace(/^www\./, ''),
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

  // =======================================================================
  // 3. UPGRADED DRAGGABLE CYBER-Y2K FLOATING WIDGET + SELECTION QUICK-SCAN
  // =======================================================================
  let host = null;
  let drawer = null;
  let latestMarket = null;
  let latestFG = null;
  let latestSolNet = null;
  let latestFocus = null;
  let inlineScanResult = null;
  let inlineScanningCA = '';
  let expanded = false;
  let onMoveRef = null;
  let onUpRef = null;

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
  const shortCA = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '');

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
        `<span style="color:#ff8bcb;font-weight:800">$YUZU</span>` +
        `<span>${focusActive ? '⏱ ' + fmtCountdown(latestFocus.endsAt) : 'Syncing...'}</span>`;
      return;
    }

    const sorted = [...latestMarket].sort((a, b) => b.pct - a.pct);
    const best = sorted[0];
    const sol = latestMarket.find((x) => x.sym === 'SOL') || best;
    const col = sol.pct >= 0 ? '#b8ff65' : '#ff8bcb';
    const sign = sol.pct >= 0 ? '+' : '';

    const rightChunk = focusActive
      ? `<span style="color:#72e7ff;font-weight:700">· ⏱ ${fmtCountdown(latestFocus.endsAt)}</span>`
      : `<span style="opacity:.72">· ${best.sym} ${best.pct >= 0 ? '+' : ''}${best.pct.toFixed(1)}%</span>`;

    pill.innerHTML =
      `<span style="width:7px;height:7px;border-radius:50%;background:${col};box-shadow:0 0 8px ${col};flex:none"></span>` +
      `<b style="color:#ff8bcb">YUZU</b>` +
      `<span>SOL ${fmtPrice(sol.price)} <b style="color:${col}">${sign}${sol.pct.toFixed(1)}%</b></span>` +
      rightChunk;

    if (!drawer || !expanded) return;

    const tpsBadge = latestSolNet?.tps ? ` · ${latestSolNet.tps.toLocaleString()} TPS` : '';
    const fgHtml = latestFG
      ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 7px;margin-bottom:6px;border-radius:7px;background:rgba(255,255,255,0.06);font-size:9.5px">
          <span style="color:#a9a6bd">F&amp;G ${latestFG.value}${tpsBadge}</span>
          <b style="color:${latestFG.value >= 55 ? '#b8ff65' : latestFG.value <= 40 ? '#ff8bcb' : '#72e7ff'}">${latestFG.label.toUpperCase()}</b>
        </div>`
      : '';

    const rowsHtml = latestMarket
      .map((m) => {
        const c = m.pct >= 0 ? '#b8ff65' : '#ff8bcb';
        const s = m.pct >= 0 ? '+' : '';
        return `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
          <b style="color:#d9d9e8;width:40px">${m.sym}</b>
          <span style="flex:1;text-align:right;color:#fff;font-family:monospace">${fmtPrice(m.price)}</span>
          <b style="color:${c};width:52px;text-align:right">${s}${m.pct.toFixed(1)}%</b>
        </div>`;
      })
      .join('');

    const { detectedCAs } = extractPageSignals();
    let caSectionHtml = '';
    if (detectedCAs.length) {
      const caItems = detectedCAs
        .slice(0, 3)
        .map(
          (ca) => `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;padding:3px 6px;border-radius:6px;background:rgba(255,139,203,0.1);border:1px solid rgba(255,139,203,0.28)">
            <span style="font-size:10px;color:#f2eaf8;font-family:monospace">${shortCA(ca)}</span>
            <button data-yuzu-scan="${ca}" style="background:#ff8bcb;color:#08070d;border:none;border-radius:4px;padding:1px 6px;font-size:9px;font-weight:800;cursor:pointer">
              ${inlineScanningCA === ca ? '...' : 'SCAN'}
            </button>
          </div>`
        )
        .join('');

      const resultHtml = inlineScanResult
        ? `<div style="margin-top:5px;padding:6px;border-radius:7px;background:rgba(114,231,255,0.09);border:1px solid rgba(114,231,255,0.35);font-size:9.5px;line-height:1.4">
            <div style="display:flex;justify-content:space-between">
              <b style="color:#fff">$${inlineScanResult.symbol} · ${fmtPrice(inlineScanResult.priceUsd)}</b>
              <b style="color:${inlineScanResult.safety.level === 'SAFE' ? '#b8ff65' : '#ff8bcb'}">${inlineScanResult.safety.level}</b>
            </div>
            <div style="color:#cfd5e6;margin-top:2px">MCap ${fmtCompact(inlineScanResult.marketCap)} · Liq ${fmtCompact(inlineScanResult.liquidityUsd)} · Buys ${inlineScanResult.buyRatioPct}%</div>
          </div>`
        : '';

      caSectionHtml = `<div style="margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.12)">
        <div style="font-size:9px;letter-spacing:0.08em;color:#72e7ff;font-weight:700">DETECTED SOLANA CA ON PAGE</div>
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
      fontFamily: 'system-ui, monospace',
      fontSize: '11px',
      color: '#ffffff',
      userSelect: 'none',
    });

    drawer = document.createElement('div');
    Object.assign(drawer.style, {
      display: 'none',
      width: '256px',
      padding: '9px 11px',
      borderRadius: '13px',
      background: 'rgba(10, 9, 17, 0.96)',
      border: '1px solid rgba(255, 139, 203, 0.45)',
      boxShadow: '0 14px 36px rgba(0,0,0,0.72)',
      backdropFilter: 'blur(12px)',
    });

    const bar = document.createElement('div');
    Object.assign(bar.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 11px',
      borderRadius: '999px',
      background: 'linear-gradient(135deg, rgba(18,16,28,0.94), rgba(8,8,14,0.97))',
      border: '1px solid rgba(255,139,203,0.55)',
      boxShadow: '0 8px 28px rgba(0,0,0,0.55), 0 0 18px rgba(255,139,203,0.22)',
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
      color: 'rgba(255,255,255,0.65)',
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
    const st = await chrome.storage.local.get(['widgetEnabled', 'market', 'fearGreed', 'solNetwork', 'focusState']);
    latestMarket = st.market || null;
    latestFG = st.fearGreed || null;
    latestSolNet = st.solNetwork || null;
    latestFocus = st.focusState || null;
    if (st.widgetEnabled !== false) mountWidget();

    if (!Array.isArray(latestMarket) || !latestMarket.length) {
      chrome.runtime.sendMessage({ type: 'REFRESH_MARKET' }, (resp) => {
        if (chrome.runtime.lastError) return;
        if (resp?.market) latestMarket = resp.market;
        if (resp?.fearGreed) latestFG = resp.fearGreed;
        if (resp?.solNetwork) latestSolNet = resp.solNetwork;
        renderWidget();
      });
    }

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.market) latestMarket = changes.market.newValue;
      if (changes.fearGreed) latestFG = changes.fearGreed.newValue;
      if (changes.solNetwork) latestSolNet = changes.solNetwork.newValue;
      if (changes.focusState) latestFocus = changes.focusState.newValue;
      if (changes.widgetEnabled) {
        if (changes.widgetEnabled.newValue === false) unmountWidget();
        else mountWidget();
      }
      renderWidget();
    });
  } catch {}
})();
