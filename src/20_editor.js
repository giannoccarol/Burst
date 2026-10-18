// ===================================================================
// Map editor: fly camera, catalog with thumbnails, grid-snapped placement,
// move/rotate/scale gizmo, inspector, undo/redo, local saves, shared
// publishing through the artifact database, and play-testing with bots.
// ===================================================================
const ED_INDEX = 'maps';
const SKY_CHIPS = {
  mattina: ['#6fa3e0', '#d5e2ee'], mezzogiorno: ['#3d7fd6', '#c2d9ee'], borgo: ['#7fa6d6', '#ecc9a0'], tramonto: ['#4a4f8a', '#ff8a4c'],
  alba: ['#6b7fb3', '#f2a77a'], notte: ['#050914', '#22305a'], nuvoloso: ['#8f979e', '#c5c9cb'], nebbia: ['#b4b8b8', '#dcdfdf'],
};
const VOLUME_KINDS = new Set(['zone', 'water', 'kill', 'clip']);
function edNewId() { return 'm' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36); }
function edSnap(v, g) { return Math.round(v / g) * g; }
function edR(v) { return Math.round(v * 100) / 100; }
function normAngle(a) { a = a % TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; }
function edNum(v) { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; }

const Editor = {
  active: false, inited: false, objs: [], sel: null, tool: null, ghost: null, ghostObj: null, ghostR: 0, ghostPos: null,
  grid: 0.5, rotSnap: 15, mode: 'translate', name: '', env: { sky: 'mattina', ground: 'grass', size: 60 },
  mapId: null, dirty: false, savedT: 0, uidN: 1, undoS: [], redoS: [], lastSnap: null,
  camPos: new THREE.Vector3(0, 14, 26), yaw: 0, pitch: -0.5, keys: new Set(), looking: false,
  thumbs: {}, thumbQ: null, catTab: 'forme', search: '', lastMat: {}, lastTint: {}, matOpen: false, matGroup: null,
  shared: [], authors: {}, cache: {}, db: null, uid: null, dbReady: null, testing: false, testDef: null,
  mouse: new THREE.Vector2(), mouseIn: false, ray: new THREE.Raycaster(), lights: [], fields: {}, modalOpen: false,

  // ------------------------------------------------------------ lifecycle
  open(opts = {}) {
    if (this.active) return;
    if (!opts.resume && Game.state !== 'menu') return;
    this.active = true; Game.editor = this; Game.state = 'editor';
    HUD.showMenu(false); HUD.showHUD(false);
    Input.enabled = false; Input.wantLock = false; Input.exitLock();
    this.init();
    R.scene.add(this.world);
    this.hideGame(true);
    R.vmScene.visible = false;
    this.tc.enabled = true;
    $('#editor').hidden = false;
    if (!opts.resume) {
      const last = store.get('edLast', null);
      const def = typeof last === 'string' ? this.loadLocalDef(last) : null;
      if (def) this.load(def, last); else this.load(exampleMapDef(), edNewId());
    } else { this.applyEnv(); this.syncLights(); }
    this.layout();
    this.renderCatalog(); this.renderInspector(); this.updateHint(); this.updateStatus(); this.updateUndoBtns();
    if (!this.thumbQ) this.thumbQ = CATALOG.map((c) => ['o', c.id]).concat(EDIT_MATS.map((m) => ['m', m.id]));
    if (isTouchDevice()) HUD.toast('L\'editor è pensato per computer con mouse e tastiera');
    this.initDb();
  },
  close(toMenu = true) {
    if (!this.active) return;
    this.saveLocal(true);
    this.setTool(null); this.select(null);
    this.active = false; Game.editor = null;
    this.tc.enabled = false;
    this.looking = false; this.keys.clear();
    $('#editor').hidden = true; this.closeModal();
    R.scene.remove(this.world);
    if (toMenu) {
      Game.state = 'menu';
      this.hideGame(false);
      const mid = builtinMap(HUD.selMap) ? HUD.selMap : 'borgo', B = BUILTIN_MAPS[mid];
      if (Game.mapId !== mid) Game.loadMap(mid); else { R.applyEnv(B.env); R.setShadowExtent(B.shadow); }
      HUD.showMenu(true);
    }
  },
  hideGame(h) {
    const v = !h;
    if (Game.mapGroup) Game.mapGroup.visible = v;
    if (Game.backdrop && Game.backdrop.group) Game.backdrop.group.visible = v;
    if (Game.dynGroup) Game.dynGroup.visible = v;
    for (const l of Game.mapLights || []) l.visible = v;
  },
  init() {
    if (this.inited) return;
    this.inited = true;
    this.world = new THREE.Group(); this.world.name = 'editor';
    this.root = new THREE.Group(); this.world.add(this.root);
    this.groundGroup = new THREE.Group(); this.world.add(this.groundGroup);
    const tc = new TransformControls(R.camera, R.renderer.domElement);
    tc.setSize(0.95); tc.enabled = false;
    this.tc = tc; this.world.add(tc.getHelper());
    tc.addEventListener('dragging-changed', (e) => { if (e.value) this.gizmoBegin(); else this.gizmoEnd(); });
    tc.addEventListener('objectChange', () => this.gizmoChange());
    this.selBox = new THREE.Box3Helper(new THREE.Box3(), 0xffffff);
    this.selBox.material.depthTest = false; this.selBox.material.transparent = true; this.selBox.material.opacity = 0.85; this.selBox.material.toneMapped = false;
    this.selBox.renderOrder = 10; this.selBox.visible = false;
    this.world.add(this.selBox);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    this.bindUI(); this.bindInput();
  },

  // ------------------------------------------------------------ input
  bindInput() {
    const cv = R.renderer.domElement;
    cv.addEventListener('pointerdown', (e) => this.onDown(e));
    addEventListener('pointermove', (e) => this.onMove(e));
    addEventListener('pointerup', (e) => this.onUp(e));
    cv.addEventListener('wheel', (e) => { if (!this.active) return; e.preventDefault(); this.camPos.addScaledVector(this.forward(), -Math.sign(e.deltaY) * (e.shiftKey ? 6 : 2)); this.ghostDirty = true; }, { passive: false });
    addEventListener('keydown', (e) => this.onKeyDown(e));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.looking = false; });
    addEventListener('resize', () => { if (this.active) this.layout(); });
  },
  setMouse(e) {
    const r = R.renderer.domElement.getBoundingClientRect();
    this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  },
  onDown(e) {
    if (!this.active || this.modalOpen) return;
    this.setMouse(e);
    if (e.button === 2 || e.button === 1 || (e.button === 0 && e.altKey)) { this.looking = true; this.lookBtn = e.button; this.lx = e.clientX; this.ly = e.clientY; return; }
    if (e.button !== 0) return;
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    if (this.tc.dragging || (this.sel && this.tc.axis)) return;
    if (this.tool) { this.place(); return; }
    const hit = this.pick(true);
    this.select(hit ? hit.obj : null);
  },
  onMove(e) {
    if (!this.active) return;
    if (this.looking) {
      const dx = e.clientX - this.lx, dy = e.clientY - this.ly;
      this.lx = e.clientX; this.ly = e.clientY;
      this.yaw -= dx * 0.0045; this.pitch = clamp(this.pitch - dy * 0.0045, -1.52, 1.52);
      this.ghostDirty = true;
      return;
    }
    const over = e.target === R.renderer.domElement;
    if (over) { this.setMouse(e); this.ghostDirty = true; }
    if (over !== this.mouseIn) { this.mouseIn = over; this.ghostDirty = true; }
  },
  onUp(e) { if (this.looking && e.button === this.lookBtn) this.looking = false; },
  onKeyDown(e) {
    if (!this.active) return;
    const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if (this.modalOpen) { if (e.key === 'Escape') this.closeModal(); return; }
    if (typing) { if (e.key === 'Escape' || (e.key === 'Enter' && t.tagName === 'INPUT')) t.blur(); return; }
    const ctrl = e.ctrlKey || e.metaKey, k = e.code;
    if (ctrl && k === 'KeyZ') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (ctrl && k === 'KeyY') { e.preventDefault(); this.redo(); return; }
    if (ctrl && k === 'KeyS') { e.preventDefault(); if (this.saveLocal(false)) HUD.toast('Mappa salvata in questo browser'); return; }
    if (ctrl && k === 'KeyD') { e.preventDefault(); this.duplicate(); return; }
    if (ctrl) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Tab', 'Backspace'].includes(k)) e.preventDefault();
    this.keys.add(k);
    switch (k) {
      case 'Escape': if (this.tool) this.setTool(null); else this.select(null); break;
      case 'Delete': case 'Backspace': this.remove(); break;
      case 'KeyR': this.rotateStep(e.shiftKey ? -1 : 1); break;
      case 'KeyF': this.focusSel(); break;
      case 'Digit1': this.setMode('translate'); break;
      case 'Digit2': this.setMode('rotate'); break;
      case 'Digit3': this.setMode('scale'); break;
      case 'ArrowUp': this.nudge(0, 1); break;
      case 'ArrowDown': this.nudge(0, -1); break;
      case 'ArrowLeft': this.nudge(-1, 0); break;
      case 'ArrowRight': this.nudge(1, 0); break;
      case 'PageUp': this.nudgeY(1); break;
      case 'PageDown': this.nudgeY(-1); break;
      default: break;
    }
  },
  forward() { const cp = Math.cos(this.pitch); return new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp); },
  // camera-relative axes snapped to the world grid (for arrow-key nudges)
  camAxes() {
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const f = Math.abs(fx) > Math.abs(fz) ? [Math.sign(fx), 0] : [0, Math.sign(fz)];
    return { f, r: [-f[1], f[0]] };
  },

  // ------------------------------------------------------------ frame
  update(dt) {
    if (!this.active) return;
    const k = this.keys;
    if (!this.modalOpen) {
      const fast = k.has('ShiftLeft') || k.has('ShiftRight');
      const sp = (fast ? 30 : 11) * dt;
      const f = this.forward(), r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const mv = new THREE.Vector3();
      if (k.has('KeyW')) mv.add(f);
      if (k.has('KeyS')) mv.sub(f);
      if (k.has('KeyD')) mv.add(r);
      if (k.has('KeyA')) mv.sub(r);
      if (k.has('KeyE') || k.has('Space')) mv.y += 1;
      if (k.has('KeyQ') || k.has('KeyC')) mv.y -= 1;
      if (mv.lengthSq() > 0) { this.camPos.addScaledVector(mv.normalize(), sp); this.ghostDirty = true; }
    }
    const lim = this.env.size / 2 + 80;
    this.camPos.set(clamp(this.camPos.x, -lim, lim), clamp(this.camPos.y, 0.3, 180), clamp(this.camPos.z, -lim, lim));
    const cam = R.camera;
    cam.position.copy(this.camPos);
    cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    if (cam.fov !== 70) { cam.fov = 70; cam.updateProjectionMatrix(); }
    if (this.tool && this.ghostDirty) { this.ghostDirty = false; this.updateGhost(); }
    if (this.sel && this.selBox.visible) this.selBox.box.setFromObject(this.sel.group);
    this.processThumbs();
    if (this.dirty && performance.now() - (this.autoT || 0) > 8000) { this.autoT = performance.now(); this.saveLocal(true); }
  },

  // ------------------------------------------------------------ objects
  makeObj(o) {
    o.uid = this.uidN++;
    o.group = new THREE.Group();
    o.group.userData.obj = o;
    this.root.add(o.group);
    this.rebuild(o);
    this.objs.push(o);
    return o;
  },
  rebuild(o) {
    const g = o.group;
    for (const ch of g.children.slice()) { ch.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); g.remove(ch); }
    const ctx = buildObject(o);
    const vis = new THREE.Group(); ctx.G.build(vis); g.add(vis);
    if (ctx.E.parts.size) {
      const eg = new THREE.Group(); eg.userData.helper = true; eg.userData.vol = VOLUME_KINDS.has(o.k);
      ctx.E.build(eg, { cast: false });
      for (const m of eg.children) m.renderOrder = 2;
      g.add(eg);
    }
    o.meta = ctx.meta;
    this.applyXf(o);
  },
  applyXf(o) {
    const u = objScale(o);
    o.group.position.set(o.p[0], o.p[1], o.p[2]);
    o.group.rotation.set(0, o.r || 0, 0);
    o.group.scale.set(u, u, u);
    o.group.updateMatrixWorld(true);
  },
  removeObj(o) {
    o.group.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
    this.root.remove(o.group);
    const i = this.objs.indexOf(o); if (i >= 0) this.objs.splice(i, 1);
  },
  clearAll() { for (const o of this.objs.slice()) this.removeObj(o); this.objs = []; },
  serialize() { return { v: 1, name: this.name || 'Mappa senza nome', env: Object.assign({}, this.env), o: this.objs.map(encObj) }; },
  snapshot() { return JSON.stringify({ n: this.name, e: this.env, l: this.objs.map((o) => [o.uid, encObj(o)]) }); },
  load(defIn, id) {
    const def = normDef(defIn);
    this.select(null); this.setTool(null);
    this.clearAll();
    this.name = def.name; this.env = Object.assign({}, def.env); this.mapId = id || edNewId();
    for (const o of decodeObjs(def)) this.makeObj(o);
    $('#ed-name').value = this.name;
    this.applyEnv();
    this.undoS = []; this.redoS = []; this.lastSnap = this.snapshot(); this.dirty = false; this.savedT = 0;
    const h = this.env.size / 2;
    this.camPos.set(h * 0.55, h * 0.42 + 6, h * 0.95);
    this.yaw = Math.atan2(this.camPos.x, this.camPos.z); this.pitch = -0.42;
    this.syncLights(); this.renderInspector(); this.updateStatus(); this.updateUndoBtns();
    store.set('edLast', this.mapId);
  },
  commit() {
    const s = this.snapshot();
    if (s === this.lastSnap) return;
    if (this.lastSnap) { this.undoS.push(this.lastSnap); if (this.undoS.length > 120) this.undoS.shift(); }
    this.redoS.length = 0;
    this.lastSnap = s;
    this.dirty = true;
    this.syncLights(); this.updateStatus(); this.updateUndoBtns();
    if (!this.sel) this.renderInspector();
  },
  undo() { if (!this.undoS.length) return; this.redoS.push(this.lastSnap); this.restore(this.undoS.pop()); },
  redo() { if (!this.redoS.length) return; this.undoS.push(this.lastSnap); this.restore(this.redoS.pop()); },
  restore(s) {
    const d = JSON.parse(s);
    const selUid = this.sel && this.sel.uid;
    this.select(null);
    const byUid = new Map(this.objs.map((o) => [o.uid, o]));
    const order = [], keep = new Set();
    for (const [uid, enc] of d.l) {
      let o = byUid.get(uid);
      if (o && JSON.stringify(encObj(o)) === JSON.stringify(enc)) { keep.add(uid); order.push(o); continue; }
      const nd = decObj(enc, 400);
      if (!nd) continue;
      if (o) { Object.assign(o, { k: nd.k, p: nd.p, s: nd.s, r: nd.r, m: nd.m, c: nd.c, a: nd.a, seed: nd.seed }); this.rebuild(o); }
      else { o = this.makeObj(nd); o.uid = uid; this.uidN = Math.max(this.uidN, uid + 1); }
      keep.add(uid); order.push(o);
    }
    for (const o of this.objs.slice()) if (!keep.has(o.uid)) this.removeObj(o);
    this.objs = order;
    const envChanged = JSON.stringify(d.e) !== JSON.stringify(this.env);
    this.name = d.n; this.env = Object.assign({}, d.e);
    $('#ed-name').value = this.name;
    if (envChanged) this.applyEnv();
    this.lastSnap = s; this.dirty = true;
    this.select(this.objs.find((o) => o.uid === selUid) || null);
    this.syncLights(); this.updateUndoBtns(); this.updateStatus();
    if (!this.sel) this.renderInspector();
  },
  syncLights() {
    for (const l of this.lights) { this.world.remove(l); l.dispose(); }
    this.lights = [];
    for (const o of this.objs) {
      if (!o.meta || !o.meta.light || this.lights.length >= MAP_LIMITS.lights) continue;
      const L = o.meta.light;
      const pl = new THREE.PointLight(new THREE.Color(L.color), L.intensity, L.dist, 2);
      pl.position.set(o.p[0], o.p[1] + L.y * objScale(o), o.p[2]);
      this.world.add(pl); this.lights.push(pl);
    }
  },
  applyEnv() {
    R.applyEnv(this.env.sky);
    R.setShadowExtent(this.env.size / 2 + 8);
    for (const ch of this.groundGroup.children.slice()) {
      ch.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.userData.own && m.material) m.material.dispose(); });
      this.groundGroup.remove(ch);
    }
    const half = this.env.size / 2;
    if (this.env.ground !== 'none') {
      const G = new GeoBuilder(), gm = emat(this.env.ground), ext = 700;
      G.quad(gm, [-ext, 0, ext], [ext, 0, ext], [ext, 0, -ext], [-ext, 0, -ext]);
      G.build(this.groundGroup, { cast: false });
    }
    const grid = new THREE.GridHelper(this.env.size, this.env.size, 0xffffff, 0xffffff);
    grid.material.transparent = true; grid.material.opacity = this.env.ground === 'none' ? 0.3 : 0.12; grid.material.depthWrite = false; grid.material.toneMapped = false;
    grid.position.y = 0.015; grid.userData.own = true;
    this.groundGroup.add(grid);
    const c = [[-half, -half], [half, -half], [half, half], [-half, half]];
    const pts = [];
    for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; pts.push(new THREE.Vector3(a[0], 0.04, a[1]), new THREE.Vector3(b[0], 0.04, b[1])); }
    const bl = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xf2384e, toneMapped: false }));
    bl.userData.own = true;
    this.groundGroup.add(bl);
  },

  // ------------------------------------------------------------ placing & picking
  pick(includeHelpers) {
    this.ray.setFromCamera(this.mouse, R.camera);
    const hits = this.ray.intersectObjects(this.root.children, true);
    let volHit = null;
    for (const h of hits) {
      let o = h.object, helper = false, vol = false, obj = null;
      while (o && o !== this.root) {
        if (o.userData.helper) { helper = true; vol = !!o.userData.vol; }
        if (o.userData.obj) { obj = o.userData.obj; break; }
        o = o.parent;
      }
      if (!obj) continue;
      if (helper && !includeHelpers) continue;
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : UP.clone();
      const res = { obj, point: h.point.clone(), normal: n };
      if (vol) { if (!volHit) volHit = res; continue; }
      return res;
    }
    if (includeHelpers) return volHit;
    const gp = this.groundPoint();
    return gp ? { obj: null, point: gp, normal: UP.clone() } : null;
  },
  groundPoint() {
    const r = this.ray.ray;
    if (Math.abs(r.direction.y) < 1e-4) return null;
    const t = -r.origin.y / r.direction.y;
    if (t < 0 || t > 600) return null;
    return r.origin.clone().addScaledVector(r.direction, t);
  },
  setTool(id) {
    this.disposeGhost();
    this.tool = id || null;
    if (this.tool) { this.select(null); this.makeGhost(); this.ghostDirty = true; }
    $$('#ed-tiles .ed-tile').forEach((t) => t.classList.toggle('on', t.dataset.id === this.tool));
    this.updateHint();
  },
  makeGhost() {
    const o = newObj(this.tool);
    o.seed = (Math.random() * 4294967295) >>> 0;
    if (this.lastMat[o.k] && o.m) o.m = this.lastMat[o.k];
    if (this.lastTint[o.k] !== undefined) o.c = this.lastTint[o.k];
    const ctx = buildObject(o);
    const g = new THREE.Group();
    ctx.G.build(g, { cast: false }); ctx.E.build(g, { cast: false });
    g.traverse((m) => { if (m.isMesh) { m.material = this.ghostMat; m.castShadow = false; m.receiveShadow = false; m.renderOrder = 3; } });
    g.scale.setScalar(objScale(o));
    g.updateMatrixWorld(true);
    this.ghostBox = new THREE.Box3().setFromObject(g);
    g.visible = false;
    this.ghost = g; this.ghostObj = o;
    this.world.add(g);
  },
  disposeGhost() {
    if (!this.ghost) return;
    this.ghost.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
    this.world.remove(this.ghost);
    this.ghost = null; this.ghostObj = null; this.ghostPos = null;
  },
  updateGhost() {
    const g = this.ghost;
    if (!g) return;
    if (!this.mouseIn || this.looking) { g.visible = false; return; }
    const hit = this.pick(false);
    if (!hit) { g.visible = false; return; }
    const bb = this.ghostBox, h = bb.max.y - bb.min.y, n = hit.normal, pt = hit.point;
    let p;
    if (n.y > 0.6) p = pt.clone();
    else if (n.y < -0.6) p = new THREE.Vector3(pt.x, Math.max(0, pt.y - h), pt.z);
    else {
      const r = this.ghostR, cx = Math.cos(r), sx = Math.sin(r);
      const ex = (bb.max.x - bb.min.x) / 2, ez = (bb.max.z - bb.min.z) / 2;
      const hn = new THREE.Vector3(n.x, 0, n.z).normalize();
      const ext = Math.abs(hn.x * cx - hn.z * sx) * ex + Math.abs(hn.x * sx + hn.z * cx) * ez;
      p = pt.clone().addScaledVector(hn, ext);
      p.y = hit.obj ? hit.obj.p[1] : Math.max(0, pt.y - h / 2);
    }
    const half = this.env.size / 2;
    p.x = clamp(edSnap(p.x, this.grid), -half, half);
    p.z = clamp(edSnap(p.z, this.grid), -half, half);
    p.y = edR(p.y);
    g.position.copy(p); g.rotation.set(0, this.ghostR, 0);
    g.visible = true;
    this.ghostPos = p;
  },
  place() {
    if (!this.ghost || !this.ghost.visible || !this.ghostPos) return;
    if (this.objs.length >= MAP_LIMITS.objects) { HUD.toast('Hai raggiunto il limite di ' + MAP_LIMITS.objects + ' oggetti'); return; }
    const o = this.ghostObj;
    o.p = [this.ghostPos.x, this.ghostPos.y, this.ghostPos.z];
    o.r = normAngle(this.ghostR);
    this.makeObj(o);
    this.commit();
    SFX.ui();
    this.disposeGhost(); this.makeGhost(); this.ghostDirty = true;
  },

  // ------------------------------------------------------------ selection & gizmo
  select(o) {
    this.sel = o || null;
    if (this.sel) { this.tc.attach(this.sel.group); this.applyGizmo(); this.selBox.visible = true; this.selBox.box.setFromObject(this.sel.group); }
    else { this.tc.detach(); this.selBox.visible = false; }
    this.matOpen = false;
    this.renderInspector(); this.updateHint();
  },
  setMode(m) {
    this.mode = m;
    $$('#ed-mode button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
    this.applyGizmo();
  },
  applyGizmo() {
    const tc = this.tc, o = this.sel;
    if (!o) return;
    const def = CAT_BY_ID[o.k];
    let m = this.mode;
    if (m === 'scale' && def.rs === RS_NONE) m = 'translate';
    tc.setMode(m);
    tc.showX = m !== 'rotate'; tc.showZ = m !== 'rotate'; tc.showY = true;
    tc.setSpace(m === 'translate' ? 'world' : 'local');
    tc.setTranslationSnap(this.grid); tc.setRotationSnap(this.rotSnap * DEG); tc.setScaleSnap(null);
  },
  gizmoBegin() { if (this.sel) this.gzU = objScale(this.sel); },
  gizmoChange() {
    const o = this.sel;
    if (!o) return;
    const g = o.group, def = CAT_BY_ID[o.k];
    if (this.tc.mode === 'translate') o.p = [edR(g.position.x), edR(g.position.y), edR(g.position.z)];
    else if (this.tc.mode === 'rotate') { const e = new THREE.Euler().setFromQuaternion(g.quaternion, 'YXZ'); o.r = e.y; g.rotation.set(0, e.y, 0); }
    else if (def.rs === RS_U) {
      const s = [g.scale.x, g.scale.y, g.scale.z];
      let v = s[0];
      for (const c of s) if (Math.abs(c - this.gzU) > Math.abs(v - this.gzU)) v = c;
      g.scale.setScalar(clamp(v, 0.25, 6));
    }
    this.syncFields();
  },
  gizmoEnd() {
    const o = this.sel;
    if (!o) return;
    const g = o.group, def = CAT_BY_ID[o.k];
    if (this.tc.mode === 'scale') {
      if (def.rs === RS_XYZ) {
        const sc = [g.scale.x, g.scale.y, g.scale.z];
        o.s = o.s.map((v, i) => (Math.abs(sc[i] - 1) < 1e-4 ? v : clamp(edR(Math.max(this.grid / 2, edSnap(v * sc[i], this.grid / 2))), 0.1, 200)));
        g.scale.set(1, 1, 1);
        this.rebuild(o);
      } else if (def.rs === RS_U) { const u = clamp(edR(g.scale.x), 0.25, 6); o.s = [u, u, u]; this.applyXf(o); }
    } else {
      o.p = [edR(g.position.x), edR(g.position.y), edR(g.position.z)];
      o.r = normAngle(o.r || 0);
    }
    this.commit();
    this.renderInspector();
  },
  rotateStep(dir) {
    const step = this.rotSnap * DEG * dir;
    if (this.tool) { this.ghostR = normAngle(this.ghostR + step); this.ghostDirty = true; return; }
    const o = this.sel;
    if (!o) return;
    o.r = normAngle(Math.round(((o.r || 0) + step) / (this.rotSnap * DEG)) * this.rotSnap * DEG);
    this.applyXf(o); this.commit(); this.syncFields();
  },
  nudge(dx, dz) {
    const o = this.sel;
    if (!o) return;
    const { f, r } = this.camAxes();
    o.p[0] = edR(o.p[0] + (r[0] * dx + f[0] * dz) * this.grid);
    o.p[2] = edR(o.p[2] + (r[1] * dx + f[1] * dz) * this.grid);
    this.applyXf(o); this.commit(); this.syncFields();
  },
  nudgeY(d) {
    const o = this.sel;
    if (!o) return;
    o.p[1] = edR(Math.max(-30, o.p[1] + d * this.grid));
    this.applyXf(o); this.commit(); this.syncFields();
  },
  duplicate() {
    const o = this.sel;
    if (!o) return;
    if (this.objs.length >= MAP_LIMITS.objects) { HUD.toast('Hai raggiunto il limite di ' + MAP_LIMITS.objects + ' oggetti'); return; }
    const c = decObj(encObj(o), 400);
    if (!c) return;
    const box = new THREE.Box3().setFromObject(o.group);
    const { r } = this.camAxes();
    const w = r[0] ? box.max.x - box.min.x : box.max.z - box.min.z;
    const step = Math.max(this.grid, edSnap(w, this.grid));
    c.p = [edR(o.p[0] + r[0] * step), o.p[1], edR(o.p[2] + r[1] * step)];
    c.seed = (Math.random() * 4294967295) >>> 0;
    const n = this.makeObj(c);
    this.commit();
    this.select(n);
  },
  remove() {
    const o = this.sel;
    if (!o) return;
    this.select(null);
    this.removeObj(o);
    this.commit();
  },
  focusSel() {
    const o = this.sel;
    if (!o) return;
    const box = new THREE.Box3().setFromObject(o.group);
    const c = box.getCenter(new THREE.Vector3()), rad = Math.max(1.5, box.getSize(new THREE.Vector3()).length() / 2);
    this.camPos.copy(c).addScaledVector(this.forward(), -rad * 2.6);
  },

  // ------------------------------------------------------------ UI
  bindUI() {
    $('#ed-name').addEventListener('input', (e) => { this.name = sanitizeMapName(e.target.value) || 'Mappa senza nome'; this.dirty = true; this.updateStatus(); });
    $('#ed-name').addEventListener('change', () => this.commit());
    $('#ed-new').addEventListener('click', () => { this.saveLocal(true); this.load({ name: 'Nuova mappa', env: { sky: 'mattina', ground: 'grass', size: 60 }, o: [] }, edNewId()); HUD.toast('Nuova mappa vuota: scegli un oggetto a sinistra e clicca per piazzarlo'); });
    $('#ed-open').addEventListener('click', () => { this.saveLocal(true); this.openModal('open'); });
    $('#ed-save').addEventListener('click', () => { if (this.saveLocal(false)) HUD.toast('Mappa salvata in questo browser'); });
    $('#ed-publish').addEventListener('click', () => this.publish());
    $('#ed-export').addEventListener('click', () => this.openModal('export'));
    $('#ed-undo').addEventListener('click', () => this.undo());
    $('#ed-redo').addEventListener('click', () => this.redo());
    $$('#ed-mode button').forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.m)));
    $('#ed-grid').addEventListener('change', (e) => { this.grid = +e.target.value || 0.5; this.applyGizmo(); this.ghostDirty = true; });
    $('#ed-rot').addEventListener('change', (e) => { this.rotSnap = +e.target.value || 15; this.applyGizmo(); });
    const tm = $('#ed-tmode');
    MODES.forEach((m, i) => { const op = document.createElement('option'); op.value = i; op.textContent = m.name; tm.appendChild(op); });
    $('#ed-play').addEventListener('click', () => this.playTest());
    $('#ed-exit').addEventListener('click', () => this.close(true));
    $('#ed-search').addEventListener('input', (e) => { this.search = e.target.value; this.renderCatalog(); });
    $('#ed-modal').addEventListener('click', (e) => { if (e.target.id === 'ed-modal') this.closeModal(); });
  },
  layout() {
    const h = $('#ed-top').offsetHeight || 54;
    $('#editor').style.setProperty('--edtop', h + 'px');
  },
  updateHint() {
    let t;
    if (this.tool) t = 'Clic: piazza ' + (CAT_BY_ID[this.tool] ? CAT_BY_ID[this.tool].n.toLowerCase() : '') + ' · R: ruota · Esc: fine';
    else if (this.sel) t = 'Trascina le maniglie · 1/2/3: sposta, ruota, scala · R: ruota · Frecce: sposta · Ctrl+D: duplica · Canc: elimina · F: inquadra';
    else t = 'Tasto destro + mouse: guarda · WASD: muoviti · Q/E: giù/su · Shift: veloce · Clic su un oggetto: seleziona';
    $('#ed-hint').textContent = t;
  },
  updateStatus() {
    const s = $('#ed-status');
    if (!s) return;
    const t = this.savedT ? new Date(this.savedT) : null;
    const saved = this.dirty ? 'Modifiche in corso' : t ? 'Salvata alle ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') : 'Salvata';
    s.textContent = saved + ' · ' + this.objs.length + ' oggetti';
  },
  updateUndoBtns() { $('#ed-undo').disabled = !this.undoS.length; $('#ed-redo').disabled = !this.redoS.length; },
  thumbImg(key, cls) {
    const im = document.createElement('img');
    im.alt = ''; im.dataset.thumb = key; if (cls) im.className = cls;
    if (this.thumbs[key]) im.src = this.thumbs[key];
    return im;
  },
  renderCatalog() {
    const tabs = $('#ed-cattabs');
    tabs.innerHTML = '';
    for (const [id, n] of CAT_GROUPS) {
      const b = el('button', id === this.catTab && !this.search.trim() ? 'on' : '', n); b.type = 'button';
      b.addEventListener('click', () => { this.catTab = id; this.search = ''; $('#ed-search').value = ''; this.renderCatalog(); });
      tabs.appendChild(b);
    }
    const box = $('#ed-tiles');
    box.innerHTML = '';
    const q = this.search.trim().toLowerCase();
    const items = CATALOG.filter((c) => (q ? c.n.toLowerCase().includes(q) : c.cat === this.catTab));
    if (!items.length) box.appendChild(el('div', 'ed-sub', 'Nessun oggetto trovato'));
    for (const c of items) {
      const b = el('button', 'ed-tile' + (this.tool === c.id ? ' on' : '')); b.type = 'button';
      b.dataset.id = c.id; b.title = c.n;
      b.appendChild(this.thumbImg('o:' + c.id));
      b.appendChild(el('span', '', c.n));
      b.addEventListener('click', () => { this.setTool(this.tool === c.id ? null : c.id); SFX.ui(); });
      box.appendChild(b);
    }
  },
  renderInspector() {
    const box = $('#ed-insp');
    if (!box) return;
    box.innerHTML = '';
    this.fields = {};
    if (this.sel) this.inspObj(box, this.sel); else this.inspMap(box);
  },
  sec(label) { const s = el('div', 'ins-sec'); if (label) s.appendChild(el('label', '', label)); return s; },
  xyzField(label, arr, onSet, key) {
    const s = this.sec(label), row = el('div', 'xyz'), ins = [];
    ['X', 'Y', 'Z'].forEach((ax, i) => {
      const l = el('label', '', ax);
      const inp = document.createElement('input'); inp.type = 'number'; inp.step = String(this.grid); inp.value = edR(arr[i]);
      inp.addEventListener('change', () => { const v = edNum(inp.value); if (v == null) { inp.value = edR(arr[i]); return; } onSet(i, edR(v)); this.commit(); this.syncFields(); });
      l.appendChild(inp); row.appendChild(l); ins.push(inp);
    });
    s.appendChild(row);
    if (key) this.fields[key] = ins;
    return s;
  },
  rangeField(label, val, min, max, step, onInput, fmt, onCommit) {
    const s = this.sec(label), row = el('div', 'rowc');
    const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val;
    const out = el('output', '', fmt(val));
    r.addEventListener('input', () => { const v = +r.value; out.textContent = fmt(v); onInput(v); });
    r.addEventListener('change', () => { if (onCommit) onCommit(+r.value); this.commit(); });
    row.appendChild(r); row.appendChild(out); s.appendChild(row);
    return s;
  },
  syncFields() {
    const o = this.sel;
    if (!o) return;
    const f = this.fields;
    if (f.pos) f.pos.forEach((inp, i) => { if (document.activeElement !== inp) inp.value = edR(o.p[i]); });
    if (f.rot && document.activeElement !== f.rot) f.rot.value = Math.round(normAngle(o.r || 0) / DEG);
  },
  inspObj(box, o) {
    const def = CAT_BY_ID[o.k];
    const w = el('div', 'ins');
    const h = el('div', 'ins-h');
    h.appendChild(this.thumbImg('o:' + o.k));
    const tt = el('div', ''); tt.appendChild(el('b', '', def.n)); tt.appendChild(el('small', '', (CAT_GROUPS.find((g) => g[0] === def.cat) || ['', ''])[1])); h.appendChild(tt);
    w.appendChild(h);
    w.appendChild(this.xyzField('Posizione', o.p, (i, v) => { o.p[i] = v; this.applyXf(o); }, 'pos'));
    if (def.rs === RS_XYZ) w.appendChild(this.xyzField('Dimensioni (m)', o.s, (i, v) => { o.s[i] = clamp(v, 0.05, 200); this.rebuild(o); }, 'size'));
    else if (def.rs === RS_U) w.appendChild(this.rangeField('Scala', o.s[0], 0.25, 4, 0.05, (v) => { o.s = [v, v, v]; this.applyXf(o); }, (v) => '×' + v.toFixed(2)));
    // rotation
    const rs = this.sec('Rotazione'), rr = el('div', 'rowc');
    const ri = document.createElement('input'); ri.type = 'number'; ri.step = String(this.rotSnap); ri.value = Math.round(normAngle(o.r || 0) / DEG);
    ri.addEventListener('change', () => { const v = edNum(ri.value); if (v == null) return; o.r = normAngle(v * DEG); this.applyXf(o); this.commit(); });
    this.fields.rot = ri;
    const b1 = el('button', 'ed-ic', '↺'); b1.type = 'button'; b1.title = 'Ruota a sinistra'; b1.addEventListener('click', () => this.rotateStep(-1));
    const b2 = el('button', 'ed-ic', '↻'); b2.type = 'button'; b2.title = 'Ruota a destra'; b2.addEventListener('click', () => this.rotateStep(1));
    rr.appendChild(ri); rr.appendChild(el('span', '', 'gradi')); rr.appendChild(b1); rr.appendChild(b2);
    rs.appendChild(rr); w.appendChild(rs);
    if (def.mat) w.appendChild(this.matField(o, def));
    if (def.mat || def.tint) w.appendChild(this.tintField(o, def));
    for (const pr of def.params || []) w.appendChild(this.paramField(o, pr));
    const acts = el('div', 'rowc');
    const dup = el('button', 'btn small', 'Duplica'); dup.type = 'button'; dup.addEventListener('click', () => this.duplicate());
    const del = el('button', 'btn small', 'Elimina'); del.type = 'button'; del.addEventListener('click', () => this.remove());
    acts.appendChild(dup); acts.appendChild(del);
    w.appendChild(acts);
    box.appendChild(w);
  },
  matField(o, def) {
    const s = this.sec('Materiale');
    const cur = EMAT_BY_ID[o.m || def.mat] || EMAT_BY_ID.grid_grey;
    const btn = el('button', 'swbtn'); btn.type = 'button';
    btn.appendChild(this.thumbImg('m:' + cur.id));
    btn.appendChild(el('span', '', cur.n));
    btn.appendChild(el('em', '', this.matOpen ? 'Chiudi' : 'Cambia'));
    btn.addEventListener('click', () => { this.matOpen = !this.matOpen; this.matGroup = cur.g; this.renderInspector(); });
    s.appendChild(btn);
    if (this.matOpen) {
      const pk = el('div', 'matpick');
      const gs = document.createElement('select');
      for (const g of EMAT_GROUPS) { const op = document.createElement('option'); op.value = g; op.textContent = g; gs.appendChild(op); }
      gs.value = this.matGroup || cur.g;
      gs.addEventListener('change', () => { this.matGroup = gs.value; this.renderInspector(); });
      pk.appendChild(gs);
      const grid = el('div', 'matgrid');
      for (const m of EDIT_MATS.filter((x) => x.g === (this.matGroup || cur.g))) {
        const b = el('button', m.id === cur.id ? 'on' : ''); b.type = 'button'; b.title = m.n;
        b.appendChild(this.thumbImg('m:' + m.id));
        b.addEventListener('click', () => { o.m = m.id; o.c = null; this.lastMat[o.k] = m.id; this.lastTint[o.k] = null; this.rebuild(o); this.commit(); this.renderInspector(); });
        grid.appendChild(b);
      }
      pk.appendChild(grid);
      s.appendChild(pk);
    }
    return s;
  },
  tintField(o, def) {
    const s = this.sec('Colore'), row = el('div', 'rowc');
    const base = def.mat ? (EMAT_BY_ID[o.m || def.mat] || {}) : {};
    const dflt = cleanHex(def.tint) || cleanHex(base.c) || cleanHex(base.solid) || cleanHex(base.neon) || '#ffffff';
    const inp = document.createElement('input'); inp.type = 'color'; inp.value = o.c || dflt;
    let raf = 0;
    inp.addEventListener('input', () => { o.c = cleanHex(inp.value); if (!raf) raf = requestAnimationFrame(() => { raf = 0; this.rebuild(o); }); });
    inp.addEventListener('change', () => { o.c = cleanHex(inp.value); this.lastTint[o.k] = o.c; this.rebuild(o); this.commit(); });
    const rst = el('button', 'btn small', 'Originale'); rst.type = 'button';
    rst.addEventListener('click', () => { o.c = null; this.lastTint[o.k] = null; this.rebuild(o); this.commit(); this.renderInspector(); });
    row.appendChild(inp); row.appendChild(rst);
    s.appendChild(row);
    return s;
  },
  paramField(o, pr) {
    const val = o.a[pr.k] !== undefined ? o.a[pr.k] : pr.def;
    const set = (v) => { o.a[pr.k] = sanitizeParam(pr, v); this.rebuild(o); };
    if (pr.type === 'range') return this.rangeField(pr.n, val, pr.min, pr.max, pr.step, (v) => set(v), (v) => Math.round(v) + (pr.unit || ''));
    const s = this.sec(pr.n);
    if (pr.type === 'seg') {
      const seg = el('div', 'seg'); seg.style.gridTemplateColumns = 'repeat(' + pr.opts.length + ', 1fr)';
      for (const [v, n] of pr.opts) {
        const b = el('button', String(v) === String(val) ? 'on' : '', n); b.type = 'button';
        b.addEventListener('click', () => { set(v); this.commit(); this.renderInspector(); });
        seg.appendChild(b);
      }
      s.appendChild(seg);
    } else if (pr.type === 'select') {
      const sl = document.createElement('select');
      for (const [v, n] of pr.opts) { const op = document.createElement('option'); op.value = v; op.textContent = n; sl.appendChild(op); }
      sl.value = val;
      sl.addEventListener('change', () => { set(sl.value); this.commit(); });
      s.appendChild(sl);
    } else {
      const ti = document.createElement('input'); ti.type = 'text'; ti.maxLength = 16; ti.value = val;
      ti.addEventListener('change', () => { set(ti.value); this.commit(); });
      s.appendChild(ti);
    }
    return s;
  },
  inspMap(box) {
    const w = el('div', 'ins');
    const h = el('div', ''); const hb = el('b', 'wide', 'Mappa'); hb.style.fontSize = '20px'; h.appendChild(hb);
    h.appendChild(el('div', 'note', 'Scegli un oggetto a sinistra e clicca nella scena per piazzarlo. Clicca un oggetto per modificarlo.'));
    w.appendChild(h);
    // sky
    const sk = this.sec('Ambiente'), sg = el('div', 'skygrid');
    for (const k of SKY_OPTS) {
      const b = el('button', k === this.env.sky ? 'on' : ''); b.type = 'button';
      const i = document.createElement('i'); const c = SKY_CHIPS[k] || ['#888', '#ccc']; i.style.background = 'linear-gradient(180deg,' + c[0] + ',' + c[1] + ')';
      b.appendChild(i); b.appendChild(el('span', '', ENV_PRESETS[k] ? ENV_PRESETS[k].n : k));
      b.addEventListener('click', () => { this.env.sky = k; this.applyEnv(); this.commit(); this.renderInspector(); });
      sg.appendChild(b);
    }
    sk.appendChild(sg); w.appendChild(sk);
    // ground
    const gr = this.sec('Terreno'), gsel = document.createElement('select');
    for (const [v, n] of GROUND_OPTS) { const op = document.createElement('option'); op.value = v; op.textContent = n; gsel.appendChild(op); }
    gsel.value = this.env.ground;
    gsel.addEventListener('change', () => { this.env.ground = gsel.value; this.applyEnv(); this.commit(); });
    gr.appendChild(gsel); w.appendChild(gr);
    w.appendChild(this.rangeField('Dimensione area di gioco', this.env.size, 30, 160, 10, (v) => { this.env.size = v; }, (v) => v + ' m', () => { this.applyEnv(); this.renderInspector(); }));
    // summary
    const cnt = (k) => this.objs.filter((o) => o.k === k);
    const sp = cnt('spawn'), team = (o) => (o.a && o.a.team) | 0;
    const flags = cnt('flag'), zones = cnt('zone'), lights = cnt('light');
    const fl = (t) => flags.some((o) => (team(o) === 2 ? 2 : 1) === t);
    const st = this.sec('Riepilogo'), grid = el('div', 'stats');
    const row = (a, b) => { grid.appendChild(el('span', '', a)); grid.appendChild(el('span', '', b)); };
    row('Oggetti', this.objs.length + ' / ' + MAP_LIMITS.objects);
    row('Spawn', sp.length + ' (Rossi ' + sp.filter((o) => team(o) === 1).length + ' · Azzurri ' + sp.filter((o) => team(o) === 2).length + ' · tutti ' + sp.filter((o) => team(o) === 0).length + ')');
    row('Basi bandiera', (fl(1) ? 'Rossi ✓' : 'Rossi —') + ' · ' + (fl(2) ? 'Azzurri ✓' : 'Azzurri —'));
    row('Zone hardpoint', String(zones.length));
    row('Luci', lights.length + ' / ' + MAP_LIMITS.lights);
    st.appendChild(grid); w.appendChild(st);
    // warnings
    const warns = [];
    if (sp.length < 2) warns.push('Aggiungi almeno 2 spawn: senza, i giocatori nascono in cerchio attorno al centro.');
    else if (!sp.some((o) => team(o) === 1) || !sp.some((o) => team(o) === 2)) warns.push('Per le modalità a squadre servono spawn dei Rossi e degli Azzurri, altrimenti si nasce ovunque.');
    if (!fl(1) || !fl(2)) warns.push('Mancano basi bandiera: Cattura la bandiera userà posizioni automatiche.');
    if (!zones.length) warns.push('Nessuna zona: Hardpoint userà il centro della mappa.');
    if (lights.length > MAP_LIMITS.lights) warns.push('Vengono accese solo le prime ' + MAP_LIMITS.lights + ' luci.');
    const outs = new Set(cnt('tele_out').map((o) => (o.a && o.a.ch) | 0 || 1));
    for (const t of cnt('tele_in')) { const ch = (t.a && t.a.ch) | 0 || 1; if (!outs.has(ch)) { warns.push('Il teletrasporto sul canale ' + ch + ' non ha un\'uscita.'); break; } }
    const wb = this.sec('Controllo'), wl = el('div', 'warns');
    if (!warns.length) wl.appendChild(el('div', 'ok', 'La mappa è pronta per tutte le modalità.'));
    for (const t of warns) wl.appendChild(el('div', '', t));
    wb.appendChild(wl); w.appendChild(wb);
    box.appendChild(w);
  },

  // ------------------------------------------------------------ thumbnails
  processThumbs() {
    if (!this.thumbQ || !this.thumbQ.length || this.testing) return;
    const t0 = performance.now();
    while (this.thumbQ.length && performance.now() - t0 < 12) {
      const [kind, id] = this.thumbQ.shift();
      const key = kind + ':' + id;
      if (this.thumbs[key]) continue;
      try { this.thumbs[key] = kind === 'o' ? this.objThumb(id) : this.matThumb(id); } catch (e) { console.warn('thumb', key, e); this.thumbs[key] = ''; }
      if (this.thumbs[key]) for (const im of $$('img[data-thumb="' + key + '"]')) im.src = this.thumbs[key];
    }
  },
  objThumb(id) {
    const o = newObj(id); o.seed = 11;
    const ctx = buildObject(o);
    const g = new THREE.Group();
    ctx.G.build(g, { cast: false }); ctx.E.build(g, { cast: false });
    return this.renderThumb(g, 160, 120, new THREE.Vector3(0.85, 0.7, 1.2));
  },
  matThumb(id) {
    if (!this.sphereGeo) this.sphereGeo = new THREE.SphereGeometry(1, 40, 24);
    const m = new THREE.Mesh(this.sphereGeo, emat(id));
    const g = new THREE.Group(); g.add(m); g.userData.keepGeo = true;
    return this.renderThumb(g, 72, 72, new THREE.Vector3(0.35, 0.45, 1));
  },
  renderThumb(obj, W, H, dir) {
    const r = R.renderer;
    if (!this.tScene) {
      this.tScene = new THREE.Scene();
      const dl = new THREE.DirectionalLight(0xffffff, 2.4); dl.position.set(3, 5, 4); this.tScene.add(dl);
      this.tScene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1));
      this.tCam = new THREE.PerspectiveCamera(30, 4 / 3, 0.01, 500);
      this.tRTs = {};
    }
    const rk = W + 'x' + H;
    let T = this.tRTs[rk];
    if (!T) {
      T = this.tRTs[rk] = { rt: new THREE.WebGLRenderTarget(W, H, { samples: 4, colorSpace: THREE.SRGBColorSpace }), buf: new Uint8Array(W * H * 4), cv: document.createElement('canvas') };
      T.cv.width = W; T.cv.height = H;
    }
    this.tScene.environment = R.scene.environment;
    this.tScene.add(obj);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const ctr = box.getCenter(new THREE.Vector3()), rad = Math.max(0.3, box.getSize(new THREE.Vector3()).length() / 2);
    const cam = this.tCam;
    cam.aspect = W / H; cam.updateProjectionMatrix();
    cam.position.copy(ctr).addScaledVector(dir.clone().normalize(), rad / Math.sin(15 * DEG) * 0.95);
    cam.lookAt(ctr);
    const prev = r.getRenderTarget();
    r.setRenderTarget(T.rt); r.setClearColor(0x000000, 0); r.clear(); r.render(this.tScene, cam);
    r.readRenderTargetPixels(T.rt, 0, 0, W, H, T.buf);
    r.setRenderTarget(prev); r.setClearColor(0x000000, 1);
    this.tScene.remove(obj);
    if (!obj.userData.keepGeo) obj.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
    const g2 = T.cv.getContext('2d');
    const img = g2.createImageData(W, H);
    for (let y = 0; y < H; y++) img.data.set(T.buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    g2.putImageData(img, 0, 0);
    return T.cv.toDataURL('image/png');
  },

  // ------------------------------------------------------------ saving
  loadLocalDef(id) {
    try { const s = localStorage.getItem('raffica.map.' + id); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  },
  localIndex() { const a = store.get(ED_INDEX, []); return Array.isArray(a) ? a.filter((x) => x && typeof x.id === 'string') : []; },
  saveLocal(silent) {
    if (!this.mapId) return false;
    const def = this.serialize();
    try { localStorage.setItem('raffica.map.' + this.mapId, JSON.stringify(def)); } catch (e) {
      if (!silent) HUD.toast('Spazio del browser esaurito: esporta la mappa o eliminane una vecchia');
      return false;
    }
    const idx = this.localIndex().filter((x) => x.id !== this.mapId);
    idx.unshift({ id: this.mapId, name: def.name, t: Date.now(), n: def.o.length });
    store.set(ED_INDEX, idx.slice(0, 60));
    store.set('edLast', this.mapId);
    this.dirty = false; this.savedT = Date.now(); this.autoT = performance.now();
    this.updateStatus();
    return true;
  },
  deleteLocal(id) {
    try { localStorage.removeItem('raffica.map.' + id); } catch (e) { /* ignore */ }
    store.set(ED_INDEX, this.localIndex().filter((x) => x.id !== id));
  },
  localDef(key) {
    const id = String(key).slice(6);
    if (this.testDef && id === this.mapId) return this.testDef;
    return this.loadLocalDef(id);
  },

  // ------------------------------------------------------------ shared maps (artifact database)
  initDb() {
    if (this.dbReady) return this.dbReady;
    this.dbReady = (async () => {
      const C = window.claude;
      if (!C || typeof C.use !== 'function') return;
      try { this.db = await C.use('db'); } catch (e) { this.db = null; }
      if (!this.db) return;
      const user = Net.user || (await C.use('user').catch(() => null));
      try { this.uid = user ? await user.id() : null; } catch (e) { this.uid = null; }
      try {
        this.unsubShared = this.db.collection('maps').onSnapshot((snap) => this.onShared(snap), (err) => console.warn('maps', err && err.code));
      } catch (e) { console.warn('maps', e); }
    })();
    return this.dbReady;
  },
  onShared(snap) {
    const out = [];
    for (const d of snap.docs) {
      const data = d.data() || {};
      const list = data.list && typeof data.list === 'object' ? data.list : {};
      for (const [mid, m] of Object.entries(list)) {
        if (!/^[a-z0-9]{4,24}$/.test(mid) || !m || typeof m !== 'object') continue;
        out.push({ key: d.id + '~' + mid, uid: d.id, mid, name: sanitizeMapName(m.n) || 'Mappa', t: +m.t || 0, c: (+m.c | 0), sky: m.e, size: +m.s || 60 });
      }
    }
    out.sort((a, b) => b.t - a.t);
    this.shared = out.slice(0, 200);
    for (const s of this.shared) { const c = this.cache[s.key]; if (c && c.t < s.t) delete this.cache[s.key]; }
    this.resolveAuthors();
    this.refreshMapList();
    if (this.modalOpen === 'open') this.openModal('open');
  },
  async resolveAuthors() {
    const user = Net.user;
    if (!user || typeof user.profiles !== 'function') return;
    const ids = [...new Set(this.shared.map((s) => s.uid))];
    if (!ids.length) return;
    try {
      const ps = await user.profiles(ids);
      for (const id of ids) this.authors[id] = (ps && ps[id] && ps[id].name) || '';
    } catch (e) { /* names stay blank */ }
    this.refreshMapList();
    if (this.modalOpen === 'open') this.openModal('open');
  },
  refreshMapList() {
    const sel = $('#rmap');
    if (!sel) return;
    const cur = sel.value || 'borgo';
    sel.innerHTML = '';
    const add = (parent, v, t) => { const op = document.createElement('option'); op.value = v; op.textContent = t; parent.appendChild(op); };
    for (const id of BUILTIN_IDS) add(sel, id, BUILTIN_MAPS[id].name);
    if (this.shared.length) {
      const og = document.createElement('optgroup'); og.label = 'Mappe dei colleghi';
      for (const s of this.shared) add(og, s.key, s.name + (this.authors[s.uid] ? ' · ' + this.authors[s.uid] : ''));
      sel.appendChild(og);
    }
    sel.value = Array.from(sel.querySelectorAll('option')).some((o) => o.value === cur) ? cur : 'borgo';
  },
  sharedName(key) { const s = this.shared.find((x) => x.key === key); return s ? s.name : null; },
  async fetchMap(key) {
    if (typeof key !== 'string') return null;
    if (key.startsWith('local:')) return this.localDef(key);
    const i = key.lastIndexOf('~');
    if (i <= 0) return null;
    const uid = key.slice(0, i), mid = key.slice(i + 1);
    if (!/^[a-z0-9]{4,24}$/.test(mid)) return null;
    if (this.cache[key]) return this.cache[key].def;
    await this.initDb();
    if (!this.db) return null;
    try {
      const snap = await this.db.doc('maps/' + uid + '/defs/' + mid).get();
      if (!snap.exists) return null;
      const d = snap.data() || {};
      const def = typeof d.def === 'string' ? JSON.parse(d.def) : d.def;
      if (!def || typeof def !== 'object') return null;
      this.cache[key] = { def, t: +d.t || 0 };
      return def;
    } catch (e) { console.warn('fetchMap', e && (e.code || e.message)); return null; }
  },
  async publish() {
    await this.initDb();
    if (!this.db || !this.uid) { HUD.toast('Per condividere le mappe apri il gioco da claude.ai con il tuo account'); return; }
    const def = this.serialize();
    const json = JSON.stringify(def);
    if (json.length > MAP_LIMITS.bytes) { HUD.toast('Mappa troppo grande da condividere: ' + Math.round(json.length / 1024) + ' KB su ' + Math.round(MAP_LIMITS.bytes / 1024)); return; }
    this.saveLocal(true);
    const btn = $('#ed-publish'); btn.disabled = true; btn.textContent = 'Pubblico…';
    try {
      await this.db.doc('maps/' + this.uid + '/defs/' + this.mapId).set({ def: json, t: Date.now() });
      const ref = this.db.doc('maps/' + this.uid);
      const snap = await ref.get();
      const list = Object.assign({}, (snap.exists && snap.data() && snap.data().list) || {});
      list[this.mapId] = { n: def.name, t: Date.now(), c: def.o.length, e: def.env.sky, s: def.env.size };
      await ref.set({ list });
      delete this.cache[this.uid + '~' + this.mapId];
      HUD.toast('Mappa pubblicata: i colleghi la trovano in Partite, Crea partita');
    } catch (e) {
      const code = e && e.code;
      HUD.toast(code === 'quota_exceeded' ? 'Spazio condiviso esaurito: ritira una mappa pubblicata' : code === 'invalid_argument' ? 'Non hai i permessi per pubblicare mappe in questo artifact' : 'Pubblicazione non riuscita, riprova');
    }
    btn.disabled = false; btn.textContent = 'Pubblica';
  },
  async unpublish(s) {
    if (!this.db || !this.uid || s.uid !== this.uid) return;
    try {
      await this.db.doc('maps/' + this.uid + '/defs/' + s.mid).delete();
      const ref = this.db.doc('maps/' + this.uid);
      const snap = await ref.get();
      const list = Object.assign({}, (snap.exists && snap.data() && snap.data().list) || {});
      delete list[s.mid];
      await ref.set({ list });
      HUD.toast('Mappa ritirata');
    } catch (e) { HUD.toast('Non riesco a ritirare la mappa, riprova'); }
  },

  // ------------------------------------------------------------ dialogs
  closeModal() { this.modalOpen = false; const m = $('#ed-modal'); if (m) m.hidden = true; },
  openModal(kind) {
    this.modalOpen = kind;
    this.keys.clear();
    const m = $('#ed-modal'), body = $('#ed-modalbody');
    m.hidden = false; body.innerHTML = '';
    const btn = (t, cls, fn) => { const b = el('button', 'btn ' + (cls || ''), t); b.type = 'button'; b.addEventListener('click', fn); return b; };
    const head = (t) => body.appendChild(el('h2', 'big', t));
    if (kind === 'open') {
      head('Apri mappa');
      const r = el('div', 'row');
      r.appendChild(btn('Nuova mappa vuota', 'white small', () => { this.closeModal(); this.load({ name: 'Nuova mappa', env: { sky: 'mattina', ground: 'grass', size: 60 }, o: [] }, edNewId()); }));
      r.appendChild(btn('Parti dall\'esempio', 'small', () => { this.closeModal(); this.load(exampleMapDef(), edNewId()); }));
      r.appendChild(btn('Importa JSON', 'small', () => this.openModal('import')));
      body.appendChild(r);
      body.appendChild(el('div', 'lbl2', 'In questo browser'));
      const ll = el('div', 'maplist');
      const idx = this.localIndex();
      if (!idx.length) ll.appendChild(el('div', 'empty', 'Nessuna mappa salvata.'));
      for (const it of idx) {
        const row = el('div', 'mapitem');
        row.appendChild(el('b', '', sanitizeMapName(it.name) || 'Mappa'));
        const d = new Date(+it.t || 0);
        row.appendChild(el('small', '', (it.n | 0) + ' oggetti · ' + d.toLocaleDateString('it-IT') + (it.id === this.mapId ? ' · aperta ora' : '')));
        const acts = el('div', 'acts');
        acts.appendChild(btn('Apri', 'small', () => { const def = this.loadLocalDef(it.id); if (!def) { HUD.toast('Mappa non trovata'); return; } this.closeModal(); this.load(def, it.id); }));
        const del = btn('Elimina', 'small', () => {
          if (del.dataset.armed) { this.deleteLocal(it.id); if (it.id === this.mapId) this.mapId = edNewId(); this.openModal('open'); return; }
          del.dataset.armed = '1'; del.textContent = 'Conferma';
        });
        acts.appendChild(del);
        row.appendChild(acts);
        ll.appendChild(row);
      }
      body.appendChild(ll);
      body.appendChild(el('div', 'lbl2', 'Condivise con i colleghi'));
      const sl = el('div', 'maplist');
      if (!this.db) sl.appendChild(el('div', 'empty', 'Le mappe condivise compaiono qui quando il gioco è aperto da claude.ai.'));
      else if (!this.shared.length) sl.appendChild(el('div', 'empty', 'Nessuna mappa pubblicata. Usa Pubblica per condividere la tua.'));
      for (const s of this.shared) {
        const row = el('div', 'mapitem');
        row.appendChild(el('b', '', s.name));
        const mine = s.uid === this.uid;
        row.appendChild(el('small', '', (mine ? 'tua' : (this.authors[s.uid] ? 'di ' + this.authors[s.uid] : 'di un collega')) + ' · ' + s.c + ' oggetti'));
        const acts = el('div', 'acts');
        acts.appendChild(btn(mine ? 'Apri' : 'Apri copia', 'small', async () => {
          const local = mine ? this.loadLocalDef(s.mid) : null;
          const def = local || await this.fetchMap(s.key);
          if (!def) { HUD.toast('Non riesco a scaricare la mappa'); return; }
          this.closeModal();
          if (mine) this.load(def, s.mid);
          else { const d2 = Object.assign({}, def, { name: sanitizeMapName('Copia di ' + (def.name || s.name)) }); this.load(d2, edNewId()); }
        }));
        if (mine) acts.appendChild(btn('Ritira', 'small', () => this.unpublish(s)));
        row.appendChild(acts);
        sl.appendChild(row);
      }
      body.appendChild(sl);
      body.appendChild(btn('Chiudi', '', () => this.closeModal()));
    } else if (kind === 'export') {
      head('Esporta mappa');
      body.appendChild(el('p', 'note', 'Copia questo testo per salvarlo o mandarlo a un collega: con Importa JSON si riapre identica.'));
      const ta = document.createElement('textarea'); ta.readOnly = true; ta.value = JSON.stringify(this.serialize());
      body.appendChild(ta);
      const r = el('div', 'row');
      r.appendChild(btn('Copia', 'white small', () => {
        try { navigator.clipboard.writeText(ta.value).then(() => HUD.toast('Copiato negli appunti'), () => { ta.select(); HUD.toast('Seleziona il testo e copialo con Ctrl+C'); }); } catch (e) { ta.select(); }
      }));
      r.appendChild(btn('Chiudi', 'small', () => this.closeModal()));
      body.appendChild(r);
    } else if (kind === 'import') {
      head('Importa mappa');
      body.appendChild(el('p', 'note', 'Incolla il testo di una mappa esportata, oppure scegli un file .json.'));
      const ta = document.createElement('textarea'); ta.placeholder = '{"v":1,"name":…}';
      body.appendChild(ta);
      const file = document.createElement('input'); file.type = 'file'; file.accept = '.json,application/json,text/plain';
      file.addEventListener('change', () => { const f = file.files && file.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { ta.value = String(rd.result || ''); }; rd.readAsText(f); });
      body.appendChild(file);
      const r = el('div', 'row');
      r.appendChild(btn('Importa', 'white small', () => {
        let def = null;
        try { def = JSON.parse(ta.value); } catch (e) { def = null; }
        if (!def || typeof def !== 'object' || !Array.isArray(def.o)) { HUD.toast('Il testo non sembra una mappa di Raffica'); return; }
        this.closeModal(); this.load(def, edNewId()); this.commit(); HUD.toast('Mappa importata');
      }));
      r.appendChild(btn('Annulla', 'small', () => this.openModal('open')));
      body.appendChild(r);
    }
  },

  // ------------------------------------------------------------ play-test
  playTest() {
    this.saveLocal(true);
    this.testDef = this.serialize();
    this.testing = true;
    const mode = +$('#ed-tmode').value || 0, bots = +$('#ed-tbots').value || 0;
    this.close(false);
    Game.pendingMap = 'local:' + this.mapId;
    Game.mapId = null;
    Game.playOffline({ bots, diff: 1, mode });
  },
};
