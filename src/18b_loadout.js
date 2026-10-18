// ===================================================================
// Armeria (per-class weapon choices) and Personaggio (soldier appearance + live 3D preview)
// ===================================================================
// Weapon pools per class: ids not (yet) in WEAPONS are simply skipped at runtime
const LOADOUT_POOLS = {
  assalto: ['ar', 'ak', 'aug', 'fal', 'bullpup'],
  cecchino: ['sniper', 'barrett', 'kar98'],
  incursore: ['knife', 'axe', 'pitchfork', 'pan'],
  mitragliere: ['lmg', 'pkm', 'lewis'],
  ombra: ['smg', 'mp5', 'p90', 'mac10'],
  pistolero: ['revolver', 'deagle', 'm1911'],
  tiratore: ['dmr', 'svd', 'm14'],
  artificiere: ['rocket', 'law', 'm79', 'xbow'],
  guardiano: ['shotgun', 'dbarrel', 'autosg'],
};
const LOADOUT_SEC = ['pistol', 'glock', 'm1911', 'deagle'];
const LOADOUT_MELEE = ['knife', 'axe', 'pitchfork', 'pan'];
const LOADOUT_SLOTS = [['Primaria', 'p'], ['Secondaria', 's'], ['Arma bianca', 'm']];

const Loadout = {
  sel: {}, // class id -> { p, s, m }
  load() {
    const raw = store.get('loadout', null);
    this.sel = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    CLASSES.forEach((c, i) => {
      const r = raw[c.id];
      if (!r || typeof r !== 'object') return;
      const P = this.pools(i), o = {};
      for (const k of ['p', 's', 'm']) if (typeof r[k] === 'string' && P[k] && P[k].includes(r[k])) o[k] = r[k];
      this.sel[c.id] = o;
    });
  },
  save() { store.set('loadout', this.sel); },
  // available weapons per slot for class index ci (class default first; null = slot not used)
  pools(ci) {
    const c = CLASSES[ci] || CLASSES[0];
    const ok = (list, melee) => [...new Set(list)].filter((id) => WEAPONS[id] && (WEAPONS[id].type === 'melee') === melee);
    const isMelee = WEAPONS[c.primary] && WEAPONS[c.primary].type === 'melee';
    return {
      p: ok([c.primary, ...(LOADOUT_POOLS[c.id] || [])], isMelee),
      s: c.secondary ? ok([c.secondary, ...LOADOUT_SEC], false) : null,
      m: isMelee ? null : ok(['knife', ...LOADOUT_MELEE], true),
    };
  },
  // chosen ids { p, s, m } (validated, defaults = class weapons)
  pick(ci) {
    const c = CLASSES[ci] || CLASSES[0], P = this.pools(ci), r = this.sel[c.id] || {};
    const one = (k) => (P[k] ? (P[k].includes(r[k]) ? r[k] : P[k][0] || null) : null);
    return { p: one('p') || c.primary, s: one('s'), m: one('m') };
  },
  // inventory order for Game.giveLoadout
  weapons(ci) { const k = this.pick(ci); return [k.p, k.s, k.m].filter(Boolean); },
  choose(ci, slot, id) {
    const c = CLASSES[ci], P = this.pools(ci);
    if (!c || !P[slot] || !P[slot].includes(id)) return;
    this.sel[c.id] = Object.assign({}, this.sel[c.id], { [slot]: id });
    this.save();
    SFX.ui();
    this.render();
    HUD.buildClassGrid($('#classgrid'), $('#clsinfo'));
    HUD.buildClassGrid($('#classgrid2'), $('#clsinfo2'));
    if (Game.state === 'playing' && ci === Game.me.cls) HUD.toast('Equipaggiamento aggiornato al prossimo respawn');
  },
  // 0..1 bars: danno, cadenza, portata, mobilità
  stats(id) {
    const w = WEAPONS[id] || {};
    const dmg = (w.dmg || 0) * (w.pellets || 1);
    const range = w.type === 'melee' ? (w.reach || 2) / 60 : w.range ? Math.sqrt(w.range[1] / 300) : w.projSpeed ? 0.55 : 0.3;
    return [
      ['Danno', clamp(dmg / 115, 0.04, 1)],
      ['Cadenza', clamp((w.rpm || 60) / 900, 0.04, 1)],
      ['Portata', clamp(range, 0.04, 1)],
      ['Mobilità', clamp(((w.speed || 1) - 0.82) / 0.32, 0.04, 1)],
    ];
  },
  ci: 0,
  init() {
    this.load();
    this.ci = Game.cls;
  },
  render() {
    const list = $('#lo-classes'), main = $('#lo-slots');
    if (!list || !main) return;
    list.innerHTML = '';
    CLASSES.forEach((c, i) => {
      const k = this.pick(i);
      const b = el('button', 'lo-c' + (i === this.ci ? ' on' : '') + (i === Game.cls ? ' cur' : ''));
      b.type = 'button';
      b.appendChild(el('span', 'n', c.name));
      b.appendChild(el('span', 'w', WEAPONS[k.p].name));
      b.addEventListener('click', () => { this.ci = i; SFX.ui(); this.render(); });
      list.appendChild(b);
    });
    const c = CLASSES[this.ci] || CLASSES[0], P = this.pools(this.ci), k = this.pick(this.ci);
    $('#lo-cname').textContent = c.name;
    $('#lo-cdesc').textContent = c.desc;
    const use = $('#lo-use');
    use.hidden = this.ci === Game.cls;
    use.onclick = () => { Game.chooseClass(this.ci); HUD.syncClassGrids(); SFX.ui(); this.render(); };
    main.innerHTML = '';
    for (const [title, slot] of LOADOUT_SLOTS) {
      if (!P[slot]) continue;
      const sec = el('div', 'lo-slot');
      const hd = el('div', 'hd'); hd.appendChild(el('h2', '', slot === 'p' && !P.m ? 'Arma bianca' : title));
      hd.appendChild(el('span', 'r', P[slot].length > 1 ? P[slot].length + ' armi' : 'Unica scelta'));
      sec.appendChild(hd);
      const grid = el('div', 'lo-grid');
      for (const id of P[slot]) {
        const w = WEAPONS[id];
        const b = el('button', 'lo-w' + (k[slot] === id ? ' sel' : ''));
        b.type = 'button'; b.setAttribute('aria-pressed', k[slot] === id ? 'true' : 'false');
        const img = document.createElement('img'); img.alt = ''; img.src = HUD.icons[id] || ''; img.dataset.wicon = id; b.appendChild(img);
        b.appendChild(el('span', 'n', w.name));
        for (const [n, v] of this.stats(id)) {
          const s = el('div', 'stat'); s.appendChild(el('span', '', n));
          const bar = el('div', 'b'); const iEl = document.createElement('i'); iEl.style.width = Math.round(v * 100) + '%'; bar.appendChild(iEl); s.appendChild(bar);
          b.appendChild(s);
        }
        b.addEventListener('click', () => this.choose(this.ci, slot, id));
        grid.appendChild(b);
      }
      sec.appendChild(grid);
      main.appendChild(sec);
    }
  },
};

