// ===================================================================
// Custom maps: compact JSON definition <-> objects, and the builder that
// turns a definition into a playable map (merged geometry, collision,
// spawns, objectives, triggers, lights).
// ===================================================================
const MAP_LIMITS = { objects: 2500, lights: 12, bytes: 240000 };
const GROUND_OPTS = [['grass', 'Prato'], ['terrain', 'Terra battuta'], ['sand', 'Sabbia'], ['snow', 'Neve'], ['asphalt', 'Asfalto'], ['concrete', 'Cemento'], ['grid_grey', 'Griglia'], ['cobble', 'Sampietrini'], ['gravel', 'Ghiaia'], ['ice', 'Ghiaccio'], ['none', 'Nessuno (vuoto)']];
const SKY_OPTS = ['mattina', 'mezzogiorno', 'borgo', 'tramonto', 'alba', 'deserto', 'notte', 'nuvoloso', 'nebbia'];

function sanitizeMapName(s) { return stripCtl(String(s == null ? '' : s), '').trim().slice(0, 32); }
function sanitizeParam(pr, v) {
  if (pr.type === 'range') { const n = +v; return isFinite(n) ? clamp(n, pr.min, pr.max) : pr.def; }
  if (pr.type === 'text') return sanitizeName(v) || pr.def;
  for (const [val] of pr.opts) if (val === v || String(val) === String(v)) return val;
  return pr.def;
}
const r2c = (v) => Math.round(v * 100) / 100;
function encObj(o) {
  const a = {};
  const def = CAT_BY_ID[o.k];
  for (const pr of (def && def.params) || []) if (o.a && o.a[pr.k] !== undefined && o.a[pr.k] !== pr.def) a[pr.k] = o.a[pr.k];
  return [o.k, r2c(o.p[0]), r2c(o.p[1]), r2c(o.p[2]), r2c(o.s[0]), r2c(o.s[1]), r2c(o.s[2]), Math.round((o.r || 0) * 1800 / Math.PI) / 10, o.m || 0, o.c || 0, Object.keys(a).length ? a : 0, o.seed >>> 0];
}
function decObj(a, half) {
  if (!Array.isArray(a) || typeof a[0] !== 'string' || !CAT_BY_ID[a[0]]) return null;
  const def = CAT_BY_ID[a[0]];
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const lim = (half || 80) + 20;
  const o = newObj(a[0]);
  o.p = [clamp(num(a[1], 0), -lim, lim), clamp(num(a[2], 0), -40, 120), clamp(num(a[3], 0), -lim, lim)];
  if (def.rs === RS_XYZ) o.s = [clamp(num(a[4], def.size[0]), 0.05, 200), clamp(num(a[5], def.size[1]), 0.05, 120), clamp(num(a[6], def.size[2]), 0.05, 200)];
  else if (def.rs === RS_U) { const u = clamp(num(a[4], 1), 0.25, 6); o.s = [u, u, u]; }
  o.r = num(a[7], 0) * Math.PI / 180;
  if (typeof a[8] === 'string' && EMAT_BY_ID[a[8]]) o.m = a[8];
  o.c = cleanHex(a[9]);
  if (a[10] && typeof a[10] === 'object') for (const pr of def.params || []) if (pr.k in a[10]) o.a[pr.k] = sanitizeParam(pr, a[10][pr.k]);
  o.seed = (num(a[11], 0) >>> 0) || (hashStr(a[0] + a[1] + ',' + a[3]) >>> 0);
  return o;
}
function normDef(d) {
  d = d && typeof d === 'object' ? d : {};
  const env = d.env && typeof d.env === 'object' ? d.env : {};
  return {
    v: 1,
    name: sanitizeMapName(d.name) || 'Mappa senza nome',
    env: {
      sky: SKY_OPTS.includes(env.sky) ? env.sky : 'mattina',
      ground: GROUND_OPTS.some((g) => g[0] === env.ground) ? env.ground : 'grass',
      size: clamp(Math.round(+env.size || 60), 30, 160),
    },
    o: Array.isArray(d.o) ? d.o.slice(0, MAP_LIMITS.objects) : [],
  };
}
function decodeObjs(def) {
  const out = [], half = def.env.size / 2;
  for (const a of def.o) { const o = decObj(a, half); if (o) out.push(o); }
  return out;
}

function inBox(b, p, pad = 0) { return p.x > b[0] - pad && p.x < b[3] + pad && p.y > b[1] - 0.1 && p.y < b[4] && p.z > b[2] - pad && p.z < b[5] + pad; }

