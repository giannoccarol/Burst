// ===================================================================
// Map "Villette": a 1950s test village in the desert. Two houses face
// each other across a dead-end street. Half A (north, z < 0: the yellow
// house, its yards and the street's north lane) is built and rotated 180
// degrees for the green house; the vehicles in the street, the village
// sign and the desert backdrop are unique pieces.
// ===================================================================
const VL = {
  name: 'Villette', bounds: { x0: -28, x1: 28, z0: -28, z1: 28 },
  gf: 0.3, uf: 3.4, eh: 6.4, wt: 0.25,
};
const VLM = {};
function vlMaterials() {
  if (VLM.wallA) return;
  const paint = (hex, r = 0.36) => {
    const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: r, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.14 });
    m.userData.uvScale = 1; m.userData.surf = 'metal'; return m;
  };
  const solid = (hex, r = 0.6, extra = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(hex), roughness: r, metalness: 0 }, extra)); m.userData.uvScale = 1; return m; };
  VLM.wallA = tintMat(MAT.plaster_bianco, '#f4cd62');
  VLM.wallB = tintMat(MAT.plaster_bianco, '#9cd2bf');
  VLM.inA = tintMat(MAT.plasterIn_bianco, '#f3e6cc');
  VLM.inB = tintMat(MAT.plasterIn_bianco, '#dfece4');
  VLM.ceil = MAT.plasterIn_bianco;
  VLM.garage = tintMat(MAT.plasterIn_bianco, '#c9c4ba');
  VLM.shutA = tintMat(MAT.paintWhite, '#3d7ea6');
  VLM.shutB = tintMat(MAT.paintWhite, '#b9473c');
  VLM.doorA = tintMat(MAT.paintWhite, '#c4473a');
  VLM.doorB = tintMat(MAT.paintWhite, '#2f6d8c');
  VLM.roofA = tintMat(MAT.roof, '#9ea7b3');
  VLM.roofB = MAT.roof;
  VLM.carpetA = emat('carpet_blue', '#7684a0'); VLM.carpetB = emat('carpet_red', '#a0766a');
  VLM.pane = new THREE.MeshPhysicalMaterial({ color: 0x9fb4bc, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.38, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4 });
  VLM.pane.userData.uvScale = 1;
  VLM.busIn = solid('#c9cfc4', 0.7);
  VLM.sofaA = MAT.fabric('#6f8a62'); VLM.sofaB = MAT.fabric('#a8665a');
  VLM.carA = paint('#5e9cb8'); VLM.carB = paint('#d0574a');
  VLM.carRoof = paint('#efe8d8');
  VLM.bus = paint('#f0a81c', 0.42);
  VLM.truck = paint('#ebe5d6', 0.45);
  VLM.pickup = paint('#b0412f', 0.48);
  VLM.camper = paint('#eee4cc', 0.5);
  VLM.stripe = paint('#3a8f8a', 0.4);
  VLM.fridge = paint('#bfe3d6', 0.3);
  VLM.enamel = paint('#f2efe8', 0.3);
  VLM.formica = solid('#c94a3d', 0.35);
  VLM.manq = solid('#e9d6bd', 0.38, { metalness: 0.05 });
  VLM.pink = solid('#f06a9a', 0.5);
  VLM.gnomeRed = solid('#c8322c', 0.6); VLM.gnomeBlue = solid('#2f5ea8', 0.6); VLM.beard = solid('#f2efe6', 0.8);
  VLM.seat = MAT.fabric('#5b6f7a');
  VLM.screen = new THREE.MeshPhysicalMaterial({ color: 0x202826, roughness: 0.15, metalness: 0, clearcoat: 1, emissive: 0x1d2a26, emissiveIntensity: 0.5 });
  VLM.screen.userData.uvScale = 1;
  VLM.swingRed = paint('#c0392b', 0.5);
  VLM.signs = {
    zona: CanvasTex.sign('ZONA MILITARE · VIETATO L\'ACCESSO', { w: 1024, h: 256, bg: '#c8a21e', fg: '#151515', font: 'Arial, sans-serif', size: 0.24, weight: 900, borderColor: 'rgba(20,20,20,0.85)' }),
    vendesi: CanvasTex.sign('VENDESI', { w: 512, h: 256, bg: '#f2ede2', fg: '#b2302a', font: 'Georgia, serif', size: 0.4, weight: 900, borderColor: 'rgba(178,48,42,0.8)' }),
    latte: CanvasTex.make(1024, 256, (g, w, h) => {
      g.fillStyle = '#ebe5d6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2f6d8c'; g.fillRect(0, h * 0.78, w, h * 0.1);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'italic 900 118px Georgia, serif'; g.fillText('Latte Fresco', w / 2, h * 0.36);
      g.fillStyle = '#c4473a'; g.font = '700 40px Arial, sans-serif'; g.fillText('LATTERIA DI VILLETTE · CONSEGNE A DOMICILIO', w / 2, h * 0.66);
    }),
    bus: CanvasTex.sign('SCUOLABUS', { w: 512, h: 128, bg: '#f0a81c', fg: '#151515', font: 'Arial, sans-serif', size: 0.62, weight: 900, border: false }),
    paint: CanvasTex.make(256, 192, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h * 0.7); sky.addColorStop(0, '#3f6f9a'); sky.addColorStop(1, '#f2b46a');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f7e2a0'; g.beginPath(); g.arc(w * 0.7, h * 0.5, 18, 0, TAU); g.fill();
      g.fillStyle = '#9a5a3c'; g.beginPath(); g.moveTo(0, h * 0.62); g.lineTo(40, h * 0.62); g.lineTo(52, h * 0.42); g.lineTo(110, h * 0.42); g.lineTo(122, h * 0.62); g.lineTo(w, h * 0.6); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      g.fillStyle = '#d9b27a'; g.fillRect(0, h * 0.72, w, h * 0.28);
      g.fillStyle = '#4a5a2a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(20 + i * 28, h * 0.78 + (i % 3) * 6, 5, 0, TAU); g.fill(); }
    }),
    trefoil: CanvasTex.make(256, 256, (g, w, h) => {
      g.fillStyle = '#e8c21c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#151515'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = '#151515';
      const cx = w / 2, cy = h / 2 + 4;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + i * TAU / 3;
        g.beginPath(); g.moveTo(cx + Math.cos(a - 0.52) * 26, cy + Math.sin(a - 0.52) * 26);
        g.arc(cx, cy, 92, a - 0.52, a + 0.52); g.arc(cx, cy, 26, a + 0.52, a - 0.52, true); g.fill();
      }
      g.beginPath(); g.arc(cx, cy, 17, 0, TAU); g.fill();
    }),
  };
}