// ---------------------------------------------------------------------
// Appearance = [variant, tint, headgear, accent] (small ints), shared over the network as `ap`
const CHAR_TINTS = [
  { name: 'Originale', hex: null }, { name: 'Oliva', hex: '#c9d1a2' }, { name: 'Sabbia', hex: '#ecd8b0' },
  { name: 'Grigio urbano', hex: '#c2c6cc' }, { name: 'Notte', hex: '#7d8396' }, { name: 'Bosco scuro', hex: '#93a58a' },
  { name: 'Terracotta', hex: '#e0a88e' }, { name: 'Artico', hex: '#ffffff' },
];
const CHAR_HEAD = [
  { name: 'Completo', hide: [] }, { name: 'Senza copricapo', hide: ['Hats'] },
  { name: 'Senza maschera', hide: ['Masks', 'Eyewear'] }, { name: 'Volto scoperto', hide: ['Hats', 'Masks', 'Eyewear'] },
];
const CHAR_ACCENTS = [
  { name: 'Automatico', hex: null }, { name: 'Rosso', hex: '#e8384c' }, { name: 'Blu', hex: '#3d8bff' }, { name: 'Verde', hex: '#3fb45b' },
  { name: 'Ambra', hex: '#ffb22e' }, { name: 'Viola', hex: '#a35cff' }, { name: 'Rosa', hex: '#ff6fb1' }, { name: 'Ciano', hex: '#3fd0d0' }, { name: 'Bianco', hex: '#f4f4f4' },
];

