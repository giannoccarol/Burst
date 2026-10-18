// ===================================================================
// Map editor catalog: materials and placeable objects.
// Every object is built in its own local frame (origin at the centre of
// its footprint, on the floor) through a MapCtx, so the editor preview
// and the playable map share the same geometry and collision.
// Local "forward" is -Z (same as a camera with yaw = object rotation).
// ===================================================================

// ---------------------------------------------------------------- materials
const EDIT_MATS = [
  // prototipo (Krunker-style blockout grid, 1 m cells)
  { id: 'grid_grey', n: 'Griglia grigia', g: 'Prototipo', t: 'grid', s: 4, c: '#a7adb4' },
  { id: 'grid_white', n: 'Griglia bianca', g: 'Prototipo', t: 'grid', s: 4, c: '#f2f2f2' },
  { id: 'grid_dark', n: 'Griglia scura', g: 'Prototipo', t: 'grid', s: 4, c: '#4a4e55' },
  { id: 'grid_orange', n: 'Griglia arancio', g: 'Prototipo', t: 'grid', s: 4, c: '#ee8a3c' },
  { id: 'grid_red', n: 'Griglia rossa', g: 'Prototipo', t: 'grid', s: 4, c: '#e0524a' },
  { id: 'grid_blue', n: 'Griglia blu', g: 'Prototipo', t: 'grid', s: 4, c: '#4f8de0' },
  { id: 'grid_green', n: 'Griglia verde', g: 'Prototipo', t: 'grid', s: 4, c: '#5cb066' },
  { id: 'grid_purple', n: 'Griglia viola', g: 'Prototipo', t: 'grid', s: 4, c: '#9168d0' },
  { id: 'grid_yellow', n: 'Griglia gialla', g: 'Prototipo', t: 'grid', s: 4, c: '#ecc94a' },
  // borgo
  { id: 'cobble', n: 'Sampietrini', g: 'Borgo', base: 'cobble' },
  { id: 'slabs', n: 'Lastricato', g: 'Borgo', base: 'slabs' },
  { id: 'stone', n: 'Pietra squadrata', g: 'Borgo', base: 'stone' },
  { id: 'stoneTrim', n: 'Pietra chiara', g: 'Borgo', base: 'stoneTrim' },
  { id: 'rubble', n: 'Pietrame', g: 'Borgo', base: 'rubble' },
  { id: 'brick', n: 'Mattoni', g: 'Borgo', base: 'brick' },
  { id: 'roof', n: 'Coppi', g: 'Borgo', base: 'roof' },
  { id: 'cotto', n: 'Cotto', g: 'Borgo', base: 'cotto' },
  { id: 'marble', n: 'Marmo', g: 'Borgo', base: 'marble' },
  { id: 'terrain', n: 'Terra battuta', g: 'Borgo', base: 'terrain', surf: 'dirt' },
  { id: 'plaster_crema', n: 'Intonaco crema', g: 'Intonaci', base: 'plaster_crema' },
  { id: 'plaster_ocra', n: 'Intonaco ocra', g: 'Intonaci', base: 'plaster_ocra' },
  { id: 'plaster_siena', n: 'Intonaco siena', g: 'Intonaci', base: 'plaster_siena' },
  { id: 'plaster_rosa', n: 'Intonaco rosa', g: 'Intonaci', base: 'plaster_rosa' },
  { id: 'plaster_giallo', n: 'Intonaco giallo', g: 'Intonaci', base: 'plaster_giallo' },
  { id: 'plaster_terracotta', n: 'Intonaco cotto', g: 'Intonaci', base: 'plaster_terracotta' },
  { id: 'plaster_bianco', n: 'Intonaco bianco', g: 'Intonaci', base: 'plaster_bianco' },
  { id: 'plaster_salmone', n: 'Intonaco salmone', g: 'Intonaci', base: 'plaster_salmone' },
  { id: 'plaster_pesca', n: 'Intonaco pesca', g: 'Intonaci', base: 'plaster_pesca' },
  { id: 'plaster_grigio', n: 'Intonaco grigio', g: 'Intonaci', base: 'plaster_grigio' },
  // legno
  { id: 'wood', n: 'Legno', g: 'Legno', base: 'wood', surf: 'wood' },
  { id: 'woodDark', n: 'Legno scuro', g: 'Legno', base: 'woodDark', surf: 'wood' },
  { id: 'crate', n: 'Legno da cassa', g: 'Legno', base: 'crate', surf: 'wood' },
  { id: 'parquet', n: 'Parquet', g: 'Legno', t: 'parquet', s: 3, surf: 'wood' },
  { id: 'painted_green', n: 'Legno verniciato', g: 'Legno', base: 'paintGreen', surf: 'wood' },
  // industriale
  { id: 'concrete', n: 'Cemento', g: 'Industriale', t: 'concrete', s: 4, big: true, grime: true },
  { id: 'concrete_dark', n: 'Cemento scuro', g: 'Industriale', t: 'concrete', s: 4, big: true, grime: true, c: '#8a8a88' },
  { id: 'asphalt', n: 'Asfalto', g: 'Industriale', t: 'asphalt', s: 6, big: true },
  { id: 'corrugated', n: 'Lamiera ondulata', g: 'Industriale', t: 'corrugated', s: 3, surf: 'metal' },
  { id: 'corrugated_red', n: 'Lamiera rossa', g: 'Industriale', t: 'corrugated', s: 3, c: '#c0503f', surf: 'metal' },
  { id: 'corrugated_blue', n: 'Lamiera blu', g: 'Industriale', t: 'corrugated', s: 3, c: '#4a78b0', surf: 'metal' },
  { id: 'corrugated_green', n: 'Lamiera verde', g: 'Industriale', t: 'corrugated', s: 3, c: '#5a8a52', surf: 'metal' },
  { id: 'plate', n: 'Lamiera rivettata', g: 'Industriale', t: 'plate', s: 3, surf: 'metal' },
  { id: 'diamond', n: 'Lamiera mandorlata', g: 'Industriale', t: 'diamond', s: 2, surf: 'metal' },
  { id: 'metal', n: 'Ferro arrugginito', g: 'Industriale', base: 'metal', surf: 'metal' },
  { id: 'chain', n: 'Rete metallica', g: 'Industriale', t: 'chain', s: 2, alpha: true, surf: 'metal' },
  // interni
  { id: 'tiles', n: 'Piastrelle', g: 'Interni', t: 'tiles', s: 2.4 },
  { id: 'tiles_blue', n: 'Piastrelle azzurre', g: 'Interni', t: 'tiles', s: 2.4, c: '#a8cde2' },
  { id: 'tiles_green', n: 'Piastrelle verdi', g: 'Interni', t: 'tiles', s: 2.4, c: '#a9d0a4' },
  { id: 'checker', n: 'Scacchiera', g: 'Interni', t: 'checker', s: 2.4 },
  { id: 'carpet_red', n: 'Moquette rossa', g: 'Interni', t: 'carpet', s: 3, c: '#b0343c', surf: 'cloth' },
  { id: 'carpet_blue', n: 'Moquette blu', g: 'Interni', t: 'carpet', s: 3, c: '#3c5596', surf: 'cloth' },
  { id: 'carpet_grey', n: 'Moquette grigia', g: 'Interni', t: 'carpet', s: 3, c: '#808080', surf: 'cloth' },
  // natura
  { id: 'grass', n: 'Prato', g: 'Natura', t: 'grass', s: 4, big: true, surf: 'dirt' },
  { id: 'sand', n: 'Sabbia', g: 'Natura', t: 'sand', s: 5, big: true, surf: 'dirt' },
  { id: 'snow', n: 'Neve', g: 'Natura', t: 'snow', s: 5, big: true, surf: 'dirt' },
  { id: 'ice', n: 'Ghiaccio', g: 'Natura', t: 'ice', s: 5, big: true, surf: 'glass' },
  { id: 'gravel', n: 'Ghiaia', g: 'Natura', t: 'gravel', s: 3, big: true, surf: 'dirt' },
  { id: 'rock', n: 'Roccia', g: 'Natura', t: 'rock', s: 5, big: true },
  { id: 'lava', n: 'Lava', g: 'Natura', t: 'lava', s: 5, emissive: true },
  // tinte unite
  { id: 'solid_white', n: 'Bianco', g: 'Tinte unite', solid: '#e9e9e6' },
  { id: 'solid_black', n: 'Nero', g: 'Tinte unite', solid: '#1b1c1e' },
  { id: 'solid_grey', n: 'Grigio', g: 'Tinte unite', solid: '#7d8187' },
  { id: 'solid_red', n: 'Rosso', g: 'Tinte unite', solid: '#c8343c' },
  { id: 'solid_orange', n: 'Arancio', g: 'Tinte unite', solid: '#e07a2a' },
  { id: 'solid_yellow', n: 'Giallo', g: 'Tinte unite', solid: '#e8c53a' },
  { id: 'solid_green', n: 'Verde', g: 'Tinte unite', solid: '#3f9a4a' },
  { id: 'solid_teal', n: 'Petrolio', g: 'Tinte unite', solid: '#25908c' },
  { id: 'solid_blue', n: 'Blu', g: 'Tinte unite', solid: '#2f62c8' },
  { id: 'solid_purple', n: 'Viola', g: 'Tinte unite', solid: '#7a4ac8' },
  { id: 'solid_pink', n: 'Rosa', g: 'Tinte unite', solid: '#d85a9a' },
  { id: 'solid_brown', n: 'Marrone', g: 'Tinte unite', solid: '#6e4a30' },
  // neon
  { id: 'neon_cyan', n: 'Neon ciano', g: 'Neon', neon: '#3ae8f0' },
  { id: 'neon_magenta', n: 'Neon magenta', g: 'Neon', neon: '#f03ad8' },
  { id: 'neon_green', n: 'Neon verde', g: 'Neon', neon: '#5af03a' },
  { id: 'neon_orange', n: 'Neon arancio', g: 'Neon', neon: '#ff8a2a' },
  { id: 'neon_red', n: 'Neon rosso', g: 'Neon', neon: '#ff3040' },
  { id: 'neon_yellow', n: 'Neon giallo', g: 'Neon', neon: '#fff03a' },
  { id: 'neon_blue', n: 'Neon blu', g: 'Neon', neon: '#3a6aff' },
  { id: 'neon_white', n: 'Neon bianco', g: 'Neon', neon: '#ffffff' },
  // speciali
  { id: 'glass', n: 'Vetro', g: 'Speciali', special: 'glass', surf: 'glass' },
  { id: 'chrome', n: 'Cromo', g: 'Speciali', special: 'chrome', surf: 'metal' },
  { id: 'gold', n: 'Oro', g: 'Speciali', special: 'gold', surf: 'metal' },
  { id: 'water', n: 'Acqua', g: 'Speciali', base: 'water', surf: 'water' },
];
const EMAT_BY_ID = Object.fromEntries(EDIT_MATS.map((m) => [m.id, m]));
const EMAT_GROUPS = [...new Set(EDIT_MATS.map((m) => m.g))];
const _ematCache = new Map();
function extraTexSize(big) { return R.q >= 2 ? (big ? 1024 : 512) : (big ? 512 : 256); }
function cleanHex(c) { return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : null; }

