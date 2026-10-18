// ===================================================================
// Player progression kept in this browser: level and XP, three daily
// challenges (the same for everyone on a given day, seeded by the
// date) and lifetime stats for the Statistiche page.
// ===================================================================
const XP = { kill: 100, head: 25, assist: 50, cap: 300, zone: 10, match: 250, win: 500 };
const LEVEL_MAX = 100;
const MODE_CH = new Set(['caps', 'zone', 'infect']);
const CHALLENGES = {
  kills: { w: 3, n: [15, 20, 25], xp: 1500, label: (n) => `Elimina ${n} nemici` },
  head: { w: 2, n: [5, 8, 10], xp: 2000, label: (n) => `Fai ${n} uccisioni con colpo alla testa` },
  air: { w: 2, n: [3, 5], xp: 2500, label: (n) => `Elimina ${n} nemici mentre sei in aria` },
  slide: { w: 2, n: [2, 3], xp: 2500, label: (n) => `Elimina ${n} nemici in scivolata` },
  knife: { w: 2, n: [3, 5], xp: 2000, label: (n) => `Elimina ${n} nemici col coltello` },
  cls: { w: 3, n: [8, 12], xp: 1500, arg: [0, 1, 3, 4, 5, 6, 7, 8], label: (n, a) => `Elimina ${n} nemici giocando da ${CLASSES[a] ? CLASSES[a].name : 'Assalto'}` },
  streak: { w: 2, n: [5, 7], xp: 2000, max: true, label: (n) => `Fai una serie di ${n} uccisioni` },
  matches: { w: 2, n: [2, 3], xp: 1500, label: (n) => `Completa ${n} partite` },
  wins: { w: 2, n: [1, 2], xp: 2500, label: (n) => (n === 1 ? 'Vinci una partita' : `Vinci ${n} partite`) },
  caps: { w: 1, n: [1, 2], xp: 2000, label: (n) => (n === 1 ? 'Cattura una bandiera' : `Cattura ${n} bandiere`) },
  zone: { w: 1, n: [60, 90], xp: 2000, unit: 's', label: (n) => `Tieni l'hardpoint per ${n} secondi` },
  speed: { w: 2, n: [50, 55], xp: 1500, max: true, unit: 'kmh', label: (n) => `Raggiungi i ${n} km/h` },
  dist: { w: 1, n: [2000, 3000], xp: 1000, unit: 'm', label: (n) => `Percorri ${n / 1000} km` },
  assist: { w: 1, n: [3, 5], xp: 1500, label: (n) => `Fai ${n} assist` },
  infect: { w: 1, n: [3, 5], xp: 2000, label: (n) => `Contagia ${n} sopravvissuti in Infetti` },
};
function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fmtN(n) { n = Math.floor(n); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function xpNeed(l) { return 1000 + (l - 1) * 150; }

function genDaily(key) {
  const r = mulberry32(hashStr('raffica-' + key));
  const pool = Object.keys(CHALLENGES);
  const out = [];
  let modeUsed = false;
  while (out.length < 3 && pool.length) {
    const tot = pool.reduce((s, t) => s + CHALLENGES[t].w, 0);
    let x = r() * tot, i = 0;
    for (; i < pool.length - 1; i++) { x -= CHALLENGES[pool[i]].w; if (x <= 0) break; }
    const t = pool.splice(i, 1)[0];
    if (MODE_CH.has(t)) { if (modeUsed) continue; modeUsed = true; }
    const c = CHALLENGES[t];
    const n = c.n[Math.floor(r() * c.n.length)];
    const ch = { t, n, p: 0, d: false };
    if (c.arg) ch.a = c.arg[Math.floor(r() * c.arg.length)];
    out.push(ch);
  }
  return out;
}

const Progress = {
  data: null, dirty: false, match: null,
  load() {
    let d = null;
    try { d = store.get('prog', null); } catch (e) { d = null; }
    this.data = d && typeof d === 'object' ? d : {};
    const D = this.data;
    D.xp = Math.max(0, Math.floor(+D.xp || 0));
    D.st = Object.assign({ k: 0, d: 0, hs: 0, a: 0, m: 0, w: 0, best: 0, top: 0, dist: 0, time: 0, caps: 0, kc: [], sh: 0, hi: 0, zh: 0, zb: 0, zl: 0 }, D.st && typeof D.st === 'object' ? D.st : {});
    if (!Array.isArray(D.st.kc)) D.st.kc = [];
    this.ensureDay();
    setInterval(() => this.flush(), 3000);
    addEventListener('pagehide', () => this.flush(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush(true); });
  },
  ensureDay() {
    const key = dayKey();
    const day = this.data.day;
    if (!day || day.key !== key || !Array.isArray(day.ch)) { this.data.day = { key, ch: genDaily(key) }; this.dirty = true; return true; }
    return false;
  },
  touch() { this.dirty = true; },
  flush(force) { if (this.dirty || force) { this.dirty = false; store.set('prog', this.data); } },
  level(xp) {
    let rem = xp == null ? this.data.xp : xp, l = 1;
    while (l < LEVEL_MAX && rem >= xpNeed(l)) { rem -= xpNeed(l); l++; }
    return { lvl: l, cur: rem, need: xpNeed(l), max: l >= LEVEL_MAX };
  },
  daily() { this.ensureDay(); return this.data.day.ch; },
  label(c) { const d = CHALLENGES[c.t]; return d ? d.label(c.n, c.a) : ''; },
  reward(c) { const d = CHALLENGES[c.t]; return d ? d.xp : 0; },
  progText(c) {
    const d = CHALLENGES[c.t] || {};
    if (d.unit === 'm') return (Math.floor(c.p / 100) / 10).toFixed(1).replace('.', ',') + ' / ' + (c.n / 1000) + ' km';
    if (d.unit === 'kmh') return Math.floor(c.p) + ' / ' + c.n + ' km/h';
    if (d.unit === 's') return Math.floor(c.p) + ' / ' + c.n + ' s';
    return Math.floor(c.p) + ' / ' + c.n;
  },
  timeLeft() {
    const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
    const m = Math.max(1, Math.round((mid - now) / 60000));
    return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  },
  // -------------------------------------------------------------- earning
  addXP(n) {
    n = Math.floor(n);
    if (!(n > 0)) return;
    const before = this.level().lvl;
    this.data.xp += n;
    if (this.match) this.match.xp += n;
    const after = this.level().lvl;
    if (after > before) { if (this.match) this.match.up = after; HUD.levelUp(after); }
    this.touch();
  },
  bump(type, amount, arg, isMax) {
    if (this.ensureDay()) HUD.renderProgress();
    for (const c of this.data.day.ch) {
      if (c.d || c.t !== type) continue;
      if (c.a != null && arg !== c.a) continue;
      const p = isMax ? Math.max(c.p, amount) : c.p + amount;
      if (p === c.p) continue;
      c.p = Math.min(c.n, p);
      this.touch();
      if (c.p >= c.n) {
        c.d = true;
        const xp = this.reward(c);
        if (this.match) this.match.ch.push(this.label(c));
        HUD.challengeDone(this.label(c), xp);
        this.addXP(xp);
      }
    }
  },
  onMatchStart() { this.match = { xp: 0, ch: [], up: 0, start: performance.now(), lvl0: this.level().lvl }; },
  onKill(o) {
    const S = this.data.st;
    S.k++; if (o.head) S.hs++;
    S.best = Math.max(S.best, o.streak | 0);
    if (o.cls != null) S.kc[o.cls] = (S.kc[o.cls] || 0) + 1;
    this.addXP(XP.kill + (o.head ? XP.head : 0));
    this.bump('kills', 1);
    if (o.head) this.bump('head', 1);
    if (o.air) this.bump('air', 1);
    if (o.slide) this.bump('slide', 1);
    if (o.wid === 'knife') this.bump('knife', 1);
    if (o.clsOk) this.bump('cls', 1, o.cls);
    this.bump('streak', o.streak | 0, undefined, true);
    if (o.infected) this.bump('infect', 1);
  },
  // accuracy: one shot per trigger pull, one hit per pull that touched someone (zone = best part hit)
  onShot() { this.data.st.sh = (this.data.st.sh | 0) + 1; this.dirty = true; },
  onHit(zone) { const S = this.data.st; S.hi = (S.hi | 0) + 1; const k = zone === 'head' ? 'zh' : zone === 'legs' ? 'zl' : 'zb'; S[k] = (S[k] | 0) + 1; },
  onAssist() { this.data.st.a++; this.addXP(XP.assist); this.bump('assist', 1); },
  onDeath() { this.data.st.d++; this.touch(); },
  onCapture() { this.data.st.caps++; this.addXP(XP.cap); this.bump('caps', 1); },
  onZone(sec) { this.addXP(XP.zone * sec); this.bump('zone', sec); },
  onMove(dt, hsp) {
    const S = this.data.st;
    if (!(hsp > 0.3) || hsp > 60) return;
    S.dist += hsp * dt;
    if (hsp > S.top) S.top = hsp;
    this.bump('dist', hsp * dt);
    this.bump('speed', Math.floor(hsp * 3.6), undefined, true);
  },
  tick(dt) { this.data.st.time += dt; this.dirty = true; },
  // returns false when the match didn't count (joined at the very end)
  onMatchEnd(won) {
    const m = this.match;
    if (!m || m.ended) return false;
    m.ended = true;
    if ((performance.now() - m.start) / 1000 < 45) { m.skipped = true; return false; }
    const S = this.data.st;
    S.m++;
    this.addXP(XP.match);
    this.bump('matches', 1);
    if (won) { S.w++; this.addXP(XP.win); this.bump('wins', 1); }
    m.won = !!won;
    this.flush(true);
    return true;
  },
  favClass() {
    const kc = this.data.st.kc; let bi = -1, bv = 0;
    for (let i = 0; i < CLASSES.length; i++) if ((kc[i] || 0) > bv) { bv = kc[i]; bi = i; }
    return bi;
  },
};
