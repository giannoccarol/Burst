// ===================================================================
// Weapons, classes, gun models and first-person viewmodel
// ===================================================================
const WEAPONS = {
  ar: { name: 'Carabina R4', type: 'auto', dmg: 23, head: 1.6, rpm: 620, mag: 30, reload: 1.32, spread: { hip: 0.03, ads: 0.003, move: 0.022, air: 0.06, shot: 0.006, max: 0.09 }, recoil: { p: 0.0115, y: 0.0045 }, adsTime: 0.16, zoom: 1.4, range: [35, 80, 0.7], speed: 1.0, swap: 0.42, kill: 'R4' },
  sniper: { name: 'Falco .308', type: 'bolt', dmg: 100, head: 1.5, rpm: 52, mag: 5, reload: 1.84, spread: { hip: 0.10, ads: 0.0, move: 0.05, air: 0.12, shot: 0, max: 0.2 }, recoil: { p: 0.07, y: 0.012 }, adsTime: 0.13, zoom: 3.8, scope: true, range: [200, 300, 1], speed: 1.0, bolt: 0.85, swap: 0.5, kill: 'Falco' },
  smg: { name: 'Vespa 9', type: 'auto', dmg: 15, head: 1.5, rpm: 880, mag: 32, reload: 1.12, spread: { hip: 0.026, ads: 0.009, move: 0.012, air: 0.04, shot: 0.004, max: 0.07 }, recoil: { p: 0.0075, y: 0.005 }, adsTime: 0.12, zoom: 1.25, range: [14, 40, 0.6], speed: 1.06, swap: 0.35, kill: 'Vespa' },
  lmg: { name: 'Martello', type: 'auto', dmg: 22, head: 1.5, rpm: 640, mag: 80, reload: 2.88, spread: { hip: 0.05, ads: 0.011, move: 0.03, air: 0.08, shot: 0.003, max: 0.1 }, recoil: { p: 0.0105, y: 0.007 }, adsTime: 0.26, zoom: 1.3, range: [35, 80, 0.7], speed: 0.9, swap: 0.6, kill: 'Martello' },
  shotgun: { name: 'Pompa 12', type: 'pump', dmg: 13, pellets: 9, head: 1.3, rpm: 72, mag: 6, reload: 0.38, shells: true, spread: { hip: 0.085, ads: 0.062, move: 0.01, air: 0.02, shot: 0, max: 0.1 }, recoil: { p: 0.055, y: 0.012 }, adsTime: 0.15, zoom: 1.15, range: [7, 22, 0.25], speed: 1.0, swap: 0.45, kill: 'Pompa 12' },
  revolver: { name: 'Magnum .44', type: 'semi', dmg: 48, head: 1.85, rpm: 140, mag: 6, reload: 1.52, spread: { hip: 0.016, ads: 0.0015, move: 0.02, air: 0.06, shot: 0.012, max: 0.06 }, recoil: { p: 0.048, y: 0.006 }, adsTime: 0.15, zoom: 1.3, range: [30, 65, 0.75], speed: 1.05, swap: 0.35, kill: 'Magnum' },
  dmr: { name: 'Sparviero 7.62', type: 'semi', dmg: 38, head: 1.8, rpm: 320, mag: 12, reload: 1.6, spread: { hip: 0.045, ads: 0.0012, move: 0.025, air: 0.08, shot: 0.004, max: 0.08 }, recoil: { p: 0.022, y: 0.004 }, adsTime: 0.16, zoom: 2.4, scope: true, range: [60, 120, 0.85], speed: 1.0, swap: 0.5, kill: 'Sparviero' },
  rocket: { name: 'Lanciarazzi R7', type: 'rocket', dmg: 110, radius: 5.0, rpm: 75, mag: 2, reload: 1.76, projSpeed: 34, spread: { hip: 0.008, ads: 0.0, move: 0.0, air: 0.0, shot: 0, max: 0.01 }, recoil: { p: 0.05, y: 0.004 }, adsTime: 0.2, zoom: 1.25, speed: 0.95, swap: 0.6, selfMult: 0.45, knock: 14, kill: 'Lanciarazzi' },
  pistol: { name: 'P9', type: 'semi', dmg: 21, head: 1.6, rpm: 420, mag: 12, reload: 0.88, spread: { hip: 0.015, ads: 0.004, move: 0.012, air: 0.04, shot: 0.008, max: 0.05 }, recoil: { p: 0.018, y: 0.004 }, adsTime: 0.1, zoom: 1.15, range: [20, 45, 0.7], speed: 1.1, swap: 0.26, kill: 'P9' },
  knife: { name: 'Coltello', type: 'melee', dmg: 55, head: 1.0, rpm: 140, reach: 2.2, speed: 1.12, swap: 0.22, backstab: 100, kill: 'Coltello' },
  // ---- extra roster (loadout screen). `proc`: procedural placeholder model until a GUN_MODELS entry + GLB exist
  ak: { name: 'Steppa 74', cat: 'assault', proc: 'ar', type: 'auto', dmg: 25, head: 1.6, rpm: 600, mag: 30, reload: 1.52, spread: { hip: 0.034, ads: 0.004, move: 0.024, air: 0.065, shot: 0.007, max: 0.1 }, recoil: { p: 0.0135, y: 0.0055 }, adsTime: 0.17, zoom: 1.35, range: [32, 75, 0.7], speed: 1.0, swap: 0.45, kill: 'Steppa' },
  aug: { name: 'Bufera A1', cat: 'assault', proc: 'ar', type: 'auto', dmg: 22, head: 1.6, rpm: 680, mag: 30, reload: 1.6, spread: { hip: 0.032, ads: 0.0025, move: 0.022, air: 0.06, shot: 0.005, max: 0.085 }, recoil: { p: 0.0105, y: 0.004 }, adsTime: 0.19, zoom: 1.7, range: [38, 85, 0.72], speed: 0.98, swap: 0.45, kill: 'Bufera' },
  fal: { name: 'Valanga 7.62', cat: 'assault', proc: 'ar', type: 'semi', dmg: 36, head: 1.7, rpm: 400, mag: 20, reload: 1.68, spread: { hip: 0.04, ads: 0.002, move: 0.026, air: 0.07, shot: 0.008, max: 0.09 }, recoil: { p: 0.026, y: 0.006 }, adsTime: 0.19, zoom: 1.5, range: [45, 100, 0.78], speed: 0.97, swap: 0.5, kill: 'Valanga' },
  bullpup: { name: 'Grillo S', cat: 'assault', proc: 'ar', type: 'auto', dmg: 20, head: 1.55, rpm: 760, mag: 30, reload: 1.44, spread: { hip: 0.03, ads: 0.004, move: 0.02, air: 0.055, shot: 0.005, max: 0.085 }, recoil: { p: 0.0095, y: 0.0045 }, adsTime: 0.15, zoom: 1.4, range: [30, 70, 0.68], speed: 1.02, swap: 0.4, kill: 'Grillo' },
  mp5: { name: 'Calabrone 9', cat: 'smg', proc: 'smg', type: 'auto', dmg: 16, head: 1.5, rpm: 800, mag: 30, reload: 1.2, spread: { hip: 0.024, ads: 0.007, move: 0.012, air: 0.04, shot: 0.004, max: 0.065 }, recoil: { p: 0.007, y: 0.0045 }, adsTime: 0.12, zoom: 1.25, range: [15, 42, 0.6], speed: 1.06, swap: 0.35, kill: 'Calabrone' },
  p90: { name: 'Ronzio 57', cat: 'smg', proc: 'smg', type: 'auto', dmg: 14, head: 1.5, rpm: 900, mag: 50, reload: 1.68, spread: { hip: 0.026, ads: 0.008, move: 0.012, air: 0.04, shot: 0.0035, max: 0.07 }, recoil: { p: 0.0065, y: 0.0045 }, adsTime: 0.13, zoom: 1.3, range: [15, 40, 0.6], speed: 1.05, swap: 0.38, kill: 'Ronzio' },
  mac10: { name: 'Zanzara', cat: 'smg', proc: 'smg', type: 'auto', dmg: 13, head: 1.45, rpm: 1050, mag: 30, reload: 1.04, spread: { hip: 0.03, ads: 0.014, move: 0.012, air: 0.04, shot: 0.005, max: 0.08 }, recoil: { p: 0.0075, y: 0.0065 }, adsTime: 0.1, zoom: 1.15, range: [10, 30, 0.55], speed: 1.1, swap: 0.3, kill: 'Zanzara' },
  pkm: { name: 'Incudine', cat: 'lmg', proc: 'lmg', type: 'auto', dmg: 26, head: 1.5, rpm: 600, mag: 100, reload: 3.2, spread: { hip: 0.055, ads: 0.012, move: 0.032, air: 0.08, shot: 0.0035, max: 0.11 }, recoil: { p: 0.0125, y: 0.0075 }, adsTime: 0.28, zoom: 1.3, range: [40, 90, 0.72], speed: 0.87, swap: 0.65, kill: 'Incudine' },
  lewis: { name: 'Tamburo', cat: 'lmg', proc: 'lmg', type: 'auto', dmg: 28, head: 1.5, rpm: 500, mag: 47, reload: 2.56, spread: { hip: 0.05, ads: 0.01, move: 0.03, air: 0.08, shot: 0.003, max: 0.1 }, recoil: { p: 0.0115, y: 0.006 }, adsTime: 0.26, zoom: 1.3, range: [40, 90, 0.72], speed: 0.9, swap: 0.6, kill: 'Tamburo' },
  dbarrel: { name: 'Lupara', cat: 'shotgun', proc: 'shotgun', type: 'semi', dmg: 14, pellets: 10, head: 1.3, rpm: 240, mag: 2, reload: 1.6, spread: { hip: 0.09, ads: 0.07, move: 0.01, air: 0.02, shot: 0, max: 0.1 }, recoil: { p: 0.06, y: 0.014 }, adsTime: 0.14, zoom: 1.12, range: [7, 20, 0.25], speed: 1.03, swap: 0.4, kill: 'Lupara' },
  autosg: { name: 'Tempesta 12', cat: 'shotgun', proc: 'shotgun', type: 'semi', dmg: 11, pellets: 8, head: 1.3, rpm: 220, mag: 7, reload: 0.36, shells: true, spread: { hip: 0.08, ads: 0.06, move: 0.01, air: 0.02, shot: 0.006, max: 0.1 }, recoil: { p: 0.04, y: 0.01 }, adsTime: 0.15, zoom: 1.15, range: [8, 24, 0.25], speed: 0.99, swap: 0.45, kill: 'Tempesta' },
  barrett: { name: 'Aquila .50', cat: 'sniper', proc: 'sniper', type: 'bolt', dmg: 130, head: 1.5, rpm: 40, mag: 5, reload: 2.4, spread: { hip: 0.12, ads: 0.0, move: 0.06, air: 0.14, shot: 0, max: 0.22 }, recoil: { p: 0.09, y: 0.015 }, adsTime: 0.16, zoom: 4.5, scope: true, range: [250, 350, 1], speed: 0.9, bolt: 1.0, swap: 0.6, kill: 'Aquila' },
  kar98: { name: 'Gufo 98', cat: 'sniper', proc: 'sniper', type: 'bolt', dmg: 100, head: 1.6, rpm: 50, mag: 5, reload: 1.92, spread: { hip: 0.09, ads: 0.0, move: 0.05, air: 0.12, shot: 0, max: 0.2 }, recoil: { p: 0.065, y: 0.012 }, adsTime: 0.13, zoom: 3.4, scope: true, range: [180, 280, 1], speed: 1.0, bolt: 0.9, swap: 0.5, kill: 'Gufo' },
  svd: { name: 'Nibbio 40', cat: 'marksman', proc: 'dmr', type: 'semi', dmg: 40, head: 1.8, rpm: 280, mag: 10, reload: 1.68, spread: { hip: 0.05, ads: 0.0012, move: 0.026, air: 0.08, shot: 0.005, max: 0.085 }, recoil: { p: 0.025, y: 0.005 }, adsTime: 0.16, zoom: 2.6, scope: true, range: [60, 120, 0.85], speed: 0.99, swap: 0.5, kill: 'Nibbio' },
  m14: { name: 'Astore 47', cat: 'marksman', proc: 'dmr', type: 'semi', dmg: 36, head: 1.8, rpm: 330, mag: 10, reload: 1.52, spread: { hip: 0.045, ads: 0.0015, move: 0.025, air: 0.08, shot: 0.0045, max: 0.08 }, recoil: { p: 0.021, y: 0.004 }, adsTime: 0.16, zoom: 2.0, scope: true, range: [55, 115, 0.85], speed: 1.0, swap: 0.5, kill: 'Astore' },
  m1911: { name: 'Mastino .45', cat: 'pistol', proc: 'pistol', type: 'semi', dmg: 28, head: 1.6, rpm: 360, mag: 7, reload: 0.96, spread: { hip: 0.017, ads: 0.004, move: 0.013, air: 0.04, shot: 0.01, max: 0.055 }, recoil: { p: 0.024, y: 0.005 }, adsTime: 0.1, zoom: 1.15, range: [20, 45, 0.7], speed: 1.1, swap: 0.26, kill: 'Mastino' },
  glock: { name: 'Volpe 17', cat: 'pistol', proc: 'pistol', type: 'semi', dmg: 19, head: 1.6, rpm: 480, mag: 17, reload: 0.88, spread: { hip: 0.015, ads: 0.004, move: 0.012, air: 0.04, shot: 0.007, max: 0.05 }, recoil: { p: 0.016, y: 0.004 }, adsTime: 0.1, zoom: 1.15, range: [20, 45, 0.7], speed: 1.1, swap: 0.25, kill: 'Volpe' },
  deagle: { name: 'Toro .50', cat: 'pistol', proc: 'revolver', type: 'semi', dmg: 45, head: 1.8, rpm: 180, mag: 7, reload: 1.28, spread: { hip: 0.02, ads: 0.002, move: 0.02, air: 0.06, shot: 0.014, max: 0.065 }, recoil: { p: 0.05, y: 0.007 }, adsTime: 0.14, zoom: 1.25, range: [28, 60, 0.72], speed: 1.05, swap: 0.33, kill: 'Toro' },
  law: { name: 'Tubo 72', cat: 'launcher', proc: 'rocket', type: 'rocket', dmg: 120, radius: 5.0, rpm: 60, mag: 1, reload: 2.08, projSpeed: 38, spread: { hip: 0.008, ads: 0.0, move: 0.0, air: 0.0, shot: 0, max: 0.01 }, recoil: { p: 0.05, y: 0.004 }, adsTime: 0.2, zoom: 1.3, speed: 0.97, swap: 0.55, selfMult: 0.45, knock: 14, kill: 'Tubo 72' },
  m79: { name: 'Mortaretto', cat: 'launcher', proc: 'rocket', type: 'rocket', dmg: 95, radius: 4.0, rpm: 60, mag: 1, reload: 1.44, projSpeed: 26, spread: { hip: 0.01, ads: 0.0, move: 0.0, air: 0.0, shot: 0, max: 0.015 }, recoil: { p: 0.04, y: 0.004 }, adsTime: 0.18, zoom: 1.2, speed: 1.0, swap: 0.45, selfMult: 0.4, knock: 12, kill: 'Mortaretto' },
  xbow: { name: 'Balestra', cat: 'launcher', proc: 'rocket', type: 'rocket', dmg: 90, radius: 1.2, rpm: 50, mag: 1, reload: 1.36, projSpeed: 46, spread: { hip: 0.012, ads: 0.0, move: 0.0, air: 0.0, shot: 0, max: 0.015 }, recoil: { p: 0.02, y: 0.003 }, adsTime: 0.18, zoom: 1.5, speed: 1.02, swap: 0.45, selfMult: 0.2, knock: 4, kill: 'Balestra' },
  axe: { name: 'Accetta', cat: 'melee', proc: 'knife', type: 'melee', dmg: 70, head: 1.0, rpm: 100, reach: 2.3, speed: 1.05, swap: 0.3, backstab: 100, kill: 'Accetta' },
  pitchfork: { name: 'Forcone', cat: 'melee', proc: 'knife', type: 'melee', dmg: 60, head: 1.0, rpm: 90, reach: 2.8, speed: 1.0, swap: 0.35, backstab: 100, kill: 'Forcone' },
  pan: { name: 'Padella', cat: 'melee', proc: 'knife', type: 'melee', dmg: 50, head: 1.0, rpm: 120, reach: 2.0, speed: 1.1, swap: 0.25, backstab: 100, kill: 'Padella' },
};
// category of the original ten (the extra roster declares its own `cat`)
for (const [id, c] of Object.entries({ ar: 'assault', smg: 'smg', lmg: 'lmg', shotgun: 'shotgun', sniper: 'sniper', dmr: 'marksman', pistol: 'pistol', revolver: 'pistol', rocket: 'launcher', knife: 'melee' })) WEAPONS[id].cat = c;
// procedural model used for a weapon id (extra weapons borrow the closest original one)
const procId = (id) => (WEAPONS[id] && WEAPONS[id].proc) || id;
const WEAPON_IDS = Object.keys(WEAPONS);
const WIDX = Object.fromEntries(WEAPON_IDS.map((k, i) => [k, i]));