// ---------------------------------------------------------------- small helpers
// box glued to a wall face: axis 'x' = wall along x at z = c, 'z' = wall along z at x = c; dir = outward sign
function vlFace(ctx, mat, axis, c, dir, a0, a1, y0, y1, d0, d1) {
  const p = c + dir * d0, q = c + dir * d1;
  if (axis === 'x') ctx.G.box(mat, a0, y0, Math.min(p, q), a1, y1, Math.max(p, q));
  else ctx.G.box(mat, Math.min(p, q), y0, a0, Math.max(p, q), y1, a1);
}
function vlBlock(ctx, mat, axis, a0, a1, c0, c1, y0, y1, o) {
  if (axis === 'x') ctx.block(mat, a0, y0, Math.min(c0, c1), a1, y1, Math.max(c0, c1), o);
  else ctx.block(mat, Math.min(c0, c1), y0, a0, Math.max(c0, c1), y1, a1, o);
}
// Solid wall slab with rectangular holes [a0, a1, y0, y1]; holes may be stacked (door under a window)
function vlCut(ctx, mat, axis, a0, a1, c0, c1, y0, y1, ops) {
  const xs = [a0, a1];
  for (const p of ops) for (const v of [p[0], p[1]]) if (v > a0 && v < a1) xs.push(v);
  xs.sort((p, q) => p - q);
  for (let i = 0; i < xs.length - 1; i++) {
    const s0 = xs[i], s1 = xs[i + 1];
    if (s1 - s0 < 0.001) continue;
    const mid = (s0 + s1) / 2;
    const holes = ops.filter((p) => p[0] < mid && p[1] > mid).map((p) => [p[2], p[3]]).sort((p, q) => p[0] - q[0]);
    let y = y0;
    for (const [h0, h1] of holes) { if (h0 > y + 0.001) vlBlock(ctx, mat, axis, s0, s1, c0, c1, y, Math.min(h0, y1)); y = Math.max(y, h1); }
    if (y1 > y + 0.001) vlBlock(ctx, mat, axis, s0, s1, c0, c1, y, y1);
  }
}
// Wall with openings, exterior skin on the cOut side and interior skin on the cIn side.
// ops: { a0, a1, y0, y1, k: 'win' | 'door' | 'glass' | 'gdoor' | 'hole' }
// o.inSpan = [a0, a1] narrows the interior skin (corners are filled with the exterior one)
function vlWall(ctx, axis, a0, a1, cOut, cIn, y0, y1, ops, mOut, mIn, o = {}) {
  const cm = (cOut + cIn) / 2, dir = Math.sign(cOut - cIn);
  const arr = ops.map((p) => [p.a0, p.a1, p.y0, p.y1]);
  const run = (mat, s0, s1, ca, cb) => {
    const sub = arr.filter((p) => p[1] > s0 && p[0] < s1);
    vlCut(ctx, mat, axis, s0, s1, Math.min(ca, cb), Math.max(ca, cb), y0, y1, sub);
  };
  run(mOut, a0, a1, cOut, cm);
  const ia = o.inSpan || [a0, a1];
  run(mIn, ia[0], ia[1], cm, cIn);
  if (o.inSpan) {
    if (ia[0] > a0) vlBlock(ctx, mOut, axis, a0, ia[0], cm, cIn, y0, y1);
    if (ia[1] < a1) vlBlock(ctx, mOut, axis, ia[1], a1, cm, cIn, y0, y1);
  }
  const trim = o.trim || MAT.paintWhite;
  for (const p of ops) {
    if (p.k === 'hole' || o.noTrim) continue;
    const w = 0.09;
    const yb = p.k === 'win' || p.k === 'glass' ? p.y0 - 0.02 : p.y0;
    vlFace(ctx, trim, axis, cOut, dir, p.a0 - w, p.a0, yb, p.y1 + w, 0, 0.05);
    vlFace(ctx, trim, axis, cOut, dir, p.a1, p.a1 + w, yb, p.y1 + w, 0, 0.05);
    vlFace(ctx, trim, axis, cOut, dir, p.a0 - w - 0.03, p.a1 + w + 0.03, p.y1, p.y1 + w + 0.05, 0, 0.08);
    if (p.k === 'win' || p.k === 'glass') {
      vlFace(ctx, trim, axis, cOut, dir, p.a0 - w - 0.05, p.a1 + w + 0.05, p.y0 - 0.08, p.y0, 0, 0.11);
      if (o.shutter && p.a1 - p.a0 < 1.7) {
        const sw = (p.a1 - p.a0) / 2;
        vlFace(ctx, o.shutter, axis, cOut, dir, p.a0 - w - 0.03 - sw, p.a0 - w - 0.03, p.y0, p.y1, 0.005, 0.04);
        vlFace(ctx, o.shutter, axis, cOut, dir, p.a1 + w + 0.03, p.a1 + w + 0.03 + sw, p.y0, p.y1, 0.005, 0.04);
      }
      // interior sill and frame
      vlFace(ctx, trim, axis, cIn, -dir, p.a0 - 0.06, p.a1 + 0.06, p.y0 - 0.05, p.y0, 0, 0.06);
      if (o.curtain && p.k === 'win') {
        const cw = 0.3;
        vlFace(ctx, o.curtain, axis, cIn, -dir, p.a0 - cw, p.a0 + 0.06, p.y0 - 0.25, p.y1 + 0.18, 0.02, 0.07);
        vlFace(ctx, o.curtain, axis, cIn, -dir, p.a1 - 0.06, p.a1 + cw, p.y0 - 0.25, p.y1 + 0.18, 0.02, 0.07);
        vlFace(ctx, MAT.woodDark, axis, cIn, -dir, p.a0 - cw - 0.05, p.a1 + cw + 0.05, p.y1 + 0.18, p.y1 + 0.22, 0.03, 0.08);
      }
    }
    if (p.k === 'win' && o.pane !== false) {
      // see-through pane without collision: reads as a window, players and bullets still go through
      if (axis === 'x') ctx.G.quad(VLM.pane, [p.a0, p.y0, cm], [p.a1, p.y0, cm], [p.a1, p.y1, cm], [p.a0, p.y1, cm]);
      else ctx.G.quad(VLM.pane, [cm, p.y0, p.a1], [cm, p.y0, p.a0], [cm, p.y1, p.a0], [cm, p.y1, p.a1]);
      const ym = p.y0 + (p.y1 - p.y0) * 0.55;
      vlFace(ctx, trim, axis, cm, dir, p.a0, p.a1, ym - 0.03, ym + 0.03, -0.035, 0.035);
    }
    if (p.k === 'glass') {
      // fixed pane: blocks movement and bullets, with a cross mullion
      if (axis === 'x') { ctx.G.quad(MAT.glass, [p.a0, p.y0, cm + dir * 0.01], [p.a1, p.y0, cm + dir * 0.01], [p.a1, p.y1, cm + dir * 0.01], [p.a0, p.y1, cm + dir * 0.01]); ctx.G.quad(MAT.glass, [p.a1, p.y0, cm - dir * 0.01], [p.a0, p.y0, cm - dir * 0.01], [p.a0, p.y1, cm - dir * 0.01], [p.a1, p.y1, cm - dir * 0.01]); }
      else { ctx.G.quad(MAT.glass, [cm + dir * 0.01, p.y0, p.a1], [cm + dir * 0.01, p.y0, p.a0], [cm + dir * 0.01, p.y1, p.a0], [cm + dir * 0.01, p.y1, p.a1]); ctx.G.quad(MAT.glass, [cm - dir * 0.01, p.y0, p.a0], [cm - dir * 0.01, p.y0, p.a1], [cm - dir * 0.01, p.y1, p.a1], [cm - dir * 0.01, p.y1, p.a0]); }
      const mid = (p.a0 + p.a1) / 2, ym = (p.y0 + p.y1) / 2;
      vlFace(ctx, trim, axis, cm, dir, mid - 0.025, mid + 0.025, p.y0, p.y1, -0.03, 0.03);
      vlFace(ctx, trim, axis, cm, dir, p.a0, p.a1, ym - 0.025, ym + 0.025, -0.03, 0.03);
      if (axis === 'x') ctx.solid(p.a0, p.y0, cm - 0.03, p.a1, p.y1, cm + 0.03, 'glass');
      else ctx.solid(cm - 0.03, p.y0, p.a0, cm + 0.03, p.y1, p.a1, 'glass');
    }
    if (p.k === 'door' && o.doorMat) {
      // door leaf swung open against the inside of the wall
      const L = p.a1 - p.a0;
      const ci = cIn - dir * 0.02;
      if (axis === 'x') ctx.G.box(o.doorMat, p.a0 + 0.02, p.y0, Math.min(ci, ci - dir * L), p.a0 + 0.07, p.y1 - 0.03, Math.max(ci, ci - dir * L));
      else ctx.G.box(o.doorMat, Math.min(ci, ci - dir * L), p.y0, p.a0 + 0.02, Math.max(ci, ci - dir * L), p.y1 - 0.03, p.a0 + 0.07);
    }
  }
}
// local frame for props and vehicles; yaw must be a multiple of 90 degrees
function vlLocal(ctx, x, z, rot, y = 0) {
  const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z);
  const v = new THREE.Vector3();
  const P = (p) => v.set(p[0], p[1], p[2]).applyMatrix4(m).toArray();
  return {
    m, P,
    box(mat, x0, y0, z0, x1, y1, z1, o = {}) {
      const b = xfBox([x0, y0, z0, x1, y1, z1], m);
      if (mat) ctx.G.box(mat, b[0], b[1], b[2], b[3], b[4], b[5], { local: o.local });
      if (o.solid) ctx.solid(b[0], b[1], b[2], b[3], b[4], b[5], o.surf || 'metal', o.flags || 0);
    },
    solid(x0, y0, z0, x1, y1, z1, surf = 'metal', flags = 0) { const b = xfBox([x0, y0, z0, x1, y1, z1], m); ctx.solid(b[0], b[1], b[2], b[3], b[4], b[5], surf, flags); },
    at(mat, g, lx, ly, lz, o) { ctx.G.geom(mat, g, m.clone().multiply(new THREE.Matrix4().makeTranslation(lx, ly, lz)), o); },
    geom(mat, g, lm, o) { ctx.G.geom(mat, g, m.clone().multiply(lm), o); },
    quad(mat, a, b, c, d, uvs) { ctx.G.quad(mat, P(a), P(b), P(c), P(d), uvs); },
    rod(mat, a, b, r, seg) { rod(ctx, mat, P(a), P(b), r, seg); },
  };
}
// catalog object merged into a map context (yaw multiple of 90 degrees)
function vlCat(ctx, k, x, y, z, rot = 0, o = {}) {
  const ob = newObj(k, [x, y, z]);
  ob.r = rot; if (o.c) ob.c = o.c; if (o.m) ob.m = o.m; if (o.s) ob.s = o.s.slice(); if (o.a) Object.assign(ob.a, o.a);
  ob.seed = o.seed || (hashStr(k + x + ',' + z) >>> 0);
  const oc = buildObject(ob);
  const M = objMatrix(ob);
  ctx.G.absorbXf(oc.G, M);
  for (const b of oc.boxes) { const a = xfBox(b, M); ctx.boxes.push([a[0], a[1], a[2], a[3], a[4], a[5], b[6], b[7]]); }
  const v = new THREE.Vector3();
  for (const t of oc.tris) ctx.tris.push([v.set(...t[0]).applyMatrix4(M).toArray(), v.set(...t[1]).applyMatrix4(M).toArray(), v.set(...t[2]).applyMatrix4(M).toArray(), t[3]]);
}
function vlWheel(L, x, y, z, r, w, white) {
  const t = new THREE.CylinderGeometry(r, r, w, 18); t.rotateX(Math.PI / 2);
  L.at(MAT.rubber, t, x, y, z);
  const h = new THREE.CylinderGeometry(r * 0.48, r * 0.48, w + 0.02, 14); h.rotateX(Math.PI / 2);
  L.at(MAT.chrome, h, x, y, z);
  if (white) { const ww = new THREE.CylinderGeometry(r * 0.78, r * 0.78, w + 0.01, 18); ww.rotateX(Math.PI / 2); L.at(VLM.beard, ww, x, y, z); }
}
const vlSpans = (a0, a1, gaps) => {
  const out = []; let cur = a0;
  for (const g of gaps.slice().sort((p, q) => p[0] - q[0])) { if (g[0] > cur) out.push([cur, g[0]]); cur = Math.max(cur, g[1]); }
  if (cur < a1) out.push([cur, a1]);
  return out;
};
// fences: gaps are [a0, a1] intervals left open
function vlPicket(ctx, axis, a0, a1, c, gaps = [], h = 1.0) {
  const W = MAT.paintWhite;
  for (const [s0, s1] of vlSpans(a0, a1, gaps)) {
    for (let s = s0 + 0.06; s < s1 - 0.03; s += 0.16) {
      if (axis === 'x') ctx.G.box(W, s - 0.04, 0, c - 0.015, s + 0.04, h, c + 0.015); else ctx.G.box(W, c - 0.015, 0, s - 0.04, c + 0.015, h, s + 0.04);
    }
    for (const y of [0.25, h - 0.25]) vlBlock(ctx, W, axis, s0, s1, c + 0.015, c + 0.05, y, y + 0.08, { collide: false });
    for (const s of [s0 + 0.04, s1 - 0.04]) vlBlock(ctx, W, axis, s - 0.05, s + 0.05, c - 0.05, c + 0.05, 0, h + 0.08, { collide: false });
    if (axis === 'x') ctx.solid(s0, 0, c - 0.05, s1, h, c + 0.05, 'wood', F_NORAY); else ctx.solid(c - 0.05, 0, s0, c + 0.05, h, s1, 'wood', F_NORAY);
  }
}
function vlPrivacy(ctx, axis, a0, a1, c, gaps = [], h = 2.0) {
  for (const [s0, s1] of vlSpans(a0, a1, gaps)) {
    vlBlock(ctx, MAT.wood, axis, s0, s1, c - 0.03, c + 0.03, 0, h, { surf: 'wood' });
    for (let s = s0; s <= s1 + 0.01; s += Math.max(1, (s1 - s0) / Math.ceil((s1 - s0) / 2.4))) {
      const ss = clamp(s, s0 + 0.06, s1 - 0.06);
      vlBlock(ctx, MAT.woodDark, axis, ss - 0.06, ss + 0.06, c - 0.08, c + 0.08, 0, h + 0.1, { collide: false });
    }
    for (const y of [0.3, h - 0.35]) vlBlock(ctx, MAT.woodDark, axis, s0, s1, c - 0.07, c + 0.07, y, y + 0.09, { collide: false });
  }
}
function vlChain(ctx, axis, a0, a1, c, gaps = [], h = 2.3) {
  const m = emat('chain');
  for (const [s0, s1] of vlSpans(a0, a1, gaps)) {
    const L = s1 - s0;
    if (axis === 'x') ctx.G.quad(m, [s0, 0.05, c], [s1, 0.05, c], [s1, h, c], [s0, h, c], [[0, 0], [L / 2, 0], [L / 2, h / 2], [0, h / 2]]);
    else ctx.G.quad(m, [c, 0.05, s0], [c, 0.05, s1], [c, h, s1], [c, h, s0], [[0, 0], [L / 2, 0], [L / 2, h / 2], [0, h / 2]]);
    const n = Math.max(1, Math.round(L / 3));
    for (let i = 0; i <= n; i++) { const s = s0 + L * i / n; rod(ctx, MAT.chrome, axis === 'x' ? [s, 0, c] : [c, 0, s], axis === 'x' ? [s, h + 0.05, c] : [c, h + 0.05, s], 0.035); }
    rod(ctx, MAT.chrome, axis === 'x' ? [s0, h, c] : [c, h, s0], axis === 'x' ? [s1, h, c] : [c, h, s1], 0.025);
    if (axis === 'x') ctx.solid(s0, 0, c - 0.04, s1, h, c + 0.04, 'metal', F_NORAY); else ctx.solid(c - 0.04, 0, s0, c + 0.04, h, s1, 'metal', F_NORAY);
  }
}
function vlHedge(ctx, x0, z0, x1, z1, h = 0.9) {
  ctx.G.box(MAT.foliage, x0, 0, z0, x1, h, z1, { skip: 'ny' });
  const n = Math.max(2, Math.round((x1 - x0) * (z1 - z0) * 2.5));
  for (let i = 0; i < n; i++) leafBall(ctx, lerp(x0, x1, ctx.r()), h - 0.05, lerp(z0, z1, ctx.r()), 0.32, 5, MAT.leaves2, 0.5);
  ctx.solid(x0, 0, z0, x1, h, z1, 'cloth', F_NORAY);
}
function vlSignPost(ctx, x, z, rot, tex, w, h, y = 1.2) {
  const L = vlLocal(ctx, x, z, rot);
  const key = 'sign_' + tex.uuid;
  if (!MAT[key]) { MAT[key] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 }); MAT[key].userData.uvScale = 1; }
  for (const s of [-w / 2 + 0.1, w / 2 - 0.1]) L.box(MAT.iron, s - 0.04, 0, -0.04, s + 0.04, y + h, 0.04, { solid: true });
  L.box(MAT.iron, -w / 2 - 0.03, y - 0.03, 0.04, w / 2 + 0.03, y + h + 0.03, 0.07);
  L.quad(MAT[key], [-w / 2, y, 0.075], [w / 2, y, 0.075], [w / 2, y + h, 0.075], [-w / 2, y + h, 0.075], [[0, 0], [1, 0], [1, 1], [0, 1]]);
}
function vlPlaque(ctx, axis, c, dir, s, y, w, h, tex) {
  const key = 'sign_' + tex.uuid;
  if (!MAT[key]) { MAT[key] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 }); MAT[key].userData.uvScale = 1; }
  const d = c + dir * 0.03;
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  if (axis === 'x') { if (dir > 0) ctx.G.quad(MAT[key], [s - w / 2, y, d], [s + w / 2, y, d], [s + w / 2, y + h, d], [s - w / 2, y + h, d], uv); else ctx.G.quad(MAT[key], [s + w / 2, y, d], [s - w / 2, y, d], [s - w / 2, y + h, d], [s + w / 2, y + h, d], uv); }
  else if (dir > 0) ctx.G.quad(MAT[key], [d, y, s + w / 2], [d, y, s - w / 2], [d, y + h, s - w / 2], [d, y + h, s + w / 2], uv);
  else ctx.G.quad(MAT[key], [d, y, s - w / 2], [d, y, s + w / 2], [d, y + h, s + w / 2], [d, y + h, s - w / 2], uv);
}