function emat(id, tint) {
  const def = EMAT_BY_ID[id] || EMAT_BY_ID.grid_grey;
  tint = cleanHex(tint);
  const key = def.id + '|' + (tint || '');
  let m = _ematCache.get(key);
  if (m) return m;
  if (def.base) {
    const src = MAT[def.base];
    if (!tint) m = src;
    else {
      m = src.clone();
      m.onBeforeCompile = src.onBeforeCompile; m.customProgramCacheKey = src.customProgramCacheKey;
      m.userData = Object.assign({}, src.userData);
      m.color.set(tint);
    }
  } else if (def.t) {
    const tex = TexGen.build(def.t, extraTexSize(def.big), { normalStrength: def.ns || 2.2, aniso: !!def.big });
    const p = { map: tex.map, normalMap: tex.normal, roughnessMap: tex.orm, aoMap: tex.orm, metalnessMap: tex.orm, roughness: 1, metalness: 1, color: new THREE.Color(tint || def.c || '#ffffff') };
    if (def.alpha) Object.assign(p, { alphaTest: 0.5, side: THREE.DoubleSide });
    if (def.emissive) Object.assign(p, { emissiveMap: tex.map, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 2.2 });
    m = new THREE.MeshStandardMaterial(p);
    if (def.grime) GrimeChunk.apply(m);
  } else if (def.solid) m = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint || def.solid), roughness: 0.55, metalness: 0 });
  else if (def.neon) { const c = new THREE.Color(tint || def.neon); m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.4, roughness: 0.35, metalness: 0 }); }
  else if (def.special === 'glass') m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(tint || '#bcd6de'), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.3, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  else if (def.special === 'chrome') m = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint || '#e2e2e2'), roughness: 0.1, metalness: 1 });
  else m = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint || '#d4a84a'), roughness: 0.25, metalness: 1 });
  if (m !== MAT[def.base]) {
    m.userData.uvScale = m.userData.uvScale || def.s || 2;
    m.userData.surf = def.surf || m.userData.surf || 'stone';
  } else {
    if (!m.userData.uvScale) m.userData.uvScale = 2;
    if (def.surf && !m.userData.surf) m.userData.surf = def.surf;
  }
  _ematCache.set(key, m);
  return m;
}
// tinted copy of any library material (props: car paint, container colour...)
const _tintCache = new Map();
function tintMat(src, hex) {
  hex = cleanHex(hex);
  if (!hex) return src;
  const key = src.uuid + hex;
  let m = _tintCache.get(key);
  if (!m) {
    m = src.clone(); m.onBeforeCompile = src.onBeforeCompile; m.customProgramCacheKey = src.customProgramCacheKey;
    m.userData = Object.assign({}, src.userData); m.color.set(hex);
    _tintCache.set(key, m);
  }
  return m;
}
// unlit helper materials for editor-only gizmos (spawns, volumes, lights)
const _helperMats = new Map();
function helperMat(hex, opacity = 0.35, solid = false) {
  const key = hex + opacity + solid;
  let m = _helperMats.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: !solid, opacity: solid ? 1 : opacity, depthWrite: solid, side: THREE.DoubleSide, toneMapped: false, fog: false });
    m.userData.uvScale = 1;
    _helperMats.set(key, m);
  }
  return m;
}
const TEAM_HEX = { 0: '#f0c060', 1: '#ff5a4e', 2: '#4f9dff' };
const CHANNEL_HEX = { 1: '#3ae8f0', 2: '#f03ad8', 3: '#fff03a', 4: '#5af03a' };

