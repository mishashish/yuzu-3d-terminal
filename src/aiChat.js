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

DIRECT 3D BODY CONTROL (you control your own 3D skeleton in real time!):
- Whenever the user asks you to move ANY part of your body (raise one hand/left arm/right arm/both arms, hands on hips, cross arms, heart pose, T-pose, reach out, turn around/left/right, bow, squat, jump, lift a leg, nod, shake head, look left/right/up/down, tilt head, wink, or relax), include a compact JSON tag right after the pose tag:
  [BODY:{"lArm":"up","rArm":"hip","head":"tiltL","torso":"bow","leg":"rightUp","turn":180,"expr":"wink","hold":6}]
- Allowed values (include ONLY the keys needed):
  lArm / rArm: "up", "wave", "side", "forward", "hip", "cross", "heart", "peace", "down"
  head: "left", "right", "up", "down", "tiltL", "tiltR", "nod", "shake"
  torso: "bow", "leanL", "leanR", "arch", "squat", "jump"
  leg: "leftUp", "rightUp", "wide"
  turn: degrees number (-180 to 180, e.g. 180 = turn around, 90 = turn left, -90 = turn right, 0 = face front)
  expr: "happy", "wink", "surprised", "angry", "shy", "kiss"
  reset: true (to relax back to normal idle)
  hold: seconds (default 6)