// Build a playable map from a definition. Returns the same shape loadMap expects.
function buildCustomMap(holder, defIn, id) {
  const def = normDef(defIn);
  const half = def.env.size / 2;
  const W = new CollisionWorld();
  const G = new GeoBuilder();
  const spawns = [], flags = [null, null], zones = [], lights = [];
  const trig = { pads: [], teleIn: [], teleOut: [], kills: [] };
  let nObj = 0;
  for (const o of decodeObjs(def)) {
    const ctx = buildObject(o);
    const M = objMatrix(o);
    G.absorbXf(ctx.G, M);
    addObjCollision(W, o, ctx, M);
    nObj++;
    for (const l of ctx.lights) if (l.type === 'point' && lights.length < MAP_LIMITS.lights) lights.push(Object.assign({}, l, { pos: new THREE.Vector3(...l.pos).applyMatrix4(M).toArray() }));
    const meta = ctx.meta;
    if (meta.spawn) spawns.push({ x: o.p[0], y: o.p[1] + 0.02, z: o.p[2], team: meta.spawn.team, yaw: o.r || 0 });
    if (meta.flag) flags[meta.flag - 1] = [o.p[0], o.p[1], o.p[2]];
    if (meta.zone) zones.push({ name: meta.zone.name, c: [o.p[0], o.p[1], o.p[2]], r: meta.zone.r, h: meta.zone.h });
    if (meta.pad) trig.pads.push({ box: xfBox(meta.pad.box, M), pow: meta.pad.pow });
    if (meta.tele && meta.tele.kind === 'in') trig.teleIn.push({ box: xfBox(meta.tele.box, M), ch: meta.tele.ch });
    if (meta.tele && meta.tele.kind === 'out') {
      const fwd = new THREE.Vector3(-Math.sin(o.r || 0), 0, -Math.cos(o.r || 0));
      trig.teleOut.push({ ch: meta.tele.ch, x: o.p[0] + fwd.x * 0.2, y: o.p[1] + 0.1, z: o.p[2] + fwd.z * 0.2, yaw: o.r || 0 });
    }
    if (meta.kill) trig.kills.push(xfBox(meta.kill, M));
    if (meta.water) { const b = xfBox(meta.water, M); W.add(b[0], b[1], b[2], b[3], b[4], b[5], 'water', F_WATER); }
    if (meta.light && lights.length < MAP_LIMITS.lights) {
      const L = meta.light;
      lights.push({ type: 'point', pos: new THREE.Vector3(0, L.y, 0).applyMatrix4(M).toArray(), color: new THREE.Color(L.color).getHex(), intensity: L.intensity, distance: L.dist });
    }
  }
  // ground and the invisible walls around the playable square
  if (def.env.ground !== 'none') {
    const gm = emat(def.env.ground);
    const ext = 700;
    G.quad(gm, [-ext, 0, ext], [ext, 0, ext], [ext, 0, -ext], [-ext, 0, -ext]);
    W.add(-ext, -5, -ext, ext, 0, ext, surfOf(gm));
  }
  W.add(-half - 2, -60, -half - 2, -half, 90, half + 2, 'stone', F_NORAY);
  W.add(half, -60, -half - 2, half + 2, 90, half + 2, 'stone', F_NORAY);
  W.add(-half - 2, -60, -half - 2, half + 2, 90, -half, 'stone', F_NORAY);
  W.add(-half - 2, -60, half, half + 2, 90, half + 2, 'stone', F_NORAY);
  W.build();
  const floorAt = (x, z, y = 80) => { const f = W.floorBelow(x, z, y); return isFinite(f) ? f : 0; };
  // fallbacks so every mode works even on a bare map
  if (!spawns.length) {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU, x = Math.cos(a) * half * 0.6, z = Math.sin(a) * half * 0.6;
      spawns.push({ x, y: floorAt(x, z) + 0.02, z, team: z < 0 ? 1 : 2, yaw: Math.atan2(x, z) });
    }
  }
  if (!flags[0]) flags[0] = [0, floorAt(0, -half * 0.6), -half * 0.6];
  if (!flags[1]) flags[1] = [0, floorAt(0, half * 0.6), half * 0.6];
  if (!zones.length) zones.push({ name: 'Centro', c: [0, floorAt(0, 0), 0], r: 4, h: 3 });

  const group = new THREE.Group();
  group.name = 'custom-map';
  G.build(group);
  holder.add(group);
  const info = {
    id: id || 'local', name: def.name, spawns, flags, zones, custom: true, env: def.env, objects: nObj,
    bounds: { x0: -half, x1: half, z0: -half, z1: half }, water: null, triggers: trig,
    menuCam: { c: [0, 2, 0], r: Math.max(14, half * 0.85), h: Math.max(8, half * 0.42) },
  };
  return {
    group, world: W, lights, info,
    dynamic: () => ({ update: (t) => { if (MAT.water.normalMap) MAT.water.normalMap.offset.set(t * 0.02, t * 0.013); } }),
  };
}

