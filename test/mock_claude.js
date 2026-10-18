// Test-only mock of the artifact runtime: room (BroadcastChannel between pages of the same
// browser) + user. Closer to the real platform than a plain relay:
//  - presence is MERGED (null removes a field), measured in UTF-8 bytes of the merged JSON and
//    rejected over 4096 bytes (invalid_argument), sent coalesced ~30 times a second;
//  - delivered presence objects are deep-frozen (the platform freezes peers and presence);
//  - peers get 16-character labels; closing the page leaves every room.
// Network conditions for what THIS page receives, from the URL hash:
//   lat=120   one-way latency (ms)
//   jit=60    extra random delay 0..jit ms; delivery stays in order per sender (TCP-like), so
//             jitter shows up as bursts, never as reordering
//   loss=0.1  probability that a presence update is skipped (the platform coalesces/drops)
//   stall=0.02 probability per message of a 200-600 ms stall of that sender's stream
// Test hooks: window.__mock = { stats, net, drop(ms, timeout), crash(), freeze(ms) }
(function () {
  const q = {};
  for (const kv of location.hash.slice(1).split('&')) { const i = kv.indexOf('='); if (kv) q[i < 0 ? kv : kv.slice(0, i)] = i < 0 ? true : decodeURIComponent(kv.slice(i + 1)); }
  const NET = { lat: +q.lat || 0, jit: +q.jit || 0, loss: +q.loss || 0, stall: +q.stall || 0 };
  const bc = new BroadcastChannel('raffica-mock');
  const me = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'x0000000000000000').slice(0, 16);
  const rooms = new Map();
  const stats = { calls: 0, sent: 0, maxBytes: 0, sumBytes: 0, rejects: 0, keyBad: 0, depthBad: 0, exotic: 0, maxPerSec: 0, recv: 0, dropped: 0, lastBytes: 0, hist: [0, 0, 0, 0, 0] };
  const rate = [];
  let offline = false, crashed = false;
  const enc = new TextEncoder();
  const IDENT = /^[A-Za-z_][A-Za-z0-9_-]*$/;
  function check(v, depth) {
    if (depth > 8) { stats.depthBad++; return; }
    if (typeof v === 'number') { if (!Number.isFinite(v)) stats.exotic++; return; }
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) { for (const x of v) check(x, depth + 1); return; }
      for (const k of Object.keys(v)) { if (!IDENT.test(k)) stats.keyBad++; check(v[k], depth + 1); }
    }
  }
  function deepFreeze(o) { if (o && typeof o === 'object') { for (const k of Object.keys(o)) deepFreeze(o[k]); Object.freeze(o); } return o; }
  const lastAt = new Map();
  function post(m) { if (!offline && !crashed) bc.postMessage(m); }
  function inbound(m) {
    if (m.peer === me || crashed || offline) return;
    if (m.type === 'presence' && NET.loss && Math.random() < NET.loss) { stats.dropped++; return; }
    if (!NET.lat && !NET.jit && !NET.stall) { dispatch(m); return; }
    const now = performance.now();
    let at = now + NET.lat + Math.random() * NET.jit;
    if (NET.stall && Math.random() < NET.stall) at += 200 + Math.random() * 400;
    const prev = lastAt.get(m.peer) || 0;
    if (at < prev) at = prev;
    lastAt.set(m.peer, at);
    setTimeout(() => { if (!crashed && !offline) dispatch(m); }, at - now);
  }
  function dispatch(m) { for (const st of rooms.values()) st.recv(m); }
  function mkRoom(name) {
    const st = { name, peers: new Map(), cbs: [], conn: [], topics: {}, mine: {}, timer: null, left: false };
    st.peers.set(me, { presence: Object.freeze({}), updatedAt: Date.now() });
    let snapCache = null;
    const snap = () => {
      if (snapCache) return snapCache;
      snapCache = Object.freeze(Array.from(st.peers.entries()).map(([p, v]) => Object.freeze({ peer: p, by: 'u_' + p, isMe: p === me, sameTab: p === me, kind: 'viewer', guest: false, presence: v.presence, updatedAt: v.updatedAt })));
      return snapCache;
    };
    let pend = null;
    const deliver = () => {
      pend = null;
      const peers = snap();
      const left = st._left || [];
      st._left = [];
      for (const cb of st.cbs.slice()) { try { cb({ peers, joined: [], left, updated: [] }); } catch (e) { console.error(e); } }
    };
    const changed = () => { snapCache = null; if (!pend) pend = setTimeout(deliver, 16); };
    const flush = () => { st.timer = null; stats.sent++; post({ type: 'presence', room: name, peer: me, presence: st.mine }); };
    st.recv = (m) => {
      if (m.room !== name || m.peer === me || st.left) return;
      stats.recv++;
      if (m.type === 'presence') {
        st.peers.set(m.peer, { presence: deepFreeze(JSON.parse(JSON.stringify(m.presence))), updatedAt: Date.now() });
        changed();
      }
      if (m.type === 'hello') {
        if (!st.peers.has(m.peer)) { st.peers.set(m.peer, { presence: Object.freeze({}), updatedAt: Date.now() }); changed(); }
        post({ type: 'presence', room: name, peer: me, presence: st.mine });
      }
      if (m.type === 'leave') {
        if (st.peers.has(m.peer)) { const p = st.peers.get(m.peer); st.peers.delete(m.peer); st._left = (st._left || []).concat([{ peer: m.peer, presence: p.presence }]); changed(); }
      }
      if (m.type === 'emit') { for (const f of st.topics[m.topic] || []) f({ peer: m.peer, by: 'u_' + m.peer, isMe: false, sameTab: false, kind: 'viewer', guest: false, topic: m.topic, data: m.data }); }
    };
    st.reconnect = () => { for (const f of st.conn) f(true); post({ type: 'hello', room: name, peer: me }); flush(); };
    st.disconnect = () => { for (const f of st.conn) f(false); };
    const api = {
      name,
      presence(patch) {
        stats.calls++;
        const t = performance.now();
        rate.push(t); while (rate.length && rate[0] < t - 1000) rate.shift();
        if (rate.length > stats.maxPerSec) stats.maxPerSec = rate.length;
        if (st.left) return Promise.reject({ code: 'invalid_argument', message: 'room left' });
        const next = Object.assign({}, st.mine);
        for (const [k, v] of Object.entries(patch)) { if (v === null) delete next[k]; else next[k] = v; }
        const json = JSON.stringify(next);
        const bytes = enc.encode(json).length;
        stats.lastBytes = bytes;
        if (bytes > stats.maxBytes) stats.maxBytes = bytes;
        stats.sumBytes += bytes;
        stats.hist[Math.min(4, Math.floor(bytes / 1024))]++;
        if (bytes > 4096) { stats.rejects++; return Promise.reject({ code: 'invalid_argument', message: 'presence over 4 KiB: ' + bytes }); }
        check(next, 1);
        st.mine = JSON.parse(json);
        st.peers.set(me, { presence: deepFreeze(JSON.parse(json)), updatedAt: Date.now() });
        snapCache = null;
        if (!st.timer) st.timer = setTimeout(flush, 33);
        window.__presenceBytes = bytes;
        return Promise.resolve();
      },
      onPeers(fn) { st.cbs.push(fn); setTimeout(() => { const peers = snap(); fn({ peers, joined: peers, left: [], updated: [] }); }, 0); return () => { st.cbs = st.cbs.filter((f) => f !== fn); }; },
      onConnection(fn) { st.conn.push(fn); setTimeout(() => fn(!offline), 0); return () => { st.conn = st.conn.filter((f) => f !== fn); }; },
      peers() { return snap(); },
      connected() { return !offline && !crashed; },
      emit(topic, data) { post({ type: 'emit', room: name, topic, data, peer: me }); return Promise.resolve(); },
      on(topic, fn) { (st.topics[topic] = st.topics[topic] || []).push(fn); return () => {}; },
      leave() { if (!st.left) { st.left = true; post({ type: 'leave', room: name, peer: me }); rooms.delete(name); } return Promise.resolve(); },
    };
    rooms.set(name, st);
    post({ type: 'hello', room: name, peer: me });
    return api;
  }
  bc.onmessage = (e) => inbound(e.data);
  addEventListener('pagehide', () => { for (const st of rooms.values()) post({ type: 'leave', room: st.name, peer: me }); });
  const lobby = mkRoom('__lobby__');
  const named = new Map();
  lobby.join = async (n) => {
    if (q.joinlat) await new Promise((r) => setTimeout(r, +q.joinlat));
    const cur = named.get(n);
    if (cur && rooms.has(n)) return cur;
    const r = mkRoom(n); named.set(n, r); return r;
  };
  const user = {
    async me() { return { id: 'u_' + me, name: 'Tester ' + me.slice(0, 3), color: '#3d8ad8', email: null, isOwner: true, canEdit: true, avatarUrl: '' }; },
    async id() { return 'u_' + me; }, async isOwner() { return true; }, async canEdit() { return true; },
    async profiles(ids) { const o = {}; for (const i of [].concat(ids)) o[i] = { id: i, name: 'Utente', avatarUrl: '', color: '#888', email: null, isMe: i === 'u_' + me, guest: false }; return o; },
  };
  window.claude = { use: async (n) => (n === 'room' ? (q.noroom ? null : lobby) : n === 'user' ? user : null) };
  window.__mockPeer = me;
  window.__mock = {
    stats, net: NET, peer: me,
    // connection drop for `ms`; with timeout=true the others also see us leave (server timeout)
    drop(ms, timeout) {
      offline = true;
      for (const st of rooms.values()) { st.disconnect(); if (timeout) bc.postMessage({ type: 'leave', room: st.name, peer: me }); }
      setTimeout(() => { offline = false; for (const st of rooms.values()) st.reconnect(); }, ms);
    },
    // tab killed/frozen without the platform noticing: nothing in, nothing out
    crash() { crashed = true; },
    // block the main thread (heavy map build, GC pause)
    freeze(ms) { const t = performance.now(); while (performance.now() - t < ms) { /* busy */ } },
  };
})();
