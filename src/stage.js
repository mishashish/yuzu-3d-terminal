import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

/**
 * Centered Fixed 3D VRM Stage:
 * - Grounded 2-bone analytic leg IK (feet ALWAYS planted on the floor!)
 * - 8 expressive poses & animations: wave, headpat, kiss, peace, dance, spin, shy, pout
 * - Live facial expressions (blink, happy, wink, surprised, angry/pout, relaxed) + talking lip-sync
 * - Real VRM SpringBone hair & skirt physics + Eye LookAt cursor tracking
 * - Spontaneous cute comments + scroll-linked camera framing
 */

const DOWN = new THREE.Vector3(0, -1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _qc = new THREE.Quaternion();

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (x) => {
  const c = clamp(x, 0, 1);
  return c * c * (3 - 2 * c);
};
const envelope = (p) => smooth(Math.min(p / 0.16, (1 - p) / 0.22, 1));

export const CAMERA_PRESETS = {
  hero: { pos: [0, 1.12, 3.15], target: [0, 0.88, 0] },
  face: { pos: [0.06, 1.42, 1.38], target: [0, 1.36, 0] },
  outfit: { pos: [-0.42, 0.96, 2.25], target: [0, 0.86, 0] },
  full: { pos: [0.22, 1.08, 3.65], target: [0, 0.84, 0] },
};

const SCROLL_CAMERAS = [
  { pos: new THREE.Vector3(0, 1.12, 3.15), target: new THREE.Vector3(0, 0.88, 0) },
  { pos: new THREE.Vector3(0.45, 1.24, 2.35), target: new THREE.Vector3(0, 1.05, 0) },
  { pos: new THREE.Vector3(-0.55, 1.06, 2.75), target: new THREE.Vector3(0, 0.88, 0) },
  { pos: new THREE.Vector3(0.15, 1.08, 3.45), target: new THREE.Vector3(0, 0.85, 0) },
];

const REACTIONS = {
  wave: { dur: 2.4, text: 'Hey there, handsome!' },
  headpat: { dur: 2.2, text: 'Hehe~ pet me a little more!' },
  kiss: { dur: 2.5, text: 'Catch this blown kiss~' },
  peace: { dur: 2.4, text: 'Take a pic of me!' },
  dance: { dur: 4.2, text: 'Dancing just for you~' },
  spin: { dur: 2.2, text: 'Ta-da~ check me out from every angle!' },
  happy: { dur: 2.0, text: 'WAGMI! Sending $YUZU to the moon!' },
  shy: { dur: 2.3, text: 'Hey, don\'t stare so close...' },
  pout: { dur: 2.4, text: 'Hmph! Pet my head right now!' },
  bonk: { dur: 2.6, text: 'Ow!! Why are you throwing orbs at me?!' },
};

const IDLE_COMMENTS = [
  'Talk to me in the terminal~',
  'Hey, rub my head to level up BOND!',
  'Want me to dance for you?',
  'My heartbeat races for $YUZU~',
  'Wave your cursor and I\'ll wave back!',
];

function glowTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(20, 241, 149, 0.5)');
  grad.addColorStop(0.35, 'rgba(153, 69, 255, 0.34)');
  grad.addColorStop(0.7, 'rgba(153, 69, 255, 0.08)');
  grad.addColorStop(1, 'rgba(153, 69, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sparkTexture(heart = false) {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  if (heart) {
    g.save();
    g.translate(s / 2, s / 2 + 2);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, 14);
    g.bezierCurveTo(-22, -2, -24, -22, -9, -22);
    g.bezierCurveTo(-2, -22, 0, -15, 0, -11);
    g.bezierCurveTo(0, -15, 2, -22, 9, -22);
    g.bezierCurveTo(24, -22, 22, -2, 0, 14);
    g.closePath();
    g.fill();
    g.restore();
  } else {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.65)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class CharacterStage {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = opts;

    this.clock = new THREE.Clock();
    this.t = 0;
    this.vrm = null;
    this.bones = null;
    this.legs = [];

    this.params = {
      sway: 0.75,
      breathe: 0.85,
      headTilt: 0.8,
      sparkles: 0.8,
    };
    this.turntable = false;
    this.turntableAngle = 0;
    this.openOutfit = false;
    this.viewMode = 'normal'; // 'normal' | 'skeleton' | 'wireframe'
    this.skeletonHelper = null;
    this.jointMarkers = [];
    this.rigStats = { bones: 0, tris: 0, meshes: 0, springs: 0 };
    this.scrollProgress = 0;
    this.cameraOverride = null;
    this.userDragging = false;

    this.mouse = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.lastMove = 0;
    this.lastMouseX = 0;
    this.waveEnergy = 0;
    this.lastWave = 0;
    this.isHover = false;
    this.hover = 0;
    this.turn = 0;

    this.excitement = 0;
    this.bpm = 96;
    this.beatPhase = 0;
    this.lastBeatTrigger = 0;
    this.heartbeatAudioOn = false;
    this.audioCtx = null;
    this.offended = false;
    this.offendedBlend = 0;
    this.patCount = 0;
    this.affection = 15; // 0..100 affection XP -> levels up Bond Level 1..5!
    this.bondLevel = 1;
    this.rubEnergy = 0;
    this.isPointerDown = false;
    this.talkTimer = 0;
    this.isSpeaking = false;
    this.idleCommentTimer = 11;

    this.reaction = null;
    this.bodyClicks = 0;
    this.orbHitCount = 0;
    this.dragOrb = null;
    this.dragPlane = new THREE.Plane();
    this.dragPrev = new THREE.Vector3();
    this.dragVel = new THREE.Vector3();
    this.throwableOrbs = [];
    this.blinkTimer = 1.6;
    this.blinkT = -1;
    this.happyE = 0;
    this.angryE = 0;
    this.surprise = 0;

    this.fpsFrames = 0;
    this.fpsLast = performance.now();
    this.fps = 60;

    this._initRenderer();
    this._initScene();
    this._resize();
    this._initHearts();
    this._initEvents();
    this.load(opts.modelUrl);
    this.renderer.setAnimationLoop(() => this._tick());
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, w < 768 ? 1.5 : 2));
    this.renderer.setSize(w, h, false);
    if (this.camera) {
      this.camera.aspect = w / h;
      // Widen vertical FOV slightly on portrait phones so Yuzu + 3D background fit cleanly
      this.camera.fov = w / h < 0.78 ? 38 : 28;
      this.camera.updateProjectionMatrix();
    }
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.1, 50);
    this.camera.position.set(...CAMERA_PRESETS.hero.pos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...CAMERA_PRESETS.hero.target);
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.55;
    this.controls.minPolarAngle = Math.PI * 0.28;
    this.controls.maxPolarAngle = Math.PI * 0.55;
    this.controls.update();

    this.controls.addEventListener('start', () => {
      this.userDragging = true;
      this.cameraOverride = null;
    });
    this.controls.addEventListener('end', () => {
      this.userDragging = false;
    });

    // Studio Environment for real liquid-chrome & glossy pink glass reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.75;
    pmrem.dispose();

    // Cyber Y2K Palette Lighting (#FF8BCB Glossy Pink, #A66BFF Electric Purple, #72E7FF Cyber Blue)
    this.scene.add(new THREE.HemisphereLight(0xd9d9e8, 0x15131c, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.45);
    key.position.set(1.2, 3.2, 2.8);
    this.scene.add(key);
    const rimPink = new THREE.DirectionalLight(0xff8bcb, 2.4);
    rimPink.position.set(-2.8, 2.2, -1.8);
    this.scene.add(rimPink);
    const rimBlue = new THREE.DirectionalLight(0x72e7ff, 2.3);
    rimBlue.position.set(2.8, 1.8, -1.8);
    this.scene.add(rimBlue);
    const rimPurple = new THREE.DirectionalLight(0xa66bff, 1.2);
    rimPurple.position.set(0, -1.2, 2.2);
    this.scene.add(rimPurple);

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    this.lookTarget = new THREE.Object3D();
    this.scene.add(this.lookTarget);

    // Real 3D Cyber Y2K Sculptural Background anchored in world space (NOT a 2D image, stays fixed in 3D space!)
    this.artObjects = [];
    const chromeMat = new THREE.MeshPhysicalMaterial({
      color: 0xd9d9e8,
      metalness: 0.96,
      roughness: 0.07,
      iridescence: 1.0,
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: [180, 560],
      clearcoat: 1.0,
    });
    const darkChromeMat = new THREE.MeshPhysicalMaterial({
      color: 0x3a344c,
      metalness: 0.94,
      roughness: 0.14,
      iridescence: 0.9,
      iridescenceIOR: 1.4,
      iridescenceThicknessRange: [220, 620],
      clearcoat: 1.0,
    });
    const pinkGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xff8bcb,
      metalness: 0.10,
      roughness: 0.05,
      transmission: 0.78,
      thickness: 0.7,
      ior: 1.48,
      iridescence: 0.9,
      clearcoat: 1.0,
    });
    const cyanGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x72e7ff,
      metalness: 0.12,
      roughness: 0.06,
      transmission: 0.74,
      thickness: 0.6,
      ior: 1.45,
      iridescence: 0.85,
      clearcoat: 1.0,
    });

    // 1. FULL 360° CYBER Y2K 3D ENVIRONMENT INSTALLATION
    // Surrounds the entire 360° arena with tribals, iridescent glass shards/prisms, chrome & glass orbs, 4-point stars, and holographic ribbons!
    const installGroup = new THREE.Group();
    this.scene.add(installGroup);

    // Subtle glowing Cyber Y2K perspective floor grid fading into the dark horizon
    const grid = new THREE.GridHelper(22, 34, 0x3b2c59, 0x1c172b);
    grid.position.y = -0.002;
    grid.material.transparent = true;
    grid.material.opacity = 0.42;
    installGroup.add(grid);

    const ribbonMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6e0ff,
      metalness: 0.72,
      roughness: 0.08,
      iridescence: 1.0,
      iridescenceIOR: 1.45,
      iridescenceThicknessRange: [220, 680],
      clearcoat: 1.0,
      transmission: 0.28,
      thickness: 0.35,
    });
    const violetGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xa66bff,
      metalness: 0.14,
      roughness: 0.05,
      transmission: 0.78,
      thickness: 0.65,
      ior: 1.48,
      iridescence: 0.95,
      clearcoat: 1.0,
    });

    // A. 360° Flowing Iridescent Liquid-Glass Ribbons (6 sculptural waves encircling the entire 360° dome)
    const makeRibbon = (pts) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      return new THREE.TubeGeometry(curve, 56, 0.044, 10, false);
    };
    const baseRibbon = [
      [-3.2, 0.25, -1.35],
      [-2.4, 0.58, -1.78],
      [-1.82, 0.22, -1.55],
      [-1.52, 0.88, -1.98],
      [-1.98, 1.56, -1.68],
      [-1.46, 2.12, -1.88],
      [-0.82, 2.42, -2.08],
    ];
    for (let k = 0; k < 3; k++) {
      const rotY = (k * Math.PI * 2) / 3;
      const pair = new THREE.Group();
      pair.rotation.y = rotY;
      for (const side of [-1, 1]) {
        const pts = baseRibbon.map(([x, y, z]) => [x * (side === -1 ? 1 : -1), y, z]);
        pair.add(new THREE.Mesh(makeRibbon(pts), ribbonMat));
      }
      installGroup.add(pair);
    }

    // B. 360° Liquid-Chrome 4-Point Y2K Stars (28 beveled 3D stars all around the 360° sky & flanks)
    const starShape = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? 1 : 0.22;
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starShape.closePath();
    const starGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2,
    });
    starGeo.center();

    const starMats = [chromeMat, pinkGlassMat, cyanGlassMat, chromeMat];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2 + (i % 2) * 0.11;
      const r = 2.45 + (i % 4) * 0.62;
      const y = 0.35 + ((i * 7) % 10) * 0.28;
      const sc = 0.065 + (i % 3) * 0.032;
      const st = new THREE.Mesh(starGeo, starMats[i % starMats.length]);
      st.position.set(Math.sin(angle) * r, y, -Math.cos(angle) * r);
      st.scale.setScalar(sc);
      st.lookAt(0, y, 0);
      installGroup.add(st);
      this.artObjects.push({ mesh: st, rx: 0.12 * (i % 2 ? 1 : -1), ry: 0.45 + (i % 3) * 0.15, baseY: y, phase: i * 0.9 });
    }

    // C. 360° Faceted Crystal Glass Shards & Prisms ("стекляшки" — 24 iridescent shards floating all around 360°)
    const shardGeo = new THREE.OctahedronGeometry(0.16, 0);
    shardGeo.scale(0.62, 1.85, 0.52);
    const shardMats = [pinkGlassMat, cyanGlassMat, violetGlassMat, chromeMat, ribbonMat];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + 0.18;
      const r = 2.35 + (i % 3) * 0.78;
      const y = 0.38 + ((i * 5) % 9) * 0.31;
      const sc = 0.68 + (i % 4) * 0.24;
      const sh = new THREE.Mesh(shardGeo, shardMats[i % shardMats.length]);
      sh.position.set(Math.sin(angle) * r, y, -Math.cos(angle) * r);
      sh.scale.setScalar(sc);
      installGroup.add(sh);
      this.artObjects.push({
        mesh: sh,
        rx: (i % 2 ? 0.28 : -0.24),
        ry: (i % 3 ? 0.36 : -0.32),
        baseY: y,
        phase: i * 1.3,
      });
    }

    // D. 360° Glossy Chrome & Translucent Glass Orbs (26 floating spheres encircling the full 360° space)
    const decoOrbGeo = new THREE.SphereGeometry(1, 24, 24);
    const orbMats = [pinkGlassMat, chromeMat, cyanGlassMat, violetGlassMat, chromeMat];
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2 + 0.07;
      // Keep a clean pocket directly behind Yuzu's face so her silhouette stays crisp
      const isCenterBack = Math.abs(Math.sin(angle)) < 0.24 && Math.cos(angle) > 0.8;
      const r = isCenterBack ? 4.3 : 2.25 + (i % 4) * 0.68;
      const y = 0.28 + ((i * 3) % 8) * 0.34;
      const rad = 0.08 + (i % 4) * 0.045;
      const sp = new THREE.Mesh(decoOrbGeo, orbMats[i % orbMats.length]);
      sp.position.set(Math.sin(angle) * r, y, -Math.cos(angle) * r);
      sp.scale.setScalar(rad);
      installGroup.add(sp);
      this.artObjects.push({
        mesh: sp,
        rx: 0.15,
        ry: 0.22 * (i % 2 ? 1 : -1),
        baseY: y,
        phase: i * 0.75,
      });
    }

    // E. 360° Real 3D Chrome Tribals from user's 1.blend (/models/tribals.glb)
    // Symmetrical hero portal arch in front view + full 360° surrounding tribal sanctuary!
    const tribalLoader = new GLTFLoader();
    tribalLoader.load('/models/tribals.glb', (gltf) => {
      const byName = {};
      gltf.scene.traverse((o) => {
        if (o.isMesh && o.geometry) {
          const g = o.geometry.clone();
          g.rotateX(Math.PI / 2);
          g.computeVertexNormals();
          byName[o.name] = g;
        }
      });

      const placeArchPair = (name, x, y, z, scale, spinZ, tiltY, mat = chromeMat) => {
        const geo = byName[name];
        if (!geo) return;
        for (const side of [-1, 1]) {
          const holder = new THREE.Group();
          holder.position.set(x * side, y, z);
          holder.rotation.y = -side * tiltY;
          const m = new THREE.Mesh(geo, mat);
          m.rotation.z = side * spinZ;
          m.scale.set(side === 1 ? -scale : scale, scale, scale * 1.25);
          holder.add(m);
          installGroup.add(holder);
        }
      };

      // Hero bg-y2k style chrome tribal portal arch framing Yuzu cleanly
      placeArchPair('tribal_00', 1.68, 1.98, -1.85, 1.65, -0.32, 0.24, chromeMat);
      placeArchPair('tribal_04', 1.95, 1.24, -1.72, 1.72, 0.14, 0.30, chromeMat);
      placeArchPair('tribal_09', 1.80, 0.48, -1.65, 1.55, 0.42, 0.26, darkChromeMat);
      placeArchPair('tribal_03', 2.52, 1.56, -1.95, 1.38, -0.55, 0.36, chromeMat);

      // Full 360° surrounding tribal ring (sides, behind camera, upper dome)
      const allNames = Object.keys(byName);
      if (allNames.length) {
        const ringAngles = [
          -1.05, 1.05, -1.55, 1.55, -2.05, 2.05, -2.55, 2.55, Math.PI,
          -1.32, 1.32, -2.30, 2.30, 2.90, -2.90,
        ];
        ringAngles.forEach((ang, idx) => {
          const nm = allNames[idx % allNames.length];
          const geo = byName[nm];
          if (!geo) return;
          const r = 3.25 + (idx % 3) * 0.55;
          const y = idx >= 9 ? 2.25 + (idx % 2) * 0.45 : 0.95 + (idx % 3) * 0.42;
          const sc = 1.45 + (idx % 3) * 0.28;
          const holder = new THREE.Group();
          holder.position.set(Math.sin(ang) * r, y, -Math.cos(ang) * r);
          holder.lookAt(0, y, 0);
          const m = new THREE.Mesh(geo, idx % 3 === 0 ? darkChromeMat : chromeMat);
          m.rotation.z = (idx % 2 ? 0.28 : -0.28);
          m.scale.set(sc, sc, sc * 1.2);
          holder.add(m);
          installGroup.add(holder);
        });
      }
    });

    // Real 3D Pulsing Heartbeat Aura Ring on the podium floor (pulses on every lub-dub!)
    this.heartAura = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.56, 72),
      new THREE.MeshBasicMaterial({ color: 0xff8bcb, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
    );
    this.heartAura.rotation.x = -Math.PI / 2;
    this.heartAura.position.y = 0.004;
    this.scene.add(this.heartAura);

    // 2. Grabbable & Throwable Glossy Pink/Cyan Glass Spheres nestled along the 3D installation!
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 4), pinkGlassMat);
    blob.position.set(1.24, 0.78, -0.75);
    this.scene.add(blob);
    this.throwableOrbs.push({ mesh: blob, home: blob.position.clone(), vel: new THREE.Vector3(), state: 'idle', timer: 0, hitCooldown: 0, rx: 0.22, ry: -0.20, phase: 2.1 });

    const orbLeft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), pinkGlassMat);
    orbLeft.position.set(-1.32, 1.28, -0.82);
    this.scene.add(orbLeft);
    this.throwableOrbs.push({ mesh: orbLeft, home: orbLeft.position.clone(), vel: new THREE.Vector3(), state: 'idle', timer: 0, hitCooldown: 0, rx: 0.12, ry: 0.18, phase: 1.1 });

    const orbRight = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), cyanGlassMat);
    orbRight.position.set(1.26, 1.52, -0.85);
    this.scene.add(orbRight);
    this.throwableOrbs.push({ mesh: orbRight, home: orbRight.position.clone(), vel: new THREE.Vector3(), state: 'idle', timer: 0, hitCooldown: 0, rx: -0.14, ry: 0.20, phase: 3.2 });

    // Clean podium glow
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, opacity: 0.42, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.001;
    this.scene.add(glow);

    const ringMat = (color, opacity) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
    this.ring1 = new THREE.Mesh(new THREE.RingGeometry(0.64, 0.646, 96), ringMat(0xd9d9e8, 0.28));
    this.ring1.rotation.x = -Math.PI / 2;
    this.ring1.position.y = 0.002;
    this.scene.add(this.ring1);

    this.ring2 = new THREE.Mesh(new THREE.RingGeometry(0.86, 0.864, 96, 1, 0, Math.PI * 1.4), ringMat(0xff8bcb, 0.32));
    this.ring2.rotation.x = -Math.PI / 2;
    this.ring2.position.y = 0.002;
    this.scene.add(this.ring2);

    const count = 48;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    this.sparkSeeds = [];
    const palette = [new THREE.Color('#FF8BCB'), new THREE.Color('#A66BFF'), new THREE.Color('#72E7FF'), new THREE.Color('#D9D9E8'), new THREE.Color('#B8FF65')];
    for (let i = 0; i < count; i++) {
      this.sparkSeeds.push({
        r: 0.52 + Math.random() * 0.9,
        a: Math.random() * Math.PI * 2,
        y: Math.random() * 1.95,
        s: 0.16 + Math.random() * 0.35,
      });
      const c = palette[i % palette.length];
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.sparks = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.048,
        map: sparkTexture(false),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.scene.add(this.sparks);
  }

  _initHearts() {
    const count = 26;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    this.hearts = [];
    const palette = [new THREE.Color('#ff5ea8'), new THREE.Color('#14F195'), new THREE.Color('#c084fc')];
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] = -10;
      const c = palette[i % palette.length];
      col.set([c.r, c.g, c.b], i * 3);
      this.hearts.push({ p: new THREE.Vector3(0, -10, 0), v: new THREE.Vector3(), life: 0 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.heartPoints = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.095,
        map: sparkTexture(true),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
      })
    );
    this.scene.add(this.heartPoints);
  }

  _burstHearts(origin = new THREE.Vector3(0, 1.4, 0.1)) {
    for (const h of this.hearts) {
      h.p.copy(origin);
      const a = Math.random() * Math.PI * 2;
      const sp = 0.35 + Math.random() * 0.55;
      h.v.set(Math.cos(a) * sp, 0.65 + Math.random() * 0.85, Math.sin(a) * sp);
      h.life = 0.95 + Math.random() * 0.45;
    }
  }

  _initEvents() {
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hitBox = new THREE.Box3(new THREE.Vector3(-0.34, 0, -0.3), new THREE.Vector3(0.34, 1.68, 0.3));
    const hit = new THREE.Vector3();

    const toNdc = (e) => ({
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1,
    });

    window.addEventListener('pointermove', (e) => {
      const p = toNdc(e);
      this.mouse.x = clamp(p.x, -1.3, 1.3);
      this.mouse.y = clamp(p.y, -1.2, 1.2);
      this.lastMove = performance.now();

      // Dragging a grabbed 3D glass orb to aim & throw at Yuzu!
      if (this.dragOrb) {
        ndc.set(p.x, p.y);
        ray.setFromCamera(ndc, this.camera);
        if (ray.ray.intersectPlane(this.dragPlane, hit)) {
          this.dragVel.subVectors(hit, this.dragPrev).multiplyScalar(28);
          if (this.dragVel.length() > 14) this.dragVel.setLength(14);
          this.dragOrb.mesh.position.lerp(hit, 0.78);
          this.dragPrev.copy(hit);
        }
        this.renderer.domElement.style.cursor = 'grabbing';
        return;
      }

      const dx = Math.abs(e.clientX - this.lastMouseX);
      this.lastMouseX = e.clientX;
      this.waveEnergy = Math.min(2, this.waveEnergy + dx * 0.0028);
      if (this.waveEnergy > 1.55 && performance.now() - this.lastWave > 4000 && this.vrm) {
        this.lastWave = performance.now();
        this.waveEnergy = 0;
        this.react('wave');
      }

      let hoverOrb = false;
      if (this.throwableOrbs.length) {
        ndc.set(p.x, p.y);
        ray.setFromCamera(ndc, this.camera);
        hoverOrb = ray.intersectObjects(this.throwableOrbs.map((o) => o.mesh), false).length > 0;
      }

      if (this.vrm) {
        ndc.set(p.x, p.y);
        ray.setFromCamera(ndc, this.camera);
        this.isHover = !hoverOrb && ray.ray.intersectsBox(hitBox);

        // Rub-to-Pet Head Mechanic: hold & rub cursor over her head to build Affection & Bond Level!
        if (this.isPointerDown && ray.ray.intersectBox(hitBox, hit) && hit.y > 1.24) {
          this.rubEnergy += dx * 0.012;
          if (this.rubEnergy > 0.85) {
            this.rubEnergy = 0;
            this.react('headpat', hit);
          }
        }
      }
      this.renderer.domElement.style.cursor = hoverOrb ? 'grab' : this.isHover ? 'pointer' : 'grab';
    });

    let down = null;
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', (e) => {
      const p = toNdc(e);
      ndc.set(p.x, p.y);
      ray.setFromCamera(ndc, this.camera);
      // Check if user grabbed one of the floating 3D glass orbs!
      const orbHits = ray.intersectObjects(this.throwableOrbs.map((o) => o.mesh), false);
      if (orbHits.length > 0) {
        const hitMesh = orbHits[0].object;
        const orb = this.throwableOrbs.find((o) => o.mesh === hitMesh);
        if (orb) {
          this.dragOrb = orb;
          orb.state = 'grabbed';
          orb.vel.set(0, 0, 0);
          orb.timer = 0;
          this.controls.enabled = false;
          const camDir = new THREE.Vector3();
          this.camera.getWorldDirection(camDir);
          this.dragPlane.setFromNormalAndCoplanarPoint(camDir, orb.mesh.position);
          this.dragPrev.copy(orb.mesh.position);
          this.dragVel.set(0, 0, 0);
          this.renderer.domElement.style.cursor = 'grabbing';
          return;
        }
      }
      down = { x: e.clientX, y: e.clientY };
      this.isPointerDown = true;
    });
    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
      if (this.dragOrb) {
        const orb = this.dragOrb;
        this.dragOrb = null;
        this.controls.enabled = true;
        orb.state = 'thrown';
        orb.timer = 0;
        orb.hitCooldown = 0;
        // Aim-assisted throw toward Yuzu so flicking or clicking an orb feels super responsive!
        const toYuzu = new THREE.Vector3(0, 1.24, 0.02).sub(orb.mesh.position);
        const dist = toYuzu.length();
        const aimVel = toYuzu.normalize().multiplyScalar(Math.max(4.8, dist * 3.8));
        aimVel.y += 1.25; // slight upward arc to counter gravity
        if (this.dragVel.length() < 1.6) {
          orb.vel.copy(aimVel);
        } else {
          orb.vel.copy(this.dragVel).lerp(aimVel, 0.55);
        }
      }
    });
    dom.addEventListener('pointerup', (e) => {
      if (!down || !this.vrm) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const p = toNdc(e);
      ndc.set(p.x, p.y);
      ray.setFromCamera(ndc, this.camera);
      if (!ray.ray.intersectsBox(hitBox, hit)) return;
      if (hit.y > 1.28) {
        this.react('headpat', hit);
      } else {
        this.surprise = 1;
        const cycle = ['kiss', 'peace', 'dance', 'shy', 'pout', 'spin'];
        this.react(cycle[this.bodyClicks++ % cycle.length], hit);
      }
    });
  }

  react(type, origin = null, customText = null) {
    const def = REACTIONS[type] || REACTIONS.happy;
    this.reaction = { type: REACTIONS[type] ? type : 'happy', time: 0, dur: def.dur };
    this.excitement = Math.min(1, this.excitement + (type === 'headpat' || type === 'kiss' ? 0.9 : 0.65));
    this.talkTimer = 1.9;
    this.idleCommentTimer = 15;

    // Affection & Bond Level progression mechanic!
    const gain = type === 'headpat' ? 14 : type === 'kiss' ? 12 : type === 'bonk' ? -12 : type === 'pout' ? -6 : 6;
    this.affection = clamp(this.affection + gain, 0, 100);
    const nextLvl = Math.min(5, 1 + Math.floor(this.affection / 22));
    let leveledUp = false;
    if (nextLvl > this.bondLevel) {
      this.bondLevel = nextLvl;
      leveledUp = true;
    }

    if (type === 'headpat') this.patCount++;
    if (type !== 'pout' && type !== 'bonk') this._burstHearts(origin || new THREE.Vector3(0, 1.38, 0.14));
    const displayText = leveledUp ? `BOND LVL ${this.bondLevel} UNLOCKED ♡` : (customText || def.text);
    this.opts.onReaction?.(type, displayText, this.patCount, this.affection, this.bondLevel);
  }

  setSpeaking(on) {
    this.isSpeaking = !!on;
  }

  setOffended(on) {
    this.offended = !!on;
  }

  setHeartbeatAudio(on) {
    this.heartbeatAudioOn = !!on;
    if (on && !this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.audioCtx = new AC();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  _playLubDub() {
    if (!this.heartbeatAudioOn || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const thump = (startOffset, freq, gainPeak) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      osc.frequency.exponentialRampToValueAtTime(28, now + startOffset + 0.14);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.linearRampToValueAtTime(gainPeak, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + 0.18);
    };
    thump(0, 68, 0.22); // LUB
    thump(0.19, 54, 0.14); // DUB
  }

  setParam(key, val) {
    if (key in this.params) this.params[key] = clamp(val, 0, 1);
  }

  setTurntable(on) {
    this.turntable = on;
  }

  spawnFloatingLogo(canvasSource, opts = {}) {
    if (this.floatingLogo) {
      this.scene.remove(this.floatingLogo);
      this.floatingLogo.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose();
          o.material?.map?.dispose?.();
          o.material?.dispose?.();
        }
      });
      this.floatingLogo = null;
    }
    const tex = new THREE.CanvasTexture(canvasSource);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    const grp = new THREE.Group();
    // Positioned cleanly beside Yuzu at chest/shoulder height — 100% visible inside viewport, never cut off!
    grp.position.set(-0.68, 1.34, -0.12);

    const matKey = opts.material || 'chrome';
    const isGlass = matKey === 'glass' || matKey === 'pink';
    const tintMap = { chrome: 0xd9d9e8, glass: 0x72e7ff, pink: 0xff8bcb, acid: 0xb8ff65, obsidian: 0x261f38 };
    const rimTint = tintMap[matKey] || 0xd9d9e8;

    // 1. Real 3D Thick Beveled Crystal-Glass / Liquid-Chrome Medallion Body
    const shape = new THREE.Shape();
    const isHex = opts.frame === 'sigil';
    if (isHex) {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const x = Math.cos(a) * 0.27;
        const y = Math.sin(a) * 0.27;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
    } else {
      shape.absarc(0, 0, 0.26, 0, Math.PI * 2, false);
    }
    const bodyGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.055,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 5,
      curveSegments: 48,
    });
    bodyGeo.center();

    const bodyMat = isGlass
      ? new THREE.MeshPhysicalMaterial({
          color: rimTint,
          metalness: 0.12,
          roughness: 0.06,
          transmission: 0.78,
          thickness: 0.45,
          ior: 1.5,
          iridescence: 1.0,
          clearcoat: 1.0,
        })
      : new THREE.MeshPhysicalMaterial({
          color: rimTint,
          metalness: 0.94,
          roughness: 0.10,
          iridescence: 1.0,
          iridescenceIOR: 1.4,
          iridescenceThicknessRange: [180, 560],
          clearcoat: 1.0,
        });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    grp.add(bodyMesh);

    // 2. Real 3D Sculpted Liquid-Chrome Outer Bezel Ring
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.285, 0.014, 18, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.96,
        roughness: 0.07,
        iridescence: 0.9,
        clearcoat: 1.0,
      })
    );
    grp.add(bezel);

    // 3. Front & Back Embossed Logo Plates seated flush on both faces of the 3D medallion
    const faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), faceMat);
    frontFace.position.z = 0.054;
    const backFace = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), faceMat);
    backFace.position.z = -0.054;
    backFace.rotation.y = Math.PI;
    grp.add(frontFace, backFace);

    this.scene.add(grp);
    this.floatingLogo = grp;
  }

  setOpenOutfit(on) {
    this.openOutfit = !!on;
    if (this.vrm) {
      this._applyOutfitStyle(this.vrm, this.openOutfit);
      if (this.viewMode !== 'normal') this.setViewMode(this.viewMode);
    }
  }

  getRigStats() {
    return { ...this.rigStats, viewMode: this.viewMode };
  }

  setViewMode(mode = 'normal') {
    this.viewMode = mode;
    if (!this.vrm) return;

    // Remove previous skeleton helper & joint markers
    if (this.skeletonHelper) {
      this.scene.remove(this.skeletonHelper);
      this.skeletonHelper.dispose?.();
      this.skeletonHelper = null;
    }
    for (const jm of this.jointMarkers) {
      jm.bone.remove(jm.mesh);
      jm.mesh.geometry.dispose();
      jm.mesh.material.dispose();
    }
    this.jointMarkers = [];

    // Restore or transform mesh materials for X-Ray Skeleton / Wireframe Breakdown
    this.vrm.scene.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) {
        if (!mat) continue;
        if (mat.userData._origOpacity === undefined) {
          mat.userData._origOpacity = mat.opacity;
          mat.userData._origTransparent = mat.transparent;
          mat.userData._origDepthWrite = mat.depthWrite;
          mat.userData._origWireframe = !!mat.wireframe;
        }
        if (mode === 'normal') {
          mat.opacity = mat.userData._origOpacity;
          mat.transparent = mat.userData._origTransparent;
          mat.depthWrite = mat.userData._origDepthWrite;
          mat.wireframe = mat.userData._origWireframe;
        } else if (mode === 'skeleton') {
          mat.transparent = true;
          mat.opacity = 0.22;
          mat.depthWrite = false;
          mat.wireframe = false;
        } else if (mode === 'wireframe') {
          mat.transparent = true;
          mat.opacity = 0.85;
          mat.depthWrite = true;
          mat.wireframe = true;
        }
        mat.needsUpdate = true;
      }
    });

    if (mode === 'skeleton') {
      const helper = new THREE.SkeletonHelper(this.vrm.scene);
      helper.material.color.set('#b8ff65');
      helper.material.depthTest = false;
      helper.material.transparent = true;
      helper.material.opacity = 0.92;
      helper.renderOrder = 999;
      this.scene.add(helper);
      this.skeletonHelper = helper;

      // Glowing cyber-cyan / pink joint nodes on key humanoid bones
      const keyBones = [
        'head', 'neck', 'chest', 'spine', 'hips',
        'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
        'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
        'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
        'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
      ];
      const h = this.vrm.humanoid;
      for (const bn of keyBones) {
        const bone = h.getRawBoneNode?.(bn) || h.getNormalizedBoneNode?.(bn);
        if (!bone) continue;
        const isCore = /head|chest|hips|Foot/i.test(bn);
        const geo = new THREE.SphereGeometry(isCore ? 0.022 : 0.015, 12, 12);
        const mat = new THREE.MeshBasicMaterial({
          color: isCore ? 0xff8bcb : 0x72e7ff,
          depthTest: false,
          transparent: true,
          opacity: 0.95,
        });
        const m = new THREE.Mesh(geo, mat);
        m.renderOrder = 1000;
        bone.add(m);
        this.jointMarkers.push({ bone, mesh: m });
      }
    }
  }

  _applyOutfitStyle(vrm, open) {
    const makeTex = (canvas, orig) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = orig.flipY;
      tex.colorSpace = orig.colorSpace;
      tex.wrapS = orig.wrapS;
      tex.wrapT = orig.wrapT;
      tex.needsUpdate = true;
      return tex;
    };

    vrm.scene.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) {
        if (!mat || !mat.map || !mat.map.image) continue;
        const name = mat.name || '';
        const isSkin = /Body_00_SKIN/i.test(name);
        const isTops = /Tops_01_CLOTH/i.test(name);
        if (!isSkin && !isTops) continue;

        if (!mat.userData._origMap) {
          mat.userData._origMap = mat.map;
          mat.userData._origShade = mat.shadeMultiplyTexture || null;
          mat.userData._origNormal = mat.normalMap || null;
        }

        // Hide the bulky floral A-line dress completely in Open mode so the sleek fitted Y2K outfit shines
        if (isTops) {
          mat.visible = !open;
          mat.needsUpdate = true;
          continue;
        }

        if (!open) {
          mat.map = mat.userData._origMap;
          if ('shadeMultiplyTexture' in mat) mat.shadeMultiplyTexture = mat.userData._origShade;
          if ('normalMap' in mat) mat.normalMap = mat.userData._origNormal;
          mat.needsUpdate = true;
          continue;
        }

        if (!mat.userData._openMap) {
          const orig = mat.userData._origMap;
          const img = orig.image;
          const w = img.naturalWidth || img.width || 1024;
          const h = img.naturalHeight || img.height || 1024;
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          // Exact anime skin palette sampled from her forearms & collarbone
          const skinBase = '#f8e7e3';
          const skinEdge = '#f2d0cc';
          const skinBlush = 'rgba(236, 179, 179, 0.28)';
          const skinShadow = 'rgba(210, 152, 152, 0.34)';

          // 1. Fill transparent torso & upper-arm cutouts behind existing neck/forearm shading
          ctx.save();
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = skinBase;
          ctx.fillRect(0, 0, w, Math.round(h * 0.46));
          ctx.restore();

          // Seamless cylindrical shading on upper arms (eliminates arm seam at y=0.23)
          for (const x0 of [0, w * 0.76]) {
            const aw = w * 0.24;
            const ag = ctx.createLinearGradient(x0, 0, x0 + aw, 0);
            ag.addColorStop(0, skinEdge);
            ag.addColorStop(0.24, skinBase);
            ag.addColorStop(0.76, skinBase);
            ag.addColorStop(1, skinEdge);
            ctx.fillStyle = ag;
            ctx.fillRect(x0, 0, aw, h * 0.235);
            // Feather blend into existing forearm
            const blend = ctx.createLinearGradient(0, h * 0.22, 0, h * 0.255);
            blend.addColorStop(0, 'rgba(248,231,227,0.75)');
            blend.addColorStop(1, 'rgba(248,231,227,0)');
            ctx.fillStyle = blend;
            ctx.fillRect(x0, h * 0.22, aw, h * 0.035);
          }

          // Soft collarbone & upper chest blush shading
          const chestGrad = ctx.createRadialGradient(w * 0.5, h * 0.16, w * 0.01, w * 0.5, h * 0.16, w * 0.15);
          chestGrad.addColorStop(0, skinBlush);
          chestGrad.addColorStop(1, 'rgba(248,231,227,0)');
          ctx.fillStyle = chestGrad;
          ctx.fillRect(w * 0.30, h * 0.09, w * 0.40, h * 0.14);

          // 2. Bare midriff / waist (y: 0.305..0.448) with soft side contours & delicate navel
          ctx.fillStyle = skinBase;
          ctx.fillRect(w * 0.24, h * 0.305, w * 0.52, h * 0.145);
          const waistG = ctx.createLinearGradient(w * 0.24, 0, w * 0.76, 0);
          waistG.addColorStop(0, skinEdge);
          waistG.addColorStop(0.18, 'rgba(248,231,227,0)');
          waistG.addColorStop(0.82, 'rgba(248,231,227,0)');
          waistG.addColorStop(1, skinEdge);
          ctx.fillStyle = waistG;
          ctx.fillRect(w * 0.24, h * 0.305, w * 0.52, h * 0.145);
          // Subtle under-bust shadow on upper midriff
          const ubShadow = ctx.createLinearGradient(0, h * 0.312, 0, h * 0.342);
          ubShadow.addColorStop(0, skinShadow);
          ubShadow.addColorStop(1, 'rgba(248,231,227,0)');
          ctx.fillStyle = ubShadow;
          ctx.fillRect(w * 0.24, h * 0.312, w * 0.52, h * 0.030);
          // Delicate anime navel
          ctx.fillStyle = skinShadow;
          ctx.beginPath();
          ctx.ellipse(w * 0.50, h * 0.402, w * 0.004, h * 0.008, 0, 0, Math.PI * 2);
          ctx.fill();

          // 3. Glamorous Cyber Y2K Plunge-Sweetheart Halter Crop Top with Front Keyhole Cutout (y: 0.195..0.305)
          const topGrad = ctx.createLinearGradient(0, h * 0.195, 0, h * 0.305);
          topGrad.addColorStop(0, '#22182e');
          topGrad.addColorStop(0.45, '#100c16');
          topGrad.addColorStop(1, '#1c1428');
          ctx.fillStyle = topGrad;
          ctx.beginPath();
          ctx.moveTo(w * 0.24, h * 0.240);
          ctx.quadraticCurveTo(w * 0.34, h * 0.246, w * 0.40, h * 0.212);
          ctx.quadraticCurveTo(w * 0.45, h * 0.188, w * 0.50, h * 0.236);
          ctx.quadraticCurveTo(w * 0.55, h * 0.188, w * 0.60, h * 0.212);
          ctx.quadraticCurveTo(w * 0.66, h * 0.246, w * 0.76, h * 0.240);
          ctx.lineTo(w * 0.76, h * 0.304);
          ctx.lineTo(w * 0.24, h * 0.304);
          ctx.closePath();
          ctx.fill();

          // Stylish front diamond keyhole cutout revealing soft skin & metallic pink/chrome ring
          ctx.fillStyle = skinBase;
          ctx.beginPath();
          ctx.moveTo(w * 0.50, h * 0.234);
          ctx.lineTo(w * 0.520, h * 0.264);
          ctx.lineTo(w * 0.50, h * 0.292);
          ctx.lineTo(w * 0.480, h * 0.264);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ff8bcb';
          ctx.lineWidth = Math.max(2, w * 0.0028);
          ctx.stroke();

          // Glossy pink/chrome trim along plunge sweetheart neckline & cropped underbust hem
          ctx.strokeStyle = '#ff8bcb';
          ctx.lineWidth = Math.max(2, w * 0.0032);
          ctx.beginPath();
          ctx.moveTo(w * 0.24, h * 0.241);
          ctx.quadraticCurveTo(w * 0.34, h * 0.247, w * 0.40, h * 0.213);
          ctx.quadraticCurveTo(w * 0.45, h * 0.189, w * 0.50, h * 0.237);
          ctx.quadraticCurveTo(w * 0.55, h * 0.189, w * 0.60, h * 0.213);
          ctx.quadraticCurveTo(w * 0.66, h * 0.247, w * 0.76, h * 0.241);
          ctx.stroke();

          ctx.fillStyle = '#ff8bcb';
          ctx.fillRect(w * 0.24, h * 0.300, w * 0.52, h * 0.004);

          // Sleek Cyber Y2K Choker with chrome O-ring + thin halter straps
          ctx.fillStyle = '#100c16';
          ctx.fillRect(w * 0.41, h * 0.056, w * 0.18, h * 0.018);
          ctx.strokeStyle = '#d9d9e8';
          ctx.lineWidth = Math.max(2, w * 0.003);
          ctx.beginPath();
          ctx.arc(w * 0.50, h * 0.072, w * 0.011, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#14101c';
          ctx.lineWidth = Math.max(3, w * 0.006);
          ctx.beginPath();
          ctx.moveTo(w * 0.46, h * 0.198);
          ctx.lineTo(w * 0.478, h * 0.072);
          ctx.moveTo(w * 0.54, h * 0.198);
          ctx.lineTo(w * 0.522, h * 0.072);
          ctx.stroke();

          // 4. Fitted Low-Rise Black Cyber Y2K Micro-Shorts (hips y: 0.455..0.60)
          const shortsGrad = ctx.createLinearGradient(0, h * 0.455, 0, h * 0.60);
          shortsGrad.addColorStop(0, '#1a1426');
          shortsGrad.addColorStop(0.5, '#0f0c16');
          shortsGrad.addColorStop(1, '#161120');
          ctx.fillStyle = shortsGrad;
          ctx.fillRect(w * 0.24, h * 0.455, w * 0.52, h * 0.155);
          // Sleek Y2K low-rise belt with chrome clasp & neon-pink accent
          ctx.fillStyle = '#241b35';
          ctx.fillRect(w * 0.24, h * 0.455, w * 0.52, h * 0.020);
          ctx.fillStyle = '#ff8bcb';
          ctx.fillRect(w * 0.24, h * 0.456, w * 0.52, h * 0.0035);
          ctx.fillStyle = '#d9d9e8';
          ctx.fillRect(w * 0.476, h * 0.458, w * 0.048, h * 0.014);
          ctx.fillStyle = '#120e18';
          ctx.fillRect(w * 0.485, h * 0.460, w * 0.030, h * 0.009);

          // 5. Legs: High-Cut Micro-Shorts + Bare Thighs + Garter Straps + Sheer Glossy Thigh-High Stockings
          for (const x0 of [0, w * 0.76]) {
            const tw = w * 0.24;
            // High-cut micro-shorts cuff (y: 0.485..0.522) — reveals more leg!
            ctx.fillStyle = '#110d18';
            ctx.fillRect(x0, h * 0.485, tw, h * 0.037);
            ctx.fillStyle = '#ff8bcb';
            ctx.fillRect(x0, h * 0.519, tw, h * 0.003);

            // Bare thighs (y: 0.522..0.678) with smooth anime cylindrical shading
            const tg = ctx.createLinearGradient(x0, 0, x0 + tw, 0);
            tg.addColorStop(0, skinEdge);
            tg.addColorStop(0.26, skinBase);
            tg.addColorStop(0.74, skinBase);
            tg.addColorStop(1, skinEdge);
            ctx.fillStyle = tg;
            ctx.fillRect(x0, h * 0.522, tw, h * 0.156);

            // Soft shadow right under shorts hem
            const shHem = ctx.createLinearGradient(0, h * 0.522, 0, h * 0.540);
            shHem.addColorStop(0, skinShadow);
            shHem.addColorStop(1, 'rgba(248,231,227,0)');
            ctx.fillStyle = shHem;
            ctx.fillRect(x0, h * 0.522, tw, h * 0.018);

            // Sleek garter strap + chrome clip connecting shorts to thigh-high stocking
            const gx = x0 + tw * 0.50;
            ctx.fillStyle = '#120e18';
            ctx.fillRect(gx - tw * 0.045, h * 0.519, tw * 0.09, h * 0.158);
            ctx.fillStyle = '#ff8bcb';
            ctx.fillRect(gx - tw * 0.014, h * 0.519, tw * 0.028, h * 0.158);
            ctx.fillStyle = '#d9d9e8';
            ctx.fillRect(gx - tw * 0.055, h * 0.664, tw * 0.11, h * 0.012);

            // Sheer glossy black thigh-high stockings (y: 0.678..1.00) with silky highlight sheen
            const stg = ctx.createLinearGradient(x0, 0, x0 + tw, 0);
            stg.addColorStop(0, '#0c0912');
            stg.addColorStop(0.36, '#2a2036');
            stg.addColorStop(0.50, '#3a2c44');
            stg.addColorStop(0.64, '#2a2036');
            stg.addColorStop(1, '#0c0912');
            ctx.fillStyle = stg;
            ctx.fillRect(x0, h * 0.678, tw, h * 0.322);

            // Crisp stocking top garter band with double neon-pink trim
            ctx.fillStyle = '#100c16';
            ctx.fillRect(x0, h * 0.674, tw, h * 0.018);
            ctx.fillStyle = '#ff8bcb';
            ctx.fillRect(x0, h * 0.676, tw, h * 0.003);
            ctx.fillRect(x0, h * 0.688, tw, h * 0.0025);
          }

          mat.userData._openMap = makeTex(c, orig);
        }

        mat.map = mat.userData._openMap;
        if ('shadeMultiplyTexture' in mat && mat.userData._origShade) {
          mat.shadeMultiplyTexture = mat.userData._openMap;
        }
        if ('normalMap' in mat) mat.normalMap = null;
        mat.needsUpdate = true;
      }
    });
  }

  setScrollProgress(p01) {
    this.scrollProgress = clamp(p01, 0, 1);
    this.cameraOverride = null;
  }

  setCameraPreset(key) {
    const p = CAMERA_PRESETS[key];
    if (!p) return;
    this.cameraOverride = {
      pos: new THREE.Vector3(...p.pos),
      target: new THREE.Vector3(...p.target),
    };
  }

  load(url) {
    if (!url) return;
    if (this.skeletonHelper) {
      this.scene.remove(this.skeletonHelper);
      this.skeletonHelper.dispose?.();
      this.skeletonHelper = null;
    }
    this.jointMarkers = [];
    if (this.vrm) {
      this.pivot.remove(this.vrm.scene);
      VRMUtils.deepDispose(this.vrm.scene);
      this.vrm = null;
    }
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      url,
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (!vrm) {
          this.opts.onError?.(new Error('Not a VRM file'));
          return;
        }
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.rotateVRM0(vrm);
        vrm.scene.traverse((o) => {
          o.frustumCulled = false;
          // Enhance hourglass silhouette cleanly via VRoid's real weighted Bust1 bones
          if (o.isBone && /^J_Sec_[LR]_Bust1$/i.test(o.name)) {
            o.scale.set(1.44, 1.38, 1.56);
          }
        });

        vrm.scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const size = box.getSize(new THREE.Vector3());
        const s = 1.62 / Math.max(size.y, 0.001);
        vrm.scene.scale.setScalar(s);
        vrm.scene.position.set(0, -box.min.y * s, 0);

        if (vrm.lookAt) vrm.lookAt.target = this.lookTarget;

        this.pivot.rotation.set(0, 0, 0);
        this.pivot.position.set(0, 0, 0);
        this.pivot.add(vrm.scene);
        // Compute live 3D rig breakdown telemetry (bones, meshes, triangles, springbones)
        let bones = 0, meshes = 0, tris = 0;
        vrm.scene.traverse((o) => {
          if (o.isBone) bones++;
          if (o.isMesh && o.geometry) {
            meshes++;
            const g = o.geometry;
            tris += g.index ? g.index.count / 3 : (g.attributes.position?.count || 0) / 3;
          }
        });
        const springs = vrm.springBoneManager?.joints?.size || vrm.springBoneManager?.joints?.length || 0;
        this.rigStats = { bones, meshes, tris: Math.round(tris), springs };

        this.vrm = vrm;
        this.isVrm0 = vrm.meta?.metaVersion === '0';
        this._applyOutfitStyle(vrm, this.openOutfit);
        if (this.viewMode !== 'normal') this.setViewMode(this.viewMode);
        this._setupRig();
        this.opts.onLoaded?.();
        setTimeout(() => this.react('wave'), 650);
      },
      (xhr) => {
        if (xhr.total) this.opts.onProgress?.(Math.round((xhr.loaded / xhr.total) * 100));
      },
      (err) => this.opts.onError?.(err)
    );
  }

  _setupRig() {
    const h = this.vrm.humanoid;
    const names = [
      'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
      'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
      'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
      'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
      'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
    ];
    this.bones = {};
    for (const n of names) this.bones[n] = h.getNormalizedBoneNode(n);
    this.fingerBones = { left: [], right: [] };
    this.fingerGroups = { left: {}, right: {} };
    for (const side of ['left', 'right']) {
      for (const f of ['Index', 'Middle', 'Ring', 'Little']) {
        this.fingerGroups[side][f] = [];
        for (const seg of ['Proximal', 'Intermediate', 'Distal']) {
          const b = h.getNormalizedBoneNode(`${side}${f}${seg}`);
          if (b) {
            this.fingerBones[side].push(b);
            this.fingerGroups[side][f].push(b);
          }
        }
      }
    }

    this.hipsRest = this.bones.hips.position.clone();

    this.scene.updateMatrixWorld(true);
    this.legs = [];
    for (const side of ['left', 'right']) {
      const up = this.bones[`${side}UpperLeg`];
      const lo = this.bones[`${side}LowerLeg`];
      const ft = this.bones[`${side}Foot`];
      if (!up || !lo || !ft) continue;
      const pU = up.getWorldPosition(new THREE.Vector3());
      const pL = lo.getWorldPosition(new THREE.Vector3());
      const pF = ft.getWorldPosition(new THREE.Vector3());
      this.legs.push({
        up, lo, ft,
        L1: pU.distanceTo(pL),
        L2: pL.distanceTo(pF),
        anchor: this.pivot.worldToLocal(pF.clone()),
      });
    }
  }

  _solveLeg(leg, liftY = 0, stepZ = 0, stepX = 0) {
    const { up, lo, ft, L1, L2 } = leg;
    up.quaternion.identity();
    lo.quaternion.identity();
    ft.quaternion.identity();
    up.parent.updateWorldMatrix(true, false);
    up.updateWorldMatrix(false, false);

    const hip = up.getWorldPosition(_a);
    _b.copy(leg.anchor);
    _b.x += stepX;
    _b.y += liftY;
    _b.z += stepZ;
    const target = this.pivot.localToWorld(_b);
    let D = hip.distanceTo(target);
    D = clamp(D, Math.abs(L1 - L2) + 1e-4, (L1 + L2) * 0.9995);

    up.parent.getWorldQuaternion(_qa).invert();
    const dir = target.sub(hip).normalize().applyQuaternion(_qa);
    _qb.setFromUnitVectors(DOWN, dir);

    const alpha = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
    const knee = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));

    // VRM 0.0 normalized bones face -Z before rotateVRM0, so knee X sign flips relative to VRM 1.0!
    const kneeSign = this.isVrm0 ? -1 : 1;
    _qc.setFromAxisAngle(AXIS_X, -alpha * kneeSign);
    up.quaternion.copy(_qb).multiply(_qc);
    lo.quaternion.setFromAxisAngle(AXIS_X, knee * kneeSign);

    lo.updateWorldMatrix(true, false);
    lo.getWorldQuaternion(_qa).invert();
    this.vrm.scene.getWorldQuaternion(_qc);
    ft.quaternion.copy(_qa.multiply(_qc));
  }

  _setExpr(exp, name, val) {
    try {
      exp.setValue(name, val);
    } catch {}
  }

  _animate(dt) {
    const b = this.bones;
    const t = this.t;
    const { sway, breathe, headTilt } = this.params;

    let type = null;
    let env = 0;
    let p = 0;
    if (this.reaction) {
      this.reaction.time += dt;
      p = this.reaction.time / this.reaction.dur;
      if (p >= 1) this.reaction = null;
      else {
        type = this.reaction.type;
        env = envelope(p);
      }
    }
    const wave = type === 'wave' ? env : 0;
    const pat = type === 'headpat' ? env : 0;
    const kiss = type === 'kiss' ? env : 0;
    const peace = type === 'peace' ? env : 0;
    const dance = type === 'dance' ? env : 0;
    const spin = type === 'spin' ? env : 0;
    const happy = type === 'happy' ? env : 0;
    const shy = type === 'shy' ? env : 0;
    const bonk = type === 'bonk' ? env : 0;
    // Persistent sulky/offended posture blend when she's mad at you!
    this.offendedBlend += ((this.offended ? 1 : 0) - this.offendedBlend) * (1 - Math.exp(-dt * 4.5));
    const sulk = this.offendedBlend;
    const pout = Math.max(type === 'pout' ? env : 0, bonk * 0.92, sulk * 0.78);

    const danceBeat = dance * Math.sin(t * 6.8);
    const danceGroove = dance * Math.cos(t * 3.4);
    // Graceful figure-8 contrapposto weight shift with harmonic secondary motion
    const ws =
      (Math.sin(t * 0.82) * 0.78 + Math.sin(t * 1.64 + 0.7) * 0.16 + Math.sin(t * 0.31 + 1.2) * 0.18) * sway +
      danceBeat * 0.62;
    const wsSpine = (Math.sin(t * 0.82 - 0.38) * 0.78 + Math.sin(t * 1.64 + 0.32) * 0.16) * sway + danceBeat * 0.52;
    const wsChest = (Math.sin(t * 0.82 - 0.72) * 0.78 + Math.sin(t * 1.64 - 0.04) * 0.16) * sway + danceBeat * 0.44;
    const breath = (Math.sin(t * 1.48) + 0.22 * Math.sin(t * 2.96 - 0.65)) * breathe;
    this.turn += (this.look.x * 0.32 - this.turn) * (1 - Math.exp(-dt * 2.8));
    const turn = this.turn;
    const bounce =
      happy * Math.pow(Math.max(0, Math.sin(p * Math.PI * 5)), 2) * 0.058 +
      dance * Math.pow(Math.abs(Math.sin(t * 6.8)), 1.4) * 0.038;

    // Hips + fluid contrapposto tilt + grounded leg IK
    const drop = 0.018 + breath * 0.0025 + Math.abs(ws) * 0.009 + bounce + pat * 0.015 + shy * 0.016 + pout * 0.018;
    const hipShiftX = ws * 0.036 + peace * 0.026 - shy * 0.012;
    const hipShiftZ = Math.sin(t * 1.64) * 0.008 * sway + kiss * 0.024 - pout * 0.015;
    b.hips.position.set(this.hipsRest.x + hipShiftX, this.hipsRest.y - drop, this.hipsRest.z + hipShiftZ);
    b.hips.rotation.set(
      0.028 + shy * 0.055 + kiss * 0.075 + Math.sin(t * 1.64) * 0.014 * sway,
      ws * 0.13 + turn * 0.42 + peace * 0.22 - pout * 0.20 + danceGroove * 0.16,
      -ws * 0.085 + peace * 0.11 - kiss * 0.045
    );

    // Delayed fluid spine -> chest -> upperChest follow-through
    b.spine.rotation.set(
      0.022 + breath * 0.016 + happy * 0.035 + kiss * 0.13 - pout * 0.055,
      -wsSpine * 0.065 + turn * 0.26 + danceBeat * 0.16,
      wsSpine * 0.078 - peace * 0.085
    );
    b.chest?.rotation.set(
      -breath * 0.026 - shy * 0.065 + pat * 0.055 + kiss * 0.095 + dance * 0.04,
      turn * 0.22 - wave * 0.09 + danceBeat * 0.15 - danceGroove * 0.08,
      wsChest * 0.042 - peace * 0.03
    );
    b.upperChest?.rotation.set(-breath * 0.018, turn * 0.12 + danceGroove * 0.06, wsChest * 0.018);

    // Auto-match VRM 0.0 vs VRM 1.0 normalized bone axis signs!
    const vSign = this.isVrm0 ? -1 : 1;

    const shrug = pat * 0.15 + shy * 0.14 + pout * 0.11 + Math.max(0, breath) * 0.022;
    const shWave = Math.sin(t * 0.82 - 0.5) * 0.022 * sway;
    b.leftShoulder?.rotation.set(0, 0, (shrug + shWave + danceBeat * 0.08 + peace * 0.06) * vSign);
    b.rightShoulder?.rotation.set(0, 0, (-shrug - shWave - wave * 0.13 - kiss * 0.11 - danceBeat * 0.08) * vSign);

    // Head & eyes follow cursor + graceful head-bob & expressive pose tilts
    const lx = this.look.x;
    const ly = this.look.y;
    const tilt =
      (Math.sin(t * 0.62 - 0.9) * 0.085 + Math.sin(t * 1.24) * 0.02 - lx * 0.10) * headTilt +
      pat * 0.30 +
      shy * 0.24 +
      wave * 0.16 +
      peace * 0.26 -
      kiss * 0.18 -
      pout * 0.20 +
      danceBeat * 0.16;
    const yaw = lx * 0.62 - turn + pout * 0.30 + danceGroove * 0.12;
    const pitch = (-ly * 0.32 + pat * 0.32 + shy * 0.18 - happy * 0.07 - kiss * 0.09 + dance * Math.sin(t * 13.6) * 0.04) * vSign;
    b.neck?.rotation.set(pitch * 0.42, yaw * 0.42, tilt * 0.42 * vSign);
    b.head.rotation.set(pitch * 0.58, yaw * 0.58, tilt * 0.58 * vSign);
    this.lookTarget.position.set(lx * 1.15, 1.42 + ly * 0.6, 1.6);

    // Arms (graceful natural hang + expressive multi-phase choreography!)
    const down = 1.22;
    const swayL = (Math.sin(t * 0.82 + 0.55) * 0.042 + Math.sin(t * 1.64) * 0.012) * sway;
    const swayR = (Math.sin(t * 0.82 + 2.15) * 0.042 + Math.sin(t * 1.64 + 1.1) * 0.012) * sway;
    const cheer = happy * Math.sin(t * 10.5) * 0.14;
    const danceArmL = dance * Math.sin(t * 6.8) * 0.38;
    const danceArmR = dance * -Math.sin(t * 6.8) * 0.38;
    const danceWrist = dance * Math.cos(t * 6.8) * 0.28;

    // Left arm (rests gracefully on hip during peace/kiss, sways fluidly at rest & dances!)
    b.leftUpperArm.rotation.order = 'XYZ';
    b.leftUpperArm.rotation.set(
      (0.06 - shy * 0.36 - pout * 0.24 + cheer + danceArmL * 0.45 + peace * 0.12) * vSign,
      0.08 + shy * 0.28 + peace * 0.18,
      -(down + swayL - happy * 0.35 - spin * 0.52 - dance * 0.38 - peace * 0.26 - kiss * 0.10) * vSign
    );
    b.leftLowerArm.rotation.order = 'XYZ';
    b.leftLowerArm.rotation.set(
      (peace * 0.16 + dance * 0.12) * vSign,
      -(0.20 + shy * 0.82 + pout * 0.68 + happy * 0.48 + dance * 0.62 + peace * 0.72 + kiss * 0.28),
      0
    );
    b.leftHand.rotation.set(
      Math.sin(t * 1.2) * 0.06 * sway + danceWrist * 0.5,
      peace * 0.22,
      (-0.08 - swayL * 1.4 - danceWrist * 0.6) * vSign
    );

    // Right arm (raises smoothly for wave / two-phase blown kiss / peace ✌️ / dance!)
    const rRaise = Math.max(wave, kiss * 0.94, peace * 0.88);
    const kissSend = kiss * smooth((p - 0.42) / 0.34);
    b.rightUpperArm.rotation.order = 'XYZ';
    b.rightUpperArm.rotation.set(
      ((0.06 - shy * 0.36 - pout * 0.24 - cheer + danceArmR * 0.45) * (1 - rRaise) - kiss * (0.38 - kissSend * 0.14) - wave * 0.30 - peace * 0.28) * vSign,
      -0.08 - shy * 0.28 + wave * 0.34 + kiss * (0.72 - kissSend * 0.42) + peace * 0.32,
      (down + swayR - happy * 0.35 - spin * 0.52 - dance * 0.38 - rRaise * 0.85) * vSign
    );
    const osc = Math.sin(t * 10.8) * wave;
    b.rightLowerArm.rotation.order = 'ZYX';
    b.rightLowerArm.rotation.set(
      (-wave * 1.18 - peace * 1.04 - kiss * (0.85 - kissSend * 0.32)) * vSign,
      0.20 + shy * 0.82 + pout * 0.68 + happy * 0.48 + dance * 0.62 + wave * 0.34 + kiss * (1.02 - kissSend * 0.58) + peace * 0.46,
      (-wave * 0.86 + osc * 0.30 - peace * 0.84 - kiss * (0.82 - kissSend * 0.26)) * vSign
    );
    b.rightHand.rotation.set(
      Math.cos(t * 1.2) * 0.06 * sway - kissSend * 0.28 + danceWrist * 0.5,
      -kiss * 0.25,
      (0.08 + swayR * 1.4 + osc * 0.26 + kissSend * 0.22 + danceWrist * 0.6) * vSign
    );

    // Individual finger micro-animation + real Peace ✌️ sign & graceful kiss hand open!
    const fingerOrder = ['Index', 'Middle', 'Ring', 'Little'];
    for (const side of ['left', 'right']) {
      const sign = side === 'left' ? -1 : 1;
      const groups = this.fingerGroups?.[side];
      if (!groups) continue;
      fingerOrder.forEach((fname, fi) => {
        const segs = groups[fname] || [];
        const waveCurl = Math.sin(t * 1.3 + fi * 0.45 + (side === 'right' ? 1.2 : 0)) * 0.05;
        let baseCurl = 0.18 + fi * 0.045 + waveCurl;
        if (side === 'right') {
          if (peace > 0.05) {
            // Real Peace ✌️: Index & Middle straight, Ring & Little curled!
            const target = fi < 2 ? 0.03 : 0.85;
            baseCurl = baseCurl * (1 - peace) + target * peace;
          } else if (wave > 0.05 || kissSend > 0.05) {
            baseCurl *= 1 - Math.max(wave, kissSend) * 0.82;
          }
        }
        segs.forEach((fb, si) => fb.rotation.set(0, 0, sign * baseCurl * (1 + si * 0.14) * vSign));
      });
    }

    // 360° Spin reaction + turntable
    const spinRot = type === 'spin' ? smooth(p) * Math.PI * 2 : 0;
    if (this.turntable) this.turntableAngle += dt * 0.45;
    this.pivot.rotation.y = this.turntableAngle + spinRot;

    // Confident wider-stance Leg & Foot IK (wider base stance + dynamic poses & dance steps!)
    this.pivot.updateMatrixWorld(true);
    const wideBase = 0.072;
    const idleStepL = Math.max(0, Math.sin(t * 0.82)) * 0.022 * sway;
    const idleStepR = Math.max(0, -Math.sin(t * 0.82)) * 0.022 * sway;
    const danceLiftL = dance * Math.max(0, Math.sin(t * 6.8)) * 0.11;
    const danceLiftR = dance * Math.max(0, -Math.sin(t * 6.8)) * 0.11;
    const happyLiftL = happy * Math.max(0, Math.sin(p * Math.PI * 4)) * 0.078;
    const happyLiftR = happy * Math.max(0, -Math.sin(p * Math.PI * 4)) * 0.078;
    const poutStompR = pout * Math.max(0, Math.sin(p * Math.PI * 3)) * 0.078;
    const poseWide = peace * 0.08 + kiss * 0.045 + pout * 0.055;

    if (this.legs[0]) {
      this._solveLeg(
        this.legs[0],
        idleStepL + danceLiftL + happyLiftL,
        -0.025 + dance * Math.sin(t * 6.8) * 0.07 + idleStepL * 1.4,
        wideBase + poseWide + dance * 0.04
      );
    }
    if (this.legs[1]) {
      this._solveLeg(
        this.legs[1],
        idleStepR + danceLiftR + happyLiftR + poutStompR + peace * 0.05,
        0.048 - dance * Math.sin(t * 6.8) * 0.07 + peace * 0.095 + kiss * 0.055 + idleStepR * 1.4,
        -(wideBase + poseWide + dance * 0.04)
      );
    }

    // Rich Facial expressions + multi-vowel lip-sync!
    const exp = this.vrm.expressionManager;
    if (exp) {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0 && this.blinkT < 0) {
        this.blinkT = 0;
        this.blinkTimer = Math.random() < 0.18 ? 0.22 : 2.0 + Math.random() * 3.4;
      }
      let blink = 0;
      if (this.blinkT >= 0) {
        this.blinkT += dt;
        const bp = this.blinkT / 0.14;
        if (bp >= 1) this.blinkT = -1;
        else blink = Math.sin(bp * Math.PI);
      }

      const happyTarget = Math.max(pat, happy * 0.88, dance * 0.65, peace * 0.5, this.hover * 0.18);
      this.happyE += (happyTarget - this.happyE) * (1 - Math.exp(-dt * 8));
      this.angryE += (pout * 0.88 - this.angryE) * (1 - Math.exp(-dt * 8));
      this.surprise = Math.max(0, this.surprise - dt * 2.5);
      this.talkTimer = Math.max(0, this.talkTimer - dt);

      const isTalking = this.isSpeaking || this.talkTimer > 0;
      const talkAa = isTalking ? Math.max(0, Math.sin(t * 14.5) * 0.6 + Math.sin(t * 9.2) * 0.4) * 0.54 : 0;
      const talkIh = isTalking ? Math.max(0, Math.cos(t * 11.4 + 1.1)) * 0.30 : 0;
      const talkOu = isTalking ? Math.max(0, Math.sin(t * 7.8 + 2.3)) * 0.24 : 0;
      const kissMouth = kiss * 0.74;

      this._setExpr(exp, 'blink', this.happyE > 0.55 ? 0 : blink);
      this._setExpr(exp, 'blinkLeft', Math.max(kiss * 0.88, peace * 0.84));
      this._setExpr(exp, 'happy', this.happyE);
      this._setExpr(exp, 'angry', this.angryE);
      this._setExpr(exp, 'relaxed', Math.max(this.hover * 0.32, shy * 0.45, kiss * 0.25) * (1 - this.happyE));
      this._setExpr(exp, 'surprised', this.surprise * 0.62);
      this._setExpr(exp, 'aa', talkAa * (1 - kiss));
      this._setExpr(exp, 'ih', talkIh * (1 - kiss));
      this._setExpr(exp, 'ou', talkOu * (1 - kiss));
      this._setExpr(exp, 'oh', kissMouth);
    }

    this.vrm.update(dt);
  }

  _tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.t += dt;

    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLast >= 400) {
      this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLast));
      this.fpsFrames = 0;
      this.fpsLast = now;
    }

    this.waveEnergy = Math.max(0, this.waveEnergy - dt * 1.2);
    this.excitement = Math.max(0, this.excitement - dt * 0.22);
    const targetBpm = 88 + this.hover * 18 + this.excitement * 52 + (this.offended ? 22 : 0);
    this.bpm += (targetBpm - this.bpm) * (1 - Math.exp(-dt * 3.5));

    // Real synchronized Heartbeat Pulse (lub-dub audio + 3D pulsing floor aura!)
    const prevBeat = Math.floor(this.beatPhase);
    this.beatPhase += dt * (this.bpm / 60);
    if (Math.floor(this.beatPhase) > prevBeat) {
      this._playLubDub();
    }
    if (this.heartAura) {
      const f = this.beatPhase % 1;
      const pulse = Math.exp(-Math.pow((f - 0.08) / 0.06, 2)) + 0.65 * Math.exp(-Math.pow((f - 0.28) / 0.07, 2));
      this.heartAura.scale.setScalar(1 + pulse * 0.18);
      this.heartAura.material.opacity = 0.22 + pulse * 0.55;
      this.heartAura.material.color.setHex(this.offended ? 0xff2e63 : 0xff8bcb);
    }

    // Spontaneous cute comment if user hasn't interacted for a bit (never interrupts active speech!)
    if (this.vrm && !this.reaction && !this.isSpeaking) {
      this.idleCommentTimer -= dt;
      if (this.idleCommentTimer <= 0) {
        this.idleCommentTimer = 14 + Math.random() * 8;
        const msg = IDLE_COMMENTS[Math.floor(Math.random() * IDLE_COMMENTS.length)];
        this.talkTimer = 1.6;
        this.opts.onReaction?.('idle', msg, this.patCount);
      }
    }

    let tx = this.mouse.x;
    let ty = this.mouse.y;
    if (now - this.lastMove > 3500) {
      const w = this.t * 0.4;
      tx = Math.sin(w * 1.3) * 0.5 + Math.sin(w * 3.1) * 0.12;
      ty = Math.sin(w * 0.9 + 1) * 0.2 + 0.05;
    }
    tx = clamp(tx, -0.9, 0.9);
    ty = clamp(ty, -0.6, 0.7);
    const k = 1 - Math.exp(-dt * 5);
    this.look.x += (tx - this.look.x) * k;
    this.look.y += (ty - this.look.y) * k;
    this.hover += ((this.isHover ? 1 : 0) - this.hover) * (1 - Math.exp(-dt * 5));

    if (this.vrm && this.bones) this._animate(dt);

    if (!this.userDragging) {
      let goalPos, goalTarget;
      if (this.cameraOverride) {
        goalPos = this.cameraOverride.pos;
        goalTarget = this.cameraOverride.target;
      } else {
        const scaled = this.scrollProgress * (SCROLL_CAMERAS.length - 1);
        const i0 = Math.min(SCROLL_CAMERAS.length - 2, Math.floor(scaled));
        const frac = smooth(scaled - i0);
        goalPos = _a.lerpVectors(SCROLL_CAMERAS[i0].pos, SCROLL_CAMERAS[i0 + 1].pos, frac);
        goalTarget = _b.lerpVectors(SCROLL_CAMERAS[i0].target, SCROLL_CAMERAS[i0 + 1].target, frac);
      }
      const camLerp = 1 - Math.exp(-dt * 4.2);
      this.camera.position.lerp(goalPos, camLerp);
      this.controls.target.lerp(goalTarget, camLerp);
    }

    this.sparks.visible = this.params.sparkles > 0.02;
    if (this.sparks.visible) {
      this.sparks.material.opacity = 0.25 + this.params.sparkles * 0.75;
      const pos = this.sparks.geometry.attributes.position;
      const spBoost = 0.6 + this.params.sparkles * 0.8 + this.excitement * 0.7;
      for (let i = 0; i < this.sparkSeeds.length; i++) {
        const s = this.sparkSeeds[i];
        const a = s.a + this.t * s.s * spBoost;
        const y = (s.y + this.t * 0.08 * spBoost) % 1.95;
        pos.setXYZ(i, Math.cos(a) * s.r, y, Math.sin(a) * s.r);
      }
      pos.needsUpdate = true;
    }

    const hPos = this.heartPoints.geometry.attributes.position;
    let anyH = false;
    for (let i = 0; i < this.hearts.length; i++) {
      const h = this.hearts[i];
      if (h.life > 0) {
        anyH = true;
        h.life -= dt;
        h.v.y -= 0.9 * dt;
        h.p.addScaledVector(h.v, dt);
        hPos.setXYZ(i, h.p.x, h.p.y, h.p.z);
      } else {
        hPos.setXYZ(i, 0, -10, 0);
      }
    }
    if (anyH) hPos.needsUpdate = true;

    this.ring1.rotation.z = this.t * 0.22;
    this.ring2.rotation.z = -this.t * 0.36;
    if (this.artObjects) {
      for (const obj of this.artObjects) {
        obj.mesh.rotation.x = this.t * obj.rx;
        obj.mesh.rotation.y = this.t * obj.ry;
        obj.mesh.position.y = obj.baseY + Math.sin(this.t * 0.9 + obj.phase) * 0.08;
      }
    }
    if (this.floatingLogo) {
      this.floatingLogo.position.y = 1.34 + Math.sin(this.t * 1.4) * 0.05;
      this.floatingLogo.rotation.y = this.t * 0.75;
      this.floatingLogo.rotation.x = Math.sin(this.t * 0.9) * 0.14;
    }

    // Physics simulation for grabbable & throwable 3D glass orbs!
    if (this.throwableOrbs) {
      for (const orb of this.throwableOrbs) {
        if (orb.hitCooldown > 0) orb.hitCooldown -= dt;
        if (orb.state === 'idle') {
          orb.mesh.rotation.x = this.t * orb.rx;
          orb.mesh.rotation.y = this.t * orb.ry;
          orb.mesh.position.y = orb.home.y + Math.sin(this.t * 0.95 + orb.phase) * 0.08;
        } else if (orb.state === 'thrown') {
          orb.timer += dt;
          orb.vel.y -= 5.8 * dt;
          orb.mesh.position.addScaledVector(orb.vel, dt);
          orb.mesh.rotation.x += dt * 7;
          orb.mesh.rotation.y += dt * 5;

          // Check collision with Yuzu (head/torso cylinder)
          const p = orb.mesh.position;
          const horiz = Math.hypot(p.x, p.z);
          if (orb.hitCooldown <= 0 && horiz < 0.36 && p.y > 0.35 && p.y < 1.68) {
            orb.hitCooldown = 0.85;
            orb.vel.x = (p.x >= 0 ? 1 : -1) * (1.8 + Math.random() * 1.4);
            orb.vel.z = 2.6;
            orb.vel.y = 2.1;
            this.orbHitCount++;
            this.surprise = 1.0;
            this.opts.onOrbHit?.(this.orbHitCount, p.clone());
          }
          // Floor bounce
          if (p.y < 0.16) {
            p.y = 0.16;
            orb.vel.y = Math.abs(orb.vel.y) * 0.45;
            orb.vel.x *= 0.72;
            orb.vel.z *= 0.72;
          }
          if (orb.timer > 2.3) orb.state = 'returning';
        } else if (orb.state === 'returning') {
          orb.mesh.position.lerp(orb.home, 1 - Math.exp(-dt * 4.5));
          if (orb.mesh.position.distanceTo(orb.home) < 0.025) {
            orb.mesh.position.copy(orb.home);
            orb.state = 'idle';
          }
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.opts.onFrame) {
      const offset = _a.subVectors(this.camera.position, this.controls.target);
      const sph = new THREE.Spherical().setFromVector3(offset);
      this.opts.onFrame({
        t: this.t,
        bpm: this.bpm,
        excitement: this.excitement,
        hover: this.hover,
        dist: sph.radius,
        yawDeg: THREE.MathUtils.radToDeg(sph.theta),
        pitchDeg: 90 - THREE.MathUtils.radToDeg(sph.phi),
        fps: this.fps,
      });
    }
  }
}
