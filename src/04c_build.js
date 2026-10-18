// ===================================================================
// Architecture helpers: facades, windows, doors, roofs, arches
// ===================================================================
function surfOf(mat) { return (mat && mat.userData && mat.userData.surf) || 'stone'; }

class MapCtx {
  constructor(rng) {
    this.G = new GeoBuilder();
    this.rng = rng;
    this.boxes = [];   // collision boxes [x0,y0,z0,x1,y1,z1,surf,flags]
    this.tris = [];    // ray triangles [[a],[b],[c],surf]
    this.objects = []; // { obj: THREE.Object3D } added directly (instanced / special)
    this.lights = [];
    this.glb = [];     // GLB prop placements (MapProps)
  }
  r(a = 0, b = 1) { return a + this.rng() * (b - a); }
  ri(a, b) { return Math.floor(a + this.rng() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }
  solid(x0, y0, z0, x1, y1, z1, surf = 'stone', flags = 0) { this.boxes.push([Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), surf, flags]); }
  block(mat, x0, y0, z0, x1, y1, z1, o = {}) {
    this.G.box(mat, x0, y0, z0, x1, y1, z1, o);
    if (o.collide !== false) this.solid(x0, y0, z0, x1, y1, z1, o.surf || surfOf(mat), o.flags || 0);
  }
  rayTri(a, b, c, surf) { this.tris.push([a, b, c, surf]); }
  rayQuad(a, b, c, d, surf) { this.tris.push([a, b, c, surf]); this.tris.push([a, c, d, surf]); }
}

// --- facade frames ---------------------------------------------------
// F = { O:[x,y,z] left-bottom corner seen from outside, R:[rx,0,rz] right dir, N:[nx,0,nz] outward, L: width }
function facade(x0, z0, x1, z1, side, y0 = 0) {
  switch (side) {
    case 's': return { O: [x0, y0, z1], R: [1, 0, 0], N: [0, 0, 1], L: x1 - x0, side };
    case 'n': return { O: [x1, y0, z0], R: [-1, 0, 0], N: [0, 0, -1], L: x1 - x0, side };
    case 'e': return { O: [x1, y0, z1], R: [0, 0, -1], N: [1, 0, 0], L: z1 - z0, side };
    case 'w': return { O: [x0, y0, z0], R: [0, 0, 1], N: [-1, 0, 0], L: z1 - z0, side };
  }
}
function fw(F, s, y, d) { return [F.O[0] + F.R[0] * s + F.N[0] * d, F.O[1] + y, F.O[2] + F.R[2] * s + F.N[2] * d]; }
function fbox(ctx, F, mat, s0, s1, y0, y1, d0, d1, o = {}) {
  const a = fw(F, s0, y0, d0), b = fw(F, s1, y1, d1);
  if (o.collide === undefined) o.collide = false;
  ctx.block(mat, a[0], a[1], a[2], b[0], b[1], b[2], o);
}
function fquad(ctx, F, mat, s0, s1, y0, y1, d, uvs) {
  ctx.G.quad(mat, fw(F, s0, y0, d), fw(F, s1, y0, d), fw(F, s1, y1, d), fw(F, s0, y1, d), uvs);
}

