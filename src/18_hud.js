// ===================================================================
// HUD, menus, scoreboard, chat, settings, world markers
// ===================================================================
const MODE_CHIPS = ['Tutti contro tutti', 'A squadre', 'Hardpoint', 'Bandiera', 'Gun Game', 'Infetti'];
const HUD = {
  chatOpen: false, pauseOpen: false, endOpen: false, deathOpen: false, icons: {}, diff: 1, selMode: 0, selMap: 'borgo', curTab: 'play', spotI: 0, _banQ: [],
  loading(text, p) {
    const el = $('#loading');
    if (text == null) { el.hidden = true; return; }
    el.hidden = false; $('#loadtxt').textContent = text; if (p != null) $('#loadbar').style.width = Math.round(p * 100) + '%';
  },
  init() {
    this.makeWeaponIcons();
    renderCredits($('#credits'));
    Progress.load();
    Loadout.init(); Character.init();
    // nickname
    const nick = $('#nick');
    nick.value = Game.nick;
    nick.addEventListener('input', () => { Game.nick = sanitizeName(nick.value) || Game.nick; store.set('nick', sanitizeName(nick.value)); });
    nick.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') nick.blur(); });
    // tabs
    $$('#tabs .tab').forEach((b) => b.addEventListener('click', () => this.tab(b.dataset.tab)));
    // class grids
    this.buildClassGrid($('#classgrid'), $('#clsinfo'));
    this.buildClassGrid($('#classgrid2'), $('#clsinfo2'));
    // modes: picker on the play page + select in the create form
    const rm = $('#rmode');
    MODES.forEach((m, i) => { const o = document.createElement('option'); o.value = i; o.textContent = m.name; rm.appendChild(o); });
    const mp = $('#modepick');
    MODES.forEach((m, i) => {
      const b = el('button', 'mp', MODE_CHIPS[i] || m.name); b.type = 'button'; b.title = m.desc;
      b.addEventListener('click', () => { this.pickMode(i); SFX.ui(); });
      mp.appendChild(b);
    });
    this.pickMode(clamp(store.get('mode', 0) | 0, 0, MODES.length - 1));
    // maps: chips above the modes
    const mpk = $('#mappick');
    for (const id of BUILTIN_IDS) {
      const b = el('button', 'mp', BUILTIN_MAPS[id].name); b.type = 'button'; b.dataset.map = id; b.title = BUILTIN_MAPS[id].tag;
      b.addEventListener('click', () => { this.pickMap(id); SFX.ui(); });
      mpk.appendChild(b);
    }
    this.pickMap(builtinMap(Game.mapId) ? Game.mapId : 'borgo', true);
    $('#rname').value = 'borgo-' + rndi(10, 99);
    $$('#rdiff button').forEach((b) => b.addEventListener('click', () => { $$('#rdiff button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); this.diff = +b.dataset.d; SFX.ui(); }));
    $('#btn-play').addEventListener('click', () => this.quickPlay());
    $('#btn-train').addEventListener('click', () => { SFX.init(); Game.pendingMap = this.selMap; Game.playOffline({ bots: 5, diff: this.diff, mode: this.selMode }); });
    $('#btn-goclasses').addEventListener('click', () => this.tab('classes'));
    const spot = $('#spot');
    spot.tabIndex = 0; spot.setAttribute('role', 'button'); spot.setAttribute('aria-label', 'Scegli la classe');
    spot.style.cursor = 'pointer';
    spot.addEventListener('click', () => this.tab('classes'));
    spot.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.tab('classes'); } });
    $('#btn-create').addEventListener('click', () => {
      const name = (sanitizeName($('#rname').value) || 'borgo').toLowerCase().replace(/[^a-z0-9_.-]/g, '-').replace(/^[^a-z0-9]+/, '') || 'borgo';
      const mapSel = $('#rmap').value;
      Game.pendingMap = mapSel;
      Game.play(name, { bots: +$('#rbots').value, diff: this.diff, mode: +$('#rmode').value });
    });
    $('#btn-settings').addEventListener('click', () => this.showSettings(true));
    $('#btn-resume').addEventListener('click', () => { this.showPause(false); Game.requestLock(); });
    $('#btn-pclass').addEventListener('click', () => { this.showPause(false); this.showClassPicker(true); });
    $('#btn-psettings').addEventListener('click', () => { this.showSettings(true); });
    $('#btn-leave').addEventListener('click', () => Game.leave());
    $('#btn-copyroom').addEventListener('click', (e) => {
      const name = Net.roomName || '';
      try { navigator.clipboard.writeText(name).then(() => this.toast('Nome stanza copiato: ' + name), () => this.toast('Stanza: ' + name)); } catch (er) { this.toast('Stanza: ' + name); }
    });
    $('#btn-classok').addEventListener('click', () => { this.showClassPicker(false); if (Game.state === 'playing' && !this.deathOpen) Game.requestLock(); });
    $('#btn-dclass').addEventListener('click', () => this.showClassPicker(true));
    $('#lockhint').addEventListener('click', () => this.lockHint(false));
    $('#tc-menu') && $('#tc-menu').addEventListener('touchstart', (e) => { e.preventDefault(); this.showPause(true); }, { passive: false });
    // chat
    const ci = $('#chatinput');
    ci.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { Game.sendChat(ci.value); this.closeChat(); }
      if (e.key === 'Escape') this.closeChat();
    });
    this.initSettings();
    this.refreshRooms();
    this.renderProgress();
    Editor.initDb();
    setInterval(() => { if (Game.state === 'menu') this.refreshRooms(); }, 2000);
    setInterval(() => { if (Game.state === 'menu' && !$('#menu').hidden) { this.spotI++; this.renderSpot(); } }, 2600);
    setInterval(() => { if (Game.state === 'menu' && !$('#menu').hidden) { if (Progress.ensureDay()) this.renderProgress(); else $('#chaltimer').textContent = Progress.timeLeft(); } }, 30000);
    Net.emitter.on('lobbyconn', () => this.refreshRooms());
  },
  tab(name) {
    if (name === 'editor') { SFX.init(); Editor.open(); return; }
    this.curTab = name;
    $$('#tabs .tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    $$('#menu [data-page]').forEach((s) => { s.hidden = s.dataset.page !== name; });
    if (name === 'stats') this.renderStats();
    if (name === 'rooms') this.refreshRooms();
    if (name === 'play') this.renderProgress();
    if (name === 'armory') Loadout.render();
    Character.onTab(name);
    $('#menu').scrollTop = 0;
    SFX.ui();
  },
  pickMode(i) {
    this.selMode = i; store.set('mode', i);
    $$('#modepick .mp').forEach((b, j) => b.classList.toggle('on', j === i));
    const m = MODES[i];
    $('#hl-brush').textContent = m.name;
    $('#modedesc').textContent = m.desc;
    $('#rmode').value = String(i);
    this.updatePlayNote();
  },
  async pickMap(id, quiet) {
    const B = builtinMap(id); if (!B) return;
    this.selMap = id; store.set('map', id);
    $$('#mappick .mp').forEach((b) => b.classList.toggle('on', b.dataset.map === id));
    $('#hl-big').textContent = B.name;
    $('#mapname').textContent = B.tag + ' · multiplayer';
    const rm = $('#rmap'); if (rm && rm.querySelector('option[value="' + id + '"]')) rm.value = id;
    this.updatePlayNote();
    if (quiet || Game.state !== 'menu' || Game.mapId === id || this._mapBusy) return;
    this._mapBusy = true;
    this.loading('Carico ' + B.name + '…', 0.5);
    await nextFrame(); await nextFrame();
    try { await MapProps.preload(id, 6000); if (this.selMap === id && Game.state === 'menu') Game.loadMap(id); } finally { this._mapBusy = false; this.loading(null); }
    if (this.selMap !== id) this.pickMap(this.selMap);
  },
  makeWeaponIcons(ids) {
    // GLB weapon models replace the procedural icons as soon as they are loaded
    if (!this._iconHook) { this._iconHook = true; GunModels.onReady((id) => this.refreshWeaponIcon(id)); }
    const r = R.renderer;
    const W = 256, H = 96;
    const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
    const sc = new THREE.Scene();
    sc.environment = R.scene.environment;
    const dl = new THREE.DirectionalLight(0xffffff, 2.5); dl.position.set(1, 2, 3); sc.add(dl);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.8));
    const cam = new THREE.OrthographicCamera(-0.5, 0.5, 0.19, -0.19, 0.01, 10);
    const buf = new Uint8Array(W * H * 4);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const prevTM = r.toneMapping;
    for (const id of ids || WEAPON_IDS) {
      const glb = GunModels.buildTP(id);
      const grp = glb ? glb.clone() : gunModel(id).root;
      grp.rotation.y = -Math.PI / 2;
      sc.add(grp);
      const box = new THREE.Box3().setFromObject(grp);
      const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
      const span = Math.max(size.x * 1.05, size.y * 2.7 * 1.05, 0.12);
      cam.left = -span / 2; cam.right = span / 2; cam.top = span / 2 * H / W; cam.bottom = -span / 2 * H / W;
      cam.position.set(ctr.x, ctr.y, ctr.z + 3); cam.lookAt(ctr); cam.updateProjectionMatrix();
      r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(sc, cam);
      r.readRenderTargetPixels(rt, 0, 0, W, H, buf);
      const img = g.createImageData(W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const s = ((H - 1 - y) * W + x) * 4, d = (y * W + x) * 4;
        // brighten the dark gunmetal a bit for legibility on dark panels
        img.data[d] = Math.min(255, buf[s] * 1.6 + 18); img.data[d + 1] = Math.min(255, buf[s + 1] * 1.6 + 18); img.data[d + 2] = Math.min(255, buf[s + 2] * 1.6 + 18); img.data[d + 3] = buf[s + 3];
      }
      g.clearRect(0, 0, W, H); g.putImageData(img, 0, 0);
      this.icons[id] = c.toDataURL('image/png');
      sc.remove(grp);
      grp.traverse((o) => { if (o.isMesh && !o.geometry.userData.shared) o.geometry.dispose(); });
    }
    r.setRenderTarget(null); r.setClearColor(0x000000, 1); r.toneMapping = prevTM;
    rt.dispose();
  },
  refreshWeaponIcon(id) {
    if (!this.icons[id] || !GunModels.buildTP(id)) return;
    this.makeWeaponIcons([id]);
    $$('img[data-wicon="' + id + '"]').forEach((img) => { img.src = this.icons[id]; });
    $$('img[data-id="' + id + '"]').forEach((img) => { img.src = this.icons[id]; });
  },
  buildClassGrid(grid, info) {
    grid.innerHTML = '';
    CLASSES.forEach((c, i) => {
      const b = el('button', 'cls');
      b.type = 'button';
      const lo = Loadout.pick(i); // chosen weapons (Armeria)
      const img = document.createElement('img'); img.alt = ''; img.src = this.icons[lo.p] || ''; img.dataset.wicon = lo.p; b.appendChild(img);
      b.appendChild(el('span', 'n', c.name));
      b.appendChild(el('span', 'w', WEAPONS[lo.p].name + (lo.s ? ' · ' + WEAPONS[lo.s].name : '')));
      b.addEventListener('click', () => { Game.chooseClass(i); SFX.ui(); this.syncClassGrids(); });
      b.addEventListener('mouseenter', () => this.classInfo(info, i));
      b.addEventListener('focus', () => this.classInfo(info, i));
      grid.appendChild(b);
    });
    this.syncClassGrids();
  },
  syncClassGrids() {
    for (const grid of [$('#classgrid'), $('#classgrid2')]) $$('.cls', grid).forEach((b, i) => b.classList.toggle('sel', i === Game.cls));
    this.classInfo($('#clsinfo'), Game.cls); this.classInfo($('#clsinfo2'), Game.cls);
    const c = CLASSES[Game.cls] || CLASSES[0];
    $('#curcls').textContent = c.name;
    this.renderSpot();
  },
  classInfo(info, i) {
    const c = CLASSES[i];
    info.innerHTML = '';
    const head = el('div', ''); const nb = el('b', 'wide', c.name + ' '); nb.style.color = 'var(--ink)'; head.appendChild(nb); head.appendChild(document.createTextNode(c.desc)); info.appendChild(head);
    const w = WEAPONS[Loadout.pick(i).p];
    const rows = [['Salute', c.hp / 160, c.hp], ['Velocità', (c.speed - 0.8) / 0.45, Math.round(c.speed * 100) + '%'], ['Danno', Math.min(1, (w.dmg * (w.pellets || 1)) / 110), Math.round(w.dmg * (w.pellets || 1))]];
    for (const [n, v, t] of rows) {
      const s = el('div', 'stat'); s.appendChild(el('span', '', n));
      const b = el('div', 'b'); const iEl = document.createElement('i'); iEl.style.width = Math.round(clamp(v, 0.05, 1) * 100) + '%'; b.appendChild(iEl); s.appendChild(b);
      s.appendChild(el('span', 'num', String(t))); info.appendChild(s);
    }
  },
  renderSpot() {
    const c = CLASSES[Game.cls] || CLASSES[0];
    const ids = Loadout.weapons(Game.cls);
    this.spotI = (this.spotI || 0) % ids.length;
    const id = ids[this.spotI];
    const img = $('#spotimg'); if (!img) return;
    if (img.dataset.id !== id) { img.dataset.id = id; img.src = this.icons[id] || ''; }
    $('#spotname').textContent = c.name;
    $('#spotw').textContent = (this.spotI + 1) + ' · ' + WEAPONS[id].name;
    const dots = $('#spot .dots'); dots.innerHTML = '';
    ids.forEach((_, i) => dots.appendChild(el('i', i === this.spotI ? 'on' : '')));
  },
  renderProgress() {
    if (!Progress.data) return;
    const L = Progress.level();
    $('#lvlchip').textContent = L.lvl;
    $('#lvlchip').title = 'Livello ' + L.lvl;
    $('#lvltxt').textContent = 'Livello ' + L.lvl;
    $('#xpfill').style.width = (L.max ? 100 : (L.cur / L.need) * 100).toFixed(1) + '%';
    $('#xptxt').textContent = L.max ? 'Livello massimo' : fmtN(L.cur) + ' / ' + fmtN(L.need) + ' XP';
    const box = $('#chal'); box.innerHTML = '';
    for (const c of Progress.daily()) {
      const d = el('div', 'ch' + (c.d ? ' done' : ''));
      const t = el('div', 't'); t.appendChild(el('span', '', Progress.label(c))); t.appendChild(el('b', 'num', c.d ? 'Completata' : '+' + fmtN(Progress.reward(c)) + ' XP'));
      d.appendChild(t);
      const pb = el('div', 'pbar'); const i = document.createElement('i'); i.style.width = clamp(c.p / c.n * 100, 0, 100).toFixed(1) + '%'; pb.appendChild(i);
      pb.appendChild(el('span', 'num', Progress.progText(c))); d.appendChild(pb);
      box.appendChild(d);
    }
    $('#chaltimer').textContent = Progress.timeLeft();
    if (this.curTab === 'stats') this.renderStats();
  },
  renderStats() {
    const S = Progress.data.st, L = Progress.level();
    const g = $('#statgrid'); g.innerHTML = '';
    const tile = (v, l) => { const d = el('div', 'sg'); const b = el('b', 'wide num', v); if (v.length > 8) b.style.fontSize = '20px'; d.appendChild(b); d.appendChild(el('span', '', l)); g.appendChild(d); };
    tile(String(L.lvl), 'Livello');
    tile(fmtN(Progress.data.xp), 'XP totali');
    tile(fmtN(S.k), 'Uccisioni');
    tile(fmtN(S.d), 'Morti');
    tile(S.d ? (S.k / S.d).toFixed(2).replace('.', ',') : String(S.k), 'Uccisioni per morte');
    tile(S.k ? Math.round(S.hs / S.k * 100) + '%' : '0%', 'Alla testa');
    tile(S.sh ? Math.round(S.hi / S.sh * 100) + '%' : '—', 'Precisione');
    tile(S.hi ? Math.round(S.zh / S.hi * 100) + '%' : '—', 'Colpi alla testa');
    tile(fmtN(S.a), 'Assist');
    tile(fmtN(S.m), 'Partite');
    tile(fmtN(S.w), 'Vittorie');
    tile(String(S.best), 'Serie migliore');
    tile(Math.round(S.top * 3.6) + ' km/h', 'Velocità massima');
    tile((S.dist / 1000).toFixed(1).replace('.', ',') + ' km', 'Distanza');
    const h = Math.floor(S.time / 3600), mn = Math.floor(S.time / 60) % 60;
    tile(h ? h + 'h ' + mn + 'm' : mn + ' min', 'Tempo di gioco');
    tile(fmtN(S.caps), 'Bandiere catturate');
    const fc = Progress.favClass(); tile(fc >= 0 ? CLASSES[fc].name : '—', 'Classe preferita');
  },
  bestRoom() {
    const rooms = Net.online() ? Net.listRooms().filter((r) => (r.mode | 0) === this.selMode && (r.map || 'borgo') === this.selMap) : [];
    rooms.sort((a, b) => b.players - a.players);
    return rooms[0] || null;
  },
  updatePlayNote() {
    const n = $('#playnote'); if (!n) return;
    let t;
    if (!Net.online()) t = 'Offline (' + this.offlineReason() + '): giochi contro i bot.';
    else {
      const r = this.bestRoom();
      t = r ? 'Entri in ' + r.name + ' con ' + r.names.slice(0, 3).join(', ') + (r.players > 3 ? ' e altri' : '') : 'Nessuna partita di questo tipo: ne apri una e i colleghi la vedono comparire.';
    }
    if (n.textContent !== t) n.textContent = t;
  },
  quickPlay() {
    SFX.init();
    if (!Net.online()) { Game.pendingMap = this.selMap; Game.playOffline({ bots: 5, diff: this.diff, mode: this.selMode }); return; }
    const r = this.bestRoom();
    if (r) { Game.pendingMap = typeof r.map === 'string' && r.map.length < 200 ? r.map : null; Game.play(r.name); }
    else { Game.pendingMap = this.selMap; Game.play(this.selMap + '-' + MODES[this.selMode].id, { bots: 4, diff: this.diff, mode: this.selMode }); }
  },
  offlineReason() {
    return { page: 'pagina aperta fuori da claude.ai', signin: 'accesso o invito mancante', admit: 'claude.ai non ti fa entrare nella stanza', lost: 'connessione alla stanza persa' }[Net.why] || 'solo bot';
  },
  offlineHelp() {
    switch (Net.why) {
      case 'signin': return 'claude.ai non ti riconosce come invitato: fai l\'accesso in questo browser e ricarica. Se lo sei già, il tuo account non è dell\'organizzazione di chi ha creato il gioco o hai aperto il link pubblico: chiedi di essere invitato per nome o email dal menu Condividi e apri il link da quell\'account.';
      case 'admit': return 'Sei autenticato ma claude.ai non ti ammette nella stanza: succede se hai aperto il link pubblico o se il tuo account non è dell\'organizzazione di chi ha creato il gioco. Chiedi di essere invitato per nome o email dal menu Condividi, poi apri il link da quell\'account.';
      case 'lost': return 'La connessione alla stanza è stata rifiutata o si è interrotta' + (Net.whyCode ? ' (' + String(Net.whyCode).slice(0, 40) + ')' : '') + '. Ricarica la pagina; se resta così, prova senza VPN o con un\'altra rete.';
      case 'page': return 'Il multiplayer funziona solo aprendo il gioco da claude.ai.';
      default: return 'Il multiplayer funziona quando la pagina è aperta da claude.ai con l\'accesso alla stanza.';
    }
  },
  refreshRooms() {
    const online = Net.online();
    const conn = online && Net.lobbyConnected !== false;
    const txt = online ? (Net.lobbyConnected === false ? 'Riconnessione…' : 'Online · ' + Math.max(1, Net.lobbyPeers.length) + ' nel menu o in partita') : 'Offline · ' + this.offlineReason();
    for (const [d, t] of [['#netdot', '#nettxt'], ['#netdot2', '#nettxt2']]) { $(d).classList.toggle('on', conn); $(t).textContent = txt; }
    $('#btn-create').disabled = !online;
    const rooms = online ? Net.listRooms() : [];
    const fill = (box, max) => {
      if (!box) return;
      box.innerHTML = '';
      if (!online) { box.appendChild(el('div', 'empty', this.offlineHelp())); return; }
      if (!rooms.length) { box.appendChild(el('div', 'empty', 'Nessuna partita attiva. Premi Gioca per aprirne una: i colleghi la vedranno comparire qui.')); return; }
      for (const r of rooms.slice(0, max)) {
        const b = el('button', 'room'); b.type = 'button';
        b.appendChild(el('span', 'rn', r.name));
        b.appendChild(el('span', 'rp num', String(r.players)));
        const mode = MODES[r.mode | 0];
        const mapName = mapLabel(r.map);
        b.appendChild(el('span', 'rm', (mode ? mode.name : 'Partita') + ' · ' + mapName + (r.names.length ? ' · ' + r.names.slice(0, 4).join(', ') : '')));
        b.addEventListener('click', () => { SFX.init(); Game.pendingMap = typeof r.map === 'string' && r.map.length < 200 ? r.map : null; Game.play(r.name); });
        box.appendChild(b);
      }
    };
    fill($('#rooms'), 3);
    fill($('#rooms2'), 50);
    this.updatePlayNote();
  },
  showMenu(on) {
    $('#menu').hidden = !on;
    if (on) { this.syncClassGrids(); this.refreshRooms(); this.renderProgress(); Editor.refreshMapList && Editor.refreshMapList(); }
  },
  showHUD(on) { $('#hud').hidden = !on; $('#touch').hidden = !on || !isTouchDevice(); $('#fps').hidden = !SETTINGS.showFps; },
  connecting(on, text) { $('#connecting').hidden = !on; if (text) $('#conntxt').textContent = text; },
  showPause(on) {
    this.pauseOpen = on; $('#pause').hidden = !on;
    if (on) {
      Input.exitLock();
      $('#pausenote').textContent = Editor.testing ? 'Prova della mappa dall\'editor' : Net.roomName ? 'Stanza: ' + Net.roomName + (Game.isHost() ? ' · sei l\'host' : '') : 'Allenamento offline';
      $('#btn-leave').textContent = Editor.testing ? 'Torna all\'editor' : 'Esci dalla partita';
    }
  },
  showClassPicker(on) { $('#classpick').hidden = !on; if (on) { Input.exitLock(); this.syncClassGrids(); } },
  showSettings(on) { $('#settings').hidden = !on; if (on) this.syncSettings(); },
  showDeath(on, killer, wIdx) {
    this.deathOpen = on; $('#death').hidden = !on;
    if (on) {
      const self = !killer || killer === Game.myId();
      $('#dwho').textContent = self ? 'Da te stesso' : Game.nameOf(killer);
      $('#dwho').style.color = self ? 'var(--ink)' : Game.colorOf(killer);
      const w = WEAPONS[WEAPON_IDS[wIdx]];
      let extra = w && !self ? 'con ' + w.name : '';
      const kp = !self && Game.posOf(killer);
      const e = Game.ents.get(killer) || (Game.botById(killer) && Game.botById(killer).ent);
      if (e && e.alive) extra += (extra ? ' · ' : '') + 'gli restano ' + Math.max(1, Math.round(e.hp)) + ' HP';
      if (kp) extra += ' · ' + Math.round(kp.distanceTo(Game.me.mover.pos)) + ' m';
      $('#dwith').textContent = extra;
    }
  },
  showEnd(on) {
    this.endOpen = on; $('#end').hidden = !on;
    if (on) this.renderEnd();
  },
  renderEnd() {
    const g = Game.g; if (!g) return;
    const mode = MODES[g.m], me = Game.me;
    let title = 'Pareggio', brush = '', color = 'var(--ink)';
    if (g.w === 'T1' || g.w === 'T2') {
      const t = g.w === 'T1' ? 1 : 2;
      const mine = me.team === t;
      title = mine ? 'Vittoria' : 'Sconfitta';
      brush = mode.id === 'inf' ? (t === 1 ? 'I sopravvissuti resistono' : 'Gli infetti dilagano') : 'Vincono i ' + TEAM_NAMES[t];
      color = mine ? 'var(--ink)' : 'var(--ink-dim)';
    } else if (g.w && g.w !== 'DRAW') {
      const mine = g.w === Game.myId();
      title = mine ? 'Vittoria' : 'Fine partita';
      brush = mine ? 'Hai vinto tu!' : 'Vince ' + Game.nameOf(g.w);
    }
    $('#winner').textContent = title; $('#winner').style.color = color;
    $('#winbrush').textContent = brush;
    $('#endsub').textContent = mode.name + ' · ' + (Game.mapInfo ? Game.mapInfo.name : '');
    // XP earned this match
    const xl = $('#endxp'); xl.innerHTML = '';
    const pm = Progress.match;
    if (pm && pm.skipped) xl.appendChild(el('span', '', 'Partita non conteggiata: sei entrato alla fine'));
    else if (pm) {
      const L = Progress.level();
      xl.appendChild(el('span', '', '+' + fmtN(pm.xp) + ' XP'));
      xl.appendChild(el('span', '', 'Livello ' + L.lvl + (L.max ? '' : ' · ' + Math.floor(L.cur / L.need * 100) + '%')));
      if (pm.up) xl.appendChild(el('span', '', 'Nuovo livello!'));
      for (const c of pm.ch) xl.appendChild(el('span', '', 'Sfida: ' + c));
    }
    const A = me.acc;
    if (A && A.sh) xl.appendChild(el('span', '', 'Precisione ' + Math.round(A.hi / A.sh * 100) + '% · testa ' + A.h + ' · busto ' + A.b + ' · gambe ' + A.l));
    $('#endboard').innerHTML = ''; $('#endboard').appendChild(this.buildBoard(true));
    const vb = $('#votes'); vb.innerHTML = '';
    (g.vo || []).forEach((mi, i) => {
      const m = MODES[mi]; if (!m) return;
      const b = el('button', 'vote' + (Game.me.vote === i ? ' on' : '')); b.type = 'button';
      b.appendChild(el('b', '', m.name)); b.appendChild(el('span', 'vc', ''));
      b.addEventListener('click', () => { Game.me.vote = i; SFX.ui(); $$('.vote', vb).forEach((x, j) => x.classList.toggle('on', j === i)); });
      vb.appendChild(b);
    });
  },
  lockHint(on) {
    $('#lockhint').classList.toggle('on', on);
    clearTimeout(this._lockHintT);
    if (on) this._lockHintT = setTimeout(() => $('#lockhint').classList.remove('on'), 6000);
  },
  // ------------------------------------------------------------ live HUD
  update(dt) {
    const me = Game.me, g = Game.g;
    const w = Game.cur(), def = w ? WEAPONS[w.id] : null;
    // health
    const hp = Math.max(0, Math.ceil(me.hp));
    if (this._hp !== hp) { this._hp = hp; $('#hpv').textContent = hp; $('#hpbar').style.width = clamp(me.hp / me.maxHp * 100, 0, 100) + '%'; $('#hp').classList.toggle('low', me.hp / me.maxHp < 0.35); }
    const clsName = g && MODES[g.m].id === 'inf' && me.team === 2 ? 'Infetto' : CLASSES[me.cls].name;
    if (this._cls !== clsName) { this._cls = clsName; $('#hpcls').textContent = clsName; }
    // ammo
    if (w) {
      const a = def.mag ? w.ammo : '∞';
      const key = w.id + a + me.slot + me.inv.length + (me.reload ? 'r' : '');
      if (this._ammo !== key) {
        this._ammo = key;
        $('#ammov').textContent = a; $('#ammom').textContent = def.mag ? '/' + def.mag : '';
        $('#ammon').textContent = def.name;
        $('#ammo').classList.toggle('empty', def.mag && w.ammo === 0);
        const sl = $('#slots'); sl.innerHTML = '';
        me.inv.forEach((it, i) => { const t = el('i', i === me.slot ? 'on' : '', (i + 1) + ' ' + WEAPONS[it.id].name); sl.appendChild(t); });
      }
    }
    // hint
    let hint = '';
    if (me.alive && w && def.mag && w.ammo === 0 && !me.reload) hint = 'Premi R per ricaricare';
    else if (me.alive && me.reload) hint = 'Ricarica…';
    else if (me.alive && w && def.mag && w.ammo <= Math.ceil(def.mag * 0.2) && w.ammo > 0) hint = 'Munizioni basse';
    if (me.spawnProt > 0 && me.alive) hint = 'Protezione allo spawn';
    if (this._hint !== hint) { this._hint = hint; $('#hint').textContent = hint; }
    // crosshair
    const scoped = def && def.scope && me.adsT > 0.75;
    $('#scope').classList.toggle('on', !!scoped && me.alive);
    const xh = $('#xhair');
    const hideX = !me.alive || scoped || (def && def.type !== 'melee' && me.adsT > 0.7) || this.endOpen;
    xh.style.display = hideX ? 'none' : '';
    if (!hideX && def) {
      const sp = def.type === 'melee' ? 0.004 : Game.spreadNow();
      const px = Math.max(4, sp / Math.tan(R.camera.fov * DEG / 2) * (R.h / 2));
      $('#xl').style.left = (-px - 9) + 'px'; $('#xr').style.left = px + 'px';
      $('#xu').style.top = (-px - 9) + 'px'; $('#xd').style.top = px + 'px';
    }
    // damage: direction arcs follow the attacker, red edges pulse when low, blood and desaturation when critical
    this.updateDamageDirs();
    const low = me.alive ? clamp(1 - me.hp / me.maxHp, 0, 1) : 0.6;
    this.hurtT = Math.max(0, (this.hurtT || 0) - dt * 1.5);
    this.bloodT = Math.max(0, (this.bloodT || 0) - dt * 0.4);
    const crit = me.alive ? smoothstep(0.5, 0.85, low) : 0;
    const pulse = crit > 0 ? 0.78 + 0.22 * Math.sin(performance.now() / 1000 * TAU * 1.2) : 1;
    const setO = (id, v) => { const s = v.toFixed(2); const k = '_o' + id; if (this[k] !== s) { this[k] = s; $(id).style.opacity = s; } };
    setO('#vign', clamp(low * low * 0.6 * pulse + this.hurtT * 0.45, 0, 1));
    setO('#blood', clamp(Math.max(this.bloodT * 0.5, crit * 0.55 * pulse), 0, 0.6));
    setO('#desat', crit * 0.55);
    SFX.lowHealth(Game.state === 'playing' && me.alive ? crit : 0);
    // timer & scores
    if (g) {
      const rem = Math.max(0, (Game.rEnd - performance.now()) / 1000);
      const ts = g.ph === 1 ? '' : fmtTime(rem);
      if (this._timer !== ts) { this._timer = ts; $('#timer').textContent = ts; }
    }
    // tab scoreboard
    const showBoard = me && Game.state === 'playing' && !this.endOpen && (Input.down('score'));
    const bd = $('#board');
    if (showBoard) { if (!this._boardT || performance.now() - this._boardT > 400) { this._boardT = performance.now(); bd.innerHTML = ''; const head = el('div', 'bhead'); head.appendChild(el('b', '', g ? MODES[g.m].name : 'Partita')); head.appendChild(el('span', '', (Net.roomName ? 'Stanza ' + Net.roomName : 'Allenamento') + ' · ' + (Game.mapInfo ? Game.mapInfo.name : ''))); bd.appendChild(head); bd.appendChild(this.buildBoard(false)); } bd.classList.add('on'); }
    else bd.classList.remove('on');
    // death countdown
    if (this.deathOpen) $('#dcd').textContent = g && g.ph === 1 ? 'Fine partita' : 'Rientri tra ' + Math.max(0, me.respawnT).toFixed(1) + ' s';
    if (this.endOpen && g) {
      const rem = Math.max(0, (Game.rEnd - performance.now()) / 1000);
      $('#endcd').textContent = 'Prossima partita tra ' + Math.ceil(rem) + ' s';
      // live vote counts
      const counts = [0, 0, 0];
      for (const c of Game.combatants()) if (c.human && c.vote >= 0 && c.vote < 3) counts[c.vote]++;
      $$('#votes .vote .vc').forEach((s, i) => { s.textContent = counts[i] ? counts[i] + (counts[i] === 1 ? ' voto' : ' voti') : 'nessun voto'; });
    }
    // fps & net
    if (SETTINGS.showFps) $('#fps').textContent = Math.round(Game.fps) + ' FPS';
    const online = !!Net.game;
    const conn = online ? (Net.connected ? (Game.isHost() ? 'Host' : 'Connesso') : 'Riconnessione…') : 'Offline';
    if (this._net !== conn) { this._net = conn; $('#hnettxt').textContent = conn + (Net.roomName ? ' · ' + Net.roomName : ''); $('#hnetdot').classList.toggle('on', online && Net.connected); }
    this.updateDmgNumbers(dt);
  },
  objectives(g) {
    const mode = MODES[g.m], me = Game.me;
    const sc = $('#scores');
    const key = JSON.stringify([g.m, g.sc, me.team, mode.teams ? 0 : me.stats.k, mode.id === 'gun' ? me.stats.lvl : 0, this._top]);
    if (this._sc !== key) {
      this._sc = key;
      sc.innerHTML = '';
      const box = (cls, val, label) => { const d = el('div', 'sc ' + cls); d.appendChild(el('b', 'num', String(val))); d.appendChild(el('span', '', label)); sc.appendChild(d); };
      if (mode.teams && mode.id !== 'inf') {
        box('t1' + (me.team === 1 ? ' me' : ''), Math.floor(g.sc[0]), 'Rossi');
        box('t2' + (me.team === 2 ? ' me' : ''), Math.floor(g.sc[1]), 'Azzurri');
      } else if (mode.id === 'inf') {
        const list = Game.combatants();
        box('t1' + (me.team === 1 ? ' me' : ''), list.filter((c) => Game.teamOf(c.id) === 1).length, 'Vivi');
        box('t2' + (me.team === 2 ? ' me' : ''), list.filter((c) => Game.teamOf(c.id) === 2).length, 'Infetti');
      } else if (mode.id === 'gun') {
        box('me', me.stats.lvl + 1 + '/' + GUNGAME_LIST.length, 'Livello');
        const best = Math.max(0, ...Game.combatants().filter((c) => c.id !== Game.myId()).map((c) => c.lvl || 0));
        box('', best + 1, 'Primo');
      } else {
        box('me', me.stats.k, 'Tu');
        const best = Math.max(0, ...Game.combatants().filter((c) => c.id !== Game.myId()).map((c) => c.kills || 0));
        box('', best, 'Primo');
        box('', mode.limit, 'Obiettivo');
      }
    }
    let line = '';
    if (mode.id === 'hp' && g.hz) {
      const z = ZONES()[g.hz[0]]; const o = g.hz[1];
      line = 'Zona: ' + (z ? z.name : '') + ' · ' + (o === -1 ? 'contesa' : o === 0 ? 'libera' : o === me.team ? 'vostra' : 'nemica') + ' · cambia tra ' + Math.max(0, Math.ceil(g.hz[2])) + ' s';
    } else if (mode.id === 'ctf' && g.fl) {
      const mine = g.fl[(me.team || 1) - 1], theirs = g.fl[me.team === 1 ? 1 : 0];
      const st = (f) => f[0] === 0 ? 'alla base' : f[0] === 1 ? (f[4] === Game.myId() ? 'la porti tu!' : 'rubata da ' + Game.nameOf(f[4])) : 'a terra';
      line = 'Vostra bandiera: ' + st(mine) + ' · nemica: ' + st(theirs);
    } else if (mode.id === 'inf') line = g.inf ? (me.team === 2 ? 'Contagia i sopravvissuti' : 'Resisti fino alla fine') : 'Il paziente zero sta per arrivare…';
    if (this._line !== line) { this._line = line; $('#objline').textContent = line; }
  },
  buildBoard(final) {
    const g = Game.g, mode = g ? MODES[g.m] : MODES[0];
    const list = Game.combatants().map((c) => {
      const isMe = c.id === Game.myId();
      const st = isMe ? Game.me.stats : null;
      const e = Game.ents.get(c.id), b = Game.botById(c.id);
      const k = isMe ? [st.k, st.d, st.a, st.sc, st.streak, st.lvl, st.caps] : e ? e.k : b ? [b.stats.k, b.stats.d, b.stats.a, b.stats.sc, 0, b.stats.lvl, 0] : [0, 0, 0, 0, 0, 0, 0];
      return { id: c.id, name: Game.nameOf(c.id), team: Game.teamOf(c.id), alive: c.alive, k, me: isMe };
    });
    const sortKey = mode.id === 'gun' ? (x) => x.k[5] * 1000 + x.k[0] : (x) => x.k[3];
    list.sort((a, b) => sortKey(b) - sortKey(a));
    const table = (rows, cap, capCls) => {
      const wrap = el('div', '');
      if (cap) wrap.appendChild(el('div', 'tcap ' + capCls, cap));
      const t = document.createElement('table'); t.className = 'sb';
      const hr = document.createElement('tr');
      for (const h of ['Giocatore', mode.id === 'gun' ? 'Liv' : 'U', 'M', 'A', 'Punti']) hr.appendChild(el('th', '', h));
      t.appendChild(hr);
      for (const r of rows) {
        const tr = document.createElement('tr'); if (r.me) tr.className = 'me'; else if (!r.alive && !final) tr.className = 'dead';
        tr.appendChild(el('td', '', r.name));
        tr.appendChild(el('td', '', String(mode.id === 'gun' ? r.k[5] + 1 : r.k[0])));
        tr.appendChild(el('td', '', String(r.k[1])));
        tr.appendChild(el('td', '', String(r.k[2] || 0)));
        tr.appendChild(el('td', '', String(r.k[3])));
        t.appendChild(tr);
      }
      wrap.appendChild(t);
      return wrap;
    };
    const box = el('div', 'btables');
    if (mode.teams) {
      box.classList.add('two');
      const n1 = mode.id === 'inf' ? 'Sopravvissuti' : 'Rossi', n2 = mode.id === 'inf' ? 'Infetti' : 'Azzurri';
      box.appendChild(table(list.filter((r) => r.team !== 2), n1 + (g && mode.id !== 'inf' ? ' · ' + Math.floor(g.sc[0]) : ''), 't1'));
      box.appendChild(table(list.filter((r) => r.team === 2), n2 + (g && mode.id !== 'inf' ? ' · ' + Math.floor(g.sc[1]) : ''), 't2'));
    } else box.appendChild(table(list));
    return box;
  },
  // ------------------------------------------------------------ feedback
  toast(text) {
    const t = el('div', 'tt', text);
    $('#toast').appendChild(t);
    setTimeout(() => t.remove(), 3200);
    while ($('#toast').children.length > 3) $('#toast').firstChild.remove();
  },
  // banners: queued ones (level up, challenges) wait for the current one to finish
  banner(title, sub, color, dur = 3, brush = '', queued = false) {
    const it = { title, sub, color, dur, brush };
    if (queued && this._banOn) { if (this._banQ.length < 4) this._banQ.push(it); return; }
    this.showBanner(it);
  },
  showBanner(it) {
    clearTimeout(this._banT);
    if (this._banNext && this._banNext !== it) this._banQ.unshift(this._banNext);
    this._banNext = null;
    $('#bannerT').textContent = it.title; $('#bannerT').style.color = it.color || 'var(--ink)';
    $('#bannerB').textContent = it.brush || '';
    $('#bannerS').textContent = it.sub || '';
    $('#banner').classList.add('on');
    this._banOn = true;
    this._banT = setTimeout(() => {
      $('#banner').classList.remove('on');
      const next = this._banQ.shift();
      if (next) { this._banNext = next; this._banT = setTimeout(() => this.showBanner(next), 450); }
      else this._banOn = false;
    }, it.dur * 1000);
  },
  levelUp(lvl) { this.banner('Livello ' + lvl, '', null, 3, 'Nuovo livello!', true); SFX.objective(true); },
  challengeDone(label, xp) { this.banner('Sfida completata', label, null, 3.2, '+' + fmtN(xp) + ' XP', true); },
  clearFeed() { $('#feed').innerHTML = ''; $('#notices').innerHTML = ''; },
  feed(kName, kColor, wName, vName, vColor, head, suicide) {
    const f = el('div', 'fe');
    if (kName) { const a = el('span', '', kName); a.style.color = kColor; f.appendChild(a); }
    f.appendChild(el('span', 'w', suicide ? 'si è eliminato' : wName));
    if (head) f.appendChild(el('span', 'hs', 'TESTA'));
    const v = el('span', '', vName); v.style.color = vColor; f.appendChild(v);
    if (kName === Game.me.name || vName === Game.me.name) f.classList.add('mine');
    const feed = $('#feed'); feed.appendChild(f);
    while (feed.children.length > 6) feed.firstChild.remove();
    setTimeout(() => f.remove(), 7000);
  },
  // CoD-style hit X: white on hits, gold with a ring on headshots, big red on kills; restarts its animation on every hit
  hitmarker(head, kill, prot) {
    const h = $('#hitm');
    h.className = (kill ? 'kill' : head ? 'head' : '') + (prot ? ' prot' : '');
    void h.offsetWidth;
    h.classList.add('pop');
  },
  // "+N" next to the crosshair, adding up while you keep hitting; optional label under it (headshot, kill...)
  scorePop(pts, label, kind) {
    const box = $('#scorepop'), now = performance.now();
    if (!this._sp || now - this._sp.t > 1600) this._sp = { n: 0, t: now };
    this._sp.n += pts; this._sp.t = now;
    $('#sp-n').textContent = '+' + this._sp.n;
    box.classList.remove('bump'); void box.offsetWidth; box.classList.add('on', 'bump');
    if (label) {
      const l = el('div', 'spl' + (kind ? ' ' + kind : ''), label);
      const list = $('#sp-l'); list.prepend(l);
      while (list.children.length > 3) list.lastChild.remove();
      setTimeout(() => l.remove(), 1700);
    }
    clearTimeout(this._spT); this._spT = setTimeout(() => box.classList.remove('on'), 1500);
  },
  damageNumber(p, dmg, head) {
    const v = p.clone().project(R.camera);
    if (v.z > 1) return;
    const x = (v.x * 0.5 + 0.5) * R.w, y = (-v.y * 0.5 + 0.5) * R.h;
    const d = el('div', 'dn' + (head ? ' h' : ''), String(dmg));
    d.style.left = x + 'px'; d.style.top = y + 'px';
    $('#dmgnums').appendChild(d);
    requestAnimationFrame(() => { d.style.transform = `translate(${rnd(-30, 30)}px, -50px)`; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 750);
  },
  updateDmgNumbers() {},
  // red arc around the crosshair pointing at the attacker; it keeps tracking the source while you turn
  damageDir(src, f = 0.3, id = '') {
    const now = performance.now();
    const list = this.dds || (this.dds = []);
    let d = id ? list.find((x) => x.id === id) : null;
    if (!d) {
      if (list.length >= 6) list.shift().el.remove();
      d = { id, el: el('div', 'dd'), src: new THREE.Vector3(), t: 0, f: 0 };
      $('#dmgdirs').appendChild(d.el); list.push(d);
    }
    d.f = Math.min(1, (now - d.t < 900 ? d.f : 0) + f);
    d.t = now; d.src.copy(src);
    d.el.style.borderWidth = Math.round(5 + d.f * 8) + 'px';
  },
  updateDamageDirs() {
    const list = this.dds;
    if (!list || !list.length) return;
    const me = Game.me, now = performance.now();
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i], age = (now - d.t) / 1000;
      if (age > 2.2 || !me || !me.alive) { d.el.remove(); list.splice(i, 1); continue; }
      const ang = Math.atan2(d.src.x - me.mover.pos.x, -(d.src.z - me.mover.pos.z)) + me.yaw;
      d.el.style.transform = 'rotate(' + ang.toFixed(3) + 'rad)';
      d.el.style.opacity = (age < 0.7 ? 1 : 1 - (age - 0.7) / 1.5).toFixed(2);
    }
  },
  hurt(f) {
    this.hurtT = Math.min(0.6, (this.hurtT || 0) + f * 1.2);
    this.bloodT = Math.min(1, (this.bloodT || 0) + f * 2.2);
    const h = $('#hurtflash');
    h.style.setProperty('--hf', Math.min(1, 0.3 + f * 2.4).toFixed(2));
    h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
    if (!this._bloodDrawn) this.drawBlood();
  },
  // splatter around the screen edges, drawn once (the overlay only changes opacity)
  drawBlood() {
    const c = $('#blood'); if (!c) return;
    const g = c.getContext('2d'), W = c.width, H = c.height, r = mulberry32(77);
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const side = Math.floor(r() * 4), t = r(), d = Math.pow(r(), 1.9) * 0.14;
      let x, y;
      if (side === 0) { x = t * W; y = d * H; } else if (side === 1) { x = t * W; y = H - d * H; } else if (side === 2) { x = d * W * 0.6; y = t * H; } else { x = W - d * W * 0.6; y = t * H; }
      const rad = (10 + r() * 40) * (1.1 - d * 3);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(105,0,6,0.9)'); gr.addColorStop(0.55, 'rgba(140,3,10,0.5)'); gr.addColorStop(1, 'rgba(140,3,10,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
    for (let i = 0; i < 9; i++) {
      const x = (r() < 0.5 ? r() * 0.25 : 0.75 + r() * 0.25) * W, len = 16 + r() * 50, w = 2 + r() * 3;
      const gr = g.createLinearGradient(x, 0, x, len);
      gr.addColorStop(0, 'rgba(110,0,6,0.85)'); gr.addColorStop(1, 'rgba(110,0,6,0)');
      g.fillStyle = gr; g.fillRect(x, 0, w, len);
    }
    this._bloodDrawn = true;
  },
  flashSpawn() { const s = $('#spawnflash'); s.style.transition = 'none'; s.style.opacity = '1'; requestAnimationFrame(() => { s.style.transition = 'opacity 0.6s'; s.style.opacity = '0'; }); },
  killNotice(victim, head, streak, pts, assist) {
    const n = el('div', 'kn' + (head ? ' hs' : ''));
    n.textContent = assist ? 'Assist su ' + victim : (head ? 'Colpo alla testa · ' : 'Eliminato · ') + victim;
    const em = document.createElement('em'); em.textContent = '+' + pts; n.appendChild(em);
    const box = $('#notices'); box.appendChild(n);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => n.remove(), 2600);
    const streaks = { 2: 'Doppia uccisione', 3: 'Tripla!', 5: 'Inarrestabile', 7: 'Leggenda del borgo', 10: 'Divino' };
    if (streaks[streak]) this.banner(streaks[streak], '', null, 2, streak + ' uccisioni di fila');
  },
  openChat() {
    this.chatOpen = true; Input.typing = true; Input.clearAll();
    $('#chatin').classList.add('on'); const ci = $('#chatinput'); ci.value = ''; ci.focus();
  },
  closeChat() {
    this.chatOpen = false; Input.typing = false;
    $('#chatin').classList.remove('on'); $('#chatinput').blur();
    if (Game.state === 'playing' && !this.pauseOpen) Game.requestLock();
  },
  chatMessage(name, color, text) {
    if (!text) return;
    const m = el('div', 'cm');
    const b = el('b', '', name + ':'); b.style.color = color; m.appendChild(b);
    m.appendChild(document.createTextNode(text));
    const log = $('#chatlog'); log.appendChild(m);
    while (log.children.length > 7) log.firstChild.remove();
    setTimeout(() => m.remove(), 12000);
  },
  // ------------------------------------------------------------ settings
  initSettings() {
    const bind = (id, key, fmt) => {
      const inp = $('#s-' + id), out = $('#o-' + id);
      inp.addEventListener('input', () => { SETTINGS[key] = +inp.value; if (out) out.textContent = fmt(+inp.value); saveSettings(); this.applySettings(key); });
    };
    bind('sens', 'sens', (v) => v.toFixed(2)); bind('ads', 'adsSens', (v) => v.toFixed(2)); bind('fov', 'hfov', (v) => v + '°'); bind('vol', 'volume', (v) => Math.round(v * 100) + '%');
    $('#s-q').addEventListener('change', (e) => {
      const v = e.target.value;
      if (v === 'custom') SETTINGS.gfx = Object.assign({}, R.cfg);
      SETTINGS.quality = v; saveSettings(); this.applySettings('quality');
    });
    // advanced graphics controls: changing one switches the preset to "Personalizzato"
    const adv = $('#s-adv');
    for (const [key, label, opts] of GFX_UI) {
      const f = el('div', 'field');
      const lb = el('label', '', label); lb.htmlFor = 's-g-' + key;
      const sel = el('select'); sel.id = 's-g-' + key;
      for (const [v, t] of opts) { const o = el('option', '', t); o.value = String(v); sel.appendChild(o); }
      sel.addEventListener('change', () => {
        SETTINGS.gfx = Object.assign({}, R.cfg, SETTINGS.quality === 'custom' ? SETTINGS.gfx : null);
        SETTINGS.gfx[key] = +sel.value;
        SETTINGS.quality = 'custom'; saveSettings(); this.applySettings('quality');
      });
      f.append(lb, sel); adv.appendChild(f);
    }
    $('#s-bob').addEventListener('change', (e) => { SETTINGS.viewBob = e.target.checked; saveSettings(); });
    $('#btn-sreload').addEventListener('click', () => { try { location.reload(); } catch (e) { /* not allowed */ } });
    $('#s-fps').addEventListener('change', (e) => { SETTINGS.showFps = e.target.checked; saveSettings(); $('#fps').hidden = !SETTINGS.showFps; });
    $('#s-inv').addEventListener('change', (e) => { SETTINGS.invertY = e.target.checked; saveSettings(); });
    $('#s-dn').addEventListener('change', (e) => { SETTINGS.damageNumbers = e.target.checked; saveSettings(); });
    $('#btn-sclose').addEventListener('click', () => this.showSettings(false));
  },
  syncSettings() {
    const set = (id, v, txt) => { $('#s-' + id).value = v; const o = $('#o-' + id); if (o) o.textContent = txt; };
    set('sens', SETTINGS.sens, SETTINGS.sens.toFixed(2)); set('ads', SETTINGS.adsSens, SETTINGS.adsSens.toFixed(2));
    set('fov', SETTINGS.hfov, SETTINGS.hfov + '°'); set('vol', SETTINGS.volume, Math.round(SETTINGS.volume * 100) + '%');
    const c = R.cfg, id = gfxPresetId(SETTINGS.quality);
    $('#s-q').value = id;
    for (const [key] of GFX_UI) { const sel = $('#s-g-' + key); if (sel) sel.value = String(c[key]); }
    const pid = id === 'auto' ? autoPreset() : id;
    $('#s-qdesc').textContent = (id === 'auto' ? 'Scelto per questo dispositivo: ' + GFX_PRESETS[pid].n + ', con risoluzione dinamica. ' : '') + (GFX_DESC[pid] || 'Valori scelti da te nelle opzioni avanzate.');
    $('#s-bob').checked = SETTINGS.viewBob !== false;
    $('#s-fps').checked = !!SETTINGS.showFps; $('#s-inv').checked = !!SETTINGS.invertY; $('#s-dn').checked = !!SETTINGS.damageNumbers;
    $('#s-note').textContent = R.pendingReload ? 'La nuova qualità delle texture si applica al prossimo caricamento della pagina.' : 'Le modifiche si applicano subito.';
    $('#btn-sreload').hidden = !R.pendingReload;
  },
  applySettings(key) {
    if (key === 'volume') SFX.setVolume(SETTINGS.volume);
    if (key === 'quality') {
      R.applyGfx();
      this.syncSettings();
    }
  },
};

