// ===================================================================
// Procedural audio (WebAudio): guns, footsteps, impacts, UI, ambience
// ===================================================================
const SHOT_P = {
  ar: { f: 950, q: 1.1, dec: 0.11, crack: 0.05, th: [165, 48, 0.09], g: 0.85, tail: 0.28 },
  sniper: { f: 620, q: 0.9, dec: 0.22, crack: 0.09, th: [140, 34, 0.18], g: 1.25, tail: 0.75 },
  smg: { f: 1450, q: 1.4, dec: 0.065, crack: 0.03, th: [210, 62, 0.055], g: 0.62, tail: 0.18 },
  lmg: { f: 820, q: 1.0, dec: 0.13, crack: 0.05, th: [135, 40, 0.11], g: 0.95, tail: 0.32 },
  shotgun: { f: 520, q: 0.8, dec: 0.2, crack: 0.04, th: [115, 30, 0.2], g: 1.25, tail: 0.6 },
  revolver: { f: 720, q: 1.0, dec: 0.18, crack: 0.08, th: [150, 38, 0.15], g: 1.1, tail: 0.55 },
  dmr: { f: 760, q: 1.0, dec: 0.16, crack: 0.07, th: [150, 40, 0.13], g: 1.05, tail: 0.45 },
  pistol: { f: 1250, q: 1.3, dec: 0.075, crack: 0.04, th: [220, 70, 0.06], g: 0.65, tail: 0.2 },
};

// stand-in for the filter noiseBurst returns when a voice was skipped (callers automate its frequency)
const NO_FILTER = { frequency: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} } };

