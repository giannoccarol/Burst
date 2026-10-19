// ===================================================================
// Networking over the artifact "room" capability (presence-based protocol)
// Every player publishes one presence object ~30x/s: state snapshot,
// a short ring of recent events, stats; the elected host adds game state
// and its bots. Works for viewers without send rights on event topics.
//
// Protocol 4 (not compatible with 3: each side ignores the other's presence)
//   { v, j, n, c, tm, mp, vt, ap, rd?, aw?,
//     s: [t,x,y,z,yaw,pitch,vx,vy,vz,flags,wIdx,hp,life], k: [k,d,a,sc,streak,lvl,caps],
//     e: [[seq,type,actor,...]...], g (host claim only), b (host bots only) }
//   - every object key is a plain identifier (ids travel as values, never as keys)
//   - the merged object is kept under NET_BUDGET UTF-8 bytes (platform limit 4096)
//   - critical events (hit, death, rocket, boom, chat, spawn) live 3 s and are never
//     evicted by cosmetic ones (shot, reload, melee: 0.7 s)
//   - host = the claimer (peer publishing g) with the highest term g.he, then the oldest j;
//     with no claimer, the oldest ready peer. Stale (silent) and away (hidden tab) peers
//     are not candidates, so a frozen or backgrounded host is replaced by someone who
//     adopts its last g (term + 1); a returning old host sees the higher term and yields.
// ===================================================================
const PROTO = 4;
const EV = { SHOT: 1, HIT: 2, DIE: 3, ROCKET: 4, BOOM: 5, CHAT: 6, MELEE: 7, SPAWN: 8, RELOAD: 9 };
const EV_CRIT = { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 8: 1 };
const NET_CFG = { sendMs: 33, budget: 3800, critLife: 3000, cosLife: 700, maxEvents: 48, stalePeer: 2500, staleHost: 4000, settleAlone: 2500, settleMax: 6000 };
const ID_RE = /^[A-Za-z0-9_-]{1,24}$/;
function netNum(v, lo, hi, d) { v = +v; return Number.isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : d; }
function netId(v) { return typeof v === 'string' && ID_RE.test(v) ? v : ''; }
function netStr(v, n) { return typeof v === 'string' ? stripCtl(v, '').slice(0, n) : ''; }
function wIdxOk(v) { v = +v; return Number.isInteger(v) && v >= 0 && v < WEAPON_IDS.length ? v : (WIDX.ar != null ? WIDX.ar : 0); }
function apOk(a) {
  const o = [0, 0, 0, 0];
  if (!Array.isArray(a) || a.length > 4) return o;
  for (let i = 0; i < a.length; i++) { const v = a[i]; if (!Number.isInteger(v) || v < 0 || v > 63) return [0, 0, 0, 0]; o[i] = v; }
  return o;
}
// UTF-8 byte length of a string (the platform measures presence in UTF-8 bytes)
function utf8Len(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n++; else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; } else n += 3;
  }
  return n;
}

