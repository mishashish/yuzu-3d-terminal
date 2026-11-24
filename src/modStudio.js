/**
 * $YUZU MOD STUDIO — Download Base VRM / UV Textures, Customize & Upload Back Live!
 * Supports:
 * - 1-click download of base .VRM model + Skin/Outfit UV PNG + Hair UV PNG
 * - Drag & drop upload of custom .VRM models or painted .PNG/.JPG textures
 * - Live in-browser Hair / Outfit Hue remix sliders
 * - Local Community Mod Gallery with 3D canvas snapshots & X sharing
 */

const STORAGE_KEY = 'yuzu_community_mods_v1';

const STARTER_MODS = [
  {
    id: 'preset-acid',
    name: 'ACID CYBER YUZU',
    creator: '@yuzu_lab',
    type: 'REMIX',
    hairHue: 125,
    outfitHue: 110,
    outfitMode: 'full',
    thumb: null,
    accent: 'linear-gradient(135deg,#b8ff65,#72e7ff)',
    builtin: true,
  },
  {
    id: 'preset-ice',
    name: 'ICE ANGEL YUZU',
    creator: '@yuzu_lab',
    type: 'REMIX',
    hairHue: 205,
    outfitHue: 195,
    outfitMode: 'full',
    thumb: null,
    accent: 'linear-gradient(135deg,#72e7ff,#d9d9e8)',
    builtin: true,
  },
  {
    id: 'preset-sunset',
    name: 'SOLAR BEACH YUZU',
    creator: '@yuzu_lab',
    type: 'REMIX',
    hairHue: 320,
    outfitHue: 45,
    outfitMode: 'beach',
    thumb: null,
    accent: 'linear-gradient(135deg,#ff8bcb,#ffd26f)',
    builtin: true,
  },
];