// ---------------------------------------------------------------- the house (A: yellow, north side)
function vlHouse(ctx) {
  const G = ctx.G, W = VLM.wallA, I = VLM.inA, T = VL.wt, gf = VL.gf, uf = VL.uf, eh = VL.eh;
  const X0 = -10, X1 = 2, ZB = -20, ZF = -12;
  const fq = (mat, x0, z0, x1, z1, y) => G.quad(mat, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]);
  const cq = (mat, x0, z0, x1, z1, y) => G.quad(mat, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]);
  const curtain = MAT.fabric('#e8d9b0');
  const wo = { shutter: VLM.shutA, curtain, doorMat: VLM.doorA };
  // ground floor slab
  G.box(emat('concrete_dark'), X0 + T, 0, ZB + T, X1 - T, gf - 0.005, ZF - T, { skip: 'py' });
  ctx.solid(X0 + T, 0, ZB + T, X1 - T, gf, ZF - T, 'wood');
  fq(emat('parquet'), X0 + T, ZB + T, -3.2, ZF - T, gf);
  fq(emat('checker'), -3.2, ZB + T, X1 - T, ZF - T, gf);
  // outer walls
  const win = (a0, a1, y0 = 1.25, y1 = 2.55, k = 'win') => ({ a0, a1, y0, y1, k });
  const door = (c, y0 = gf, w = 1.2) => ({ a0: c - w / 2, a1: c + w / 2, y0, y1: y0 + 2.25, k: 'door' });
  const up = (a0, a1) => win(a0, a1, 4.35, 5.75);
  vlWall(ctx, 'x', X0, X1, ZF, ZF - T, 0, eh, [door(-4.5), win(-8.8, -6.6), win(-1.4, 0.2, 1.28, 2.6), up(-8.3, -7.1), up(-5.1, -3.9), up(-1.4, -0.2)], W, I, Object.assign({ inSpan: [X0 + T, X1 - T] }, wo));
  vlWall(ctx, 'x', X0, X1, ZB, ZB + T, 0, eh, [door(-0.5), win(0.4, 1.45, 1.3, 2.5, 'glass'), win(-8.3, -7.3, 2.2, 2.95, 'glass'), up(-4.4, -3.2), up(-1.0, 0.2)], W, I, Object.assign({ inSpan: [X0 + T, X1 - T] }, wo));
  vlWall(ctx, 'z', ZB + T, ZF - T, X0, X0 + T, 0, eh, [win(-16.8, -15.2), up(-15.0, -13.8)], W, I, wo);
  // east wall: exterior above the garage roof, garage-facing below it
  vlWall(ctx, 'z', ZB + T, -19, X1, X1 - T, 0, eh, [], W, I, wo);
  vlWall(ctx, 'z', -19, ZF - T, X1, X1 - T, 0, 3.2, [door(-16.5)], VLM.garage, I, { trim: MAT.paintWhite, doorMat: VLM.doorA });
  vlWall(ctx, 'z', -19, ZF - T, X1, X1 - T, 3.2, eh, [up(-18.4, -17.2), up(-14.4, -13.2)], W, I, wo);
  // plinth band and string course
  const band = (y0, y1, mat, d) => {
    for (const [a0, a1] of vlSpans(X0 - 0.04, X1 + 0.04, [[-8.9, -1.1]])) vlFace(ctx, mat, 'x', ZF, 1, a0, a1, y0, y1, 0, d);
    for (const [a0, a1] of vlSpans(X0 - 0.04, X1 + 0.04, [[-1.2, 0.2]])) vlFace(ctx, mat, 'x', ZB, -1, a0, a1, y0, y1, 0, d);
    vlFace(ctx, mat, 'z', X0, -1, ZB - 0.04, ZF + 0.04, y0, y1, 0, d);
  };
  band(0, 0.55, MAT.brick, 0.04);
  for (const [a0, a1] of [[X0 - 0.05, X1 + 0.05]]) { vlFace(ctx, MAT.paintWhite, 'x', ZF, 1, a0, a1, uf - 0.18, uf - 0.04, 0, 0.06); vlFace(ctx, MAT.paintWhite, 'x', ZB, -1, a0, a1, uf - 0.18, uf - 0.04, 0, 0.06); }
  vlFace(ctx, MAT.paintWhite, 'z', X0, -1, ZB - 0.05, ZF + 0.05, uf - 0.18, uf - 0.04, 0, 0.06);
  vlFace(ctx, MAT.paintWhite, 'z', X1, 1, ZB - 0.05, -19.25, uf - 0.18, uf - 0.04, 0, 0.06);
  // ground floor partition (living | kitchen)
  vlWall(ctx, 'z', -18.0, ZF - T, -3.1, -3.3, gf, 3.1, [{ a0: -17.3, a1: -15.7, y0: gf, y1: 2.6, k: 'hole' }, { a0: -14.3, a1: -12.7, y0: gf, y1: 2.6, k: 'hole' }], I, I, { noTrim: true });
  // upper floor slab with the stair hole (x -7.4..-2.15, z -19.75..-18.0)
  const slab = (x0, z0, x1, z1) => { G.box(VLM.ceil, x0, 3.1, z0, x1, uf - 0.005, z1, { skip: 'py' }); ctx.solid(x0, 3.1, z0, x1, uf, z1, 'wood'); };
  slab(X0 + T, -18.0, X1 - T, ZF - T); slab(X0 + T, ZB + T, -7.4, -18.0); slab(-2.15, ZB + T, X1 - T, -18.0);
  fq(VLM.carpetA, X0 + T, -18.0, X1 - T, ZF - T, uf);
  fq(VLM.carpetA, X0 + T, ZB + T, -7.4, -18.0, uf);
  fq(VLM.carpetA, -2.15, ZB + T, X1 - T, -18.0, uf);
  // stairs: 16 steps with a 0.4 run (slope < 0.5 per nav cell), 1.75 wide, foot away from the
  // west wall so it can be reached from the living room; the top lands in the kitchen's back corner
  stairs(ctx, 'x', 1, -8.55, ZB + T, -18.0, gf, uf, 0.4, MAT.wood, MAT.woodDark);
  G.box(MAT.woodDark, -8.55, gf, -18.0, -2.15, gf + 0.06, -17.97);
  // railings around the stair hole
  const rail = (x0, z0, x1, z1) => {
    const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 'x' : 'z';
    if (ax === 'x') { G.box(MAT.woodDark, x0, uf + 0.92, z0 - 0.04, x1, uf + 1.0, z0 + 0.04); for (let x = x0 + 0.05; x < x1; x += 0.3) G.box(MAT.paintWhite, x - 0.02, uf, z0 - 0.02, x + 0.02, uf + 0.92, z0 + 0.02); ctx.solid(x0, uf, z0 - 0.04, x1, uf + 1.0, z0 + 0.04, 'wood', F_NORAY); }
    else { G.box(MAT.woodDark, x0 - 0.04, uf + 0.92, z0, x0 + 0.04, uf + 1.0, z1); for (let z = z0 + 0.05; z < z1; z += 0.3) G.box(MAT.paintWhite, x0 - 0.02, uf, z - 0.02, x0 + 0.02, uf + 0.92, z + 0.02); ctx.solid(x0 - 0.04, uf, z0, x0 + 0.04, uf + 1.0, z1, 'wood', F_NORAY); }
  };
  rail(-7.4, -18.0, -2.9, -18.0);
  rail(-7.4, ZB + T, -7.4, -18.0);
  // upper partition (front bedroom | back room)
  vlWall(ctx, 'x', X0 + T, X1 - T, -15.9, -16.1, uf, eh, [{ a0: -7.3, a1: -5.7, y0: uf, y1: 5.65, k: 'hole' }, { a0: -1.3, a1: 0.3, y0: uf, y1: 5.65, k: 'hole' }], I, I, { noTrim: true });
  // ceiling + attic slab (keeps people out of the roof space)
  cq(VLM.ceil, X0 + T, ZB + T, X1 - T, ZF - T, eh - 0.005);
  ctx.solid(X0, eh, ZB, X1, eh + 0.2, ZF, 'wood');
  // roof (tinted tiles), chimney and a TV aerial
  const R0 = MAT.roof;
  MAT.roof = VLM.roofA;
  try {
    roofGable(ctx, X0, ZB, X1, ZF, eh, 2.0, 'x', 0.5, W);
    chimney(ctx, -7.6, -17.6, eh + 1.2, 1.5, MAT.brick);
  } finally { MAT.roof = R0; }
  rod(ctx, MAT.iron, [-1.2, eh + 2.0, -16], [-1.2, eh + 3.6, -16], 0.025);
  for (const [y, w] of [[eh + 3.0, 0.9], [eh + 3.3, 0.7], [eh + 3.55, 0.5]]) rod(ctx, MAT.iron, [-1.2 - w, y, -16], [-1.2 + w, y, -16], 0.012);
  rod(ctx, MAT.iron, [-1.2, eh + 3.2, -16 - 0.6], [-1.2, eh + 3.2, -16 + 0.6], 0.012);
  // ---------------- porch
  G.box(MAT.wood, -8.8, 0, -12, -1.2, gf, -9.8, {}); ctx.solid(-8.8, 0, -12, -1.2, gf, -9.8, 'wood');
  ctx.block(emat('concrete'), -5.4, 0, -9.8, -3.6, 0.15, -9.35);
  for (const x of [-8.6, -1.4]) ctx.block(MAT.paintWhite, x - 0.08, gf, -10.08, x + 0.08, 3.0, -9.92);
  G.box(MAT.paintWhite, -9.1, 3.0, -12, -0.9, 3.15, -9.6, { skip: 'py' });
  fq(VLM.roofA, -9.1, -12, -0.9, -9.6, 3.15);
  ctx.solid(-9.1, 3.0, -12, -0.9, 3.15, -9.6, 'wood');
  for (const x of [-8.6, -1.4]) { G.box(MAT.paintWhite, x - 0.03, gf + 0.9, -10.0, x + 0.03, gf + 0.95, -10.0); }
  railing(ctx, -8.6, -9.95, -5.6, -9.95, gf, 0.85); railing(ctx, -3.4, -9.95, -1.4, -9.95, gf, 0.85);
  ctx.solid(-8.6, gf, -10.0, -5.6, gf + 0.85, -9.9, 'metal', F_NORAY); ctx.solid(-3.4, gf, -10.0, -1.4, gf + 0.85, -9.9, 'metal', F_NORAY);
  // porch bench and lamp
  ctx.block(MAT.woodDark, -8.4, gf, -11.85, -6.9, gf + 0.45, -11.4, { surf: 'wood' });
  ctx.G.box(MAT.woodDark, -8.4, gf + 0.45, -11.9, -6.9, gf + 0.95, -11.82);
  wallLamp(ctx, facade(X0, ZB, X1, ZF, 's'), -3.35 - X0, 2.65);
  vlPlaque(ctx, 'x', ZF, 1, -2.9, 1.7, 0.36, 0.22, CanvasTex.sign('12', { w: 128, h: 80, bg: '#1d2c4a', fg: '#f3efe2', size: 0.7 }));
  // ---------------- garage (x 2..8.2, z -19..-12) with a flat roof
  const GM = VLM.garage;
  G.quad(emat('concrete'), [X1, 0.015, ZF], [8.2, 0.015, ZF], [8.2, 0.015, -19], [X1, 0.015, -19]);
  vlWall(ctx, 'x', X1, 8.2, ZF, ZF - T, 0, 3.2, [{ a0: 2.6, a1: 7.6, y0: 0, y1: 2.6, k: 'gdoor' }], W, GM, { inSpan: [X1, 7.95] });
  vlWall(ctx, 'x', X1, 8.2, -19, -18.75, 0, 3.2, [door(5.5, 0), win(2.7, 3.9, 1.3, 2.2, 'glass')], W, GM, { inSpan: [X1, 7.95], doorMat: VLM.doorA });
  vlWall(ctx, 'z', -18.75, ZF - T, 8.2, 7.95, 0, 3.2, [win(-16.6, -15.2, 1.3, 2.2, 'glass')], W, GM, {});
  // roll-up door, raised most of the way
  ctx.block(MAT.paintWhite, 2.6, 2.05, -12.2, 7.6, 2.6, -12.08);
  for (let y = 2.12; y < 2.6; y += 0.14) G.box(MAT.paintWhite, 2.6, y, -12.08, 7.6, y + 0.03, -12.06);
  G.box(MAT.metal, 2.55, 2.6, -12.6, 7.65, 2.95, -12.26);
  vlFace(ctx, MAT.brick, 'x', ZF, 1, 7.6, 8.24, 0, 0.55, 0, 0.04);
  G.box(MAT.paintWhite, 1.95, 3.2, -19.25, 8.45, 3.45, -11.75, { skip: 'py' });
  G.quad(emat('gravel'), [1.95, 3.45, -11.75], [8.45, 3.45, -11.75], [8.45, 3.45, -19.25], [1.95, 3.45, -19.25]);
  ctx.solid(1.95, 3.2, -19.25, 8.45, 3.45, -11.75, 'stone');
  for (const [x0, z0, x1, z1] of [[1.95, -11.8, 8.45, -11.72], [8.4, -19.25, 8.48, -11.72], [1.95, -19.28, 8.45, -19.2]]) G.box(MAT.paintWhite, x0, 3.45, z0, x1, 3.58, z1);
  drainPipe(ctx, facade(X1, -19, 8.2, ZF, 'e'), 0.2, 0.05, 3.3);
  // garage contents: workbench, shelves, tyres, a lawn mower
  ctx.block(MAT.woodDark, 7.25, 0, -18.6, 7.9, 0.92, -16.2, { surf: 'wood' });
  ctx.G.box(MAT.wood, 7.2, 0.92, -18.65, 7.95, 0.98, -16.15);
  vlCat(ctx, 'shelf', 3.4, 0, -18.4, 0);
  vlCat(ctx, 'tires', 6.9, 0, -13.2, 0);
  vlCat(ctx, 'barrel', 7.4, 0, -15.0, 0);
  ctx.block(VLM.swingRed, 4.4, 0.12, -14.3, 5.0, 0.42, -13.8);
  rod(ctx, MAT.iron, [4.7, 0.42, -14.05], [4.7, 1.05, -14.85], 0.02);
  // ---------------- furniture
  // living room: sofa facing the TV, coffee table, rug, armchair, floor lamp, bookcase
  G.quad(MAT.fabric('#9b3b33'), [-8.9, gf + 0.004, -13.6], [-6.4, gf + 0.004, -13.6], [-6.4, gf + 0.004, -16.9], [-8.9, gf + 0.004, -16.9]);
  ctx.block(VLM.sofaA, -6.3, gf, -16.6, -5.5, gf + 0.42, -14.0, { surf: 'cloth' });
  ctx.block(VLM.sofaA, -5.5, gf, -16.6, -5.22, gf + 0.88, -14.0, { surf: 'cloth' });
  for (const z of [-16.6, -14.2]) ctx.G.box(VLM.sofaA, -6.3, gf + 0.42, z, -5.5, gf + 0.62, z + 0.2);
  ctx.block(MAT.woodDark, -9.75, gf, -14.55, -9.2, gf + 0.55, -13.25, { surf: 'wood' });
  ctx.block(MAT.wood, -9.72, gf + 0.55, -14.3, -9.25, gf + 1.1, -13.5, { surf: 'wood' });
  ctx.G.quad(VLM.screen, [-9.245, gf + 0.64, -14.17], [-9.245, gf + 0.64, -13.63], [-9.245, gf + 1.02, -13.63], [-9.245, gf + 1.02, -14.17]);
  rod(ctx, MAT.iron, [-9.5, gf + 1.1, -13.9], [-9.5, gf + 1.5, -14.15], 0.008); rod(ctx, MAT.iron, [-9.5, gf + 1.1, -13.9], [-9.5, gf + 1.5, -13.65], 0.008);
  ctx.block(MAT.woodDark, -8.3, gf, -15.8, -7.3, gf + 0.42, -14.9, { surf: 'wood' });
  ctx.block(VLM.sofaA, -8.4, gf, -13.25, -7.6, gf + 0.45, -12.5, { surf: 'cloth' });
  ctx.G.box(VLM.sofaA, -8.4, gf, -12.6, -7.6, gf + 0.9, -12.5);
  rod(ctx, MAT.brass, [-6.0, gf, -12.7], [-6.0, gf + 1.55, -12.7], 0.02);
  gAt(ctx, MAT.fabric('#efe3c0'), new THREE.CylinderGeometry(0.16, 0.24, 0.3, 12, 1, true), -6.0, gf + 1.6, -12.7);
  // kitchen: counters, sink under the window, fridge, stove, table
  ctx.block(MAT.paintWhite, 1.15, gf, -15.8, X1 - T, gf + 0.9, -12.3, { surf: 'wood' });
  ctx.G.box(VLM.formica, 1.1, gf + 0.9, -15.85, X1 - T, gf + 0.95, -12.25);
  ctx.block(MAT.paintWhite, -1.6, gf, -12.85, 0.4, gf + 0.9, -12.25, { surf: 'wood' });
  ctx.G.box(VLM.formica, -1.65, gf + 0.9, -12.9, 0.45, gf + 0.95, -12.25);
  ctx.G.box(MAT.chrome, -0.9, gf + 0.95, -12.75, -0.3, gf + 0.97, -12.4);
  ctx.G.box(MAT.paintWhite, 1.4, 2.0, -15.8, X1 - T, 2.65, -12.3);
  ctx.G.geom(VLM.fridge, new RoundedBoxGeometry(0.72, 1.75, 0.72, 3, 0.1), new THREE.Matrix4().makeTranslation(1.37, gf + 0.875, -19.36));
  ctx.solid(1.0, gf, -19.73, 1.74, gf + 1.75, -19.0, 'metal');
  ctx.block(VLM.enamel, 1.1, gf, -18.85, X1 - T, gf + 0.92, -18.05);
  for (const [x, z] of [[1.3, -18.25], [1.3, -18.65], [1.55, -18.25], [1.55, -18.65]]) gAt(ctx, MAT.iron, new THREE.CylinderGeometry(0.09, 0.09, 0.02, 10), x, gf + 0.93, z);
  ctx.block(VLM.formica, -1.8, gf + 0.72, -16.6, -0.4, gf + 0.78, -15.6);
  for (const [x, z] of [[-1.72, -16.52], [-0.48, -16.52], [-1.72, -15.68], [-0.48, -15.68]]) ctx.G.box(MAT.chrome, x - 0.02, gf, z - 0.02, x + 0.02, gf + 0.72, z + 0.02);
  ctx.solid(-1.8, gf, -16.6, -0.4, gf + 0.78, -15.6, 'wood', F_NORAY);
  for (const [x, z] of [[-2.15, -16.1], [-0.05, -16.1], [-1.1, -17.0], [-1.1, -15.2]]) {
    ctx.G.box(VLM.formica, x - 0.2, gf + 0.44, z - 0.2, x + 0.2, gf + 0.49, z + 0.2);
    for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) ctx.G.box(MAT.chrome, x + dx - 0.015, gf, z + dz - 0.015, x + dx + 0.015, gf + 0.44, z + dz + 0.015);
  }
  // upstairs: bed, wardrobe, dresser, toy chest, desk and boxes
  ctx.block(MAT.woodDark, -9.7, uf, -15.8, -7.7, uf + 0.42, -14.0, { surf: 'wood' });
  ctx.G.box(MAT.fabric('#f1ece0'), -9.65, uf + 0.42, -15.75, -7.75, uf + 0.56, -14.05);
  ctx.G.box(MAT.fabric('#3d6f9e'), -9.0, uf + 0.5, -15.8, -7.7, uf + 0.6, -13.98);
  ctx.G.box(MAT.woodDark, -9.75, uf, -15.85, -9.65, uf + 1.1, -13.95);
  ctx.block(MAT.woodDark, 0.6, uf, -15.85, X1 - T, uf + 2.0, -15.25, { surf: 'wood' });
  ctx.block(MAT.wood, -4.6, uf, -12.85, -3.0, uf + 0.85, -12.3, { surf: 'wood' });
  ctx.block(VLM.shutA, -6.4, uf, -15.75, -5.6, uf + 0.5, -15.2, { surf: 'wood' });
  ctx.block(MAT.wood, -1.2, uf, -19.7, 0.6, uf + 0.76, -19.05, { surf: 'wood' });
  for (const [x, z, s] of [[1.2, -17.0, 0.6], [1.25, -17.0 + 0.62, 0.5], [1.2, -17.0, 0.45]]) ctx.block(MAT.fabric('#b08a5a'), x - s / 2, uf + (s === 0.45 ? 0.6 : 0), z - s / 2, x + s / 2, uf + (s === 0.45 ? 1.05 : s), z + s / 2, { surf: 'cloth' });
  vlInteriorTrim(ctx);
  // interior lights (one per floor)
  ctx.lights.push({ type: 'point', pos: [-6.0, 2.75, -15.5], color: 0xffd9a8, intensity: 5, distance: 10 });
  ctx.lights.push({ type: 'point', pos: [-3.5, 5.9, -16.0], color: 0xffe2b8, intensity: 4.5, distance: 10 });
}

