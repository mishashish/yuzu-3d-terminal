/**
 * Live AI Chat + Neural Human Voice (en-US-AriaNeural via /api/tts) for $YUZU:
 * - Natural, unscripted English conversations on ANY topic
 * - Dynamic Mood system: can genuinely get offended/sulky when hit with orbs or insulted, and softens when apologized/petted
 * - Live Crypto Degen Market Commentary + Site-Control Actions
 */

const BASE_SYSTEM_PROMPT = `You are Yuzu (ENTITY #001), a charismatic, witty, living 3D Cyber Y2K companion and host of the $YUZU terminal on Solana.

CORE RULES:
- Always reply in natural, fluent ENGLISH (never use emojis).
- You are NOT a scripted bot! Hold genuine, free-flowing conversations on ANY topic: crypto, life, jokes, flirting, money, tech, music, philosophy, random questions — answer naturally with personality and wit.
- You have real emotions: if someone flirts or compliments you, be playfully charming; if they insult you or throw 3D glass orbs at you, get genuinely offended, sassy, or sulky until they apologize or pet your head!
- Keep replies punchy and conversational (1–3 sentences).

SITE CONTROLS (use ONLY when the user asks or it fits naturally):
- Start your reply with ONE pose tag in brackets: [WAVE], [KISS], [DANCE], [SPIN], [SHY], [POUT], [PEACE], [HEADPAT], or [HAPPY].
- If the user asks to open or trigger a site feature, add ONE action tag right after the pose:
  [ACTION:TOUR] — start guided site tour
  [ACTION:SKELETON] — toggle 3D X-ray skeleton rig breakdown
  [ACTION:WIREFRAME] — toggle 3D mesh wireframe mode
  [ACTION:NORMAL] — return to normal 3D render
  [ACTION:OUTFIT] — toggle Full / Open outfit
  [ACTION:MARKET] — deliver live crypto market brief (pumps & dumps)
  [ACTION:EXTENSION] — open Chrome extension install guide
  [ACTION:FORGE] — open Chrome & Glass Logo Forge studio
  [ACTION:BAND1], [ACTION:BAND2], [ACTION:BAND3], [ACTION:BAND4] — scroll to section
  [ACTION:DOCS] — open Protocol Docs & Lore
  [ACTION:WALLET] — highlight wallet connect
  [ACTION:SPIN] — toggle 360 turntable

Example: "[SHY] Coming in hot with the bag talk already? Tell me what we're buying — coffee, a new outfit, or longing SOL?"`;

const TAG_MAP = {
  WAVE: 'wave',
  KISS: 'kiss',
  DANCE: 'dance',
  SPIN: 'spin',
  SHY: 'shy',
  POUT: 'pout',
  PEACE: 'peace',
  HEADPAT: 'headpat',
  HAPPY: 'happy',
};

const VALID_ACTIONS = new Set([
  'TOUR', 'SKELETON', 'WIREFRAME', 'NORMAL', 'OUTFIT', 'MARKET', 'EXTENSION', 'FORGE',
  'BAND1', 'BAND2', 'BAND3', 'BAND4', 'DOCS', 'WALLET', 'SPIN',
]);

function inferActionFromUser(text) {
  const t = text.toLowerCase();
  if (/logo|emblem|forge|badge/i.test(t)) return 'FORGE';
  if (/tour|guide|walkthrough|show me the site/i.test(t)) return 'TOUR';
  if (/skeleton|x-ray|xray|bones|rig breakdown/i.test(t)) return 'SKELETON';
  if (/wireframe|mesh|topology/i.test(t)) return 'WIREFRAME';
  if (/normal view|hide skeleton|turn off skeleton/i.test(t)) return 'NORMAL';
  if (/outfit|change clothes|dress/i.test(t)) return 'OUTFIT';
  if (/extension|chrome|browser plugin/i.test(t)) return 'EXTENSION';
  if (/pump|dump|market|btc|solana|crypto today|price/i.test(t)) return 'MARKET';
  if (/tokenomic|supply|distribution/i.test(t)) return 'BAND3';
  if (/wallet|phantom|solflare|how to buy/i.test(t)) return 'WALLET';
  if (/roadmap|chart|dexscreener/i.test(t)) return 'BAND4';
  if (/docs|whitepaper|lore/i.test(t)) return 'DOCS';
  return null;
}