const CLASSES = [
  { id: 'assalto', name: 'Assalto', hp: 100, speed: 1.0, primary: 'ar', secondary: 'pistol', desc: 'Carabina automatica, buona a ogni distanza.' },
  { id: 'cecchino', name: 'Cecchino', hp: 90, speed: 1.03, primary: 'sniper', secondary: 'pistol', desc: 'Fucile a otturatore con ottica 4x. Un colpo, un abbattimento.' },
  { id: 'incursore', name: 'Incursore', hp: 100, speed: 1.22, primary: 'knife', secondary: null, desc: 'Solo coltello, ma è il più veloce del borgo.' },
  { id: 'mitragliere', name: 'Mitragliere', hp: 160, speed: 0.88, primary: 'lmg', secondary: 'pistol', desc: 'Più salute e un nastro da 80 colpi. Lento.' },
  { id: 'ombra', name: 'Ombra', hp: 100, speed: 1.08, primary: 'smg', secondary: 'pistol', desc: 'Mitraglietta rapidissima per il corpo a corpo.' },
  { id: 'pistolero', name: 'Pistolero', hp: 100, speed: 1.05, primary: 'revolver', secondary: null, desc: 'Revolver .44: due colpi in testa e basta.' },
  { id: 'tiratore', name: 'Tiratore', hp: 90, speed: 1.0, primary: 'dmr', secondary: 'pistol', desc: 'Semiautomatico preciso con ottica 2x.' },
  { id: 'artificiere', name: 'Artificiere', hp: 130, speed: 0.95, primary: 'rocket', secondary: 'pistol', desc: 'Razzi ad area. Il rocket jump è incluso.' },
  { id: 'guardiano', name: 'Guardiano', hp: 120, speed: 0.98, primary: 'shotgun', secondary: 'pistol', desc: 'Fucile a pompa: devastante da vicino.' },
];
const GUNGAME_LIST = ['ar', 'smg', 'lmg', 'shotgun', 'dmr', 'revolver', 'sniper', 'rocket', 'pistol', 'knife'];