const WIN_W = 0.95, WIN_H = 1.55;
function windowUnit(ctx, F, s, y, opts = {}) {
  const w = opts.w || WIN_W, h = opts.h || WIN_H;
  const trim = opts.trim || MAT.stoneTrim;
  const sh = opts.shutter;
  const G = ctx.G;
  // stone surround
  fbox(ctx, F, trim, s - w / 2 - 0.13, s - w / 2, y - 0.02, y + h, 0, 0.06);
  fbox(ctx, F, trim, s + w / 2, s + w / 2 + 0.13, y - 0.02, y + h, 0, 0.06);
  fbox(ctx, F, trim, s - w / 2 - 0.16, s + w / 2 + 0.16, y + h, y + h + 0.2, 0, 0.08);
  if (opts.cap !== false) fbox(ctx, F, trim, s - w / 2 - 0.22, s + w / 2 + 0.22, y + h + 0.2, y + h + 0.26, 0, 0.13);
  if (!opts.door) fbox(ctx, F, trim, s - w / 2 - 0.12, s + w / 2 + 0.12, y - 0.09, y, 0, 0.12);
  const state = opts.state || (ctx.r() < 0.62 ? 'open' : ctx.r() < 0.7 ? 'closed' : 'open');
  if (state === 'closed' && sh) {
    fbox(ctx, F, sh, s - w / 2, s, y, y + h, 0.005, 0.04, { local: true, rot: true });
    fbox(ctx, F, sh, s, s + w / 2, y, y + h, 0.005, 0.04, { local: true, rot: true });
    fbox(ctx, F, MAT.iron, s - 0.015, s + 0.015, y + h * 0.48, y + h * 0.52, 0.04, 0.06);
  } else {
    fquad(ctx, F, opts.glass || MAT.glass, s - w / 2, s + w / 2, y, y + h, 0.01);
    const fr = opts.frame || MAT.paintWhite;
    const fd0 = 0.01, fd1 = 0.04;
    fbox(ctx, F, fr, s - w / 2, s - w / 2 + 0.06, y, y + h, fd0, fd1);
    fbox(ctx, F, fr, s + w / 2 - 0.06, s + w / 2, y, y + h, fd0, fd1);
    fbox(ctx, F, fr, s - w / 2, s + w / 2, y, y + 0.06, fd0, fd1);
    fbox(ctx, F, fr, s - w / 2, s + w / 2, y + h - 0.06, y + h, fd0, fd1);
    fbox(ctx, F, fr, s - 0.025, s + 0.025, y, y + h, fd0, fd1 - 0.005);
    if (!opts.door) fbox(ctx, F, fr, s - w / 2, s + w / 2, y + h * 0.66 - 0.025, y + h * 0.66 + 0.025, fd0, fd1 - 0.005);
    if (sh) {
      const sw = w / 2;
      fbox(ctx, F, sh, s - w / 2 - 0.14 - sw, s - w / 2 - 0.14, y, y + h, 0.0, 0.035, { local: true, rot: true });
      fbox(ctx, F, sh, s + w / 2 + 0.14, s + w / 2 + 0.14 + sw, y, y + h, 0.0, 0.035, { local: true, rot: true });
    }
  }
  if (opts.flowers || (!opts.door && opts.flowers !== false && ctx.r() < 0.28)) flowerBox(ctx, F, s, y, w);
}

function flowerBox(ctx, F, s, y, w) {
  fbox(ctx, F, MAT.terracottaPot, s - w / 2 + 0.02, s + w / 2 - 0.02, y + 0.0, y + 0.2, 0.13, 0.33);
  const m = ctx.r() < 0.6 ? MAT.geranium : MAT.geranium2;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const ss = s - w / 2 + 0.12 + (w - 0.24) * (i / (n - 1));
    const p = fw(F, ss, y + 0.3 + ctx.r() * 0.06, 0.23);
    const r = 0.11 + ctx.r() * 0.04;
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mtx = new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion(), new THREE.Vector3(r, r * 0.8, r));
    ctx.G.geom(MAT.potGreen, geo, mtx);
    const mtx2 = new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1] + r * 0.6, p[2]), new THREE.Quaternion(), new THREE.Vector3(r * 0.6, r * 0.45, r * 0.6));
    ctx.G.geom(m, geo, mtx2);
  }
}