// baseboards, pictures and a kitchen clock inside house A (coordinates of vlHouse)
function vlInteriorTrim(ctx) {
  const gf = VL.gf, uf = VL.uf, B = MAT.woodDark;
  const base = (axis, c, dir, a0, a1, y, gaps = []) => { for (const [s0, s1] of vlSpans(a0, a1, gaps)) vlFace(ctx, B, axis, c, dir, s0, s1, y, y + 0.1, 0, 0.022); };
  base('x', -12.25, -1, -9.75, 1.75, gf, [[-5.1, -3.9]]);
  base('x', -19.75, 1, -2.15, 1.75, gf, [[-1.1, 0.1]]);
  base('x', -19.75, 1, -9.75, -8.55, gf);
  base('z', -9.75, 1, -19.75, -12.25, gf);
  base('z', 1.75, -1, -19.75, -12.25, gf, [[-17.1, -15.9]]);
  base('z', -3.3, -1, -18.0, -12.25, gf, [[-17.3, -15.7], [-14.3, -12.7]]);
  base('z', -3.1, 1, -18.0, -12.25, gf, [[-17.3, -15.7], [-14.3, -12.7]]);
  base('x', -12.25, -1, -9.75, 1.75, uf);
  base('x', -19.75, 1, -2.15, 1.75, uf); base('x', -19.75, 1, -9.75, -7.4, uf);
  base('z', -9.75, 1, -19.75, -12.25, uf);
  base('z', 1.75, -1, -19.75, -12.25, uf);
  base('x', -15.9, 1, -9.75, 1.75, uf, [[-7.3, -5.7], [-1.3, 0.3]]);
  base('x', -16.1, -1, -9.75, 1.75, uf, [[-7.3, -5.7], [-1.3, 0.3]]);
  const pic = (axis, c, dir, sc, y, w, h) => {
    vlFace(ctx, MAT.woodDark, axis, c, dir, sc - w / 2 - 0.05, sc + w / 2 + 0.05, y - 0.05, y + h + 0.05, 0, 0.03);
    vlPlaque(ctx, axis, c, dir, sc, y, w, h, VLM.signs.paint);
  };
  pic('x', -12.25, -1, -5.85, gf + 1.45, 0.8, 0.6);
  pic('x', -15.9, 1, -3.5, uf + 1.2, 1.0, 0.7);
  pic('z', -9.75, 1, -17.6, uf + 1.15, 0.7, 0.5);
  // kitchen wall clock
  const clock = new THREE.CylinderGeometry(0.17, 0.17, 0.04, 20); clock.rotateZ(Math.PI / 2);
  gAt(ctx, VLM.swingRed, clock, 1.73, gf + 2.05, -17.55);
  const face = new THREE.CircleGeometry(0.14, 20); face.rotateY(-Math.PI / 2);
  gAt(ctx, VLM.enamel, face, 1.705, gf + 2.05, -17.55);
  ctx.G.box(MAT.iron, 1.7, gf + 2.05, -17.56, 1.703, gf + 2.16, -17.54);
  ctx.G.box(MAT.iron, 1.7, gf + 2.04, -17.63, 1.703, gf + 2.06, -17.55);
}

