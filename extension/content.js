(async function () {
  if (window.top !== window || !chrome?.runtime?.id || !document.body) return;

  const isYuzuTerminal = /yuzuha-simulator\.vercel\.app$/i.test(location.hostname);

  // 1. Local Screen-Time Heartbeat (every 15s while tab is visible & focused)
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

  // 2. Solana CA & Ticker Page Detector
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

  // 3. Smoked Obsidian & Chrome Floating Widget (Synced with Custom Watchlist & Badge Coin)
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
    if (detectedCAs.length) {
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
        ? `<div style="margin-top:6px;padding:7px;border-radius:6px;background:rgba(155,232,255,0.06);border:1px solid rgba(155,232,255,0.28);font-size:10px;line-height:1.45">
            <div style="display:flex;justify-content:space-between">
              <b style="color:#ffffff">${inlineScanResult.symbol} · ${fmtPrice(inlineScanResult.priceUsd)}</b>
              <b style="color:${inlineScanResult.safety.level === 'SAFE' ? '#c8ff78' : '#f87171'}">${inlineScanResult.safety.level}</b>
            </div>
            <div style="color:#94a3b8;margin-top:2px">MCap ${fmtCompact(inlineScanResult.marketCap)} · Liq ${fmtCompact(inlineScanResult.liquidityUsd)} · Buys ${inlineScanResult.buyRatioPct}%</div>
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
      width: '272px',
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
        if (changes.widgetEnabled.newValue === false) unmountWidget();
        else mountWidget();
      }
      renderWidget();
    });
  } catch {}
})();
