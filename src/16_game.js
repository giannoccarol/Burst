// ===================================================================
// Game: local player, combat, entities, match flow, network glue
// ===================================================================
const F_ALIVE = 1, F_CROUCH = 2, F_SLIDE = 4, F_GROUND = 8, F_ADS = 16, F_RELOAD = 32, F_PROT = 64, F_FIRE = 128;
const RESPAWN = { ffa: 3, tdm: 3.5, hp: 4, ctf: 4.5, gun: 2.5, inf: 2.5 };
const BOT_NAMES = ['Gino', 'Pino', 'Tonino', 'Mimmo', 'Ciro', 'Beppe', 'Nando', 'Rocco', 'Sandro', 'Vito', 'Peppe', 'Franco', 'Enzo', 'Gigi', 'Totò', 'Lello'];

class Ent {
  constructor(id, kind) {
    this.id = id; this.kind = kind; this.name = 'Giocatore'; this.team = 0; this.cls = 0;
    this.hp = 100; this.maxHp = 100; this.alive = false; this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.flags = 0; this.w = 0; this.avatar = null; this.k = [0, 0, 0, 0, 0, 0, 0];
    this.hb = null; this.sample = {}; this.lastAlive = false; this.stepDist = 0; this.seenT = 0; this.vote = -1;
  }
  get crouch() { return !!(this.flags & F_CROUCH); }
  get slide() { return !!(this.flags & F_SLIDE); }
  ensureAvatar(scene) {
    if (!this.avatar) {
      if (!this.ap && (this.kind === 'bot' || this.kind === 'rbot')) this.ap = Character.randomAp(this.id); // bots: random soldier look
      this.avatar = new Avatar({}); Character.bindEnt(this, this.avatar); scene.add(this.avatar.root);
    }
    return this.avatar;
  }
  disposeAvatar(scene) { if (this.avatar) { scene.remove(this.avatar.root); this.avatar.dispose(); this.avatar = null; } }
}