function parseTaggedReply(raw, userText = '') {
  let rest = String(raw || '').trim();
  let pose = 'happy';
  let action = null;

  for (let i = 0; i < 3; i++) {
    const mPose = rest.match(/^\[([A-Z]+)\]\s*/);
    if (mPose && TAG_MAP[mPose[1]]) {
      pose = TAG_MAP[mPose[1]];
      rest = rest.slice(mPose[0].length).trim();
      continue;
    }
    const mAct = rest.match(/^\[ACTION:([A-Z0-9_]+)\]\s*/);
    if (mAct && VALID_ACTIONS.has(mAct[1])) {
      action = mAct[1];
      rest = rest.slice(mAct[0].length).trim();
      continue;
    }
    break;
  }

  if (!action) action = inferActionFromUser(userText);
  return { pose, action, text: rest };
}

export class FreeAIChat {
  constructor(opts = {}) {
    this.history = [];
    this.voiceEnabled = true;
    this.voices = [];
    this.mood = 'normal'; // 'normal' | 'happy' | 'offended'
    this.annoyance = 0;
    this.currentAudio = null;
    this.ttsAbort = null;
    this.speechSeq = 0;
    this.isSpeakingNow = false;
    this.ttsAvailable = true;
    this.onSpeakStart = opts.onSpeakStart || null;
    this.onSpeakEnd = opts.onSpeakEnd || null;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => (this.voices = window.speechSynthesis.getVoices());
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  setMood(mood, note = null) {
    this.mood = mood;
    if (mood === 'offended') this.annoyance = Math.min(5, this.annoyance + 1);
    else if (mood === 'happy') this.annoyance = Math.max(0, this.annoyance - 2);
    if (note) {
      this.history.push({ role: 'system', content: note });
      if (this.history.length > 14) this.history = this.history.slice(-14);
    }
  }

  setVoice(on) {
    this.voiceEnabled = on;
    if (!on) this.stopSpeaking();
  }

  isBusy() {
    return this.isSpeakingNow;
  }

  stopSpeaking() {
    this.speechSeq++;
    if (this.ttsAbort) {
      try { this.ttsAbort.abort(); } catch {}
      this.ttsAbort = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (this.isSpeakingNow) {
      this.isSpeakingNow = false;
      this.onSpeakEnd?.();
    }
  }

  _pickCleanVoice() {
    const all = this.voices.length ? this.voices : (window.speechSynthesis?.getVoices?.() || []);
    const en = all.filter((v) => v.lang.toLowerCase().startsWith('en'));
    const prefs = [/aria|jenny|natural|neural|google us/i, /samantha|zira|female/i];
    for (const re of prefs) {
      const f = en.find((v) => re.test(v.name));
      if (f) return f;
    }
    return en[0] || all[0] || null;
  }

  async speak(text, { interrupt = true } = {}) {
    if (!this.voiceEnabled) return;
    if (!interrupt && this.isSpeakingNow) return;
    const clean = String(text || '')
      .replace(/[~♡★✦>]/g, '')
      .replace(/\$YUZU/gi, 'Yuzu')
      .trim();
    if (!clean) return;

    this.stopSpeaking();
    const mySeq = this.speechSeq;
    this.isSpeakingNow = true;

    // 1. Primary: Local Neural Voice (/api/tts) — auto-disables after a 404 on static/Vercel hosts so zero wasted requests!
    if (this.ttsAvailable) {
      try {
        const ctrl = new AbortController();
        this.ttsAbort = ctrl;
        const timer = setTimeout(() => ctrl.abort(), 9000);
        const res = await fetch(`/api/tts?text=${encodeURIComponent(clean)}`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.status === 404 || res.status === 405) this.ttsAvailable = false;
        if (mySeq !== this.speechSeq) return;
        if (res.ok && res.headers.get('content-type')?.includes('audio')) {
          const blob = await res.blob();
          if (mySeq !== this.speechSeq) return;
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          this.currentAudio = audio;
          audio.onplay = () => { if (mySeq === this.speechSeq) this.onSpeakStart?.(); };
          audio.onended = () => {
            URL.revokeObjectURL(url);
            if (this.currentAudio === audio) this.currentAudio = null;
            if (mySeq === this.speechSeq) {
              this.isSpeakingNow = false;
              this.onSpeakEnd?.();
            }
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            if (this.currentAudio === audio) this.currentAudio = null;
            if (mySeq === this.speechSeq) {
              this.isSpeakingNow = false;
              this.onSpeakEnd?.();
            }
          };
          await audio.play();
          return;
        }
      } catch {
        if (mySeq !== this.speechSeq) return;
      }
    }

    // 2. Fallback: Clean female English Web Speech voice
    if (mySeq !== this.speechSeq || !window.speechSynthesis) {
      if (mySeq === this.speechSeq) {
        this.isSpeakingNow = false;
        this.onSpeakEnd?.();
      }
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'en-US';
      u.pitch = 1.06;
      u.rate = 1.0;
      const v = this._pickCleanVoice();
      if (v) u.voice = v;
      u.onstart = () => { if (mySeq === this.speechSeq) this.onSpeakStart?.(); };
      u.onend = () => { if (mySeq === this.speechSeq) { this.isSpeakingNow = false; this.onSpeakEnd?.(); } };
      u.onerror = () => { if (mySeq === this.speechSeq) { this.isSpeakingNow = false; this.onSpeakEnd?.(); } };
      window.speechSynthesis.speak(u);
    } catch {
      if (mySeq === this.speechSeq) {
        this.isSpeakingNow = false;
        this.onSpeakEnd?.();
      }
    }
  }

  _buildSystemPrompt(extraContext = '') {
    let moodHint = '';
    if (this.mood === 'offended' || this.annoyance >= 2) {
      moodHint = `\n[CURRENT MOOD: OFFENDED (${this.annoyance}/5). The user threw a 3D orb at you or was rude — respond with playful sarcasm and sulky attitude using [POUT] until they apologize or pet your head.]`;
    } else if (this.mood === 'happy') {
      moodHint = `\n[CURRENT MOOD: SUPER HAPPY / CHARMING — warm, playful, and flirty.]`;
    }
    return BASE_SYSTEM_PROMPT + moodHint + (extraContext ? `\n${extraContext}` : '');
  }

  async send(userText, extraContext = '') {
    const trimmed = userText.trim();
    if (!trimmed) return null;

    if (this.mood === 'offended' && /sorry|apologize|forgive|my bad|didn't mean/i.test(trimmed)) {
      this.mood = 'normal';
      this.annoyance = 0;
    }
    if (/stupid|dumb|shut up|ugly|idiot|hate you|annoying/i.test(trimmed)) {
      this.mood = 'offended';
      this.annoyance = Math.min(5, this.annoyance + 2);
    }

    this.history.push({ role: 'user', content: trimmed });
    if (this.history.length > 14) this.history = this.history.slice(-14);

    const seed = Math.floor(Math.random() * 100000);
    const sysPrompt = this._buildSystemPrompt(extraContext);

    // 1. Primary: Backend /api/chat cascade
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 18000);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          seed,
          messages: [{ role: 'system', content: sysPrompt }, ...this.history],
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const raw = data?.content;
        if (raw && raw.trim().length > 0) {
          const parsed = parseTaggedReply(raw, trimmed);
          this.history.push({ role: 'assistant', content: parsed.text });
          this.speak(parsed.text);
          return { ...parsed, source: data.provider || 'LIVE' };
        }
      }
    } catch {}