const Net = {
  room: null, user: null, game: null, roomName: null, myPeer: null, myId: null, myName: '', myColor: '#c9a14a',
  peers: new Map(), lobbyPeers: [], seq: 0, events: [], unsubs: [], lobbyUnsubs: [], joinedAt: 0, j: 0,
  nextSend: 0, connected: false, emitter: new Emitter(), offline: true, sendErr: 0, shrink: 0,
  ready: false, away: false, claim: 0, host: null, lastBytes: 0, rejoinN: 0,
  // why the room is missing, shown in the menu: 'page' (not opened from claude.ai), 'signin' (signed out),
  // 'admit' (signed in but not admitted: public link, or outside the organisation and not invited),
  // 'lost' (connection refused or dropped)
  why: null,
  async init() {
    const C = window.claude;
    if (C && typeof C.use === 'function') {
      try { this.room = await C.use('room'); } catch (e) { this.room = null; }
      try { this.user = await C.use('user'); } catch (e) { this.user = null; }
    }
    if (!this.room) this.why = !(C && typeof C.use === 'function') ? 'page' : !this.user ? 'signin' : 'admit';
    if (this.user) {
      try { const me = await this.user.me(); this.myName = me.name || ''; this.myColor = me.color || this.myColor; this.myId = me.id; } catch (e) { /* anonymous */ }
    }
    this.offline = !this.room;
    if (this.room) {
      try {
        this.lobbyUnsubs.push(this.room.onPeers((ch) => { this.lobbyPeers = ch.peers; this.emitter.emit('lobby', ch.peers); }, () => {}));
        this.lobbyUnsubs.push(this.room.onConnection((c) => { this.lobbyConnected = c; this.emitter.emit('lobbyconn', c); }, (e) => { this.offline = true; this.why = 'lost'; this.whyCode = e && e.code; this.emitter.emit('lobbyconn', false); }));
      } catch (e) { this.offline = true; this.why = 'lost'; }
    }
    // a hidden tab stops its game loop: tell the room right away so a backgrounded
    // host is replaced at once instead of after the stale timeout
    try { document.addEventListener('visibilitychange', () => this.setAway(document.hidden)); } catch (e) { /* no document */ }
    return !this.offline;
  },
  online() { return !this.offline && !!this.room; },
  setLobby(fields) { if (!this.room) return; try { this.room.presence(fields).catch(() => {}); } catch (e) { /* ignore */ } },
  setAway(on) {
    on = !!on;
    if (on === this.away) return;
    this.away = on;
    if (this.game) { try { this.game.presence({ aw: on ? 1 : null }).catch(() => {}); } catch (e) { /* ignore */ } }
  },
  // list rooms advertised in the lobby
  listRooms() {
    const rooms = new Map();
    for (const p of this.lobbyPeers) {
      const pr = p.presence || {};
      if (!pr.rm || typeof pr.rm !== 'string') continue;
      const name = pr.rm.slice(0, 48);
      if (!rooms.has(name)) rooms.set(name, { name, players: 0, mode: pr.md, map: pr.mp, names: [] });
      const r = rooms.get(name);
      r.players++;
      if (pr.hn) { r.mode = pr.md; r.map = pr.mp; }
      if (pr.n) r.names.push(sanitizeName(pr.n));
    }
    return Array.from(rooms.values()).sort((a, b) => b.players - a.players);
  },
  async join(name) {
    this.leave();
    this.roomName = name;
    this.j = Date.now();
    this.joinedAt = performance.now();
    // seq keeps growing across joins: a quick rejoin must not look like old events
    this.events = []; this.ready = false; this.claim = 0; this.host = null; this.rejoinN = 0;
    if (!this.room) { this.game = null; this.connected = false; return 'offline'; }
    return this.attach(name);
  },
  async attach(name) {
    let r = null;
    try { r = await this.room.join(name); } catch (e) { r = null; }
    if (this.roomName !== name) return 'left';
    if (!r) { r = this.room; this.usingLobby = true; } else this.usingLobby = false;
    this.game = r;
    this.unsubs.push(r.onPeers((ch) => this.onPeers(ch), (e) => this.onRoomError(name, e)));
    this.unsubs.push(r.onConnection((c) => { this.connected = c; this.emitter.emit('connection', c); }, () => {}));
    if (this.away) this.setAway(true);
    return this.usingLobby ? 'lobby' : 'room';
  },
  // the platform re-joins rooms after a reconnect; if it cannot, the room ends: join it again
  onRoomError(name, e) {
    const code = e && e.code;
    console.warn('room error', code);
    if (this.roomName !== name || this.usingLobby) return;
    if (code === 'not_permitted' || code === 'revoked' || code === 'not_granted' || (code && code.startsWith('capability'))) return;
    for (const u of this.unsubs) { try { u(); } catch (er) { /* ignore */ } }
    this.unsubs = []; this.game = null; this.connected = false;
    const n = ++this.rejoinN;
    setTimeout(() => { if (this.roomName === name && !this.game) this.attach(name); }, Math.min(10000, 800 * n));
  },
  leave() {
    for (const u of this.unsubs) { try { u(); } catch (e) { /* ignore */ } }
    this.unsubs = [];
    if (this.game && this.game !== this.room) { try { this.game.leave(); } catch (e) { /* ignore */ } }
    else if (this.game === this.room && this.room) { try { this.room.presence({ v: null, s: null, e: null, g: null, b: null, k: null, j: null, ap: null, rd: null, aw: null }).catch(() => {}); } catch (e) { /* ignore */ } }
    this.game = null; this.peers.clear(); this.myPeer = null; this.roomName = null; this.host = null; this.ready = false; this.claim = 0;
    this.setLobby({ rm: null, md: null, mp: null, hn: null });
  },
  newInfo(p, now) {
    return { peer: p.peer, by: p.by, guest: p.guest, isMe: p.isMe, kind: p.kind, snaps: [], dbuf: new Float64Array(48), dn: 0, dmin: 0, jit: 30, iv: 33, pb: null, rt: 0, lastT: -1, lastSeq: -1, first: true, valid: false, name: 'Giocatore', bots: new Map(), seen: now, j: 0, ap: [0, 0, 0, 0], lostEv: 0, rd: false, aw: false, g: null };
  },
  onPeers(ch) {
    const now = performance.now();
    for (const p of ch.peers) {
      if (p.sameTab) { this.myPeer = p.peer; continue; }
      if (p.kind && p.kind !== 'viewer') continue;
      let info = this.peers.get(p.peer);
      if (!info) {
        info = this.newInfo(p, now);
        this.peers.set(p.peer, info);
        this.emitter.emit('join', info);
      }
      if (p.presence !== info.lastPresence) {
        info.lastPresence = p.presence;
        try { this.ingest(info, p.presence, now); } catch (e) { info.valid = false; console.warn('bad presence', e); }
      }
    }
    for (const p of ch.left) {
      const info = this.peers.get(p.peer);
      if (info) { this.peers.delete(p.peer); this.emitter.emit('left', info); }
    }
    this.emitter.emit('peers');
  },
  ingest(info, pr, now) {
    if (!pr || typeof pr !== 'object' || Array.isArray(pr) || pr.v !== PROTO) { if (info.valid) { info.valid = false; this.emitter.emit('invalid', info); } return; }
    const j = netNum(pr.j, 0, 1e15, 0);
    if (info.valid && j !== info.j) {
      // same document joined again: new session (events restart, buffers reset)
      info.snaps.length = 0; info.dn = 0; info.pb = null; info.lastT = -1; info.lastSeq = -1; info.first = true; info.bots.clear();
    }
    info.valid = true;
    info.seen = now;
    info.j = j;
    info.name = sanitizeName(pr.n) || 'Giocatore';
    info.cls = clamp(pr.c | 0, 0, CLASSES.length - 1);
    info.team = clamp(pr.tm | 0, 0, 2);
    const k = Array.isArray(pr.k) ? pr.k : [];
    info.k = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 7; i++) info.k[i] = netNum(k[i], -1e6, 1e7, 0);
    info.vt = Number.isInteger(pr.vt) && pr.vt >= 0 && pr.vt < 3 ? pr.vt : -1;
    info.mapId = typeof pr.mp === 'string' ? pr.mp.slice(0, 80) : null;
    info.ap = apOk(pr.ap);
    info.rd = pr.rd === 1;
    info.aw = pr.aw === 1;
    info.g = pr.g ? decodeG(pr.g) : null;
    const s = pr.s;
    if (Array.isArray(s) && s.length >= 12 && s.length < 32) {
      const t = netNum(s[0], -1e12, 1e12, NaN);
      if (t > info.lastT) {
        const x = +s[1], y = +s[2], z = +s[3];
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) && Math.abs(x) < 1e5 && Math.abs(y) < 1e5 && Math.abs(z) < 1e5) {
          if (info.lastT >= 0) { const iv = clamp(t - info.lastT, 5, 400); info.iv += (iv - info.iv) * 0.1; }
          info.lastT = t;
          this.clock(info, now - t);
          const o = info.snaps.length >= 40 ? info.snaps.shift() : {};
          o.t = t; o.x = x; o.y = y; o.z = z; o.yaw = netNum(s[4], -1e4, 1e4, 0); o.pitch = netNum(s[5], -1.6, 1.6, 0);
          o.vx = netNum(s[6], -60, 60, 0); o.vy = netNum(s[7], -80, 80, 0); o.vz = netNum(s[8], -60, 60, 0);
          o.f = s[9] & 255; o.w = wIdxOk(s[10]); o.hp = netNum(s[11], 0, 1000, 100); o.life = s[12] | 0;
          info.snaps.push(o);
        }
      }
      // host bots share the host clock
      if (Array.isArray(pr.b)) {
        const live = this._live || (this._live = new Set());
        live.clear();
        for (const b of pr.b.length > 24 ? pr.b.slice(0, 24) : pr.b) {
          if (!Array.isArray(b) || b.length < 16) continue;
          const id = netId(b[0]);
          if (!id || live.has(id)) continue;
          live.add(id);
          let bi = info.bots.get(id);
          if (!bi) { bi = { id, snaps: [], lastT: -1 }; info.bots.set(id, bi); }
          bi.name = sanitizeName(b[1]) || 'Bot'; bi.cls = clamp(b[2] | 0, 0, CLASSES.length - 1); bi.team = clamp(b[3] | 0, 0, 2);
          bi.k = [netNum(b[12], 0, 1e6, 0), netNum(b[13], 0, 1e6, 0), 0, netNum(b[14], 0, 1e7, 0), 0, netNum(b[15], 0, 100, 0), 0];
          bi.ap = b.length > 16 ? apOk(b[16]) : null;
          const bx = +b[4], by = +b[5], bz = +b[6];
          if (t > bi.lastT && Number.isFinite(bx) && Number.isFinite(by) && Number.isFinite(bz)) {
            bi.lastT = t;
            const o = bi.snaps.length >= 40 ? bi.snaps.shift() : {};
            o.t = t; o.x = bx; o.y = by; o.z = bz; o.yaw = netNum(b[7], -1e4, 1e4, 0); o.pitch = netNum(b[8], -1.6, 1.6, 0);
            o.vx = 0; o.vy = 0; o.vz = 0; o.f = b[9] & 255; o.w = wIdxOk(b[10]); o.hp = netNum(b[11], 0, 1000, 100); o.life = 0;
            bi.snaps.push(o);
          }
        }
        for (const id of info.bots.keys()) if (!live.has(id)) info.bots.delete(id);
      } else if (info.bots.size) info.bots.clear();
    }
    const evs = pr.e;
    if (Array.isArray(evs)) {
      const n = Math.min(evs.length, 64);
      if (info.first) {
        info.first = false;
        for (let i = 0; i < n; i++) { const ev = evs[i]; if (Array.isArray(ev) && Number.isInteger(ev[0]) && ev[0] > info.lastSeq) info.lastSeq = ev[0]; }
      } else {
        let lo = Infinity;
        for (let i = 0; i < n; i++) { const ev = evs[i]; if (Array.isArray(ev) && Number.isInteger(ev[0]) && ev[0] < lo && ev[0] > info.lastSeq) lo = ev[0]; }
        for (let i = 0; i < n; i++) {
          const ev = evs[i];
          if (!Array.isArray(ev) || ev.length > 16 || !Number.isInteger(ev[0]) || !(ev[0] > info.lastSeq)) continue;
          info.lastSeq = ev[0];
          try { this.emitter.emit('event', info, ev); } catch (e) { console.error(e); }
        }
        if (lo !== Infinity && info.lastSeqSeen != null && lo > info.lastSeqSeen + 1) info.lostEv += lo - info.lastSeqSeen - 1;
      }
      info.lastSeqSeen = info.lastSeq;
    }
  },
  // clock offset (+ one-way latency) and jitter of a peer, from each new snapshot
  clock(info, d) {
    const buf = info.dbuf;
    buf[info.dn % buf.length] = d; info.dn++;
    const n = Math.min(info.dn, buf.length);
    let m = Infinity;
    for (let i = 0; i < n; i++) if (buf[i] < m) m = buf[i];
    info.dmin = m;
    const dev = d - m;
    info.jit += (dev - info.jit) * (dev > info.jit ? 0.2 : 0.02);
  },
  // sender-clock time at which this peer is rendered now: an adaptive jitter buffer that
  // slews smoothly (at most ±6% playback speed) instead of jumping when the estimate moves
  renderTime(info, now, dt) {
    if (!info.dn) return null;
    const target = info.dmin + clamp(info.iv * 1.25 + info.jit * 1.3 + 8, 50, 380);
    if (info.pb == null || Math.abs(target - info.pb) > 300) info.pb = target;
    else { const lim = 0.06 * clamp(dt * 1000, 0, 100); info.pb += clamp(target - info.pb, -lim, lim); }
    info.rt = now - info.pb;
    return info.rt;
  },
  pushEvent(type, ...args) {
    this.seq++;
    const ev = [this.seq, type, ...args];
    // HIT carries the victim's life number as I see it: hits on a previous life are dropped
    if (type === EV.HIT && this.lifeOf) ev.push(this.lifeOf(ev[3]) | 0);
    const crit = !!EV_CRIT[type];
    this.events.push({ ev, t: performance.now(), crit, len: utf8Len(JSON.stringify(ev)) + 1 });
    if (this.events.length > NET_CFG.maxEvents) {
      let i = this.events.findIndex((x) => !x.crit);
      this.events.splice(i < 0 ? 0 : i, 1);
    }
    return ev;
  },
  // Elected host (see header). Cached per frame by elect(); includes me.
  elect(now) {
    now = now || performance.now();
    if (!this.game) { this.host = null; return null; }
    let bestC = null, bestR = null;
    const consider = (peer, j, claim, rd) => {
      if (claim > 0 && (!bestC || claim > bestC.claim || (claim === bestC.claim && (j < bestC.j || (j === bestC.j && peer < bestC.peer))))) bestC = { peer, j, claim };
      if (rd && (!bestR || j < bestR.j || (j === bestR.j && peer < bestR.peer))) bestR = { peer, j };
    };
    if (this.myPeer && !this.away) consider(this.myPeer, this.j, this.claim, this.ready);
    for (const info of this.peers.values()) {
      if (!info.valid || info.aw || !info.j) continue;
      const claim = info.g ? Math.max(1, info.g.he | 0) : 0;
      if (now - info.seen > (claim ? NET_CFG.staleHost : NET_CFG.stalePeer)) continue;
      consider(info.peer, info.j, claim, info.rd);
    }
    this.host = bestC ? bestC.peer : bestR ? bestR.peer : null;
    return this.host;
  },
  hostPeer() { return this.game ? (this.host || null) : null; },
  amHost() { if (!this.game) return true; const h = this.host; return h ? h === this.myPeer : this.ready; },
  // freshest match published by anyone, stale or away included (a new host with no mirrored
  // state adopts it instead of starting over, e.g. when the old host froze before we joined)
  bestClaim() {
    let best = null;
    for (const info of this.peers.values()) {
      if (!info.valid || !info.g) continue;
      const he = info.g.he | 0;
      if (!best || he > (best.g.he | 0) || (he === (best.g.he | 0) && info.j < best.j)) best = info;
    }
    return best;
  },
  // some peer is publishing a match (used while settling after a join)
  claimSeen() { for (const info of this.peers.values()) if (info.valid && info.g && !info.aw) return true; return false; },
  othersHere() { if (!this.game) return 0; try { return this.game.peers().filter((p) => !p.sameTab).length; } catch (e) { return this.peers.size; } },
  send(fields, force) {
    if (!this.game) return;
    const now = performance.now();
    if (!force && now < this.nextSend) return;
    this.nextSend = Math.max(this.nextSend + NET_CFG.sendMs, now - 8);
    while (this.events.length && this.events[0].t < now - NET_CFG.critLife) this.events.shift();
    const patch = Object.assign({ v: PROTO, j: this.j, rd: this.ready ? 1 : null, aw: this.away ? 1 : null }, fields);
    patch.e = [];
    const budget = NET_CFG.budget - this.shrink * 400;
    let base = utf8Len(JSON.stringify(patch));
    // too big without events (huge g or many bots): drop bots from the tail
    while (base > budget - 200 && Array.isArray(patch.b) && patch.b.length) { patch.b = patch.b.slice(0, -1); base = utf8Len(JSON.stringify(patch)); }
    // events: all critical ones that fit, newest first, then cosmetic ones still fresh
    let room = budget - base;
    const evs = this.events, pick = this._pick || (this._pick = []);
    pick.length = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = evs.length - 1; i >= 0; i--) {
        const x = evs[i];
        if (pass === 0 ? !x.crit : (x.crit || now - x.t > NET_CFG.cosLife)) continue;
        if (x.len > room) continue;
        room -= x.len; pick.push(x);
      }
    }
    pick.sort((a, b) => a.ev[0] - b.ev[0]);
    for (const x of pick) patch.e.push(x.ev);
    this.lastBytes = budget - room;
    try {
      this.game.presence(patch).then(() => { if (this.shrink && Math.random() < 0.01) this.shrink--; }, (e) => {
        this.sendErr++;
        if (e && e.code === 'invalid_argument') this.shrink = Math.min(4, this.shrink + 1);
        if (this.sendErr < 4) console.warn('presence', e && (e.code || e.message));
      });
    } catch (e) { /* ignore */ }
  },
};