function loadSavedMods() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMods(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 12)));
  } catch {}
}

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function initModStudio(stage, toast, ai) {
  const overlay = document.getElementById('mod-overlay');
  if (!overlay) return { open: () => {}, close: () => {} };

  const dropzone = document.getElementById('mod-dropzone');
  const fileInput = document.getElementById('mod-file-input');
  const slotBtns = overlay.querySelectorAll('#mod-slot-chips [data-slot]');
  const hairHueInput = document.getElementById('mod-hair-hue');
  const outfitHueInput = document.getElementById('mod-outfit-hue');
  const hairHueVal = document.getElementById('mod-hair-hue-val');
  const outfitHueVal = document.getElementById('mod-outfit-hue-val');
  const nameInput = document.getElementById('mod-name');
  const creatorInput = document.getElementById('mod-creator');
  const galleryEl = document.getElementById('mod-gallery');
  const statusEl = document.getElementById('mod-status');

  let activeSlot = 'skin';
  let currentModType = 'REMIX';
  let currentTexData = null; // dataURL for texture mods (small enough for localStorage)
  let currentVrmUrl = null;  // blob URL for current session .vrm
  let userMods = loadSavedMods();

  const setStatus = (msg) => {
    if (statusEl) statusEl.textContent = msg;
  };

  const open = () => {
    overlay.classList.add('open');
    renderGallery();
  };
  const close = () => overlay.classList.remove('open');

  document.getElementById('btn-open-mod')?.addEventListener('click', open);
  document.getElementById('btn-close-mod')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Slot selector for PNG/JPG texture uploads
  slotBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSlot = btn.dataset.slot;
      slotBtns.forEach((b) => b.classList.toggle('active', b.dataset.slot === activeSlot));
    });
  });

  // STEP 1: Download Base Kit (.VRM, Skin/Outfit UV PNG, Hair UV PNG)
  document.getElementById('btn-mod-dl-vrm')?.addEventListener('click', () => {
    triggerDownload('/models/darkness_shibu.vrm', 'yuzu-base-model.vrm');
    toast('Downloading yuzu-base-model.vrm (open in VRoid Studio or Blender)');
    setStatus('BASE .VRM DOWNLOADED — EDIT IN VROID / BLENDER & DROP BACK HERE');
  });

  document.getElementById('btn-mod-dl-skin')?.addEventListener('click', () => {
    const png = stage.exportTexturePNG('skin');
    if (!png) return toast('Model still loading — try again in a second');
    triggerDownload(png, 'yuzu-skin-outfit-uv.png');
    toast('Downloaded Skin/Outfit UV PNG — paint over it & drop back!');
    setStatus('SKIN UV PNG DOWNLOADED — PAINT IN PHOTOSHOP / CANVA & DROP BACK');
  });

  document.getElementById('btn-mod-dl-hair')?.addEventListener('click', () => {
    const png = stage.exportTexturePNG('hair');
    if (!png) return toast('Model still loading — try again in a second');
    triggerDownload(png, 'yuzu-hair-uv.png');
    toast('Downloaded Hair UV PNG — recolor & drop back!');
    setStatus('HAIR UV PNG DOWNLOADED — RECOLOR & UPLOAD TO HAIR SLOT');
  });

  // STEP 2: Upload .VRM or .PNG/.JPG/.WEBP
  const handleFile = async (file) => {
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'vrm' || ext === 'glb') {
      if (currentVrmUrl) URL.revokeObjectURL(currentVrmUrl);
      currentVrmUrl = URL.createObjectURL(file);
      currentModType = '3D .VRM';
      currentTexData = null;
      setStatus(`LOADING CUSTOM 3D MODEL: ${file.name.toUpperCase()}...`);
      stage.load(currentVrmUrl);
      toast(`Loaded custom 3D model: ${file.name}`);
      if (!nameInput.value.trim()) {
        nameInput.value = file.name.replace(/\.(vrm|glb)$/i, '').toUpperCase().slice(0, 22);
      }
      const msg = 'Whoa, new 3D body loaded! Your custom VRM mod is now live on stage!';
      stage.react('spin', null, msg);
      ai?.speak(msg);
      return;
    }

    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result;
          await stage.applyCustomTexture(activeSlot, dataUrl);
          currentModType = `${activeSlot.toUpperCase()} PNG`;
          // Store compressed preview texture if reasonable size (<450KB)
          currentTexData = dataUrl.length < 480000 ? dataUrl : null;
          setStatus(`APPLIED ${file.name.toUpperCase()} TO ${activeSlot.toUpperCase()} SLOT!`);
          toast(`Applied custom ${activeSlot} texture!`);
          if (!nameInput.value.trim()) {
            nameInput.value = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '').toUpperCase().slice(0, 22);
          }
          const msg = `Custom ${activeSlot} texture applied! How do I look in your design?`;
          stage.react('peace', null, msg);
          ai?.speak(msg);
        } catch (err) {
          toast(err.message || 'Could not apply texture');
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    toast('Drop a .VRM model or .PNG / .JPG texture file');
  };

  dropzone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    handleFile(e.target.files?.[0]);
    e.target.value = '';
  });
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFile(e.dataTransfer?.files?.[0]);
  });

  // Live Quick-Remix Hue Sliders
  let hueTimer = null;
  const onHueChange = () => {
    const hairHue = Number(hairHueInput?.value || 0);
    const outfitHue = Number(outfitHueInput?.value || 0);
    if (hairHueVal) hairHueVal.textContent = `${hairHue}°`;
    if (outfitHueVal) outfitHueVal.textContent = `${outfitHue}°`;
    clearTimeout(hueTimer);
    hueTimer = setTimeout(() => {
      stage.applyRemixHue({ hairHue, outfitHue });
      currentModType = 'REMIX';
      setStatus(`LIVE REMIX // HAIR ${hairHue}° · OUTFIT ${outfitHue}°`);
    }, 60);
  };
  hairHueInput?.addEventListener('input', onHueChange);
  outfitHueInput?.addEventListener('input', onHueChange);

  // Reset to Canonical Default Yuzu
  document.getElementById('btn-mod-reset')?.addEventListener('click', () => {
    if (hairHueInput) hairHueInput.value = '0';
    if (outfitHueInput) outfitHueInput.value = '0';
    if (hairHueVal) hairHueVal.textContent = '0°';
    if (outfitHueVal) outfitHueVal.textContent = '0°';
    currentTexData = null;
    currentModType = 'REMIX';
    stage.resetCustomModel();
    toast('Reset to canonical Yuzu');
    setStatus('CANONICAL DEFAULT YUZU RESTORED');
  });

  // STEP 3: Publish Mod to Gallery + Share on X
  document.getElementById('btn-mod-publish')?.addEventListener('click', () => {
    const name = (nameInput?.value || '').trim().toUpperCase() || `YUZU MOD #${userMods.length + 1}`;
    const rawCreator = (creatorInput?.value || '').trim() || '@anon';
    const creator = rawCreator.startsWith('@') ? rawCreator : `@${rawCreator}`;
    const thumb = stage.captureThumbnail();
    const mod = {
      id: `mod-${Date.now()}`,
      name,
      creator,
      type: currentModType,
      slot: activeSlot,
      hairHue: Number(hairHueInput?.value || 0),
      outfitHue: Number(outfitHueInput?.value || 0),
      outfitMode: stage.outfitMode || 'full',
      texData: currentTexData,
      thumb,
      createdAt: Date.now(),
    };
    userMods.unshift(mod);
    saveMods(userMods);
    renderGallery();
    toast(`Published "${name}" to Community Mods!`);
    setStatus(`PUBLISHED "${name}" BY ${creator}`);
    const msg = `Your custom mod ${name} is now live in the $YUZU community gallery!`;
    stage.react('happy', null, msg);
    ai?.speak(msg);
  });

  document.getElementById('btn-mod-share')?.addEventListener('click', () => {
    const name = (nameInput?.value || '').trim().toUpperCase() || 'MY CUSTOM YUZU';
    const text = encodeURIComponent(
      `Just customized my own 3D $YUZU mod "${name}" in the live browser Mod Studio on @girl_yuzu_!\n\nDownload the VRM & remix yours:`
    );
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener');
  });

  const applyModEntry = async (mod) => {
    if (mod.outfitMode) stage.setOutfitMode(mod.outfitMode);
    if (hairHueInput) hairHueInput.value = String(mod.hairHue || 0);
    if (outfitHueInput) outfitHueInput.value = String(mod.outfitHue || 0);
    if (hairHueVal) hairHueVal.textContent = `${mod.hairHue || 0}°`;
    if (outfitHueVal) outfitHueVal.textContent = `${mod.outfitHue || 0}°`;
    stage.applyRemixHue({ hairHue: mod.hairHue || 0, outfitHue: mod.outfitHue || 0 });
    if (mod.texData) {
      try {
        await stage.applyCustomTexture(mod.slot || 'skin', mod.texData);
      } catch {}
    }
    toast(`Equipped "${mod.name}" by ${mod.creator}`);
    setStatus(`EQUIPPED: ${mod.name} (${mod.creator})`);
    stage.react('peace', null, `Wearing ${mod.name} by ${mod.creator}!`);
  };

  function renderGallery() {
    if (!galleryEl) return;
    const all = [...userMods, ...STARTER_MODS];
    galleryEl.innerHTML = '';
    for (const mod of all) {
      const card = document.createElement('div');
      card.className = 'mod-card';
      const preview = mod.thumb
        ? `<img src="${mod.thumb}" alt="${mod.name}" class="mod-thumb" />`
        : `<div class="mod-thumb mod-thumb-grad" style="background:${mod.accent || 'linear-gradient(135deg,#ff8bcb,#72e7ff)'}"><span>${mod.type}</span></div>`;
      card.innerHTML = `
        ${preview}
        <div class="mod-card-meta">
          <b>${mod.name}</b>
          <span>${mod.creator} · ${mod.type}</span>
        </div>
        <div class="mod-card-actions">
          <button type="button" class="gloss-key" data-equip>WEAR</button>
          ${mod.builtin ? '' : '<button type="button" class="gloss-key" data-del title="Delete">X</button>'}
        </div>
      `;
      card.querySelector('[data-equip]')?.addEventListener('click', () => applyModEntry(mod));
      card.querySelector('[data-del]')?.addEventListener('click', () => {
        userMods = userMods.filter((m) => m.id !== mod.id);
        saveMods(userMods);
        renderGallery();
        toast(`Removed "${mod.name}"`);
      });
      galleryEl.appendChild(card);
    }
  }

  return { open, close };
}