const Character = {
  _looks: new Map(),
  variants() {
    if (typeof SOLDIER_VARIANTS !== 'undefined' && Array.isArray(SOLDIER_VARIANTS) && SOLDIER_VARIANTS.length) return SOLDIER_VARIANTS;
    if (typeof SOLDIERS !== 'undefined') return Object.keys(SOLDIERS).map((id) => ({ id, name: SOLDIERS[id].name || id }));
    return [{ id: 'soldato', name: 'Soldato' }];
  },
  hasModels() { return typeof SOLDIERS !== 'undefined' && typeof Soldiers !== 'undefined'; },
  limits() { return [this.variants().length, CHAR_TINTS.length, CHAR_HEAD.length, CHAR_ACCENTS.length]; },
  valid(ap) {
    if (!Array.isArray(ap) || ap.length !== 4) return false;
    const L = this.limits();
    return ap.every((x, i) => Number.isInteger(x) && x >= 0 && x < L[i]);
  },
  clean(ap) { return this.valid(ap) ? ap.slice() : [0, 0, 0, 0]; },
  loadAp() { return this.clean(store.get('appearance', null)); },
  setAp(ap) {
    Game.appearance = this.clean(ap);
    store.set('appearance', Game.appearance);
    this.renderOpts();
    this.applyPreview();
  },
  randomAp(seed) {
    const L = this.limits();
    let h = hashStr('ap:' + String(seed));
    const pick = (n) => { const r = h % n; h = Math.floor(h / n) ^ 0x5bd1; return Math.abs(r); };
    return [pick(L[0]), pick(L[1]), pick(L[2]), 0];
  },
  // cached look object for Avatar.setAppearance (identity matters: same ap -> same object)
  look(ap) {
    if (!this.hasModels() || !this.valid(ap)) return null;
    const k = ap.join('.');
    let L = this._looks.get(k);
    if (!L) {
      const v = this.variants()[ap[0]];
      const tint = CHAR_TINTS[ap[1]].hex, hide = CHAR_HEAD[ap[2]].hide;
      L = { variant: v.id, tint: tint ? { Tops: tint, Bottoms: tint, Hats: tint } : null, hide: hide.length ? hide : null, custom: true };
      this._looks.set(k, L);
    }
    return L;
  },
  accentHex(ap) { return this.valid(ap) ? CHAR_ACCENTS[ap[3]].hex : null; },
  // without a hat the head accent ring would float over the head: hide it (arm bands stay)
  fixHead(av) {
    const b = av.body, L = av.look;
    if (!b || b.proc || !b.accents || !b.b || b._hf === L) return;
    b._hf = L;
    const bare = !!(L && L.hide && L.hide.includes('Hats'));
    for (const m of b.accents) if (m.parent === b.b.Head) m.visible = !bare;
  },
  // an entity with `e.ap` (bots; remote players: Game.applyAp / presence `ap`) shows that appearance;
  // [0,0,0,0] = default look (team camo), zombies keep their look,
  // the accent colour only replaces the FFA colour (team colours stay)
  bindEnt(e, av) {
    const setA = av.setAppearance, setC = av.setColor;
    av.setAppearance = function (look) {
      const ap = e.ap, custom = Array.isArray(ap) && ap.some((x) => x);
      const own = custom && look && !look.zombie && !look.custom ? Character.look(ap) : null;
      if (!own && look && look.variant === undefined) return; // raw { v, t, h, a } without a usable model
      setA.call(this, own || look);
      Character.fixHead(this);
    };
    av.setColor = function (hex) {
      const m = Game.mode(), acc = m && !m.teams ? Character.accentHex(e.ap) : null;
      return setC.call(this, acc || hex);
    };
  },

  // ------------------------------------------------------------ UI
  init() {
    Game.appearance = this.loadAp();
    this.renderOpts();
    const cv = $('#ch-canvas');
    if (cv) {
      let drag = null;
      cv.addEventListener('pointerdown', (e) => { drag = e.clientX; this.dragT = performance.now(); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
      cv.addEventListener('pointermove', (e) => { if (drag == null) return; this.yaw += (e.clientX - drag) * 0.012; drag = e.clientX; this.dragT = performance.now(); });
      const up = () => { drag = null; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    }
  },
  renderOpts() {
    const box = $('#ch-opts');
    if (!box) return;
    const ap = Game.appearance || [0, 0, 0, 0];
    box.innerHTML = '';
    const group = (title, note, items, idx, swatch) => {
      const card = el('div', 'card ch-card');
      const hd = el('div', 'hd'); hd.appendChild(el('h2', '', title)); hd.appendChild(el('span', 'r', items[ap[idx]].name)); card.appendChild(hd);
      if (note) card.appendChild(el('p', 'ch-note', note));
      const row = el('div', swatch ? 'ch-sw' : 'ch-chips');
      items.forEach((it, i) => {
        const b = el('button', (swatch ? 'sw' : 'mp') + (i === ap[idx] ? ' on' : ''), swatch ? null : it.name);
        b.type = 'button'; b.title = it.name; b.setAttribute('aria-label', it.name); b.setAttribute('aria-pressed', i === ap[idx] ? 'true' : 'false');
        if (swatch) { if (it.hex) b.style.background = it.hex; else b.classList.add('auto'); }
        b.addEventListener('click', () => { const n = ap.slice(); n[idx] = i; SFX.ui(); this.setAp(n); });
        row.appendChild(b);
      });
      card.appendChild(row);
      box.appendChild(card);
    };
    const models = this.hasModels();
    group('Mimetica', models ? null : 'I modelli dei soldati non sono disponibili: resta il soldato base.', this.variants(), 0, false);
    if (models) {
      group('Tinta della divisa', null, CHAR_TINTS, 1, true);
      group('Copricapo', 'Non tutti i soldati hanno elmetto, maschera e occhiali.', CHAR_HEAD, 2, false);
    }
    group('Colore distintivo', 'Fasce sulle braccia e sul casco. Vale in Tutti contro tutti e Gun Game: nelle partite a squadre restano i colori della squadra.', CHAR_ACCENTS, 3, true);
    const tag = $('#ch-name');
    if (tag) tag.textContent = this.variants()[ap[0]].name;
  },

  // ------------------------------------------------------------ live preview (own scene, rendered with R.renderer)
  yaw: 0.5, dragT: 0, running: false, view: null,
  onTab(name) {
    if (name === 'character') this.start(); else this.running = false;
  },
  makeView() {
    const W = 360, H = 480;
    const v = { W, H };
    v.rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
    v.rt2 = new THREE.WebGLRenderTarget(W, H);
    v.sc = new THREE.Scene();
    v.sc.environment = R.scene.environment;
    const key = new THREE.DirectionalLight(0xfff1de, 2.1); key.position.set(2, 3, 3); v.sc.add(key);
    const rim = new THREE.DirectionalLight(0xbcd2ff, 1.6); rim.position.set(-3, 2, -3); v.sc.add(rim);
    v.sc.add(new THREE.HemisphereLight(0xdfe6ff, 0x30302c, 0.55));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40), new THREE.MeshStandardMaterial({ color: 0x1b1e25, roughness: 0.9, metalness: 0 }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.002; v.sc.add(disc);
    v.cam = new THREE.PerspectiveCamera(27, W / H, 0.1, 50);
    v.cam.position.set(0, 1.12, 4.7); v.cam.lookAt(0, 0.93, 0);
    // resolve pass: linear HDR -> ACES tone map -> sRGB, flipped for putImageData
    v.qsc = new THREE.Scene();
    v.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const qm = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: v.rt.texture }, exposure: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tMap; uniform float exposure; varying vec2 vUv;',
        'vec3 aces(vec3 x) { x *= exposure * 0.8; return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
        'void main() {',
        '  vec4 c = texture2D(tMap, vec2(vUv.x, 1.0 - vUv.y));',
        '  vec3 col = aces(c.rgb / max(c.a, 1e-4));',
        '  gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), c.a);',
        '}',
      ].join('\n'),
      depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
    });
    v.qmat = qm;
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), qm); q.frustumCulled = false; v.qsc.add(q);
    v.buf = new Uint8Array(W * H * 4);
    v.av = new Avatar({});
    v.sc.add(v.av.root);
    return v;
  },
  applyPreview() {
    const v = this.view; if (!v) return;
    const ap = Game.appearance || [0, 0, 0, 0];
    const look = this.look(ap);
    if (look) v.av.setAppearance(look);
    v.av.setColor(this.accentHex(ap) || TEAM_COLORS[1]);
    const k = Loadout.pick(Game.cls);
    v.av.setWeapon(k.p);
  },
  start() {
    const cv = $('#ch-canvas');
    if (!cv || this.running) return;
    try { if (!this.view) this.view = this.makeView(); } catch (e) { console.warn('character preview', e); return; }
    this.applyPreview();
    this.running = true;
    let last = performance.now(), acc = 1;
    const st = { yaw: 0, pitch: -0.05, vx: 0, vz: 0, crouch: false, slide: false, grounded: true, ads: false };
    const loop = (now) => {
      if (!this.running) return;
      if (HUD.curTab !== 'character') { this.running = false; return; }
      const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
      if ($('#menu').hidden || Game.state !== 'menu') { requestAnimationFrame(loop); return; } // idle during a match
      if (now - this.dragT > 1400) this.yaw += dt * 0.55;
      if (acc >= 1 / 30) { acc = 0; try { this.draw(cv, dt, st); } catch (e) { console.warn('character preview', e); this.running = false; return; } }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  draw(cv, dt, st) {
    const v = this.view, r = R.renderer;
    st.yaw = this.yaw;
    const look = this.look(Game.appearance || [0, 0, 0, 0]);
    if (look) { v.av.setAppearance(look); this.fixHead(v.av); } // swaps once the requested soldier model has loaded
    v.av.update(dt, st);
    const prevRT = r.getRenderTarget(), prevC = r.getClearColor(new THREE.Color()), prevA = r.getClearAlpha();
    v.qmat.uniforms.exposure.value = r.toneMappingExposure || 1;
    r.setRenderTarget(v.rt); r.setClearColor(0x000000, 0); r.clear(); r.render(v.sc, v.cam);
    r.setRenderTarget(v.rt2); r.clear(); r.render(v.qsc, v.qcam);
    r.readRenderTargetPixels(v.rt2, 0, 0, v.W, v.H, v.buf);
    r.setRenderTarget(prevRT); r.setClearColor(prevC, prevA);
    if (cv.width !== v.W) { cv.width = v.W; cv.height = v.H; }
    const g = cv.getContext('2d');
    if (!v.img) v.img = g.createImageData(v.W, v.H);
    v.img.data.set(v.buf);
    g.putImageData(v.img, 0, 0);
  },
};

// the appearance is known from the very start (the network code publishes Game.appearance as `ap`)
Game.appearance = Character.loadAp();
// for tests and the console (window.RAFFICA is built later in 99_boot)
window.RAFFICA_LO = { Loadout, Character, LOADOUT_POOLS };
