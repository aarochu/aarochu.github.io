import * as THREE from "three";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const body = document.body;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const range = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const rand = (a, b) => a + Math.random() * (b - a);
const pad2 = (n) => String(n).padStart(2, "0");

const PROJECTS = [
  { id: "water-sommelier", title: "Water Sommelier", line: "Two robot arms that hold a glass bottle and unscrew the cap.", tags: ["Viam", "xArm6", "RealSense", "Streamlit"], bg: ["#062a3a", "#0e7fa3"], ink: "#eaf9ff", accent: "#7fe3ff", motif: "ripples" },
  { id: "direcsun", title: "DirecSun", line: "A desk-sized CubeSat that points itself with a flywheel.", tags: ["ESP32-S3", "C++17", "React", "three.js"], bg: ["#0c0a10", "#2a160a"], ink: "#fff3e6", accent: "#ff8a2a", motif: "sun" },
  { id: "tokeneyezed", title: "Tokeneyezed", line: "Memory and planning for long-running coding agents.", tags: ["MongoDB Atlas", "LangGraph", "Python"], bg: ["#04140b", "#0b2e1a"], ink: "#e8fff1", accent: "#00ed64", motif: "graph" },
  { id: "deskpartner", title: "DeskPartner", line: "A VLM-planned robot arm that tidies a desk zone.", tags: ["reBot B601-DM", "VLM", "Vision"], bg: ["#efece6", "#d6d0c4"], ink: "#141414", accent: "#e5484d", motif: "cans" },
  { id: "knowsy", title: "Knowsy", line: "A 5-stage RISC-V pipeline you can watch cycle by cycle.", tags: ["RISC-V", "Pipelines", "Education"], bg: ["#140b2a", "#2b1559"], ink: "#f3edff", accent: "#f5a524", motif: "pipeline" },
  { id: "veristudent", title: "VeriStudent", line: "A .edu-only marketplace for textbooks and sublets.", tags: ["React / Expo", "Supabase", "Postgres"], bg: ["#f3f6ff", "#d3defc"], ink: "#0f1a3a", accent: "#2f6fed", motif: "cards" },
  { id: "pocketlab", title: "PocketLab", line: "A $10 ESP32 turned into a real-time science lab.", tags: ["ESP32", "React", "WebSockets", "three.js"], bg: ["#071012", "#0d2026"], ink: "#e6fff4", accent: "#69f0ae", motif: "wave" },
  { id: "zipply", title: "Zipply", line: "Real-time chat built on React and Firebase.", tags: ["React", "Firebase"], bg: ["#ff5a36", "#ff9156"], ink: "#fff8f2", accent: "#3a1405", motif: "chat" },
  { id: "superhearo", title: "SuperHearo", line: "A voice-controlled Android helper for elderly and blind users.", tags: ["Android", "Speech"], bg: ["#0d0d0d", "#1f1b0e"], ink: "#fff8e1", accent: "#ffd54f", motif: "bars" },
];

const CURVE = 0.19;
const SCREEN_ASPECT = 1.6;
const SCREEN_H = 1.45;
const SCREEN_Y0 = -3.2;
const SCREEN_GAP = 2.4;

const N = PROJECTS.length;
const T = { heroEnd: 1.25 };
T.pStart = T.heroEnd + 0.4;
T.pStep = 0.95;
T.pEnd = T.pStart + (N - 1) * T.pStep;
T.about = T.pEnd + 1.3;
T.contact = T.about + 1.45;
T.total = T.contact;

/* ---------- text scramble ---------- */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#%_/<>=";
function scramble(el, dur = 750) {
  if (reduceMotion) return;
  const final = (el.dataset.text ??= el.textContent);
  const t0 = performance.now();
  cancelAnimationFrame(el._scr);
  const step = (now) => {
    const p = clamp((now - t0) / dur, 0, 1);
    const reveal = Math.floor(p * final.length);
    let out = "";
    for (let i = 0; i < final.length; i++) {
      const ch = final[i];
      out += i < reveal || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) el._scr = requestAnimationFrame(step);
  };
  el._scr = requestAnimationFrame(step);
}

/* ---------- DOM: menu, panels, jumps ---------- */
function wireUI(nav) {
  const menu = $("#menu");
  const menuOpenBtn = $("#menu-open");
  let openPanelEl = null;
  let lastFocus = null;
  let mermaidDone = false;

  const hideMenu = () => {
    menu.hidden = true;
    body.classList.remove("menu-open");
  };
  const openMenu = () => {
    menu.hidden = false;
    body.classList.add("menu-open");
    $("#menu-close").focus();
  };
  const closeMenu = () => {
    if (menu.hidden) return;
    hideMenu();
    menuOpenBtn.focus();
  };

  function openPanel(id) {
    const el = document.getElementById(`panel-${id}`);
    if (!el) return;
    if (openPanelEl) stopMedia(openPanelEl);
    else lastFocus = document.activeElement;
    if (openPanelEl && openPanelEl !== el) openPanelEl.hidden = true;
    hideMenu();
    el.hidden = false;
    el.scrollTop = 0;
    openPanelEl = el;
    body.classList.add("panel-open");
    el.querySelector("[data-close]").focus({ preventScroll: true });
    if (id === "tokeneyezed" && !mermaidDone && window.mermaid) {
      mermaidDone = true;
      window.mermaid.run({ querySelector: "#panel-tokeneyezed .mermaid" });
    }
    nav.onPanel?.(true);
  }

  function closePanel() {
    if (!openPanelEl) return;
    stopMedia(openPanelEl);
    openPanelEl.hidden = true;
    openPanelEl = null;
    body.classList.remove("panel-open");
    lastFocus?.focus?.({ preventScroll: true });
    nav.onPanel?.(false);
  }

  function stopMedia(el) {
    $$("video", el).forEach((v) => v.pause());
    $$("iframe", el).forEach((f) => {
      const src = f.getAttribute("src");
      f.setAttribute("src", src);
    });
  }

  menuOpenBtn.addEventListener("click", openMenu);
  $("#menu-close").addEventListener("click", closeMenu);

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open],[data-jump],[data-close],[data-prev],[data-next]");
    if (!t) return;
    if (t.matches("[data-open]")) {
      e.preventDefault();
      openPanel(t.dataset.open);
    } else if (t.matches("[data-jump]")) {
      e.preventDefault();
      closePanel();
      hideMenu();
      nav.jump(t.dataset.jump);
    } else if (t.matches("[data-close]")) {
      closePanel();
    } else {
      const i = PROJECTS.findIndex((p) => openPanelEl && openPanelEl.id === `panel-${p.id}`);
      if (i < 0) return;
      const j = (i + (t.matches("[data-next]") ? 1 : N - 1)) % N;
      openPanel(PROJECTS[j].id);
      nav.jumpProject?.(j);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (openPanelEl) closePanel();
    else closeMenu();
  });

  return {
    openPanel,
    isBlocked: () => !!openPanelEl || !menu.hidden,
  };
}

