/* DirecSun 3D explorer. One self-contained script, no build step.
 *
 * Usage on any page:
 *   <div id="direcsun-3d" style="height:640px"></div>
 *   <script src="direcsun-3d.js"></script>
 *
 * Optional: <div id="direcsun-3d" data-glb="/assets/hardware-stack.glb"> loads the real CAD export
 * (the same file the DirecSun ground station shows). Without a GLB, or if it fails to load, the
 * script draws a stylised stack from the CAD dimensions. Three.js 0.160.0 loads from esm.sh.
 */
(async () => {
  const THREE_URL = 'https://esm.sh/three@0.160.0';
  const THREE = await import(THREE_URL);
  const { OrbitControls } = await import('https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js');
  const { GLTFLoader } = await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('https://esm.sh/three@0.160.0/examples/jsm/libs/meshopt_decoder.module.js');

  const host = document.getElementById('direcsun-3d');
  if (!host) return console.warn('direcsun-3d: add <div id="direcsun-3d"> to the page');
  if (!host.style.height && host.clientHeight < 200) host.style.height = '640px';
  host.style.position = 'relative';
  host.style.overflow = 'hidden';
  host.style.background = '#0b0b0c';
  host.style.borderRadius = '12px';

  /* ---------- the stack, bottom to top (CAD z in mm, from cad/assembly.py) ---------- */
  const GROUPS = [
    { id: 'base', name: 'Base hub and bolt', z: -31, info: 'Fixed to the bench. The M8 bolt runs up through both bearings, so the whole box turns around it on two 608 bearings.' },
    { id: 'bottom', name: 'Bottom cap and bearings', z: 0, info: 'Holds the two 608 bearings 25 mm apart in a boss, and carries the four corner columns for the threaded rods.' },
    { id: 'motor', name: 'Motor deck and flywheel', z: 38, info: '2212 brushless motor with the flywheel on its bell, a Hall bracket that counts magnet passes for wheel speed, and a guard ring around the wheel.' },
    { id: 'power', name: 'Power deck', z: 95, info: 'The ESC, the fuse and 5 V buck on a perfboard. One star ground returns to the battery pack.' },
    { id: 'battery', name: 'Battery deck', z: 126, info: 'Printed holder for 8 AA NiMH cells wired in series, about 9.6 V nominal, with screw-head spring contacts.' },
    { id: 'avionics', name: 'Avionics deck', z: 165, info: 'XIAO ESP32-S3 on a carrier board, the MPU-6050 gyro and accelerometer on the spin axis, and the two OP550 sun sensors.' },
    { id: 'top', name: 'Top deck', z: 223, info: 'Installed flipped. The QMC5883P magnetometer and BMP280 hang underneath, far from the motor so its fields stay off the compass.' },
    { id: 'pin', name: 'Lock pin', z: 0, info: 'A printed pin that locks the box to the base hub during spin-up so the reaction torque cannot turn it. Pulled at READY.' },
  ];
  const BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g]));
  const RULES = [
    [/^(base|bolt)/, 'base'], [/^(bottom_cap|bearing)/, 'bottom'], [/^lock_pin/, 'pin'],
    [/^(motor|hall|flywheel|washer|shaft|wheel)/, 'motor'], [/^(power|esc|board_power)/, 'power'],
    [/^(battery|aa_cells|contacts|foot_screw)/, 'battery'], [/^(avionics|board_xiao|xiao|mpu6050)/, 'avionics'],
    [/^(top_deck|qmc|bmp)/, 'top'],
  ];
  const groupOf = (name) => { const n = (name || '').toLowerCase(); for (const [re, id] of RULES) if (re.test(n)) return id; return null; };

  /* ---------- scene ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303038, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(0.4, 0.8, 0.6); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.8); fill.position.set(-0.6, 0.2, -0.5); scene.add(fill);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 20);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.2;
  const stack = new THREE.Group(); scene.add(stack);

  const MAT = {
    printed: () => new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.8, metalness: 0 }),
    black: () => new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.7, metalness: 0 }),
    steel: () => new THREE.MeshStandardMaterial({ color: 0x8c929c, roughness: 0.4, metalness: 0.8 }),
    board: () => new THREE.MeshStandardMaterial({ color: 0x1f7a52, roughness: 0.6, metalness: 0.1 }),
    cell: () => new THREE.MeshStandardMaterial({ color: 0xd9a21b, roughness: 0.5, metalness: 0.3 }),
    esc: () => new THREE.MeshStandardMaterial({ color: 0x3a5f9e, roughness: 0.6, metalness: 0.1 }),
    sun: () => new THREE.MeshStandardMaterial({ color: 0xff9d2e, roughness: 0.4, metalness: 0 }),
  };
  const EDGE = () => new THREE.LineBasicMaterial({ color: 0x15151a, transparent: true, opacity: 0.55 });
  const MM = 0.001;
  const owners = {}; GROUPS.forEach((g) => (owners[g.id] = []));
  const pickables = [];
  const rods = [];

  /* ---------- stylised model, built from the CAD dimensions ---------- */
  function buildProcedural() {
    const add = (gid, geo, mat, x, y, z) => {  // CAD frame: x, y horizontal, z up (mm)
      const m = new THREE.Mesh(geo, mat());
      m.position.set(x * MM, z * MM, -y * MM);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), EDGE()));
      m.userData.group = gid; pickables.push(m);
      const holder = new THREE.Group(); holder.add(m); holder.userData.group = gid;
      stack.add(holder); owners[gid].push(holder);
      return m;
    };
    const box = (w, d, h) => new THREE.BoxGeometry(w * MM, h * MM, d * MM);
    const cyl = (r, h, seg = 40) => new THREE.CylinderGeometry(r * MM, r * MM, h * MM, seg);
    const C = 45.75;
    const corners = [[C, C], [-C, C], [C, -C], [-C, -C]];
    const deck = (gid, z, t, colour, colTop) => {
      add(gid, box(100, 100, t), colour, 0, 0, z + t / 2);
      if (colTop) corners.forEach(([x, y]) => add(gid, box(8.5, 8.5, colTop - z - t), colour, x, y, (z + t + colTop) / 2));
    };
    // base hub and bolt
    add('base', cyl(42, 31), MAT.printed, 0, 0, -15.5);
    add('base', cyl(4, 60, 16), MAT.steel, 0, 0, 5);
    // bottom cap, boss, bearings
    deck('bottom', 0, 4, MAT.printed, 38);
    add('bottom', cyl(15, 32), MAT.printed, 0, 0, 16);
    [[0, 7], [25, 32]].forEach(([a, b]) => add('bottom', cyl(11, b - a), MAT.steel, 0, 0, (a + b) / 2));
    // motor deck, motor, flywheel, guard, hall bracket
    deck('motor', 38, 5, MAT.printed, 95);
    add('motor', cyl(14, 31), MAT.steel, 0, 0, 59);
    add('motor', cyl(31.75, 4, 56), MAT.steel, 0, 0, 77);
    const guard = new THREE.Mesh(new THREE.TorusGeometry(38 * MM, 2.5 * MM, 10, 56), MAT.printed());
    guard.rotation.x = Math.PI / 2; guard.position.set(0, 77 * MM, 0); guard.userData.group = 'motor';
    const gh = new THREE.Group(); gh.add(guard); gh.userData.group = 'motor'; stack.add(gh); owners.motor.push(gh); pickables.push(guard);
    add('motor', box(6, 12, 22), MAT.printed, 28, -28, 54);
    // power deck, perfboard, ESC
    deck('power', 95, 4, MAT.printed, 126);
    add('power', box(70, 50, 1.6), MAT.board, -12, 0, 101);
    add('power', box(36, 18, 8), MAT.esc, 24, 0, 103);
    // battery deck, holder, eight cells
    deck('battery', 126, 4, MAT.printed, 165);
    add('battery', box(75, 62.7, 32.7), MAT.printed, -4, 0, 146.4);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) add('battery', cyl(7, 30, 20), MAT.cell, -26 + c * 15 - 4, -7.5 + r * 15, 146.4);
    // avionics deck, boards, sun sensors
    deck('avionics', 165, 4, MAT.black, 223);
    add('avionics', box(50, 35, 1.6), MAT.board, 0, -18, 173);
    add('avionics', box(25.4, 17.8, 1.6), MAT.board, 0, 6, 175);
    add('avionics', box(12, 8, 3), MAT.steel, 0, -26, 176);
    add('avionics', box(14, 24, 10), MAT.sun, 42, 0, 174);
    // top deck (flipped), magnetometer and barometer hanging below
    deck('top', 223, 4, MAT.printed, 0);
    add('top', box(25.4, 17.8, 1.6), MAT.board, 0, 20, 217);
    add('top', box(25.4, 17.8, 1.6), MAT.board, 0, -20, 217);
    // lock pin
    add('pin', cyl(3, 33, 14), MAT.printed, 30, 0, 6);
    // threaded rods, shown with the base group so they never float alone
    corners.forEach(([x, y]) => {
      const rod = add('bottom', cyl(2.2, 237, 12), MAT.steel, x, y, 110);
      const holder = rod.parent; owners.bottom.splice(owners.bottom.indexOf(holder), 1); rods.push(holder);
    });
  }

  /* ---------- the real CAD export ---------- */
  async function loadGlb(url) {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);  // the CAD export is meshopt-compressed
    const gltf = await loader.loadAsync(url);
    const root = gltf.scene; stack.add(root); root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh && !o.isLine && !o.isLineSegments) return;
      let gid = null, owner = null;
      for (let p = o; p && p !== root.parent; p = p.parent) { const g = groupOf(p.name); if (g) { gid = g; owner = p; } }
      if (!gid) return;
      o.material = o.material.clone(); o.userData.group = gid;
      if (o.isMesh) pickables.push(o);
      if (!owners[gid].includes(owner)) owners[gid].push(owner);
    });
  }

  /* ---------- state: explode, isolate, x-ray, selection ---------- */
  let explode = 0, selected = null, xray = false;
  const base = new Map();
  const spreadM = 0.045;
  function layout() {
    GROUPS.forEach((g, i) => owners[g.id].forEach((o) => {
      if (!base.has(o)) base.set(o, o.position.y);
      o.position.y = base.get(o) + explode * spreadM * (g.id === 'pin' ? 0 : i);
    }));
    rods.forEach((r) => (r.visible = explode < 0.02));
  }
  function restyle() {
    scene.traverse((o) => {
      const gid = o.userData && o.userData.group; if (!gid || !o.material) return;
      const dim = selected && selected !== gid;
      o.material.transparent = dim || xray || o.isLine || o.isLineSegments;
      o.material.opacity = dim ? 0.07 : xray ? 0.28 : (o.isLine || o.isLineSegments ? 0.55 : 1);
      o.material.depthWrite = !(dim || xray);
      if (o.material.emissive) o.material.emissive.setHex(selected === gid ? 0x663300 : 0x000000);
    });
    scene.traverse((o) => { if (o.isLineSegments && !o.userData.group) o.visible = true; });
    list.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === selected));
    const g = selected && BY_ID[selected];
    info.innerHTML = g ? `<b>${g.name}</b><br>${g.info}` : '<b>DirecSun</b><br>Desk-sized CubeSat: a flywheel inside a 3D-printed 2U frame turns the whole box. Pick a part to isolate it.';
  }

  /* ---------- UI ---------- */
  const css = document.createElement('style');
  css.textContent = `.ds-ui{position:absolute;font:13px/1.4 system-ui,sans-serif;color:#e8e8ea}
  .ds-panel{top:12px;left:12px;width:230px;background:#141417cc;border:1px solid #2b2b31;border-radius:10px;padding:10px;backdrop-filter:blur(6px)}
  .ds-panel button{display:block;width:100%;text-align:left;margin:2px 0;padding:6px 8px;border:1px solid #2b2b31;border-radius:6px;background:#1b1b20;color:#e8e8ea;cursor:pointer;font:inherit}
  .ds-panel button:hover{border-color:#ff9d2e}.ds-panel button.on{background:#ff9d2e;color:#1a1100;border-color:#ff9d2e}
  .ds-panel input[type=range]{width:100%}.ds-row{display:flex;gap:6px}.ds-row button{text-align:center}
  .ds-info{bottom:12px;left:12px;right:12px;max-width:520px;background:#141417cc;border:1px solid #2b2b31;border-radius:10px;padding:10px 12px}
  .ds-hint{top:12px;right:14px;color:#8d8d96;font-size:12px}`;
  document.head.appendChild(css);
  const panel = document.createElement('div'); panel.className = 'ds-ui ds-panel';
  panel.innerHTML = '<label>Explode<input type="range" min="0" max="1" step="0.01" value="0"></label><div class="ds-row"><button data-a="spin">Auto-rotate</button><button data-a="xray">X-ray</button></div><div class="ds-row"><button data-a="iso">Iso</button><button data-a="front">Front</button><button data-a="top">Top</button></div><div class="parts" style="margin-top:6px"></div><button data-a="reset" style="margin-top:6px">Show all</button>';
  const list = panel.querySelector('.parts');
  GROUPS.slice().reverse().forEach((g) => { const b = document.createElement('button'); b.dataset.id = g.id; b.textContent = g.name; list.appendChild(b); });
  const info = document.createElement('div'); info.className = 'ds-ui ds-info';
  const hint = document.createElement('div'); hint.className = 'ds-ui ds-hint'; hint.textContent = 'Drag to turn, scroll to zoom, click a part';
  host.append(panel, info, hint);

  let frame = { target: new THREE.Vector3(0, 0.11, 0), dist: 0.9 };
  const view = (dir) => { camera.position.copy(frame.target).addScaledVector(dir.normalize(), frame.dist); controls.target.copy(frame.target); controls.update(); };
  const pick = (id) => { selected = selected === id ? null : id; restyle(); };
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.id) return pick(b.dataset.id);
    const a = b.dataset.a;
    if (a === 'spin') controls.autoRotate = !controls.autoRotate;
    if (a === 'xray') { xray = !xray; restyle(); }
    if (a === 'reset') { selected = null; restyle(); }
    if (a === 'iso') view(new THREE.Vector3(1, 0.55, 1));
    if (a === 'front') view(new THREE.Vector3(0, 0.12, 1));
    if (a === 'top') view(new THREE.Vector3(0.001, 1, 0.001));
  });
  panel.querySelector('input').addEventListener('input', (e) => { explode = +e.target.value; layout(); });
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; controls.autoRotate = false; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) pick(hit.object.userData.group); else { selected = null; restyle(); }
  });

  /* ---------- go ---------- */
  const glb = host.dataset.glb;
  let usedGlb = false;
  if (glb) { try { await loadGlb(glb); usedGlb = true; } catch (err) { console.warn('direcsun-3d: GLB failed, drawing the stylised model', err); } }
  if (!usedGlb) buildProcedural();
  const bounds = new THREE.Box3().setFromObject(stack);
  bounds.getCenter(frame.target); frame.target.y += spreadM * 3;
  const size = bounds.getSize(new THREE.Vector3());
  frame.dist = ((Math.max(size.y, size.x, size.z) + spreadM * 3) / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.25;
  layout(); restyle(); view(new THREE.Vector3(1, 0.55, 1));
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(host); resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
  window.direcsun3d = { scene, camera, controls, setExplode: (v) => { explode = v; layout(); }, select: pick, usedGlb };
})();
