(async function () {
  if (window.top !== window || !chrome?.runtime?.id) return;

  let host = null;
  let drawer = null;
  let latestMarket = null;
  let expanded = false;

  const fmtPrice = (p) => (p >= 1000 ? `$${Math.round(p)}` : p >= 1 ? `$${p.toFixed(2)}` : `$${p.toFixed(5)}`);

  function renderContent(mList) {
    latestMarket = mList;
    if (!host) return;
    const pill = host.querySelector('#yuzu-ext-pill');
    if (!pill) return;
    if (!Array.isArray(mList) || !mList.length) {
      pill.innerHTML = `<span style="color:#ff8bcb;font-weight:800">$YUZU</span><span>Loading...</span>`;
      return;
    }
    const sorted = [...mList].sort((a, b) => b.pct - a.pct);
    const best = sorted[0];
    const sol = mList.find((x) => x.sym === 'SOL') || best;
    const col = sol.pct >= 0 ? '#b8ff65' : '#ff8bcb';
    const sign = sol.pct >= 0 ? '+' : '';
    pill.innerHTML =
      `<span style="width:7px;height:7px;border-radius:50%;background:${col};box-shadow:0 0 8px ${col};flex:none"></span>` +
      `<b style="color:#ff8bcb">YUZU</b>` +
      `<span>SOL ${fmtPrice(sol.price)} <b style="color:${col}">${sign}${sol.pct.toFixed(1)}%</b></span>` +
      `<span style="opacity:.65">· ${best.sym} ${best.pct >= 0 ? '+' : ''}${best.pct.toFixed(1)}%</span>`;

    if (drawer) {
      drawer.innerHTML = mList
        .map((m) => {
          const c = m.pct >= 0 ? '#b8ff65' : '#ff8bcb';
          const s = m.pct >= 0 ? '+' : '';
          return `<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.08)">
            <b style="color:#d9d9e8">${m.sym}</b>
            <span>${fmtPrice(m.price)}</span>
            <b style="color:${c}">${s}${m.pct.toFixed(1)}%</b>
          </div>`;
        })
        .join('');
    }
  }

  function mountWidget() {
    if (host) return;
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
      width: '210px',
      padding: '8px 11px',
      borderRadius: '12px',
      background: 'rgba(12, 10, 20, 0.94)',
      border: '1px solid rgba(255, 139, 203, 0.45)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
      backdropFilter: 'blur(12px)',
    });

    const bar = document.createElement('div');
    Object.assign(bar.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 10px',
      borderRadius: '999px',
      background: 'linear-gradient(135deg, rgba(20,16,30,0.92), rgba(10,8,16,0.95))',
      border: '1px solid rgba(255,139,203,0.55)',
      boxShadow: '0 8px 28px rgba(0,0,0,0.55), 0 0 18px rgba(255,139,203,0.22)',
      cursor: 'grab',
      backdropFilter: 'blur(12px)',
    });

    const pill = document.createElement('div');
    pill.id = 'yuzu-ext-pill';
    Object.assign(pill.style, { display: 'flex', alignItems: 'center', gap: '7px' });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'x';
    closeBtn.title = 'Hide on this tab';
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      color: 'rgba(255,255,255,0.6)',
      cursor: 'pointer',
      fontSize: '11px',
      padding: '0 2px',
      lineHeight: '1',
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      unmountWidget();
    });

    // Draggable pill (click toggles mini coin drawer, drag moves widget anywhere on screen)
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
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > 4) moved = true;
      host.style.right = `${Math.max(8, startRight - dx)}px`;
      host.style.bottom = `${Math.max(8, startBottom - dy)}px`;
    });
    window.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      bar.style.cursor = 'grab';
      if (!moved) {
        expanded = !expanded;
        drawer.style.display = expanded ? 'block' : 'none';
      }
    });

    bar.append(pill, closeBtn);
    host.append(drawer, bar);
    document.body.appendChild(host);
    renderContent(latestMarket);
  }

  function unmountWidget() {
    if (host) {
      host.remove();
      host = null;
      drawer = null;
      expanded = false;
    }
  }

  const { widgetEnabled, market } = await chrome.storage.local.get(['widgetEnabled', 'market']);
  latestMarket = market || null;
  if (widgetEnabled !== false) mountWidget();

  if (!Array.isArray(latestMarket) || !latestMarket.length) {
    chrome.runtime.sendMessage({ type: 'REFRESH_MARKET' }, (resp) => {
      if (chrome.runtime.lastError) return;
      if (resp?.market) renderContent(resp.market);
    });
  }

  // Always listen for toggle ON/OFF live without requiring a page reload!
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.market) renderContent(changes.market.newValue);
    if (changes.widgetEnabled) {
      if (changes.widgetEnabled.newValue === false) unmountWidget();
      else mountWidget();
    }
  });
})();