// ---------------------------------------------------------------------
const GUNMAT = {};
function makeGunMaterials() {
  const nm = TexGen.cache.metal ? TexGen.cache.metal.normal : null;
  const S = (o) => new THREE.MeshStandardMaterial(o);
  GUNMAT.metal = S({ color: 0x2b2d30, metalness: 0.85, roughness: 0.38, normalMap: nm, normalScale: new THREE.Vector2(0.25, 0.25) });
  GUNMAT.metalLight = S({ color: 0x6a6d70, metalness: 0.9, roughness: 0.3, normalMap: nm, normalScale: new THREE.Vector2(0.2, 0.2) });
  GUNMAT.polymer = S({ color: 0x1e1f21, metalness: 0.05, roughness: 0.62 });
  GUNMAT.tan = S({ color: 0x9a8465, metalness: 0.05, roughness: 0.66 });
  GUNMAT.olive = S({ color: 0x4c5435, metalness: 0.25, roughness: 0.55, normalMap: nm, normalScale: new THREE.Vector2(0.4, 0.4) });
  GUNMAT.wood = new THREE.MeshStandardMaterial({ map: MAT.wood.map, normalMap: MAT.wood.normalMap, roughnessMap: MAT.wood.roughnessMap, roughness: 0.9, metalness: 0, color: 0xa0704a });
  GUNMAT.brass = S({ color: 0xc89b52, metalness: 1, roughness: 0.25 });
  GUNMAT.chrome = S({ color: 0xcfcfcf, metalness: 1, roughness: 0.15 });
  GUNMAT.blade = S({ color: 0xb8bcc0, metalness: 1, roughness: 0.18 });
  GUNMAT.lens = new THREE.MeshPhysicalMaterial({ color: 0x0c1a24, metalness: 0, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55 });
  GUNMAT.dot = new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false });
  GUNMAT.glove = S({ color: 0x2b2824, metalness: 0, roughness: 0.82 });
  GUNMAT.sleeve = new THREE.MeshStandardMaterial({ map: TexGen.cache.fabric ? TexGen.cache.fabric.map : null, color: 0x6a6650, roughness: 0.9, metalness: 0 });
  GUNMAT.warhead = S({ color: 0x5a5e44, metalness: 0.4, roughness: 0.5 });
}

