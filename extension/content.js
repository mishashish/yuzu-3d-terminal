(async function () {
  if (window.top !== window || !chrome?.runtime?.id) return;
  const { widgetEnabled, market } = await chrome.storage.local.get(['widgetEnabled', 'market']);
  if (widgetEnabled === false) return;

  const host = document.createElement('div');
  host.id = 'yuzu-ext-floating';
  Object.assign(host.style, {
    position: 'fixed',
    right: '18px',
    bottom: '18px',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 12px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, rgba(20,16,30,0.92), rgba(10,8,16,0.94))',
    border: '1px solid rgba(255,139,203,0.55)',
    boxShadow: '0 8px 28px rgba(0,0,0,0.55), 0 0 18px rgba(255,139,203,0.22)',
    color: '#ffffff',
    fontFamily: 'system-ui, monospace',
    fontSize: '11px',
    cursor: 'pointer',
    backdropFilter: 'blur(12px)',
  });

  const renderBubble = (mList) => {
    if (!Array.isArray(mList) || !mList.length) {
      host.innerHTML = `<span style="color:#ff8bcb;font-weight:800">$YUZU</span><span>Loading...</span>`;
      return;
    }
    const sorted = [...mList].sort((a, b) => b.pct - a.pct);
    const best = sorted[0];
    const sol = mList.find((x) => x.sym === 'SOL') || best;
    const col = sol.pct >= 0 ? '#b8ff65' : '#ff8bcb';
    const sign = sol.pct >= 0 ? '+' : '';
    host.innerHTML =
      `<span style="width:8px;height:8px;border-radius:50%;background:${col};box-shadow:0 0 8px ${col}"></span>` +
      `<b style="color:#ff8bcb">YUZU</b>` +
      `<span>SOL $${sol.price.toFixed(1)} <b style="color:${col}">${sign}${sol.pct.toFixed(1)}%</b></span>` +
      `<span style="opacity:.65">· TOP ${best.sym} ${best.pct >= 0 ? '+' : ''}${best.pct.toFixed(1)}%</span>`;
  };

  renderBubble(market);
  host.title = 'Click to hide Yuzu widget on this page';
  host.addEventListener('click', () => host.remove());
  document.body.appendChild(host);

  // Immediately ask service worker to fetch if storage had no cached market yet
  if (!Array.isArray(market) || !market.length) {
    chrome.runtime.sendMessage({ type: 'REFRESH_MARKET' }, (resp) => {
      if (chrome.runtime.lastError) return;
      if (resp?.market) renderBubble(resp.market);
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.market) renderBubble(changes.market.newValue);
    if (changes.widgetEnabled && changes.widgetEnabled.newValue === false) host.remove();
  });
})();