function fallback() {
  body.classList.add("no-webgl");
  $("#loader")?.classList.add("is-done");
  window.__crtReady = true;
  const ids = { home: "hero", work: "work-index", about: "about", contact: "contact" };
  wireUI({
    jump: (name) => document.getElementById(ids[name] || "hero")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }),
  });
}

/* ---------- helpers ---------- */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

function boxBlur(src, w, h, r, passes) {
  const a = Float32Array.from(src);
  const b = new Float32Array(src.length);
  const span = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[row + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / span;
        acc += a[row + clamp(x + r + 1, 0, w - 1)] - a[row + clamp(x - r, 0, w - 1)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / span;
        acc += b[clamp(y + r + 1, 0, h - 1) * w + x] - b[clamp(y - r, 0, h - 1) * w + x];
      }
    }
  }
  return a;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function wrapText(g, text, x, y, maxW, lh) {
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      line = word;
      y += lh;
    } else {
      line = test;
    }
  }
  if (line) g.fillText(line, x, y);
}

/* ---------- the voxel face ---------- */
/* me-turn.png holds real frames of a head turn (front -> three-quarter), cut out and aligned.
   Turning one way plays them forward; the other way plays them mirrored. */
const TURN = { src: "me-turn.png", tileW: 216, tileH: 242, perRow: 6, count: 19, skip: 1 };

/* Cool monochrome ramp: slate shadows -> pale cyan highlights (sRGB). */
const TONE = [
  [0.0, [0.035, 0.05, 0.06]],
  [0.35, [0.15, 0.23, 0.22]],
  [0.7, [0.48, 0.64, 0.6]],
  [1.0, [0.86, 0.97, 0.9]],
];
function tone(t, out, o) {
  let k = 1;
  while (k < TONE.length - 1 && t > TONE[k][0]) k++;
  const [t0, a] = TONE[k - 1];
  const [t1, b] = TONE[k];
  const u = clamp((t - t0) / (t1 - t0), 0, 1);
  for (let ch = 0; ch < 3; ch++) out[o + ch] = lerp(a[ch], b[ch], u);
}