// ---------------------------------------------------------------- small geometry helpers (local frame)
function gAt(ctx, mat, g, x, y, z, o) { ctx.G.geom(mat, g, new THREE.Matrix4().makeTranslation(x, y, z), o); }
function eAt(ctx, mat, g, x, y, z) { ctx.E.geom(mat, g, new THREE.Matrix4().makeTranslation(x, y, z)); }
// extruded profile along X: prof = [[z, y], ...] counter-clockwise seen from +X
function extrudeX(ctx, mat, prof, x0, x1) {
  for (let i = 0; i < prof.length; i++) {
    const a = prof[i], b = prof[(i + 1) % prof.length];
    ctx.G.quad(mat, [x0, a[1], a[0]], [x0, b[1], b[0]], [x1, b[1], b[0]], [x1, a[1], a[0]]);
  }
  const c = prof.reduce((s, p) => [s[0] + p[0] / prof.length, s[1] + p[1] / prof.length], [0, 0]);
  for (let i = 0; i < prof.length; i++) {
    const a = prof[i], b = prof[(i + 1) % prof.length];
    ctx.G.tri(mat, [x1, c[1], c[0]], [x1, a[1], a[0]], [x1, b[1], b[0]]);
    ctx.G.tri(mat, [x0, c[1], c[0]], [x0, b[1], b[0]], [x0, a[1], a[0]]);
  }
}
function volumeHelper(ctx, hex, sx, sy, sz, opacity = 0.18) {
  ctx.E.box(helperMat(hex, opacity), -sx / 2, 0, -sz / 2, sx / 2, sy, sz / 2);
  const e = helperMat(hex, 0.9);
  const t = 0.03;
  for (const [x, z] of [[-sx / 2, -sz / 2], [sx / 2, -sz / 2], [sx / 2, sz / 2], [-sx / 2, sz / 2]]) ctx.E.box(e, x - t, 0, z - t, x + t, sy, z + t);
  for (const y of [0, sy]) {
    ctx.E.box(e, -sx / 2, y - t, -sz / 2 - t, sx / 2, y + t, -sz / 2 + t);
    ctx.E.box(e, -sx / 2, y - t, sz / 2 - t, sx / 2, y + t, sz / 2 + t);
    ctx.E.box(e, -sx / 2 - t, y - t, -sz / 2, -sx / 2 + t, y + t, sz / 2);
    ctx.E.box(e, sx / 2 - t, y - t, -sz / 2, sx / 2 + t, y + t, sz / 2);
  }
}
// arrow on the floor pointing to local -Z (forward)
function floorArrow(ctx, mat, len = 1.1, y = 0.06) {
  ctx.E.quad(mat, [-0.08, y, 0], [0.08, y, 0], [0.08, y, -len + 0.3], [-0.08, y, -len + 0.3]);
  ctx.E.tri(mat, [-0.3, y, -len + 0.3], [0.3, y, -len + 0.3], [0, y, -len]);
}

// ---------------------------------------------------------------- object catalog
const RS_XYZ = 'xyz', RS_U = 'u', RS_NONE = 'none';
const TEAM_PARAM = { k: 'team', n: 'Squadra', type: 'seg', opts: [[0, 'Tutti'], [1, 'Rossi'], [2, 'Azzurri']], def: 0 };
const CH_PARAM = { k: 'ch', n: 'Canale', type: 'seg', opts: [[1, '1'], [2, '2'], [3, '3'], [4, '4']], def: 1 };

