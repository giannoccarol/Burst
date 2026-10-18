// ===================================================================
// Buildings and props
// ===================================================================
// GLB props of this map (see MapProps in 04j_mapprops.js): id -> { file, fit: [axis, metres], rot: degrees, maps }
const PROP_GLB_BORGO = {
  vespa: { file: 'p_vespa_worn.glb', fit: ['x', 1.8], rot: 90, maps: ['borgo'] },
  fiat500: { file: 'p_fiat500_1966.glb', fit: ['x', 2.97], rot: -90, maps: ['borgo'] },
  fiat132: { file: 'p_fiat132_abandoned.glb', fit: ['x', 4.4], rot: 90, maps: ['borgo'] },
  cafeSet: { file: 'p_cafe_set.glb', fit: ['y', 0.95], rot: 0, maps: ['borgo', 'villette'] },
  umbrella: { file: 'p_patio_umbrella.glb', fit: ['y', 2.6], rot: 0, maps: ['borgo', 'villette'] },
  stall: { file: 'p_market_stall.glb', fit: ['y', 2.4], rot: 0, maps: ['borgo'] },
  wineBarrel: { file: 'p_wine_barrel.glb', fit: ['max', 1.2], rot: 90, maps: ['borgo'] },
  barrels: { file: 'p_barrels_wood.glb', fit: ['y', 1.0], rot: 0, maps: ['borgo'] },
  amphora: { file: 'p_amphora_byz.glb', fit: ['y', 0.6], rot: 0, maps: ['borgo'], shadow: false },
  pots: { file: 'p_pots_old.glb', fit: ['max', 0.9], rot: 0, maps: ['borgo'], shadow: false },
  plant: { file: 'p_plant_med_flower.glb', fit: ['y', 0.9], rot: 0, maps: ['borgo'] },
  geranium: { file: 'p_geranium.glb', fit: ['y', 0.45], rot: 0, maps: ['borgo'], shadow: false },
  bench: { file: 'p_bench_aged.glb', fit: ['z', 1.65], rot: 0, maps: ['borgo'] },
  streetLamp: { file: 'p_street_lamp.glb', fit: ['y', 4.2], rot: 180, maps: ['borgo'] },
  bicycle: { file: 'p_bicycle_rusty.glb', fit: ['x', 1.75], rot: 90, maps: ['borgo'] },
  well: { file: 'p_well_bucket.glb', fit: ['y', 3.0], rot: 0, maps: ['borgo'] },
  laundry: { file: 'p_laundry_line.glb', fit: ['x', 7.0], rot: 90, maps: ['borgo', 'villette'] },
  cypress: { file: 'p_cypress.glb', fit: ['y', 9.0], rot: 0, maps: ['borgo'] },
  crates: { file: 'p_crates_bumstrum.glb', fit: ['y', 1.0], rot: 0, maps: ['borgo', 'villette'] },
  boxes: { file: 'p_wooden_boxes.glb', fit: ['y', 0.6], rot: 0, maps: ['borgo'] },
  floorSign: { file: 'p_floor_sign.glb', fit: ['y', 1.0], rot: 90, maps: ['borgo'], shadow: false },
};

const SIDE_FACE = { n: 'nz', s: 'pz', e: 'px', w: 'nx' };

// --- GLB prop helpers ----------------------------------------------------
// Procedural visuals that use the map rng are drawn into this sink when a GLB model replaces them:
// the rng sequence (so every later random detail of the map) stays the same whether or not a file has arrived.
// The sink also swallows the collisions those procedural helpers add themselves (the callers add their own).
const NULL_GEO = new Proxy({}, { get: () => () => {} });
function sinkDraw(ctx, fn) {
  const G = ctx.G; ctx.G = NULL_GEO;
  const nop = () => {}; ctx.solid = nop; ctx.rayTri = nop; ctx.rayQuad = nop;
  try { fn(); } finally { ctx.G = G; delete ctx.solid; delete ctx.rayTri; delete ctx.rayQuad; }
}
// A model whose material uses KHR_materials_transmission makes three.js render the whole scene once more
// into a transmission buffer (~8 ms of GPU at 1080p for the Fiat 132's dirty windows): make it opaque.
// point (lx, lz) of a frame at (x, z) rotated by `rot` about Y (same convention as Matrix4.makeRotationY)
function rotXZ(x, z, rot, lx, lz) { const c = Math.cos(rot), s = Math.sin(rot); return [x + lx * c + lz * s, z - lx * s + lz * c]; }
// collision of a local box [x0,x1]x[z0,z1] rotated by `rot` around (x, z): one AABB near right angles,
// otherwise slices of <= 0.5 m along the long side (their AABBs hug the rotated box)
function solidRot(ctx, x, z, rot, x0, x1, z0, z1, y0, y1, surf = 'wood', flags = 0) {
  const q = rot / (Math.PI / 2), off = Math.abs(q - Math.round(q)) * Math.PI / 2;
  const alongX = x1 - x0 >= z1 - z0, L = alongX ? x1 - x0 : z1 - z0;
  const n = off < 0.03 ? 1 : Math.max(1, Math.ceil(L / 0.5));
  for (let i = 0; i < n; i++) {
    const a0 = (alongX ? x0 : z0) + L * i / n, a1 = (alongX ? x0 : z0) + L * (i + 1) / n;
    const cs = alongX ? [[a0, z0], [a1, z0], [a1, z1], [a0, z1]] : [[x0, a0], [x1, a0], [x1, a1], [x0, a1]];
    const w = cs.map(([lx, lz]) => rotXZ(x, z, rot, lx, lz));
    ctx.solid(Math.min(...w.map((p) => p[0])), y0, Math.min(...w.map((p) => p[1])), Math.max(...w.map((p) => p[0])), y1, Math.max(...w.map((p) => p[1])), surf, flags);
  }
}