function doorUnit(ctx, F, s, opts = {}) {
  const w = opts.w || 1.3, h = opts.h || 2.45;
  const y = opts.y || 0;
  const trim = opts.trim || MAT.stoneTrim;
  fbox(ctx, F, trim, s - w / 2 - 0.22, s - w / 2, y, y + h + 0.05, 0, 0.1);
  fbox(ctx, F, trim, s + w / 2, s + w / 2 + 0.22, y, y + h + 0.05, 0, 0.1);
  fbox(ctx, F, trim, s - w / 2 - 0.26, s + w / 2 + 0.26, y + h + 0.05, y + h + 0.35, 0, 0.13);
  if (opts.open) {
    fquad(ctx, F, MAT.dark, s - w / 2, s + w / 2, y, y + h + 0.05, -0.02);
  } else {
    const dm = opts.mat || MAT.woodDark;
    fbox(ctx, F, dm, s - w / 2, s, y, y + h + 0.05, 0.0, 0.05, { local: true });
    fbox(ctx, F, dm, s, s + w / 2, y, y + h + 0.05, 0.0, 0.05, { local: true });
    // panels
    for (const sx of [s - w / 4, s + w / 4]) {
      fbox(ctx, F, dm, sx - w / 4 + 0.08, sx + w / 4 - 0.08, y + 0.25, y + h * 0.45, 0.05, 0.075);
      fbox(ctx, F, dm, sx - w / 4 + 0.08, sx + w / 4 - 0.08, y + h * 0.52, y + h - 0.15, 0.05, 0.075);
    }
    fbox(ctx, F, MAT.brass, s - 0.09, s - 0.03, y + 1.05, y + 1.12, 0.05, 0.1);
    fbox(ctx, F, MAT.brass, s + 0.03, s + 0.09, y + 1.05, y + 1.12, 0.05, 0.1);
  }
  if (opts.step !== false) fbox(ctx, F, MAT.stoneTrim, s - w / 2 - 0.3, s + w / 2 + 0.3, y, y + 0.1, 0, 0.35);
  if (opts.lamp) wallLamp(ctx, F, s + w / 2 + 0.6, y + h + 0.3);
}

function wallLamp(ctx, F, s, y) {
  fbox(ctx, F, MAT.iron, s - 0.03, s + 0.03, y - 0.05, y + 0.05, 0, 0.45);
  fbox(ctx, F, MAT.iron, s - 0.12, s + 0.12, y - 0.32, y - 0.3, 0.36, 0.6);
  fbox(ctx, F, MAT.lampGlass, s - 0.1, s + 0.1, y - 0.3, y - 0.05, 0.38, 0.58);
  fbox(ctx, F, MAT.iron, s - 0.14, s + 0.14, y - 0.05, y, 0.34, 0.62);
}

function balcony(ctx, F, s, y, w, sh) {
  const d = 0.75;
  fbox(ctx, F, MAT.stoneTrim, s - w / 2, s + w / 2, y - 0.14, y, 0, d);
  for (const cs of [s - w / 2 + 0.15, s + w / 2 - 0.15]) fbox(ctx, F, MAT.stoneTrim, cs - 0.08, cs + 0.08, y - 0.45, y - 0.14, 0, d * 0.7);
  const top = y + 1.0;
  fbox(ctx, F, MAT.iron, s - w / 2 + 0.02, s + w / 2 - 0.02, top - 0.03, top, d - 0.05, d - 0.01);
  fbox(ctx, F, MAT.iron, s - w / 2 + 0.02, s + w / 2 - 0.02, y + 0.08, y + 0.1, d - 0.05, d - 0.01);
  for (let x = s - w / 2 + 0.04; x <= s + w / 2 - 0.03; x += 0.12) fbox(ctx, F, MAT.iron, x - 0.01, x + 0.01, y, top, d - 0.04, d - 0.02);
  for (const ex of [s - w / 2 + 0.02, s + w / 2 - 0.04]) {
    fbox(ctx, F, MAT.iron, ex, ex + 0.02, top - 0.03, top, 0.02, d - 0.03);
    for (let dd = 0.12; dd < d - 0.05; dd += 0.12) fbox(ctx, F, MAT.iron, ex, ex + 0.02, y, top, dd - 0.01, dd + 0.01);
  }
  windowUnit(ctx, F, s, y, { w: 0.95, h: 2.25, door: true, shutter: sh, cap: true, flowers: false, state: 'open' });
  if (ctx.r() < 0.6) {
    // pots on the balcony
    for (let i = 0; i < 2; i++) {
      const ss = s + (i ? 0.45 : -0.45) * (w / 1.6);
      const p = fw(F, ss, y, 0.5);
      const pot = new THREE.CylinderGeometry(0.16, 0.11, 0.28, 10);
      ctx.G.geom(MAT.terracottaPot, pot, new THREE.Matrix4().makeTranslation(p[0], p[1] + 0.14, p[2]));
      const bush = new THREE.IcosahedronGeometry(0.24, 1);
      ctx.G.geom(MAT.potGreen, bush, new THREE.Matrix4().makeTranslation(p[0], p[1] + 0.45, p[2]));
    }
  }
}