const GB = {
  rb: (w, h, d, r = 0.004) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)),
  cyl: (r1, r2, len, seg = 14) => { const g = new THREE.CylinderGeometry(r1, r2, len, seg); g.rotateX(Math.PI / 2); return g; },
  add(p, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); p.add(m); return m; },
};

function gunModel(id) {
  id = procId(id);
  const g = new THREE.Group(), M = GUNMAT, { rb, cyl, add } = GB;
  const out = { root: g, muzzle: new THREE.Object3D(), eject: new THREE.Object3D(), mag: null, parts: {}, sight: { y: 0.1, z: 0 }, grip: [0, -0.03, 0.05], fore: [0, 0.04, -0.28], eye: 0.12 };
  g.add(out.muzzle, out.eject);
  const magGroup = (x, y, z) => { const mg = new THREE.Group(); mg.position.set(x, y, z); g.add(mg); out.mag = mg; out.magHome = mg.position.clone(); return mg; };
  if (id === 'ar' || id === 'dmr') {
    const dm = id === 'dmr';
    add(g, rb(0.036, 0.052, 0.24, 0.006), M.metal, 0, 0.028, -0.02);
    add(g, rb(0.034, 0.038, 0.27, 0.005), M.metal, 0, 0.072, -0.045);
    add(g, rb(0.046, 0.05, dm ? 0.3 : 0.25, 0.008), dm ? M.tan : M.polymer, 0, 0.068, dm ? -0.33 : -0.3);
    for (let i = 0; i < 11; i++) add(g, rb(0.022, 0.006, 0.012, 0.001), M.metal, 0, 0.094, -0.15 - i * 0.025);
    const bl = dm ? 0.34 : 0.2;
    add(g, cyl(0.0085, 0.0085, bl), M.metal, 0, 0.068, -(dm ? 0.48 : 0.42) - bl / 2 + 0.02);
    const mz = dm ? -0.83 : -0.64;
    add(g, cyl(0.014, 0.012, 0.06), M.metal, 0, 0.068, mz);
    out.muzzle.position.set(0, 0.068, mz - 0.04);
    add(g, rb(0.034, 0.014, 0.02, 0.003), M.metal, 0, 0.082, dm ? -0.47 : -0.415);
    if (!dm) {
      // holographic sight
      add(g, rb(0.036, 0.012, 0.075, 0.003), M.polymer, 0, 0.097, -0.075);
      add(g, rb(0.004, 0.042, 0.072, 0.001), M.polymer, 0.017, 0.124, -0.075);
      add(g, rb(0.004, 0.042, 0.072, 0.001), M.polymer, -0.017, 0.124, -0.075);
      add(g, rb(0.038, 0.004, 0.072, 0.001), M.polymer, 0, 0.146, -0.075);
      add(g, new THREE.PlaneGeometry(0.03, 0.036), M.lens, 0, 0.124, -0.108);
      add(g, new THREE.CircleGeometry(0.0011, 10), M.dot, 0, 0.124, -0.107);
      add(g, rb(0.008, 0.04, 0.012, 0.002), M.metal, 0, 0.1, -0.43);
      out.sight = { y: 0.124, z: -0.04 }; out.eye = 0.13;
    } else {
      // 2x prism optic
      add(g, rb(0.036, 0.012, 0.09, 0.003), M.metal, 0, 0.097, -0.07);
      add(g, rb(0.04, 0.042, 0.12, 0.008), M.tan, 0, 0.125, -0.07);
      add(g, cyl(0.02, 0.02, 0.012), M.polymer, 0, 0.127, -0.135);
      add(g, cyl(0.016, 0.016, 0.012), M.polymer, 0, 0.127, -0.005);
      add(g, new THREE.CircleGeometry(0.017, 20), M.lens, 0, 0.127, 0.002);
      add(g, new THREE.CircleGeometry(0.0013, 8), M.dot, 0, 0.127, 0.0025);
      out.sight = { y: 0.127, z: 0.0 }; out.eye = 0.09;
      // bipod folded
      add(g, cyl(0.004, 0.004, 0.16), M.metal, 0.012, 0.035, -0.47);
      add(g, cyl(0.004, 0.004, 0.16), M.metal, -0.012, 0.035, -0.47);
    }
    add(g, cyl(0.013, 0.013, 0.14), M.metal, 0, 0.058, 0.15);
    add(g, rb(0.04, 0.07, 0.16, 0.01), dm ? M.tan : M.polymer, 0, 0.045, 0.245);
    add(g, rb(0.043, 0.082, 0.02, 0.006), M.polymer, 0, 0.042, 0.33);
    add(g, rb(0.03, 0.095, 0.038, 0.008), M.polymer, 0, -0.03, 0.05, 0.28);
    add(g, rb(0.006, 0.006, 0.065, 0.002), M.metal, 0, -0.012, -0.005);
    add(g, rb(0.004, 0.022, 0.006, 0.001), M.metal, 0, 0.0, -0.01);
    add(g, rb(0.03, 0.008, 0.02, 0.002), M.metal, 0, 0.09, 0.075);
    add(g, rb(0.003, 0.02, 0.05, 0.001), M.polymer, 0.018, 0.07, -0.03);
    const mg = magGroup(0, 0.005, -0.085);
    add(mg, rb(0.024, dm ? 0.09 : 0.125, 0.062, 0.005), dm ? M.polymer : M.metal, 0, dm ? -0.04 : -0.055, 0, dm ? 0 : -0.16);
    out.eject.position.set(0.02, 0.074, -0.03);
    out.grip = [0, -0.028, 0.055]; out.fore = [0, 0.042, dm ? -0.36 : -0.3];
  } else if (id === 'smg') {
    add(g, rb(0.042, 0.07, 0.3, 0.01), M.polymer, 0, 0.05, -0.1);
    add(g, rb(0.036, 0.02, 0.22, 0.004), M.metal, 0, 0.093, -0.1);
    add(g, cyl(0.009, 0.009, 0.08), M.metal, 0, 0.06, -0.29);
    add(g, cyl(0.016, 0.016, 0.07), M.metal, 0, 0.06, -0.33);
    out.muzzle.position.set(0, 0.06, -0.37);
    add(g, rb(0.03, 0.1, 0.036, 0.008), M.polymer, 0, -0.035, 0.045, 0.22);
    add(g, rb(0.028, 0.09, 0.032, 0.008), M.polymer, 0, -0.025, -0.22, 0.05);
    // compact red dot
    add(g, rb(0.026, 0.026, 0.05, 0.006), M.polymer, 0, 0.115, -0.06);
    add(g, new THREE.PlaneGeometry(0.02, 0.018), M.lens, 0, 0.12, -0.0855);
    add(g, new THREE.CircleGeometry(0.0011, 10), M.dot, 0, 0.12, -0.085);
    out.sight = { y: 0.12, z: -0.035 }; out.eye = 0.13;
    // folding wire stock
    add(g, rb(0.006, 0.006, 0.18, 0.002), M.metal, 0.018, 0.06, 0.13);
    add(g, rb(0.006, 0.006, 0.18, 0.002), M.metal, -0.018, 0.06, 0.13);
    add(g, rb(0.04, 0.06, 0.012, 0.004), M.polymer, 0, 0.05, 0.22);
    const mg = magGroup(0, 0.0, -0.11);
    add(mg, rb(0.022, 0.15, 0.034, 0.004), M.metal, 0, -0.07, 0, -0.05);
    out.eject.position.set(0.022, 0.07, -0.08);
    out.grip = [0, -0.03, 0.05]; out.fore = [0, -0.02, -0.22];
  } else if (id === 'lmg') {
    add(g, rb(0.06, 0.09, 0.36, 0.01), M.metal, 0, 0.05, -0.05);
    add(g, rb(0.064, 0.03, 0.2, 0.006), M.metal, 0, 0.108, -0.02);
    add(g, rb(0.05, 0.05, 0.28, 0.01), M.polymer, 0, 0.055, -0.34);
    for (let i = 0; i < 8; i++) add(g, rb(0.052, 0.008, 0.012, 0.002), M.metal, 0, 0.083, -0.23 - i * 0.03);
    add(g, cyl(0.012, 0.011, 0.42), M.metal, 0, 0.055, -0.62);
    add(g, cyl(0.018, 0.015, 0.07), M.metal, 0, 0.055, -0.84);
    out.muzzle.position.set(0, 0.055, -0.88);
    add(g, rb(0.006, 0.05, 0.012, 0.002), M.metal, 0, 0.09, -0.8);
    add(g, rb(0.026, 0.03, 0.03, 0.004), M.metal, 0, 0.135, 0.06);
    add(g, rb(0.004, 0.012, 0.004, 0.001), M.metal, 0, 0.155, 0.06);
    out.sight = { y: 0.155, z: 0.06 }; out.eye = 0.2;
    add(g, rb(0.05, 0.08, 0.22, 0.012), M.polymer, 0, 0.04, 0.24);
    add(g, rb(0.032, 0.1, 0.04, 0.008), M.polymer, 0, -0.04, 0.07, 0.25);
    add(g, cyl(0.005, 0.005, 0.2), M.metal, 0.015, 0.02, -0.5);
    add(g, cyl(0.005, 0.005, 0.2), M.metal, -0.015, 0.02, -0.5);
    add(g, rb(0.012, 0.012, 0.12, 0.003), M.metal, 0, 0.14, -0.1);
    const mg = magGroup(0.0, -0.03, -0.06);
    add(mg, rb(0.075, 0.09, 0.11, 0.008), M.olive, 0, -0.04, 0);
    for (let i = 0; i < 5; i++) add(mg, cyl(0.004, 0.004, 0.012), M.brass, 0.045, 0.02 - i * 0.003, 0.03 - i * 0.012, 0, Math.PI / 2, 0);
    out.eject.position.set(0.035, 0.06, -0.02);
    out.grip = [0, -0.035, 0.07]; out.fore = [0, 0.02, -0.36];
  } else if (id === 'shotgun') {
    add(g, rb(0.042, 0.065, 0.22, 0.008), M.metal, 0, 0.045, -0.04);
    add(g, cyl(0.012, 0.012, 0.55), M.metal, 0, 0.075, -0.42);
    add(g, cyl(0.011, 0.011, 0.44), M.metal, 0, 0.045, -0.37);
    add(g, new THREE.SphereGeometry(0.004, 8, 6), M.brass, 0, 0.09, -0.68);
    out.muzzle.position.set(0, 0.075, -0.71);
    const pump = new THREE.Group(); pump.position.set(0, 0.045, -0.35); g.add(pump);
    add(pump, rb(0.04, 0.042, 0.16, 0.012), GUNMAT.wood, 0, 0, 0);
    for (let i = 0; i < 6; i++) add(pump, rb(0.042, 0.003, 0.006, 0.001), M.polymer, 0, -0.005 + (i % 2) * 0.01, -0.05 + i * 0.02);
    out.parts.pump = pump; out.parts.pumpHome = pump.position.z;
    add(g, rb(0.036, 0.075, 0.3, 0.015), GUNMAT.wood, 0, 0.02, 0.22, -0.12);
    add(g, rb(0.038, 0.09, 0.02, 0.008), M.polymer, 0, 0.0, 0.37, -0.12);
    add(g, rb(0.03, 0.06, 0.04, 0.008), GUNMAT.wood, 0, -0.02, 0.06, 0.4);
    add(g, rb(0.006, 0.006, 0.06, 0.002), M.metal, 0, -0.01, -0.0);
    out.sight = { y: 0.094, z: 0.02 }; out.eye = 0.22;
    out.eject.position.set(0.024, 0.06, -0.04);
    out.grip = [0, -0.02, 0.06]; out.fore = [0, 0.02, -0.35];
  } else if (id === 'revolver' || id === 'pistol') {
    if (id === 'revolver') {
      add(g, rb(0.032, 0.05, 0.11, 0.008), M.metalLight, 0, 0.055, -0.03);
      add(g, cyl(0.01, 0.01, 0.17), M.metalLight, 0, 0.065, -0.17);
      add(g, rb(0.012, 0.014, 0.17, 0.003), M.metalLight, 0, 0.08, -0.17);
      add(g, rb(0.004, 0.012, 0.012, 0.001), M.metalLight, 0, 0.093, -0.245);
      const cyl6 = new THREE.Group(); cyl6.position.set(0, 0.055, -0.045); g.add(cyl6);
      add(cyl6, cyl(0.022, 0.022, 0.05, 18), M.metalLight, 0, 0, 0);
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; add(cyl6, cyl(0.004, 0.004, 0.051, 6), M.metal, Math.cos(a) * 0.019, Math.sin(a) * 0.019, 0); }
      out.parts.cyl = cyl6;
      add(g, rb(0.03, 0.09, 0.04, 0.012), GUNMAT.wood, 0, -0.012, 0.035, 0.32);
      add(g, rb(0.006, 0.02, 0.012, 0.002), M.metal, 0, 0.085, 0.025, -0.4);
      out.muzzle.position.set(0, 0.065, -0.26);
      out.sight = { y: 0.098, z: 0.03 }; out.eye = 0.3;
      out.grip = [0, -0.02, 0.04];
    } else {
      const slide = new THREE.Group(); g.add(slide);
      add(slide, rb(0.026, 0.034, 0.18, 0.004), M.metal, 0, 0.065, -0.07);
      add(slide, rb(0.004, 0.008, 0.008, 0.001), M.metal, 0, 0.085, -0.155);
      add(slide, rb(0.018, 0.008, 0.01, 0.001), M.metal, 0, 0.085, 0.01);
      for (let i = 0; i < 6; i++) add(slide, rb(0.027, 0.03, 0.002, 0.0005), M.polymer, 0, 0.065, 0.0 - i * 0.006);
      out.parts.slide = slide;
      add(g, rb(0.024, 0.024, 0.15, 0.005), M.polymer, 0, 0.038, -0.07);
      add(g, rb(0.028, 0.1, 0.045, 0.01), M.polymer, 0, -0.015, 0.02, 0.28);
      add(g, rb(0.005, 0.005, 0.05, 0.002), M.polymer, 0, 0.012, -0.045);
      const mg = magGroup(0, -0.015, 0.02);
      add(mg, rb(0.02, 0.012, 0.036, 0.003), M.polymer, 0, -0.06, 0.012, 0.28);
      out.muzzle.position.set(0, 0.065, -0.17);
      out.sight = { y: 0.091, z: 0.01 }; out.eye = 0.3;
      out.grip = [0, -0.02, 0.03];
      out.eject.position.set(0.016, 0.075, -0.04);
    }
    out.fore = null;
  } else if (id === 'sniper') {
    add(g, rb(0.042, 0.06, 0.62, 0.014), GUNMAT.wood, 0, 0.03, -0.12);
    add(g, rb(0.04, 0.09, 0.22, 0.016), GUNMAT.wood, 0, 0.02, 0.24, -0.06);
    add(g, rb(0.036, 0.03, 0.12, 0.01), GUNMAT.wood, 0, 0.075, 0.2);
    add(g, rb(0.042, 0.1, 0.02, 0.008), M.polymer, 0, 0.02, 0.36, -0.06);
    add(g, rb(0.03, 0.07, 0.04, 0.008), GUNMAT.wood, 0, -0.02, 0.05, 0.35);
    add(g, cyl(0.016, 0.016, 0.2), M.metal, 0, 0.065, -0.02);
    add(g, cyl(0.011, 0.009, 0.62), M.metal, 0, 0.065, -0.43);
    add(g, cyl(0.016, 0.016, 0.05), M.metal, 0, 0.065, -0.75);
    out.muzzle.position.set(0, 0.065, -0.79);
    // scope
    add(g, cyl(0.017, 0.017, 0.32), M.metal, 0, 0.118, -0.05);
    add(g, cyl(0.026, 0.018, 0.08), M.metal, 0, 0.118, -0.25);
    add(g, cyl(0.021, 0.017, 0.07), M.metal, 0, 0.118, 0.12);
    add(g, new THREE.CircleGeometry(0.02, 20), M.lens, 0, 0.118, 0.156);
    add(g, cyl(0.009, 0.009, 0.03), M.metal, 0, 0.142, -0.05);
    add(g, cyl(0.009, 0.009, 0.03), M.metal, 0.024, 0.118, -0.05, 0, Math.PI / 2, 0);
    for (const z of [-0.12, 0.03]) add(g, rb(0.03, 0.04, 0.02, 0.005), M.metal, 0, 0.09, z);
    const bolt = new THREE.Group(); bolt.position.set(0.02, 0.07, 0.05); g.add(bolt);
    add(bolt, cyl(0.004, 0.004, 0.04), M.chrome, 0.02, 0, 0, 0, Math.PI / 2, 0);
    add(bolt, new THREE.SphereGeometry(0.009, 10, 8), M.metal, 0.042, 0, 0);
    out.parts.bolt = bolt;
    const mg = magGroup(0, -0.005, -0.06);
    add(mg, rb(0.026, 0.05, 0.07, 0.004), M.metal, 0, -0.02, 0);
    out.sight = { y: 0.118, z: 0.1 }; out.eye = 0.1;
    out.eject.position.set(0.025, 0.075, 0.0);
    out.grip = [0, -0.02, 0.06]; out.fore = [0, 0.0, -0.3];
  } else if (id === 'rocket') {
    add(g, cyl(0.048, 0.048, 0.92, 20), M.olive, 0, 0.12, -0.12);
    add(g, cyl(0.056, 0.048, 0.06, 20), M.olive, 0, 0.12, -0.6);
    add(g, cyl(0.048, 0.07, 0.14, 20), M.olive, 0, 0.12, 0.38);
    add(g, cyl(0.052, 0.052, 0.03, 20), M.metal, 0, 0.12, 0.08);
    add(g, cyl(0.052, 0.052, 0.03, 20), M.metal, 0, 0.12, -0.32);
    const head = new THREE.Group(); head.position.set(0, 0.12, -0.66); g.add(head);
    const cone = new THREE.ConeGeometry(0.042, 0.16, 16); cone.rotateX(-Math.PI / 2);
    add(head, cone, GUNMAT.warhead, 0, 0, -0.07);
    add(head, cyl(0.035, 0.042, 0.04, 16), GUNMAT.warhead, 0, 0, 0.02);
    out.parts.rocketHead = head;
    add(g, rb(0.03, 0.09, 0.04, 0.008), M.polymer, 0, 0.02, -0.02, 0.25);
    add(g, rb(0.028, 0.08, 0.035, 0.008), M.polymer, 0, 0.03, -0.3, 0.1);
    add(g, rb(0.06, 0.04, 0.12, 0.012), M.polymer, 0, 0.065, 0.18);
    add(g, rb(0.006, 0.05, 0.05, 0.002), M.metal, -0.07, 0.17, -0.05);
    add(g, rb(0.03, 0.004, 0.004, 0.001), M.metal, -0.06, 0.19, -0.05);
    add(g, rb(0.006, 0.04, 0.006, 0.001), M.metal, -0.06, 0.18, -0.36);
    out.muzzle.position.set(0, 0.12, -0.72);
    out.sight = { y: 0.19, z: -0.05 }; out.eye = 0.22;
    out.sightX = -0.06;
    out.grip = [0, -0.015, -0.02]; out.fore = [0, -0.0, -0.3];
  } else if (id === 'knife') {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(0.18, 0); shape.quadraticCurveTo(0.21, 0.012, 0.215, 0.03); shape.quadraticCurveTo(0.14, 0.035, 0.0, 0.032); shape.lineTo(0, 0);
    const bg = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.002, bevelSegments: 2 });
    bg.translate(0, -0.016, -0.002); bg.rotateY(Math.PI / 2);
    const blade = add(g, bg, GUNMAT.blade, 0, 0.0, -0.045);
    blade.rotation.x = 0.0;
    add(g, rb(0.026, 0.03, 0.11, 0.01), M.polymer, 0, 0.0, 0.03);
    for (let i = 0; i < 4; i++) add(g, rb(0.028, 0.032, 0.006, 0.002), M.metal, 0, 0, -0.005 + i * 0.025);
    add(g, rb(0.022, 0.05, 0.008, 0.003), M.metal, 0, 0, -0.03);
    out.sight = { y: 0, z: 0 };
    out.grip = [0, 0, 0.03]; out.fore = null;
    out.muzzle.position.set(0, 0, -0.25);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return out;
}