const Game = {
  state: 'boot', time: 0, last: 0, mapInfo: null, world: null, dyn: null,
  vm: null, me: null, ents: new Map(), bots: [], g: null, rEnd: 0, lastG: null, lastGId: null,
  hostSince: 0, wasHost: false, joinT: 0, roomCfg: { bots: 4, diff: 1, mode: 0 }, menuCam: 0, shake: 0,
  cls: clamp(store.get('cls', 0), 0, CLASSES.length - 1), nick: sanitizeName(store.get('nick', '')),
  frame: 0, fps: 60, fpsAcc: 0, fpsN: 0, mapId: 'borgo', pendingClass: null,
  myId() { return Net.myPeer || 'local'; },
  mode() { return this.g ? MODES[this.g.m] : MODES[0]; },

  // ------------------------------------------------------------ boot
  async boot() {
    const root = $('#stage');
    R.init(root);
    HUD.loading('Genero i materiali…', 0.1);
    await nextFrame();
    makeMaterials(R.q);
    HUD.loading('Costruisco il borgo…', 0.45);
    await nextFrame();
    makeGunMaterials();
    R.setupSky();
    this.loadMap(builtinMap(store.get('map', 'borgo')) ? store.get('map', 'borgo') : 'borgo');
    HUD.loading('Ultimi ritocchi…', 0.8);
    await nextFrame();
    FX.init(R.scene);
    this.vm = new Viewmodel(R.vmScene);
    R.buildPost();
    R.resize(true);
    Input.init(R.renderer.domElement);
    Input.listeners.on('unlock', () => { if (this.state === 'playing' && !HUD.chatOpen && !this.editor) HUD.showPause(true); });
    // browsers refuse a re-lock right after an unlock (death, Esc): retry once quietly, and only explain
    // the drag-to-look fallback when the page really sits in a frame that blocks pointer lock
    Input.listeners.on('lockerror', () => {
      if (this.state !== 'playing') return;
      if (!this._lockRetry) { this._lockRetry = true; setTimeout(() => { if (this.state === 'playing' && !Input.locked && !HUD.pauseOpen && !HUD.chatOpen) Input.requestLock(); }, 1200); return; }
      let framed = true; try { framed = window.self !== window.top; } catch (e) { framed = true; }
      if (framed) HUD.lockHint(true);
    });
    Input.listeners.on('lock', () => { this._lockRetry = false; HUD.lockHint(false); });
    Input.listeners.on('key', (code) => this.onKey(code));
    addEventListener('resize', () => R.resize());
    if (isTouchDevice()) Touch.init($('#touch'));
    Net.emitter.on('event', (info, ev) => this.onNetEvent(info, ev));
    Net.emitter.on('left', (info) => this.onPeerLeft(info));
    Net.emitter.on('lobby', () => HUD.refreshRooms());
    await Net.init();
    if (!this.nick) this.nick = sanitizeName(Net.myName) || ('Giocatore' + rndi(10, 99));
    this.me = this.makeLocal();
    // 3D models (weapons, soldiers): bounded wait, late files are swapped in when they arrive
    await GunModels.preloadBoot((p) => HUD.loading('Carico armi e soldati…', 0.82 + 0.16 * p));
    HUD.init();
    // compile shaders up front so the first fight doesn't stutter
    try { R.renderer.compile(R.scene, R.camera); R.renderer.compile(R.vmScene, R.vmCamera); } catch (e) { /* optional */ }
    this.state = 'menu';
    HUD.loading(null);
    HUD.showMenu(true);
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  },
  loadMap(id, def) {
    if (this.mapGroup) {
      R.scene.remove(this.mapGroup);
      this.mapGroup.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    }
    if (this.backdrop) { R.scene.remove(this.backdrop.group); this.backdrop = null; }
    if (this.dynGroup) { R.scene.remove(this.dynGroup); }
    for (const l of this.mapLights || []) R.scene.remove(l);
    this.mapLights = [];
    const holder = new THREE.Group();
    R.scene.add(holder);
    let map;
    const B = builtinMap(id) || (def ? null : BUILTIN_MAPS.borgo);
    if (B) {
      R.applyEnv(B.env); R.setShadowExtent(B.shadow);
      const r = B.load(holder);
      map = r.map; this.backdrop = r.backdrop; this.mapInfo = r.info; id = r.info.id;
    } else {
      map = buildCustomMap(holder, def, id);
      this.mapInfo = map.info;
      R.applyEnv(map.info.env.sky); R.setShadowExtent(map.info.env.size / 2 + 8);
    }
    this.mapId = id;
    this.mapGroup = holder;
    this.world = map.world;
    const dg = new THREE.Group(); R.scene.add(dg); this.dynGroup = dg;
    this.dyn = map.dynamic ? map.dynamic(dg) : map.water ? buildDynamic(dg, map) : { update() {} };
    for (const l of map.lights || []) {
      if (l.type === 'point') { const pl = new THREE.PointLight(l.color, l.intensity, l.distance, 2); pl.position.set(...l.pos); R.scene.add(pl); this.mapLights.push(pl); }
    }
    if (this.me) this.me.mover.world = this.world;
    for (const b of this.bots) b.mover.world = this.world;
    Nav.built = false;
  },
  async switchMap(id) {
    if (id === this.mapId) return true;
    if (builtinMap(id)) { this.loadMap(id); return true; }
    const def = id.startsWith('local:') ? Editor.localDef(id) : await Editor.fetchMap(id);
    if (!def) { HUD.toast('Mappa non disponibile: torno al Borgo'); if (this.mapId !== 'borgo') this.loadMap('borgo'); return false; }
    this.loadMap(id, def);
    return true;
  },
  makeLocal() {
    return {
      id: 'local', name: this.nick, cls: this.cls, team: 0, alive: false, hp: 100, maxHp: 100,
      mover: new Mover(this.world), yaw: 0, pitch: 0, punchP: 0, punchY: 0,
      inv: [], slot: 0, lastSlot: 0, switchT: 0, reload: null, nextFire: 0, adsT: 0, bloom: 0, bolt: -1, pump: -1, melee: -1, meleeDone: false, quickMelee: false,
      spawnProt: 0, respawnT: 0, deadT: 0, killer: null, regenT: 0,
      stats: { k: 0, d: 0, a: 0, sc: 0, streak: 0, best: 0, lvl: 0, caps: 0 }, dmgFrom: new Map(),
      footDist: 0, vote: -1, speedMult: 1, infected: false, wasReloadKey: false, autoReloadT: 0, lastHitT: 0,
      acc: { sh: 0, hi: 0, h: 0, b: 0, l: 0 },
    };
  },
  // ------------------------------------------------------------ main loop
  loop(t) {
    if (window.__RAF_TEST && window.__RAF_TEST.timerLoop) setTimeout(() => this.loop(performance.now()), 16);
    else requestAnimationFrame((tt) => this.loop(tt));
    let dt = (t - this.last) / 1000;
    this.last = t;
    if (!(dt > 0)) dt = 1 / 60;
    this.fpsAcc += Math.min(dt, 1); this.fpsN++;
    dt = Math.min(dt, window.__RAF_TEST ? 0.1 : 0.05);
    this.time += dt;
    this.frame++;
    if (this.fpsAcc > 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; this.autoScale(); }
    try {
      const p0 = performance.now();
      if (this.editor) this.editor.update(dt);
      else if (this.state === 'playing') this.updatePlaying(dt);
      else this.updateMenu(dt);
      this.dyn.update(this.time);
      FX.update(dt, R.camera);
      FX.setScale(R.camera, R.renderer.domElement.height);
      SFX.updateListener(R.camera);
      const p1 = performance.now();
      if (!(window.__RAF_TEST && window.__RAF_TEST.norender)) R.render(this.time);
      const p2 = performance.now();
      this.prof = this.prof || { upd: 0, ren: 0 };
      this.prof.upd = this.prof.upd * 0.9 + (p1 - p0) * 0.1; this.prof.ren = this.prof.ren * 0.9 + (p2 - p1) * 0.1;
    } catch (e) { console.error(e); }
    Input.endFrame();
  },
  autoScale() {
    if (!R.dynRes() || this.state !== 'playing') return;
    // dynamic resolution to keep the game smooth
    const prev = R.dynScale;
    if (this.fps < 45) R.dynScale = Math.max(0.6, R.dynScale - 0.08);
    else if (this.fps > 75) R.dynScale = Math.min(1, R.dynScale + 0.04);
    if (prev !== R.dynScale) R.resize(true);
  },
  updateMenu(dt) {
    this.menuCam += dt * 0.05;
    const mc = (this.mapInfo && this.mapInfo.menuCam) || { c: [0, 2, 0], r: 28, h: 16 };
    const a = this.menuCam;
    R.camera.position.set(mc.c[0] + Math.sin(a) * mc.r, mc.h + Math.sin(a * 0.7) * 2.5, mc.c[2] + Math.cos(a) * mc.r);
    R.camera.lookAt(mc.c[0], mc.c[1], mc.c[2]);
    R.camera.fov = 55; R.camera.updateProjectionMatrix();
    R.vmScene.visible = false;
    this.vm.update(dt, { ads: 0, speed: 0, grounded: true, visible: false });
  },

  // ------------------------------------------------------------ joining / leaving
  playOffline(cfg) { return this.play(null, cfg, true); },
  async play(roomName, cfg, offline) {
    SFX.init();
    if (cfg) Object.assign(this.roomCfg, cfg);
    this.state = 'joining';
    HUD.showMenu(false);
    offline = offline || !Net.online();
    HUD.connecting(true, offline ? 'Allenamento' : 'Entro nella stanza…');
    if (this.pendingMap && this.pendingMap !== this.mapId) await this.switchMap(this.pendingMap);
    this.pendingMap = null;
    let how = 'offline';
    if (!offline) how = await Net.join(roomName || 'borgo'); else Net.leave();
    this.joinT = performance.now();
    this.g = null; this.lastGId = null; this.hostSince = 0;
    // nothing from a previous room may leak into this one (match state, host bots, host role)
    this.lastG = null; this.lastHostInfo = null; this.wasHost = false; this.rEnd = 0; this.lastPh = undefined; this.mapFail = null;
    this.clearEnts();
    this.me = this.makeLocal();
    this.me.name = this.nick; this.me.cls = this.cls;
    if (!offline) Net.setLobby({ rm: roomName, n: this.nick, md: this.roomCfg.mode, mp: this.mapId, hn: 0 });
    // wait for the room to answer so we follow an existing host instead of starting our own match
    if (!offline) await this.settleRoom();
    HUD.connecting(false);
    this.state = 'playing';
    HUD.showHUD(true);
    R.vmScene.visible = true;
    SFX.startAmbience(this.mapInfo.water ? new THREE.Vector3(0, 1, 0) : null);
    this.requestLock();
    if (how === 'lobby') HUD.toast('Stanze separate non disponibili: giochi nella stanza comune.');
  },
  // After joining: publish a minimal presence (not host-eligible yet) and wait until a running
  // match shows up, or until we are clearly alone. Only then may this peer be elected, so a
  // newcomer never starts its own match over an existing one (e.g. a host busy loading a map).
  async settleRoom() {
    const t0 = performance.now(), room = Net.roomName;
    for (;;) {
      await new Promise((r) => setTimeout(r, 100));
      if (Net.roomName !== room) return;
      const el = performance.now() - t0;
      Net.send({ n: this.nick, c: this.cls, tm: 0, mp: this.mapId, k: [0, 0, 0, 0, 0, 0, 0], vt: -1, ap: apOk(this.appearance) }, true);
      if (Net.claimSeen() && el > 300) break;
      if (el > NET_CFG.settleAlone && !Net.othersHere()) break;
      if (el > NET_CFG.settleMax) break;
    }
    Net.ready = true;
  },
  requestLock() {
    if (isTouchDevice()) return;
    Input.enabled = true; Input.wantLock = true;
    Input.requestLock();
  },
  leave() {
    Progress.flush(true);
    Input.exitLock(); Input.enabled = false; Input.wantLock = false;
    Net.leave();
    for (const b of this.bots) b.ent.disposeAvatar(R.scene);
    this.bots = [];
    this.clearEnts();
    FX.clear();
    SFX.stopAmbience();
    this.state = 'menu';
    this.g = null; this.lastG = null; this.lastHostInfo = null; this.wasHost = false;
    HUD.showHUD(false); HUD.showPause(false); HUD.showEnd(false); HUD.showDeath(false);
    if (Editor.testing) { Editor.testing = false; Editor.open({ resume: true }); return; }
    HUD.showMenu(true);
  },
  clearEnts() { for (const e of this.ents.values()) e.disposeAvatar(R.scene); this.ents.clear(); },

  // ------------------------------------------------------------ per-frame gameplay
  updatePlaying(dt) {
    const now = performance.now();
    const me = this.me;
    me.id = this.myId();
    this.updateHostRole(now, dt);
    this.syncMatch(now);
    Progress.tick(dt);
    // local player
    if (me.alive) this.updateLocal(dt, now);
    else this.updateDead(dt, now);
    // host-side simulation
    if (this.isHost()) {
      this.updateBotsHost(dt, now);
      if (this.g) ModeHost.update(dt, this.g, this.combatants());
    }
    this.updateRemote(dt, now);
    this.updateRockets(dt);
    this.updateObjectives(dt);
    HUD.update(dt);
    this.sendState(now);
  },
  isHost() { return Net.amHost(); },
  // custom-map triggers: kill volumes, jump pads, teleporters
  mapTriggers(mv) {
    const T = this.mapInfo && this.mapInfo.triggers;
    if (!T) return null;
    const p = mv.pos;
    for (const k of T.kills) if (inBox(k, p)) return 'kill';
    for (const pd of T.pads) if (inBox(pd.box, p) && mv.vel.y < pd.pow * 0.6) { mv.vel.y = pd.pow; mv.onGround = false; mv.coyoteT = 0; return 'pad'; }
    for (const t of T.teleIn) {
      if (!inBox(t.box, p)) continue;
      const ex = T.teleOut.filter((e) => e.ch === t.ch);
      if (ex.length) return { tele: ex[Math.floor(Math.random() * ex.length)] };
    }
    return null;
  },
  updateHostRole(now, dt) {
    Net.elect(now);
    const host = this.isHost();
    if (host && !this.wasHost) {
      this.hostSince = now;
      // adopt the last known match state (always a private copy: presence objects are frozen)
      const bc = !this.lastG && Net.bestClaim();
      if (bc) this.lastHostInfo = bc;
      const base = this.lastG || (bc && bc.g);
      if (bc) this.rEnd = now + bc.g.r * 1000;
      this.g = (base && decodeG(encodeG(base))) || newMatchState(this.roomCfg.mode | 0, this.mapId);
      if (base) {
        this.g.r = Math.max(this.g.ph === 1 ? 2 : 5, (this.rEnd - now) / 1000);
        if (base.cfg) { this.roomCfg.bots = base.cfg.b | 0; this.roomCfg.diff = base.cfg.d | 0; }
      }
      // a new term: a returning old host (lower term) yields to us
      this.g.he = ((base && base.he) | 0) + 1;
      this.adoptBots();
    }
    if (!host && this.wasHost) { for (const b of this.bots) b.ent.disposeAvatar(R.scene); this.bots = []; }
    Net.claim = host && this.g ? (this.g.he | 0) || 1 : 0;
    this.wasHost = host;
  },
  // new host: keep the previous host's bots (same ids, names, stats, positions)
  adoptBots() {
    const info = this.lastHostInfo;
    this.lastHostInfo = null;
    if (!info || !info.bots || !info.bots.size || !this.world || !Net.game) return;
    if (!Nav.built) Nav.build(this.world, this.mapInfo.bounds);
    for (const bi of info.bots.values()) {
      if (this.botById(bi.id)) continue;
      const s = bi.snaps[bi.snaps.length - 1];
      const b = new Bot(bi.id, bi.name, bi.cls);
      b.stats = { k: bi.k[0] | 0, d: bi.k[1] | 0, a: 0, sc: bi.k[3] | 0, lvl: bi.k[5] | 0 };
      b.ent.team = bi.team;
      const old = this.ents.get(bi.id);
      if (old) { if (old.avatar) { b.ent.avatar = old.avatar; old.avatar = null; } b.ent.lastAlive = old.lastAlive; this.ents.delete(bi.id); }
      if (s && (s.f & F_ALIVE)) {
        b.loadout();
        b.mover.reset(s.x, s.y, s.z); b.yaw = s.yaw; b.pitch = s.pitch;
        b.hp = clamp(s.hp, 1, b.maxHp || 100); b.ent.alive = true; b.ent.pos.set(s.x, s.y, s.z);
      } else { b.ent.alive = false; b.respawnT = rnd(0.5, 1.5); }
      this.bots.push(b);
    }
  },
  syncMatch(now) {
    if (!this.isHost()) {
      const hp = Net.hostPeer();
      const info = hp && Net.peers.get(hp);
      if (info && info.g) {
        const g = info.g;
        this.g = g; this.lastG = g; this.lastHostInfo = info;
        const newEnd = now + g.r * 1000;
        if (Math.abs(newEnd - this.rEnd) > 600) this.rEnd = newEnd;
      }
    } else if (this.g) {
      this.rEnd = now + this.g.r * 1000;
      this.lastG = this.g;
    }
    const g = this.g;
    if (!g) return;
    if (g.mp && g.mp !== this.mapId && !this.switching) {
      // a map that failed to load is not retried every frame
      if (this.mapFail && this.mapFail.id === g.mp && now - this.mapFail.t < 15000) { if (this.isHost()) g.mp = this.mapId; return; }
      this.switching = true;
      const target = g.mp;
      // one more presence before a long synchronous build, so the room sees why we pause
      Net.send({}, true);
      setTimeout(() => {
        Promise.resolve(this.switchMap(target)).catch(() => false).then((ok) => {
          this.switching = false;
          if (ok === false || this.mapId !== target) { this.mapFail = { id: target, t: performance.now() }; if (this.isHost() && this.g) this.g.mp = this.mapId; }
          this.me.alive = false; this.me.respawnT = 0.3;
        });
      }, 60);
      return;
    }
    if (this.switching) return;
    if (g.id !== this.lastGId) {
      const first = this.lastGId == null;
      this.lastGId = g.id;
      this.onNewMatch(first);
    }
    if (g.ph !== this.lastPh) {
      if (g.ph === 1) this.onMatchEnd();
      else HUD.showEnd(false);
      this.lastPh = g.ph;
    }
    // my team from the host's assignment
    const mode = MODES[g.m];
    const t = g.t ? g.t[this.myId()] : undefined;
    const newTeam = mode.teams ? (t === 1 || t === 2 ? t : 0) : 0;
    if (newTeam !== this.me.team) {
      const wasInf = this.me.team === 2 && mode.id === 'inf';
      this.me.team = newTeam;
      this.vm.setTeamColor(TEAM_COLORS[newTeam] || '#888');
      if (mode.id === 'inf' && newTeam === 2 && !wasInf && this.me.alive) { this.giveLoadout(); HUD.banner('Sei infetto!', 'Contagia i sopravvissuti col coltello', '#7fbf4f'); }
    }
  },
  onNewMatch(first) {
    const me = this.me;
    me.stats = { k: 0, d: 0, a: 0, sc: 0, streak: 0, best: 0, lvl: 0, caps: 0 };
    me.acc = { sh: 0, hi: 0, h: 0, b: 0, l: 0 };
    me.vote = -1;
    FX.clear();
    HUD.showEnd(false);
    HUD.clearFeed();
    const mode = this.mode();
    Progress.onMatchStart();
    HUD.banner(mode.name, mode.desc, null, 4, this.mapInfo ? this.mapInfo.name : '');
    if (!first || !me.alive) { me.alive = false; me.respawnT = first ? 0.2 : 0.8; }
    if (this.isHost()) for (const b of this.bots) { b.stats = { k: 0, d: 0, a: 0, sc: 0, lvl: 0 }; b.die(null, true); b.respawnT = rnd(0.5, 1.5); }
    SFX.bell(new THREE.Vector3(11, 20, -43));
  },
  onMatchEnd() {
    Progress.onMatchEnd(this.didWin());
    HUD.showEnd(true);
    SFX.objective(this.didWin());
    Input.exitLock();
  },
  didWin() {
    const g = this.g; if (!g) return false;
    if (g.w === 'T1') return this.me.team === 1;
    if (g.w === 'T2') return this.me.team === 2;
    return g.w === this.myId();
  },

  // ------------------------------------------------------------ local player
  classDef() { return CLASSES[this.me.cls] || CLASSES[0]; },
  giveLoadout() {
    const me = this.me, mode = this.mode(), c = this.classDef();
    let ids;
    if (mode.id === 'gun') ids = [GUNGAME_LIST[Math.min(me.stats.lvl, GUNGAME_LIST.length - 1)]];
    else if (mode.id === 'inf' && me.team === 2) ids = ['knife'];
    else ids = Loadout.weapons(me.cls); // class weapons as chosen in the Armeria
    if (mode.id === 'gun' && ids[0] !== 'knife') ids.push('knife');
    me.inv = ids.map((id) => ({ id, ammo: WEAPONS[id].mag || 0 }));
    me.slot = 0; me.lastSlot = 0;
    me.maxHp = mode.id === 'inf' && me.team === 2 ? 150 : c.hp;
    me.speedMult = c.speed * (mode.id === 'inf' && me.team === 2 ? 1.12 : 1);
    if (mode.id === 'gun') { me.maxHp = 100; me.speedMult = 1.05; }
    me.hp = me.maxHp;
    me.reload = null; me.bolt = -1; me.pump = -1; me.melee = -1; me.adsT = 0; me.bloom = 0;
    this.equip(0, true);
  },
  equip(slot, instant) {
    const me = this.me;
    if (!me.inv[slot]) return;
    if (slot !== me.slot) me.lastSlot = me.slot;
    me.slot = slot;
    const w = me.inv[slot];
    const def = WEAPONS[w.id];
    me.switchT = instant ? 0.15 : def.swap || 0.4;
    me.reload = null; me.bolt = -1; me.pump = -1; me.melee = -1; me.adsT = 0;
    this.vm.setWeapon(w.id, me.switchT);
    SFX.mech('equip');
  },
  cur() { return this.me.inv[this.me.slot]; },
  spawnMe() {
    const me = this.me;
    if (this.pendingClass != null) { me.cls = this.pendingClass; this.cls = this.pendingClass; this.pendingClass = null; store.set('cls', this.cls); }
    const sp = this.pickSpawn(me.team, me.id);
    me.mover.world = this.world;
    me.mover.reset(sp.x, sp.y + 0.02, sp.z);
    me.yaw = sp.yaw; me.pitch = 0; me.punchP = 0; me.punchY = 0;
    me.alive = true; me.spawnProt = 2.0; me.regenT = 0; me.dmgFrom.clear(); me.killer = null;
    this.giveLoadout();
    Net.pushEvent(EV.SPAWN, '', r2(sp.x), r2(sp.y), r2(sp.z));
    HUD.showDeath(false);
    HUD.flashSpawn();
  },
  pickSpawn(team, selfId) {
    const mode = this.mode();
    const all = this.mapInfo.spawns;
    let cands = all;
    if (mode.teams && mode.id !== 'inf' && team) cands = all.filter((s) => s.team === team);
    if (!cands.length) cands = all;
    const enemies = this.combatants().filter((c) => c.alive && c.id !== selfId && (!mode.teams || (this.teamOf(c.id) !== team) || !team));
    const scored = cands.map((s) => {
      let dmin = 999;
      for (const e of enemies) { const d = Math.hypot(e.pos.x - s.x, e.pos.z - s.z) + Math.abs(e.pos.y - s.y) * 2; if (d < dmin) dmin = d; }
      let vis = 0;
      for (const e of enemies) if (Math.hypot(e.pos.x - s.x, e.pos.z - s.z) < 30 && this.world.clear(s.x, s.y + 1.6, s.z, e.pos.x, e.pos.y + 1.6, e.pos.z)) vis++;
      return { s, score: Math.min(dmin, 40) - vis * 25 + Math.random() * 8 };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].s;
  },
  updateLocal(dt, now) {
    const me = this.me, mv = me.mover;
    const typing = HUD.chatOpen || HUD.pauseOpen || HUD.endOpen;
    // look
    const zoom = this.zoomFactor();
    const sens = 0.0021 * SETTINGS.sens * (me.adsT > 0.5 ? SETTINGS.adsSens / Math.sqrt(zoom) : 1);
    const T = Input.touch;
    const lookX = Input.mouse.dx + T.lookDX, lookY = Input.mouse.dy + T.lookDY;
    if (!typing) {
      me.yaw -= lookX * sens;
      me.pitch -= lookY * sens * (SETTINGS.invertY ? -1 : 1);
    }
    me.pitch = clamp(me.pitch, -1.5, 1.5);
    // movement input
    let mx = 0, mz = 0, jump = false, jumpP = false, crouch = false;
    if (!typing) {
      mx = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0) + T.mx;
      mz = (Input.down('fwd') ? 1 : 0) - (Input.down('back') ? 1 : 0) + T.mz;
      jump = Input.down('jump') || T.jump; jumpP = Input.pressed('jump') || T.jumpP; crouch = Input.down('crouch') || T.crouch;
    }
    const w = this.cur(), def = w ? WEAPONS[w.id] : WEAPONS.knife;
    const speedMult = me.speedMult * (def.speed || 1) * lerp(1, 0.64, me.adsT);
    // fixed-step physics
    const steps = Math.max(1, Math.ceil(dt / (1 / 125)));
    const sdt = dt / steps;
    let landed = 0, jumped = false, slid = false, mantled = false;
    for (let i = 0; i < steps; i++) {
      mv.step(sdt, { mx, mz, jump, jumpPressed: jumpP && i === 0, crouch, yaw: me.yaw, speedMult });
      if (mv.landedSpeed > landed) landed = mv.landedSpeed;
      if (mv.jumped) jumped = true;
      if (mv.slideStarted) slid = true;
      if (mv.mantled) mantled = true;
    }
    if (jumped) SFX.jump(true);
    if (slid) SFX.slide(true);
    if (landed > 4) { SFX.land(null, Math.min(1, landed / 14), true); this.shake = Math.max(this.shake, Math.min(0.5, landed / 30)); }
    if (landed > 2.5 && this.camFx) this.camFx.landV -= Math.min(4.5, (landed - 2) * 0.24);
    if (mantled) { SFX.footstep(mv.groundSurf, null, 0.8, true); if (this.camFx) this.camFx.landV -= 1.4; }
    if (mv.pos.y < -30) { this.dieMe(this.myId(), WIDX.knife, false); return; }
    const trg = this.mapTriggers(mv);
    if (trg === 'kill') { this.dieMe(this.myId(), WIDX.knife, false); return; }
    if (trg === 'pad') { SFX.jump(true); this.shake = Math.max(this.shake, 0.12); }
    if (trg && trg.tele && now > (me.teleT || 0)) {
      const e = trg.tele, sp = Math.hypot(mv.vel.x, mv.vel.z);
      mv.pos.set(e.x, e.y, e.z); me.yaw = e.yaw;
      mv.vel.set(-Math.sin(e.yaw) * sp, Math.max(0, mv.vel.y), -Math.cos(e.yaw) * sp);
      me.teleT = now + 700; HUD.flashSpawn(); SFX.ui();
    }
    // footsteps
    const hsp = Math.hypot(mv.vel.x, mv.vel.z);
    Progress.onMove(dt, hsp);
    if (mv.onGround && !mv.sliding && hsp > 2.5) {
      me.footDist += hsp * dt;
      const stride = mv.crouching ? 1.6 : 2.3;
      if (me.footDist > stride) { me.footDist = 0; SFX.footstep(mv.inWater ? 'water' : mv.groundSurf, null, mv.crouching ? 0.4 : 1, true); }
    }
    // camera
    this.updateCamera(dt);
    // weapons
    this.updateWeapon(dt, now, typing);
    // timers
    if (me.spawnProt > 0) me.spawnProt -= dt;
    me.regenT += dt;
    if (me.regenT > 5 && me.hp < me.maxHp) me.hp = Math.min(me.maxHp, me.hp + 22 * dt);
    // viewmodel
    this.vm.update(dt, {
      ads: me.adsT, speed: hsp, grounded: mv.onGround, sliding: mv.sliding, dx: lookX, dy: lookY,
      reload: me.reload ? { t: me.reload.t / me.reload.total, kind: me.reload.kind } : null,
      melee: me.melee >= 0 ? me.melee / me.meleeDur : -1, bolt: me.bolt >= 0 ? me.bolt / WEAPONS.sniper.bolt : -1,
      pump: me.pump >= 0 ? me.pump / 0.55 : -1, visible: !(def.scope && me.adsT > 0.8), landed, empty: w && w.ammo <= 0,
    });
    R.updateVMLight(this.world);
  },
  zoomFactor() { const w = this.cur(); if (!w) return 1; const def = WEAPONS[w.id]; return lerp(1, def.zoom || 1, easeIO(this.me.adsT)); },
  updateCamera(dt) {
    const me = this.me, mv = me.mover;
    me.punchP = damp(me.punchP, 0, 9, dt); me.punchY = damp(me.punchY, 0, 9, dt);
    this.shake = damp(this.shake, 0, 6, dt);
    this.rollKick = damp(this.rollKick || 0, 0, 7, dt);
    const sh = this.shake;
    const cam = R.camera;
    // camera motion: landing dip (spring), running bob, strafe lean, slide tilt, speed FOV
    const C = this.camFx || (this.camFx = { land: 0, landV: 0, bob: 0, amp: 0, roll: 0, fovK: 0 });
    const motion = SETTINGS.viewBob !== false;
    const hs = Math.hypot(mv.vel.x, mv.vel.z), ads = me.adsT;
    C.landV += (-95 * C.land - 15 * C.landV) * dt; C.land = clamp(C.land + C.landV * dt, -0.35, 0.15);
    const running = mv.onGround && !mv.sliding && !mv.mantle && hs > 1.5;
    if (running) C.bob += dt * (5.2 + hs * 0.55) * (mv.crouching ? 0.8 : 1);
    C.amp = damp(C.amp, motion && running ? clamp(hs / PHYS.baseSpeed, 0, 1.2) * (1 - ads * 0.85) * (mv.crouching ? 0.6 : 1) : 0, 9, dt);
    const bobY = (Math.abs(Math.sin(C.bob)) - 0.5) * 0.04 * C.amp, bobR = Math.sin(C.bob) * 0.005 * C.amp;
    const side = mv.vel.x * Math.cos(me.yaw) - mv.vel.z * Math.sin(me.yaw);
    const lean = motion ? clamp(side / PHYS.baseSpeed, -1.2, 1.2) * -0.011 * (1 - ads * 0.7) : 0;
    C.roll = damp(C.roll, lean + (mv.sliding ? -0.065 : 0) + (mv.mantle ? 0.03 : 0), mv.sliding ? 7 : 9, dt);
    const fk = motion ? clamp((hs - PHYS.baseSpeed) / (PHYS.maxSpeed - PHYS.baseSpeed), 0, 1) * 7 + (mv.sliding ? 4 : 0) : 0;
    C.fovK = damp(C.fovK, fk * (1 - ads), 5, dt);
    cam.position.set(mv.pos.x, mv.pos.y + mv.eye + mv.stepSmooth + C.land + bobY, mv.pos.z);
    cam.rotation.set(me.pitch + me.punchP + C.land * 0.18 + (Math.random() - 0.5) * sh * 0.04, me.yaw + me.punchY + (Math.random() - 0.5) * sh * 0.04, C.roll + bobR + this.rollKick + (Math.random() - 0.5) * sh * 0.02, 'YXZ');
    const fov = (SETTINGS.fov + C.fovK) / this.zoomFactor();
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  },
  updateDead(dt, now) {
    const me = this.me;
    me.deadT += dt;
    // death camera: drift up and look at the killer
    const cam = R.camera;
    const mv = me.mover;
    const k = Math.min(1, me.deadT / 1.2);
    const target = me.killer && this.posOf(me.killer);
    cam.position.set(mv.pos.x, mv.pos.y + lerp(mv.eye, 2.6, k), mv.pos.z);
    if (target && me.killer !== this.myId()) {
      const m4 = new THREE.Matrix4().lookAt(cam.position, new THREE.Vector3(target.x, target.y + 1.2, target.z), UP);
      const q = new THREE.Quaternion().setFromRotationMatrix(m4);
      cam.quaternion.slerp(q, Math.min(1, dt * 4));
    } else cam.rotation.x = lerp(cam.rotation.x, -0.6, dt * 2);
    this.vm.update(dt, { ads: 0, speed: 0, grounded: true, visible: false });
    if (cam.fov !== SETTINGS.fov) { cam.fov = SETTINGS.fov; cam.updateProjectionMatrix(); }
    if (this.g && this.g.ph === 1) return;
    me.respawnT -= dt;
    if (me.respawnT <= 0 && this.world) this.spawnMe();
  },
  // ------------------------------------------------------------ weapons
  updateWeapon(dt, now, typing) {
    const me = this.me, w = this.cur();
    if (!w) return;
    const def = WEAPONS[w.id];
    if (me.switchT > 0) me.switchT -= dt;
    me.bloom = Math.max(0, me.bloom - dt * ((def.spread && def.spread.max) || 0.05) * 4);
    // weapon switching
    if (!typing) {
      let want = -1;
      if (Input.pressed('w1')) want = 0; if (Input.pressed('w2')) want = 1; if (Input.pressed('w3')) want = 2;
      if (Input.pressed('swap') || Input.touch.swapP) want = me.lastSlot;
      if (Input.mouse.wheel) want = (me.slot + (Input.mouse.wheel > 0 ? 1 : -1) + me.inv.length) % me.inv.length;
      if (want >= 0 && want < me.inv.length && want !== me.slot) this.equip(want);
      if (Input.pressed('melee') && def.type !== 'melee') this.startMelee(true);
    }
    // reload progress
    if (me.reload) {
      const r = me.reload;
      r.t += dt;
      if (def.shells) {
        if (r.t >= r.total) {
          w.ammo++; SFX.mech('shell');
          if (w.ammo >= def.mag) { me.reload = null; me.pump = 0; SFX.mech('pump'); }
          else { r.t = 0; }
        }
      } else {
        if (!r.out && r.t > r.total * 0.25) { r.out = true; SFX.mech('magout'); }
        if (!r.in && r.t > r.total * 0.6) { r.in = true; SFX.mech('magin'); }
        if (r.t >= r.total) { w.ammo = def.mag; me.reload = null; SFX.mech(def.type === 'auto' ? 'rack' : 'magin'); }
      }
    }
    if (me.bolt >= 0) { me.bolt += dt; if (me.bolt >= def.bolt) me.bolt = -1; }
    if (me.pump >= 0) { me.pump += dt; if (me.pump >= 0.55) me.pump = -1; }
    if (me.melee >= 0) {
      me.melee += dt;
      if (!me.meleeDone && me.melee > me.meleeDur * 0.28) { me.meleeDone = true; this.meleeHit(me.quickMelee ? 50 : def.dmg); }
      if (me.melee >= me.meleeDur) { me.melee = -1; }
    }
    // ADS
    const wantAds = !typing && (Input.mouse.b2 || Input.touch.ads);
    const canAds = !me.reload && me.switchT <= 0 && def.type !== 'melee' && me.melee < 0 && !(me.bolt >= 0 && def.type === 'bolt');
    const adsSpd = 1 / (def.adsTime || 0.15);
    me.adsT = clamp(me.adsT + (wantAds && canAds ? adsSpd : -adsSpd * 1.3) * dt, 0, 1);
    if (def.scope && me.adsT > 0.85 && !this.wasScoped) SFX.mech('equip');
    this.wasScoped = def.scope && me.adsT > 0.85;
    // reload input
    if (!typing && (Input.pressed('reload') || Input.touch.reloadP)) this.startReload();
    if (w.ammo <= 0 && !me.reload && def.mag && now > me.nextFire && me.switchT <= 0) this.startReload();
    // firing
    const trig = !typing && (Input.mouse.b0 || Input.touch.fire);
    const press = !typing && (Input.mouse.p0 || (Input.touch.fire && !this.lastTouchFire));
    this.lastTouchFire = Input.touch.fire;
    if (me.switchT > 0 || me.melee >= 0) return;
    if (def.type === 'melee') { if (trig && now >= me.nextFire) this.startMelee(false); return; }
    const ready = now >= me.nextFire && me.bolt < 0 && me.pump < 0;
    if (!ready) return;
    const auto = def.type === 'auto';
    if ((auto && trig) || (!auto && press)) {
      if (me.reload) {
        if (def.shells && w.ammo > 0) me.reload = null; else return;
      }
      if (w.ammo <= 0) { if (press) SFX.mech('dry'); return; }
      this.fire();
    }
  },
  startReload() {
    const me = this.me, w = this.cur(), def = WEAPONS[w.id];
    if (!def.mag || me.reload || w.ammo >= def.mag || me.switchT > 0 || me.melee >= 0) return;
    const kind = def.shells ? 'shell' : w.id === 'revolver' ? 'cyl' : w.id === 'rocket' ? 'rocket' : w.id === 'lmg' ? 'belt' : 'mag';
    me.reload = { t: 0, total: def.reload, kind };
    me.adsT = Math.min(me.adsT, 0.3);
    Net.pushEvent(EV.RELOAD, '', WIDX[w.id]);
  },
  startMelee(quick) {
    const me = this.me;
    if (me.melee >= 0) return;
    me.melee = 0; me.meleeDone = false; me.quickMelee = quick;
    me.meleeDur = quick ? 0.6 : 60 / WEAPONS.knife.rpm;
    me.nextFire = performance.now() + me.meleeDur * 1000;
    me.reload = null;
    if (quick) this.vm.fire(0.2); else this.vm.fire(0);
    SFX.swing(null);
    Net.pushEvent(EV.MELEE, '');
    me.spawnProt = 0;
  },
  meleeHit(dmg) {
    const me = this.me;
    const cam = R.camera;
    const o = cam.getWorldPosition(new THREE.Vector3());
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    let best = null, bd = WEAPONS.knife.reach;
    for (const c of this.targets()) {
      if (!c.alive || c.id === me.id || this.isFriend(c.id)) continue;
      const tp = new THREE.Vector3(c.pos.x, c.pos.y + 1.0, c.pos.z);
      const to = tp.clone().sub(o); const d = to.length();
      if (d > bd + 0.3) continue;
      if (to.normalize().dot(f) < 0.55) continue;
      if (!this.world.clear(o.x, o.y, o.z, tp.x, tp.y, tp.z)) continue;
      best = c; bd = d;
    }
    if (!best) {
      const hit = this.world.raycast(o.x, o.y, o.z, f.x, f.y, f.z, 2.0);
      if (hit) { FX.impact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, hit.surf, 0.6); SFX.stab(new THREE.Vector3(hit.x, hit.y, hit.z)); }
      return;
    }
    // backstab: attacker behind the victim
    const vf = new THREE.Vector3(-Math.sin(best.yaw), 0, -Math.cos(best.yaw));
    const dir = new THREE.Vector3(best.pos.x - o.x, 0, best.pos.z - o.z).normalize();
    const back = vf.dot(dir) > 0.55;
    const dmgF = back && !me.quickMelee ? WEAPONS.knife.backstab : dmg;
    this.dealDamage(best, dmgF, false, WIDX.knife, new THREE.Vector3(best.pos.x, best.pos.y + 1.1, best.pos.z));
    SFX.stab(null);
  },
  spreadNow() {
    const me = this.me, def = WEAPONS[this.cur().id], s = def.spread, mv = me.mover;
    const hs = Math.hypot(mv.vel.x, mv.vel.z);
    let sp = lerp(s.hip, s.ads, def.scope ? Math.pow(me.adsT, 3) : me.adsT);
    sp += s.move * clamp(hs / 8, 0, 1.5) * (1 - me.adsT * 0.6);
    if (!mv.onGround) sp += s.air;
    if (mv.crouching && !mv.sliding) sp *= 0.75;
    sp += me.bloom;
    return Math.min(sp, (s.max || 0.1) + s.hip);
  },
  fire() {
    const me = this.me, w = this.cur(), def = WEAPONS[w.id];
    const now = performance.now();
    w.ammo--;
    me.nextFire = now + 60000 / def.rpm;
    me.spawnProt = 0;
    const cam = R.camera;
    cam.updateMatrixWorld();
    const o = cam.getWorldPosition(new THREE.Vector3());
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const spread = this.spreadNow();
    // visual muzzle position (viewmodel muzzle projected into the world)
    const mz = new THREE.Vector3();
    if (this.vm.m) { this.vm.m.muzzle.getWorldPosition(mz); mz.applyMatrix4(R.vmCamera.matrixWorldInverse); mz.applyMatrix4(cam.matrixWorld); }
    else mz.copy(o).addScaledVector(fwd, 0.6);
    this.vm.fire(1);
    SFX.shot(w.id, null, true);
    FX.flashLight(o.x + fwd.x * 0.8, o.y + fwd.y * 0.8, o.z + fwd.z * 0.8, 0xffb060, 9, 0.06, 9);
    const wIdx = WIDX[w.id];
    if (def.type === 'rocket') {
      const ro = o.clone().addScaledVector(fwd, 0.5).addScaledVector(right, 0.12).addScaledVector(up, -0.08);
      const d = this.applySpread(fwd, spread, right, up);
      this.launchRocket(this.myId(), ro, d, true);
      Net.pushEvent(EV.ROCKET, '', r2(ro.x), r2(ro.y), r2(ro.z), r3(d.x), r3(d.y), r3(d.z));
      if (this.vm.m && this.vm.m.parts.rocketHead && w.ammo <= 0) this.vm.m.parts.rocketHead.visible = false;
    } else {
      const pellets = def.pellets || 1;
      const hits = new Map();
      let firstEnd = null, firstSurf = 0;
      for (let i = 0; i < pellets; i++) {
        const d = this.applySpread(fwd, spread, right, up);
        const tr = this.trace(o, d, 300, this.myId());
        const end = new THREE.Vector3().copy(o).addScaledVector(d, tr.t);
        if (tr.ent) {
          const dist = tr.t;
          const r = def.range || [999, 999, 1];
          const fall = dist <= r[0] ? 1 : dist >= r[1] ? r[2] : lerp(1, r[2], (dist - r[0]) / (r[1] - r[0]));
          const mult = tr.part === 'head' ? def.head : tr.part === 'legs' ? 0.85 : 1;
          const h = hits.get(tr.ent.id) || { ent: tr.ent, dmg: 0, head: false, at: end, zone: 'legs' };
          h.dmg += def.dmg * mult * fall; h.head = h.head || tr.part === 'head';
          if (tr.part === 'head' || (tr.part === 'body' && h.zone === 'legs')) h.zone = tr.part;
          hits.set(tr.ent.id, h);
          FX.impact(end.x, end.y, end.z, -d.x, -d.y, -d.z, 'flesh');
        } else if (tr.hit) {
          FX.impact(tr.hit.x, tr.hit.y, tr.hit.z, tr.hit.nx, tr.hit.ny, tr.hit.nz, tr.hit.surf, pellets > 1 ? 0.5 : 1);
          if (tr.hit.surf !== 'water') FX.decal(tr.hit.x, tr.hit.y, tr.hit.z, tr.hit.nx, tr.hit.ny, tr.hit.nz, pellets > 1 ? 0.07 : 0.1);
        }
        if (i < 4) FX.tracer(mz.x, mz.y, mz.z, end.x, end.y, end.z, [1, 0.82, 0.5], 420, 0.018);
        if (!firstEnd) { firstEnd = end; firstSurf = tr.ent ? 6 : tr.hit ? Math.max(1, SURF_IDS.indexOf(tr.hit.surf)) : 0; }
      }
      Net.pushEvent(EV.SHOT, '', wIdx, r2(o.x), r2(o.y - 0.15), r2(o.z), r2(firstEnd.x), r2(firstEnd.y), r2(firstEnd.z), firstSurf);
      // accuracy: one shot per trigger pull, a hit if any pellet touched someone (best zone wins)
      me.acc.sh++; Progress.onShot();
      if (hits.size) {
        let zone = 'legs';
        for (const h of hits.values()) if (h.zone === 'head' || (h.zone === 'body' && zone === 'legs')) zone = h.zone;
        me.acc.hi++; me.acc[zone === 'head' ? 'h' : zone === 'legs' ? 'l' : 'b']++; Progress.onHit(zone);
      }
      for (const h of hits.values()) this.dealDamage(h.ent, Math.round(h.dmg), h.head, wIdx, h.at, h.zone);
    }
    // recoil
    const ads = me.adsT;
    me.punchP += def.recoil.p * (1 - ads * 0.35);
    me.pitch += def.recoil.p * 0.35 * (1 - ads * 0.3);
    me.yaw += (Math.random() - 0.5) * 2 * def.recoil.y;
    me.punchY += (Math.random() - 0.5) * def.recoil.y;
    me.bloom += def.spread.shot || 0;
    if (def.type === 'bolt') { me.bolt = 0.0001; setTimeout(() => SFX.mech('bolt'), 120); }
    if (def.type === 'pump') { me.pump = 0.0001; setTimeout(() => SFX.mech('pump'), 140); }
  },
  applySpread(fwd, spread, right, up) {
    if (spread <= 0) return fwd.clone();
    const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * spread;
    return fwd.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
  },
  // trace against world + all combatant hitboxes
  trace(o, d, maxT, shooterId) {
    const hit = this.world.raycast(o.x, o.y, o.z, d.x, d.y, d.z, maxT);
    let best = hit ? hit.t : maxT, ent = null, part = null;
    const mode = this.mode();
    for (const c of this.targets()) {
      if (!c.alive || c.id === shooterId) continue;
      if (mode.teams && this.teamOf(c.id) && this.teamOf(c.id) === this.teamOf(shooterId)) continue;
      // cheap reject: closest approach to the body centre
      const cx = c.pos.x - o.x, cy = c.pos.y + 0.9 - o.y, cz = c.pos.z - o.z;
      const along = cx * d.x + cy * d.y + cz * d.z;
      if (along < 0 || along > best + 1) continue;
      const px = cx - d.x * along, py = cy - d.y * along, pz = cz - d.z * along;
      if (px * px + py * py + pz * pz > 2.2) continue;
      const hb = hitboxesFor(c.pos, c.yaw, c.crouch, c.slide, c.hb || (c.hb = null));
      c.hb = hb;
      let t = raySphere(o, d, hb.head.c, hb.head.r);
      if (t >= 0 && t < best) { best = t; ent = c; part = 'head'; }
      t = rayCapsule(o, d, hb.body.a, hb.body.b, hb.body.r);
      if (t >= 0 && t < best) { best = t; ent = c; part = 'body'; }
      t = rayCapsule(o, d, hb.legs.a, hb.legs.b, hb.legs.r);
      if (t >= 0 && t < best) { best = t; ent = c; part = 'legs'; }
    }
    return { t: best, ent, part, hit: ent ? null : hit };
  },
  // every combatant other than the local player, as targets with pos/yaw/flags
  targets() {
    const out = this._tg || (this._tg = []);
    out.length = 0;
    for (const e of this.ents.values()) if (e.kind !== 'bot' && !e.stale) out.push(e);
    for (const b of this.bots) out.push(b.ent);
    if (this.me.alive) {
      const m = this.me, mv = m.mover;
      const le = this._le || (this._le = new Ent('local', 'local'));
      le.id = this.myId(); le.alive = true; le.pos.copy(mv.pos); le.yaw = m.yaw; le.flags = (mv.crouching ? F_CROUCH : 0) | (mv.sliding ? F_SLIDE : 0) | F_ALIVE;
      out.push(le);
    }
    return out;
  },
  isFriend(id) { const mode = this.mode(); if (!mode.teams) return false; const a = this.teamOf(id), b = this.me.team; return a && b && a === b; },
  dealDamage(ent, dmg, head, wIdx, at, zone) {
    if (dmg <= 0) return;
    const me = this.me;
    const prot = ent.flags & F_PROT;
    HUD.hitmarker(head, false, prot);
    SFX.hit(head);
    // points per hit by body part (Krunker-style), shown next to the crosshair
    if (!prot) {
      const z = head ? 'head' : zone || 'body';
      const pts = Math.max(1, Math.round(dmg * (z === 'head' ? 0.8 : z === 'legs' ? 0.4 : 0.5)));
      me.stats.sc += pts;
      const now = performance.now();
      const lbl = z === 'head' && now - (this._hsLbl || 0) > 700 ? 'Testa' : '';
      if (lbl) this._hsLbl = now;
      HUD.scorePop(pts, lbl, 'hs');
    }
    if (SETTINGS.damageNumbers && at) HUD.damageNumber(at, dmg, head);
    me.lastHitT = performance.now();
    me.hitState = { t: me.lastHitT, air: !me.mover.onGround, slide: me.mover.sliding };
    if (ent.kind === 'bot') this.botById(ent.id) && this.botById(ent.id).damage(this.myId(), dmg, head, wIdx);
    else Net.pushEvent(EV.HIT, '', ent.id, dmg, head ? 1 : 0, wIdx);
  },
  // ------------------------------------------------------------ damage to the local player
  damageMe(attacker, dmg, head, wIdx, from) {
    const me = this.me;
    if (!me.alive || me.spawnProt > 0) return;
    if (attacker !== this.myId() && this.isFriend(attacker)) return;
    me.hp -= dmg;
    me.regenT = 0;
    if (attacker !== this.myId()) { const d = me.dmgFrom.get(attacker) || { dmg: 0, t: 0 }; d.dmg += dmg; d.t = performance.now(); me.dmgFrom.set(attacker, d); }
    const src = from || this.posOf(attacker);
    const f = clamp(dmg / me.maxHp, 0, 1);
    const self = attacker === this.myId();
    if (src && !self) HUD.damageDir(src, f, attacker);
    HUD.hurt(self ? f * 0.5 : f);
    SFX.hurt(f, head);
    this.shake = Math.max(this.shake, Math.min(0.4, dmg / 120));
    // flinch: the view kicks up and away from the shooter
    if (!self) {
      const side = src ? Math.sign(Math.sin(Math.atan2(src.x - me.mover.pos.x, -(src.z - me.mover.pos.z)) + me.yaw)) || 1 : (Math.random() < 0.5 ? -1 : 1);
      const k = (0.35 + f * 1.6) * (1 - me.adsT * 0.4) * (head ? 1.4 : 1);
      me.punchP += 0.022 * k; me.punchY += side * 0.018 * k;
      this.rollKick = (this.rollKick || 0) - side * 0.035 * k;
    }
    if (me.hp <= 0) this.dieMe(attacker, wIdx, head);
  },
  dieMe(killer, wIdx, head) {
    const me = this.me;
    if (!me.alive) return;
    me.alive = false; me.hp = 0; me.deadT = 0; me.killer = killer;
    me.stats.d++;
    Progress.onDeath();
    const streak = me.stats.streak; me.stats.streak = 0;
    const mode = this.mode();
    me.respawnT = RESPAWN[mode.id] || 3;
    // assist: most damage from someone other than the killer in the last 8 s
    let assist = '', best = 0;
    const now = performance.now();
    for (const [id, d] of me.dmgFrom) if (id !== killer && now - d.t < 8000 && d.dmg > best && d.dmg >= 25) { best = d.dmg; assist = id; }
    if (mode.id === 'gun' && wIdx === WIDX.knife && killer !== this.myId()) me.stats.lvl = Math.max(0, me.stats.lvl - 1);
    Net.pushEvent(EV.DIE, '', killer || '', wIdx, head ? 1 : 0, assist, streak);
    this.handleDeath(this.myId(), killer, wIdx, head, assist, streak);
    HUD.showDeath(true, killer, wIdx);
    me.reload = null; me.adsT = 0;
  },
  // common death bookkeeping (feed, host scoring, credit to the local player)
  handleDeath(victim, killer, wIdx, head, assist, streak) {
    const me = this.me;
    const vTeam = this.teamOf(victim), kTeam = killer ? this.teamOf(killer) : 0;
    const wName = WEAPONS[WEAPON_IDS[wIdx]] ? WEAPONS[WEAPON_IDS[wIdx]].kill : '';
    HUD.feed(killer && killer !== victim ? this.nameOf(killer) : '', killer && killer !== victim ? this.colorOf(killer) : '', wName, this.nameOf(victim), this.colorOf(victim), head, killer === victim || !killer);
    if (this.isHost() && this.g) ModeHost.onDeath(this.g, victim, killer, vTeam, kTeam);
    const myId = this.myId();
    if (killer === myId && victim !== myId) {
      me.stats.k++; me.stats.streak++; me.stats.best = Math.max(me.stats.best, me.stats.streak);
      let pts = 100 + (head ? 50 : 0);
      me.stats.sc += pts;
      const mode = this.mode();
      if (mode.id === 'gun') {
        me.stats.lvl++;
        if (me.stats.lvl < GUNGAME_LIST.length && me.alive) { const nid = GUNGAME_LIST[me.stats.lvl]; me.inv = [{ id: nid, ammo: WEAPONS[nid].mag || 0 }]; if (nid !== 'knife') me.inv.push({ id: 'knife', ammo: 0 }); this.equip(0); HUD.toast('Nuova arma: ' + WEAPONS[nid].name); }
      }
      HUD.killNotice(this.nameOf(victim), head, me.stats.streak, pts);
      const hs = me.hitState && performance.now() - me.hitState.t < 2500 ? me.hitState : { air: !me.mover.onGround, slide: me.mover.sliding };
      const infMode = mode.id === 'inf' && me.team === 2;
      Progress.onKill({ head, wid: WEAPON_IDS[wIdx], air: hs.air, slide: hs.slide, streak: me.stats.streak, cls: me.cls, clsOk: mode.id !== 'gun' && !infMode, infected: infMode });
      SFX.kill(head);
      HUD.hitmarker(head, true);
      HUD.scorePop(pts, head ? 'Colpo alla testa' : 'Eliminato', head ? 'hs' : 'k');
    }
    if (assist === myId && killer !== myId) { me.stats.a++; me.stats.sc += 50; HUD.killNotice(this.nameOf(victim), false, 0, 50, true); Progress.onAssist(); }
    // avatar death animation
    const e = this.ents.get(victim) || (this.botById(victim) && this.botById(victim).ent);
    if (e && e.avatar) e.avatar.kill(Math.random() < 0.5 ? 1 : -1);
  },
  // ------------------------------------------------------------ rockets
  launchRocket(owner, o, d, local) {
    const def = WEAPONS.rocket;
    const r = FX.spawnRocket(o.x, o.y, o.z, d.x, d.y, d.z, def.projSpeed);
    r.owner = owner; r.local = local; r.dir = d.clone();
    this.rockets = this.rockets || [];
    this.rockets.push(r);
    SFX.shot('rocket', local ? null : o);
    if (!local) FX.muzzle(o.x, o.y, o.z, d.x, d.y, d.z, 1.4);
    return r;
  },
  updateRockets(dt) {
    if (!this.rockets) return;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      const p = r.m.position;
      const step = r.speed * dt;
      const tr = this.trace(p, r.dir, step + 0.2, r.owner);
      if (tr.t < step + 0.2 || r.life <= 0) {
        const hp = p.clone().addScaledVector(r.dir, Math.max(0, tr.t - 0.15));
        this.rockets.splice(i, 1);
        FX.removeRocket(r);
        if (r.local || (r.owner && this.botById(r.owner))) {
          // authoritative explosion from the shooter (local player or my bot)
          Net.pushEvent(EV.BOOM, this.botById(r.owner) ? r.owner : '', r2(hp.x), r2(hp.y), r2(hp.z));
          this.explode(hp, r.owner, true);
        } else if (!r.waitBoom) this.explode(hp, r.owner, false);
        continue;
      }
      p.addScaledVector(r.dir, step);
    }
  },
  explode(p, owner, authoritative) {
    FX.explosion(p.x, p.y, p.z, WEAPONS.rocket.radius);
    SFX.explosion(p.clone());
    const cd = R.camera.position.distanceTo(p);
    this.shake = Math.max(this.shake, clamp(1.2 - cd / 18, 0, 1));
    const hit = this.world.raycast(p.x, p.y + 0.3, p.z, 0, -1, 0, 2.5);
    if (hit) FX.decal(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, 2.6, true);
    if (authoritative) this.splashDamage(p, owner);
  },
  // splash from an authoritative BOOM: everyone applies it to themselves; the host to its bots
  splashDamage(p, owner) {
    const def = WEAPONS.rocket;
    const me = this.me;
    if (me.alive) {
      const c = me.mover.pos.clone(); c.y += 0.9;
      const d = c.distanceTo(p);
      if (d < def.radius && this.world.clear(p.x, p.y + 0.2, p.z, c.x, c.y, c.z)) {
        const f = 1 - d / def.radius;
        const self = owner === this.myId();
        const dir = c.clone().sub(p).normalize(); dir.y = Math.max(dir.y, 0.35); dir.normalize();
        me.mover.impulse(dir.x * def.knock * f, dir.y * def.knock * f * 1.1, dir.z * def.knock * f);
        if (self || !this.isFriend(owner)) this.damageMe(owner, Math.round(def.dmg * f * (self ? def.selfMult : 1)), false, WIDX.rocket, p);
      }
    }
    if (this.isHost()) for (const b of this.bots) b.splash(p, owner);
  },
  // ------------------------------------------------------------ network events
  onNetEvent(info, ev) {
    if (this.state !== 'playing') return;
    const type = ev[1];
    const actor = netId(ev[2]) || info.peer;
    const isBot = actor !== info.peer;
    if (isBot && info.peer !== Net.hostPeer()) return; // only the host speaks for bots
    const myId = this.myId();
    switch (type) {
      case EV.SHOT: {
        const w = WEAPON_IDS[wIdxOk(ev[3])];
        const o = new THREE.Vector3(+ev[4], +ev[5], +ev[6]), h = new THREE.Vector3(+ev[7], +ev[8], +ev[9]);
        if (![o.x, o.y, o.z, h.x, h.y, h.z].every(Number.isFinite) || o.lengthSq() > 1e8 || o.distanceToSquared(h) > 4e5) return;
        const surf = SURF_IDS[ev[10] | 0] || 'none';
        const e = this.ents.get(actor);
        const mz = e && e.avatar && e.avatar.gun ? e.avatar.gun.localToWorld(e.avatar.gun.userData.muzzle.clone()) : o;
        const d = h.clone().sub(mz).normalize();
        FX.muzzle(mz.x, mz.y, mz.z, d.x, d.y, d.z, w === 'shotgun' ? 1.3 : 1);
        FX.flashLight(mz.x, mz.y, mz.z, 0xffb060, 6, 0.05, 8);
        const n = w === 'shotgun' ? 4 : 1;
        for (let i = 0; i < n; i++) {
          const jit = n > 1 ? new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(h.distanceTo(o) * 0.06) : new THREE.Vector3();
          FX.tracer(mz.x, mz.y, mz.z, h.x + jit.x, h.y + jit.y, h.z + jit.z, [1, 0.8, 0.5], 380, 0.022);
        }
        if (surf !== 'none' && surf !== 'flesh') { FX.impact(h.x, h.y, h.z, -d.x, -d.y, -d.z, surf, 0.8); if (surf !== 'water') FX.decal(h.x, h.y, h.z, -d.x, -d.y, -d.z, 0.1); }
        if (surf === 'flesh') FX.impact(h.x, h.y, h.z, -d.x, -d.y, -d.z, 'flesh');
        SFX.shot(w, mz);
        if (e && e.avatar) e.avatar.fire();
        // bullets passing close to my head
        if (this.me.alive) {
          const cp = R.camera.position;
          const t = clamp(cp.clone().sub(o).dot(d), 0, o.distanceTo(h));
          if (o.clone().addScaledVector(d, t).distanceTo(cp) < 1.2 && t > 3) SFX.noiseBurst && SFX.ok && SFX.noiseBurst(SFX.out(null, 0.15, 1, 0), SFX.now(), 0.06, 'bandpass', 3500, 2, 0.6);
        }
        break;
      }
      case EV.HIT: {
        const target = netId(ev[3]);
        const dmg = clamp(+ev[4] || 0, 0, 260), head = !!ev[5], w = wIdxOk(ev[6]);
        // the shooter saw a previous life of mine (I died and respawned meanwhile): ignore
        if (target === myId) { if (Number.isInteger(ev[7]) && ev[7] !== (this.lifeN | 0)) break; this.damageMe(actor, dmg, head, w); }
        else if (this.isHost()) { const b = this.botById(target); if (b) b.damage(actor, dmg, head, w); }
        break;
      }
      case EV.DIE: {
        const killer = netId(ev[3]);
        this.handleDeath(actor, killer, wIdxOk(ev[4]), !!ev[5], netId(ev[6]), clamp(ev[7] | 0, 0, 999));
        break;
      }
      case EV.ROCKET: {
        const o = new THREE.Vector3(+ev[3], +ev[4], +ev[5]), d = new THREE.Vector3(+ev[6], +ev[7], +ev[8]);
        if (![o.x, o.y, o.z, d.x, d.y, d.z].every(Number.isFinite) || d.lengthSq() < 0.5) return;
        const r = this.launchRocket(actor, o, d.normalize(), false);
        r.waitBoom = true; r.life = 3;
        break;
      }
      case EV.BOOM: {
        const p = new THREE.Vector3(+ev[3], +ev[4], +ev[5]);
        if (![p.x, p.y, p.z].every(Number.isFinite)) return;
        // remove the closest visual rocket from this shooter
        if (this.rockets) {
          let bi = -1, bd = 1e9;
          this.rockets.forEach((r, i) => { if (r.owner === actor) { const dd = r.m.position.distanceTo(p); if (dd < bd) { bd = dd; bi = i; } } });
          if (bi >= 0) { FX.removeRocket(this.rockets[bi]); this.rockets.splice(bi, 1); }
        }
        this.explode(p, actor, true);
        break;
      }
      case EV.CHAT: HUD.chatMessage(this.nameOf(actor), this.colorOf(actor), sanitizeChat(ev[3])); break;
      case EV.MELEE: { const e = this.ents.get(actor); if (e && e.avatar) e.avatar.fire(); SFX.swing(e ? e.pos : null); break; }
      case EV.SPAWN: { const e = this.ents.get(actor); if (e) { e.spawnT = performance.now(); if (e.avatar) e.avatar.revive(); } break; }
      case EV.RELOAD: { const e = this.ents.get(actor); if (e && SFX.ok) { const out = SFX.out(e.pos, 0.25, 4, 0.2); SFX.noiseBurst(out, SFX.now() + 0.3, 0.05, 'bandpass', 1500, 2, 0.8); SFX.noiseBurst(out, SFX.now() + 0.9, 0.06, 'bandpass', 1200, 2, 0.9); } break; }
    }
  },
  onPeerLeft(info) {
    const e = this.ents.get(info.peer);
    if (e) { e.disposeAvatar(R.scene); this.ents.delete(info.peer); }
    // a leaving host's bots stay a moment (hidden): the next host adopts them with the same ids
    if (this.state === 'playing') HUD.toast(info.name + ' è uscito');
  },
  // ------------------------------------------------------------ remote entities
  updateRemote(dt, now) {
    const hostPeer = Net.hostPeer();
    const myTeam = this.me.team;
    const mode = this.mode();
    const cam = R.camera.position;
    const look = this._look || (this._look = new THREE.Vector3());
    look.set(0, 0, -1).applyQuaternion(R.camera.quaternion);
    const frame = this.frame;
    const gt = this.g && this.g.t;
    for (const info of Net.peers.values()) {
      if (!info.valid || !info.snaps.length) continue;
      // the human
      const rt = Net.renderTime(info, now, dt);
      const e = this.getEnt(info.peer, 'remote');
      e.seenF = frame; e.seenAt = now;
      e.name = info.name; e.cls = info.cls; e.k = info.k;
      e.vote = info.vt;
      e.ap = info.ap;
      const s = sampleSnaps(info.snaps, rt, e.sample);
      if (s) this.applySample(e, s);
      // hidden tab or silent peer: not a target, not drawn, until it publishes again
      e.stale = info.aw || now - info.seen > NET_CFG.stalePeer;
      if (e.stale) e.alive = false;
      e.team = gt && gt[info.peer] != null ? gt[info.peer] : info.team;
      this.updateEntVisual(e, dt, mode, myTeam, cam, look);
      if (e.stale && e.avatar) e.avatar.root.visible = false;
      if (info.peer === hostPeer) {
        for (const bi of info.bots.values()) {
          const be = this.getEnt(bi.id, 'rbot');
          be.seenF = frame; be.seenAt = now; be.stale = false;
          be.name = 'BOT ' + bi.name; be.cls = bi.cls; be.k = bi.k; be.team = gt && gt[bi.id] != null ? gt[bi.id] : bi.team;
          if (bi.ap) be.ap = bi.ap;
          const bs = sampleSnaps(bi.snaps, rt, be.sample);
          if (bs) this.applySample(be, bs);
          this.updateEntVisual(be, dt, mode, myTeam, cam, look);
        }
      }
    }
    for (const [id, e] of this.ents) {
      if (e.seenF === frame) continue;
      // bots of a host that just left or froze: kept hidden for a few seconds for the next host
      if (e.kind === 'rbot' && now - (e.seenAt || 0) < 3000) { e.stale = true; if (e.avatar) e.avatar.root.visible = false; continue; }
      e.disposeAvatar(R.scene); this.ents.delete(id);
    }
    // host's own bots
    for (const b of this.bots) this.updateEntVisual(b.ent, dt, mode, myTeam, cam, look);
  },
  // remote appearance (variant, tint, headgear, accent) from presence `ap`
  applyAp(e) {
    const av = e.avatar, ap = e.ap;
    if (!av || !ap || !av.setAppearance) return;
    const key = ap[0] + ',' + ap[1] + ',' + ap[2] + ',' + ap[3];
    if (e._apKey === key && e._apAv === av) return;
    const first = e._apKey == null;
    e._apKey = key; e._apAv = av;
    if (first && key === '0,0,0,0') return;
    av.setAppearance({ v: ap[0], t: ap[1], h: ap[2], a: ap[3] });
  },
  getEnt(id, kind) {
    let e = this.ents.get(id);
    if (!e) { e = new Ent(id, kind); this.ents.set(id, e); }
    return e;
  },
  applySample(e, s) {
    e.pos.set(s.x, s.y, s.z); e.yaw = s.yaw; e.pitch = s.pitch; e.vel.set(s.vx || 0, s.vy || 0, s.vz || 0);
    e.flags = s.f; e.w = s.w; e.hp = s.hp; e.life = s.life | 0;
    e.alive = !!(s.f & F_ALIVE);
  },
  updateEntVisual(e, dt, mode, myTeam, cam, look) {
    const av = e.ensureAvatar(R.scene);
    const col = mode.teams ? TEAM_COLORS[e.team] || TEAM_COLORS[0] : FFA_COLORS[hashStr(e.id) % FFA_COLORS.length];
    const zombie = mode.id === 'inf' && e.team === 2;
    av.setColor(zombie ? '#7fbf4f' : col);
    av.setAppearance(Soldiers.lookFor(e.id, mode.teams ? e.team : 0, zombie));
    if (e.ap) this.applyAp(e);
    if (e.alive && !e.lastAlive) av.revive();
    if (!e.alive && e.lastAlive && !av.dead) av.kill();
    e.lastAlive = e.alive;
    av.setWeapon(WEAPON_IDS[e.w] || 'ar');
    av.root.position.copy(e.pos);
    if (e.alive) {
      av.root.visible = true;
      // footsteps for remote players
      const hs = Math.hypot(e.vel.x, e.vel.z);
      if ((e.flags & F_GROUND) && !(e.flags & F_SLIDE) && hs > 3) {
        e.stepDist += hs * dt;
        if (e.stepDist > 2.3) { e.stepDist = 0; if (cam.distanceTo(e.pos) < 40) SFX.footstep('stone', e.pos.clone().setY(e.pos.y + 0.1), (e.flags & F_CROUCH) ? 0.3 : 1); }
      }
    }
    av.update(dt, { yaw: e.yaw, pitch: e.pitch, vx: e.vel.x, vz: e.vel.z, crouch: e.crouch, slide: e.slide, grounded: !!(e.flags & F_GROUND) });
    // name tags: teammates always, enemies when aimed at
    const friend = mode.teams && e.team === myTeam && myTeam;
    let show = false;
    if (e.alive) {
      if (friend) show = true;
      else {
        const to = _v1.set(e.pos.x - cam.x, e.pos.y + 1.4 - cam.y, e.pos.z - cam.z);
        const d = to.length();
        if (d < 60 && to.normalize().dot(look) > 0.995 - 0.4 / Math.max(d, 1) * 0.1 && this.world.clear(cam.x, cam.y, cam.z, e.pos.x, e.pos.y + 1.4, e.pos.z)) show = true;
      }
    }
    av.setNameTag(e.name, friend ? '#9fd0ff' : '#ff8a80', show);
    if (e.flags & F_PROT) av.root.traverse && null;
  },
  // ------------------------------------------------------------ helpers
  teamOf(id) {
    if (!id) return 0;
    if (this.g && this.g.t && this.g.t[id] != null && MODES[this.g.m].teams) return this.g.t[id];
    if (id === this.myId()) return this.me.team;
    const e = this.ents.get(id); if (e) return e.team;
    const b = this.botById(id); if (b) return b.ent.team;
    return 0;
  },
  nameOf(id) {
    if (!id) return '';
    if (id === this.myId()) return this.me.name;
    const e = this.ents.get(id); if (e) return e.name;
    const b = this.botById(id); if (b) return b.ent.name;
    const info = Net.peers.get(id); if (info) return info.name;
    return 'Qualcuno';
  },
  colorOf(id) {
    const mode = this.mode();
    if (mode.teams) return TEAM_COLORS[this.teamOf(id)] || '#ddd';
    return FFA_COLORS[hashStr(id || 'x') % FFA_COLORS.length];
  },
  posOf(id) {
    if (id === this.myId()) return this.me.mover.pos;
    const e = this.ents.get(id); if (e) return e.pos;
    const b = this.botById(id); if (b) return b.ent.pos;
    return null;
  },
  botById(id) { for (const b of this.bots) if (b.ent.id === id) return b; return null; },
  // everyone in the match (for the host's mode logic and spawn choice)
  combatants() {
    const list = [];
    const me = this.me;
    list.push({ id: this.myId(), team: me.team, alive: me.alive, pos: me.mover.pos, human: true, kills: me.stats.k, lvl: me.stats.lvl, score: me.stats.sc, vote: me.vote });
    for (const e of this.ents.values()) {
      if (e.kind === 'remote') list.push({ id: e.id, team: e.team, alive: e.alive, pos: e.pos, human: true, kills: e.k[0] || 0, lvl: e.k[5] || 0, score: e.k[3] || 0, vote: e.vote });
    }
    if (this.isHost()) for (const b of this.bots) list.push({ id: b.ent.id, team: b.ent.team, alive: b.ent.alive, pos: b.ent.pos, human: false, kills: b.stats.k, lvl: b.stats.lvl, score: b.stats.sc, vote: b.vote });
    else for (const e of this.ents.values()) if (e.kind === 'rbot') list.push({ id: e.id, team: e.team, alive: e.alive, pos: e.pos, human: false, kills: e.k[0] || 0, lvl: e.k[5] || 0, score: e.k[3] || 0 });
    return list;
  },
  updateObjectives(dt) {
    const g = this.g; if (!g) return;
    // while the match map is still loading the zones/flags of the old map don't apply
    if (this.switching || (g.mp && g.mp !== this.mapId) || (g.hz && !ZONES()[g.hz[0]])) return;
    const mode = MODES[g.m];
    const me = this.me;
    // hardpoint: points for standing in an owned zone
    if (mode.id === 'hp' && g.hz && me.alive) {
      const z = ZONES()[g.hz[0]];
      if (z && inZone(z, me.mover.pos) && g.hz[1] === me.team) { this.hpAcc = (this.hpAcc || 0) + dt; if (this.hpAcc >= 1) { this.hpAcc = 0; me.stats.sc += 10; Progress.onZone(1); } }
    }
    if (mode.id === 'ctf' && g.cap && g.cap[1] !== this.lastCap) {
      if (this.lastCap !== undefined) {
        const who = g.cap[0];
        if (who === this.myId()) { me.stats.caps++; me.stats.sc += 300; Progress.onCapture(); }
        const t = this.teamOf(who);
        HUD.banner(t === me.team ? 'Bandiera catturata!' : 'I nemici hanno catturato la bandiera', this.nameOf(who), t === me.team ? '#7fd07f' : '#ff7a6a', 2.5);
        SFX.objective(t === me.team);
      }
      this.lastCap = g.cap[1];
    }
    HUD.objectives(g);
    Objectives.update(dt, g);
  },
  // ------------------------------------------------------------ outgoing state
  sendState(now) {
    if (!Net.game) return;
    const me = this.me, mv = me.mover, w = this.cur();
    // life number: hits aimed at a previous life of mine are ignored (see onNetEvent HIT)
    if (me.alive && !this._wasAlive) this.lifeN = ((this.lifeN | 0) + 1) % 1e6;
    this._wasAlive = me.alive;
    if (!Net.lifeOf) Net.lifeOf = (id) => { const e = this.ents.get(id); return e ? e.life | 0 : 0; };
    if (performance.now() < Net.nextSend) return;
    const flags = (me.alive ? F_ALIVE : 0) | (mv.crouching ? F_CROUCH : 0) | (mv.sliding ? F_SLIDE : 0) | (mv.onGround ? F_GROUND : 0) | (me.adsT > 0.5 ? F_ADS : 0) | (me.reload ? F_RELOAD : 0) | (me.spawnProt > 0 ? F_PROT : 0);
    const st = me.stats;
    const yaw = me.yaw - Math.floor(me.yaw / TAU) * TAU;
    const fields = {
      n: me.name, c: me.cls, tm: me.team, mp: this.mapId,
      s: [Math.round(now), r2(mv.pos.x), r2(mv.pos.y), r2(mv.pos.z), r3(yaw), r3(me.pitch), r2(mv.vel.x), r2(mv.vel.y), r2(mv.vel.z), flags, w && WIDX[w.id] != null ? WIDX[w.id] : 0, Math.max(0, Math.round(me.hp)), this.lifeN | 0],
      k: [st.k, st.d, st.a, st.sc, st.streak, st.lvl, st.caps],
      vt: me.vote, ap: apOk(this.appearance),
    };
    if (this.isHost() && this.g) {
      fields.g = encodeG(this.g);
      fields.b = this.bots.map((b) => { const a = b.snapshot(); a[7] = r3(a[7] - Math.floor(a[7] / TAU) * TAU); if (b.ap) a.push(apOk(b.ap)); return a; });
      if (!this.lobbyT || now - this.lobbyT > 3000) { this.lobbyT = now; Net.setLobby({ rm: Net.roomName, n: this.nick, md: this.g.m, mp: this.mapId, hn: 1 }); }
    } else { fields.g = null; fields.b = null; }
    Net.send(fields);
  },
  compactG() { return encodeG(this.g); },
  onKey(code) {
    if (this.state !== 'playing' || this.editor) return;
    if (HUD.chatOpen) return;
    if (code === 'Escape') { if (HUD.pauseOpen) { HUD.showPause(false); this.requestLock(); } return; }
    if (BINDS.chat.includes(code)) { HUD.openChat(); return; }
    if (BINDS.classMenu.includes(code)) { HUD.showClassPicker(true); return; }
  },
  sendChat(text) {
    text = sanitizeChat(text);
    if (!text) return;
    Net.pushEvent(EV.CHAT, '', text);
    HUD.chatMessage(this.me.name, this.colorOf(this.myId()), text);
  },
  chooseClass(i) {
    i = clamp(i | 0, 0, CLASSES.length - 1);
    this.cls = i; store.set('cls', i);
    if (this.state !== 'playing') { this.me.cls = i; return; }
    if (!this.me.alive) { this.me.cls = i; this.pendingClass = null; }
    else { this.pendingClass = i; HUD.toast('Classe ' + CLASSES[i].name + ' al prossimo respawn'); }
  },
};
function nextFrame() { return new Promise((r) => requestAnimationFrame(() => r())); }