function signBoard(ctx, F, s, y, w, h, tex, d = 0.06) {
  const key = 'sign_' + tex.uuid;
  if (!MAT[key]) { MAT[key] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 }); MAT[key].userData.uvScale = 1; }
  fbox(ctx, F, MAT.woodDark, s - w / 2 - 0.04, s + w / 2 + 0.04, y - 0.04, y + h + 0.04, 0, d - 0.005);
  fquad(ctx, F, MAT[key], s - w / 2, s + w / 2, y, y + h, d, [[0, 0], [1, 0], [1, 1], [0, 1]]);
}

function awning(ctx, F, s0, s1, y, depth, drop, mat) {
  const a = fw(F, s0, y, 0.05), b = fw(F, s1, y, 0.05), c = fw(F, s1, y - drop, depth), d = fw(F, s0, y - drop, depth);
  const L = Math.abs(s1 - s0);
  const uv = [[0, 1], [L / 2, 1], [L / 2, 0], [0, 0]];
  ctx.G.quad(mat, d, c, b, a, [uv[3], uv[2], uv[1], uv[0]]);
  // valance
  const e = fw(F, s0, y - drop - 0.25, depth), f = fw(F, s1, y - drop - 0.25, depth);
  ctx.G.quad(mat, e, f, c, d, [[0, 0], [L / 2, 0], [L / 2, 0.12], [0, 0.12]]);
  // arms
  for (const ss of [s0 + 0.1, s1 - 0.1]) {
    const p0 = fw(F, ss, y - 0.9, 0.02), p1 = fw(F, ss, y - drop, depth);
    rod(ctx, MAT.iron, p0, p1, 0.015);
  }
}

function rod(ctx, mat, p0, p1, r, seg = 6) {
  const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1);
  const L = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, L, seg, 1, true);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize());
  m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  ctx.G.geom(mat, g, m);
}

function cornice(ctx, F, y, ext = 0.0, trim = MAT.stoneTrim) {
  fbox(ctx, F, trim, -ext - 0.1, F.L + ext + 0.1, y - 0.12, y, 0, 0.12);
  fbox(ctx, F, trim, -ext - 0.2, F.L + ext + 0.2, y, y + 0.1, 0, 0.24);
  fbox(ctx, F, trim, -ext - 0.3, F.L + ext + 0.3, y + 0.1, y + 0.18, 0, 0.34);
}
function stringCourse(ctx, F, y, trim = MAT.stoneTrim) { fbox(ctx, F, trim, -0.06, F.L + 0.06, y, y + 0.12, 0, 0.05); }
function plinth(ctx, F, h, mat = MAT.stone) { fbox(ctx, F, mat, -0.04, F.L + 0.04, 0, h, 0, 0.04); }
function quoins(ctx, F, y0, y1, trim = MAT.stoneTrim) {
  let y = y0, k = 0;
  while (y + 0.4 < y1) {
    const w = k % 2 ? 0.32 : 0.55;
    fbox(ctx, F, trim, -0.01, w, y, y + 0.36, 0, 0.03);
    fbox(ctx, F, trim, F.L - w, F.L + 0.01, y, y + 0.36, 0, 0.03);
    y += 0.4; k++;
  }
}
function drainPipe(ctx, F, s, y0, y1) {
  const a = fw(F, s, y0, 0.12), b = fw(F, s, y1, 0.12);
  rod(ctx, MAT.metal, a, b, 0.05, 8);
}