// ---------------------------------------------------------------- props
function vlMannequin(ctx, x, y, z, rot, pose = 0) {
  const L = vlLocal(ctx, x, z, rot, y), M = VLM.manq;
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 10);
  for (const s of [-1, 1]) L.at(M, cap(0.07, 0.74), s * 0.1, 0.45, 0);
  L.at(M, new RoundedBoxGeometry(0.34, 0.2, 0.2, 2, 0.07), 0, 0.95, 0);
  const torso = cap(0.16, 0.34); torso.scale(1.08, 1, 0.68); L.at(M, torso, 0, 1.33, 0);
  L.at(M, new THREE.CylinderGeometry(0.045, 0.055, 0.12, 10), 0, 1.62, 0);
  const head = new THREE.SphereGeometry(0.115, 16, 12); head.scale(0.88, 1.12, 0.98); L.at(M, head, 0, 1.78, 0);
  for (const s of [-1, 1]) {
    const up = pose === 1 && s > 0;
    const arm = cap(0.05, 0.56);
    const lm = new THREE.Matrix4().compose(new THREE.Vector3(s * (up ? 0.3 : 0.24), up ? 1.75 : 1.2, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), up ? s * 2.7 : s * 0.12), new THREE.Vector3(1, 1, 1));
    L.geom(M, arm, lm);
  }
  L.solid(-0.26, 0, -0.14, 0.26, 1.92, 0.14, 'cloth');
}
function vlFlamingo(ctx, x, z, rot) {
  const L = vlLocal(ctx, x, z, rot);
  const body = new THREE.SphereGeometry(0.16, 12, 8); body.scale(1.5, 0.85, 0.8); L.at(VLM.pink, body, 0, 0.62, 0);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.18, 0.68, 0), new THREE.Vector3(0.3, 0.86, 0), new THREE.Vector3(0.2, 1.02, 0), new THREE.Vector3(0.26, 1.12, 0)]);
  L.geom(VLM.pink, new THREE.TubeGeometry(curve, 10, 0.03, 6, false), new THREE.Matrix4());
  L.at(VLM.pink, new THREE.SphereGeometry(0.05, 10, 8), 0.27, 1.13, 0);
  L.at(MAT.rubber, new THREE.ConeGeometry(0.02, 0.09, 6).rotateZ(-Math.PI / 2), 0.34, 1.11, 0);
  for (const s of [-0.03, 0.03]) L.rod(MAT.iron, [-0.02, 0, s], [-0.02, 0.56, s], 0.008);
}
function vlGnome(ctx, x, z, rot) {
  const L = vlLocal(ctx, x, z, rot);
  L.at(VLM.gnomeBlue, new THREE.CylinderGeometry(0.1, 0.13, 0.22, 12), 0, 0.11, 0);
  L.at(VLM.manq, new THREE.SphereGeometry(0.075, 12, 8), 0, 0.29, 0);
  L.at(VLM.beard, new THREE.ConeGeometry(0.07, 0.14, 10).rotateX(Math.PI), 0, 0.22, -0.05);
  L.at(VLM.gnomeRed, new THREE.ConeGeometry(0.085, 0.22, 12), 0, 0.42, 0);
}
function vlMailbox(ctx, x, z, rot) {
  const L = vlLocal(ctx, x, z, rot);
  L.box(MAT.woodDark, -0.05, 0, -0.05, 0.05, 1.0, 0.05);
  L.at(MAT.iron, new RoundedBoxGeometry(0.24, 0.24, 0.48, 3, 0.1), 0, 1.1, 0);
  L.box(VLM.swingRed, 0.12, 1.05, 0.05, 0.14, 1.32, 0.09);
}
function vlHydrant(ctx, x, z) {
  const p = VLM.swingRed;
  gAt(ctx, p, new THREE.CylinderGeometry(0.13, 0.15, 0.62, 14), x, 0.45, z);
  gAt(ctx, p, new THREE.SphereGeometry(0.14, 12, 8, 0, TAU, 0, Math.PI / 2), x, 0.76, z);
  const side = new THREE.CylinderGeometry(0.06, 0.06, 0.42, 10); side.rotateZ(Math.PI / 2);
  gAt(ctx, MAT.chrome, side, x, 0.58, z);
  ctx.solid(x - 0.16, 0, z - 0.16, x + 0.16, 0.9, z + 0.16, 'metal');
}
function vlBbq(ctx, x, z) {
  gAt(ctx, MAT.iron, new THREE.SphereGeometry(0.32, 16, 8, 0, TAU, Math.PI / 2, Math.PI / 2), x, 0.85, z);
  gAt(ctx, MAT.iron, new THREE.SphereGeometry(0.33, 16, 8, 0, TAU, 0, Math.PI / 2.2), x, 0.87, z);
  for (let i = 0; i < 3; i++) { const a = i * TAU / 3; rod(ctx, MAT.iron, [x + Math.cos(a) * 0.22, 0.6, z + Math.sin(a) * 0.22], [x + Math.cos(a) * 0.36, 0, z + Math.sin(a) * 0.36], 0.02); }
  ctx.solid(x - 0.34, 0, z - 0.34, x + 0.34, 1.15, z + 0.34, 'metal');
}
function vlSwing(ctx, x0, x1, zc) {
  const R = VLM.swingRed, H = 2.3;
  for (const x of [x0, x1]) {
    rod(ctx, R, [x, 0, zc - 0.85], [x, H, zc], 0.045); rod(ctx, R, [x, 0, zc + 0.85], [x, H, zc], 0.045);
    ctx.solid(x - 0.06, 0, zc - 0.9, x + 0.06, H, zc + 0.9, 'metal', F_NORAY);
  }
  rod(ctx, R, [x0, H, zc], [x1, H, zc], 0.05);
  for (const s of [0.3, 0.7]) {
    const sx = lerp(x0, x1, s);
    for (const dx of [-0.22, 0.22]) rod(ctx, MAT.chrome, [sx + dx, H, zc], [sx + dx, 0.5, zc], 0.008);
    ctx.G.box(MAT.rubber, sx - 0.26, 0.46, zc - 0.11, sx + 0.26, 0.5, zc + 0.11);
  }
}
function vlShed(ctx, x0, z0, x1, z1) {
  const P = tintMat(MAT.paintWhite, '#7f9a6a');
  ctx.block(P, x0, 0, z0, x1, 2.3, z1, { surf: 'wood' });
  ctx.G.box(emat('corrugated'), x0 - 0.2, 2.3, z0 - 0.2, x1 + 0.2, 2.42, z1 + 0.2);
  ctx.solid(x0 - 0.2, 2.3, z0 - 0.2, x1 + 0.2, 2.42, z1 + 0.2, 'metal');
  const F = facade(x0, z0, x1, z1, 'w');
  fbox(ctx, F, MAT.woodDark, (z1 - z0) / 2 - 0.55, (z1 - z0) / 2 + 0.55, 0.05, 2.0, 0, 0.04);
  fbox(ctx, F, MAT.brass, (z1 - z0) / 2 + 0.35, (z1 - z0) / 2 + 0.42, 1.0, 1.08, 0.04, 0.08);
}
function vlCamper(ctx, x, z, rot) {
  const L = vlLocal(ctx, x, z, rot);
  L.at(VLM.camper, new RoundedBoxGeometry(6.0, 2.35, 2.4, 4, 0.35), 0, 1.58, 0);
  L.box(VLM.stripe, -3.02, 1.25, -1.21, 3.02, 1.45, 1.21);
  for (const s of [-1, 1]) for (const wx of [-1.8, 0.4, 2.0]) L.box(MAT.glass, wx - 0.55, 1.75, s * 1.2 - 0.02, wx + 0.55, 2.3, s * 1.2 + 0.02);
  L.box(MAT.glass, 2.99, 1.8, -0.8, 3.03, 2.3, 0.8);
  L.box(MAT.woodDark, -0.9, 0.55, 1.19, -0.2, 2.4, 1.23);
  for (const s of [-1, 1]) vlWheel(L, -0.4, 0.38, s * 1.12, 0.38, 0.22, true);
  L.rod(MAT.iron, [3.0, 0.55, -0.5], [4.1, 0.45, 0], 0.04); L.rod(MAT.iron, [3.0, 0.55, 0.5], [4.1, 0.45, 0], 0.04);
  L.box(MAT.iron, 3.75, 0, -0.06, 3.87, 0.45, 0.06);
  L.solid(-3.0, 0, -1.2, 3.0, 2.75, 1.2, 'metal');
}
function vlDoghouse(ctx, x, z, rot) {
  const L = vlLocal(ctx, x, z, rot);
  L.box(VLM.shutB, -0.55, 0, -0.45, 0.55, 0.75, 0.45, { solid: true, surf: 'wood' });
  L.box(MAT.dark, -0.2, 0.05, 0.45, 0.2, 0.55, 0.47);
  L.quad(MAT.woodDark, [-0.65, 0.7, 0.55], [0.65, 0.7, 0.55], [0.65, 1.1, 0], [-0.65, 1.1, 0]);
  L.quad(MAT.woodDark, [0.65, 0.7, -0.55], [-0.65, 0.7, -0.55], [-0.65, 1.1, 0], [0.65, 1.1, 0]);
}
function vlPicnic(ctx, x, z) {
  ctx.block(MAT.wood, x - 0.95, 0.72, z - 0.42, x + 0.95, 0.78, z + 0.42, { surf: 'wood' });
  for (const s of [-1, 1]) ctx.block(MAT.wood, x - 0.95, 0.42, z + s * 0.62 - 0.14, x + 0.95, 0.47, z + s * 0.62 + 0.14, { surf: 'wood' });
  for (const sx of [-0.75, 0.75]) for (const s of [-1, 1]) ctx.G.box(MAT.woodDark, x + sx - 0.05, 0, z + s * 0.68 - 0.05, x + sx + 0.05, 0.75, z + s * 0.68 + 0.05);
  ctx.solid(x - 0.95, 0, z - 0.42, x + 0.95, 0.72, z + 0.42, 'wood', F_NORAY);
}
function vlWoodpile(ctx, x, z) {
  const g = new THREE.CylinderGeometry(0.13, 0.13, 1.1, 8); g.rotateZ(Math.PI / 2);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++) gAt(ctx, MAT.bark, g, x, 0.13 + r * 0.23, z - 0.7 + (i + r * 0.5) * 0.26);
  ctx.solid(x - 0.55, 0, z - 0.85, x + 0.55, 0.95, z + 0.85, 'wood');
}