Example: "[HAPPY] [BODY:{"rArm":"up","head":"tiltL","expr":"wink","hold":6}] Raising my right hand just for you! What pose should I try next?"`;

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

export function inferBodyCommandFromUser(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;

  // Reset / relax
  if (/(опусти рук|встань ровно|расслабься|стой ровно|put.*hand.*down|arms down|stand normal|relax your body|reset pose)/i.test(t)) {
    return { reset: true, label: 'Relaxing back to neutral stance!' };
  }

  const cmd = {};
  const parts = [];

  // Both arms
  if (/(обе руки|две руки|руки вверх|both hands|both arms|hands up|raise.*hands|arms up)/i.test(t)) {
    cmd.lArm = 'up'; cmd.rArm = 'up'; cmd.expr = 'happy';
    parts.push('raising both hands');
  } else if (/(руки в сторон|т-поз|t-pose|t pose|arms out|spread.*arms)/i.test(t)) {
    cmd.lArm = 'side'; cmd.rArm = 'side';
    parts.push('spreading my arms out');
  } else if (/(руки на пояс|на бедр|hands on hips|hand on hip)/i.test(t)) {
    cmd.lArm = 'hip'; cmd.rArm = 'hip'; cmd.expr = 'wink';
    parts.push('putting my hands on my hips');
  } else if (/(скрести рук|сложи рук|cross.*arms|fold.*arms)/i.test(t)) {
    cmd.lArm = 'cross'; cmd.rArm = 'cross'; cmd.expr = 'angry';
    parts.push('crossing my arms');
  } else if (/(сердечк|сердце руками|make a heart|heart pose|heart above)/i.test(t)) {
    cmd.lArm = 'heart'; cmd.rArm = 'heart'; cmd.expr = 'happy';
    parts.push('making a heart overhead');
  } else {
    // Single arm (left / right / unspecified)
    const wantsRaise = /(подним|вверх|raise|lift|put up|hold up)/i.test(t);
    const wantsWave = /(помаш|маши|wave)/i.test(t);
    const wantsForward = /(протяни|дай руку|вытяни|reach|forward|hold my hand)/i.test(t);
    const wantsHand = /(рук|arm|hand|ладон)/i.test(t);
    const mentionsLeft = /(лев|left)/i.test(t);
    const mentionsRight = /(прав|right)/i.test(t);

    if (wantsHand && (wantsRaise || wantsWave || wantsForward)) {
      const mode = wantsWave ? 'wave' : wantsForward ? 'forward' : 'up';
      if (mentionsLeft && !mentionsRight) {
        cmd.lArm = mode;
        parts.push(`${mode === 'wave' ? 'waving' : mode === 'forward' ? 'reaching out' : 'raising'} my left arm`);
      } else if (mentionsRight && !mentionsLeft) {
        cmd.rArm = mode;
        parts.push(`${mode === 'wave' ? 'waving' : mode === 'forward' ? 'reaching out' : 'raising'} my right arm`);
      } else {
        cmd.rArm = mode;
        parts.push(`${mode === 'wave' ? 'waving' : mode === 'forward' ? 'reaching out' : 'raising'} my right arm`);
      }
    }
  }

  // Legs
  if (/(подним.*ног|lift.*leg|raise.*leg|kick)/i.test(t)) {
    if (/(лев|left)/i.test(t)) {
      cmd.leg = 'leftUp';
      parts.push('lifting my left leg');
    } else {
      cmd.leg = 'rightUp';
      parts.push('lifting my right leg');
    }
  }

  // Torso (bow, squat, jump, lean)
  if (/(поклон|наклон.*вперед|bow)/i.test(t)) {
    cmd.torso = 'bow';
    parts.push('bowing for you');
  } else if (/(присяд|присед|squat|crouch)/i.test(t)) {
    cmd.torso = 'squat';
    parts.push('doing a squat');
  } else if (/(прыг|попрыг|jump|hop)/i.test(t)) {
    cmd.torso = 'jump';
    if (!cmd.lArm && !cmd.rArm) { cmd.lArm = 'up'; cmd.rArm = 'up'; }
    cmd.expr = 'happy';
    parts.push('jumping up');
  }

  // Body Turn
  if (/(повернись спиной|развернись|повернись назад|turn around|show.*back|face away)/i.test(t)) {
    cmd.turn = 180;
    parts.push('turning around');
  } else if (/(повернись налев|повернись влев|turn left)/i.test(t)) {
    cmd.turn = 90;
    parts.push('turning left');
  } else if (/(повернись направ|повернись вправ|turn right)/i.test(t)) {
    cmd.turn = -90;
    parts.push('turning right');
  } else if (/(повернись ко мне|лицом ко мне|face me|turn front|face forward)/i.test(t)) {
    cmd.turn = 0;
    parts.push('facing you');
  }

  // Head
  if (/(кивн|nod)/i.test(t)) {
    cmd.head = 'nod';
    parts.push('nodding');
  } else if (/(помотай голов|покачай голов|shake.*head)/i.test(t)) {
    cmd.head = 'shake';
    parts.push('shaking my head');
  } else if (/(посмотри влев|посмотри налев|look left)/i.test(t)) {
    cmd.head = 'left';
    parts.push('looking left');
  } else if (/(посмотри вправ|посмотри направ|look right)/i.test(t)) {
    cmd.head = 'right';
    parts.push('looking right');
  } else if (/(посмотри вверх|look up)/i.test(t)) {
    cmd.head = 'up';
    parts.push('looking up');
  } else if (/(посмотри вниз|look down)/i.test(t)) {
    cmd.head = 'down';
    parts.push('looking down');
  } else if (/(наклони голов|tilt.*head)/i.test(t)) {
    cmd.head = /(прав|right)/i.test(t) ? 'tiltR' : 'tiltL';
    parts.push('tilting my head');
  }

  // Expressions
  if (/(подмигн|wink)/i.test(t)) {
    cmd.expr = 'wink';
    parts.push('winking');
  } else if (/(удивись|surprised)/i.test(t)) {
    cmd.expr = 'surprised';
    parts.push('acting surprised');
  }

  if (!parts.length) return null;
  cmd.hold = 6.2;
  cmd.label = `Done! ${parts[0][0].toUpperCase() + parts[0].slice(1)}${parts.length > 1 ? ' and ' + parts.slice(1).join(', ') : ''} right now!`;
  return cmd;
}

function parseTaggedReply(raw, userText = '') {
  let rest = String(raw || '').trim();
  let pose = 'happy';
  let action = null;
  let body = null;

  for (let i = 0; i < 4; i++) {
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
    const mBody = rest.match(/^\[BODY:(\{[\s\S]*?\})\]\s*/);
    if (mBody) {
      try { body = JSON.parse(mBody[1]); } catch {}
      rest = rest.slice(mBody[0].length).trim();
      continue;
    }
    break;
  }

  // Also strip any stray [BODY:...] tag that appeared mid-text
  const inlineBody = rest.match(/\[BODY:(\{[\s\S]*?\})\]/);
  if (inlineBody) {
    if (!body) {
      try { body = JSON.parse(inlineBody[1]); } catch {}
    }
    rest = rest.replace(inlineBody[0], '').replace(/\s{2,}/g, ' ').trim();
  }

  if (!action) action = inferActionFromUser(userText);
  if (!body) body = inferBodyCommandFromUser(userText);
  return { pose, action, body, text: rest };
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
    const body = inferBodyCommandFromUser(trimmed);
    let fallbackText = '';
    let pose = this.mood === 'offended' ? 'pout' : 'happy';
    if (this.mood === 'offended') {
      fallbackText = 'Hmph, I am still sulking! Apologize or pet my head first, then we can talk.';
      pose = 'pout';
    } else if (body) {
      fallbackText = body.label || 'Got it! Moving just like you asked — tell me what pose to do next!';
      pose = 'happy';
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
    const reply = { pose, action, body, text: fallbackText, source: 'SMART_FALLBACK' };
    if (action !== 'MARKET' && action !== 'TOUR') this.speak(reply.text);
    return reply;
  }
}
