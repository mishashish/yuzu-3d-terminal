import './style.css';
import { TOKEN } from './config.js';
import { CharacterStage } from './stage.js';
import { initUI } from './ui.js';

// Ensure browser tab favicon & title always load cleanly even under aggressive browser caching
if (!document.querySelector('link[rel="icon"]')) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = '/favicon.png?v=3';
  document.head.appendChild(link);
}
if (!document.title) document.title = '$YUZU® // DIGITAL UNIVERSE 2026';

const loader = document.getElementById('stage-loader');
const loaderText = document.getElementById('stage-loader-text');
const speech = document.getElementById('speech');
let speechTimer;
let hud = null;

const isMini = new URLSearchParams(window.location.search).get('mini') === '1';
if (isMini) document.body.classList.add('mini-mode');

const stage = new CharacterStage(document.getElementById('stage-fixed'), {
  modelUrl: TOKEN.modelUrl,
  isMini,
  onProgress: (pct) => (loaderText.textContent = isMini ? `${pct}%` : `LOADING VRM MODEL… ${pct}%`),
  onLoaded: () => {
    loader.classList.add('hidden');
    if (isMini) {
      stage.setCameraPreset('mini');
      try { window.parent?.postMessage({ type: 'YUZU_MINI_READY' }, '*'); } catch {}
    }
  },
  onError: (e) => {
    console.error(e);
    loaderText.textContent = 'Failed to load model';
  },
  onReaction: (type, text, patCount, affection, bondLevel) => {
    if (!isMini) {
      speech.textContent = text;
      speech.classList.add('show');
      clearTimeout(speechTimer);
      speechTimer = setTimeout(() => speech.classList.remove('show'), 3200);
      hud?.onPat(patCount, affection, bondLevel, type);
    }
  },
  onOrbHit: (hitCount, pos) => !isMini && hud?.onOrbHit?.(hitCount, pos),
  onFrame: (state) => !isMini && hud?.onFrame(state),
});

if (isMini) {
  // Listen to Chrome Extension popup messages for live 3D lip-sync & poses!
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'YUZU_SPEAK') {
      stage.setSpeaking(!!d.speaking);
      if (d.speaking && d.pose) stage.react(d.pose);
    } else if (d.type === 'YUZU_POSE' && d.pose) {
      stage.react(d.pose);
    }
  });
} else {
  hud = initUI(stage);
}