// ---------------------------------------------------------------------
// Objectives in the world: hardpoint zone, flags, 2D markers
const Objectives = {
  zoneMesh: null, flags: [], markers: {},
  ensure() {
    if (this.zoneMesh) return;
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const geo = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const k = pos.getY(i) < 0 ? 1 : 0; cols[i * 3] = k; cols[i * 3 + 1] = k; cols[i * 3 + 2] = k; }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    mat.vertexColors = true;
    this.zoneMesh = new THREE.Mesh(geo, mat);
    this.zoneMesh.visible = false; this.zoneMesh.renderOrder = 5;
    R.scene.add(this.zoneMesh);
    this.zoneBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat.clone());
    this.zoneBox.visible = false; this.zoneBox.renderOrder = 5;
    R.scene.add(this.zoneBox);
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), MAT.iron); pole.position.y = 1.2; g.add(pole);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6, 8, 4), new THREE.MeshStandardMaterial({ color: i === 0 ? 0xd8463c : 0x3d8ad8, side: THREE.DoubleSide, roughness: 0.8, emissive: i === 0 ? 0x5a1510 : 0x10305a }));
      cloth.position.set(0.45, 2.05, 0); g.add(cloth);
      cloth.userData.base = cloth.geometry.attributes.position.array.slice();
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.6, 40), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xd8463c : 0x3d8ad8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
      const base = new THREE.Group(); base.add(ring);
      g.visible = false; base.visible = false;
      R.scene.add(g, base);
      this.flags.push({ g, cloth, base });
    }
  },
  update(dt, g) {
    this.ensure();
    const mode = MODES[g.m], me = Game.me;
    const mk = $('#markers');
    const want = new Set();
    const marker = (key, pos3, label, color, icon) => {
      want.add(key);
      let m = this.markers[key];
      if (!m) { m = el('div', 'mk'); m.appendChild(el('i', '', icon)); m.appendChild(el('span', '', label)); mk.appendChild(m); this.markers[key] = m; }
      m.style.color = color;
      m.lastChild.textContent = label; m.firstChild.textContent = icon;
      const v = pos3.clone().project(R.camera);
      let x = (v.x * 0.5 + 0.5) * R.w, y = (-v.y * 0.5 + 0.5) * R.h;
      const behind = v.z > 1;
      if (behind) { x = R.w - x; y = R.h - 30; }
      const off = behind || x < 30 || x > R.w - 30 || y < 60 || y > R.h - 30;
      x = clamp(x, 30, R.w - 30); y = clamp(y, 60, R.h - 30);
      m.style.left = x + 'px'; m.style.top = y + 'px';
      m.classList.toggle('off', off);
    };
    // hardpoint
    const zm = this.zoneMesh, zb = this.zoneBox;
    zm.visible = false; zb.visible = false;
    const zHp = mode.id === 'hp' && g.hz && g.ph === 0 ? ZONES()[g.hz[0]] : null;
    if (zHp) {
      const z = zHp;
      const o = g.hz[1];
      const col = o === -1 ? 0xf0b43c : o === 0 ? 0xf3ece1 : o === 1 ? 0xd8463c : 0x3d8ad8;
      if (z.box) {
        const b = z.box;
        zb.visible = true; zb.scale.set(b[3] - b[0], Math.min(3, b[4] - b[1]), b[5] - b[2]); zb.position.set((b[0] + b[3]) / 2, b[1] + Math.min(3, b[4] - b[1]) / 2 + 0.2, (b[2] + b[5]) / 2);
        zb.material.color.setHex(col); zb.material.opacity = 0.08 + 0.04 * Math.sin(Game.time * 3);
      } else {
        zm.visible = true; zm.scale.set(z.r, 3, z.r); zm.position.set(z.c[0], z.c[1] + 1.5, z.c[2]);
        zm.material.color.setHex(col); zm.material.opacity = 0.2 + 0.06 * Math.sin(Game.time * 3);
      }
      const c = zoneCenter(z);
      const lbl = o === -1 ? 'Contesa' : o === me.team ? 'Difendi' : o === 0 ? 'Cattura' : 'Attacca';
      marker('hp', new THREE.Vector3(c[0], c[1] + 2.8, c[2]), lbl + ' · ' + Math.round(me.mover.pos.distanceTo(new THREE.Vector3(c[0], c[1], c[2]))) + ' m', '#' + new THREE.Color(col).getHexString(), 'Z');
    }
    // flags
    for (let i = 0; i < 2; i++) {
      const f = this.flags[i];
      const on = mode.id === 'ctf' && g.fl && g.ph === 0;
      f.g.visible = on; f.base.visible = on;
      if (!on) continue;
      const fl = g.fl[i];
      const F = FLAGS_POS()[i];
      f.base.position.set(F[0], F[1], F[2]);
      let p;
      if (fl[0] === 1) { const cp = Game.posOf(fl[4]); p = cp ? new THREE.Vector3(cp.x, cp.y + 0.6, cp.z) : new THREE.Vector3(fl[1], fl[2], fl[3]); }
      else p = new THREE.Vector3(fl[1], fl[2], fl[3]);
      f.g.position.copy(p);
      f.g.visible = !(fl[0] === 1 && fl[4] === Game.myId());
      const b = f.cloth.userData.base, ps = f.cloth.geometry.attributes.position;
      for (let k = 0; k < ps.count; k++) { const x = b[k * 3] + 0.45; ps.setZ(k, Math.sin(x * 5 - Game.time * 6) * 0.08 * x); }
      ps.needsUpdate = true;
      const mine = i + 1 === me.team;
      const label = mine ? (fl[0] === 0 ? 'Difendi' : fl[0] === 1 ? 'Recupera' : 'Riprendi') : (fl[0] === 1 ? (fl[4] === Game.myId() ? 'Portala a casa' : 'Scorta') : 'Ruba');
      marker('fl' + i, p.clone().add(new THREE.Vector3(0, 2.8, 0)), label, i === 0 ? '#ff7a6a' : '#7ab4ff', '⚑');
      if (fl[0] === 1 && fl[4] === Game.myId()) { const myBase = FLAGS_POS()[me.team - 1]; marker('home', new THREE.Vector3(myBase[0], myBase[1] + 2.5, myBase[2]), 'Base', '#f0b43c', '⌂'); }
    }
    for (const k of Object.keys(this.markers)) if (!want.has(k)) { this.markers[k].remove(); delete this.markers[k]; }
  },
};