const CATALOG = [
  // ------------------------------------------------ forme
  { id: 'box', n: 'Blocco', cat: 'forme', size: [2, 2, 2], rs: RS_XYZ, mat: 'grid_grey',
    build(ctx, o, m) { const [sx, sy, sz] = o.s; ctx.block(m, -sx / 2, 0, -sz / 2, sx / 2, sy, sz / 2); } },
  { id: 'wall', n: 'Muro', cat: 'forme', size: [4, 3, 0.3], rs: RS_XYZ, mat: 'concrete',
    build(ctx, o, m) { const [sx, sy, sz] = o.s; ctx.block(m, -sx / 2, 0, -sz / 2, sx / 2, sy, sz / 2); } },
  { id: 'floor', n: 'Piattaforma', cat: 'forme', size: [4, 0.3, 4], rs: RS_XYZ, mat: 'grid_orange',
    build(ctx, o, m) { const [sx, sy, sz] = o.s; ctx.block(m, -sx / 2, 0, -sz / 2, sx / 2, sy, sz / 2); } },
  { id: 'ramp', n: 'Rampa', cat: 'forme', size: [2, 1.5, 4], rs: RS_XYZ, mat: 'grid_dark',
    build(ctx, o, m) {
      // rises from the front (-Z, floor) to the back (+Z, top)
      const [sx, sy, sz] = o.s, x0 = -sx / 2, x1 = sx / 2, z0 = -sz / 2, z1 = sz / 2;
      const G = ctx.G;
      G.quad(m, [x0, 0, z0], [x1, 0, z0], [x1, sy, z1], [x0, sy, z1]);
      G.quad(m, [x1, 0, z1], [x0, 0, z1], [x0, sy, z1], [x1, sy, z1]);
      G.tri(m, [x1, 0, z0], [x1, 0, z1], [x1, sy, z1]);
      G.tri(m, [x0, 0, z1], [x0, 0, z0], [x0, sy, z1]);
      G.quad(m, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0]);
      const n = clamp(Math.ceil(sy / 0.14), 1, 60), surf = surfOf(m);
      for (let i = 0; i < n; i++) ctx.solid(x0, 0, z0 + sz * i / n, x1, sy * (i + 0.5) / n, z1, surf, F_NORAY);
      ctx.rayQuad([x0, 0, z0], [x1, 0, z0], [x1, sy, z1], [x0, sy, z1], surf);
      ctx.rayQuad([x1, 0, z1], [x0, 0, z1], [x0, sy, z1], [x1, sy, z1], surf);
      ctx.rayTri([x1, 0, z0], [x1, 0, z1], [x1, sy, z1], surf); ctx.rayTri([x0, 0, z1], [x0, 0, z0], [x0, sy, z1], surf);
    } },
  { id: 'stairs', n: 'Scala', cat: 'forme', size: [2, 2, 3.2], rs: RS_XYZ, mat: 'stoneTrim',
    build(ctx, o, m) {
      const [sx, sy, sz] = o.s, n = clamp(Math.round(sy / 0.2), 1, 40), rise = sy / n, run = sz / n, surf = surfOf(m);
      for (let i = 0; i < n; i++) {
        const z0 = -sz / 2 + i * run;
        ctx.G.box(m, -sx / 2, 0, z0, sx / 2, (i + 1) * rise, z0 + run, { skip: 'ny' });
        ctx.solid(-sx / 2, 0, z0, sx / 2, (i + 1) * rise, sz / 2, surf, F_NORAY);
      }
      ctx.rayQuad([-sx / 2, 0, -sz / 2], [sx / 2, 0, -sz / 2], [sx / 2, sy, sz / 2], [-sx / 2, sy, sz / 2], surf);
      ctx.rayQuad([sx / 2, 0, sz / 2], [-sx / 2, 0, sz / 2], [-sx / 2, sy, sz / 2], [sx / 2, sy, sz / 2], surf);
    } },
  { id: 'column', n: 'Colonna', cat: 'forme', size: [0.8, 3, 0.8], rs: RS_XYZ, mat: 'marble',
    build(ctx, o, m) {
      const [sx, sy, sz] = o.s;
      const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 24); g.scale(sx, sy, sz);
      gAt(ctx, m, g, 0, sy / 2, 0, { worldUV: true });
      ctx.solid(-sx * 0.42, 0, -sz * 0.42, sx * 0.42, sy, sz * 0.42, surfOf(m));
    } },
  { id: 'window_wall', n: 'Muro con finestra', cat: 'forme', size: [4, 3, 0.3], rs: RS_XYZ, mat: 'plaster_crema',
    build(ctx, o, m) {
      const [sx, sy, sz] = o.s, w = Math.min(1.4, sx * 0.4) / 2, y0 = Math.min(1.0, sy * 0.33), y1 = Math.min(sy - 0.3, y0 + Math.min(1.3, sy * 0.45));
      ctx.block(m, -sx / 2, 0, -sz / 2, -w, sy, sz / 2); ctx.block(m, w, 0, -sz / 2, sx / 2, sy, sz / 2);
      ctx.block(m, -w, 0, -sz / 2, w, y0, sz / 2); ctx.block(m, -w, y1, -sz / 2, w, sy, sz / 2);
    } },
  { id: 'door_wall', n: 'Muro con porta', cat: 'forme', size: [4, 3, 0.3], rs: RS_XYZ, mat: 'plaster_ocra',
    build(ctx, o, m) {
      const [sx, sy, sz] = o.s, w = Math.min(1.5, sx * 0.45) / 2, h = Math.min(2.3, sy - 0.25);
      ctx.block(m, -sx / 2, 0, -sz / 2, -w, sy, sz / 2); ctx.block(m, w, 0, -sz / 2, sx / 2, sy, sz / 2);
      ctx.block(m, -w, h, -sz / 2, w, sy, sz / 2);
    } },
  { id: 'arch', n: 'Portale ad arco', cat: 'forme', size: [4, 4, 0.8], rs: RS_XYZ, mat: 'stone',
    build(ctx, o, m) {
      const [sx, sy, sz] = o.s, r = Math.min(sx * 0.3, sy * 0.35), spring = Math.max(0.5, sy - r - Math.max(0.35, sy * 0.12)), z0 = -sz / 2, z1 = sz / 2, surf = surfOf(m);
      ctx.block(m, -sx / 2, 0, z0, -r, sy, z1); ctx.block(m, r, 0, z0, sx / 2, sy, z1);
      const N = 16, ys = [];
      for (let i = 0; i <= N; i++) { const x = -r + 2 * r * i / N; ys.push([x, spring + Math.sqrt(Math.max(0, r * r - x * x))]); }
      for (let i = 0; i < N; i++) {
        const [xa, ya] = ys[i], [xb, yb] = ys[i + 1];
        ctx.G.quad(m, [xa, ya, z1], [xb, yb, z1], [xb, sy, z1], [xa, sy, z1]);
        ctx.G.quad(m, [xb, yb, z0], [xa, ya, z0], [xa, sy, z0], [xb, sy, z0]);
        ctx.G.quad(m, [xa, ya, z0], [xb, yb, z0], [xb, yb, z1], [xa, ya, z1]);
      }
      ctx.G.quad(m, [-r, sy, z1], [r, sy, z1], [r, sy, z0], [-r, sy, z0]);
      const C = 8;
      for (let i = 0; i < C; i++) {
        const xa = -r + 2 * r * i / C, xb = -r + 2 * r * (i + 1) / C;
        const yb = spring + Math.sqrt(Math.max(0, r * r - Math.max(xa * xa, xb * xb)));
        ctx.solid(xa, yb, z0, xb, sy, z1, surf);
      }
    } },
  { id: 'pillar_sq', n: 'Pilastro', cat: 'forme', size: [0.6, 3, 0.6], rs: RS_XYZ, mat: 'brick',
    build(ctx, o, m) { const [sx, sy, sz] = o.s; ctx.block(m, -sx / 2, 0, -sz / 2, sx / 2, sy, sz / 2); ctx.G.box(MAT.stoneTrim, -sx / 2 - 0.05, sy, -sz / 2 - 0.05, sx / 2 + 0.05, sy + 0.1, sz / 2 + 0.05); } },
  { id: 'house', n: 'Casa del borgo', cat: 'forme', size: [8, 7, 7], rs: RS_XYZ, mat: null,
    params: [
      { k: 'col', n: 'Colore', type: 'select', opts: Object.keys(PLASTER_COLORS).map((k) => [k, k[0].toUpperCase() + k.slice(1)]), def: 'ocra' },
      { k: 'roof', n: 'Tetto', type: 'seg', opts: [['hip', 'Padiglione'], ['gable-x', 'Falde'], ['flat', 'Piano']], def: 'hip' },
      { k: 'sh', n: 'Persiane', type: 'select', opts: Object.keys(SHUTTER_COLORS).map((k) => [k, k[0].toUpperCase() + k.slice(1)]), def: 'verde' },
    ],
    build(ctx, o) {
      const [sx, sy, sz] = o.s, a = o.a || {};
      house(ctx, { x0: -sx / 2, z0: -sz / 2, x1: sx / 2, z1: sz / 2, h: Math.max(3.2, sy), color: a.col || 'ocra', roof: a.roof || 'hip', shutter: a.sh || 'verde', faces: { s: { doors: [{ s: sx / 2 }] } } });
    } },

  // ------------------------------------------------ oggetti
  { id: 'crate', n: 'Cassa', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { crate(ctx, 0, 0, 0, 1.1); } },
  { id: 'crates', n: 'Pila di casse', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) { crate(ctx, -0.6, 0, 0, 1.1); crate(ctx, 0.62, 0, 0.1, 1.1); crate(ctx, 0, 1.1, 0.05, 1.1); } },
  { id: 'barrel', n: 'Barile', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { barrel(ctx, 0, 0); } },
  { id: 'bench', n: 'Panchina', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { bench(ctx, 0, 0, 'x', 2); } },
  { id: 'bollard', n: 'Paracarro', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { bollard(ctx, 0, 0); } },
  { id: 'lamp', n: 'Lampione', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { streetLamp(ctx, 0, 0); } },
  { id: 'cafe', n: 'Tavolino da bar', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { cafeSet(ctx, 0, 0, true); } },
  { id: 'chair', n: 'Sedia', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { chair(ctx, 0, 0, Math.PI / 2); } },
  { id: 'stall', n: 'Bancarella', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { marketStall(ctx, 0, 0, 0, MAT.awningRed); } },
  { id: 'kiosk', n: 'Edicola', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { kiosk(ctx, 0, 0, Math.PI); } },
  { id: 'plant', n: 'Vaso con pianta', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { pottedPlant(ctx, 0, 0, 1, false); } },
  { id: 'lemon', n: 'Limone in vaso', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { pottedPlant(ctx, 0, 0, 1.2, true); } },
  { id: 'tree', n: 'Albero', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { tree(ctx, 0, 0, { h: 5.5, r: 2.6 }); } },
  { id: 'olive', n: 'Ulivo', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { tree(ctx, 0, 0, { h: 3.6, r: 2.2, leaves: MAT.leaves, trunkR: 0.26, cards: 34 }); } },
  { id: 'cypress', n: 'Cipresso', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      const g = cypressGeometry();
      ctx.G.geom(MAT.cypress, g, new THREE.Matrix4().makeScale(1.6, 9, 1.6));
      ctx.solid(-0.3, 0, -0.3, 0.3, 6, 0.3, 'wood');
    } },
  { id: 'bush', n: 'Cespuglio', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) { for (let i = 0; i < 4; i++) leafBall(ctx, (ctx.r() - 0.5) * 1.2, 0.45 + ctx.r() * 0.25, (ctx.r() - 0.5) * 1.2, 0.55, 18, ctx.r() < 0.5 ? MAT.leaves : MAT.leaves2); } },
  { id: 'well', n: 'Pozzo', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { well(ctx, 0, 0); } },
  { id: 'car', n: 'Utilitaria', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, tint: '#8fb7c4',
    build(ctx, o) {
      const saved = MAT.carPaint; MAT.carPaint = tintMat(saved, o.c);
      try { car500(ctx, 0, 0, 0); } finally { MAT.carPaint = saved; }
    } },
  { id: 'vespa', n: 'Scooter', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, tint: '#c94a3b',
    build(ctx, o) {
      const saved = MAT.vespaPaint; MAT.vespaPaint = tintMat(saved, o.c);
      try { vespa(ctx, 0, 0, 0); } finally { MAT.vespaPaint = saved; }
    } },
  { id: 'railing', n: 'Ringhiera', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) { railing(ctx, -1, 0, 1, 0, 0); ctx.solid(-1, 0, -0.05, 1, 1.0, 0.05, 'metal', F_NORAY); } },
  { id: 'balustrade', n: 'Balaustra', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, build(ctx) { balustrade(ctx, -1.5, 0, 1.5, 0, 0); } },
  { id: 'container', n: 'Container', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, tint: '#c0503f',
    build(ctx, o) {
      const m = emat('corrugated', o.c || '#c0503f'), fr = tintMat(MAT.metal, '#5a5a58');
      const L = 6.06, W = 2.44, H = 2.59, t = 0.1;
      ctx.G.box(m, -L / 2 + t, t, -W / 2, L / 2 - t, H - t, W / 2);
      for (const x of [-L / 2, L / 2 - t]) for (const z of [-W / 2, W / 2 - t]) ctx.G.box(fr, x, 0, z, x + t, H, z + t);
      for (const y of [0, H - t]) { ctx.G.box(fr, -L / 2, y, -W / 2 - 0.01, L / 2, y + t, -W / 2 + 0.04); ctx.G.box(fr, -L / 2, y, W / 2 - 0.04, L / 2, y + t, W / 2 + 0.01); ctx.G.box(fr, -L / 2, y, -W / 2, -L / 2 + t, y + t, W / 2); ctx.G.box(fr, L / 2 - t, y, -W / 2, L / 2, y + t, W / 2); }
      ctx.G.box(m, L / 2 - t, t, -W / 2 + t, L / 2 - 0.02, H - t, W / 2 - t);
      for (const z of [-0.85, -0.35, 0.35, 0.85]) rod(ctx, MAT.iron, [L / 2 + 0.02, 0.2, z], [L / 2 + 0.02, H - 0.2, z], 0.025);
      ctx.solid(-L / 2, 0, -W / 2, L / 2, H, W / 2, 'metal');
    } },
  { id: 'sandbags', n: 'Sacchi di sabbia', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, tint: '#b3a27a',
    build(ctx, o) {
      const m = MAT.fabric(cleanHex(o.c) || '#b3a27a');
      const bag = new RoundedBoxGeometry(0.56, 0.22, 0.34, 2, 0.09);
      const rows = [[4, 0, -0.17], [4, 0, 0.17], [4, 0.21, 0], [3, 0.42, 0]];
      for (const [n, y, z] of rows) {
        const off = n === 3 ? 0.28 : 0;
        for (let i = 0; i < n; i++) {
          const mm = new THREE.Matrix4().makeRotationY((ctx.r() - 0.5) * 0.16).setPosition(-0.84 + off + i * 0.56 + (ctx.r() - 0.5) * 0.04, y + 0.11, z);
          ctx.G.geom(m, bag, mm);
        }
      }
      ctx.solid(-1.12, 0, -0.34, 1.12, 0.62, 0.34, 'cloth');
    } },
  { id: 'jersey', n: 'Barriera in cemento', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      const m = emat('concrete');
      extrudeX(ctx, m, [[-0.3, 0], [0.3, 0], [0.3, 0.08], [0.17, 0.26], [0.09, 0.82], [-0.09, 0.82], [-0.17, 0.26], [-0.3, 0.08]].map(([z, y]) => [-z, y]), -1, 1);
      ctx.solid(-1, 0, -0.3, 1, 0.82, 0.3, 'stone');
    } },
  { id: 'pallet', n: 'Bancale', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      const w = MAT.wood;
      for (const z of [-0.45, 0, 0.45]) ctx.G.box(w, -0.6, 0.02, z - 0.05, 0.6, 0.12, z + 0.05);
      for (let i = 0; i < 6; i++) { const x = -0.55 + i * 0.22; ctx.G.box(w, x - 0.05, 0.12, -0.5, x + 0.05, 0.145, 0.5); }
      for (const x of [-0.55, 0.55]) ctx.G.box(w, x - 0.05, 0, -0.5, x + 0.05, 0.02, 0.5);
      ctx.solid(-0.6, 0, -0.5, 0.6, 0.145, 0.5, 'wood');
    } },
  { id: 'tires', n: 'Pneumatici', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      const g = new THREE.TorusGeometry(0.3, 0.12, 10, 20); g.rotateX(Math.PI / 2);
      for (let i = 0; i < 3; i++) gAt(ctx, MAT.rubber, g, (ctx.r() - 0.5) * 0.06, 0.12 + i * 0.235, (ctx.r() - 0.5) * 0.06);
      ctx.solid(-0.42, 0, -0.42, 0.42, 0.72, 0.42, 'cloth');
    } },
  { id: 'dumpster', n: 'Cassonetto', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, tint: '#2f5a43',
    build(ctx, o) {
      const p = tintMat(MAT.paintGreen, o.c);
      ctx.G.box(p, -0.9, 0.18, -0.5, 0.9, 1.15, 0.5);
      ctx.G.quad(MAT.rubber, [-0.92, 1.15, 0.52], [0.92, 1.15, 0.52], [0.92, 1.28, -0.52], [-0.92, 1.28, -0.52]);
      ctx.G.quad(MAT.rubber, [-0.92, 1.28, -0.52], [0.92, 1.28, -0.52], [0.92, 1.15, 0.52], [-0.92, 1.15, 0.52]);
      const wheel = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10); wheel.rotateX(Math.PI / 2);
      for (const [x, z] of [[-0.75, -0.4], [0.75, -0.4], [-0.75, 0.4], [0.75, 0.4]]) gAt(ctx, MAT.rubber, wheel, x, 0.09, z);
      ctx.solid(-0.9, 0, -0.5, 0.9, 1.25, 0.5, 'metal');
    } },
  { id: 'bin', n: 'Bidone', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, tint: '#3d5a7a',
    build(ctx, o) {
      const p = tintMat(emat('plate'), o.c || '#3d5a7a');
      gAt(ctx, p, new THREE.CylinderGeometry(0.29, 0.29, 0.88, 18), 0, 0.44, 0, { worldUV: true });
      for (const y of [0.25, 0.6]) gAt(ctx, MAT.iron, new THREE.TorusGeometry(0.295, 0.02, 6, 18).rotateX(Math.PI / 2), 0, y, 0);
      gAt(ctx, MAT.iron, new THREE.CylinderGeometry(0.3, 0.3, 0.04, 18), 0, 0.9, 0);
      ctx.solid(-0.3, 0, -0.3, 0.3, 0.92, 0.3, 'metal');
    } },
  { id: 'rock', n: 'Masso', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      const g = new THREE.IcosahedronGeometry(1, 2);
      const pos = g.attributes.position, v = new THREE.Vector3();
      const ph = [ctx.r() * 9, ctx.r() * 9, ctx.r() * 9];
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const n = 1 + 0.18 * Math.sin(v.x * 3.1 + ph[0]) * Math.sin(v.y * 2.7 + ph[1]) + 0.12 * Math.sin(v.z * 4.3 + ph[2]) + 0.05 * Math.sin(v.x * 9 + v.z * 7);
        pos.setXYZ(i, v.x * n * 1.3, Math.max(-0.2, v.y * n * 0.8), v.z * n * 1.1);
      }
      g.computeVertexNormals();
      gAt(ctx, emat('rock'), g, 0, 0.55, 0, { worldUV: true });
      ctx.solid(-1.1, 0, -0.95, 1.1, 1.25, 0.95, 'stone');
    } },
  { id: 'fence', n: 'Staccionata', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      const w = MAT.woodDark;
      for (const x of [-1, 0, 1]) ctx.G.box(w, x - 0.05, 0, -0.05, x + 0.05, 1.1, 0.05);
      for (const y of [0.4, 0.85]) ctx.G.box(MAT.wood, -1.05, y, -0.02, 1.05, y + 0.12, 0.03);
      ctx.solid(-1.05, 0, -0.06, 1.05, 1.1, 0.06, 'wood');
    } },
  { id: 'chainfence', n: 'Recinzione', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      const c = emat('chain');
      ctx.G.quad(c, [-1.5, 0.05, 0], [1.5, 0.05, 0], [1.5, 2.2, 0], [-1.5, 2.2, 0], [[0, 0], [1.5, 0], [1.5, 1.075], [0, 1.075]]);
      for (const x of [-1.5, 0, 1.5]) rod(ctx, MAT.chrome, [x, 0, 0], [x, 2.25, 0], 0.035);
      rod(ctx, MAT.chrome, [-1.5, 2.2, 0], [1.5, 2.2, 0], 0.025);
      ctx.solid(-1.5, 0, -0.04, 1.5, 2.25, 0.04, 'metal', F_NORAY);
    } },
  { id: 'scaffold', n: 'Impalcatura', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      const W = 1.25, D = 0.6, H = 2.0, t = MAT.chrome;
      for (const x of [-W, W]) for (const z of [-D, D]) rod(ctx, t, [x, 0, z], [x, H + 1.0, z], 0.03);
      for (const y of [0.2, H, H + 1.0]) { for (const z of [-D, D]) rod(ctx, t, [-W, y, z], [W, y, z], 0.025); for (const x of [-W, W]) rod(ctx, t, [x, y, -D], [x, y, D], 0.025); }
      rod(ctx, t, [-W, 0.2, -D], [W, H, -D], 0.022); rod(ctx, t, [W, 0.2, D], [-W, H, D], 0.022);
      for (let i = 0; i < 3; i++) ctx.G.box(MAT.wood, -W - 0.05, H, -D + i * 0.42, W + 0.05, H + 0.05, -D + i * 0.42 + 0.38);
      ctx.solid(-W - 0.05, H, -D, W + 0.05, H + 0.05, D, 'wood');
      for (const x of [-W, W]) for (const z of [-D, D]) ctx.solid(x - 0.04, 0, z - 0.04, x + 0.04, H + 1, z + 0.04, 'metal');
      ctx.solid(-W, H + 0.95, -D - 0.03, W, H + 1.05, -D + 0.03, 'metal', F_NORAY);
      ctx.solid(-W, H + 0.95, D - 0.03, W, H + 1.05, D + 0.03, 'metal', F_NORAY);
    } },
  { id: 'table', n: 'Tavolo', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      ctx.G.box(MAT.wood, -0.8, 0.72, -0.45, 0.8, 0.78, 0.45);
      for (const [x, z] of [[-0.72, -0.37], [0.72, -0.37], [-0.72, 0.37], [0.72, 0.37]]) ctx.G.box(MAT.woodDark, x - 0.04, 0, z - 0.04, x + 0.04, 0.72, z + 0.04);
      ctx.solid(-0.8, 0, -0.45, 0.8, 0.78, 0.45, 'wood');
    } },
  { id: 'shelf', n: 'Scaffale', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      const t = tintMat(MAT.metal, '#7b8088'), card = MAT.fabric('#b08a5a');
      for (const x of [-0.9, 0.9]) for (const z of [-0.25, 0.25]) ctx.G.box(t, x - 0.03, 0, z - 0.03, x + 0.03, 2.0, z + 0.03);
      for (const y of [0.1, 0.7, 1.3, 1.9]) ctx.G.box(t, -0.92, y, -0.27, 0.92, y + 0.03, 0.27);
      for (const y of [0.13, 0.73, 1.33]) {
        let x = -0.85;
        while (x < 0.7) { const w = 0.3 + ctx.r() * 0.25, h = 0.2 + ctx.r() * 0.3; if (ctx.r() < 0.8) ctx.G.box(card, x, y, -0.2, x + w, y + h, 0.2); x += w + 0.05; }
      }
      ctx.solid(-0.93, 0, -0.28, 0.93, 2.0, 0.28, 'metal');
    } },
  { id: 'hydrant', n: 'Idrante', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, tint: '#b8282a',
    build(ctx, o) {
      const p = emat('solid_red', o.c);
      gAt(ctx, p, new THREE.CylinderGeometry(0.13, 0.15, 0.7, 14), 0, 0.35, 0);
      gAt(ctx, p, new THREE.SphereGeometry(0.14, 12, 8, 0, TAU, 0, Math.PI / 2), 0, 0.7, 0);
      const side = new THREE.CylinderGeometry(0.06, 0.06, 0.42, 10); side.rotateZ(Math.PI / 2);
      gAt(ctx, MAT.chrome, side, 0, 0.5, 0);
      ctx.solid(-0.16, 0, -0.16, 0.16, 0.85, 0.16, 'metal');
    } },
  { id: 'cone', n: 'Coni stradali', cat: 'oggetti', size: [1, 1, 1], rs: RS_U,
    build(ctx) {
      const or = emat('solid_orange'), wh = emat('solid_white');
      for (const [x, z] of [[-0.45, 0.1], [0.1, -0.2], [0.55, 0.25]]) {
        gAt(ctx, or, new THREE.ConeGeometry(0.17, 0.62, 14, 1, true), x, 0.36, z);
        gAt(ctx, wh, new THREE.CylinderGeometry(0.095, 0.115, 0.1, 14, 1, true), x, 0.42, z);
        ctx.G.box(MAT.rubber, x - 0.2, 0, z - 0.2, x + 0.2, 0.05, z + 0.2);
      }
      ctx.solid(-0.65, 0, -0.4, 0.75, 0.68, 0.45, 'cloth', F_NOCOLLIDE);
    } },
  { id: 'generator', n: 'Generatore', cat: 'oggetti', size: [1, 1, 1], rs: RS_U, tint: '#d8a822',
    build(ctx, o) {
      const body = emat('solid_yellow', o.c || '#d8a822'), fr = MAT.iron;
      ctx.G.box(body, -0.75, 0.15, -0.42, 0.75, 1.05, 0.42);
      for (const x of [-0.8, 0.8]) for (const z of [-0.45, 0.45]) ctx.G.box(fr, x - 0.04, 0, z - 0.04, x + 0.04, 1.1, z + 0.04);
      ctx.G.box(fr, -0.82, 0, -0.47, 0.82, 0.15, 0.47);
      for (let i = 0; i < 6; i++) ctx.G.box(MAT.dark, -0.6 + i * 0.2, 0.45, -0.425, -0.5 + i * 0.2, 0.85, -0.42);
      rod(ctx, MAT.metal, [0.5, 1.05, 0.2], [0.5, 1.45, 0.2], 0.05);
      ctx.solid(-0.82, 0, -0.47, 0.82, 1.1, 0.47, 'metal');
    } },

  // ------------------------------------------------ gioco
  { id: 'spawn', n: 'Spawn', cat: 'gioco', size: [1, 1, 1], rs: RS_NONE, params: [TEAM_PARAM],
    build(ctx, o) {
      const team = (o.a && o.a.team) | 0, hex = TEAM_HEX[team];
      eAt(ctx, helperMat(hex, 0.5), new THREE.CylinderGeometry(0.55, 0.55, 0.04, 24), 0, 0.02, 0);
      eAt(ctx, helperMat(hex, 0.22), new THREE.CapsuleGeometry(0.32, 1.16, 4, 10), 0, 0.9, 0);
      floorArrow(ctx, helperMat(hex, 0.95), 1.3);
      ctx.meta.spawn = { team };
    } },
  { id: 'flag', n: 'Base bandiera', cat: 'gioco', size: [1, 1, 1], rs: RS_NONE, params: [{ k: 'team', n: 'Squadra', type: 'seg', opts: [[1, 'Rossi'], [2, 'Azzurri']], def: 1 }],
    build(ctx, o) {
      const team = ((o.a && o.a.team) | 0) === 2 ? 2 : 1, hex = TEAM_HEX[team];
      eAt(ctx, helperMat('#202020', 0.9), new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), 0, 1.2, 0);
      ctx.E.quad(helperMat(hex, 0.95), [0, 1.75, 0], [0.9, 1.75, 0], [0.9, 2.35, 0], [0, 2.35, 0]);
      const ring = new THREE.RingGeometry(1.4, 1.6, 40); ring.rotateX(-Math.PI / 2);
      eAt(ctx, helperMat(hex, 0.7), ring, 0, 0.04, 0);
      ctx.meta.flag = team;
    } },
  { id: 'zone', n: 'Zona Hardpoint', cat: 'gioco', size: [7, 3, 7], rs: RS_XYZ, params: [{ k: 'name', n: 'Nome', type: 'text', def: 'Zona' }],
    build(ctx, o) {
      const [sx, sy, sz] = o.s, r = Math.max(sx, sz) / 2;
      eAt(ctx, helperMat('#f3ece1', 0.14), new THREE.CylinderGeometry(r, r, sy, 40, 1, true), 0, sy / 2, 0);
      const ring = new THREE.RingGeometry(r - 0.12, r, 48); ring.rotateX(-Math.PI / 2);
      eAt(ctx, helperMat('#ffffff', 0.85), ring, 0, 0.05, 0);
      ctx.meta.zone = { r, h: sy, name: sanitizeName((o.a && o.a.name) || 'Zona') || 'Zona' };
    } },
  { id: 'pad', n: 'Trampolino', cat: 'gioco', size: [1, 1, 1], rs: RS_NONE, params: [{ k: 'pow', n: 'Potenza', type: 'range', min: 8, max: 30, step: 1, def: 16, unit: '' }], tint: '#3ae8f0',
    build(ctx, o) {
      const glow = emat('neon_cyan', o.c);
      gAt(ctx, MAT.iron, new THREE.CylinderGeometry(0.8, 0.85, 0.14, 28), 0, 0.07, 0);
      const ring = new THREE.RingGeometry(0.55, 0.7, 32); ring.rotateX(-Math.PI / 2);
      gAt(ctx, glow, ring, 0, 0.145, 0);
      for (let i = 0; i < 3; i++) { const y = 0.146, z = 0.2 - i * 0.22; ctx.G.tri(glow, [-0.25, y, z], [0.25, y, z], [0, y, z - 0.18]); }
      ctx.solid(-0.8, 0, -0.8, 0.8, 0.14, 0.8, 'metal');
      ctx.meta.pad = { pow: clamp(+((o.a && o.a.pow) || 16), 4, 40), box: [-0.8, 0, -0.8, 0.8, 0.6, 0.8] };
    } },
  { id: 'tele_in', n: 'Teletrasporto (entrata)', cat: 'gioco', size: [1, 1, 1], rs: RS_NONE, params: [CH_PARAM],
    build(ctx, o) {
      const ch = clamp((o.a && o.a.ch) | 0 || 1, 1, 4), glow = emat('neon_white', CHANNEL_HEX[ch]);
      const ring = new THREE.TorusGeometry(0.85, 0.07, 10, 40); ring.scale(1, 1.3, 1);
      gAt(ctx, glow, ring, 0, 1.15, 0);
      gAt(ctx, MAT.iron, new THREE.CylinderGeometry(0.9, 0.95, 0.1, 28), 0, 0.05, 0);
      ctx.G.quad(helperMat(CHANNEL_HEX[ch], 0.25), [-0.8, 0.1, 0], [0.8, 0.1, 0], [0.8, 2.2, 0], [-0.8, 2.2, 0]);
      ctx.G.quad(helperMat(CHANNEL_HEX[ch], 0.25), [0.8, 0.1, 0], [-0.8, 0.1, 0], [-0.8, 2.2, 0], [0.8, 2.2, 0]);
      ctx.meta.tele = { ch, kind: 'in', box: [-0.7, 0, -0.45, 0.7, 2.2, 0.45] };
    } },
  { id: 'tele_out', n: 'Teletrasporto (uscita)', cat: 'gioco', size: [1, 1, 1], rs: RS_NONE, params: [CH_PARAM],
    build(ctx, o) {
      const ch = clamp((o.a && o.a.ch) | 0 || 1, 1, 4), glow = emat('neon_white', CHANNEL_HEX[ch]);
      const ring = new THREE.RingGeometry(0.6, 0.75, 32); ring.rotateX(-Math.PI / 2);
      gAt(ctx, MAT.iron, new THREE.CylinderGeometry(0.8, 0.85, 0.08, 28), 0, 0.04, 0);
      gAt(ctx, glow, ring, 0, 0.085, 0);
      floorArrow(ctx, helperMat(CHANNEL_HEX[ch], 0.95), 1.4, 0.1);
      ctx.solid(-0.8, 0, -0.8, 0.8, 0.08, 0.8, 'metal');
      ctx.meta.tele = { ch, kind: 'out' };
    } },
  { id: 'water', n: 'Acqua', cat: 'gioco', size: [6, 1.2, 6], rs: RS_XYZ,
    build(ctx, o) {
      const [sx, sy, sz] = o.s;
      ctx.G.quad(MAT.water, [-sx / 2, sy, sz / 2], [sx / 2, sy, sz / 2], [sx / 2, sy, -sz / 2], [-sx / 2, sy, -sz / 2]);
      volumeHelper(ctx, '#4fb3ff', sx, sy, sz, 0.08);
      ctx.meta.water = [-sx / 2, 0, -sz / 2, sx / 2, sy, sz / 2];
    } },
  { id: 'kill', n: 'Zona letale', cat: 'gioco', size: [6, 1, 6], rs: RS_XYZ,
    build(ctx, o) { const [sx, sy, sz] = o.s; volumeHelper(ctx, '#ff3040', sx, sy, sz, 0.16); ctx.meta.kill = [-sx / 2, 0, -sz / 2, sx / 2, sy, sz / 2]; } },
  { id: 'clip', n: 'Barriera invisibile', cat: 'gioco', size: [4, 3, 0.4], rs: RS_XYZ,
    build(ctx, o) { const [sx, sy, sz] = o.s; volumeHelper(ctx, '#7ad8ff', sx, sy, sz, 0.1); ctx.solid(-sx / 2, 0, -sz / 2, sx / 2, sy, sz / 2, 'stone', F_NORAY); } },
  { id: 'light', n: 'Luce', cat: 'gioco', size: [1, 1, 1], rs: RS_NONE, tint: '#ffd49a',
    params: [{ k: 'li', n: 'Intensità', type: 'range', min: 2, max: 60, step: 1, def: 14 }, { k: 'ld', n: 'Raggio', type: 'range', min: 4, max: 40, step: 1, def: 14, unit: ' m' }],
    build(ctx, o) {
      const hex = cleanHex(o.c) || '#ffd49a', a = o.a || {};
      eAt(ctx, helperMat(hex, 1, true), new THREE.SphereGeometry(0.16, 12, 8), 0, 0.4, 0);
      eAt(ctx, helperMat('#202020', 0.9), new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), 0, 0.2, 0);
      ctx.meta.light = { color: hex, intensity: clamp(+(a.li || 14), 1, 80), dist: clamp(+(a.ld || 14), 2, 60), y: 0.4 };
    } },
];
const CAT_BY_ID = Object.fromEntries(CATALOG.map((c) => [c.id, c]));
const CAT_GROUPS = [['forme', 'Forme'], ['oggetti', 'Oggetti'], ['gioco', 'Gioco']];