// --- roofs ----------------------------------------------------------
function roofGable(ctx, x0, z0, x1, z1, ey, rh, axis, oh = 0.45, gableMat = null) {
  const G = ctx.G, R = MAT.roof;
  const s = R.userData.uvScale;
  if (axis === 'x') {
    const zc = (z0 + z1) / 2, half = (z1 - z0) / 2 + oh;
    const slope = rh / ((z1 - z0) / 2);
    const ye = ey - oh * slope;
    const len = Math.hypot(half, rh + oh * slope);
    const xa = x0 - oh, xb = x1 + oh;
    // south slope (+z side)
    G.quad(R, [xa, ye, z1 + oh], [xb, ye, z1 + oh], [xb, ey + rh, zc], [xa, ey + rh, zc], [[xa / s, 0], [xb / s, 0], [xb / s, len / s], [xa / s, len / s]]);
    G.quad(R, [xb, ye, z0 - oh], [xa, ye, z0 - oh], [xa, ey + rh, zc], [xb, ey + rh, zc], [[-xb / s, 0], [-xa / s, 0], [-xa / s, len / s], [-xb / s, len / s]]);
    // undersides (soffit)
    G.quad(MAT.woodDark, [xa, ey + rh - 0.12, zc], [xb, ey + rh - 0.12, zc], [xb, ye - 0.12, z1 + oh], [xa, ye - 0.12, z1 + oh]);
    G.quad(MAT.woodDark, [xb, ey + rh - 0.12, zc], [xa, ey + rh - 0.12, zc], [xa, ye - 0.12, z0 - oh], [xb, ye - 0.12, z0 - oh]);
    // fascia
    G.box(MAT.woodDark, xa, ye - 0.14, z1 + oh - 0.04, xb, ye + 0.02, z1 + oh);
    G.box(MAT.woodDark, xa, ye - 0.14, z0 - oh, xb, ye + 0.02, z0 - oh + 0.04);
    // gable ends
    const gm = gableMat;
    if (gm) {
      G.tri(gm, [x1, ey, z1], [x1, ey, z0], [x1, ey + rh, zc]);
      G.tri(gm, [x0, ey, z0], [x0, ey, z1], [x0, ey + rh, zc]);
    }
    // gable edge boards
    G.quad(MAT.roof, [xa, ye - 0.12, z1 + oh], [xa, ye, z1 + oh], [xa, ey + rh, zc], [xa, ey + rh - 0.12, zc]);
    G.quad(MAT.roof, [xb, ye, z1 + oh], [xb, ye - 0.12, z1 + oh], [xb, ey + rh - 0.12, zc], [xb, ey + rh, zc]);
    G.quad(MAT.roof, [xa, ye, z0 - oh], [xa, ye - 0.12, z0 - oh], [xa, ey + rh - 0.12, zc], [xa, ey + rh, zc]);
    G.quad(MAT.roof, [xb, ye - 0.12, z0 - oh], [xb, ye, z0 - oh], [xb, ey + rh, zc], [xb, ey + rh - 0.12, zc]);
    ridgeCap(ctx, [xa, ey + rh, zc], [xb, ey + rh, zc]);
    ctx.rayQuad([xa, ye, z1 + oh], [xb, ye, z1 + oh], [xb, ey + rh, zc], [xa, ey + rh, zc], 'stone');
    ctx.rayQuad([xb, ye, z0 - oh], [xa, ye, z0 - oh], [xa, ey + rh, zc], [xb, ey + rh, zc], 'stone');
    if (gm) { ctx.rayTri([x1, ey, z1], [x1, ey, z0], [x1, ey + rh, zc], 'stone'); ctx.rayTri([x0, ey, z0], [x0, ey, z1], [x0, ey + rh, zc], 'stone'); }
  } else {
    const xc = (x0 + x1) / 2, half = (x1 - x0) / 2 + oh;
    const slope = rh / ((x1 - x0) / 2);
    const ye = ey - oh * slope;
    const len = Math.hypot(half, rh + oh * slope);
    const za = z0 - oh, zb = z1 + oh;
    G.quad(R, [x1 + oh, ye, zb], [x1 + oh, ye, za], [xc, ey + rh, za], [xc, ey + rh, zb], [[-zb / s, 0], [-za / s, 0], [-za / s, len / s], [-zb / s, len / s]]);
    G.quad(R, [x0 - oh, ye, za], [x0 - oh, ye, zb], [xc, ey + rh, zb], [xc, ey + rh, za], [[za / s, 0], [zb / s, 0], [zb / s, len / s], [za / s, len / s]]);
    G.quad(MAT.woodDark, [xc, ey + rh - 0.12, zb], [xc, ey + rh - 0.12, za], [x1 + oh, ye - 0.12, za], [x1 + oh, ye - 0.12, zb]);
    G.quad(MAT.woodDark, [xc, ey + rh - 0.12, za], [xc, ey + rh - 0.12, zb], [x0 - oh, ye - 0.12, zb], [x0 - oh, ye - 0.12, za]);
    G.box(MAT.woodDark, x1 + oh - 0.04, ye - 0.14, za, x1 + oh, ye + 0.02, zb);
    G.box(MAT.woodDark, x0 - oh, ye - 0.14, za, x0 - oh + 0.04, ye + 0.02, zb);
    const gm = gableMat;
    if (gm) {
      G.tri(gm, [x0, ey, z1], [x1, ey, z1], [xc, ey + rh, z1]);
      G.tri(gm, [x1, ey, z0], [x0, ey, z0], [xc, ey + rh, z0]);
    }
    G.quad(MAT.roof, [xc, ey + rh, zb], [xc, ey + rh - 0.12, zb], [x1 + oh, ye - 0.12, zb], [x1 + oh, ye, zb]);
    G.quad(MAT.roof, [xc, ey + rh - 0.12, zb], [xc, ey + rh, zb], [x0 - oh, ye, zb], [x0 - oh, ye - 0.12, zb]);
    G.quad(MAT.roof, [xc, ey + rh - 0.12, za], [xc, ey + rh, za], [x1 + oh, ye, za], [x1 + oh, ye - 0.12, za]);
    G.quad(MAT.roof, [xc, ey + rh, za], [xc, ey + rh - 0.12, za], [x0 - oh, ye - 0.12, za], [x0 - oh, ye, za]);
    ridgeCap(ctx, [xc, ey + rh, za], [xc, ey + rh, zb]);
    ctx.rayQuad([x1 + oh, ye, zb], [x1 + oh, ye, za], [xc, ey + rh, za], [xc, ey + rh, zb], 'stone');
    ctx.rayQuad([x0 - oh, ye, za], [x0 - oh, ye, zb], [xc, ey + rh, zb], [xc, ey + rh, za], 'stone');
    if (gm) { ctx.rayTri([x0, ey, z1], [x1, ey, z1], [xc, ey + rh, z1], 'stone'); ctx.rayTri([x1, ey, z0], [x0, ey, z0], [xc, ey + rh, z0], 'stone'); }
  }
}

