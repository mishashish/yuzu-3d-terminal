/**
 * Cyber Y2K Liquid-Chrome & Iridescent Glass Logo Forge for $YUZU:
 * - Renders high-res 1024x1024 glossy chrome, crystal glass, pink crystal, acid & obsidian logos
 * - 4 iconic Cyber Y2K emblem frames: Tribal Wings, Chrome Halo, Glass Orb, Hex Sigil
 * - 1-click PNG export (transparent or dark void) + Spawn into 3D Stage!
 */

const MATERIALS = {
  chrome: {
    name: 'LIQUID CHROME',
    stops: ['#ffffff', '#e6e8f5', '#7e849c', '#ffffff', '#ff9fd6', '#72e7ff', '#2b2d3c', '#f4f6ff'],
    glow: 'rgba(114, 231, 255, 0.55)',
    rim: '#ffffff',
    accent: '#ff8bcb',
    glass: false,
  },
  glass: {
    name: 'IRIDESCENT GLASS',
    stops: ['rgba(255,255,255,0.92)', 'rgba(255,139,203,0.48)', 'rgba(114,231,255,0.52)', 'rgba(166,107,255,0.46)', 'rgba(255,255,255,0.85)'],
    glow: 'rgba(255, 139, 203, 0.62)',
    rim: 'rgba(255, 255, 255, 0.92)',
    accent: '#72e7ff',
    glass: true,
  },
  pink: {
    name: 'PINK CRYSTAL',
    stops: ['#fff0f8', '#ff9ad3', '#c83b92', '#ff8bcb', '#ffe1f2', '#a66bff', '#ff8bcb'],
    glow: 'rgba(255, 139, 203, 0.72)',
    rim: '#ffe8f5',
    accent: '#ff8bcb',
    glass: true,
  },
  acid: {
    name: 'ACID CYBER',
    stops: ['#f3ffdf', '#b8ff65', '#2a5a18', '#d9ff9e', '#72e7ff', '#163310', '#b8ff65'],
    glow: 'rgba(184, 255, 101, 0.65)',
    rim: '#eaffcc',
    accent: '#b8ff65',
    glass: false,
  },
  obsidian: {
    name: 'DARK OBSIDIAN',
    stops: ['#6a6085', '#1c1829', '#09070f', '#4c4268', '#ff8bcb', '#0b0912', '#72e7ff'],
    glow: 'rgba(166, 107, 255, 0.65)',
    rim: '#ff8bcb',
    accent: '#a66bff',
    glass: false,
  },
};

function makeMetalGrad(ctx, mat, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const n = mat.stops.length - 1;
  mat.stops.forEach((c, i) => g.addColorStop(i / n, c));
  return g;
}

function drawSparkStar(ctx, x, y, r, color = '#ffffff') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 0.8;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? r : r * 0.18;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTribalWings(ctx, cx, cy, s, mat) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = mat.glow;
  ctx.shadowBlur = s * 0.08;
  const fill = makeMetalGrad(ctx, mat, -s * 0.44, -s * 0.28, s * 0.44, s * 0.28);

  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.scale(dir, 1);
    ctx.fillStyle = fill;
    ctx.strokeStyle = mat.rim;
    ctx.lineWidth = s * 0.006;

    // Upper sweeping Cyber-Tribal wing blade
    ctx.beginPath();
    ctx.moveTo(s * 0.06, -s * 0.02);
    ctx.quadraticCurveTo(s * 0.22, -s * 0.26, s * 0.46, -s * 0.22);
    ctx.quadraticCurveTo(s * 0.30, -s * 0.12, s * 0.24, -s * 0.04);
    ctx.quadraticCurveTo(s * 0.36, -s * 0.06, s * 0.43, s * 0.04);
    ctx.quadraticCurveTo(s * 0.26, s * 0.03, s * 0.18, s * 0.07);
    ctx.quadraticCurveTo(s * 0.30, s * 0.14, s * 0.34, s * 0.24);
    ctx.quadraticCurveTo(s * 0.18, s * 0.17, s * 0.06, s * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawChromeHalo(ctx, cx, cy, s, mat) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.22);
  ctx.shadowColor = mat.glow;
  ctx.shadowBlur = s * 0.09;
  ctx.strokeStyle = makeMetalGrad(ctx, mat, -s * 0.42, -s * 0.2, s * 0.42, s * 0.2);
  ctx.lineWidth = s * 0.036;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.41, s * 0.16, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = mat.rim;
  ctx.lineWidth = s * 0.006;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.425, s * 0.172, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGlassOrb(ctx, cx, cy, s, mat) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = mat.glow;
  ctx.shadowBlur = s * 0.1;

  const r = s * 0.34;
  const rg = ctx.createRadialGradient(-r * 0.32, -r * 0.34, r * 0.08, 0, 0, r);
  rg.addColorStop(0, 'rgba(255,255,255,0.95)');
  rg.addColorStop(0.28, mat.stops[1]);
  rg.addColorStop(0.68, mat.stops[Math.min(2, mat.stops.length - 1)]);
  rg.addColorStop(1, 'rgba(12, 10, 22, 0.85)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = mat.rim;
  ctx.lineWidth = s * 0.008;
  ctx.stroke();

  // Top glossy glass dome reflection
  const shine = ctx.createLinearGradient(0, -r * 0.9, 0, -r * 0.1);
  shine.addColorStop(0, 'rgba(255,255,255,0.72)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.44, r * 0.66, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHexSigil(ctx, cx, cy, s, mat) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = mat.glow;
  ctx.shadowBlur = s * 0.08;

  const drawPoly = (r, rot, lw) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rot + (i * Math.PI) / 3;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.lineWidth = lw;
    ctx.stroke();
  };

  ctx.strokeStyle = makeMetalGrad(ctx, mat, -s * 0.36, -s * 0.36, s * 0.36, s * 0.36);
  drawPoly(s * 0.36, Math.PI / 6, s * 0.024);
  ctx.strokeStyle = mat.rim;
  drawPoly(s * 0.31, 0, s * 0.007);
  ctx.restore();
}