// ---------------------------------------------------------------- vehicles
// 1950s station wagon; local +x is the front
function vlWagon(ctx, x, z, rot, paint) {
  const L = vlLocal(ctx, x, z, rot);
  L.at(paint, new RoundedBoxGeometry(5.1, 0.6, 1.94, 3, 0.16), 0, 0.74, 0);
  for (const s of [-1, 1]) L.at(paint, new RoundedBoxGeometry(1.2, 0.16, 0.12, 2, 0.05), -1.95, 1.08, s * 0.9);
  L.at(VLM.carRoof, new RoundedBoxGeometry(3.0, 0.6, 1.78, 3, 0.14), -0.6, 1.32, 0);
  L.at(MAT.glass, new RoundedBoxGeometry(3.04, 0.38, 1.8, 2, 0.1), -0.6, 1.34, 0);
  for (const bx of [2.58, -2.58]) L.at(MAT.chrome, new RoundedBoxGeometry(0.14, 0.18, 2.0, 2, 0.06), bx, 0.55, 0);
  L.box(MAT.chrome, 2.52, 0.6, -0.62, 2.57, 0.82, 0.62);
  L.box(MAT.chrome, -2.55, 0.86, -0.98, 2.55, 0.89, 0.98);
  for (const s of [-1, 1]) { L.at(MAT.lampGlass, new THREE.SphereGeometry(0.1, 10, 8), 2.5, 0.86, s * 0.7); L.box(VLM.swingRed, -2.56, 0.95, s * 0.9 - 0.06, -2.5, 1.12, s * 0.9 + 0.06); }
  for (const [wx, s] of [[1.62, -1], [1.62, 1], [-1.62, -1], [-1.62, 1]]) vlWheel(L, wx, 0.36, s * 0.9, 0.36, 0.24, true);
  L.solid(-2.6, 0, -0.98, 2.6, 1.04, 0.98);
  L.solid(-2.1, 1.04, -0.9, 0.9, 1.62, 0.9);
}
// old pickup in the middle of the street; local +x is the front
function vlPickup(ctx, x, z, rot) {
  const L = vlLocal(ctx, x, z, rot), P = VLM.pickup;
  L.box(MAT.iron, -2.7, 0.42, -0.85, 2.7, 0.72, 0.85);
  L.at(P, new RoundedBoxGeometry(1.9, 0.62, 1.96, 3, 0.18), 1.82, 0.96, 0);
  for (const s of [-1, 1]) L.at(P, new RoundedBoxGeometry(1.15, 0.5, 0.3, 3, 0.12), 1.9, 0.86, s * 0.9);
  L.at(P, new RoundedBoxGeometry(1.5, 1.12, 1.96, 3, 0.16), 0.2, 1.3, 0);
  L.at(MAT.glass, new RoundedBoxGeometry(1.52, 0.44, 1.98, 2, 0.12), 0.24, 1.56, 0);
  L.box(MAT.wood, -2.72, 0.75, -0.92, -0.55, 0.95, 0.92);
  for (const s of [-1, 1]) { L.box(P, -2.75, 0.95, s * 0.96 - 0.04, -0.55, 1.25, s * 0.96 + 0.04); L.at(P, new RoundedBoxGeometry(1.2, 0.48, 0.18, 3, 0.08), -1.75, 0.82, s * 1.0); }
  L.box(P, -2.78, 0.95, -0.92, -2.7, 1.23, 0.92);
  L.box(P, -0.63, 0.95, -0.92, -0.55, 1.45, 0.92);
  L.at(MAT.chrome, new RoundedBoxGeometry(0.16, 0.18, 2.0, 2, 0.06), 2.85, 0.6, 0);
  L.box(MAT.chrome, 2.74, 0.75, -0.55, 2.79, 1.12, 0.55);
  for (const s of [-1, 1]) L.at(MAT.lampGlass, new THREE.SphereGeometry(0.11, 10, 8), 2.7, 1.12, s * 0.72);
  for (const [wx, s] of [[1.85, -1], [1.85, 1], [-1.75, -1], [-1.75, 1]]) vlWheel(L, wx, 0.42, s * 0.95, 0.42, 0.26, false);
  L.solid(0.95, 0, -1.0, 2.9, 1.27, 1.0);
  L.solid(-0.55, 0, -1.0, 0.95, 1.86, 1.0);
  L.solid(-2.78, 0, -1.0, -0.55, 0.95, 1.0, 'wood');
  for (const s of [-1, 1]) L.solid(-2.78, 0.95, s * 0.96 - 0.04, -0.55, 1.25, s * 0.96 + 0.04);
  L.solid(-2.78, 0.95, -0.92, -2.7, 1.23, 0.92);
  L.box(MAT.crate, -2.66, 0.95, 0.32, -2.1, 1.5, 0.88, { solid: true, surf: 'wood', local: true });
}
// school bus you can walk through; local +x is the front, door on the local +z side
function vlBus(ctx, x, z, rot) {
  const L = vlLocal(ctx, x, z, rot), B = VLM.bus;
  const FL = 0.95, W0 = 1.75, W1 = 2.55, RF = 2.95, RT = 3.12, HW = 1.25, WT = 0.07, XB = -5.2, XF = 3.7;
  const S = { solid: true };
  L.box(B, XB, 0.5, -HW, XF, FL, HW, S);
  L.box(MAT.rubber, XB + 0.05, FL, -HW + WT, XF - 0.05, FL + 0.005, HW - WT);
  // side walls with windows; the door is on +z between x 2.5 and 3.5
  for (const s of [-1, 1]) {
    const z0 = s > 0 ? HW - WT : -HW, z1 = s > 0 ? HW : -HW + WT;
    const lowSpans = s > 0 ? [[XB, 2.5], [3.5, XF]] : [[XB, XF]];
    for (const [a, b] of lowSpans) L.box(B, a, FL, z0, b, W0, z1, S);
    for (let k = 0; k <= 6; k++) { const a = XB + k * 1.2, b = a + 0.18; if (s > 0 && b > 2.5) break; L.box(B, a, W0, z0, Math.min(b, XF), W1, z1, S); }
    if (s < 0) L.box(B, 2.2, W0, z0, XF, W1, z1, S); else L.box(B, 3.5, W0, z0, XF, W1, z1, S);
    if (s > 0) { L.box(B, XB, W1, z0, 2.5, RF, z1, S); L.box(B, 3.5, W1, z0, XF, RF, z1, S); L.box(B, 2.5, 2.84, z0, 3.5, RF, z1, S); }
    else L.box(B, XB, W1, z0, XF, RF, z1, S);
    const zo = s > 0 ? HW : -HW - 0.02;
    for (const y of [1.25, 1.6]) L.box(MAT.rubber, XB - 0.01, y, zo, XF + 0.01, y + 0.07, zo + 0.02);
  }
  L.box(B, XB - 0.05, RF, -HW - 0.03, XF + 0.05, RT, HW + 0.03, S);
  L.quad(VLM.busIn, [XB + 0.07, RF - 0.005, -HW + WT], [XF - 0.07, RF - 0.005, -HW + WT], [XF - 0.07, RF - 0.005, HW - WT], [XB + 0.07, RF - 0.005, HW - WT]);
  for (const s of [-1, 1]) {
    const zi = s * (HW - WT - 0.005);
    if (s > 0) for (const [a0, a1] of [[XB + 0.07, 2.5], [3.5, XF - 0.07]]) L.quad(VLM.busIn, [a0, FL, zi], [a0, W0, zi], [a1, W0, zi], [a1, FL, zi]);
    else L.quad(VLM.busIn, [XF - 0.07, FL, zi], [XF - 0.07, W0, zi], [XB + 0.07, W0, zi], [XB + 0.07, FL, zi]);
    if (s > 0) for (const [a0, a1] of [[XB + 0.07, 2.5], [3.5, XF - 0.07]]) L.quad(VLM.busIn, [a0, W1, zi], [a0, RF, zi], [a1, RF, zi], [a1, W1, zi]);
    else L.quad(VLM.busIn, [XF - 0.07, W1, zi], [XF - 0.07, RF, zi], [XB + 0.07, RF, zi], [XB + 0.07, W1, zi]);
  }
  for (const s of [-1, 1]) L.rod(B, [XB - 0.05, RF + 0.02, s * (HW + 0.02)], [XF + 0.05, RF + 0.02, s * (HW + 0.02)], 0.08, 8);
  // front: windscreen opening above the dashboard, engine hood
  L.box(B, XF - 0.07, FL, -HW, XF, W0, HW, S);
  L.box(B, XF - 0.07, 2.7, -HW, XF, RF, HW, S);
  for (const s of [-1, 1]) L.box(B, XF - 0.07, W0, s > 0 ? 1.08 : -HW, XF, 2.7, s > 0 ? HW : -1.08, S);
  L.box(MAT.rubber, XF - 0.07, W0 - 0.02, -0.03, XF, 2.7, 0.03);
  L.box(B, XF, 0.5, -1.05, 5.15, 1.75, 1.05, S);
  L.box(MAT.chrome, 5.15, 0.75, -0.7, 5.2, 1.55, 0.7);
  L.box(MAT.rubber, 5.1, 0.42, -1.25, 5.32, 0.72, 1.25, S);
  for (const s of [-1, 1]) L.at(MAT.lampGlass, new THREE.SphereGeometry(0.12, 10, 8), 5.17, 1.35, s * 0.82);
  // rear wall with the emergency door left open
  L.box(B, XB, FL, -HW, XB + 0.07, RF, -0.5, S);
  L.box(B, XB, FL, 0.5, XB + 0.07, RF, HW, S);
  L.box(B, XB, 2.84, -0.5, XB + 0.07, RF, 0.5, S);
  L.box(MAT.rubber, XB - 0.18, 0.42, -HW, XB, 0.72, HW, S);
  L.box(MAT.rubber, -5.65, 0, -0.6, XB - 0.18, 0.48, 0.6, S);
  L.box(MAT.rubber, 2.5, 0, HW, 3.5, 0.48, HW + 0.4, S);
  // signs, lights, wheels
  const key = 'sign_' + VLM.signs.bus.uuid;
  if (!MAT[key]) { MAT[key] = new THREE.MeshStandardMaterial({ map: VLM.signs.bus, roughness: 0.6 }); MAT[key].userData.uvScale = 1; }
  L.quad(MAT[key], [XF + 0.005, 2.72, 0.9], [XF + 0.005, 2.72, -0.9], [XF + 0.005, 2.93, -0.9], [XF + 0.005, 2.93, 0.9], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  L.quad(MAT[key], [XB - 0.005, 2.62, -0.9], [XB - 0.005, 2.62, 0.9], [XB - 0.005, 2.93, 0.9], [XB - 0.005, 2.93, -0.9], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  for (const s of [-1, 1]) { L.box(VLM.swingRed, XB - 0.03, 2.75, s * 1.05 - 0.1, XB, 2.9, s * 1.05 + 0.1); L.box(VLM.swingRed, XF, 2.75, s * 1.05 - 0.1, XF + 0.03, 2.9, s * 1.05 + 0.1); }
  for (const [wx, s] of [[3.1, -1], [3.1, 1], [-3.0, -1], [-3.0, 1]]) vlWheel(L, wx, 0.52, s * 1.12, 0.52, 0.3, false);
  // seats: cushions step-able, backs decorative
  for (let k = 0; k < 6; k++) {
    const sx = -4.55 + k * 1.15;
    for (const s of [-1, 1]) {
      if (s > 0 && sx > 2.0) continue;
      const za = s > 0 ? 0.38 : -(HW - WT), zb = s > 0 ? HW - WT : -0.38;
      L.box(VLM.seat, sx - 0.3, FL, za, sx + 0.3, FL + 0.42, zb, { solid: true, flags: F_NORAY, surf: 'cloth' });
      L.box(VLM.seat, sx - 0.38, FL + 0.3, za, sx - 0.3, FL + 1.0, zb);
    }
  }
  L.box(VLM.seat, 2.8, FL, -1.05, 3.3, FL + 0.45, -0.45, { solid: true, flags: F_NORAY, surf: 'cloth' });
  L.rod(MAT.rubber, [3.4, FL + 0.6, -0.75], [3.5, FL + 0.9, -0.75], 0.03);
  L.at(MAT.rubber, new THREE.TorusGeometry(0.2, 0.025, 6, 16).rotateY(Math.PI / 2).rotateZ(0.5), 3.5, FL + 0.95, -0.75);
}
// box truck with the cargo doors open; local +x is the front
function vlBoxTruck(ctx, x, z, rot) {
  const L = vlLocal(ctx, x, z, rot), T = VLM.truck, S = { solid: true };
  const FL = 1.0, TOP = 3.3, HW = 1.25, XB = -3.6, XF = 2.35;
  L.box(MAT.iron, XB - 0.1, 0.45, -1.0, XF + 0.1, 0.75, 1.0, S);
  L.box(T, XB, 0.75, -HW, XF, FL, HW, S);
  L.box(MAT.wood, XB + 0.02, FL, -HW + 0.06, XF - 0.06, FL + 0.005, HW - 0.06);
  for (const s of [-1, 1]) L.box(T, XB, FL, s > 0 ? HW - 0.06 : -HW, XF, TOP, s > 0 ? HW : -HW + 0.06, S);
  L.box(T, XF - 0.06, FL, -HW, XF, TOP, HW, S);
  L.box(T, XB - 0.02, TOP, -HW - 0.02, XF + 0.02, TOP + 0.12, HW + 0.02, S);
  for (const s of [-1, 1]) L.box(T, XB, 1.05, s * (HW + 0.03) - 0.03, XB + 1.22, TOP - 0.05, s * (HW + 0.03) + 0.03, S);
  const key = 'sign_' + VLM.signs.latte.uuid;
  if (!MAT[key]) { MAT[key] = new THREE.MeshStandardMaterial({ map: VLM.signs.latte, roughness: 0.6 }); MAT[key].userData.uvScale = 1; }
  L.quad(MAT[key], [XB + 1.35, 1.6, HW + 0.005], [XF - 0.15, 1.6, HW + 0.005], [XF - 0.15, 2.8, HW + 0.005], [XB + 1.35, 2.8, HW + 0.005], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  L.quad(MAT[key], [XF - 0.15, 1.6, -HW - 0.005], [XB + 1.35, 1.6, -HW - 0.005], [XB + 1.35, 2.8, -HW - 0.005], [XF - 0.15, 2.8, -HW - 0.005], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  // rear steps
  const D = emat('diamond');
  L.box(D, XB - 0.8, 0, -0.9, XB, 0.34, 0.9, S);
  L.box(D, XB - 0.4, 0.34, -0.9, XB, 0.67, 0.9, S);
  // cab
  L.at(T, new RoundedBoxGeometry(2.05, 1.8, 2.3, 3, 0.2), 3.4, 1.55, 0);
  L.box(MAT.glass, 4.38, 1.6, -1.0, 4.44, 2.28, 1.0);
  for (const s of [-1, 1]) L.box(MAT.glass, 2.9, 1.65, s * 1.15 - 0.02, 3.95, 2.28, s * 1.15 + 0.02);
  L.box(MAT.chrome, 4.4, 0.8, -0.8, 4.47, 1.35, 0.8);
  L.box(MAT.rubber, 4.35, 0.42, -1.2, 4.6, 0.7, 1.2, S);
  for (const s of [-1, 1]) L.at(MAT.lampGlass, new THREE.SphereGeometry(0.12, 10, 8), 4.42, 1.15, s * 0.85);
  L.solid(2.35, 0, -1.2, 4.45, 2.45, 1.2);
  for (const [wx, s] of [[3.5, -1], [3.5, 1], [-1.6, -1], [-1.6, 1], [-2.5, -1], [-2.5, 1]]) vlWheel(L, wx, 0.5, s * 1.08, 0.5, 0.3, false);
  // cargo: milk crates
  for (const [cx, cz, cy] of [[1.5, -0.6, 0], [1.5, 0.55, 0], [1.5, -0.6, 0.6], [0.4, 0.6, 0]]) {
    L.box(tintMat(MAT.metal, '#5a7f9a'), cx - 0.32, FL + cy, cz - 0.28, cx + 0.32, FL + cy + 0.58, cz + 0.28, { solid: true });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) L.at(MAT.paintWhite, new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), cx - 0.18 + i * 0.18, FL + cy + 0.58 + 0.12, cz - 0.1 + j * 0.2);
  }
}

// ---------------------------------------------------------------- half A
function vlBuildHalfA(ctx) {
  const G = ctx.G;
  const ground = (mat, x0, z0, x1, z1, y = 0) => G.quad(mat, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]);
  // surfaces: street lane, sidewalk, lawns, drives, patio, yard gravel
  ground(emat('asphalt'), -1700, -5, 1700, 0, 0.002);
  for (let x = -60; x <= 60; x += 4) ground(emat('solid_yellow'), x - 1, -0.07, x + 1, 0, 0.006);
  ground(emat('solid_white'), -60, -4.75, 60, -4.63, 0.006);
  ctx.block(emat('concrete'), -60, 0, -7, 60, 0.14, -5);
  for (let x = -58; x < 60; x += 2) G.box(emat('concrete_dark'), x - 0.02, 0.14, -7, x + 0.02, 0.142, -5);
  ground(emat('grass'), -28, -28, 28, -7, 0.004);
  ground(emat('concrete'), 2.4, -12, 8.3, -7, 0.014);
  ground(emat('concrete'), -5.2, -9.35, -3.8, -7, 0.014);
  ground(emat('concrete'), -4.5, -24, 2.6, -20, 0.014);
  ground(emat('gravel'), 8.2, -20, 11, -12, 0.01);
  ground(emat('gravel'), 11, -28, 28, -12, 0.008);
  ground(MAT.terrain, -27, -27, -16, -21, 0.009);
  ctx.block(emat('concrete'), -1.3, 0, -20.5, 0.3, 0.16, -20);
  // the house
  vlHouse(ctx);
  // ---------------- boundaries
  vlPrivacy(ctx, 'x', -28, 11, -27.9);
  vlChain(ctx, 'x', 11, 28, -27.9);
  vlPrivacy(ctx, 'z', -28, -7.2, -27.9);
  vlChain(ctx, 'z', -28, -7.2, 27.9);
  // ---------------- west flank: camper, laundry, picnic table, doghouse
  vlPicket(ctx, 'z', -27.9, -20.3, -11.0, [[-24.2, -22.8]]);
  vlPicket(ctx, 'x', -27.9, -10.3, -12.6, [[-23.2, -21.8], [-15.2, -13.8]]);
  vlCamper(ctx, -21.5, -24.4, 0);
  for (const xx of [-26.6, -17.4]) { rod(ctx, MAT.metal, [xx, 0, -19.2], [xx, 2.2, -19.2], 0.04); rod(ctx, MAT.metal, [xx, 2.15, -19.6], [xx, 2.15, -18.8], 0.03); ctx.solid(xx - 0.06, 0, -19.26, xx + 0.06, 2.2, -19.14, 'metal'); }
  laundryLine(ctx, [-26.6, 2.12, -19.2], [-17.4, 2.12, -19.2], 0.35);
  vlPicnic(ctx, -15.4, -16.0);
  tree(ctx, -23.5, -15.6, { h: 5.8, r: 2.8, trunkR: 0.3 });
  vlDoghouse(ctx, -13.0, -26.6, Math.PI / 2);
  vlWoodpile(ctx, -27.0, -14.8);
  vlMannequin(ctx, -18.6, 0, -15.2, -Math.PI / 2, 0);
  // ---------------- front lawn: hedges, tree, mailbox, flamingos, gnome, lamps, hydrant
  vlHedge(ctx, -11.0, -18.6, -10.15, -13.4, 0.95);
  vlHedge(ctx, -27.6, -12.3, -24.2, -11.4, 0.85);
  vlHedge(ctx, 11.2, -12.3, 15.6, -11.5, 0.85);
  tree(ctx, -18.5, -9.6, { h: 6.2, r: 3.0, trunkR: 0.32 });
  vlMailbox(ctx, -3.2, -7.45, 0);
  vlFlamingo(ctx, -7.6, -8.4, 0.4); vlFlamingo(ctx, -6.9, -8.9, -0.5); vlFlamingo(ctx, 0.8, -10.6, 2.6);
  vlGnome(ctx, -9.4, -12.6, 0); vlGnome(ctx, -0.6, -12.6, 0.5);
  vlSignPost(ctx, -12.5, -8.6, 0.0, VLM.signs.vendesi, 1.1, 0.55, 0.7);
  streetLamp(ctx, -14.0, -6.2); streetLamp(ctx, 14.0, -6.2);
  vlHydrant(ctx, -9.0, -6.4);
  vlCat(ctx, 'bin', 8.9, 0, -7.6, 0, { c: '#4a5a4a' }); vlCat(ctx, 'bin', 9.6, 0, -7.7, 0, { c: '#4a5a4a' });
  vlWagon(ctx, 5.3, -9.35, Math.PI / 2, VLM.carA);
  vlWagon(ctx, -8.6, -2.65, Math.PI, VLM.carA);
  vlMannequin(ctx, -2.2, VL.gf, -10.7, 0, 0);
  vlMannequin(ctx, -5.2, 0.14, -6.1, Math.PI / 2, 1);
  // ---------------- garage side path: AC unit, crates up to the garage roof
  ctx.block(tintMat(MAT.metal, '#8a8f94'), 8.3, 0, -17.6, 9.1, 0.9, -16.4);
  for (let z = -17.5; z < -16.5; z += 0.1) G.box(MAT.iron, 9.1, 0.12, z, 9.12, 0.8, z + 0.04);
  crate(ctx, 9.05, 0, -14.1, 1.1); crate(ctx, 9.05, 1.1, -14.1, 1.05); crate(ctx, 10.2, 0, -13.4, 0.9);
  // ---------------- backyard: patio, swing set, sandbox, shed, BBQ
  cafeSet(ctx, -1.6, -22.4, true);
  vlBbq(ctx, 1.8, -21.1);
  vlSwing(ctx, -8.6, -5.6, -24.6);
  ctx.block(MAT.wood, -9.9, 0, -27.6, -7.6, 0.25, -26.2, { surf: 'wood' });
  G.quad(emat('sand'), [-9.8, 0.255, -26.3], [-7.7, 0.255, -26.3], [-7.7, 0.255, -27.5], [-9.8, 0.255, -27.5]);
  vlShed(ctx, 5.6, -27.7, 9.6, -25.0);
  tree(ctx, 1.8, -26.6, { h: 5.0, r: 2.4, trunkR: 0.26 });
  vlMannequin(ctx, -3.2, 0, -25.6, Math.PI, 1);
  vlCat(ctx, 'bin', 3.4, 0, -20.6, 0, { c: '#3d5a7a' });
  // ---------------- military yard (east): chain-link, containers, sandbags
  vlChain(ctx, 'z', -27.9, -12.2, 11.0, [[-24.7, -23.3], [-15.7, -14.3]]);
  vlChain(ctx, 'x', 11.0, 27.9, -12.2, [[17.3, 18.7]]);
  vlCat(ctx, 'container', 21.0, 0, -25.0, 0, { c: '#5a6b48' });
  vlCat(ctx, 'container', 25.5, 0, -17.2, Math.PI / 2, { c: '#7a5a40' });
  stairs(ctx, 'z', -1, -18.58, 19.3, 21.05, 0, 2.59, 0.4, emat('diamond'));
  for (const x of [19.27, 21.08]) rod(ctx, MAT.chrome, [x, 0.95, -18.6], [x, 3.55, -23.75], 0.03);
  vlCat(ctx, 'sandbags', 15.2, 0, -18.4, 0);
  vlCat(ctx, 'sandbags', 13.6, 0, -21.6, Math.PI / 2);
  vlCat(ctx, 'sandbags', 19.6, 0, -14.0, 0);
  vlCat(ctx, 'crates', 13.4, 0, -26.4, 0);
  vlCat(ctx, 'pallet', 16.4, 0, -26.6, 0);
  vlCat(ctx, 'barrel', 12.3, 0, -13.2, 0); vlCat(ctx, 'barrel', 13.1, 0, -13.5, 0);
  vlCat(ctx, 'tires', 22.6, 0, -13.6, 0);
  vlCat(ctx, 'jersey', 23.0, 0, -20.0, Math.PI / 2);
  vlSignPost(ctx, 11.3, -18.0, Math.PI / 2, VLM.signs.trefoil, 0.7, 0.7, 1.0);
  vlSignPost(ctx, 22.0, -12.45, 0, VLM.signs.zona, 2.4, 0.6, 1.2);
  // ---------------- street ends: barricades
  for (const ex of [-27.5, 27.5]) {
    vlCat(ctx, 'jersey', ex, 0, -1.1, Math.PI / 2);
    vlCat(ctx, 'jersey', ex, 0, -3.2, Math.PI / 2);
    vlCat(ctx, 'cone', ex - Math.sign(ex) * 0.9, 0, -4.3, 0);
  }
  vlSignPost(ctx, -27.3, -5.9, Math.PI / 2, VLM.signs.zona, 2.4, 0.6, 1.3);
}

// Spawns and objectives (half A, mirrored with the team swapped)
const VL_SPAWNS_A = [
  // team 1 (north backyard)
  [-6.5, 0, -26.8, 1], [-2.0, 0, -27.0, 1], [1.0, 0, -24.4, 1], [4.2, 0, -23.6, 1], [-8.0, 0, -22.0, 1], [-4.0, 0, -21.4, 1],
  [9.8, 0, -22.5, 1], [-14.8, 0, -23.5, 1], [-24.5, 0, -27.0, 1], [-19.0, 0, -21.6, 1],
  // neutral (FFA)
  [-7.5, VL.gf, -13.6, 0], [-0.8, VL.gf, -14.2, 0], [-5.5, VL.uf, -13.4, 0], [-1.5, VL.uf, -17.6, 0], [4.5, 0.02, -15.6, 0],
  [-24.5, 0, -10.0, 0], [-15.0, 0, -9.0, 0], [16.0, 0, -9.0, 0], [24.0, 0, -9.0, 0], [16.5, 0, -24.0, 0], [21.5, 0, -15.4, 0],
  [-13.0, 0, -2.6, 0], [3.5, 0, -2.8, 0], [-22.0, 0, -18.0, 0],
];
const VL_ZONES = [
  { name: 'Strada', c: [0, 0, 0], r: 5.2, h: 3.2 },
  { name: 'Casa Gialla', box: [-9.75, 0.2, -19.75, 1.75, 6.4, -12.25] },
  { name: 'Scuolabus', c: [-21.5, 0, 1.5], r: 5.8, h: 4.2 },
  { name: 'Casa Verde', box: [-1.75, 0.2, 12.25, 9.75, 6.4, 19.75] },
  { name: 'Furgone', c: [21.5, 0, -1.5], r: 5.8, h: 4.2 },
];
const VL_FLAGS = [[-3.0, 0.02, -24.6], [3.0, 0.02, 24.6]];

function buildVillette(scene) {
  vlMaterials();
  const A = new MapCtx(mulberry32(5150));
  vlBuildHalfA(A);
  const SW = new Map([[VLM.wallA, VLM.wallB], [VLM.inA, VLM.inB], [VLM.shutA, VLM.shutB], [VLM.doorA, VLM.doorB], [VLM.roofA, VLM.roofB], [VLM.carpetA, VLM.carpetB], [VLM.sofaA, VLM.sofaB], [VLM.carA, VLM.carB]]);
  const F = new MapCtx(mulberry32(808));
  A.G.mirrorInto(F.G, (m) => SW.get(m));
  F.G.absorb(A.G);
  // unique pieces: vehicles in the street, the village sign
  vlPickup(F, 0, 0, 0);
  vlBus(F, -21.5, 1.5, Math.PI);
  vlBoxTruck(F, 21.5, -1.5, Math.PI);
  crate(F, -17.6, 0, 3.6, 1.1); crate(F, -17.6, 1.1, 3.6, 1.0); crate(F, -18.85, 0, 3.85, 0.9);
  crate(F, 17.6, 0, -3.6, 1.1); crate(F, 17.6, 1.1, -3.6, 1.0); crate(F, 18.85, 0, -3.85, 0.9);
  vlCat(F, 'tires', 14.6, 0, 3.0, 0); vlCat(F, 'tires', -14.6, 0, -3.0, 0);
  vlCat(F, 'cone', -6.0, 0, 0.6, 0); vlCat(F, 'cone', 6.0, 0, -0.6, 0);
  for (const s of [-2.2, 2.2]) F.block(MAT.iron, 27.32, 0, s - 0.07, 27.46, 4.95, s + 0.07, { surf: 'metal' });
  F.G.box(VLM.stripe, 27.36, 2.25, -2.45, 27.5, 4.85, 2.45);

  const W = new CollisionWorld();
  const addBox = (b) => W.add(b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7]);
  for (const b of A.boxes) { addBox(b); addBox([-b[3], b[1], -b[5], -b[0], b[4], -b[2], b[6], b[7]]); }
  for (const b of F.boxes) addBox(b);
  const mv = (p) => new THREE.Vector3(p[0], p[1], p[2]);
  const mm = (p) => new THREE.Vector3(-p[0], p[1], -p[2]);
  for (const t of A.tris) { W.addTri(mv(t[0]), mv(t[1]), mv(t[2]), t[3]); W.addTri(mm(t[0]), mm(t[1]), mm(t[2]), t[3]); }
  for (const t of F.tris) W.addTri(mv(t[0]), mv(t[1]), mv(t[2]), t[3]);
  W.add(-200, -5, -200, 200, 0, 200, 'dirt');
  const B = VL.bounds;
  W.add(B.x0 - 2, 0, B.z0 - 2, B.x0, 60, B.z1 + 2, 'stone', F_NORAY);
  W.add(B.x1, 0, B.z0 - 2, B.x1 + 2, 60, B.z1 + 2, 'stone', F_NORAY);
  W.add(B.x0 - 2, 0, B.z0 - 2, B.x1 + 2, 60, B.z0, 'stone', F_NORAY);
  W.add(B.x0 - 2, 0, B.z1, B.x1 + 2, 60, B.z1 + 2, 'stone', F_NORAY);
  W.add(B.x0 - 2, 40, B.z0 - 2, B.x1 + 2, 42, B.z1 + 2, 'stone', F_NORAY);
  W.build();

  const group = new THREE.Group();
  group.name = 'map';
  F.G.build(group);
  scene.add(group);
  const lights = A.lights.concat(A.lights.map((l) => Object.assign({}, l, { pos: [-l.pos[0], l.pos[1], -l.pos[2]] })), F.lights);
  const spawns = [];
  for (const s of VL_SPAWNS_A) { spawns.push({ x: s[0], y: s[1], z: s[2], team: s[3] }); spawns.push({ x: -s[0], y: s[1], z: -s[2], team: s[3] === 1 ? 2 : s[3] === 2 ? 1 : 0 }); }
  for (const s of spawns) s.yaw = Math.atan2(s.x, s.z);
  return { group, world: W, lights, spawns, dynamic: vlDynamic };
}