function roofHip(ctx, x0, z0, x1, z1, ey, rh, oh = 0.5) {
  const G = ctx.G, R = MAT.roof, s = R.userData.uvScale;
  const w = x1 - x0, d = z1 - z0;
  const X0 = x0 - oh, X1 = x1 + oh, Z0 = z0 - oh, Z1 = z1 + oh;
  const slope = rh / (Math.min(w, d) / 2);
  const ye = ey - oh * slope;
  const H = ey + rh;
  let r0, r1;
  if (w >= d) { const zc = (z0 + z1) / 2, inset = d / 2 + oh; r0 = [X0 + inset, H, zc]; r1 = [X1 - inset, H, zc]; }
  else { const xc = (x0 + x1) / 2, inset = w / 2 + oh; r0 = [xc, H, Z0 + inset]; r1 = [xc, H, Z1 - inset]; }
  const A = [X0, ye, Z1], B = [X1, ye, Z1], C = [X1, ye, Z0], D = [X0, ye, Z0];
  const len = Math.hypot(Math.min(w, d) / 2 + oh, rh + oh * slope);
  const planeUV = (pts, ax) => pts.map((p) => {
    let u, v;
    if (ax === 's') { u = p[0]; v = (Z1 - p[2]); } else if (ax === 'n') { u = -p[0]; v = (p[2] - Z0); }
    else if (ax === 'e') { u = -p[2]; v = (X1 - p[0]); } else { u = p[2]; v = (p[0] - X0); }
    return [u / s, (v / ((Math.min(w, d) / 2 + oh))) * len / s];
  });
  if (w >= d) {
    G.quad(R, A, B, r1, r0, planeUV([A, B, r1, r0], 's'));
    G.quad(R, C, D, r0, r1, planeUV([C, D, r0, r1], 'n'));
    G.tri(R, B, C, r1, planeUV([B, C, r1], 'e'));
    G.tri(R, D, A, r0, planeUV([D, A, r0], 'w'));
    ctx.rayQuad(A, B, r1, r0, 'stone'); ctx.rayQuad(C, D, r0, r1, 'stone'); ctx.rayTri(B, C, r1, 'stone'); ctx.rayTri(D, A, r0, 'stone');
  } else {
    G.quad(R, B, C, r0, r1, planeUV([B, C, r0, r1], 'e'));
    G.quad(R, D, A, r1, r0, planeUV([D, A, r1, r0], 'w'));
    G.tri(R, A, B, r1, planeUV([A, B, r1], 's'));
    G.tri(R, C, D, r0, planeUV([C, D, r0], 'n'));
    ctx.rayQuad(B, C, r0, r1, 'stone'); ctx.rayQuad(D, A, r1, r0, 'stone'); ctx.rayTri(A, B, r1, 'stone'); ctx.rayTri(C, D, r0, 'stone');
  }
  // soffit (flat underside of the overhang)
  const u = ye - 0.1;
  G.quad(MAT.woodDark, [X0, u, Z0], [X1, u, Z0], [X1, u, z0], [X0, u, z0]);
  G.quad(MAT.woodDark, [X0, u, z1], [X1, u, z1], [X1, u, Z1], [X0, u, Z1]);
  G.quad(MAT.woodDark, [X0, u, z0], [x0, u, z0], [x0, u, z1], [X0, u, z1]);
  G.quad(MAT.woodDark, [x1, u, z0], [X1, u, z0], [X1, u, z1], [x1, u, z1]);
  // fascia
  G.box(MAT.woodDark, X0, ye - 0.12, Z1 - 0.04, X1, ye + 0.02, Z1, { skip: 'py' });
  G.box(MAT.woodDark, X0, ye - 0.12, Z0, X1, ye + 0.02, Z0 + 0.04, { skip: 'py' });
  G.box(MAT.woodDark, X0, ye - 0.12, Z0, X0 + 0.04, ye + 0.02, Z1, { skip: 'py' });
  G.box(MAT.woodDark, X1 - 0.04, ye - 0.12, Z0, X1, ye + 0.02, Z1, { skip: 'py' });
  ridgeCap(ctx, r0, r1);
  for (const [p, q] of [[A, r0], [B, r1], [C, r1], [D, r0]]) ridgeCap(ctx, p, q, 0.08);
}