const SFX = {
  ctx: null, master: null, wet: null, noise: null, ok: false, amb: null,
  live: 0, dropped: 0, // sounding voices (filter chains still connected) and voices skipped by the budget
  init() {
    if (this.ctx) { this.wake(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
    const c = this.ctx;
    // the browser may suspend or interrupt the context (tab switch, audio device change): resume it at the
    // next input, and every couple of seconds while the page is visible (see updateListener)
    const wake = () => this.wake();
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, wake, { capture: true, passive: true });
    this.master = c.createGain(); this.master.gain.value = SETTINGS.volume;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.18;
    // low-health muffling sits between the mix and the compressor; UI-critical cues (heartbeat) bypass it
    this.muffle = c.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 20000; this.muffle.Q.value = 0.5;
    this.master.connect(this.muffle).connect(comp).connect(c.destination);
    this.comp = comp;
    // reverb (generated impulse: stone courtyard)
    const len = Math.floor(c.sampleRate * 1.8);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / c.sampleRate;
        const early = (t > 0.012 && t < 0.09) ? (Math.random() < 0.004 ? 1 : 0) * 0.8 : 0;
        d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * 0.55 + early * (Math.random() * 2 - 1));
      }
    }
    const conv = c.createConvolver(); conv.buffer = ir;
    this.wet = c.createGain(); this.wet.gain.value = 0.22;
    this.wet.connect(conv).connect(this.master);
    // white noise buffer
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
    this.ok = true;
  },
  setVolume(v) { if (this.master) this.master.gain.value = v; },
  wake() {
    const c = this.ctx;
    if (!c || c.state === 'running' || c.state === 'closed') return;
    try { const p = c.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed yet */ }
  },
  // A voice is one output chain (gain, filters, panner) plus the sources started into it. Once its last
  // source has ended the chain is disconnected: left connected, finished chains (HRTF panners above all)
  // piled up by the hundreds in long fights, overloading the audio thread (dropouts, then lag).
  voice(nodes) {
    const v = { nodes, n: 0 }; this.live++;
    setTimeout(() => { if (v.n <= 0) this.free(v); }, 1500); // a chain nobody played into
    return v;
  },
  hold(out, src) {
    const v = out && out._v;
    if (!v) return;
    v.n++;
    src.onended = () => { if (--v.n <= 0) this.free(v); };
  },
  free(v) {
    if (v.done) return;
    v.done = true; this.live--;
    for (const n of v.nodes) { try { n.disconnect(); } catch (e) { /* already disconnected */ } }
  },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  // output chain; pos = THREE.Vector3 for 3D sounds
  // output chain; pos = THREE.Vector3 for 3D sounds. Returns null when the voice budget is full (the
  // sound is skipped: far-away sounds first, a hard cap for everything 3D)
  out(pos, gain = 1, ref = 8, wet = 1) {
    const c = this.ctx;
    const d = pos && this.listenerPos ? this.listenerPos.distanceTo(pos) : 0;
    if (pos && (this.live > 56 || (this.live > 32 && d > 16) || (this.live > 20 && d > 45))) { this.dropped++; return null; }
    const g = c.createGain(); g.gain.value = gain;
    const nodes = [g];
    if (pos) {
      const p = c.createPanner();
      // HRTF (binaural, costly) only for close sounds while the mix is light; equal-power panning otherwise
      p.panningModel = d < 22 && this.live < 24 ? 'HRTF' : 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = ref; p.maxDistance = 400; p.rolloffFactor = 1.1;
      if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
      // distance muffling
      const lp = c.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.value = clamp(18000 / (1 + d * 0.06), 1200, 18000);
      g.connect(lp).connect(p);
      p.connect(this.master);
      nodes.push(lp, p);
      if (wet > 0) { const ws = c.createGain(); ws.gain.value = wet * clamp(0.3 + d / 60, 0.3, 1.2); p.connect(ws).connect(this.wet); nodes.push(ws); }
    } else {
      g.connect(this.master);
      if (wet > 0) { const ws = c.createGain(); ws.gain.value = wet * 0.6; g.connect(ws).connect(this.wet); nodes.push(ws); }
    }
    g._v = this.voice(nodes);
    return g;
  },
  updateListener(cam) {
    if (!this.ok) return;
    const L = this.ctx.listener;
    const p = cam.getWorldPosition(_v1);
    this.listenerPos = (this.listenerPos || new THREE.Vector3()).copy(p);
    const f = _v2.set(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(_q1));
    const u = _v3.set(0, 1, 0).applyQuaternion(_q1);
    const now = performance.now();
    if (now - (this._wakeT || 0) > 2000) { this._wakeT = now; if (document.visibilityState === 'visible') this.wake(); }
    // plain values: one automation event per parameter per frame (setTargetAtTime) kept the audio thread busy
    if (L.positionX) {
      L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
      L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z;
      L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z;
    } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
  },
  noiseBurst(out, t, dur, type, freq, q, a0 = 1, attack = 0.002, offset) {
    if (!out) return NO_FILTER;
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = this.noise; n.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(a0, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    n.connect(f).connect(g).connect(out);
    n.start(t, offset != null ? offset : Math.random() * 1.5); n.stop(t + dur + 0.05);
    this.hold(out, n);
    return f;
  },
  tone(out, t, dur, f0, f1, type = 'sine', a0 = 0.5, attack = 0.002) {
    if (!out) return;
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(a0, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
    this.hold(out, o);
  },
  shot(w, pos, local) {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    if (w === 'rocket') return this.rocketLaunch(pos);
    if (w === 'knife') return this.swing(pos);
    const p = SHOT_P[w] || SHOT_P.ar;
    const out = this.out(local ? null : pos, p.g * (local ? 0.8 : 1), 14, 1.2);
    this.noiseBurst(out, t, p.dec + p.tail * 0.5, 'bandpass', p.f * (0.95 + Math.random() * 0.1), p.q, 1.0);
    this.noiseBurst(out, t, p.crack, 'highpass', 3200, 0.7, 0.7);
    this.noiseBurst(out, t, p.tail, 'lowpass', 900, 0.5, 0.35, 0.01);
    this.tone(out, t, p.th[2] * 1.6, p.th[0], p.th[1], 'sine', 0.9);
    if (local) this.tone(out, t + 0.002, 0.03, 2600, 1800, 'square', 0.04);
  },
  rocketLaunch(pos) {
    const t = this.ctx.currentTime, out = this.out(pos, 1.0, 10);
    this.noiseBurst(out, t, 0.6, 'bandpass', 600, 0.6, 1.0, 0.01);
    this.noiseBurst(out, t, 0.25, 'lowpass', 300, 0.8, 0.8);
    this.tone(out, t, 0.3, 120, 50, 'sine', 0.8);
  },
  explosion(pos) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, out = this.out(pos, 1.6, 18, 1.5);
    const f = this.noiseBurst(out, t, 1.6, 'lowpass', 2400, 0.6, 1.0, 0.004);
    f.frequency.exponentialRampToValueAtTime(180, t + 1.2);
    this.tone(out, t, 0.9, 85, 26, 'sine', 1.0);
    for (let i = 0; i < 6; i++) this.noiseBurst(out, t + 0.05 + Math.random() * 0.4, 0.06, 'bandpass', 2000 + Math.random() * 2000, 2, 0.3);
  },
  footstep(surf, pos, vol = 1, local = false) {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    const out = this.out(local ? null : pos, (local ? 0.16 : 0.42) * vol, 5, 0.3);
    if (surf === 'wood') { this.noiseBurst(out, t, 0.07, 'bandpass', 650, 1.5, 1); this.tone(out, t, 0.06, 140, 90, 'sine', 0.4); }
    else if (surf === 'metal') { this.noiseBurst(out, t, 0.08, 'bandpass', 2600, 3, 0.8); this.tone(out, t, 0.12, 900, 860, 'triangle', 0.08); }
    else if (surf === 'dirt') this.noiseBurst(out, t, 0.09, 'bandpass', 1100, 0.9, 1);
    else if (surf === 'water') this.noiseBurst(out, t, 0.18, 'bandpass', 1500, 0.7, 1.1, 0.01);
    else { this.noiseBurst(out, t, 0.05, 'bandpass', 2100, 1.4, 1); this.noiseBurst(out, t, 0.04, 'lowpass', 400, 0.7, 0.5); }
  },
  land(pos, vol, local) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, out = this.out(local ? null : pos, 0.4 * vol, 5, 0.4);
    this.noiseBurst(out, t, 0.12, 'lowpass', 500, 0.7, 1); this.tone(out, t, 0.1, 110, 60, 'sine', 0.6);
  },
  jump(local, pos) { if (!this.ok) return; const t = this.ctx.currentTime, out = this.out(local ? null : pos, 0.12, 4, 0.2); this.noiseBurst(out, t, 0.12, 'bandpass', 900, 0.8, 0.8, 0.02); },
  slide(local, pos) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, out = this.out(local ? null : pos, 0.28, 5, 0.3);
    const f = this.noiseBurst(out, t, 0.55, 'bandpass', 2400, 0.8, 0.9, 0.03);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.5);
  },
  swing(pos) { if (!this.ok) return; const t = this.ctx.currentTime, out = this.out(pos, 0.5, 5, 0.3); const f = this.noiseBurst(out, t, 0.18, 'bandpass', 700, 1.2, 0.9, 0.04); f.frequency.exponentialRampToValueAtTime(2800, t + 0.15); },
  stab(pos) { if (!this.ok) return; const t = this.ctx.currentTime, out = this.out(pos, 0.6, 5, 0.3); this.noiseBurst(out, t, 0.08, 'lowpass', 900, 1, 1); this.tone(out, t, 0.08, 180, 90, 'sine', 0.5); },
  mech(kind) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, out = this.out(null, 0.35, 1, 0.2);
    if (kind === 'magout') { this.noiseBurst(out, t, 0.05, 'bandpass', 1800, 2, 0.8); this.tone(out, t, 0.04, 700, 500, 'square', 0.05); }
    else if (kind === 'magin') { this.noiseBurst(out, t, 0.06, 'bandpass', 1300, 2, 1); this.tone(out, t + 0.01, 0.05, 420, 300, 'square', 0.07); }
    else if (kind === 'rack') { this.noiseBurst(out, t, 0.05, 'bandpass', 2600, 3, 0.8); this.noiseBurst(out, t + 0.09, 0.06, 'bandpass', 1900, 3, 0.9); }
    else if (kind === 'shell') { this.noiseBurst(out, t, 0.05, 'bandpass', 1500, 2, 0.7); }
    else if (kind === 'bolt') { this.noiseBurst(out, t, 0.05, 'bandpass', 2200, 3, 0.7); this.noiseBurst(out, t + 0.12, 0.05, 'bandpass', 1700, 3, 0.8); this.noiseBurst(out, t + 0.28, 0.05, 'bandpass', 2400, 3, 0.7); }
    else if (kind === 'pump') { this.noiseBurst(out, t, 0.07, 'bandpass', 1200, 2, 0.9); this.noiseBurst(out, t + 0.16, 0.07, 'bandpass', 1500, 2, 0.9); }
    else if (kind === 'dry') { this.tone(out, t, 0.03, 2400, 2000, 'square', 0.05); }
    else if (kind === 'equip') { this.noiseBurst(out, t, 0.08, 'bandpass', 1600, 1.5, 0.5); }
  },
  // hitmarker: dry, short "tick"; headshots add a metallic ping
  hit(head) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, out = this.out(null, 0.7, 1, 0);
    this.noiseBurst(out, t, 0.022, 'highpass', 3600, 0.8, 0.95, 0.001);
    this.tone(out, t, 0.03, 2400, 1800, 'square', 0.1, 0.001);
    if (head) {
      this.tone(out, t + 0.004, 0.24, 3150, 3120, 'sine', 0.34, 0.002);
      this.tone(out, t + 0.004, 0.17, 4730, 4700, 'sine', 0.15, 0.002);
      this.noiseBurst(out, t, 0.05, 'bandpass', 6000, 3, 0.35, 0.001);
    }
  },
  // kill confirmed: a low thump and a bright two-note ding (higher on headshots)
  kill(head) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, out = this.out(null, 0.62, 1, 0.15);
    this.tone(out, t, 0.18, 150, 50, 'sine', 0.8);
    this.noiseBurst(out, t, 0.06, 'lowpass', 900, 1, 0.5);
    this.tone(out, t + 0.05, 0.12, 1320, 1320, 'triangle', 0.32);
    this.tone(out, t + 0.12, 0.26, head ? 1980 : 1760, head ? 1980 : 1760, 'triangle', 0.3);
  },
  // taking damage: body impact, stronger with the damage, a crack on headshots
  hurt(f = 0.25, head) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, out = this.out(null, 0.5 + f * 0.6, 1, 0.08);
    this.tone(out, t, 0.2, 105, 42, 'sine', 0.95);
    this.noiseBurst(out, t, 0.09, 'lowpass', 520, 1, 0.85);
    this.noiseBurst(out, t + 0.004, 0.035, 'bandpass', 1900, 1.4, 0.3);
    if (head) this.noiseBurst(out, t, 0.05, 'highpass', 3000, 0.8, 0.45, 0.001);
  },
  // level 0..1: muffles the mix and plays a heartbeat while critically wounded
  lowHealth(level) {
    if (!this.ok || !this.muffle) return;
    const c = this.ctx, now = c.currentTime;
    const target = level > 0.01 ? lerp(9000, 1100, level) : 20000;
    if (Math.abs((this._mufT || 20000) - target) > 50) { this._mufT = target; this.muffle.frequency.setTargetAtTime(target, now, 0.2); }
    if (level <= 0.05) return;
    if (this._hbT && now < this._hbT) return;
    const g = c.createGain(); g.gain.value = 0.55 * level; g.connect(this.comp); g._v = this.voice([g]);
    this.tone(g, now + 0.02, 0.13, 64, 40, 'sine', 0.95, 0.004);
    this.tone(g, now + 0.25, 0.15, 58, 38, 'sine', 0.7, 0.004);
    this._hbT = now + lerp(1.05, 0.62, level);
  },
  ui() { if (!this.ok) return; const t = this.ctx.currentTime, out = this.out(null, 0.18, 1, 0); this.tone(out, t, 0.04, 1300, 1100, 'triangle', 0.4); },
  beep(hi) { if (!this.ok) return; const t = this.ctx.currentTime, out = this.out(null, 0.3, 1, 0.1); this.tone(out, t, hi ? 0.35 : 0.14, hi ? 1320 : 880, hi ? 1320 : 880, 'sine', 0.4); },
  objective(good) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, out = this.out(null, 0.4, 1, 0.3);
    const notes = good ? [523, 659, 784, 1046] : [784, 622, 523, 392];
    notes.forEach((f, i) => this.tone(out, t + i * 0.09, 0.25, f, f, 'triangle', 0.35));
  },
  bell(pos) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, out = this.out(pos, 1.4, 40, 1.4);
    const base = 196;
    [[1, 1], [2.0, 0.5], [2.4, 0.4], [3.0, 0.3], [4.2, 0.2], [5.4, 0.12], [0.5, 0.35]].forEach(([m, a]) => this.tone(out, t, 4.5 * (1.1 - m * 0.08), base * m, base * m * 0.998, 'sine', a * 0.5, 0.004));
  },
  startAmbience(fountainPos) {
    if (!this.ok || this.amb) return;
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    const g = c.createGain(); g.gain.value = 0.05;
    n.connect(lp).connect(g).connect(this.master); n.start();
    // fountain water (3D)
    let fw = null;
    if (fountainPos) {
      const n2 = c.createBufferSource(); n2.buffer = this.noise; n2.loop = true; n2.playbackRate.value = 0.8;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.5;
      const out = this.out(fountainPos, 0.22, 3, 0.4);
      if (out) { n2.connect(bp).connect(out); n2.start(); }
      fw = n2;
    }
    this.amb = { n, fw, g };
    const birds = () => {
      if (!this.amb) return;
      const t = c.currentTime;
      const pos = new THREE.Vector3(rnd(-40, 40), rnd(10, 22), rnd(-50, 50));
      const out = this.out(pos, 0.08, 10, 0.5);
      if (!out) { this.ambTimer = setTimeout(birds, rnd(2500, 9000)); return; }
      const f = rnd(2600, 4200);
      const k = rndi(2, 5);
      for (let i = 0; i < k; i++) this.tone(out, t + i * 0.11, 0.08, f, f * rnd(1.1, 1.4), 'sine', 0.3, 0.01);
      this.ambTimer = setTimeout(birds, rnd(2500, 9000));
    };
    this.ambTimer = setTimeout(birds, 3000);
  },
  stopAmbience() {
    if (!this.amb) return;
    try { this.amb.n.stop(); if (this.amb.fw) this.amb.fw.stop(); } catch (e) { /* already stopped */ }
    clearTimeout(this.ambTimer); this.amb = null;
  },
};