function house(ctx, o) {
  const x0 = o.x0, z0 = o.z0, x1 = o.x1, z1 = o.z1, h = o.h, y0 = o.y0 || 0;
  const wallMat = MAT['plaster_' + (o.color || 'crema')] || o.wallMat;
  const sh = o.shutter === null ? null : MAT['shutter_' + (o.shutter || 'verde')];
  const floors = o.floors || Math.max(1, Math.round((h - 0.4) / 3.3));
  const fh = (h - 0.3) / floors;
  const skip = o.skip || '';
  const roof = o.roof || 'hip';
  let skipFaces = 'ny';
  for (const k of 'nsew') if (skip.indexOf(k) >= 0) skipFaces += ',' + SIDE_FACE[k];
  if (roof !== 'flat') skipFaces += ',py';
  ctx.G.box(wallMat, x0, y0, z0, x1, y0 + h, z1, { skip: skipFaces, uo: [ctx.r() * 7, ctx.r() * 7] });
  if (o.collide !== false) ctx.solid(x0, y0, z0, x1, y0 + h, z1, 'stone');
  for (const side of ['n', 's', 'e', 'w']) {
    if (skip.indexOf(side) >= 0) continue;
    const fo = (o.faces && o.faces[side]) || {};
    if (fo.plain) continue;
    const F = facade(x0, z0, x1, z1, side, y0);
    if (o.plinth !== false && fo.minY == null) plinth(ctx, F, fo.plinthH || 0.6, o.plinthMat || MAT.stone);
    if (o.quoins) quoins(ctx, F, 0.65, h - 0.35);
    const sp = fo.spacing || 3.0;
    const cols = fo.cols != null ? fo.cols : Math.max(1, Math.floor((F.L - 1.2) / sp) + 1);
    const span = (cols - 1) * sp;
    const m0 = (F.L - span) / 2;
    const doors = fo.doors || [];
    const shops = fo.shops || [];
    const blocked = (s, fl) => {
      if (fl > 0) return false;
      if (fo.ground === false) return true;
      for (const d of doors) if (Math.abs(d.s - s) < (d.w || 1.3) / 2 + 0.9) return true;
      for (const p of shops) if (s > p.s0 - 0.8 && s < p.s1 + 0.8) return true;
      return false;
    };
    for (let fl = 0; fl < floors; fl++) {
      const wy = fl === 0 ? 1.05 : fl * fh + 0.8;
      if (fl > 0 && o.stringCourse !== false) stringCourse(ctx, F, fl * fh - 0.05);
      if (fo.top === false && fl > 0) continue;
      if (fo.minY != null && y0 + wy < fo.minY) continue;
      for (let c = 0; c < cols; c++) {
        const s = m0 + c * sp;
        if (s < 0.7 || s > F.L - 0.7) continue;
        if (blocked(s, fl)) continue;
        if (fo.skipCols && fo.skipCols.includes(c)) continue;
        const isBalc = fl > 0 && (fo.balconies ? fo.balconies.includes(c + ':' + fl) : (fl === 1 && ctx.r() < (o.balconyChance || 0.18)));
        if (isBalc) balcony(ctx, F, s, fl * fh + 0.05, 1.7, sh);
        else windowUnit(ctx, F, s, wy, { shutter: sh, h: fl === 0 ? 1.45 : WIN_H });
      }
    }
    for (const d of doors) doorUnit(ctx, F, d.s, d);
    for (const p of shops) shopFront(ctx, F, p);
    if (o.cornice !== false) cornice(ctx, F, h - 0.25);
    if (fo.drain !== false && ctx.r() < 0.5) drainPipe(ctx, F, ctx.r() < 0.5 ? 0.25 : F.L - 0.25, 0.1, h - 0.1);
    if (fo.lamp) wallLamp(ctx, F, fo.lamp, 3.4);
    if (fo.extra) fo.extra(F);
  }
  const ey = y0 + h;
  if (roof === 'hip') roofHip(ctx, x0, z0, x1, z1, ey, o.roofH || Math.min(x1 - x0, z1 - z0) * 0.24, 0.5);
  else if (roof === 'gable-x') roofGable(ctx, x0, z0, x1, z1, ey, o.roofH || (z1 - z0) * 0.24, 'x', 0.45, wallMat);
  else if (roof === 'gable-z') roofGable(ctx, x0, z0, x1, z1, ey, o.roofH || (x1 - x0) * 0.24, 'z', 0.45, wallMat);
  else if (roof === 'flat') {
    const p = 0.25;
    ctx.G.box(wallMat, x0, ey, z0, x1, ey + 0.6, z0 + p);
    ctx.G.box(wallMat, x0, ey, z1 - p, x1, ey + 0.6, z1);
    ctx.G.box(wallMat, x0, ey, z0, x0 + p, ey + 0.6, z1);
    ctx.G.box(wallMat, x1 - p, ey, z0, x1, ey + 0.6, z1);
    ctx.G.box(MAT.stoneTrim, x0 - 0.05, ey + 0.6, z0 - 0.05, x1 + 0.05, ey + 0.68, z1 + 0.05, { skip: 'ny' });
  }
  if (o.chimney !== false && roof !== 'flat' && ctx.r() < 0.8) {
    const cx = lerp(x0 + 1, x1 - 1, ctx.r()), cz = lerp(z0 + 1, z1 - 1, ctx.r());
    chimney(ctx, cx, cz, ey + (o.roofH || 1.5) * 0.6, 1.4);
  }
}

function shopFront(ctx, F, p) {
  const h = p.h || 2.8, s0 = p.s0, s1 = p.s1;
  const trim = p.trim || MAT.woodDark;
  fbox(ctx, F, trim, s0 - 0.18, s0, 0, h + 0.1, 0, 0.12);
  fbox(ctx, F, trim, s1, s1 + 0.18, 0, h + 0.1, 0, 0.12);
  fbox(ctx, F, trim, s0 - 0.25, s1 + 0.25, h, h + 0.22, 0, 0.16);
  fbox(ctx, F, MAT.stone, s0, s1, 0, 0.5, 0, 0.06);
  fquad(ctx, F, MAT.glassShop, s0, s1, 0.5, h, 0.02);
  const mid = (s0 + s1) / 2;
  const nm = Math.max(1, Math.round((s1 - s0) / 1.4));
  for (let i = 1; i < nm; i++) { const ss = s0 + (s1 - s0) * i / nm; fbox(ctx, F, trim, ss - 0.04, ss + 0.04, 0.5, h, 0.02, 0.07); }
  fbox(ctx, F, trim, s0, s1, 0.5, 0.56, 0.02, 0.08);
  if (p.sign) signBoard(ctx, F, mid, h + 0.32, Math.min(s1 - s0 + 0.2, p.signW || 3.2), 0.6, p.sign, 0.12);
  if (p.awning) awning(ctx, F, s0 - 0.1, s1 + 0.1, h + 0.25, 1.3, 0.55, p.awning);
}