function ridgeCap(ctx, a, b, r = 0.11, seg = 6) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va); const L = dir.length(); if (L < 0.05) return; dir.divideScalar(L);
  const side = new THREE.Vector3().crossVectors(dir, UP);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  const up2 = new THREE.Vector3().crossVectors(side, dir).normalize();
  if (up2.y < 0) { up2.negate(); side.negate(); }
  const off = -r * 0.35, s = MAT.roof.userData.uvScale;
  const P = (base, t) => base.clone().addScaledVector(side, Math.cos(t) * r).addScaledVector(up2, Math.sin(t) * r + off).toArray();
  for (let i = 0; i < seg; i++) {
    const t0 = Math.PI * i / seg, t1 = Math.PI * (i + 1) / seg;
    const A = P(va, t0), B = P(vb, t0), C = P(vb, t1), D = P(va, t1);
    const v0 = t0 * r / s * 3, v1 = t1 * r / s * 3;
    // ensure outward winding
    const n = new THREE.Vector3().crossVectors(new THREE.Vector3(...B).sub(new THREE.Vector3(...A)), new THREE.Vector3(...C).sub(new THREE.Vector3(...A)));
    const mid = new THREE.Vector3(...A).add(new THREE.Vector3(...C)).multiplyScalar(0.5).sub(va.clone().add(vb).multiplyScalar(0.5));
    if (n.dot(mid) >= 0) ctx.G.quad(MAT.roof, A, B, C, D, [[0, v0], [L / s, v0], [L / s, v1], [0, v1]]);
    else ctx.G.quad(MAT.roof, A, D, C, B, [[0, v0], [0, v1], [L / s, v1], [L / s, v0]]);
  }
}