// Third-person (merged, cheaper) versions of gun models: GLB when loaded (GunModels), else procedural
const TPGuns = {
  cache: {},
  get(id) {
    const glb = GunModels.buildTP(id);
    if (glb) return this.cloneOf(glb);
    const e = GunModels.entry(id);
    if (e) Assets.get(e.file);
    if (this.cache[id]) return this.cloneOf(this.cache[id]);
    const m = gunModel(id);
    m.root.updateMatrixWorld(true);
    const byMat = new Map();
    m.root.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      const ng = geo.index ? geo.toNonIndexed() : geo;
      for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
      if (!ng.attributes.uv) ng.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2));
      const k = o.material.uuid;
      if (!byMat.has(k)) byMat.set(k, { mat: o.material, geos: [] });
      byMat.get(k).geos.push(ng);
    });
    const grp = new THREE.Group();
    for (const { mat, geos } of byMat.values()) {
      if (mat === GUNMAT.lens || mat === GUNMAT.dot) continue;
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = true;
      grp.add(mesh);
    }
    grp.userData.muzzle = m.muzzle.position.clone();
    grp.userData.grip = m.grip;
    grp.userData.fore = m.fore;
    this.cache[id] = grp;
    return this.cloneOf(grp);
  },
  cloneOf(src) {
    const c = src.clone();
    // Object3D.clone() JSON-copies userData, so restore real vectors
    const u = src.userData;
    c.userData = { muzzle: u.muzzle.clone(), grip: u.grip, fore: u.fore, hold: u.hold, glb: !!u.glb };
    return c;
  },
};

