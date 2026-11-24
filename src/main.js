import './style.css';
import { TOKEN } from './config.js';
import { CharacterStage } from './stage.js';
import { initUI } from './ui.js';

const loader = document.getElementById('stage-loader');
const loaderText = document.getElementById('stage-loader-text');
const speech = document.getElementById('speech');
let speechTimer;
let hud = null;

const stage = new CharacterStage(document.getElementById('stage-fixed'), {
  modelUrl: TOKEN.modelUrl,
  onProgress: (pct) => (loaderText.textContent = `LOADING VRM MODEL… ${pct}%`),
  onLoaded: () => loader.classList.add('hidden'),
  onError: (e) => {
    console.error(e);
    loaderText.textContent = 'Failed to load model';
  },
  onReaction: (type, text, patCount, affection, bondLevel) => {
    speech.textContent = text;
    speech.classList.add('show');
    clearTimeout(speechTimer);
    speechTimer = setTimeout(() => speech.classList.remove('show'), 3200);
    hud?.onPat(patCount, affection, bondLevel, type);
  },
  onOrbHit: (hitCount, pos) => hud?.onOrbHit?.(hitCount, pos),
  onFrame: (state) => hud?.onFrame(state),
});

hud = initUI(stage);