// ---- match state on the wire: same object, team map as [id, team] pairs
function encodeG(g) {
  const o = {};
  for (const k in g) if (k !== 't') o[k] = g[k];
  o.r = Math.round(g.r * 10) / 10;
  if (g.sc) o.sc = [Math.round(g.sc[0] * 10) / 10, Math.round(g.sc[1] * 10) / 10];
  if (g.hz) o.hz = [g.hz[0], g.hz[1], Math.round(g.hz[2] * 10) / 10];
  if (g.fl) o.fl = g.fl.map((f) => [f[0], r2(f[1]), r2(f[2]), r2(f[3]), f[4] || '', Math.round((f[5] || 0) * 10) / 10]);
  const t = [];
  for (const id in g.t) t.push([id, g.t[id]]);
  o.t = t;
  return o;
}
// untrusted g from the host's presence -> fresh, mutable, sanitized object (or null)
function decodeG(w) {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return null;
  const m = w.m;
  if (!Number.isInteger(m) || m < 0 || m >= MODES.length) return null;
  const sc = Array.isArray(w.sc) ? w.sc : [];
  const cfg = w.cfg && typeof w.cfg === 'object' ? w.cfg : {};
  const g = {
    id: netNum(w.id, 0, 1e9, 1), m, ph: w.ph === 1 ? 1 : 0, r: netNum(w.r, -5, 7200, 0),
    sc: [netNum(sc[0], 0, 1e6, 0), netNum(sc[1], 0, 1e6, 0)], t: {}, mp: (typeof w.mp === 'string' && w.mp.length <= 80 ? stripCtl(w.mp, '') : '') || 'borgo',
    st: netNum(w.st, 0, 1e9, 0), cfg: { b: clamp(cfg.b | 0, 0, 16), d: clamp(cfg.d | 0, 0, 2) }, he: clamp(w.he | 0, 0, 1e9),
  };
  if (Array.isArray(w.t)) {
    for (const p of w.t.length > 64 ? w.t.slice(0, 64) : w.t) {
      if (!Array.isArray(p)) continue;
      const id = netId(p[0]), tm = p[1];
      if (id && (tm === 0 || tm === 1 || tm === 2)) g.t[id] = tm;
    }
  }
  const mid = MODES[m].id;
  if (mid === 'hp') {
    const h = Array.isArray(w.hz) ? w.hz : [];
    g.hz = [clamp(h[0] | 0, 0, 63), clamp(h[1] | 0, -1, 2), netNum(h[2], -1, 600, 60)];
  }
  if (mid === 'ctf') {
    const F = Array.isArray(w.fl) ? w.fl : [];
    g.fl = [0, 1].map((i) => {
      const f = Array.isArray(F[i]) ? F[i] : [];
      return [clamp(f[0] | 0, 0, 2), netNum(f[1], -1e4, 1e4, 0), netNum(f[2], -1e4, 1e4, 0), netNum(f[3], -1e4, 1e4, 0), netId(f[4]), netNum(f[5], 0, 120, 0)];
    });
  }
  if (mid === 'inf') g.inf = w.inf ? 1 : 0;
  if (Array.isArray(w.vo)) g.vo = w.vo.slice(0, 3).filter((x) => Number.isInteger(x) && x >= 0 && x < MODES.length);
  if (typeof w.w === 'string') g.w = netStr(w.w, 24);
  if (Array.isArray(w.cap)) g.cap = [netId(w.cap[0]), netNum(w.cap[1], 0, 1e9, 0)];
  return g;
}