// --- props ------------------------------------------------------------
function crate(ctx, x, y, z, s = 1.1, rot = 0) {
  ctx.G.box(MAT.crate, x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, { local: true });
  ctx.solid(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, 'wood');
}
function barrel(ctx, x, z, y = 0) {
  barrelVis(ctx, x, z, y);
  ctx.solid(x - 0.4, y, z - 0.4, x + 0.4, y + 1.05, z + 0.4, 'wood');
}
function barrelVis(ctx, x, z, y = 0) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.36 + Math.sin(t * Math.PI) * 0.06, t * 1.05)); }
  const g = new THREE.LatheGeometry(pts, 16);
  ctx.G.geom(MAT.wood, g, new THREE.Matrix4().makeTranslation(x, y, z), { uvScale: 2 });
  for (const hy of [0.12, 0.5, 0.92]) {
    const ring = new THREE.CylinderGeometry(0.4 + (hy === 0.5 ? 0.025 : 0), 0.4 + (hy === 0.5 ? 0.025 : 0), 0.06, 16, 1, true);
    ctx.G.geom(MAT.metal, ring, new THREE.Matrix4().makeTranslation(x, y + hy, z));
  }
  const lid = new THREE.CircleGeometry(0.37, 16); lid.rotateX(-Math.PI / 2);
  ctx.G.geom(MAT.wood, lid, new THREE.Matrix4().makeTranslation(x, y + 1.04, z));
}
// wine barrel lying on its cradle, tap toward local +x (a standing barrel until the model is in)
function wineBarrel(ctx, x, z, rot, y = 0) {
  if (!MapProps.put(ctx, 'wineBarrel', x, y, z, rot)) barrelVis(ctx, x, z, y);
  solidRot(ctx, x, z, rot, -0.6, 0.5, -0.45, 0.45, y, y + 1.05, 'wood');
}
// four barrels in a row along local x (3.8 m)
function barrelRow(ctx, x, z, rot) {
  if (!MapProps.put(ctx, 'barrels', x, 0, z, rot)) for (const t of [-1.4, -0.47, 0.47, 1.4]) { const p = rotXZ(x, z, rot, t, 0); barrelVis(ctx, p[0], p[1]); }
  solidRot(ctx, x, z, rot, -1.9, 1.9, -0.44, 0.44, 0, 0.98, 'wood');
}
// cast-iron bench (GLB, 1.65 m) along `axis`; `face` = direction the sitter looks: '+z', '-z', '+x', '-x'
function bench(ctx, x, z, axis = 'x', face) {
  face = face || (axis === 'x' ? '+z' : '+x');
  const rot = { '+x': 0, '-x': Math.PI, '+z': -Math.PI / 2, '-z': Math.PI / 2 }[face];
  if (!MapProps.put(ctx, 'bench', x, 0, z, rot)) {
    // stone bench of the same size until the model is in
    const len = 1.65, hw = axis === 'x' ? len / 2 : 0.3, hd = axis === 'x' ? 0.3 : len / 2;
    ctx.G.box(MAT.stoneTrim, x - hw, 0.4, z - hd, x + hw, 0.48, z + hd);
    for (const t of [-0.75, 0.75]) {
      const ox = axis === 'x' ? t * hw : 0, oz = axis === 'x' ? 0 : t * hd;
      ctx.G.box(MAT.stone, x + ox - (axis === 'x' ? 0.12 : 0.22), 0, z + oz - (axis === 'x' ? 0.22 : 0.12), x + ox + (axis === 'x' ? 0.12 : 0.22), 0.4, z + oz + (axis === 'x' ? 0.22 : 0.12));
    }
  }
  // seat and legs, then the backrest along the back edge (local -x)
  solidRot(ctx, x, z, rot, -0.3, 0.38, -0.82, 0.82, 0, 0.48, 'wood');
  solidRot(ctx, x, z, rot, -0.39, -0.2, -0.82, 0.82, 0.48, 1.0, 'wood');
}
function bollard(ctx, x, z) {
  const g = new THREE.CylinderGeometry(0.11, 0.14, 0.8, 10);
  ctx.G.geom(MAT.stone, g, new THREE.Matrix4().makeTranslation(x, 0.4, z), { worldUV: true });
  const c = new THREE.SphereGeometry(0.12, 10, 6, 0, TAU, 0, Math.PI / 2);
  ctx.G.geom(MAT.stone, c, new THREE.Matrix4().makeTranslation(x, 0.8, z), { worldUV: true });
  ctx.solid(x - 0.14, 0, z - 0.14, x + 0.14, 0.9, z + 0.14, 'stone');
}
// cast-iron street lamp (GLB, 4.2 m) with its pole at (x, z) and the lantern arm toward angle `face`
function streetLamp(ctx, x, z, face = 0, y = 0) {
  const h = 3.6, o = rotXZ(x, z, face, 0.205, 0); // the model's pole is 0.205 m behind its centre
  if (!MapProps.put(ctx, 'streetLamp', o[0], y, o[1], face)) {
    const base = new THREE.CylinderGeometry(0.16, 0.2, 0.5, 10);
    ctx.G.geom(MAT.iron, base, new THREE.Matrix4().makeTranslation(x, y + 0.25, z));
    const pole = new THREE.CylinderGeometry(0.05, 0.07, h, 8);
    ctx.G.geom(MAT.iron, pole, new THREE.Matrix4().makeTranslation(x, y + h / 2, z));
    const cage = new THREE.CylinderGeometry(0.2, 0.13, 0.45, 6, 1, true);
    ctx.G.geom(MAT.lampGlass, cage, new THREE.Matrix4().makeTranslation(x, y + h + 0.25, z));
    const cap = new THREE.ConeGeometry(0.28, 0.25, 6);
    ctx.G.geom(MAT.iron, cap, new THREE.Matrix4().makeTranslation(x, y + h + 0.6, z));
  }
  ctx.solid(x - 0.12, y, z - 0.12, x + 0.12, y + 3.9, z + 0.12, 'metal');
}
// café table with two chairs (GLB; chairs along local z) and an optional standing umbrella beside it (local +x)
function cafeSet(ctx, x, z, umbrella = true, rot) {
  const angs = [0, 1, 2].map((i) => i * TAU / 3 + ctx.r() * 0.5); // always drawn from the rng (see sinkDraw)
  if (rot === undefined) rot = angs[0];
  if (!MapProps.put(ctx, 'cafeSet', x, 0, z, rot)) {
    const top = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16);
    ctx.G.geom(MAT.marble, top, new THREE.Matrix4().makeTranslation(x, 0.74, z));
    const leg = new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6);
    ctx.G.geom(MAT.iron, leg, new THREE.Matrix4().makeTranslation(x, 0.36, z));
    const foot = new THREE.CylinderGeometry(0.22, 0.25, 0.03, 12);
    ctx.G.geom(MAT.iron, foot, new THREE.Matrix4().makeTranslation(x, 0.015, z));
    for (const a of angs) chair(ctx, x + Math.cos(a) * 0.75, z + Math.sin(a) * 0.75, a + Math.PI);
  }
  ctx.solid(x - 0.4, 0, z - 0.4, x + 0.4, 0.75, z + 0.4, 'metal');
  if (umbrella) {
    const [ux, uz] = rotXZ(x, z, rot, 0.78, 0);
    if (!MapProps.put(ctx, 'umbrella', ux, 0, uz, rot)) {
      const pole = new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6);
      ctx.G.geom(MAT.woodDark, pole, new THREE.Matrix4().makeTranslation(ux, 1.15, uz));
      const canopy = new THREE.ConeGeometry(1.4, 0.45, 8, 1, true);
      ctx.G.geom(MAT.fabric('#e8dcc0'), canopy, new THREE.Matrix4().makeTranslation(ux, 2.2, uz), { uvScale: 2 });
    }
    ctx.solid(ux - 0.1, 0, uz - 0.1, ux + 0.1, 1.9, uz + 0.1, 'metal');
  }
}
function chair(ctx, x, z, ang) {
  const m = new THREE.Matrix4().makeRotationY(-ang).setPosition(x, 0, z);
  const add = (g, mm) => ctx.G.geom(MAT.iron, g, m.clone().multiply(mm));
  add(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 12), new THREE.Matrix4().makeTranslation(0, 0.46, 0));
  for (const [dx, dz] of [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 4), new THREE.Matrix4().makeTranslation(dx, 0.23, dz));
  const back = new THREE.TorusGeometry(0.18, 0.012, 4, 12, Math.PI);
  add(back, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(-0.17, 0.62, 0));
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 4), new THREE.Matrix4().makeTranslation(-0.17, 0.62, 0.17));
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 4), new THREE.Matrix4().makeTranslation(-0.17, 0.62, -0.17));
}
// market stall (GLB 4.4 x 2.4 m with a barrel at one end): the produce faces local +z of the
// procedural stall, i.e. the model (front = its local +x) is turned by rotY - 90 degrees
function marketStall(ctx, x, z, rotY, awningMat) {
  const g = rotY - Math.PI / 2;
  if (MapProps.put(ctx, 'stall', x, 0, z, g)) sinkDraw(ctx, () => marketStallVis(ctx, x, z, rotY, awningMat));
  else marketStallVis(ctx, x, z, rotY, awningMat);
  // counter with the produce, the canvas back wall (down to the ground), the barrel (model frame)
  solidRot(ctx, x, z, g, 0.05, 1.1, -2.12, 1.5, 0, 0.9, 'wood');
  solidRot(ctx, x, z, g, -1.2, -0.85, -2.12, 1.5, 0, 2.2, 'wood');
  solidRot(ctx, x, z, g, 0.45, 1.1, 1.5, 2.18, 0, 0.75, 'wood');
}
function marketStallVis(ctx, x, z, rotY, awningMat) {
  const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, 0, z);
  const B = (mat, x0, y0, z0, x1, y1, z1) => {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    ctx.G.geom(mat, g, m.clone().multiply(new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)), { worldUV: true });
  };
  B(MAT.wood, -1.6, 0.85, -0.7, 1.6, 0.92, 0.7);
  for (const [px, pz] of [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]]) B(MAT.woodDark, px - 0.05, 0, pz - 0.05, px + 0.05, 0.85, pz + 0.05);
  for (const [px, pz] of [[-1.55, -0.65], [1.55, -0.65]]) B(MAT.woodDark, px - 0.04, 0, pz - 0.04, px + 0.04, 2.45, pz + 0.04);
  for (const [px, pz] of [[-1.55, 0.65], [1.55, 0.65]]) B(MAT.woodDark, px - 0.04, 0, pz - 0.04, px + 0.04, 2.15, pz + 0.04);
  // produce crates
  for (let i = 0; i < 4; i++) {
    const cx = -1.15 + i * 0.77;
    B(MAT.wood, cx - 0.34, 0.92, -0.45, cx + 0.34, 1.08, 0.45);
    const pm = ctx.pick(MAT.produce);
    const fruit = new THREE.IcosahedronGeometry(0.075, 1);
    for (let k = 0; k < 14; k++) {
      const fx = cx + (ctx.r() - 0.5) * 0.55, fz = (ctx.r() - 0.5) * 0.78, fy = 1.1 + ctx.r() * 0.05;
      ctx.G.geom(pm, fruit, m.clone().multiply(new THREE.Matrix4().makeTranslation(fx, fy, fz)));
    }
  }
  // awning (sloped)
  const P = (px, py, pz) => new THREE.Vector3(px, py, pz).applyMatrix4(m).toArray();
  const a = P(-1.75, 2.5, -0.85), b = P(1.75, 2.5, -0.85), c = P(1.75, 2.15, 0.95), d = P(-1.75, 2.15, 0.95);
  ctx.G.quad(awningMat, d, c, b, a, [[0, 0], [1.75, 0], [1.75, 1], [0, 1]]);
  ctx.G.quad(awningMat, a, b, c, d, [[0, 1], [1.75, 1], [1.75, 0], [0, 0]]);
}
function kiosk(ctx, x, z, rotY) {
  const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, 0, z);
  const B = (mat, x0, y0, z0, x1, y1, z1) => {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    ctx.G.geom(mat, g, m.clone().multiply(new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)), { worldUV: true });
  };
  B(MAT.paintGreen, -1.1, 0, -0.9, 1.1, 2.4, 0.9);
  B(MAT.paintGreen, -1.4, 2.4, -1.25, 1.4, 2.55, 1.25);
  B(MAT.metal, -1.25, 2.55, -1.1, 1.25, 2.75, 1.1);
  // magazine racks on the front
  const colors = ['#c43b2f', '#2f6fb0', '#e8c13a', '#3a8a4f', '#d9d4c7', '#8a3b8f', '#e07a2f'];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
    const mat = MAT.fabric(colors[(r * 6 + c * 3) % colors.length]);
    B(mat, -1.0 + c * 0.34, 0.9 + r * 0.42, 0.9, -0.72 + c * 0.34, 1.26 + r * 0.42, 0.93);
  }
  B(MAT.glassShop, -0.9, 1.0, -0.91, 0.9, 2.1, -0.9);
  const P = (px, pz) => new THREE.Vector3(px, 0, pz).applyMatrix4(m);
  const cs = [P(-1.1, -0.9), P(1.1, -0.9), P(1.1, 0.9), P(-1.1, 0.9)];
  ctx.solid(Math.min(...cs.map((q) => q.x)), 0, Math.min(...cs.map((q) => q.z)), Math.max(...cs.map((q) => q.x)), 2.75, Math.max(...cs.map((q) => q.z)), 'metal');
}
// potted plant: lemon trees stay procedural, the others are the flowering GLB plant (pot 0.5 m)
function pottedPlant(ctx, x, z, s = 1, lemon = false) {
  if (!lemon) {
    if (MapProps.put(ctx, 'plant', x, 0, z, 0, { s })) sinkDraw(ctx, () => pottedPlantVis(ctx, x, z, s, false));
    else pottedPlantVis(ctx, x, z, s, false);
    ctx.solid(x - 0.2 * s, 0, z - 0.27 * s, x + 0.32 * s, 0.4 * s, z + 0.22 * s, 'stone');
    return;
  }
  pottedPlantVis(ctx, x, z, s, true);
  ctx.solid(x - 0.32 * s, 0, z - 0.32 * s, x + 0.32 * s, 0.55 * s, z + 0.32 * s, 'stone');
}
function pottedPlantVis(ctx, x, z, s, lemon) {
  const pot = new THREE.CylinderGeometry(0.32 * s, 0.24 * s, 0.55 * s, 14);
  ctx.G.geom(MAT.terracottaPot, pot, new THREE.Matrix4().makeTranslation(x, 0.275 * s, z));
  const rim = new THREE.TorusGeometry(0.32 * s, 0.035 * s, 6, 16); rim.rotateX(Math.PI / 2);
  ctx.G.geom(MAT.terracottaPot, rim, new THREE.Matrix4().makeTranslation(x, 0.55 * s, z));
  if (lemon) {
    const trunk = new THREE.CylinderGeometry(0.03, 0.04, 0.8 * s, 6);
    ctx.G.geom(MAT.bark, trunk, new THREE.Matrix4().makeTranslation(x, 0.9 * s, z));
    leafBall(ctx, x, 1.55 * s, z, 0.5 * s, 26, MAT.leaves2);
    const fruit = new THREE.IcosahedronGeometry(0.05, 1);
    for (let i = 0; i < 9; i++) {
      const a = ctx.r() * TAU, e = (ctx.r() - 0.3) * 1.2, rr = 0.45 * s;
      ctx.G.geom(MAT.produce[1], fruit, new THREE.Matrix4().makeTranslation(x + Math.cos(a) * Math.cos(e) * rr, 1.55 * s + Math.sin(e) * rr, z + Math.sin(a) * Math.cos(e) * rr));
    }
  } else {
    leafBall(ctx, x, 0.85 * s, z, 0.38 * s, 18, MAT.leaves2);
  }
}
// cluster of alpha-tested leaf cards
function leafBall(ctx, x, y, z, r, n, mat, flat = 1) {
  const g = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < n; i++) {
    const u = ctx.r() * 2 - 1, a = ctx.r() * TAU;
    const rr = Math.cbrt(ctx.r()) * r;
    const px = x + Math.sqrt(1 - u * u) * Math.cos(a) * rr, py = y + u * rr * flat, pz = z + Math.sqrt(1 - u * u) * Math.sin(a) * rr;
    const s = r * (0.7 + ctx.r() * 0.5);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(ctx.r() * TAU, ctx.r() * TAU, ctx.r() * TAU));
    ctx.G.geom(mat, g, new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(s, s, s)));
  }
}
function tree(ctx, x, z, o = {}) {
  const h = o.h || 5, r = o.r || 2.6, mat = o.leaves || MAT.leaves2;
  // trunk: a few bent cylinder segments
  let px = x, pz = z, py = 0, rad = o.trunkR || 0.22;
  const segs = 4;
  for (let i = 0; i < segs; i++) {
    const nx = px + (ctx.r() - 0.5) * 0.5, nz = pz + (ctx.r() - 0.5) * 0.5, ny = py + h * 0.55 / segs;
    rod(ctx, MAT.bark, [px, py, pz], [nx, ny + 0.05, nz], rad, 9);
    px = nx; pz = nz; py = ny; rad *= 0.86;
  }
  // branches
  const tops = [];
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5 + ctx.r();
    const bx = px + Math.cos(a) * r * 0.55, bz = pz + Math.sin(a) * r * 0.55, by = py + h * 0.25 + ctx.r() * h * 0.15;
    rod(ctx, MAT.bark, [px, py, pz], [bx, by, bz], rad * 0.6, 6);
    tops.push([bx, by, bz]);
  }
  for (const t of tops) leafBall(ctx, t[0], t[1] + 0.3, t[2], r * 0.55, o.cards || 40, mat, 0.6);
  leafBall(ctx, px, py + h * 0.38, pz, r * 0.7, (o.cards || 40) + 10, mat, 0.6);
  ctx.solid(x - 0.3, 0, z - 0.3, x + 0.3, h * 0.55, z + 0.3, 'wood');
}
function cypressGeometry() {
  const pts = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(Math.max(0.02, Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9) * 0.55 * (1 - t * 0.25)), t)); }
  const g = new THREE.LatheGeometry(pts, 10);
  const pos = g.attributes.position;
  const rng = mulberry32(99);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + (Math.sin(y * 23 + Math.atan2(z, x) * 3) * 0.08 + (rng() - 0.5) * 0.12);
    pos.setXYZ(i, x * n, y, z * n);
  }
  g.computeVertexNormals();
  return g;
}
// garden cypress (GLB, 9 m x s); `skipTree` = options of the procedural tree it replaced, whose rng draws
// are still consumed so the rest of the map keeps its random details
function cypress(ctx, x, z, s = 1, skipTree) {
  if (skipTree) sinkDraw(ctx, () => tree(ctx, x, z, skipTree));
  if (!MapProps.put(ctx, 'cypress', x, 0, z, 0, { s })) {
    const h = 9 * s;
    ctx.G.geom(MAT.cypress, cypressGeometry(), new THREE.Matrix4().makeScale(h * 0.2, h, h * 0.2).setPosition(x, 0, z));
  }
  ctx.solid(x - 0.4 * s, 0, z - 0.4 * s, x + 0.4 * s, 7 * s, z + 0.4 * s, 'wood');
}
function well(ctx, x, z) {
  // stone well with roof and bucket (GLB): its dark footing goes below the ground
  if (!MapProps.put(ctx, 'well', x, -0.38, z, 0)) wellVis(ctx, x, z);
  ctx.solid(x - 0.87, 0, z - 0.9, x + 0.87, 0.98, z + 0.84, 'stone');
  for (const [z0, z1] of [[-0.8, -0.6], [0.58, 0.78]]) ctx.solid(x - 0.12, 0.98, z + z0, x + 0.12, 1.75, z + z1, 'wood');
  ctx.solid(x - 0.6, 1.75, z - 0.93, x + 0.6, 2.62, z + 0.93, 'wood');
}
function wellVis(ctx, x, z) {
  const ring = new THREE.CylinderGeometry(0.95, 1.0, 0.85, 20, 1, true);
  ctx.G.geom(MAT.rubble, ring, new THREE.Matrix4().makeTranslation(x, 0.425, z), { worldUV: true });
  const inner = new THREE.CylinderGeometry(0.72, 0.72, 0.85, 20, 1, true);
  inner.scale(-1, 1, 1);
  ctx.G.geom(MAT.rubble, inner, new THREE.Matrix4().makeTranslation(x, 0.425, z), { worldUV: true });
  const top = new THREE.RingGeometry(0.7, 1.05, 20); top.rotateX(-Math.PI / 2);
  ctx.G.geom(MAT.stoneTrim, top, new THREE.Matrix4().makeTranslation(x, 0.86, z), { worldUV: true });
  const dark = new THREE.CircleGeometry(0.72, 20); dark.rotateX(-Math.PI / 2);
  ctx.G.geom(MAT.dark, dark, new THREE.Matrix4().makeTranslation(x, 0.45, z));
  rod(ctx, MAT.iron, [x - 0.9, 0.86, z], [x - 0.9, 2.3, z], 0.04);
  rod(ctx, MAT.iron, [x + 0.9, 0.86, z], [x + 0.9, 2.3, z], 0.04);
  const arch = new THREE.TorusGeometry(0.9, 0.035, 6, 16, Math.PI);
  ctx.G.geom(MAT.iron, arch, new THREE.Matrix4().makeTranslation(x, 2.3, z));
  const wheel = new THREE.TorusGeometry(0.16, 0.03, 6, 14);
  ctx.G.geom(MAT.iron, wheel, new THREE.Matrix4().makeTranslation(x, 2.95, z));
}
// Fiat 500 (GLB, 2.97 m, front = local +x): body and cabin collisions
function car500(ctx, x, z, rotY) {
  if (!MapProps.put(ctx, 'fiat500', x, 0, z, rotY)) car500Vis(ctx, x, z, rotY);
  solidRot(ctx, x, z, rotY, -1.48, 1.48, -0.6, 0.6, 0, 0.82, 'metal');
  solidRot(ctx, x, z, rotY, -0.98, 0.62, -0.52, 0.52, 0.82, 1.22, 'metal');
}
// abandoned Fiat 132 (GLB only, 4.4 m)
function car132(ctx, x, z, rotY) {
  MapProps.add(ctx, 'fiat132', x, 0, z, rotY);
  solidRot(ctx, x, z, rotY, -2.2, 2.2, -0.82, 0.82, 0, 0.9, 'metal');
  solidRot(ctx, x, z, rotY, -1.3, 0.8, -0.7, 0.7, 0.9, 1.3, 'metal');
}
function car500Vis(ctx, x, z, rotY) {
  const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, 0, z);
  const add = (mat, g, mm) => ctx.G.geom(mat, g, m.clone().multiply(mm));
  const body = new RoundedBoxGeometry(2.95, 0.62, 1.32, 4, 0.22);
  add(MAT.carPaint, body, new THREE.Matrix4().makeTranslation(0, 0.62, 0));
  const cabin = new RoundedBoxGeometry(1.75, 0.6, 1.18, 4, 0.26);
  add(MAT.carPaint, cabin, new THREE.Matrix4().makeTranslation(-0.15, 1.12, 0));
  const glass = new RoundedBoxGeometry(1.6, 0.42, 1.2, 3, 0.18);
  add(MAT.glass, glass, new THREE.Matrix4().makeTranslation(-0.15, 1.15, 0));
  const roofCanvas = new RoundedBoxGeometry(1.2, 0.05, 1.0, 2, 0.02);
  add(MAT.fabric('#2b2622'), roofCanvas, new THREE.Matrix4().makeTranslation(-0.2, 1.43, 0));
  for (const [wx, wz] of [[0.95, 0.6], [0.95, -0.6], [-0.95, 0.6], [-0.95, -0.6]]) {
    const tyre = new THREE.CylinderGeometry(0.29, 0.29, 0.2, 16); tyre.rotateX(Math.PI / 2);
    add(MAT.rubber, tyre, new THREE.Matrix4().makeTranslation(wx, 0.29, wz));
    const hub = new THREE.CylinderGeometry(0.15, 0.15, 0.22, 12); hub.rotateX(Math.PI / 2);
    add(MAT.chrome, hub, new THREE.Matrix4().makeTranslation(wx, 0.29, wz));
  }
  for (const bx of [1.5, -1.5]) {
    const bump = new RoundedBoxGeometry(0.08, 0.08, 1.25, 2, 0.03);
    add(MAT.chrome, bump, new THREE.Matrix4().makeTranslation(bx, 0.45, 0));
  }
  for (const lz of [0.42, -0.42]) {
    const lamp = new THREE.SphereGeometry(0.1, 10, 8);
    add(MAT.lampGlass, lamp, new THREE.Matrix4().makeTranslation(1.42, 0.72, lz));
  }
}
// scooter (GLB, 1.8 m, front = local +x)
function vespa(ctx, x, z, rotY) {
  if (!MapProps.put(ctx, 'vespa', x, 0, z, rotY)) vespaVis(ctx, x, z, rotY);
  solidRot(ctx, x, z, rotY, -0.88, 0.88, -0.26, 0.26, 0, 0.95, 'metal');
}
function vespaVis(ctx, x, z, rotY) {
  const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, 0, z);
  const add = (mat, g, mm) => ctx.G.geom(mat, g, m.clone().multiply(mm));
  const rear = new THREE.SphereGeometry(0.42, 16, 10); rear.scale(1.25, 0.8, 0.85);
  add(MAT.vespaPaint, rear, new THREE.Matrix4().makeTranslation(-0.42, 0.55, 0));
  const floor = new RoundedBoxGeometry(0.75, 0.08, 0.38, 2, 0.03);
  add(MAT.rubber, floor, new THREE.Matrix4().makeTranslation(0.15, 0.3, 0));
  const shield = new RoundedBoxGeometry(0.12, 0.85, 0.46, 3, 0.05);
  add(MAT.vespaPaint, shield, new THREE.Matrix4().makeRotationZ(-0.25).setPosition(0.58, 0.68, 0));
  const seat = new RoundedBoxGeometry(0.62, 0.12, 0.3, 3, 0.05);
  add(MAT.fabric('#3a2a20'), seat, new THREE.Matrix4().makeTranslation(-0.35, 0.95, 0));
  const fender = new THREE.SphereGeometry(0.24, 12, 8, 0, TAU, 0, Math.PI / 2); fender.scale(1.3, 0.9, 0.7);
  add(MAT.vespaPaint, fender, new THREE.Matrix4().makeTranslation(0.72, 0.3, 0));
  for (const wx of [0.72, -0.55]) {
    const tyre = new THREE.TorusGeometry(0.17, 0.06, 8, 16);
    add(MAT.rubber, tyre, new THREE.Matrix4().makeTranslation(wx, 0.21, 0));
  }
  rod(ctx, MAT.chrome, new THREE.Vector3(0.6, 0.9, 0).applyMatrix4(m).toArray(), new THREE.Vector3(0.66, 1.15, 0).applyMatrix4(m).toArray(), 0.025);
  const bar = new THREE.CylinderGeometry(0.02, 0.02, 0.62, 6); bar.rotateX(Math.PI / 2);
  add(MAT.chrome, bar, new THREE.Matrix4().makeTranslation(0.66, 1.16, 0));
  const head = new THREE.SphereGeometry(0.08, 10, 8);
  add(MAT.lampGlass, head, new THREE.Matrix4().makeTranslation(0.72, 1.12, 0));
}
// clothes lines across an alley from wall point a to wall point b (GLB: three 7 m lines with laundry, no collision)
function laundryLine(ctx, a, b, sag = 0.5) {
  const cx = (a[0] + b[0]) / 2, cz = (a[2] + b[2]) / 2, rot = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
  if (MapProps.put(ctx, 'laundry', cx, Math.min(a[1], b[1]) - 2.0, cz, rot)) sinkDraw(ctx, () => laundryLineVis(ctx, a, b, sag));
  else laundryLineVis(ctx, a, b, sag);
}
function laundryLineVis(ctx, a, b, sag) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; const p = A.clone().lerp(B, t); p.y -= Math.sin(t * Math.PI) * sag; pts.push(p); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 24, 0.008, 4, false);
  ctx.G.geom(MAT.rubber, tube, new THREE.Matrix4());
  const colors = ['#f0ece2', '#c0392b', '#2e5d8a', '#e6c84a', '#f2f2f2', '#6b8e4e', '#d98aa6', '#efe9dc'];
  const L = A.distanceTo(B);
  const n = Math.floor(L / 0.9);
  const dir = B.clone().sub(A).normalize();
  const ang = Math.atan2(dir.x, dir.z) + Math.PI / 2;
  for (let i = 1; i < n; i++) {
    if (ctx.r() < 0.25) continue;
    const t = i / n;
    const p = curve.getPoint(t);
    const w = 0.35 + ctx.r() * 0.4, h = 0.4 + ctx.r() * 0.45;
    const g = new THREE.PlaneGeometry(w, h);
    g.translate(0, -h / 2, 0);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((ctx.r() - 0.5) * 0.2, ang + (ctx.r() - 0.5) * 0.3, (ctx.r() - 0.5) * 0.1));
    ctx.G.geom(MAT.fabric(ctx.pick(colors)), g, new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
  }
}
// --- GLB-only dressing (no procedural version; the collisions are there from the start) ----------
// bicycle leaning on a wall, its length along local x
function bicycle(ctx, x, z, rot) {
  MapProps.add(ctx, 'bicycle', x, 0, z, rot);
  solidRot(ctx, x, z, rot, -0.86, 0.86, -0.18, 0.18, 0, 0.9, 'metal');
}
// sidewalk A-board, boards facing local +x / -x
function floorSign(ctx, x, z, rot) {
  MapProps.add(ctx, 'floorSign', x, 0, z, rot);
  solidRot(ctx, x, z, rot, -0.25, 0.25, -0.31, 0.31, 0, 1.0, 'wood');
}
// group of old terracotta pots (0.9 m along local x)
function terracottaPots(ctx, x, z, rot, y = 0) {
  MapProps.add(ctx, 'pots', x, y, z, rot);
  solidRot(ctx, x, z, rot, -0.45, 0.45, -0.28, 0.28, y, y + 0.33, 'stone');
}
function amphora(ctx, x, z, y = 0, s = 1) {
  MapProps.add(ctx, 'amphora', x, y, z, 0, { s });
  ctx.solid(x - 0.2 * s, y, z - 0.2 * s, x + 0.2 * s, y + 0.6 * s, z + 0.2 * s, 'stone');
}
// small wooden produce boxes (1.1 m along local x)
function woodBoxes(ctx, x, z, rot) {
  MapProps.add(ctx, 'boxes', x, 0, z, rot);
  solidRot(ctx, x, z, rot, -0.55, 0.55, -0.17, 0.17, 0, 0.6, 'wood');
}
// terracotta planter on a parapet or sill (top at y) with geraniums; the planter itself is procedural
function geraniumPlanter(ctx, x, y, z, axis = 'z', len = 0.9) {
  const hx = axis === 'x' ? len / 2 : 0.13, hz = axis === 'x' ? 0.13 : len / 2;
  ctx.G.box(MAT.terracottaPot, x - hx, y, z - hz, x + hx, y + 0.22, z + hz);
  const n = Math.max(1, Math.round(len / 0.45));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n - 0.5;
    MapProps.add(ctx, 'geranium', x + (axis === 'x' ? t * len : 0), y + 0.16, z + (axis === 'x' ? 0 : t * len), i * 1.7, { s: 0.75 });
  }
}
function railing(ctx, x0, z0, x1, z1, y, h = 1.0) {
  const L = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(2, Math.round(L / 0.13));
  rod(ctx, MAT.iron, [x0, y + h, z0], [x1, y + h, z1], 0.025);
  rod(ctx, MAT.iron, [x0, y + 0.1, z0], [x1, y + 0.1, z1], 0.015);
  for (let i = 0; i <= n; i++) { const t = i / n; const px = lerp(x0, x1, t), pz = lerp(z0, z1, t); ctx.G.box(MAT.iron, px - 0.01, y, pz - 0.01, px + 0.01, y + h, pz + 0.01); }
}
function balustrade(ctx, x0, z0, x1, z1, y, h = 0.95) {
  // stone balustrade: rail + balusters, collision as a solid wall
  const axis = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 'x' : 'z';
  const t = 0.14;
  if (axis === 'x') {
    ctx.G.box(MAT.stoneTrim, x0, y + h - 0.14, z0 - t, x1, y + h, z0 + t);
    ctx.G.box(MAT.stoneTrim, x0, y, z0 - t, x1, y + 0.14, z0 + t);
    const L = x1 - x0, n = Math.round(L / 0.3);
    const bg = new THREE.LatheGeometry([0.05, 0.08, 0.05, 0.035, 0.065, 0.06, 0.05].map((r, i) => new THREE.Vector2(r, i / 6)), 8);
    for (let i = 0; i < n; i++) ctx.G.geom(MAT.stoneTrim, bg, new THREE.Matrix4().compose(new THREE.Vector3(x0 + (i + 0.5) * L / n, y + 0.14, z0), new THREE.Quaternion(), new THREE.Vector3(1, h - 0.28, 1)), { worldUV: true });
    ctx.solid(x0, y, z0 - t, x1, y + h, z0 + t, 'stone');
  } else {
    ctx.G.box(MAT.stoneTrim, x0 - t, y + h - 0.14, z0, x0 + t, y + h, z1);
    ctx.G.box(MAT.stoneTrim, x0 - t, y, z0, x0 + t, y + 0.14, z1);
    const L = z1 - z0, n = Math.round(L / 0.3);
    const bg = new THREE.LatheGeometry([0.05, 0.08, 0.05, 0.035, 0.065, 0.06, 0.05].map((r, i) => new THREE.Vector2(r, i / 6)), 8);
    for (let i = 0; i < n; i++) ctx.G.geom(MAT.stoneTrim, bg, new THREE.Matrix4().compose(new THREE.Vector3(x0, y + 0.14, z0 + (i + 0.5) * L / n), new THREE.Quaternion(), new THREE.Vector3(1, h - 0.28, 1)), { worldUV: true });
    ctx.solid(x0 - t, y, z0, x0 + t, y + h, z1, 'stone');
  }
}
// straight stairs: rising along +dir from (x,z) start; axis 'x' or 'z'; dir +1/-1
function stairs(ctx, axis, dir, a0, c0, c1, y0, y1, run, mat = MAT.stoneTrim, sideMat = MAT.stone) {
  const steps = Math.max(1, Math.round((y1 - y0) / 0.2));
  const rise = (y1 - y0) / steps;
  for (let i = 0; i < steps; i++) {
    const s0 = a0 + dir * i * run, s1 = a0 + dir * (i + 1) * run;
    const yt = y0 + (i + 1) * rise;
    const lo = Math.min(s0, s1), hi = Math.max(s0, s1);
    if (axis === 'x') { ctx.G.box(mat, lo, y0, c0, hi, yt, c1, { skip: 'ny' }); ctx.solid(lo, y0, c0, hi, yt, c1, 'stone', F_NORAY); }
    else { ctx.G.box(mat, c0, y0, lo, c1, yt, hi, { skip: 'ny' }); ctx.solid(c0, y0, lo, c1, yt, hi, 'stone', F_NORAY); }
  }
  // ray-only slope for bullets
  const aEnd = a0 + dir * steps * run;
  if (axis === 'x') ctx.rayQuad([a0, y0, c0], [a0, y0, c1], [aEnd, y1, c1], [aEnd, y1, c0], 'stone');
  else ctx.rayQuad([c0, y0, a0], [c1, y0, a0], [c1, y1, aEnd], [c0, y1, aEnd], 'stone');
  return a0 + dir * steps * run;
}