function chimney(ctx, x, z, yBase, h = 1.6, mat = MAT.brick) {
  ctx.G.box(mat, x - 0.35, yBase - 1, z - 0.35, x + 0.35, yBase + h, z + 0.35, { skip: 'ny' });
  ctx.G.box(MAT.stoneTrim, x - 0.45, yBase + h, z - 0.45, x + 0.45, yBase + h + 0.1, z + 0.45);
  ctx.G.box(mat, x - 0.25, yBase + h + 0.1, z - 0.25, x + 0.25, yBase + h + 0.35, z + 0.25);
  ctx.G.box(MAT.roof, x - 0.4, yBase + h + 0.35, z - 0.4, x + 0.4, yBase + h + 0.42, z + 0.4);
}

// Arch portal: facade slab with a round-arched hole; extruded outward from the wall plane
function archPortal(ctx, F, s0, s1, y0, y1, sc, halfW, springY, depth, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(s0, y0); shape.lineTo(s1, y0); shape.lineTo(s1, y1); shape.lineTo(s0, y1); shape.lineTo(s0, y0);
  const hole = new THREE.Path();
  hole.moveTo(sc - halfW, y0);
  hole.lineTo(sc + halfW, y0);
  hole.lineTo(sc + halfW, springY);
  hole.absarc(sc, springY, halfW, 0, Math.PI, false);
  hole.lineTo(sc - halfW, y0);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 20 });
  // shape space: x = s (along R), y = y, z = 0..depth (along N)
  const m = new THREE.Matrix4().set(
    F.R[0], 0, F.N[0], F.O[0],
    0, 1, 0, F.O[1],
    F.R[2], 0, F.N[2], F.O[2],
    0, 0, 0, 1);
  ctx.G.geom(mat, g, m, { worldUV: true });
  g.dispose();
}

// Barrel vault interior (inward-facing half cylinder) along an axis
function vault(ctx, axis, a0, a1, c, springY, r, mat, seg = 14) {
  const G = ctx.G, s = mat.userData.uvScale || 2;
  for (let i = 0; i < seg; i++) {
    const t0 = Math.PI * i / seg, t1 = Math.PI * (i + 1) / seg;
    const p = (t, a) => axis === 'x' ? [a, springY + Math.sin(t) * r, c + Math.cos(t) * r] : [c + Math.cos(t) * r, springY + Math.sin(t) * r, a];
    const arc0 = t0 * r / s, arc1 = t1 * r / s;
    const A = p(t0, a0), B = p(t0, a1), C = p(t1, a1), D = p(t1, a0);
    // inward normal: order so the face looks toward the axis
    if (axis === 'x') G.quad(mat, A, D, C, B, [[a0 / s, arc0], [a0 / s, arc1], [a1 / s, arc1], [a1 / s, arc0]]);
    else G.quad(mat, A, B, C, D, [[a0 / s, arc0], [a1 / s, arc0], [a1 / s, arc1], [a0 / s, arc1]]);
  }
}

// Wall with rectangular openings along an axis. axis 'x': wall spans x in [a0,a1] at z in [c0,c1]
function wallOpenings(ctx, mat, axis, a0, a1, c0, c1, y0, y1, openings, o = {}) {
  const ops = openings.slice().sort((p, q) => p[0] - q[0]);
  let cur = a0;
  const piece = (pa0, pa1, py0, py1) => {
    if (pa1 - pa0 < 0.001 || py1 - py0 < 0.001) return;
    if (axis === 'x') ctx.block(mat, pa0, py0, c0, pa1, py1, c1, o);
    else ctx.block(mat, c0, py0, pa0, c1, py1, pa1, o);
  };
  for (const op of ops) {
    piece(cur, op[0], y0, y1);
    piece(op[0], op[1], y0, op[2]);
    piece(op[0], op[1], op[3], y1);
    cur = op[1];
  }
  piece(cur, a1, y0, y1);
}