export function renderY2KLogo(canvas, opts = {}) {
  const {
    text = '$YUZU',
    sub = 'SOLANA // 2026',
    material = 'chrome',
    frame = 'tribal',
    transparent = false,
  } = opts;

  const s = canvas.width;
  const cx = s / 2;
  const cy = s / 2;
  const ctx = canvas.getContext('2d');
  const mat = MATERIALS[material] || MATERIALS.chrome;

  ctx.clearRect(0, 0, s, s);

  if (!transparent) {
    const bg = ctx.createRadialGradient(cx, cy * 0.88, s * 0.04, cx, cy, s * 0.65);
    bg.addColorStop(0, '#221734');
    bg.addColorStop(0.55, '#0c0a14');
    bg.addColorStop(1, '#050509');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, s, s);
  }

  // Soft prismatic ambient aura
  const aura = ctx.createRadialGradient(cx, cy, s * 0.05, cx, cy, s * 0.44);
  aura.addColorStop(0, mat.glow);
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, s, s);

  // Selected Cyber Y2K emblem frame
  if (frame === 'tribal') drawTribalWings(ctx, cx, cy, s, mat);
  else if (frame === 'halo') drawChromeHalo(ctx, cx, cy, s, mat);
  else if (frame === 'orb') drawGlassOrb(ctx, cx, cy, s, mat);
  else if (frame === 'sigil') drawHexSigil(ctx, cx, cy, s, mat);

  // Glossy extruded 3D text with bevel & specular liquid highlight
  const cleanText = (text || '$YUZU').trim().slice(0, 14);
  const fontSize = Math.round(s * (cleanText.length <= 5 ? 0.175 : cleanText.length <= 8 ? 0.135 : 0.105));
  ctx.save();
  ctx.font = `800 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Deep 3D extrusion shadow layers
  for (let d = 10; d >= 1; d--) {
    ctx.fillStyle = d > 5 ? 'rgba(8, 6, 16, 0.72)' : 'rgba(42, 34, 62, 0.85)';
    ctx.fillText(cleanText, cx, cy + d * (s * 0.0022));
  }

  // Main liquid-chrome / crystal-glass fill
  ctx.shadowColor = mat.glow;
  ctx.shadowBlur = s * 0.045;
  ctx.fillStyle = makeMetalGrad(ctx, mat, cx, cy - fontSize * 0.55, cx, cy + fontSize * 0.55);
  ctx.fillText(cleanText, cx, cy);

  // Crisp bright glass rim stroke
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(2, s * 0.0042);
  ctx.strokeStyle = mat.rim;
  ctx.strokeText(cleanText, cx, cy);

  // Glassy upper specular reflection strip inside text
  if (mat.glass) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const sg = ctx.createLinearGradient(0, cy - fontSize * 0.5, 0, cy);
    sg.addColorStop(0, 'rgba(255,255,255,0.65)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, cy - fontSize * 0.6, s, fontSize * 0.55);
    ctx.restore();
  }
  ctx.restore();

  // Subtitle pill
  const cleanSub = (sub || '').trim().slice(0, 28);
  if (cleanSub) {
    ctx.save();
    ctx.font = `600 ${Math.round(s * 0.028)}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = mat.accent;
    ctx.shadowColor = mat.glow;
    ctx.shadowBlur = 10;
    ctx.fillText(cleanSub.toUpperCase(), cx, cy + s * 0.255);
    ctx.restore();
  }

  // Y2K specular chrome stars
  drawSparkStar(ctx, cx - s * 0.30, cy - s * 0.24, s * 0.036, '#ffffff');
  drawSparkStar(ctx, cx + s * 0.32, cy + s * 0.19, s * 0.028, mat.accent);
  drawSparkStar(ctx, cx + s * 0.26, cy - s * 0.26, s * 0.020, '#72e7ff');
}