// ---------------------------------------------------------------- starter map
function exampleMapDef() {
  const objs = [];
  let seed = 1;
  const add = (k, p, o = {}) => {
    const ob = newObj(k, p);
    if (o.s) ob.s = o.s.slice();
    if (o.r != null) ob.r = o.r;
    if (o.m) ob.m = o.m;
    if (o.c) ob.c = o.c;
    if (o.a) Object.assign(ob.a, o.a);
    ob.seed = seed++;
    objs.push(ob);
    return ob;
  };
  // point-symmetric pair (rotated 180 degrees around the centre)
  const pair = (k, p, o = {}) => {
    add(k, p, o);
    const o2 = Object.assign({}, o, { r: (o.r || 0) + Math.PI });
    if (o.a && o.a.team) o2.a = Object.assign({}, o.a, { team: o.a.team === 1 ? 2 : 1 });
    add(k, [-p[0], p[1], -p[2]], o2);
  };
  // centre: raised platform with two ramps and the main hardpoint
  add('floor', [0, 0, 0], { s: [9, 1.6, 9], m: 'concrete' });
  pair('ramp', [0, 0, -6.5], { s: [3, 1.6, 4], r: Math.PI, m: 'grid_dark' });
  add('zone', [0, 1.6, 0], { s: [7, 3, 7], a: { name: 'Piattaforma' } });
  add('light', [0, 1.6, 0], { a: { li: 10, ld: 12 } });
  // containers and cover
  pair('container', [-11, 0, -7], { r: Math.PI / 2, c: '#c0503f' });
  pair('container', [12, 0, 3], { c: '#4a78b0' });
  pair('container', [10, 2.59, 3], { r: Math.PI / 2, c: '#5a8a52' });
  pair('stairs', [17.15, 0, 3], { s: [1.4, 2.59, 4.2], r: -Math.PI / 2, m: 'diamond' });
  pair('jersey', [-4, 0, -12], {});
  pair('jersey', [4.5, 0, -12], { r: 0.4 });
  pair('sandbags', [-7, 0, 5], { r: Math.PI / 2 });
  pair('crates', [7, 0, -6], {});
  pair('barrel', [9, 0, -8], {});
  pair('tires', [-14, 0, 9], {});
  pair('pallet', [3, 0, 8.5], { r: 0.3 });
  pair('wall', [-6, 0, -18], { s: [8, 2.6, 0.4], m: 'brick' });
  pair('window_wall', [6, 0, -18], { s: [6, 3, 0.4], m: 'plaster_ocra' });
  pair('house', [-19, 0, -16], { s: [8, 7, 7], a: { col: 'siena', roof: 'gable-x' } });
  pair('arch', [17, 0, -15], { s: [5, 4.4, 1], r: Math.PI / 2, m: 'stone' });
  // bases
  pair('flag', [0, 0, -25], { a: { team: 1 } });
  for (const x of [-4, 0, 4]) pair('spawn', [x, 0, -23], { a: { team: 1 } });
  pair('pad', [-9, 0, -21], {});
  pair('tele_in', [9, 0, -23], { a: { ch: 1 } });
  add('tele_out', [-24, 0, 23], { r: Math.PI * 0.75, a: { ch: 1 } });
  add('tele_out', [24, 0, -23], { r: -Math.PI * 0.25, a: { ch: 2 } });
  // side hardpoints and greenery
  pair('zone', [-17, 0, 3], { s: [6, 3, 6], a: { name: 'Container' } });
  pair('tree', [-24, 0, -4], {});
  pair('rock', [22, 0, 12], { s: [1.4, 1.4, 1.4] });
  pair('cypress', [-26, 0, 14], {});
  pair('bush', [-12, 0, 16], {});
  pair('lamp', [-3, 0, -20], {});
  // the second teleporter pair uses channel 2 on the other side
  const ins = objs.filter((o) => o.k === 'tele_in');
  if (ins[1]) ins[1].a.ch = 2;
  return { v: 1, name: 'Arena di esempio', env: { sky: 'tramonto', ground: 'grass', size: 60 }, o: objs.map(encObj) };
}