// ---------------------------------------------------------------------
// First-person arms
function addArms(model, team) {
  const g = model.root, { rb, add } = GB;
  const glove = GUNMAT.glove, sleeve = GUNMAT.sleeve;
  const limb = (a, b, r, mat) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const L = A.distanceTo(B);
    const geo = new THREE.CapsuleGeometry(r, L, 4, 10);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
    g.add(m); return m;
  };
  const hand = (p, side, kind) => {
    const h = new THREE.Group(); h.position.set(...p); g.add(h);
    if (kind === 'grip') {
      add(h, rb(0.05, 0.08, 0.06, 0.018), glove, side * 0.012, -0.005, 0.01, 0.25, 0, 0);
      add(h, rb(0.056, 0.022, 0.062, 0.01), glove, side * -0.002, 0.015, -0.025, 0.4, 0, 0);
      add(h, rb(0.054, 0.02, 0.06, 0.009), glove, side * -0.002, -0.012, -0.03, 0.4, 0, 0);
      add(h, rb(0.054, 0.02, 0.055, 0.009), glove, side * -0.002, -0.036, -0.028, 0.4, 0, 0);
      add(h, rb(0.02, 0.02, 0.05, 0.009), glove, side * 0.026, 0.03, -0.02, 0.2, 0, -side * 0.4);
    } else {
      add(h, rb(0.055, 0.07, 0.07, 0.018), glove, side * 0.03, -0.02, 0.0, 0, 0, side * 0.5);
      add(h, rb(0.024, 0.06, 0.07, 0.01), glove, side * -0.02, 0.0, 0.0, 0, 0, side * -0.2);
      add(h, rb(0.06, 0.02, 0.022, 0.009), glove, 0, 0.03, -0.01, 0, 0, 0);
    }
    return h;
  };
  if (model.grip) {
    const p = model.grip;
    hand(p, 1, 'grip');
    limb([p[0] + 0.03, p[1] - 0.06, p[2] + 0.05], [p[0] + 0.14, p[1] - 0.3, p[2] + 0.42], 0.034, glove);
    limb([p[0] + 0.07, p[1] - 0.16, p[2] + 0.22], [p[0] + 0.22, p[1] - 0.5, p[2] + 0.7], 0.048, sleeve);
    // team armband
    const band = limb([p[0] + 0.105, p[1] - 0.235, p[2] + 0.33], [p[0] + 0.115, p[1] - 0.26, p[2] + 0.36], 0.05, model.bandMat || (model.bandMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 })));
    model.band = band;
  }
  if (model.fore) {
    const p = model.fore;
    hand(p, -1, 'fore');
    limb([p[0] - 0.03, p[1] - 0.05, p[2] + 0.04], [p[0] - 0.2, p[1] - 0.28, p[2] + 0.34], 0.034, glove);
    limb([p[0] - 0.12, p[1] - 0.17, p[2] + 0.2], [p[0] - 0.32, p[1] - 0.45, p[2] + 0.6], 0.048, sleeve);
  }
}
