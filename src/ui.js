import { TOKEN } from './config.js';
import { FreeAIChat } from './aiChat.js';
import { renderY2KLogo } from './logoForge.js';
import { yuzuWallet } from './walletconnect.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const hasCA = () => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(TOKEN.contractAddress || '');

const fmtUsd = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
};
const fmtPrice = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1) return '$' + n.toFixed(4);
  const s = n.toFixed(12);
  const m = s.match(/^0\.(0*)(\d{1,4})/);
  if (!m) return '$' + n.toPrecision(3);
  const zeros = m[1].length;
  const sub = '₀₁₂₃₄₅₆₇₈₉';
  return zeros > 3 ? `$0.0${String(zeros).split('').map((d) => sub[d]).join('')}${m[2]}` : '$' + n.toPrecision(4);
};
const shortAddr = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '');

let toastTimer;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

const SLIDERS = [
  { key: 'sway', label: 'M1 SWAY', val: 0.72 },
  { key: 'breathe', label: 'M2 BREATHE', val: 0.85 },
  { key: 'headTilt', label: 'M3 TILT', val: 0.78 },
  { key: 'sparkles', label: 'M4 SPARKLE', val: 0.80 },
];

export function initUI(stage) {
  // Static token fields
  $$('[data-ticker]').forEach((el) => (el.textContent = TOKEN.ticker));
  $$('[data-tagline]').forEach((el) => (el.textContent = TOKEN.tagline));
  $$('[data-tax]').forEach((el) => (el.textContent = `${TOKEN.buyTax}% / ${TOKEN.sellTax}%`));
  document.title = `$${TOKEN.ticker} — ${TOKEN.tagline}`;
  $('#ca-value').textContent = hasCA() ? TOKEN.contractAddress : 'Launching soon — set CA in config.js';
  if ($('#link-twitter')) $('#link-twitter').href = TOKEN.links.twitter;

  // Header charm load segments
  const loadSegs = [];
  const loadWrap = $('#load-segments');
  for (let i = 0; i < 20; i++) {
    const s = document.createElement('span');
    s.className = 'load-seg';
    loadWrap.appendChild(s);
    loadSegs.push(s);
  }

  // Energy bars
  const energyWrap = $('#energy-bars');
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('span');
    s.className = i < 2 ? 'energy-seg pink' : i < 9 ? 'energy-seg green' : 'energy-seg';
    energyWrap.appendChild(s);
  }

  // Tokenomics donut
  let acc = 0;
  const stops = TOKEN.tokenomics.map((t) => {
    const from = acc;
    acc += t.pct;
    return `${t.color} ${from}% ${acc}%`;
  });
  $('#donut').style.background = `conic-gradient(${stops.join(',')})`;
  $('#tk-rows').innerHTML = TOKEN.tokenomics
    .map(
      (t) => `<div class="tk-row"><span class="tk-swatch" style="background:${t.color}"></span>
      <span class="tk-name">${t.label}</span><span class="tk-pct">${t.pct}%</span></div>`
    )
    .join('');

  // Interactive Motion Sliders (Card 04)
  const sliderWrap = $('#motion-sliders');
  for (const s of SLIDERS) {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <span class="slider-name">${s.label}</span>
      <div class="slider-track"><div class="slider-fill" style="width:${Math.round(s.val * 100)}%"></div></div>
      <span class="slider-val">${Math.round(s.val * 100)}%</span>
    `;
    const track = row.querySelector('.slider-track');
    const fill = row.querySelector('.slider-fill');
    const valEl = row.querySelector('.slider-val');

    const update = (e) => {
      const r = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      fill.style.width = `${Math.round(pct * 100)}%`;
      valEl.textContent = `${Math.round(pct * 100)}%`;
      stage.setParam(s.key, pct);
    };
    row.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      update(e);
      const move = (ev) => update(ev);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
    sliderWrap.appendChild(row);
  }

  // Live Crypto Degen Radar (SOL, BTC, ETH, WIF, BONK, JUP from Binance public API via Vite proxy)
  let latestMarket = [];
  const CRYPTO_PAIRS = ['SOLUSDT', 'BTCUSDT', 'ETHUSDT', 'WIFUSDT', 'BONKUSDT', 'JUPUSDT'];
  const loadCryptoRadar = async () => {
    try {
      const syms = encodeURIComponent(JSON.stringify(CRYPTO_PAIRS));
      const res = await fetch(`/api/crypto?symbols=${syms}`);
      if (!res.ok) return;
      const arr = await res.json();
      if (!Array.isArray(arr)) return;
      latestMarket = arr.map((x) => ({
        sym: x.symbol.replace('USDT', ''),
        price: parseFloat(x.lastPrice),
        pct: parseFloat(x.priceChangePercent),
      }));
      const wrap = $('#crypto-radar');
      if (wrap) {
        wrap.innerHTML = latestMarket
          .map((m) => {
            const cls = m.pct > 0.05 ? 'up' : m.pct < -0.05 ? 'down' : 'flat';
            const sign = m.pct > 0 ? '+' : '';
            const pStr = m.price >= 1000 ? `$${Math.round(m.price)}` : m.price >= 1 ? `$${m.price.toFixed(2)}` : `$${m.price.toFixed(5)}`;
            return `<div class="radar-row"><span>${m.sym}</span><b>${pStr}</b><em class="${cls}">${sign}${m.pct.toFixed(1)}%</em></div>`;
          })
          .join('');
      }
    } catch { }
  };
  loadCryptoRadar();
  setInterval(loadCryptoRadar, 25000);

  const speakMarketBrief = async () => {
    if (!latestMarket.length) await loadCryptoRadar();
    if (!latestMarket.length) {
      const msg = 'Exchange feed is taking a breather, but we still hold SOL and $YUZU!';
      stage.react('happy', null, msg);
      ai.speak(msg);
      return;
    }
    const sorted = [...latestMarket].sort((a, b) => b.pct - a.pct);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const sol = latestMarket.find((m) => m.sym === 'SOL');
    const btc = latestMarket.find((m) => m.sym === 'BTC');
    const pose = best.pct > 2 ? 'dance' : worst.pct < -3 ? 'pout' : 'peace';
    const msg =
      `Degen market brief! Top gainer is ${best.sym} at ${best.pct >= 0 ? '+' : ''}${best.pct.toFixed(1)}%, ` +
      `while ${worst.sym} took the biggest dip at ${worst.pct.toFixed(1)}%. ` +
      `SOL is trading at $${sol ? sol.price.toFixed(1) : '—'} and BTC at $${btc ? Math.round(btc.price) : '—'}. ` +
      `${worst.pct < -4 ? 'Time to buy the dip!' : 'Market looks alive, stay sharp!'}`;
    appendChat(`> [MARKET] ${msg}`, 'bot');
    stage.react(pose, null, msg);
    ai.speak(msg);
  };
  $('#btn-market-brief')?.addEventListener('click', speakMarketBrief);

  // Heartbeat Audio toggle (lub-dub synced to Yuzu's real BPM)
  const btnPulseAudio = $('#btn-pulse-audio');
  btnPulseAudio?.addEventListener('click', () => {
    const next = !stage.heartbeatAudioOn;
    stage.setHeartbeatAudio(next);
    btnPulseAudio.classList.toggle('active', next);
    btnPulseAudio.textContent = next ? 'PULSE ON' : 'PULSE OFF';
    toast(next ? 'Yuzu heartbeat audio enabled' : 'Heartbeat audio muted');
  });

  // Viral OG Airdrop Multiplier Lock button
  let ogLocked = false;
  const MULT_BY_LVL = ['1.0×', '1.5×', '2.5×', '3.5×', '5.0×'];
  $('#btn-claim-og')?.addEventListener('click', () => {
    const mult = MULT_BY_LVL[(stage.bondLevel || 1) - 1] || '1.0×';
    ogLocked = true;
    const btn = $('#btn-claim-og');
    if (btn) btn.textContent = `OG PASS ACTIVE (${mult})`;
    const msg = `Nice! You locked your OG Airdrop Pass at ${mult}! Keep petting my head and chatting to reach 5.0x SOULMATE!`;
    stage.react('happy', null, msg);
    appendChat(`> [OG PASS] ${msg}`, 'bot');
    ai.speak(msg);
  });

  // Action buttons
  $$('[data-react]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.react === 'headpat' && (ai.mood === 'offended' || stage.offended)) {
        ai.setMood('happy', 'The user petted your head to make up.');
        stage.setOffended(false);
      }
      stage.react(btn.dataset.react);
    });
  });

  // Collapsible Chat Dock toggle so it never overlaps right-column buttons
  const chatDock = $('#chat-dock');
  const chatFab = $('#btn-chat-toggle');
  const setChatOpen = (open) => {
    chatDock?.classList.toggle('collapsed', !open);
    chatDock?.setAttribute('aria-hidden', String(!open));
    chatFab?.classList.toggle('hidden', open);
    if (open) setTimeout(() => $('#chat-input')?.focus(), 120);
  };
  chatFab?.addEventListener('click', () => setChatOpen(true));
  $('#btn-chat-min')?.addEventListener('click', () => setChatOpen(false));

  // Keyboard shortcuts (active when not typing in an input)
  window.addEventListener('keydown', (e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'p') {
      if (ai.mood === 'offended' || stage.offended) {
        ai.setMood('happy', 'The user petted your head to make up.');
        stage.setOffended(false);
      }
      stage.react('headpat');
    } else if (k === 'c') {
      setChatOpen(chatDock?.classList.contains('collapsed'));
    } else if (k === 's') {
      setViewMode(stage.viewMode === 'skeleton' ? 'normal' : 'skeleton', true);
    } else if (k === 't') {
      tourActive ? stopTour() : startTour();
    } else if (k === 'l') {
      forgeOverlay?.classList.add('open');
      drawForge();
    }
  });

  // Free Unlimited AI Chat + default-ON Web Speech voice synced with 3D lip-sync
  const ai = new FreeAIChat({
    onSpeakStart: () => stage.setSpeaking(true),
    onSpeakEnd: () => stage.setSpeaking(false),
  });
  const chatLog = $('#chat-log');
  const chatForm = $('#chat-form');
  const chatInput = $('#chat-input');
  const btnVoice = $('#btn-voice');

  const appendChat = (text, who = 'bot') => {
    const div = document.createElement('div');
    div.className = `chat-msg ${who}`;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    return div;
  };

  btnVoice?.addEventListener('click', () => {
    const next = !ai.voiceEnabled;
    ai.setVoice(next);
    btnVoice.textContent = next ? 'VOICE ON' : 'VOICE OFF';
    btnVoice.classList.toggle('active', next);
  });

  // Spotlight helper so Yuzu can highlight any block/button she is explaining
  let spotlightTimer;
  const spotlight = (selector, ms = 4200) => {
    $$('.guide-spotlight').forEach((el) => el.classList.remove('guide-spotlight'));
    const target = typeof selector === 'string' ? $(selector) : selector;
    if (!target) return;
    target.classList.add('guide-spotlight');
    clearTimeout(spotlightTimer);
    spotlightTimer = setTimeout(() => target.classList.remove('guide-spotlight'), ms);
  };

  // 3D Rig / Skeleton Breakdown mode controller
  const rigHud = $('#rig-hud');
  const setViewMode = (mode, announce = false) => {
    stage.setViewMode(mode);
    $$('#view-chips [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === mode));
    const isBreakdown = mode !== 'normal';
    rigHud?.classList.toggle('open', isBreakdown);
    if (isBreakdown) {
      const st = stage.getRigStats();
      $('#rig-bones').textContent = st.bones || '—';
      $('#rig-tris').textContent = st.tris ? `${(st.tris / 1000).toFixed(1)}K` : '—';
      $('#rig-springs').textContent = st.springs || '—';
    }
    if (announce) {
      if (mode === 'skeleton') {
        const msg = 'X-ray rig breakdown active! Green lines are my VRM skeleton, pink and cyan nodes are live IK joints.';
        stage.react('peace', null, msg);
        ai.speak(msg);
      } else if (mode === 'wireframe') {
        const msg = '3D wireframe mode! Inspect every polygon and topology edge of my model.';
        stage.react('spin', null, msg);
        ai.speak(msg);
      } else {
        stage.react('happy', null, 'Back to normal 3D render.');
      }
    }
  };

  $$('#view-chips [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.view, true));
  });
  $('#btn-rig-close')?.addEventListener('click', () => setViewMode('normal', false));

  // Clickable Rig Breakdown part explanations (Yuzu demonstrates & explains!)
  const RIG_EXPLANATIONS = {
    legs: {
      pose: 'dance',
      cam: 'full',
      text: 'My legs use analytic 2-bone inverse kinematics so my feet stay grounded even while dancing!',
    },
    hair: {
      pose: 'spin',
      cam: 'hero',
      text: 'My hair runs real VRM SpringBone physics — every strand reacts to turns and momentum in real time.',
    },
    face: {
      pose: 'kiss',
      cam: 'face',
      text: 'My eyes track your cursor via VRM LookAt while facial blendshapes sync my lips to every word.',
    },
    spine: {
      pose: 'shy',
      cam: 'outfit',
      text: 'Spine and chest follow multi-harmonic breathing and sway — tune them live with the Motion Engine sliders in 002 CONTROL!',
    },
  };
  $$('#rig-parts [data-rig]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const info = RIG_EXPLANATIONS[btn.dataset.rig];
      if (!info) return;
      stage.setCameraPreset(info.cam);
      stage.react(info.pose, null, info.text);
      appendChat(`> ${info.text}`, 'bot');
      ai.speak(info.text);
    });
  });

  // Guided Tour: Yuzu walks through all sections + live Skeleton Breakdown!
  let tourTimers = [];
  let tourActive = false;
  const stopTour = () => {
    tourTimers.forEach(clearTimeout);
    tourTimers = [];
    tourActive = false;
    $('#btn-tour')?.classList.remove('active');
  };
  const startTour = () => {
    stopTour();
    tourActive = true;
    $('#btn-tour')?.classList.add('active');
    const steps = [
      {
        delay: 0,
        run: () => {
          $('#band-1')?.scrollIntoView({ behavior: 'smooth' });
          setViewMode('normal', false);
          spotlight('#band-1 .col-left .editorial-block', 5500);
          const msg = 'Welcome to $YUZU! On the left you have the token card, OG Airdrop Multiplier, and my live ECG heartbeat. Pet my head to level up BOND!';
          stage.react('wave', null, msg);
          appendChat(`> [TOUR 1/4] ${msg}`, 'bot');
          ai.speak(msg);
        },
      },
      {
        delay: 6400,
        run: () => {
          $('#band-2')?.scrollIntoView({ behavior: 'smooth' });
          setViewMode('skeleton', false);
          spotlight('#band-2 .col-left .editorial-block', 6500);
          const msg = 'Section 002 CONTROL — switching to X-ray skeleton breakdown! Drag the Motion Engine sliders on the left to tune my sway, breathing, and tilt live.';
          stage.react('peace', null, msg);
          appendChat(`> [TOUR 2/4] ${msg}`, 'bot');
          ai.speak(msg);
        },
      },
      {
        delay: 13600,
        run: () => {
          setViewMode('normal', false);
          $('#band-3')?.scrollIntoView({ behavior: 'smooth' });
          spotlight('#band-3 .col-left .editorial-block', 6000);
          const msg = 'Section 003 TOKEN — 1 billion $YUZU fixed supply, 85% liquidity burned, 0% tax. Connect Phantom or Solflare on the right!';
          stage.react('happy', null, msg);
          appendChat(`> [TOUR 3/4] ${msg}`, 'bot');
          ai.speak(msg);
        },
      },
      {
        delay: 20400,
        run: () => {
          $('#band-4')?.scrollIntoView({ behavior: 'smooth' });
          spotlight('#band-4 .col-left .editorial-block', 5500);
          const msg = 'And finally 004 SIGNAL — our 2026 roadmap, socials, and live DexScreener chart. Need anything else? Just talk to me in the terminal!';
          stage.react('kiss', null, msg);
          appendChat(`> [TOUR 4/4] ${msg}`, 'bot');
          ai.speak(msg);
        },
      },
      {
        delay: 26800,
        run: () => stopTour(),
      },
    ];
    tourTimers = steps.map((s) => setTimeout(s.run, s.delay));
  };
  $('#btn-tour')?.addEventListener('click', () => (tourActive ? stopTour() : startTour()));

  // Execute AI-triggered site actions
  const executeSiteAction = (action) => {
    if (!action) return;
    if (action !== 'TOUR') stopTour();
    switch (action) {
      case 'TOUR':
        startTour();
        break;
      case 'SKELETON':
        setViewMode('skeleton', false);
        stage.setCameraPreset('full');
        spotlight('#rig-hud', 5000);
        break;
      case 'WIREFRAME':
        setViewMode('wireframe', false);
        stage.setCameraPreset('outfit');
        spotlight('#rig-hud', 5000);
        break;
      case 'NORMAL':
        setViewMode('normal', false);
        stage.setCameraPreset('hero');
        break;
      case 'OUTFIT': {
        const order = ['full', 'open', 'beach'];
        const nextMode = order[(order.indexOf(stage.outfitMode) + 1) % order.length];
        stage.setOutfitMode(nextMode);
        $$('#outfit-chips [data-outfit]').forEach((b) => b.classList.toggle('active', b.dataset.outfit === nextMode));
        break;
      }
      case 'BAND1':
        $('#band-1')?.scrollIntoView({ behavior: 'smooth' });
        spotlight('#band-1 .col-left .editorial-block');
        break;
      case 'BAND2':
        $('#band-2')?.scrollIntoView({ behavior: 'smooth' });
        spotlight('#band-2 .col-left .editorial-block');
        break;
      case 'BAND3':
        $('#band-3')?.scrollIntoView({ behavior: 'smooth' });
        spotlight('#band-3 .col-left .editorial-block');
        break;
      case 'BAND4':
        $('#band-4')?.scrollIntoView({ behavior: 'smooth' });
        spotlight('#band-4 .col-left .editorial-block');
        break;
      case 'DOCS':
        renderDoc('lore');
        docsOverlay?.classList.add('open');
        break;
      case 'EXTENSION':
        renderDoc('extension');
        docsOverlay?.classList.add('open');
        break;
      case 'FORGE':
        forgeOverlay?.classList.add('open');
        drawForge();
        break;
      case 'MARKET':
        speakMarketBrief();
        break;
      case 'WALLET':
        $('#band-3')?.scrollIntoView({ behavior: 'smooth' });
        spotlight('#btn-wallet', 5000);
        break;
      case 'SPIN': {
        const next = !stage.turntable;
        stage.setTurntable(next);
        $('#btn-turntable')?.classList.toggle('active', next);
        break;
      }
    }
  };

  const sendMessage = async (txt) => {
    const clean = txt.trim();
    if (!clean) return;
    stopTour();
    appendChat(clean, 'user');
    const typing = appendChat('> thinking…', 'bot');
    const marketCtx = latestMarket.length
      ? `[LIVE CRYPTO MARKET: ${latestMarket.map((m) => `${m.sym} $${m.price >= 1 ? m.price.toFixed(2) : m.price.toFixed(5)} (${m.pct >= 0 ? '+' : ''}${m.pct.toFixed(1)}%)`).join(', ')}]`
      : '';
    const reply = await ai.send(clean, marketCtx);
    typing.remove();
    if (reply) {
      stage.setOffended(ai.mood === 'offended');
      appendChat(`> ${reply.text}`, 'bot');
      stage.react(reply.pose, null, reply.text);
      if (reply.action) executeSiteAction(reply.action);
    }
  };

  chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const txt = chatInput.value;
    chatInput.value = '';
    await sendMessage(txt);
  });

  // Quick-prompt chips
  $$('#quick-prompts .qp-btn').forEach((btn) => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.q));
  });

  // Cyber Y2K DOCS / Lore / Whitepaper Modal
  const DOCS_CONTENT = {
    lore: `
      <h3>00 // YUZU LORE — ENTITY #001</h3>
      <p><b>Yuzu (ENTITY #001)</b> is the first autonomous 3D digital companion on Solana, born in 2026 from a glitch signal out of the <b>Cyber Y2K</b> era.</p>
      <ul>
        <li><b>Living Personality:</b> Yuzu talks freely about anything — crypto, life, jokes, or flirting — and genuinely gets sulky if you throw 3D glass orbs at her.</li>
        <li><b>Bond Progression (LVL 1–5):</b> Rub her head to level up Bond (<code>STRANGER → SOULMATE</code>), boost your OG Airdrop Multiplier up to <code>5.0×</code>, and win her back if she pouts.</li>
        <li><b>Terminal Host:</b> Tracks live crypto markets, voices pump &amp; dump briefs, demonstrates her 3D X-ray skeleton rig, and forges custom chrome/glass 3D medallions.</li>
      </ul>`,
    extension: `
      <h3>CHROME EXTENSION // CRYPTO COMPANION (v1.2.0)</h3>
      <p>Install Yuzu directly into Chrome, Brave, or Edge to track <b>SOL, BTC, ETH, WIF, BONK, PEPE, JUP</b> 24h pumps &amp; dumps with a live mini 3D Yuzu, voice briefs, desktop alerts, and a draggable floating widget.</p>
      <div style="margin:8px 0 12px">
        <a class="gloss-btn gloss-pink" href="/yuzu-chrome-extension.zip" download="yuzu-chrome-extension.zip" style="width:100%;text-align:center">DOWNLOAD CHROME EXTENSION (.ZIP)</a>
      </div>
      <ul>
        <li><b>Step 1:</b> Click <b>DOWNLOAD CHROME EXTENSION (.ZIP)</b> above and unzip the <code>yuzu-extension</code> folder.</li>
        <li><b>Step 2:</b> Open <code>chrome://extensions/</code> in Chrome, Brave, or Edge.</li>
        <li><b>Step 3:</b> Turn on <b>Developer mode</b> (top-right toggle).</li>
        <li><b>Step 4:</b> Click <b>Load unpacked</b> and select the unzipped <code>yuzu-extension</code> folder.</li>
      </ul>
      <p>Pin <b>$YUZU RADAR</b> to your browser toolbar for live SOL badge updates, TradingView links, and voice market briefs.</p>`,
    overview: `
      <h3>01 // PROJECT OVERVIEW</h3>
      <p><b>$${TOKEN.ticker}</b> is an interactive Cyber Y2K art memecoin on Solana powered by a living 3D VRM companion right inside the web terminal.</p>
      <ul>
        <li><b>Bespoke 3D Sanctuary:</b> Full 360° liquid-chrome tribals, iridescent crystal prisms, glass orbs, and real-time reflections.</li>
        <li><b>Interactive Companion:</b> Eye LookAt tracking, synchronized heartbeat pulse, throwable 3D glass orbs, live voice AI, and OG Airdrop Multiplier progression.</li>
      </ul>`,
    tokenomics: `
      <h3>02 // TOKENOMICS</h3>
      <p>Total Supply: <code>${TOKEN.totalSupply.toLocaleString('en-US')} $${TOKEN.ticker}</code> (fixed Solana SPL token).</p>
      <ul>
        ${TOKEN.tokenomics.map((t) => `<li><b>${t.pct}%</b> — ${t.label}</li>`).join('')}
        <li><b>Taxes:</b> ${TOKEN.buyTax}% Buy / ${TOKEN.sellTax}% Sell.</li>
      </ul>`,
    security: `
      <h3>03 // SECURITY &amp; FAIR LAUNCH</h3>
      <ul>
        <li><b>LP Burned:</b> Liquidity pool tokens are permanently burned.</li>
        <li><b>Mint Authority Revoked:</b> No additional tokens can ever be minted.</li>
        <li><b>Freeze Authority Revoked:</b> Holder wallets can never be frozen.</li>
        <li><b>Contract:</b> <code>${hasCA() ? TOKEN.contractAddress : 'Set contractAddress in src/config.js'}</code></li>
      </ul>`,
    tech: `
      <h3>04 // AI VOICE &amp; 3D VRM RIG</h3>
      <ul>
        <li><b>3D Rig:</b> Three.js + <code>@pixiv/three-vrm</code> with analytic 2-bone leg IK, SpringBone hair physics, and live X-ray Skeleton Breakdown mode.</li>
        <li><b>Neural Voice AI:</b> Live LLM chat paired with natural neural voice synthesis and multi-vowel lip-sync.</li>
        <li><b>Logo Forge:</b> Built-in 1024px liquid-chrome &amp; prism-glass logo studio with 3D medallion spawning.</li>
      </ul>`,
    faq: `
      <h3>05 // FAQ</h3>
      <ul>
        <li><b>How do I boost my OG Airdrop Multiplier?</b> Hold and rub your cursor over Yuzu's head (or click <code>PET</code> and chat) to level up <code>BOND LVL 1–5</code> up to <code>5.0×</code>.</li>
        <li><b>How do I connect my wallet?</b> Click <code>CONNECT</code> in the top right (supports Phantom, Solflare, and Backpack).</li>
        <li><b>How do I launch with my own CA?</b> Paste your Solana mint address into <code>src/config.js</code> to auto-enable Jupiter, Raydium, live price, and DexScreener chart.</li>
      </ul>`,
  };

  const docsOverlay = $('#docs-overlay');
  const docsBody = $('#docs-body');
  const renderDoc = (key) => {
    if (docsBody) docsBody.innerHTML = DOCS_CONTENT[key] || DOCS_CONTENT.overview;
    $$('#docs-tabs .gloss-key').forEach((b) => b.classList.toggle('active', b.dataset.doc === key));
  };
  renderDoc('lore');

  $('#btn-open-docs')?.addEventListener('click', () => {
    renderDoc('lore');
    docsOverlay?.classList.add('open');
  });
  $('#btn-open-ext')?.addEventListener('click', () => {
    renderDoc('extension');
    docsOverlay?.classList.add('open');
  });
  $('#btn-close-docs')?.addEventListener('click', () => docsOverlay?.classList.remove('open'));
  docsOverlay?.addEventListener('click', (e) => {
    if (e.target === docsOverlay) docsOverlay.classList.remove('open');
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      docsOverlay?.classList.remove('open');
      forgeOverlay?.classList.remove('open');
    }
  });
  $$('#docs-tabs .gloss-key').forEach((btn) => {
    btn.addEventListener('click', () => renderDoc(btn.dataset.doc));
  });

  // Cyber Y2K Chrome & Glass Logo Forge
  const forgeOverlay = $('#forge-overlay');
  const forgeCanvas = $('#forge-canvas');
  const forgeState = { text: '$YUZU', sub: 'SOLANA // 2026', material: 'chrome', frame: 'tribal', transparent: false };
  const drawForge = () => {
    if (forgeCanvas) renderY2KLogo(forgeCanvas, forgeState);
  };
  $('#btn-open-forge')?.addEventListener('click', () => {
    forgeOverlay?.classList.add('open');
    drawForge();
  });
  $('#btn-close-forge')?.addEventListener('click', () => forgeOverlay?.classList.remove('open'));
  forgeOverlay?.addEventListener('click', (e) => {
    if (e.target === forgeOverlay) forgeOverlay.classList.remove('open');
  });
  $('#forge-text')?.addEventListener('input', (e) => {
    forgeState.text = e.target.value;
    drawForge();
  });
  $('#forge-sub')?.addEventListener('input', (e) => {
    forgeState.sub = e.target.value;
    drawForge();
  });
  $$('#forge-materials [data-mat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('#forge-materials [data-mat]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      forgeState.material = btn.dataset.mat;
      drawForge();
    });
  });
  $$('#forge-frames [data-frame]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('#forge-frames [data-frame]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      forgeState.frame = btn.dataset.frame;
      drawForge();
    });
  });
  const btnForgeBg = $('#forge-bg-toggle');
  btnForgeBg?.addEventListener('click', () => {
    forgeState.transparent = !forgeState.transparent;
    btnForgeBg.classList.toggle('active', forgeState.transparent);
    btnForgeBg.textContent = forgeState.transparent ? 'BG: TRANSPARENT' : 'BG: DARK VOID';
    drawForge();
  });
  $('#btn-forge-dl')?.addEventListener('click', () => {
    const hi = document.createElement('canvas');
    hi.width = hi.height = 1024;
    renderY2KLogo(hi, forgeState);
    const a = document.createElement('a');
    a.download = `${(forgeState.text || 'yuzu').replace(/[^a-z0-9]/gi, '').toLowerCase()}_${forgeState.material}.png`;
    a.href = hi.toDataURL('image/png');
    a.click();
    toast('1024x1024 PNG saved');
  });
  $('#btn-forge-3d')?.addEventListener('click', () => {
    const hi = document.createElement('canvas');
    hi.width = hi.height = 512;
    renderY2KLogo(hi, { ...forgeState, transparent: true });
    stage.spawnFloatingLogo(hi, forgeState);
    forgeOverlay?.classList.remove('open');
    const msg = `Whoa! Your 3D ${forgeState.material.toUpperCase()} medallion for ${forgeState.text || '$YUZU'} is now floating right beside me!`;
    stage.react('peace', null, msg);
    appendChat(`> ${msg}`, 'bot');
    ai.speak(msg);
  });

  // Camera Focus presets
  $$('#cam-chips [data-cam]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('#cam-chips [data-cam]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      stage.setCameraPreset(btn.dataset.cam);
    });
  });

  // Turntable toggle
  const btnSpin = $('#btn-turntable');
  btnSpin.addEventListener('click', () => {
    const next = !stage.turntable;
    stage.setTurntable(next);
    btnSpin.classList.toggle('active', next);
  });

  // 3-Mode Outfit Switcher (FULL / CYBER / BEACH)
  $$('#outfit-chips [data-outfit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('#outfit-chips [data-outfit]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.outfit;
      stage.setOutfitMode(mode);
      if (mode === 'beach') {
        stage.react('peace', null, 'Summer beach mode unlocked! Ready for the Solana sun~');
      } else if (mode === 'open') {
        stage.react('spin', null, 'Switched to Cyber Y2K outfit!');
      } else {
        stage.react('happy', null, 'Back in full outfit!');
      }
    });
  });

  // Scroll-linked camera, active nav link & Yuzu contextual section hints
  const navPills = $$('.nav-link');
  const BAND_HINTS = [
    null,
    { pose: 'peace', text: '002 CONTROL — drag the Motion Engine sliders or click SKELETON to inspect my 3D rig!' },
    { pose: 'happy', text: '003 TOKEN — 1B $YUZU fixed supply, 85% LP burned, 0% tax. Connect Phantom on the right!' },
    { pose: 'wave', text: '004 SIGNAL — check our 2026 roadmap, socials, and live DexScreener chart!' },
  ];
  let lastHintBand = 0;
  let lastHintTime = 0;
  const onScroll = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = window.scrollY / maxScroll;
    stage.setScrollProgress(p);
    const idx = Math.min(3, Math.floor(p * 3.99));
    navPills.forEach((pill, i) => pill.classList.toggle('active', i === idx));

    const now = performance.now();
    if (!tourActive && !ai.isBusy() && idx !== lastHintBand && now - lastHintTime > 5500) {
      lastHintBand = idx;
      lastHintTime = now;
      const hint = BAND_HINTS[idx];
      if (hint) stage.react(hint.pose, null, hint.text);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // Buy links & CA copy
  const buyUrl = (kind) => {
    const ca = TOKEN.contractAddress;
    if (kind === 'jupiter') return `https://jup.ag/swap/SOL-${ca}`;
    if (kind === 'raydium') return `https://raydium.io/swap/?inputMint=sol&outputMint=${ca}`;
    if (kind === 'pumpfun') return `https://pump.fun/coin/${ca}`;
    if (kind === 'birdeye') return `https://birdeye.so/token/${ca}?chain=solana`;
    if (kind === 'dexscreener') return `https://dexscreener.com/solana/${ca}`;
    return '#';
  };
  $$('[data-buy]').forEach((a) => {
    if (hasCA()) {
      a.href = buyUrl(a.dataset.buy);
    } else {
      a.classList.add('disabled');
      a.removeAttribute('target');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        toast('Set contractAddress in src/config.js to enable buy links ♡');
      });
    }
  });
  $('#ca-copy').addEventListener('click', async () => {
    if (!hasCA()) return toast('CA not set yet');
    await navigator.clipboard.writeText(TOKEN.contractAddress);
    toast('Contract address copied ✓');
  });

  // DexScreener Live Chart + Market stats
  if (hasCA()) {
    $('#chart-empty')?.remove();
    const iframe = document.createElement('iframe');
    iframe.loading = 'lazy';
    iframe.src = `https://dexscreener.com/solana/${TOKEN.contractAddress}?embed=1&theme=dark&trades=0&info=0`;
    $('#chart-box').appendChild(iframe);
  }
  const loadMarket = async () => {
    if (!hasCA()) return;
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN.contractAddress}`);
      const data = await res.json();
      const pairs = (data.pairs || []).filter((p) => p.chainId === 'solana');
      if (!pairs.length) return;
      const p = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      $('#st-price').textContent = fmtPrice(parseFloat(p.priceUsd));
      $('#st-mcap').textContent = fmtUsd(p.marketCap ?? p.fdv);
      $('#st-liq').textContent = fmtUsd(p.liquidity?.usd);
      const ch = p.priceChange?.h24;
      const el = $('#st-change');
      el.textContent = ch == null ? '—' : `${ch > 0 ? '+' : ''}${ch.toFixed(1)}%`;
      el.className = ch > 0 ? 'up' : ch < 0 ? 'down' : '';
    } catch { }
  };
  loadMarket();
  setInterval(loadMarket, 30000);

  // Reown AppKit (WalletConnect QR + MetaMask + Phantom + Solflare + Coinbase + Trust + 160+ wallets)
  let lastConnectedAddr = null;
  const rpc = async (method, params) => {
    const r = await fetch(TOKEN.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    return j.result;
  };

  yuzuWallet.subscribe(async ({ isConnected, address, namespace }) => {
    $('#btn-wallet')?.classList.toggle('connected', isConnected);
    if (!isConnected || !address) {
      lastConnectedAddr = null;
      $('#wallet-label').textContent = 'CONNECT';
      $('#bw-addr').textContent = 'NOT CONNECTED';
      $('#bw-sol').textContent = '—';
      $('#bw-token').textContent = '—';
      return;
    }
    const isNew = address !== lastConnectedAddr;
    lastConnectedAddr = address;
    $('#wallet-label').textContent = shortAddr(address);
    $('#bw-addr').textContent = shortAddr(address);

    if (namespace === 'solana') {
      try {
        const bal = await rpc('getBalance', [address]);
        const sol = (bal.value / 1e9).toFixed(3);
        $('#bw-sol').textContent = `${sol} SOL`;
        $('#wallet-label').textContent = `${shortAddr(address)} · ${sol} SOL`;
      } catch {
        $('#bw-sol').textContent = 'SOLANA';
      }
      if (hasCA()) {
        try {
          const res = await rpc('getTokenAccountsByOwner', [address, { mint: TOKEN.contractAddress }, { encoding: 'jsonParsed' }]);
          const amt = res.value.reduce((s, a) => s + (a.account.data.parsed.info.tokenAmount.uiAmount || 0), 0);
          $('#bw-token').textContent = amt.toLocaleString('en-US', { maximumFractionDigits: 2 });
        } catch {
          $('#bw-token').textContent = '—';
        }
      }
    } else {
      $('#bw-sol').textContent = 'EVM CONNECTED';
    }

    if (isNew) {
      toast('Wallet connected');
      const msg = 'Wallet connected! Your account is now linked to the $YUZU terminal.';
      stage.react('happy', null, msg);
      ai.speak(msg);
    }
  });

  $('#btn-wallet')?.addEventListener('click', async () => {
    try {
      await yuzuWallet.open();
    } catch (err) {
      console.error('Reown AppKit open error:', err);
      toast('Wallet modal failed to load — try again');
    }
  });

  // Restore previous Reown AppKit session silently
  setTimeout(() => yuzuWallet.restore(), 900);

  // Live ECG Heartbeat waveform & HUD frame updater
  const samples = new Array(44).fill(26);
  let lastWaveT = 0;

  return {
    onFrame(s) {
      // BPM & Charm Load
      const bpm = Math.round(s.bpm);
      $('#bpm-val').textContent = bpm;
      $('#pulse-hz').textContent = `${(bpm / 60).toFixed(1)} HZ`;

      const loadPct = Math.min(100, Math.round(58 + s.excitement * 36 + s.hover * 12));
      $('#charm-load-pct').textContent = `${loadPct}%`;
      const filled = Math.round((loadPct / 100) * loadSegs.length);
      loadSegs.forEach((seg, i) => {
        seg.className = i < filled ? (i >= 15 ? 'load-seg on hot' : 'load-seg on') : 'load-seg';
      });

      // Live ECG Heartbeat pulse waveform
      const now = performance.now();
      if (now - lastWaveT > 48) {
        lastWaveT = now;
        const beatPhase = (s.t * (bpm / 60)) % 1;
        const hIcon = $('#heart-beat-icon');
        if (hIcon) hIcon.classList.toggle('lub', beatPhase > 0.24 && beatPhase < 0.36);
        // Realistic ECG QRS spike shape!
        let y = 26;
        if (beatPhase > 0.12 && beatPhase < 0.18) y = 21;
        else if (beatPhase >= 0.22 && beatPhase < 0.26) y = 33;
        else if (beatPhase >= 0.26 && beatPhase < 0.31) y = 7 - s.excitement * 4;
        else if (beatPhase >= 0.31 && beatPhase < 0.36) y = 38;
        else if (beatPhase >= 0.44 && beatPhase < 0.56) y = 20;
        samples.shift();
        samples.push(Math.max(4, Math.min(48, y)));

        const step = 214 / (samples.length - 1);
        let d = '';
        let dG = '';
        for (let i = 0; i < samples.length; i++) {
          const x = (i * step).toFixed(1);
          d += (i === 0 ? 'M' : 'L') + `${x},${samples[i].toFixed(1)} `;
          dG += (i === 0 ? 'M' : 'L') + `${x},${Math.min(50, samples[i] + 4).toFixed(1)} `;
        }
        $('#wave-path').setAttribute('d', d);
        $('#wave-ghost').setAttribute('d', dG);
        $('#wave-dot').setAttribute('cy', samples[samples.length - 1].toFixed(1));
      }

      // Orientation Dial (Card 05)
      $('#cam-dist').textContent = `${s.dist.toFixed(2)} M`;
      $('#cam-yaw').textContent = `${s.yawDeg >= 0 ? '+' : ''}${s.yawDeg.toFixed(1)}°`;
      $('#cam-pitch').textContent = `${s.pitchDeg >= 0 ? '+' : ''}${s.pitchDeg.toFixed(1)}°`;
      $('#cam-fps').textContent = `${s.fps}`;
      const tilt = Math.max(-35, Math.min(35, s.yawDeg * 0.25));
      const offY = Math.max(-14, Math.min(14, s.pitchDeg * 0.45));
      $('#horizon-line').style.transform = `translateY(${offY.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
    },
    onOrbHit(hitCount, pos) {
      const lines = [
        'Ow!! Why are you throwing a glass orb at me?!',
        'Hey, stop that! I am seriously about to get mad at you!',
        'That\'s it, I\'m offended! Apologize or pet my head before I talk to you again!',
      ];
      const msg = lines[Math.min(lines.length - 1, hitCount - 1)];
      ai.setMood('offended', `The user just threw a 3D glass orb at you (hit #${hitCount})!`);
      stage.setOffended(true);
      appendChat(`> ${msg}`, 'bot');
      stage.react('bonk', pos, msg);
      ai.speak(msg);
    },
    onPat(count, affection, bondLevel, type) {
      $('#pat-count').textContent = count;
      if (type === 'headpat' && stage.offended) {
        stage.setOffended(false);
        ai.setMood('happy', 'The user petted your head and made up with you.');
      }
      if (affection != null) {
        const fill = $('#bond-bar-fill');
        if (fill) fill.style.width = `${Math.round(affection)}%`;
      }
      if (bondLevel != null) {
        const ranks = ['STRANGER', 'FRIEND', 'CRUSH', 'OBSESSED', 'SOULMATE'];
        const rankEl = $('#bond-rank');
        if (rankEl) rankEl.textContent = `LVL ${bondLevel} · ${ranks[bondLevel - 1] || 'SOULMATE'}`;
        const mult = MULT_BY_LVL[bondLevel - 1] || '5.0×';
        const multEl = $('#og-mult');
        if (multEl) multEl.textContent = `${mult} · LVL ${bondLevel}`;
        if (ogLocked) {
          const btn = $('#btn-claim-og');
          if (btn) btn.textContent = `✓ OG PASS ACTIVE (${mult})`;
        }
      }
    },
  };
}