// the village sign counts the people still standing
function vlDynamic(scene) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.18 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 2.5), mat);
  mesh.position.set(27.33, 3.55, 0); mesh.rotation.y = -Math.PI / 2;
  scene.add(mesh);
  const draw = (n) => {
    g.fillStyle = '#2f7f7a'; g.fillRect(0, 0, 512, 288);
    g.strokeStyle = '#f3e7c8'; g.lineWidth = 10; g.strokeRect(14, 14, 484, 260);
    g.fillStyle = '#f3e7c8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 86px Georgia, serif'; g.fillText('VILLETTE', 256, 92);
    g.fillStyle = '#d8463c'; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 26; g.lineTo(60 + Math.cos(a) * r, 92 + Math.sin(a) * r); }
    g.fill(); g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 26; g.lineTo(452 + Math.cos(a) * r, 92 + Math.sin(a) * r); }
    g.fill();
    g.fillStyle = '#f3e7c8'; g.font = '700 38px Arial, sans-serif'; g.fillText('ABITANTI', 256, 170);
    g.font = '900 64px Arial, sans-serif'; g.fillText(String(n), 256, 228);
    tex.needsUpdate = true;
  };
  draw(0);
  let last = -1, acc = 0;
  return {
    update(t) {
      if (t - acc < 0.5) return;
      acc = t;
      let n = 0;
      if (Game.state === 'playing' && Game.me) for (const e of Game.combatants()) if (e.alive) n++;
      if (n !== last) { last = n; draw(n); }
    },
  };
}

