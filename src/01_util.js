// ===================================================================
// Utilities
// ===================================================================
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const now = () => performance.now();
const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
function angleDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function lerpAngle(a, b, t) { return a + angleDiff(a, b) * t; }
function rnd(a = 0, b = 1) { return a + Math.random() * (b - a); }
function rndi(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function gauss() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const store = {
  get(k, d) { try { const v = localStorage.getItem('raffica.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('raffica.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};

class Emitter {
  constructor() { this._h = {}; }
  on(ev, fn) { (this._h[ev] || (this._h[ev] = [])).push(fn); return () => this.off(ev, fn); }
  off(ev, fn) { const a = this._h[ev]; if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
  emit(ev, ...args) { const a = this._h[ev]; if (!a) return; for (const fn of a.slice()) { try { fn(...args); } catch (e) { console.error(e); } } }
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function fmtTime(sec) { sec = Math.max(0, Math.ceil(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
function stripCtl(s, rep) {
  let o = '';
  for (const ch of String(s == null ? '' : s)) {
    const c = ch.codePointAt(0);
    if (c < 32 || (c >= 0x7f && c <= 0x9f) || (c >= 0x200b && c <= 0x200f) || (c >= 0x2028 && c <= 0x202e) || (c >= 0x2060 && c <= 0x206f) || c === 0xfeff || (c >= 0xe000 && c <= 0xf8ff)) o += rep;
    else o += ch;
  }
  return o;
}
function sanitizeName(s) { return stripCtl(s, '').trim().slice(0, 16); }
function sanitizeChat(s) { return stripCtl(s, ' ').trim().slice(0, 120); }

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();
const _e1 = new THREE.Euler(0, 0, 0, 'YXZ');
const UP = new THREE.Vector3(0, 1, 0);

// Shared mutable game settings (persisted per viewer)
const SETTINGS = Object.assign({
  sens: 1.0, adsSens: 0.8, fov: 78, volume: 0.8, music: 0.4, quality: 'auto', showFps: false,
  invertY: false, crosshair: 'classic', toggleAds: false, damageNumbers: true, viewBob: true,
  gfx: null, // advanced graphics values when quality === 'custom' (see GFX_PRESETS in 05_render.js)
}, store.get('settings', {}));
function saveSettings() { store.set('settings', SETTINGS); }