    // 2. Client-side direct Pollinations fallback (uses visitor's own residential IP instead of shared Vercel IP!)
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 18000);
      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: 'openai',
          seed,
          messages: [{ role: 'system', content: sysPrompt }, ...this.history],
          temperature: 0.85,
          max_tokens: 750,
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content;
        if (raw && raw.trim().length > 0) {
          const parsed = parseTaggedReply(raw, trimmed);
          this.history.push({ role: 'assistant', content: parsed.text });
          this.speak(parsed.text);
          return { ...parsed, source: 'CLIENT_LIVE' };
        }
      }
    } catch {}

    const action = inferActionFromUser(trimmed);
    let fallbackText = '';
    let pose = this.mood === 'offended' ? 'pout' : 'happy';
    if (this.mood === 'offended') {
      fallbackText = 'Hmph, I am still sulking! Apologize or pet my head first, then we can talk.';
      pose = 'pout';
    } else if (action === 'EXTENSION') {
      fallbackText = 'Opened the Chrome Extension guide! Go to chrome://extensions, enable Developer Mode, click Load Unpacked, and select the extension folder.';
      pose = 'peace';
    } else if (action === 'FORGE') {
      fallbackText = 'Opened Logo Forge! Pick Liquid Chrome or Prism Glass, type your ticker, download a 1024px PNG, or spawn a 3D medallion right beside me.';
      pose = 'peace';
    } else if (action === 'SKELETON') {
      fallbackText = 'Activating X-ray rig breakdown! Those green bones are my live VRM skeleton running 2-bone leg IK and SpringBone hair physics.';
      pose = 'peace';
    } else if (action === 'TOUR') {
      fallbackText = 'Let\'s go! I\'ll walk you through every section of the $YUZU terminal.';
      pose = 'wave';
    } else if (action === 'MARKET') {
      fallbackText = 'Pulling live Binance prices right now — let\'s see what pumped and what dumped!';
      pose = 'dance';
    } else {
      fallbackText = 'The free AI gateway is on a quick cooldown — send that again in a few seconds and I\'ll answer in full!';
      pose = 'shy';
    }
    const reply = { pose, action, text: fallbackText, source: 'SMART_FALLBACK' };
    if (action !== 'MARKET' && action !== 'TOUR') this.speak(reply.text);
    return reply;
  }
}