// graphics settings screen: advanced controls [key, label, [[value, text]...]] and preset descriptions
const GFX_UI = [
  ['scale', 'Risoluzione di rendering', [[0.5, '50%'], [0.6, '60%'], [0.75, '75%'], [0.85, '85%'], [1, '100%']]],
  ['shadow', 'Ombre', [[0, 'Disattivate'], [1, 'Basse'], [2, 'Medie'], [3, 'Alte (a cascata)'], [4, 'Ultra (morbide)'], [5, 'Estreme (4096)']]],
  ['ao', 'Occlusione ambientale', [[0, 'Disattivata'], [1, 'Media'], [2, 'Alta']]],
  ['bloom', 'Bagliore (bloom)', [[0, 'Disattivato'], [1, 'Attivo']]],
  ['aa', 'Antialiasing', [[0, 'Nessuno'], [1, 'MSAA 4x'], [2, 'MSAA 4x + SMAA']]],
  ['tex', 'Qualità delle texture', [[0, 'Bassa'], [1, 'Media'], [2, 'Alta'], [3, 'Ultra']]],
  ['aniso', 'Filtro anisotropico', [[1, 'Disattivato'], [2, '2x'], [4, '4x'], [8, '8x'], [16, '16x']]],
  ['dist', 'Distanza visiva', [[0, 'Vicina'], [1, 'Media'], [2, 'Lontana']]],
  ['bg', 'Densità dello sfondo', [[0, 'Bassa'], [1, 'Media'], [2, 'Alta']]],
  ['fx', 'Particelle e fori', [[0, 'Pochi'], [1, 'Medi'], [2, 'Tutti']]],
  ['refl', 'Riflessi del cielo', [[0, 'Bassi'], [1, 'Medi'], [2, 'Alti']]],
  ['post', 'Effetti di post-produzione', [[0, 'Disattivati'], [1, 'Colore e vignettatura'], [2, 'Cinematici (raggi del sole)']]],
];
const GFX_DESC = {
  minimo: 'Per computer molto deboli e telefoni: niente ombre, risoluzione ridotta.',
  basso: 'Ombre semplici e antialiasing, risoluzione piena.',
  medio: 'Il bilanciamento di sempre: ombre nitide su tutta la mappa, nessun effetto aggiuntivo.',
  alto: 'Ombre a cascata vicino al giocatore, occlusione ambientale, bagliore e correzione del colore.',
  ultra: 'Ombre morbide che si induriscono al contatto (PCSS), texture e riflessi al massimo.',
  estremo: 'Tutto al massimo: ombre 4096 morbide, occlusione ambientale piena, SMAA, raggi del sole e riflessi della lente. Serve una scheda video potente.',
};