// Interpolate a snapshot buffer at sender-clock time `rt` (see Net.renderTime)
const INTERP_DELAY = 110;
function sampleSnaps(snaps, rt, out) {
  if (!snaps.length || rt == null) return null;
  let a = null, b = null;
  for (let i = snaps.length - 1; i >= 0; i--) { if (snaps[i].t <= rt) { a = snaps[i]; b = snaps[i + 1] || null; break; } }
  out = out || {};
  if (!a) { a = snaps[0]; Object.assign(out, a); out.extra = 0; return out; }
  if (b) {
    // respawn / teleport / new life: never slide across the map, switch at b's time
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, dtb = Math.max(1, b.t - a.t);
    const jump = dx * dx + dy * dy + dz * dz > Math.pow(4 + 0.03 * dtb, 2) || ((a.f ^ b.f) & 1) || a.life !== b.life;
    if (jump) { Object.assign(out, a); out.extra = 0; return out; }
  }
  if (!b) {
    // no newer snapshot yet: short extrapolation, then hold
    const ex = (a.f & 1) ? clamp((rt - a.t) / 1000, 0, 0.12) : 0;
    out.x = a.x + a.vx * ex; out.y = a.y + (a.f & 8 ? 0 : a.vy * ex); out.z = a.z + a.vz * ex;
    out.yaw = a.yaw; out.pitch = a.pitch; out.vx = a.vx; out.vy = a.vy; out.vz = a.vz; out.f = a.f; out.w = a.w; out.hp = a.hp; out.life = a.life;
    out.extra = ex;
    return out;
  }
  const k = clamp((rt - a.t) / Math.max(1, b.t - a.t), 0, 1);
  out.x = lerp(a.x, b.x, k); out.y = lerp(a.y, b.y, k); out.z = lerp(a.z, b.z, k);
  out.yaw = lerpAngle(a.yaw, b.yaw, k); out.pitch = lerp(a.pitch, b.pitch, k);
  // velocity estimate for animation (bots don't send it)
  const dtv = Math.max(0.001, (b.t - a.t) / 1000);
  out.vx = (a.vx || b.vx) ? lerp(a.vx, b.vx, k) : (b.x - a.x) / dtv;
  out.vz = (a.vz || b.vz) ? lerp(a.vz, b.vz, k) : (b.z - a.z) / dtv;
  out.vy = lerp(a.vy, b.vy, k);
  out.f = k < 0.5 ? a.f : b.f; out.w = k < 0.5 ? a.w : b.w; out.hp = b.hp; out.life = b.life;
  out.extra = 0;
  return out;
}