// ---------------------------------------------------------------- building one object
function newObj(kind, p) {
  const def = CAT_BY_ID[kind];
  const o = { k: kind, p: p ? p.slice() : [0, 0, 0], s: def.size.slice(), r: 0, m: def.mat || null, c: null, a: {} };
  for (const pr of def.params || []) o.a[pr.k] = pr.def;
  return o;
}
function objScale(o) { const def = CAT_BY_ID[o.k]; return def && def.rs === RS_U ? clamp(o.s[0] || 1, 0.25, 6) : 1; }
function objMatrix(o, out) {
  const u = objScale(o);
  return (out || new THREE.Matrix4()).compose(new THREE.Vector3(o.p[0], o.p[1], o.p[2]), new THREE.Quaternion().setFromAxisAngle(UP, o.r || 0), new THREE.Vector3(u, u, u));
}
// Builds geometry + collision for an object in its local frame.
function buildObject(o) {
  const def = CAT_BY_ID[o.k];
  const ctx = new MapCtx(mulberry32((o.seed >>> 0) || hashStr(o.k)));
  ctx.E = new GeoBuilder();
  ctx.meta = {};
  if (!def) return ctx;
  const m = def.mat !== null && def.mat !== undefined ? emat(o.m || def.mat, o.c) : null;
  try { def.build(ctx, o, m); } catch (e) { console.error('build', o.k, e); }
  return ctx;
}
// Adds an object's collision to a CollisionWorld in world space. Boxes on
// objects rotated by a non-right angle are sliced into small AABBs (movement)
// plus exact triangles (bullets).
function addObjCollision(W, o, ctx, M) {
  M = M || objMatrix(o);
  const yaw = ((o.r || 0) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2);
  const ortho = yaw < 1e-3 || Math.PI / 2 - yaw < 1e-3;
  const v = new THREE.Vector3();
  const aabb = (x0, y0, z0, x1, y1, z1) => {
    let ax = Infinity, ay = Infinity, az = Infinity, bx = -Infinity, by = -Infinity, bz = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0).applyMatrix4(M);
      ax = Math.min(ax, v.x); ay = Math.min(ay, v.y); az = Math.min(az, v.z); bx = Math.max(bx, v.x); by = Math.max(by, v.y); bz = Math.max(bz, v.z);
    }
    return [ax, ay, az, bx, by, bz];
  };
  for (const b of ctx.boxes) {
    const [x0, y0, z0, x1, y1, z1, surf, flags] = b;
    if (ortho) { const a = aabb(x0, y0, z0, x1, y1, z1); W.add(a[0], a[1], a[2], a[3], a[4], a[5], surf, flags); continue; }
    if (!(flags & F_NOCOLLIDE)) {
      const lx = x1 - x0, lz = z1 - z0, alongX = lx >= lz;
      const n = clamp(Math.ceil(Math.max(lx, lz) * objScale(o) / 0.35), 1, 80);
      for (let i = 0; i < n; i++) {
        const a = alongX ? aabb(x0 + lx * i / n, y0, z0, x0 + lx * (i + 1) / n, y1, z1) : aabb(x0, y0, z0 + lz * i / n, x1, y1, z0 + lz * (i + 1) / n);
        W.add(a[0], a[1], a[2], a[3], a[4], a[5], surf, (flags | F_NORAY) & ~F_NOCOLLIDE);
      }
    }
    if (!(flags & F_NORAY)) {
      const P = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
      const c = [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)];
      for (const [a, bb, cc, d] of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]]) { W.addTri(c[a], c[bb], c[cc], surf); W.addTri(c[a], c[cc], c[d], surf); }
    }
  }
  for (const t of ctx.tris) W.addTri(new THREE.Vector3(...t[0]).applyMatrix4(M), new THREE.Vector3(...t[1]).applyMatrix4(M), new THREE.Vector3(...t[2]).applyMatrix4(M), t[3]);
}
// world-space AABB of a local box under the object's transform
function xfBox(b, M) {
  const v = new THREE.Vector3();
  let ax = Infinity, ay = Infinity, az = Infinity, bx = -Infinity, by = -Infinity, bz = -Infinity;
  for (let i = 0; i < 8; i++) {
    v.set(i & 1 ? b[3] : b[0], i & 2 ? b[4] : b[1], i & 4 ? b[5] : b[2]).applyMatrix4(M);
    ax = Math.min(ax, v.x); ay = Math.min(ay, v.y); az = Math.min(az, v.z); bx = Math.max(bx, v.x); by = Math.max(by, v.y); bz = Math.max(bz, v.z);
  }
  return [ax, ay, az, bx, by, bz];
}