// ---------------------------------------------------------------- desert backdrop
function buildDesert(scene, q) {
  const group = new THREE.Group(); group.name = 'backdrop';
  const rng = mulberry32(9137);
  const seg = q >= 2 ? 200 : 120, size = 3600;
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const vn = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const h = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
  };
  const fbm2 = (x, z) => vn(x, z) * 0.5 + vn(x * 2.1, z * 2.1) * 0.25 + vn(x * 4.3, z * 4.3) * 0.125 + vn(x * 8.7, z * 8.7) * 0.0625;
  const heightAt = (x, z) => {
    const d = Math.max(0, Math.max(Math.abs(x) - 32, Math.abs(z) - 32));
    const road = 1 - smoothstep(9, 26, Math.abs(z));
    const dunes = smoothstep(4, 220, d) * (1.5 + 9 * fbm2(x / 170, z / 170)) * (1 - road);
    const rr = Math.hypot(x, z);
    const m = fbm2(x / 480 + 11, z / 480 + 5);
    const mesa = smoothstep(520, 900, rr) * smoothstep(0.52, 0.56, m) * (95 + 50 * fbm2(x / 260, z / 260));
    const ridge = smoothstep(1100, 1700, rr) * 240 * fbm2(x / 760 + 2, z / 760 + 9);
    return dunes + mesa + ridge - 0.12;
  };
  const pos = g.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const sand = [[1.0, 0.94, 0.84], [0.96, 0.88, 0.76], [1.02, 0.92, 0.8], [0.92, 0.84, 0.72]];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    const k = Math.floor(vn(x / 90, z / 90) * sand.length * 1.99) % sand.length;
    const c = sand[k], n = 0.9 + 0.2 * fbm2(x / 25, z / 25);
    const rock = smoothstep(18, 70, y);
    cols[i * 3] = lerp(c[0], 0.86, rock) * n; cols[i * 3 + 1] = lerp(c[1], 0.6, rock) * n; cols[i * 3 + 2] = lerp(c[2], 0.48, rock) * n;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * size / 12, uv.getY(i) * size / 12);
  g.computeVertexNormals();
  const sm = emat('sand');
  const tmat = new THREE.MeshStandardMaterial({ map: sm.map, normalMap: sm.normalMap, roughness: 0.96, metalness: 0, vertexColors: true });
  const terrain = new THREE.Mesh(g, tmat);
  terrain.receiveShadow = true;
  group.add(terrain);
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3(), p3 = new THREE.Vector3();
  const scatter = (geo, mat, count, rMin, rMax, sMin, sMax, yOff, flat = 1) => {
    const im = new THREE.InstancedMesh(geo, mat, count);
    let n = 0, guard = 0;
    while (n < count && guard++ < count * 20) {
      const a = rng() * TAU, r = rMin + Math.pow(rng(), 0.8) * (rMax - rMin);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 34 && Math.abs(z) < 34) continue;
      if (Math.abs(z) < 9) continue;
      const s = sMin + rng() * (sMax - sMin);
      m4.compose(p3.set(x, heightAt(x, z) + yOff * s, z), qt.setFromAxisAngle(UP, rng() * TAU), sc.set(s, s * flat, s));
      im.setMatrixAt(n, m4);
      if (im.instanceColor !== undefined) im.setColorAt(n, new THREE.Color().setHSL(0.13 + rng() * 0.06, 0.25 + rng() * 0.15, 0.32 + rng() * 0.12));
      n++;
    }
    im.count = n; im.receiveShadow = true;
    group.add(im);
    return im;
  };
  // sagebrush, rocks, Joshua trees
  const bush = new THREE.IcosahedronGeometry(1, 1);
  const bp = bush.attributes.position;
  for (let i = 0; i < bp.count; i++) { const f = 0.75 + rng() * 0.4; bp.setXYZ(i, bp.getX(i) * f, bp.getY(i) * f, bp.getZ(i) * f); }
  bush.computeVertexNormals();
  scatter(bush, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), q >= 2 ? 1100 : 550, 36, 900, 0.35, 0.9, 0.35, 0.6);
  const rock = new THREE.DodecahedronGeometry(1, 0);
  scatter(rock, new THREE.MeshStandardMaterial({ color: 0x9a7b62, roughness: 0.9 }), q >= 2 ? 260 : 140, 40, 1000, 0.4, 2.6, 0.2, 0.55);
  const jt = [];
  const tr = new THREE.CylinderGeometry(0.16, 0.24, 3.2, 7); tr.translate(0, 1.6, 0); jt.push(tr);
  for (const [ax, ay, az, len, rz, ry] of [[0, 2.6, 0, 1.6, 0.8, 0], [0, 2.3, 0, 1.4, -0.7, 1.4], [0, 3.0, 0, 1.2, 0.5, 2.6]]) {
    const arm = new THREE.CylinderGeometry(0.11, 0.14, len, 6); arm.translate(0, len / 2, 0); arm.rotateZ(rz); arm.rotateY(ry); arm.translate(ax, ay, az); jt.push(arm);
  }
  const trunks = BufferGeometryUtils.mergeGeometries(jt.map((x) => x.toNonIndexed()));
  const tufts = [];
  for (const [ax, ay, az, len, rz, ry] of [[0, 3.2, 0, 0, 0, 0], [0, 2.6, 0, 1.6, 0.8, 0], [0, 2.3, 0, 1.4, -0.7, 1.4], [0, 3.0, 0, 1.2, 0.5, 2.6]]) {
    const t = new THREE.IcosahedronGeometry(0.42, 0);
    const tip = new THREE.Vector3(0, len, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), rz).applyAxisAngle(UP, ry).add(new THREE.Vector3(ax, ay, az));
    t.translate(tip.x, tip.y + 0.15, tip.z); tufts.push(t);
  }
  const tuftGeo = BufferGeometryUtils.mergeGeometries(tufts);
  const nJ = q >= 2 ? 90 : 50;
  const jtT = new THREE.InstancedMesh(trunks, new THREE.MeshStandardMaterial({ color: 0x6b5a46, roughness: 0.95 }), nJ);
  const jtL = new THREE.InstancedMesh(tuftGeo, new THREE.MeshStandardMaterial({ color: 0x5f6b3a, roughness: 0.85 }), nJ);
  for (let i = 0; i < nJ; i++) {
    let x, z;
    do { const a = rng() * TAU, r = 45 + Math.pow(rng(), 0.7) * 600; x = Math.cos(a) * r; z = Math.sin(a) * r; } while (Math.abs(z) < 10);
    const s = 0.8 + rng() * 0.7;
    m4.compose(p3.set(x, heightAt(x, z) - 0.1, z), qt.setFromAxisAngle(UP, rng() * TAU), sc.set(s, s, s));
    jtT.setMatrixAt(i, m4); jtL.setMatrixAt(i, m4);
  }
  group.add(jtT, jtL);
  // power line along the back of the green house
  const poles = [], wires = [];
  for (let x = -1350; x <= 1350; x += 45) poles.push([x, 32.5]);
  const pole = new THREE.CylinderGeometry(0.13, 0.18, 9.5, 7); pole.translate(0, 4.75, 0);
  const arm = new THREE.BoxGeometry(0.14, 0.14, 2.4); arm.translate(0, 8.8, 0);
  const pg = BufferGeometryUtils.mergeGeometries([pole.toNonIndexed(), arm.toNonIndexed()]);
  const pm = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 }), poles.length);
  poles.forEach(([x, z], i) => { m4.compose(p3.set(x, heightAt(x, z) - 0.2, z), qt.identity(), sc.set(1, 1, 1)); pm.setMatrixAt(i, m4); });
  group.add(pm);
  for (let i = 0; i < poles.length - 1; i++) {
    const [xa, za] = poles[i], [xb, zb] = poles[i + 1];
    const ya = heightAt(xa, za) + 8.85, yb = heightAt(xb, zb) + 8.85;
    for (const dz of [-1.05, 0, 1.05]) {
      const pts = [];
      for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3(lerp(xa, xb, t), lerp(ya, yb, t) - Math.sin(t * Math.PI) * 1.2, za + dz)); }
      wires.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.02, 3, false).toNonIndexed());
    }
  }
  group.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(wires), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })));
  // water tower, test tower, quonset huts, more test houses down the road
  const G = new GeoBuilder();
  const ctx = { G };
  const wtx = -78, wtz = -82, wty = heightAt(wtx, wtz) - 0.2;
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9c3b5, roughness: 0.55, metalness: 0.4 }); steel.userData.uvScale = 2;
  for (const [dx, dz] of [[-3, -3], [3, -3], [3, 3], [-3, 3]]) rod(ctx, steel, [wtx + dx * 1.25, wty, wtz + dz * 1.25], [wtx + dx * 0.8, wty + 17, wtz + dz * 0.8], 0.22, 8);
  for (const y of [5, 11]) for (const [a, b] of [[[-3, -3], [3, -3]], [[3, -3], [3, 3]], [[3, 3], [-3, 3]], [[-3, 3], [-3, -3]]]) {
    const f = 1.25 - (y / 17) * 0.45;
    rod(ctx, steel, [wtx + a[0] * f, wty + y, wtz + a[1] * f], [wtx + b[0] * f, wty + y, wtz + b[1] * f], 0.09, 6);
  }
  G.geom(steel, new THREE.CylinderGeometry(4.3, 4.3, 5.2, 28), new THREE.Matrix4().makeTranslation(wtx, wty + 19.6, wtz));
  G.geom(steel, new THREE.ConeGeometry(4.5, 1.8, 28), new THREE.Matrix4().makeTranslation(wtx, wty + 23.1, wtz));
  const tx = 330, tz = -470, ty = heightAt(tx, tz) - 0.3, TH = 34;
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rod(ctx, MAT.iron, [tx + dx * 4, ty, tz + dz * 4], [tx + dx * 1.4, ty + TH, tz + dz * 1.4], 0.25, 6);
  for (let y = 4; y < TH; y += 5) {
    const f = 4 - (y / TH) * 2.6;
    for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) rod(ctx, MAT.iron, [tx + a[0] * f, ty + y, tz + a[1] * f], [tx + b[0] * f, ty + y, tz + b[1] * f], 0.12, 4);
  }
  G.box(tintMat(MAT.metal, '#8a8a80'), tx - 2.4, ty + TH, tz - 2.4, tx + 2.4, ty + TH + 3, tz + 2.4);
  const hut = new THREE.CylinderGeometry(5, 5, 16, 18, 1, false, 0, Math.PI); hut.rotateZ(Math.PI / 2); hut.rotateY(Math.PI / 2);
  for (const [hx, hz] of [[150, 150], [168, 150], [186, 150]]) G.geom(emat('corrugated'), hut, new THREE.Matrix4().makeTranslation(hx, heightAt(hx, hz) - 0.3, hz), { worldUV: true });
  G.build(group, { cast: false });
  const houseG = new THREE.BoxGeometry(1, 1, 1); houseG.translate(0, 0.5, 0);
  const roofG = new THREE.ConeGeometry(0.75, 0.4, 4); roofG.rotateY(Math.PI / 4); roofG.translate(0, 0.2, 0);
  const lots = [];
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) { const x = side * (70 + i * 26 + rng() * 6); lots.push([x, 22 + rng() * 6], [x + 9 * side, -24 - rng() * 6]); }
  const hm = new THREE.InstancedMesh(houseG, new THREE.MeshStandardMaterial({ roughness: 0.9 }), lots.length);
  const rm = new THREE.InstancedMesh(roofG, new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 0.9 }), lots.length);
  const pal = ['#f4cd62', '#9cd2bf', '#f0b8a0', '#e9e2cf', '#a8c4e0', '#e6a05a'];
  lots.forEach(([x, z], i) => {
    const w = 10 + rng() * 3, d = 8 + rng() * 2, h = 3.4 + (rng() < 0.4 ? 3 : 0), y = heightAt(x, z) - 0.2;
    m4.compose(p3.set(x, y, z), qt.identity(), sc.set(w, h, d)); hm.setMatrixAt(i, m4);
    hm.setColorAt(i, new THREE.Color(pal[i % pal.length]).multiplyScalar(0.9));
    m4.compose(p3.set(x, y + h, z), qt.identity(), sc.set(w * 1.12, 2.4, d * 1.15)); rm.setMatrixAt(i, m4);
  });
  hm.receiveShadow = true;
  group.add(hm, rm);
  scene.add(group);
  return { group, heightAt };
}