function buildFace(atlas, cols) {
  const { tileW, tileH, perRow, count, skip } = TURN;
  const rows = Math.round((cols * tileH) / tileW);
  const n = cols * rows;
  const cv = document.createElement("canvas");
  cv.width = cols;
  cv.height = rows;
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";

  const F = count - skip;
  const frames = [];
  for (let f = 0; f < F; f++) {
    const k = f + skip;
    g.clearRect(0, 0, cols, rows);
    g.drawImage(atlas, (k % perRow) * tileW, Math.floor(k / perRow) * tileH, tileW, tileH, 0, 0, cols, rows);
    const d = g.getImageData(0, 0, cols, rows).data;
    const alpha = new Float32Array(n);
    const lum = new Float32Array(n);
    const rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      alpha[i] = d[i * 4 + 3] / 255;
      rgb[i * 3] = d[i * 4] / 255;
      rgb[i * 3 + 1] = d[i * 4 + 1] / 255;
      rgb[i * 3 + 2] = d[i * 4 + 2] / 255;
      lum[i] = 0.2126 * rgb[i * 3] + 0.7152 * rgb[i * 3 + 1] + 0.0722 * rgb[i * 3 + 2];
    }
    frames.push({ alpha, lum, rgb, soft: boxBlur(alpha, cols, rows, Math.max(2, Math.round(cols * 0.05)), 3) });
  }

  /* one exposure for every frame, taken from the front view, so the turn doesn't flicker */
  const lit = [];
  for (let i = 0; i < n; i++) if (frames[0].alpha[i] > 0.5) lit.push(frames[0].lum[i]);
  lit.sort((a, b) => a - b);
  const p96 = lit[Math.floor(lit.length * 0.96)] || 0.5;
  const gain = clamp(0.8 / Math.max(p96, 0.05), 1, 4);

  /* per frame: visibility, depth and colour for every cell */
  const vis = [];
  const depth = [];
  const color = [];
  for (const fr of frames) {
    const v = new Uint8Array(n);
    const z = new Float32Array(n);
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      v[i] = fr.alpha[i] > 0.5 ? 1 : 0;
      const L = clamp(fr.lum[i] * gain, 0, 1);
      z[i] = Math.sqrt(fr.soft[i]) * 0.3 + L * 0.06;
      tone(smooth(L), c, i * 3);
    }
    vis.push(v);
    depth.push(z);
    color.push(c);
  }

  const uniforms = {
    uIntro: { value: reduceMotion ? 1 : 0 },
    uBandY: { value: 0 },
    uBandH: { value: 0 },
    uBandShift: { value: 0 },
  };
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader =
      "uniform float uIntro;\nuniform float uBandY;\nuniform float uBandH;\nuniform float uBandShift;\n" +
      sh.vertexShader
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vec3 ip = vec3(instanceMatrix[3]);
          float rnd = fract(sin(dot(ip.xy, vec2(12.9898, 78.233))) * 43758.5453);
          float k = clamp(uIntro * 1.7 - rnd * 0.7, 0.0, 1.0);
          transformed *= k;`
        )
        .replace(
          "#include <project_vertex>",
          `vec4 mvPosition = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif
          mvPosition.x += step(abs(mvPosition.y - uBandY), uBandH) * uBandShift;
          mvPosition.z += (1.0 - k) * (rnd - 0.2) * 1.5;
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;`
        );
  };

  const cell = 2 / rows;
  const w = cell * 0.84;
  const back = -0.06;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color());
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const M = mesh.instanceMatrix.array;
  const C = mesh.instanceColor.array;
  const tmp = new THREE.Color();

  /* state -(F-1)..(F-1): negative = mirrored frames */
  let state = null;
  function show(s) {
    if (s === state) return;
    state = s;
    const f = Math.abs(s);
    const mirror = s < 0;
    const v = vis[f];
    const z = depth[f];
    const c = color[f];
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const dst = r * cols + col;
        const src = r * cols + (mirror ? cols - 1 - col : col);
        const o = dst * 16;
        const on = v[src];
        const len = Math.max(z[src] - back, cell);
        M[o] = on ? w : 0;
        M[o + 5] = on ? w : 0;
        M[o + 10] = on ? len : 0;
        M[o + 12] = (col + 0.5 - cols / 2) * cell;
        M[o + 13] = (rows / 2 - r - 0.5) * cell;
        M[o + 14] = back + len / 2;
        M[o + 15] = 1;
        tmp.setRGB(c[src * 3], c[src * 3 + 1], c[src * 3 + 2], THREE.SRGBColorSpace);
        C[dst * 3] = tmp.r;
        C[dst * 3 + 1] = tmp.g;
        C[dst * 3 + 2] = tmp.b;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }
  show(0);

  /* yaw in [-1, 1] -> nearest real frame */
  const setTurn = (t) => show(Math.round(clamp(t, -1, 1) * (F - 1)));

  const soft0 = frames[0].soft;
  const maskAt = (x, y) => {
    const c = Math.floor(x / cell + cols / 2);
    const r = Math.floor(rows / 2 - y / cell);
    if (c < 0 || r < 0 || c >= cols || r >= rows) return 0;
    return Math.max(soft0[r * cols + c], soft0[r * cols + cols - 1 - c]);
  };

  return { mesh, bustW: cols * cell, maskAt, uniforms, setTurn };
}

/* A tiled wall behind the head; tiles split finer where they straddle the silhouette. */
function buildWall(face, groupY, d, tanH, aspect) {
  const WALL_Z = -1.1;
  const dist = d - WALL_Z;
  const h = 2 * dist * tanH * 1.25;
  const w = h * aspect * 1.1;
  const base = 2 / 7;
  const pos = [];
  const shrink = d / dist;
  const inside = (x, y) => face.maskAt(x * shrink, y * shrink - groupY) > 0.2;
  const rect = (x0, y0, x1, y1) => {
    pos.push(x0, y0, WALL_Z, x1, y0, WALL_Z, x1, y0, WALL_Z, x1, y1, WALL_Z);
    pos.push(x1, y1, WALL_Z, x0, y1, WALL_Z, x0, y1, WALL_Z, x0, y0, WALL_Z);
  };
  const cell = (x0, y0, size, level) => {
    let hits = 0;
    for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3; j++) if (inside(x0 + (size * i) / 3, y0 + (size * j) / 3)) hits++;
    if (hits > 0 && hits < 16 && level < 3) {
      const half = size / 2;
      cell(x0, y0, half, level + 1);
      cell(x0 + half, y0, half, level + 1);
      cell(x0, y0 + half, half, level + 1);
      cell(x0 + half, y0 + half, half, level + 1);
    } else {
      rect(x0, y0, x0 + size, y0 + size);
    }
  };
  const nx = Math.ceil(w / base);
  const ny = Math.ceil(h / base);
  const ox = -(nx * base) / 2;
  const oy = -(ny * base) / 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) cell(ox + i * base, oy + j * base, base, 0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x7f908a, transparent: true, opacity: 0.8 }));
}

/* ---------- project screen artwork ---------- */
const MOTIFS = {
  ripples(g, p, W, H) {
    const cx = W * 0.78;
    const cy = H * 0.62;
    g.strokeStyle = p.accent;
    g.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      g.globalAlpha = 0.6 - i * 0.055;
      g.beginPath();
      g.ellipse(cx, cy + 40, 50 + i * 34, 14 + i * 10, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 0.95;
    g.fillStyle = p.ink;
    roundRect(g, cx - 48, cy - 150, 96, 190, 26);
    g.fill();
    g.fillRect(cx - 20, cy - 205, 40, 60);
    g.fillStyle = p.accent;
    g.fillRect(cx - 26, cy - 228, 52, 26);
  },
  sun(g, p, W, H) {
    const cx = W * 0.76;
    const cy = H * 0.56;
    const rg = g.createRadialGradient(cx, cy, 10, cx, cy, 230);
    rg.addColorStop(0, p.accent);
    rg.addColorStop(0.35, `${p.accent}aa`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(cx, cy, 230, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = p.ink;
    g.lineWidth = 2;
    g.globalAlpha = 0.45;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(cx, cy, 120 + i * 42, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 0.95;
    g.save();
    g.translate(cx + 150, cy + 110);
    g.rotate(-0.35);
    g.lineWidth = 4;
    g.strokeRect(-36, -70, 72, 140);
    g.beginPath();
    g.moveTo(-36, 0);
    g.lineTo(36, 0);
    g.stroke();
    g.restore();
  },
  graph(g, p) {
    const nodes = [[760, 340], [960, 300], [1140, 360], [820, 480], [1020, 470], [900, 600], [1120, 600]];
    const edges = [[0, 1], [1, 2], [0, 3], [1, 4], [3, 4], [4, 5], [4, 6], [2, 4]];
    g.strokeStyle = p.accent;
    g.lineWidth = 3;
    g.globalAlpha = 0.6;
    edges.forEach(([a, b]) => {
      g.beginPath();
      g.moveTo(...nodes[a]);
      g.lineTo(...nodes[b]);
      g.stroke();
    });
    g.globalAlpha = 1;
    nodes.forEach(([x, y], i) => {
      g.fillStyle = i === 4 ? p.accent : "rgba(255,255,255,0.08)";
      roundRect(g, x - 50, y - 22, 100, 44, 10);
      g.fill();
      g.stroke();
    });
  },
  cans(g, p) {
    g.strokeStyle = p.ink;
    g.lineCap = "round";
    g.lineWidth = 22;
    g.beginPath();
    g.moveTo(1150, 640);
    g.lineTo(1060, 420);
    g.lineTo(880, 470);
    g.stroke();
    g.fillStyle = p.ink;
    g.beginPath();
    g.arc(1060, 420, 16, 0, Math.PI * 2);
    g.fill();
    [["#2f6fed", 760], ["#e5484d", 860], ["#8e4ec6", 960]].forEach(([c, x]) => {
      g.fillStyle = c;
      roundRect(g, x - 30, 560, 60, 110, 14);
      g.fill();
    });
    g.fillStyle = p.ink;
    g.fillRect(700, 670, 520, 6);
  },
  pipeline(g, p) {
    const stages = ["IF", "ID", "EX", "MEM", "WB"];
    g.font = '700 22px "Doto", monospace';
    g.textAlign = "center";
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 5; k++) {
        const x = 690 + (r + k) * 66;
        const y = 330 + r * 78;
        if (x > 1160) continue;
        g.globalAlpha = 0.35 + k * 0.13;
        g.fillStyle = p.accent;
        roundRect(g, x, y, 60, 56, 8);
        g.fill();
        g.globalAlpha = 1;
        g.fillStyle = p.bg[0];
        g.fillText(stages[k], x + 30, y + 36);
      }
    }
    g.textAlign = "left";
  },
  cards(g, p) {
    for (let i = 0; i < 4; i++) {
      const x = 720 + (i % 2) * 250;
      const y = 300 + Math.floor(i / 2) * 190;
      g.fillStyle = "rgba(255,255,255,0.85)";
      roundRect(g, x, y, 230, 170, 16);
      g.fill();
      g.fillStyle = p.accent;
      g.globalAlpha = 0.25 + i * 0.15;
      roundRect(g, x + 14, y + 14, 202, 80, 10);
      g.fill();
      g.globalAlpha = 1;
      g.fillStyle = p.ink;
      g.fillRect(x + 14, y + 110, 140, 10);
      g.globalAlpha = 0.4;
      g.fillRect(x + 14, y + 132, 90, 10);
      g.globalAlpha = 1;
    }
  },
  wave(g, p) {
    g.strokeStyle = p.ink;
    g.globalAlpha = 0.12;
    g.lineWidth = 1;
    for (let x = 700; x <= 1220; x += 40) {
      g.beginPath();
      g.moveTo(x, 300);
      g.lineTo(x, 660);
      g.stroke();
    }
    for (let y = 300; y <= 660; y += 40) {
      g.beginPath();
      g.moveTo(700, y);
      g.lineTo(1220, y);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.strokeStyle = p.accent;
    g.lineWidth = 4;
    g.beginPath();
    for (let x = 700; x <= 1220; x += 4) {
      const t = (x - 700) / 520;
      const y = 480 + Math.sin(t * 18) * 60 * Math.exp(-t * 1.2) + Math.sin(t * 61) * 10;
      if (x === 700) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  },
  chat(g, p) {
    const bubbles = [[720, 320, 300, false], [880, 410, 320, true], [720, 500, 260, false], [920, 590, 280, true]];
    bubbles.forEach(([x, y, w, mine]) => {
      g.fillStyle = mine ? p.accent : "rgba(255,255,255,0.92)";
      roundRect(g, x, y, w, 64, 32);
      g.fill();
      g.fillStyle = mine ? "rgba(255,255,255,0.75)" : "rgba(58,20,5,0.45)";
      g.fillRect(x + 28, y + 26, w * 0.55, 12);
    });
  },
  bars(g, p) {
    const n = 21;
    for (let i = 0; i < n; i++) {
      const x = 700 + i * 25;
      const hgt = 40 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.31)) * 300;
      g.fillStyle = p.accent;
      g.globalAlpha = 0.45 + (hgt / 340) * 0.55;
      roundRect(g, x, 490 - hgt / 2, 14, hgt, 7);
      g.fill();
    }
    g.globalAlpha = 1;
  },
};

function drawScreen(p, index, total) {
  const W = 1280;
  const H = 800;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, p.bg[0]);
  grad.addColorStop(1, p.bg[1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  g.save();
  MOTIFS[p.motif](g, p, W, H);
  g.restore();

  g.fillStyle = p.ink;
  g.font = '700 26px "Doto", monospace';
  g.globalAlpha = 0.85;
  g.fillText("AARON CHU", 60, 70);
  g.textAlign = "right";
  g.fillText(`[${pad2(index + 1)}] / ${pad2(total)}`, W - 60, 70);
  g.textAlign = "left";
  g.globalAlpha = 0.28;
  g.fillRect(60, 92, W - 120, 2);
  g.globalAlpha = 1;

  const title = p.title.toUpperCase();
  let size = 128;
  const titleFont = (px) => `400 ${px}px "Archivo Black", "Arial Black", Impact, sans-serif`;
  g.font = titleFont(size);
  while (g.measureText(title).width > W - 120 && size > 60) {
    size -= 4;
    g.font = titleFont(size);
  }
  g.fillText(title, 56, 118 + size);

  g.font = '700 34px "Doto", monospace';
  wrapText(g, p.line, 60, 118 + size + 66, 600, 44);

  g.font = '700 22px "Doto", monospace';
  g.strokeStyle = p.ink;
  g.lineWidth = 2;
  let x = 60;
  const y = H - 70;
  p.tags.forEach((t) => {
    const label = t.toUpperCase();
    const tw = g.measureText(label).width + 30;
    g.globalAlpha = 0.7;
    roundRect(g, x, y - 30, tw, 42, 21);
    g.stroke();
    g.globalAlpha = 1;
    g.fillText(label, x + 15, y - 2);
    x += tw + 12;
  });

  g.textAlign = "right";
  g.font = '700 24px "Doto", monospace';
  g.fillText("OPEN PROJECT >", W - 60, H - 64);
  return c;
}

/* ---------- shaders ---------- */
function screenMaterial(tex, aspect) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: tex },
      uAspect: { value: aspect },
      uBend: { value: 0 },
      uRound: { value: 1 },
      uHover: { value: 0 },
      uDim: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uBend;
      uniform float uAspect;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float nx = p.x / (uAspect * 0.5);
        p.z -= uBend * nx * nx;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex;
      uniform float uAspect;
      uniform float uRound;
      uniform float uHover;
      uniform float uDim;
      varying vec2 vUv;
      void main() {
        vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
        float r = 0.07 * uRound;
        vec2 b = vec2(uAspect, 1.0) * 0.5 - r;
        if (length(max(abs(q) - b, 0.0)) - r > 0.0) discard;
        vec3 col = texture2D(uTex, vUv).rgb;
        vec2 e = vUv * (1.0 - vUv);
        float vig = clamp(pow(e.x * e.y * 20.0, 0.25), 0.0, 1.0);
        col *= mix(1.0, vig, 0.55 * uRound);
        col *= 1.0 + uHover * 0.15;
        col = mix(col, col * 0.4, uDim);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

const POST_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uGlitch;
  uniform float uStatic;
  uniform float uCurve;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  vec2 curve(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    vec2 off = abs(uv.yx) * uCurve;
    uv = uv + uv * off * off;
    return uv * 0.5 + 0.5;
  }

  void main() {
    vec2 uv = curve(vUv);
    float t = floor(uTime * 14.0);
    float band = step(1.0 - 0.08 * uGlitch, hash(vec2(floor(vUv.y * 22.0), t)));
    uv.x += (hash(vec2(floor(vUv.y * uRes.y / 3.0), t)) - 0.5) * 0.05 * band * uGlitch;

    vec2 dir = uv - 0.5;
    float ca = 0.0035 + 0.008 * uGlitch;
    vec2 px = vec2(1.0 / uRes.x, 0.0);
    vec3 col;
    col.r = texture2D(tDiffuse, uv + dir * ca).r;
    col.g = texture2D(tDiffuse, uv).g;
    col.b = texture2D(tDiffuse, uv - dir * ca).b;
    col = col * 0.64 + (texture2D(tDiffuse, uv + px).rgb + texture2D(tDiffuse, uv - px).rgb) * 0.18;

    col *= 1.0 - 0.09 * (0.5 + 0.5 * sin(vUv.y * uRes.y * 3.14159));
    col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * (0.035 + 0.12 * uStatic);

    float row = floor(vUv.y * uRes.y / 2.0);
    float rt = floor(uTime * 9.0);
    if (hash(vec2(row, rt)) > 0.9986 - uStatic * 0.012) {
      float x0 = hash(vec2(row, rt + 1.7));
      float len = 0.01 + 0.035 * hash(vec2(row, rt + 3.1));
      if (vUv.x > x0 && vUv.x < x0 + len) col = mix(col, vec3(0.9), 0.85);
    }

    vec2 e = uv * (1.0 - uv);
    col *= clamp(pow(e.x * e.y * 18.0, 0.24), 0.0, 1.0);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
    col *= 1.0 - uStatic * 0.55;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

function crtUV(u, v) {
  let x = u * 2 - 1;
  let y = v * 2 - 1;
  const ox = Math.abs(y) * CURVE;
  const oy = Math.abs(x) * CURVE;
  x += x * ox * ox;
  y += y * oy * oy;
  return [x * 0.5 + 0.5, y * 0.5 + 0.5];
}

/* ---------- main ---------- */
async function main() {
  const canvas = $("#crt-canvas");
  const loaderDot = $("#loader-dot");
  let progress = 0;
  const setProgress = (p) => {
    progress = Math.max(progress, p);
    if (loaderDot) loaderDot.style.left = `${4 + progress * 167}px`;
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("WebGL2 unavailable");
  const small = () => window.innerWidth < 760;
  const dprCap = () => Math.min(window.devicePixelRatio || 1, small() ? 1.5 : 1.25);
  renderer.setPixelRatio(dprCap());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  setProgress(0.15);

  const fontsReady = document.fonts
    ? Promise.all([
        document.fonts.ready,
        document.fonts.load('400 120px "Archivo Black"'),
        document.fonts.load('700 26px "Doto"'),
        document.fonts.load('400 40px "Silkscreen"'),
      ]).catch(() => {})
    : Promise.resolve();
  const img = await loadImage(TURN.src);
  setProgress(0.45);
  await withTimeout(fontsReady, 2500);
  setProgress(0.6);

  const bufSize = new THREE.Vector2();
  const drawSize = () => renderer.getDrawingBufferSize(bufSize);
  const makeRT = (samples) => {
    const s = drawSize();
    const rt = new THREE.WebGLRenderTarget(s.x, s.y, { samples });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    return rt;
  };
  const faceRT = makeRT(0);
  const mainRT = makeRT(small() ? 0 : 4);

  /* face scene */
  const faceScene = new THREE.Scene();
  faceScene.background = new THREE.Color(0x020303);
  const faceCam = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  faceScene.add(new THREE.AmbientLight(0xcfe3ea, 0.9));
  const key = new THREE.DirectionalLight(0xeaf6f6, 3.6);
  key.position.set(2.6, 1.4, 3.2);
  faceScene.add(key);
  const rim = new THREE.DirectionalLight(0x7fb7c9, 1.4);
  rim.position.set(-3, 0.8, 0.6);
  faceScene.add(rim);

  const face = buildFace(img, small() ? 72 : 108);
  const faceGroup = new THREE.Group();
  faceGroup.add(face.mesh);
  faceScene.add(faceGroup);
  let wall = null;
  setProgress(0.75);

  /* world scene */
  const world = new THREE.Scene();
  world.background = new THREE.Color(0x050505);
  const BG = {
    dark: new THREE.Color(0x060808),
    light: new THREE.Color(0xb3bab6),
    about: new THREE.Color(0x0d1210),
    end: new THREE.Color(0x050706),
  };
  const cam = new THREE.PerspectiveCamera(40, 1, 0.05, 100);

  const heroMat = screenMaterial(faceRT.texture, 1);
  const hero = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 48, 1), heroMat);
  hero.scale.setScalar(2);
  world.add(hero);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const screens = PROJECTS.map((p, i) => {
    const tex = new THREE.CanvasTexture(drawScreen(p, i, N));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, maxAniso);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_ASPECT, 1, 32, 1), screenMaterial(tex, SCREEN_ASPECT));
    mesh.material.uniforms.uBend.value = 0.08;
    mesh.scale.setScalar(SCREEN_H);
    mesh.userData = { index: i, base: new THREE.Vector3(), rotY: 0, rotZ: 0 };
    world.add(mesh);
    return mesh;
  });
  setProgress(0.9);

  /* post */
  const post = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: mainRT.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uGlitch: { value: 0 },
        uStatic: { value: reduceMotion ? 0 : 1 },
        uCurve: { value: CURVE },
      },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: POST_FRAG,
      depthTest: false,
      depthWrite: false,
    })
  );
  post.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(post);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postU = post.material.uniforms;

  /* layout */
  let tanH = 1;
  let dist0 = 1;
  let camZ = 4.3;
  function layoutFace(aspect) {
    faceCam.aspect = aspect;
    const fTan = Math.tan(THREE.MathUtils.degToRad(faceCam.fov / 2));
    const dFit = 1.08 / fTan;
    const dWide = (face.bustW * 0.5) / (aspect < 1 ? 1.45 : 0.9) / (fTan * aspect);
    const d = Math.max(dFit, dWide);
    faceCam.position.set(0, 0, d);
    faceCam.lookAt(0, 0, 0);
    faceCam.updateProjectionMatrix();
    faceGroup.position.y = -d * fTan + 1;
    if (wall) {
      faceScene.remove(wall);
      wall.geometry.dispose();
      wall.material.dispose();
    }
    wall = buildWall(face, faceGroup.position.y, d, fTan, aspect);
    faceScene.add(wall);
  }

  function layout() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const aspect = w / h;
    renderer.setPixelRatio(dprCap());
    renderer.setSize(w, h, false);
    const s = drawSize();
    faceRT.setSize(s.x, s.y);
    mainRT.setSize(s.x, s.y);
    postU.uRes.value.set(s.x, s.y);
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    dist0 = 1 / tanH;
    camZ = Math.max(4.3, (SCREEN_H * SCREEN_ASPECT * 0.56) / (tanH * aspect));
    hero.geometry.dispose();
    hero.geometry = new THREE.PlaneGeometry(aspect, 1, 48, 1);
    heroMat.uniforms.uAspect.value = aspect;
    const narrow = aspect < 1;
    const xAmp = narrow ? 0.12 : 0.62;
    screens.forEach((m, i) => {
      const side = i % 2 ? 1 : -1;
      m.userData.base.set(side * xAmp, SCREEN_Y0 - i * SCREEN_GAP, 0);
      m.userData.rotY = -side * (narrow ? 0.08 : 0.2);
      m.userData.rotZ = side * 0.025;
    });
    layoutFace(aspect);
  }
  layout();
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  });

  /* scroll + navigation */
  let target = 0;
  let current = 0;
  let paused = false;
  const jumpTargets = { home: 0, work: T.pStart, about: T.about, contact: T.contact };
  const ui = wireUI({
    jump: (name) => {
      target = jumpTargets[name] ?? 0;
    },
    jumpProject: (i) => {
      target = T.pStart + i * T.pStep;
    },
    onPanel: (open) => {
      paused = open;
    },
  });
  const blocked = () => ui.isBlocked();
  const nudge = (d) => {
    target = clamp(target + d, 0, T.total);
  };

  window.addEventListener(
    "wheel",
    (e) => {
      if (blocked()) return;
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 32;
      else if (e.deltaMode === 2) d *= window.innerHeight;
      nudge((d / window.innerHeight) * 0.9);
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    if (blocked() || e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = document.activeElement?.tagName;
    const onControl = tag === "BUTTON" || tag === "A" || tag === "INPUT";
    const steps = { ArrowDown: 0.3, ArrowUp: -0.3, PageDown: 0.9, PageUp: -0.9 };
    if (e.key in steps) nudge(steps[e.key]);
    else if (e.key === " " && !onControl) nudge(e.shiftKey ? -0.9 : 0.9);
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = T.total;
    else return;
    e.preventDefault();
  });

  /* pointer: parallax, hover, click, touch scroll */
  const pointer = { x: 0, y: 0, cx: -1, cy: -1, inside: false };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const label = $("#cursor-label");
  let hovered = -1;
  let touch = null;
  let down = null;

  function pick(clientX, clientY) {
    const [u, v] = crtUV(clientX / window.innerWidth, 1 - clientY / window.innerHeight);
    if (u < 0 || u > 1 || v < 0 || v > 1) return -1;
    ndc.set(u * 2 - 1, v * 2 - 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(screens.filter((m) => m.visible), false)[0];
    return hit ? hit.object.userData.index : -1;
  }

  canvas.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.cx = e.clientX;
    pointer.cy = e.clientY;
    pointer.inside = true;
    if (touch && e.pointerType !== "mouse") {
      const dy = e.clientY - touch.y;
      const now = performance.now();
      touch.v = (-dy / window.innerHeight / Math.max(now - touch.t, 1)) * 1000;
      touch.y = e.clientY;
      touch.t = now;
      if (Math.abs(e.clientY - touch.y0) > 6) touch.moved = true;
      nudge((-dy / window.innerHeight) * 1.4);
    }
  });
  canvas.addEventListener("pointerleave", () => {
    pointer.inside = false;
  });
  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY };
    if (e.pointerType !== "mouse") touch = { y: e.clientY, y0: e.clientY, t: performance.now(), v: 0, moved: false };
  });
  canvas.addEventListener("pointerup", (e) => {
    const moved = down ? Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 : true;
    if (touch) {
      if (touch.moved) nudge(clamp(touch.v * 0.25, -1.5, 1.5));
      touch = null;
    }
    down = null;
    if (moved || blocked()) return;
    const i = pick(e.clientX, e.clientY);
    if (i >= 0) ui.openPanel(PROJECTS[i].id);
  });
  canvas.addEventListener("pointercancel", () => {
    touch = null;
    down = null;
  });

  /* HUD */
  const sections = {
    hero: $('[data-section="hero"]'),
    work: $('[data-section="work"]'),
    about: $('[data-section="about"]'),
    contact: $('[data-section="contact"]'),
  };
  const workButtons = $$("#work-list button");
  const live = {};
  let ready = false;
  function setSection(name, o) {
    const el = sections[name];
    el.style.setProperty("--o", o.toFixed(3));
    const on = o > 0.02;
    if (on !== !!live[name]) {
      live[name] = on;
      el.classList.toggle("is-live", on);
      if (on && ready) $$("[data-scramble]", el).forEach((n) => scramble(n));
    }
  }

  /* glitch timing */
  let nextGlitch = 3;
  let glitchUntil = 0;
  let glitchTarget = 0;
  function glitch(time, strong) {
    if (reduceMotion) return;
    face.uniforms.uBandY.value = rand(-0.9, 0.95);
    face.uniforms.uBandH.value = rand(0.02, strong ? 0.14 : 0.07);
    face.uniforms.uBandShift.value = rand(-0.2, 0.2);
    glitchTarget = strong ? 1 : 0.5;
    glitchUntil = time + rand(0.07, strong ? 0.3 : 0.15);
  }

  /* frame loop */
  let introStart = 0;
  let last = performance.now();
  const yaw = { v: 0 };
  const pitch = { v: 0 };
  const tmp = new THREE.Color();
  let firstFrame = true;

  function cameraAt(s) {
    let x = 0;
    let y;
    let z;
    if (s <= T.heroEnd) {
      const u = smooth(s / T.heroEnd);
      y = lerp(0, -0.9, u);
      z = lerp(dist0, camZ, u);
    } else {
      z = camZ;
      if (s < T.pStart) {
        const u = smooth((s - T.heroEnd) / (T.pStart - T.heroEnd));
        y = lerp(-0.9, SCREEN_Y0, u);
        x = screens[0].userData.base.x * 0.42 * u;
      } else {
        y = SCREEN_Y0 - ((s - T.pStart) / T.pStep) * SCREEN_GAP;
        const k = (s - T.pStart) / T.pStep;
        const i0 = clamp(Math.floor(k), 0, N - 1);
        const i1 = clamp(i0 + 1, 0, N - 1);
        const f = smooth(clamp(k - i0, 0, 1));
        x = lerp(screens[i0].userData.base.x, screens[i1].userData.base.x, f) * 0.42 * (1 - range(s, T.pEnd, T.pEnd + 0.6));
      }
    }
    return { x, y, z };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const time = now / 1000;
    if (paused) return;

    current = damp(current, target, reduceMotion ? 14 : 6.5, dt);
    if (Math.abs(current - target) < 0.0005) current = target;
    const s = current;

    /* intro */
    const intro = ready ? range(time - introStart, 0, 1.8) : 0;
    if (!reduceMotion) {
      face.uniforms.uIntro.value = smooth(intro);
      postU.uStatic.value = ready ? 1 - smooth(range(time - introStart, 0.1, 1.3)) : 1;
    }

    /* face motion */
    const heroWeight = 1 - range(s, 0, T.heroEnd + 0.5);
    const idle = reduceMotion ? 0 : Math.sin(time * 0.35) * 0.28 + Math.sin(time * 0.13) * 0.12;
    const px = pointer.inside ? pointer.x : 0;
    const py = pointer.inside ? pointer.y : 0;
    yaw.v = damp(yaw.v, idle + px * 0.45 * heroWeight, 2.4, dt);
    pitch.v = damp(pitch.v, (reduceMotion ? 0 : Math.sin(time * 0.27) * 0.04) + py * 0.14 * heroWeight, 2.4, dt);
    const turn = clamp(yaw.v / 0.55, -1, 1);
    face.setTurn(turn);
    faceGroup.rotation.set(pitch.v * 0.5, turn * 0.12, 0);

    /* glitches */
    if (!reduceMotion && ready && time > nextGlitch) {
      glitch(time, Math.random() < 0.35);
      nextGlitch = time + rand(2.2, 5.5);
    }
    if (time > glitchUntil) {
      face.uniforms.uBandShift.value = 0;
      glitchTarget = 0;
    }
    postU.uGlitch.value = damp(postU.uGlitch.value, glitchTarget, 30, dt);
    postU.uTime.value = time;

    /* camera */
    const c = cameraAt(s);
    const sway = pointer.inside && !reduceMotion ? pointer.x * 0.08 * (1 - heroWeight) : 0;
    cam.position.set(c.x + sway, c.y, c.z);
    cam.lookAt(c.x * 0.6, c.y - 0.05, 0);
    cam.rotateZ(reduceMotion ? 0 : Math.sin(s * 0.8) * 0.012 * (1 - heroWeight));

    /* hero screen */
    const hu = smooth(range(s, 0, T.heroEnd));
    heroMat.uniforms.uBend.value = hu * 0.1;
    heroMat.uniforms.uRound.value = range(s, 0.02, 0.45);
    hero.rotation.x = -hu * 0.1;
    hero.visible = c.y > -6.5;

    /* project screens */
    screens.forEach((m, i) => {
      const b = m.userData.base;
      const dy = b.y - c.y;
      m.position.copy(b);
      m.rotation.set(clamp(dy * 0.11, -0.32, 0.32), m.userData.rotY, m.userData.rotZ);
      const u = m.material.uniforms;
      u.uHover.value = damp(u.uHover.value, hovered === i ? 1 : 0, 10, dt);
      u.uDim.value = clamp(Math.abs(dy) / 4 - 0.1, 0, 0.5);
      m.visible = Math.abs(dy) < 6;
      m.scale.setScalar(SCREEN_H * (1 + u.uHover.value * 0.035));
    });

    /* background */
    const toLight = smooth(range(s, 0.15, 1.0));
    const toAbout = smooth(range(s, T.pEnd + 0.3, T.about - 0.3));
    const toEnd = smooth(range(s, T.about + 0.4, T.contact));
    tmp.copy(BG.dark).lerp(BG.light, toLight).lerp(BG.about, toAbout).lerp(BG.end, toEnd);
    world.background.copy(tmp);

    /* hover */
    const inWork = s > T.heroEnd && s < T.pEnd + 0.8;
    const h = inWork && pointer.inside && !blocked() && !touch ? pick(pointer.cx, pointer.cy) : -1;
    if (h !== hovered) {
      hovered = h;
      canvas.style.cursor = h >= 0 ? "pointer" : "";
      label.classList.toggle("is-on", h >= 0);
      if (h >= 0) glitch(time, false);
    }
    if (h >= 0) label.style.translate = `${pointer.cx + 16}px ${pointer.cy + 18}px`;

    /* HUD */
    const heroIn = ready ? range(time - introStart, 0.5, 1.2) : 0;
    setSection("hero", heroIn * (1 - range(s, 0.05, 0.55)));
    setSection("work", range(s, T.pStart - 0.7, T.pStart - 0.25) * (1 - range(s, T.pEnd + 0.25, T.pEnd + 0.7)));
    setSection("about", range(s, T.about - 0.6, T.about - 0.15) * (1 - range(s, T.about + 0.45, T.about + 0.85)));
    setSection("contact", range(s, T.contact - 0.7, T.contact - 0.2));
    const active = clamp(Math.round((s - T.pStart) / T.pStep), 0, N - 1);
    workButtons.forEach((b, i) => b.setAttribute("aria-current", String(i === active)));

    /* render */
    if (hero.visible) {
      renderer.setRenderTarget(faceRT);
      renderer.render(faceScene, faceCam);
    }
    renderer.setRenderTarget(mainRT);
    renderer.render(world, cam);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);

    if (firstFrame) {
      firstFrame = false;
      setProgress(1);
      setTimeout(() => {
        $("#loader")?.classList.add("is-done");
        ready = true;
        introStart = performance.now() / 1000;
        body.classList.add("is-ready");
        $$("[data-scramble]", $(".hud-top")).forEach((n) => scramble(n, 600));
      }, 350);
    }
  }

  window.__crtReady = true;
  requestAnimationFrame(frame);
}

main().catch((err) => {
  console.error(err);
  fallback();
});
