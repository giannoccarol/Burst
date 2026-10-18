// ===================================================================
// Map "Borgo": point-symmetric Italian village. Half A is built, then
// rotated 180 degrees for the other half; church/palazzo/fountain unique.
// ===================================================================
const MAPDEF = {
  name: 'Borgo', bounds: { x0: -34, x1: 34, z0: -46, z1: 46 },
  terraceY: 4.6, sagratoY: 1.2,
};
const SIGNS = {};

function makeSigns() {
  const mk = (t, o) => CanvasTex.sign(t, o);
  SIGNS.farmacia = mk('FARMACIA', { bg: '#1f5a3a', fg: '#eef4e8', font: 'Georgia, serif', size: 0.5 });
  SIGNS.tabacchi = mk('TABACCHI', { bg: '#1d2c4a', fg: '#f3efe2', font: 'Georgia, serif', size: 0.5 });
  SIGNS.bar = mk('Bar Centrale', { bg: '#5b1f1c', fg: '#f6e4c2', font: 'Georgia, serif', size: 0.52, weight: 'italic 700' });
  SIGNS.gelateria = mk('Gelateria', { bg: '#e9dcc3', fg: '#7a3b2b', font: 'Georgia, serif', size: 0.56, weight: 'italic 700', borderColor: 'rgba(122,59,43,0.8)' });
  SIGNS.forno = mk('FORNO', { bg: '#7a4a24', fg: '#f6e7c8', font: 'Georgia, serif', size: 0.58, spacing: 18 });
  SIGNS.alimentari = mk('ALIMENTARI', { bg: '#2f3f2a', fg: '#efe6cc', font: 'Georgia, serif', size: 0.48 });
  SIGNS.trattoria = mk('Trattoria da Gino', { bg: '#efe6d2', fg: '#3b2a1e', font: 'Georgia, serif', size: 0.46, weight: 'italic 700', borderColor: 'rgba(59,42,30,0.7)' });
  SIGNS.pizzeria = mk('Pizzeria Vesuvio', { bg: '#a3261d', fg: '#f7eedb', font: 'Georgia, serif', size: 0.46, weight: 'italic 700' });
  SIGNS.via1 = mk('VIA DEL POZZO', { w: 512, h: 128, bg: '#f2ede2', fg: '#2a2a2a', font: 'Georgia, serif', size: 0.42, borderColor: 'rgba(40,40,40,0.6)' });
  SIGNS.via2 = mk('VICOLO STRETTO', { w: 512, h: 128, bg: '#f2ede2', fg: '#2a2a2a', font: 'Georgia, serif', size: 0.4, borderColor: 'rgba(40,40,40,0.6)' });
  SIGNS.piazza = mk('PIAZZA DELLA FONTANA', { w: 768, h: 128, bg: '#f2ede2', fg: '#2a2a2a', font: 'Georgia, serif', size: 0.4, borderColor: 'rgba(40,40,40,0.6)' });
  SIGNS.via3 = mk('VIA ROMA', { w: 512, h: 128, bg: '#f2ede2', fg: '#2a2a2a', font: 'Georgia, serif', size: 0.44, borderColor: 'rgba(40,40,40,0.6)' });
}
function signMat(tex) {
  const key = 'sign_' + tex.uuid;
  if (!MAT[key]) { MAT[key] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 }); MAT[key].userData.uvScale = 1; }
  return MAT[key];
}

// --------------------------------------------------------------------
function buildHalfA(ctx) {
  const G = ctx.G;
  const TY = MAPDEF.terraceY, SY = MAPDEF.sagratoY;
  // ---------------- ground surfaces ----------------
  const ground = (mat, x0, z0, x1, z1, y = 0) => G.quad(mat, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]);
  ground(MAT.slabs, -34, -26, 14, -20);         // north street
  ground(MAT.slabs, -34, -20, -27, 20);         // west alley
  ground(MAT.slabs, -34, 20, -14, 26);          // south street (west part)
  ground(MAT.slabs, -6, -20, 6, -13);           // street into the piazza
  ground(MAT.slabs, -27, -2.5, -14, 2.5);       // arch passage
  ground(MAT.cobble, -14, -13, 14, 0);          // piazza (north half)
  ground(MAT.terrain, -34, -40, -14, -26);      // courtyard NW
  ground(MAT.terrain, -22, -46, -14, -40);      // little garden next to church
  ground(MAT.terrain, -34, 26, -14, 40);        // garden SW
  ground(MAT.terrain, -20, 40, -14, 46);
  // curbs along the piazza edge
  for (const [x0, z0, x1, z1] of [[-14, -13.15, -6, -12.9], [6, -13.15, 14, -12.9]]) G.box(MAT.stoneTrim, x0, 0, z0, x1, 0.08, z1);

  // ---------------- west boundary houses (facades face east, x=-34) ----------------
  const westRow = [
    { z0: -46, z1: -30, h: 9.6, c: 'crema', sh: 'verde', roof: 'gable-z', doors: [{ s: 9.0 }], lampS: 7.5 },
    { z0: -30, z1: -16, h: 10.6, c: 'ocra', sh: 'verdescuro', roof: 'gable-z', doors: [{ s: 4.0, lamp: true }] },
    { z0: -16, z1: -2, h: 8.6, c: 'rosa', sh: 'marrone', roof: 'gable-z', shops: [{ s0: 7.5, s1: 11.5, sign: SIGNS.alimentari, awning: MAT.awningGreen }] },
    { z0: -2, z1: 12, h: 11.2, c: 'giallo', sh: 'verde', roof: 'gable-z', doors: [{ s: 3.5 }, { s: 10.5 }] },
    { z0: 12, z1: 26, h: 9.2, c: 'siena', sh: 'azzurro', roof: 'gable-z', doors: [{ s: 6.0, lamp: true }] },
    { z0: 26, z1: 46, h: 10.2, c: 'bianco', sh: 'verde', roof: 'gable-z', doors: [{ s: 15.0 }] },
  ];
  for (const b of westRow) {
    house(ctx, { x0: -40, z0: b.z0, x1: -34, z1: b.z1, h: b.h, color: b.c, shutter: b.sh, roof: b.roof, skip: 'w', balconyChance: 0.3, faces: { e: { doors: b.doors || [], shops: b.shops || [] }, n: { plain: true }, s: { plain: true } } });
  }
  // ---------------- NW corner: back house + courtyard ----------------
  house(ctx, { x0: -34, z0: -46, x1: -22, z1: -40, h: 8.6, color: 'salmone', shutter: 'verdescuro', roof: 'gable-x', skip: 'nw', faces: { s: { doors: [{ s: 6.0, lamp: true }] }, e: { cols: 1 } } });
  // garden wall at the north boundary behind the little garden
  ctx.block(MAT.rubble, -22, 0, -46.6, -14, 2.4, -46);
  well(ctx, -25, -33);
  tree(ctx, -18.6, -37.4, { h: 4.6, r: 2.4, leaves: MAT.leaves, cards: 46, trunkR: 0.26 });
  crate(ctx, -31.8, 0, -28.4, 1.1); crate(ctx, -30.6, 0, -28.6, 1.0); crate(ctx, -31.3, 1.1, -28.5, 0.9);
  barrel(ctx, -33.1, -37.5); barrel(ctx, -32.2, -38.4);
  pottedPlant(ctx, -24.4, -39.4, 1.1, true); pottedPlant(ctx, -27.6, -39.4, 1.1, true);
  bench(ctx, -20.5, -29.0, 'x', 2.2);
  // side steps up to the sagrato (y=SY) at x=-14
  stairs(ctx, 'x', 1, -15.8, -32.2, -29.2, 0, SY, 0.3);
  // ---------------- north street side: low wall between courtyard and street? (open) ----------------
  streetLamp(ctx, -27.6, -25.4);
  // ---------------- NW building with the café ----------------
  // upper volume
  house(ctx, {
    x0: -27, z0: -20, x1: -14, z1: -2.5, y0: 3.7, h: 3.9, floors: 1, color: 'terracotta', shutter: 'verde', roof: 'hip', roofH: 2.6,
    plinth: false, stringCourse: false,
    faces: { e: { cols: 5 }, w: { cols: 5 }, n: { cols: 4 }, s: { cols: 3 } },
  });
  // ground floor: solid north strip (z -20..-13), south strip (z -3.5..-2.5)
  const cafeWall = MAT.plaster_terracotta;
  ctx.block(cafeWall, -27, 0, -20, -14, 3.7, -13, { skip: 'ny,py' });
  ctx.block(cafeWall, -27, 0, -3.5, -14, 3.7, -2.5, { skip: 'ny,py,pz' });
  // west wall (alley) with door + window; east wall (piazza) with door + 2 windows
  wallOpenings(ctx, cafeWall, 'z', -13, -3.5, -27, -26.6, 0, 3.7, [[-9.6, -7.8, 0, 2.5], [-12.4, -10.8, 1.0, 2.4]], { skip: 'ny,py' });
  wallOpenings(ctx, cafeWall, 'z', -13, -3.5, -14.4, -14, 0, 3.7, [[-8.2, -6.4, 0, 2.6], [-12.4, -9.4, 0.95, 2.6], [-5.3, -3.9, 0.95, 2.6]], { skip: 'ny,py' });
  // facade dressing for the ground floor
  {
    const Fn = facade(-27, -20, -14, -2.5, 'n');
    plinth(ctx, Fn, 0.6); windowUnit(ctx, Fn, 3.0, 1.05, { shutter: MAT.shutter_verde, h: 1.45 }); doorUnit(ctx, Fn, 7.2, { lamp: true }); windowUnit(ctx, Fn, 10.6, 1.05, { shutter: MAT.shutter_verde, h: 1.45 });
    stringCourse(ctx, Fn, 3.62);
    const Fe = facade(-27, -20, -14, -2.5, 'e');
    // e facade: s measured from z1 (-2.5) going toward -z
    plinth(ctx, Fe, 0.6);
    stringCourse(ctx, Fe, 3.62);
    signBoard(ctx, Fe, 4.8, 2.85, 3.3, 0.6, SIGNS.bar, 0.12);
    awning(ctx, Fe, 3.2, 6.4, 3.3, 1.5, 0.55, MAT.awningRed);
    // door & window frames (wood) around openings on the piazza side
    for (const [a, b, y0, y1] of [[-8.2, -6.4, 0, 2.6], [-12.4, -9.4, 0.95, 2.6], [-5.3, -3.9, 0.95, 2.6]]) {
      const s0 = -2.5 - b, s1 = -2.5 - a;
      fbox(ctx, Fe, MAT.woodDark, s0 - 0.12, s0, y0, y1 + 0.12, -0.02, 0.06);
      fbox(ctx, Fe, MAT.woodDark, s1, s1 + 0.12, y0, y1 + 0.12, -0.02, 0.06);
      fbox(ctx, Fe, MAT.woodDark, s0 - 0.12, s1 + 0.12, y1, y1 + 0.12, -0.02, 0.06);
      if (y0 > 0) fbox(ctx, Fe, MAT.stoneTrim, s0 - 0.12, s1 + 0.12, y0 - 0.08, y0, -0.02, 0.1);
    }
    const Fw = facade(-27, -20, -14, -2.5, 'w');
    plinth(ctx, Fw, 0.6);
    stringCourse(ctx, Fw, 3.62);
    windowUnit(ctx, Fw, 2.6, 1.05, { shutter: MAT.shutter_verde, h: 1.45 });
    windowUnit(ctx, Fw, 5.4, 1.05, { shutter: MAT.shutter_verde, h: 1.45 });
    for (const [a, b, y0, y1] of [[-9.6, -7.8, 0, 2.5], [-12.4, -10.8, 1.0, 2.4]]) {
      const s0 = a + 20, s1 = b + 20;
      fbox(ctx, Fw, MAT.woodDark, s0 - 0.12, s0, y0, y1 + 0.12, -0.02, 0.06);
      fbox(ctx, Fw, MAT.woodDark, s1, s1 + 0.12, y0, y1 + 0.12, -0.02, 0.06);
      fbox(ctx, Fw, MAT.woodDark, s0 - 0.12, s1 + 0.12, y1, y1 + 0.12, -0.02, 0.06);
    }
    wallLamp(ctx, Fw, 9.6, 3.1);
  }
  // café interior
  {
    const IN = MAT.plasterIn_crema;
    const x0 = -26.6, x1 = -14.4, z0 = -13, z1 = -3.5;
    G.quad(MAT.cottoIn, [x0, 0.01, z1], [x1, 0.01, z1], [x1, 0.01, z0], [x0, 0.01, z0]);
    // interior skins
    G.quad(IN, [x0, 0, z0 + 0.01], [x1, 0, z0 + 0.01], [x1, 3.7, z0 + 0.01], [x0, 3.7, z0 + 0.01]);
    G.quad(IN, [x1, 0, z1 - 0.01], [x0, 0, z1 - 0.01], [x0, 3.7, z1 - 0.01], [x1, 3.7, z1 - 0.01]);
    // ceiling with beams
    G.quad(MAT.woodDark, [x0, 3.69, z0], [x1, 3.69, z0], [x1, 3.69, z1], [x0, 3.69, z1]);
    for (let x = x0 + 0.9; x < x1; x += 1.4) G.box(MAT.wood, x - 0.1, 3.45, z0, x + 0.1, 3.69, z1, { skip: 'py' });
    // inner faces of side walls
    const skinWall = (x, dir, ops) => {
      let cur = z0;
      const segs = ops.slice().sort((a, b) => a[0] - b[0]);
      const q = (za, zb, ya, yb) => { if (zb - za < 0.01 || yb - ya < 0.01) return; if (dir < 0) G.quad(IN, [x, ya, za], [x, ya, zb], [x, yb, zb], [x, yb, za]); else G.quad(IN, [x, ya, zb], [x, ya, za], [x, yb, za], [x, yb, zb]); };
      for (const o of segs) { q(cur, o[0], 0, 3.7); q(o[0], o[1], 0, o[2]); q(o[0], o[1], o[3], 3.7); cur = o[1]; }
      q(cur, z1, 0, 3.7);
    };
    skinWall(x0 + 0.005, 1, [[-9.6, -7.8, 0, 2.5], [-12.4, -10.8, 1.0, 2.4]]);
    skinWall(x1 - 0.005, -1, [[-8.2, -6.4, 0, 2.6], [-12.4, -9.4, 0.95, 2.6], [-5.3, -3.9, 0.95, 2.6]]);
    // bar counter
    ctx.block(MAT.woodDark, -24.6, 0, -12.4, -18.4, 1.05, -11.7);
    G.box(MAT.marble, -24.7, 1.05, -12.5, -18.3, 1.12, -11.6);
    G.box(MAT.chrome, -21.0, 1.12, -12.35, -20.3, 1.55, -11.95);
    G.box(MAT.iron, -20.95, 1.55, -12.3, -20.35, 1.6, -12.0);
    // shelves with bottles
    for (const y of [1.45, 1.85, 2.25]) {
      G.box(MAT.wood, -24.4, y, -13, -18.6, y + 0.04, -12.72);
      for (let x = -24.2; x < -18.8; x += 0.16 + ctx.r() * 0.08) {
        if (ctx.r() < 0.15) continue;
        const bh = 0.24 + ctx.r() * 0.1;
        const g = new THREE.CylinderGeometry(0.035, 0.04, bh, 8);
        G.geom(ctx.pick(MAT.bottles), g, new THREE.Matrix4().makeTranslation(x, y + 0.04 + bh / 2, -12.86));
      }
    }
    // tables
    cafeSet(ctx, -23.6, -5.2, false); cafeSet(ctx, -19.8, -5.0, false); cafeSet(ctx, -16.6, -10.9, false);
    // pendant lamps
    for (const [lx, lz] of [[-22, -8], [-17.5, -8]]) {
      rod(ctx, MAT.iron, [lx, 3.45, lz], [lx, 2.75, lz], 0.01);
      const sh = new THREE.ConeGeometry(0.28, 0.22, 14, 1, true);
      G.geom(MAT.metal, sh, new THREE.Matrix4().makeTranslation(lx, 2.65, lz));
      const bulb = new THREE.SphereGeometry(0.07, 8, 6);
      G.geom(MAT.lampGlass, bulb, new THREE.Matrix4().makeTranslation(lx, 2.57, lz));
    }
    ctx.lights.push({ type: 'point', pos: [-20, 2.4, -8], color: 0xffc27a, intensity: 6, distance: 9 });
  }
  // outdoor café tables on the piazza
  cafeSet(ctx, -11.9, -10.8, true); cafeSet(ctx, -11.6, -4.3, true);
  pottedPlant(ctx, -13.4, -8.9, 0.9); pottedPlant(ctx, -13.4, -5.8, 0.9);

  // ---------------- arch passage ----------------
  {
    const am = MAT.plaster_terracotta;
    ctx.block(am, -27, 0, -2.5, -14, TY, -1.8, { skip: 'ny,nz' });
    ctx.block(am, -27, 0, 1.8, -14, TY, 2.5, { skip: 'ny,pz' });
    vault(ctx, 'x', -27, -14, 0, 2.2, 1.8, MAT.brick, 16);
    // ceiling collision approximating the vault
    ctx.solid(-27, 3.45, -1.8, -14, TY, 1.8, 'stone');
    ctx.solid(-27, 2.6, -1.8, -14, TY, -1.15, 'stone');
    ctx.solid(-27, 2.6, 1.15, -14, TY, 1.8, 'stone');
    const Fw = facade(-27, -2.5, -14, 2.5, 'w'), Fe = facade(-27, -2.5, -14, 2.5, 'e');
    archPortal(ctx, Fw, 0, 5, 0, TY, 2.5, 1.8, 2.2, 0.22, MAT.stone);
    archPortal(ctx, Fe, 0, 5, 0, TY, 2.5, 1.8, 2.2, 0.22, MAT.stone);
    // keystones
    fbox(ctx, Fw, MAT.stoneTrim, 2.3, 2.7, 3.8, 4.3, 0.22, 0.3);
    fbox(ctx, Fe, MAT.stoneTrim, 2.3, 2.7, 3.8, 4.3, 0.22, 0.3);
    // lamp inside the arch
    const lampG = new THREE.SphereGeometry(0.1, 8, 6);
    G.geom(MAT.lampGlass, lampG, new THREE.Matrix4().makeTranslation(-20.5, 3.6, 0));
  }
  // ---------------- SW building: ground volume + terrace + tall house ----------------
  {
    const c = 'pesca';
    house(ctx, {
      x0: -27, z0: 2.5, x1: -14, z1: 14, h: TY, floors: 1, color: c, shutter: 'verde', roof: 'none', skip: 'ns', cornice: false, chimney: false,
      faces: {
        e: { shops: [{ s0: 4.2, s1: 8.2, sign: SIGNS.trattoria, awning: MAT.awningGreen, signW: 3.6 }], cols: 3 },
        w: { cols: 3, skipCols: [1, 2] },
      },
    });
    // terrace floor (cotto) over arch + this block
    G.quad(MAT.cotto, [-27, TY + 0.01, 14], [-14, TY + 0.01, 14], [-14, TY + 0.01, -2.5], [-27, TY + 0.01, -2.5]);
    // parapets
    const pm = MAT['plaster_' + c];
    ctx.block(pm, -14.3, TY, -2.5, -14.0, TY + 1.05, 14);
    G.box(MAT.stoneTrim, -14.36, TY + 1.05, -2.5, -13.94, TY + 1.12, 14);
    ctx.block(pm, -27.0, TY, -2.5, -26.7, TY + 1.05, 6.4);
    ctx.block(pm, -27.0, TY, 8.0, -26.7, TY + 1.05, 14);
    G.box(MAT.stoneTrim, -27.06, TY + 1.05, -2.5, -26.64, TY + 1.12, 6.4);
    G.box(MAT.stoneTrim, -27.06, TY + 1.05, 8.0, -26.64, TY + 1.12, 14);
    // terrace dressing: pergola + plants + table
    for (const [px, pz] of [[-25.6, 9.5], [-21.0, 9.5], [-25.6, 13.4], [-21.0, 13.4]]) ctx.block(MAT.wood, px - 0.08, TY, pz - 0.08, px + 0.08, TY + 2.5, pz + 0.08, { surf: 'wood' });
    for (const pz of [9.5, 13.4]) G.box(MAT.wood, -26.0, TY + 2.5, pz - 0.08, -20.6, TY + 2.66, pz + 0.08);
    for (let px = -25.8; px <= -20.8; px += 0.6) G.box(MAT.wood, px - 0.04, TY + 2.66, 9.2, px + 0.04, TY + 2.74, 13.7);
    for (let i = 0; i < 6; i++) leafBall(ctx, -25.4 + i * 0.95, TY + 2.85, 11.45, 1.1, 18, MAT.leaves2, 0.35);
    cafeSet(ctx, -23.3, 11.4, false);
    pottedPlant(ctx, -15.0, 13.2, 1.0, true); pottedPlant(ctx, -15.0, -1.5, 0.9);
    crate(ctx, -18.5, TY, 12.9, 1.0);
    crate(ctx, -16.8, TY, 3.6, 1.0);
    // tall house at the south end (z 14..20)
    house(ctx, {
      x0: -27, z0: 14, x1: -14, z1: 20, h: 9.6, color: 'giallo', shutter: 'marrone', roof: 'gable-x', roofH: 1.6, skip: 'e',
      faces: { n: { minY: TY + 0.4, cols: 3 }, s: { doors: [{ s: 9.0, lamp: true }], cols: 4 }, w: { cols: 2 } },
    });
    // door from the terrace into the tall house (decor)
    doorUnit(ctx, facade(-27, 14, -14, 20, 'n', TY), 6.5, { step: false });
  }
  // stairs from the west alley up to the terrace (x -28.6..-27, rising toward -z)
  {
    const top = stairs(ctx, 'z', -1, 19.5, -28.6, -27.0, 0, TY, 0.5);
    // landing
    ctx.block(MAT.stoneTrim, -28.6, 0, 6.4, -27.0, TY, top, { skip: 'ny' });
    // side wall under the stairs (visible from alley)
    for (let i = 0; i < 23; i++) {
      const z1 = 19.5 - i * 0.5, z0 = z1 - 0.5, yt = (i + 1) * TY / 23;
      G.box(MAT.rubble, -28.62, 0, z0, -28.58, yt - 0.02, z1, { skip: 'py,ny' });
    }
    for (let i = 0; i <= 23; i += 1) {
      const z = 19.5 - i * 0.5, y = i * TY / 23;
      if (i % 2 === 0) G.box(MAT.iron, -28.57, y, z - 0.01, -28.55, y + 1.0, z + 0.01);
    }
    rod(ctx, MAT.iron, [-28.56, 1.0, 19.5], [-28.56, TY + 1.0, top], 0.022);
    rod(ctx, MAT.iron, [-28.56, TY + 1.0, top], [-28.56, TY + 1.0, 6.4], 0.022);
  }
  // ---------------- west alley props ----------------
  crate(ctx, -32.6, 0, -11.0, 1.1); crate(ctx, -31.4, 0, -11.2, 1.0); crate(ctx, -32.1, 1.1, -11.1, 0.95);
  barrel(ctx, -33.3, 4.6); barrel(ctx, -33.3, 5.5); barrel(ctx, -32.4, 5.1);
  vespa(ctx, -32.9, -4.6, Math.PI / 2 + 0.15);
  pottedPlant(ctx, -33.4, -17.6, 0.9); pottedPlant(ctx, -33.4, -26.6 + 0.3, 1.0);
  crate(ctx, -30.0, 0, 15.6, 1.1);
  laundryLine(ctx, [-34, 6.4, -14.5], [-27, 6.0, -14.2], 0.45);
  laundryLine(ctx, [-34, 6.8, -6.2], [-27, 6.6, -6.4], 0.5);
  laundryLine(ctx, [-34, 7.6, 16.8], [-27, 7.3, 16.4], 0.45);
  // street name plaques
  signBoard(ctx, facade(-40, -30, -34, -16, 'e'), 7, 3.2, 1.4, 0.36, SIGNS.via2, 0.03);
  signBoard(ctx, facade(-27, -20, -14, -2.5, 'n'), 1.4, 3.0, 1.4, 0.36, SIGNS.via1, 0.03);
  // ---------------- SW corner: garden, platform, pergola ----------------
  house(ctx, { x0: -34, z0: 40, x1: -20, z1: 46, h: 9.2, color: 'ocra', shutter: 'verde', roof: 'gable-x', skip: 'sw', faces: { n: { doors: [{ s: 4.0, lamp: true }], balconies: ['1:1'] }, e: { cols: 1 } } });
  {
    // raised platform x -34..-28.5, z 31..40, y 2.2
    const PY = 2.2;
    ctx.block(MAT.rubble, -34, 0, 31, -28.5, PY, 40, { skip: 'ny' });
    G.box(MAT.stoneTrim, -34, PY, 30.9, -28.4, PY + 0.08, 40, { skip: 'ny' });
    G.quad(MAT.cotto, [-34, PY + 0.085, 40], [-28.5, PY + 0.085, 40], [-28.5, PY + 0.085, 31], [-34, PY + 0.085, 31]);
    ctx.solid(-34, PY, 30.9, -28.4, PY + 0.08, 40, 'stone');
    stairs(ctx, 'x', -1, -25.7, 36.0, 38.2, 0, PY + 0.08, 0.25);
    railing(ctx, -28.45, 31.0, -28.45, 36.0, PY + 0.08, 0.95);
    railing(ctx, -28.45, 38.2, -28.45, 40.0, PY + 0.08, 0.95);
    ctx.solid(-28.5, PY, 38.2, -28.4, PY + 1.05, 40, 'metal', F_NORAY);
    railing(ctx, -34, 30.95, -28.45, 30.95, PY + 0.08, 0.95);
    ctx.solid(-28.5, PY, 31, -28.4, PY + 1.05, 36.0, 'metal', F_NORAY);
    ctx.solid(-34, PY, 30.9, -28.4, PY + 1.05, 31.0, 'metal', F_NORAY);
    pottedPlant(ctx, -33.2, 39.0 - 0.1, 1.0, true);
    crate(ctx, -31.6, PY + 0.08, 38.8, 1.0);
    // pergola
    for (const [px, pz] of [[-24, 30], [-20, 30], [-16, 30], [-24, 38], [-20, 38], [-16, 38]]) ctx.block(MAT.wood, px - 0.1, 0, pz - 0.1, px + 0.1, 2.7, pz + 0.1, { surf: 'wood' });
    for (const pz of [30, 38]) G.box(MAT.wood, -24.3, 2.7, pz - 0.1, -15.7, 2.9, pz + 0.1);
    for (let px = -24; px <= -16; px += 0.7) G.box(MAT.wood, px - 0.05, 2.9, 29.7, px + 0.05, 3.0, 38.3);
    for (let i = 0; i < 9; i++) leafBall(ctx, -23.6 + i * 0.95, 3.15, 34, 1.4, 16, MAT.leaves2, 0.3);
    bench(ctx, -20, 31.2, 'x', 2.2);
    cafeSet(ctx, -20, 34.5, false);
    // garden low walls (cover)
    ctx.block(MAT.rubble, -14.6, 0, 27.5, -14.0, 1.0, 33.5);
    G.box(MAT.stoneTrim, -14.66, 1.0, 27.5, -13.94, 1.08, 33.5);
    ctx.block(MAT.rubble, -27.5, 0, 26.6, -24.0, 1.0, 27.2);
    G.box(MAT.stoneTrim, -27.5, 1.0, 26.54, -24.0, 1.08, 27.26);
    tree(ctx, -17.2, 42.6, { h: 5.0, r: 2.6, leaves: MAT.leaves, cards: 44 });
    barrel(ctx, -24.8, 41.2 - 0.6);
  }
  // car in the south street
  car500(ctx, -21.5, 23.3, 0.04);
  streetLamp(ctx, -27.6, 25.6);

  // ---------------- north centre: sagrato (raised), farmacia, forno ----------------
  {
    ctx.block(MAT.stone, -14, 0, -34, 14, SY, -26, { skip: 'ny,nz,py' });
    G.quad(MAT.sagrato, [-14, SY + 0.005, -26], [14, SY + 0.005, -26], [14, SY + 0.005, -34], [-14, SY + 0.005, -34]);
    stairs(ctx, 'z', -1, -23.9, -10, 10, 0, SY, 0.35);
    balustrade(ctx, -14, -26.15, -10, -26.15, SY);
    balustrade(ctx, 10, -26.15, 14, -26.15, SY);
    // low parapet along west edge except at side steps
    ctx.block(MAT.stoneTrim, -14.15, SY, -34, -13.85, SY + 0.55, -32.2);
    ctx.block(MAT.stoneTrim, -14.15, SY, -29.2, -13.85, SY + 0.55, -26.3);
    streetLamp(ctx, -12.6, -27.2); streetLamp(ctx, 12.6, -27.2);
    // the lamps stand on the sagrato: lift them
  }
  house(ctx, {
    x0: -14, z0: -20, x1: -6, z1: -13, h: 7.2, color: 'crema', shutter: 'verdescuro', roof: 'gable-x', skip: 'w',
    faces: {
      s: { shops: [{ s0: 1.4, s1: 6.6, sign: SIGNS.farmacia, signW: 3.6 }], cols: 2 },
      n: { doors: [{ s: 2.2 }], cols: 2 },
      e: { cols: 2 },
    },
  });
  // green cross sign sticking out of the farmacia
  {
    const F = facade(-14, -20, -6, -13, 's');
    fbox(ctx, F, MAT.iron, 7.6, 7.66, 4.2, 4.26, 0, 0.7);
    fbox(ctx, F, MAT.greenCross, 7.43, 7.83, 3.5, 4.1, 0.55, 0.62);
    fbox(ctx, F, MAT.greenCross, 7.33, 7.93, 3.6, 4.0, 0.55, 0.62);
    ctx.lights.push({ type: 'glow', pos: fw(F, 7.63, 3.8, 0.7), color: 0x2bff7a });
  }
  house(ctx, {
    x0: 6, z0: -20, x1: 14, z1: -13, h: 8.4, color: 'ocra', shutter: 'marrone', roof: 'hip', skip: 'e',
    faces: {
      s: { shops: [{ s0: 1.6, s1: 6.4, sign: SIGNS.forno, awning: MAT.awningRed }], cols: 2, balconies: ['0:1'] },
      n: { doors: [{ s: 5.6, lamp: true }], cols: 2 },
      w: { doors: [{ s: 4.6 }], cols: 2 },
    },
  });
  signBoard(ctx, facade(6, -20, 14, -13, 'w'), 2.2, 3.1, 1.6, 0.34, SIGNS.via3, 0.03);

  // ---------------- piazza (north half) props ----------------
  kiosk(ctx, -9.4, -8.4, 0.35);
  marketStall(ctx, 8.4, -7.6, -0.25, MAT.awningRed);
  crate(ctx, 10.8, 0, -5.2, 1.0); crate(ctx, 11.9, 0, -5.6, 0.9); crate(ctx, 11.3, 1.0, -5.4, 0.8);
  bench(ctx, -4.6, -7.0, 'x', 2.2); bench(ctx, 4.6, -7.0, 'x', 2.2);
  tree(ctx, 11.4, -10.9, { h: 6.5, r: 3.4, leaves: MAT.leaves2, cards: 60, trunkR: 0.3 });
  for (const bx of [-5.2, -3.4, 3.4, 5.2]) bollard(ctx, bx, -13.4);
  streetLamp(ctx, -13.2, -12.4); streetLamp(ctx, 13.0, -12.2);
  signBoard(ctx, facade(-14, -20, -6, -13, 's'), 0.95, 3.3, 1.6, 0.27, SIGNS.piazza, 0.03);
  pottedPlant(ctx, 6.6, -12.6, 1.0); pottedPlant(ctx, -6.6, -12.6, 1.0);

  // ---------------- filler: the village continues beyond the walls ----------------
  const plots = [];
  for (let z = -70; z < 70; z += 9) plots.push([-60, z, -40, z + 9]);
  for (let x = -40; x < -14; x += 8) { plots.push([x, -66, x + 8, -46]); plots.push([x, 46, x + 8, 66]); }
  for (let x = -14; x < 14; x += 7) plots.push([x, -64, x + 7, -46.5]);
  const cols = Object.keys(PLASTER_COLORS);
  for (const [x0, z0, x1, z1] of plots) {
    if (x0 >= -14 && x1 <= 14 && z1 <= -46 && z0 > -50) continue;
    const h = 7 + ctx.r() * 7;
    fillerHouse(ctx, x0 + 0.2, z0 + 0.2, x1 - 0.2, z1 - 0.2, h, ctx.pick(cols));
  }
}

function fillerHouse(ctx, x0, z0, x1, z1, h, color) {
  const m = MAT['plaster_' + color];
  ctx.G.box(m, x0, -0.5, z0, x1, h, z1, { skip: 'ny,py', uo: [ctx.r() * 5, ctx.r() * 5] });
  // cheap windows on all sides
  for (const side of ['n', 's', 'e', 'w']) {
    const F = facade(x0, z0, x1, z1, side, 0);
    const cols = Math.max(1, Math.floor((F.L - 1) / 3));
    const floors = Math.max(1, Math.floor(h / 3.3));
    for (let fl = 0; fl < floors; fl++) for (let c = 0; c < cols; c++) {
      const s = (F.L - (cols - 1) * 3) / 2 + c * 3;
      const y = fl * 3.2 + 1.2;
      fquad(ctx, F, MAT.glass, s - 0.45, s + 0.45, y, y + 1.4, 0.02);
      if (ctx.r() < 0.7) { fquad(ctx, F, MAT.shutter_verde, s - 0.95, s - 0.5, y, y + 1.4, 0.03, [[0, 0], [1, 0], [1, 1], [0, 1]]); fquad(ctx, F, MAT.shutter_verde, s + 0.5, s + 0.95, y, y + 1.4, 0.03, [[0, 0], [1, 0], [1, 1], [0, 1]]); }
    }
    cornice(ctx, F, h - 0.2);
  }
  if (ctx.r() < 0.5) roofHip(ctx, x0, z0, x1, z1, h, Math.min(x1 - x0, z1 - z0) * 0.22, 0.4);
  else roofGable(ctx, x0, z0, x1, z1, h, Math.min(x1 - x0, z1 - z0) * 0.24, (x1 - x0) > (z1 - z0) ? 'x' : 'z', 0.4, m);
}

// --------------------------------------------------------------------
// Unique pieces: church (north), palazzo with loggia (south), fountain
function buildChurch(ctx) {
  const G = ctx.G, SY = MAPDEF.sagratoY;
  // nave
  ctx.block(MAT.stone, -8, 0, -46, 8, 13.2, -34, { skip: 'ny,py' });
  roofGable(ctx, -8, -46, 8, -34, 13.2, 4.6, 'z', 0.35, MAT.stone);
  const F = facade(-8, -46, 8, -34, 's');
  // pilasters & cornices
  for (const s of [0.15, 4.0, 12.0, 15.85]) fbox(ctx, F, MAT.stoneTrim, s - 0.35, s + 0.35, SY, 12.9, 0, 0.22);
  fbox(ctx, F, MAT.stoneTrim, -0.3, 16.3, 12.6, 13.25, 0, 0.35);
  fbox(ctx, F, MAT.stoneTrim, -0.1, 16.1, 6.6, 6.95, 0, 0.26);
  // portal
  doorUnit(ctx, F, 8, { w: 2.5, h: 4.0, y: SY, mat: MAT.woodDark, trim: MAT.stoneTrim, step: false });
  const lun = new THREE.CircleGeometry(1.25, 24, 0, Math.PI);
  G.geom(MAT.glass, lun, new THREE.Matrix4().makeTranslation(0, SY + 4.4, -33.97));
  const lunFr = new THREE.TorusGeometry(1.35, 0.14, 6, 24, Math.PI);
  G.geom(MAT.stoneTrim, lunFr, new THREE.Matrix4().makeTranslation(0, SY + 4.4, -33.9));
  // rose window
  const rw = new THREE.CircleGeometry(1.75, 32);
  const roseMat = new THREE.MeshPhysicalMaterial({ color: 0x3a2b52, roughness: 0.15, metalness: 0, clearcoat: 1, emissive: 0x2a1530, emissiveIntensity: 0.4 });
  G.geom(roseMat, rw, new THREE.Matrix4().makeTranslation(0, 9.6, -33.97));
  const rf = new THREE.TorusGeometry(1.85, 0.2, 8, 32);
  G.geom(MAT.stoneTrim, rf, new THREE.Matrix4().makeTranslation(0, 9.6, -33.88));
  const hub = new THREE.TorusGeometry(0.42, 0.08, 6, 20);
  G.geom(MAT.stoneTrim, hub, new THREE.Matrix4().makeTranslation(0, 9.6, -33.9));
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    const sp = new THREE.BoxGeometry(0.07, 1.3, 0.08);
    G.geom(MAT.stoneTrim, sp, new THREE.Matrix4().makeRotationZ(a).setPosition(Math.sin(-a) * 1.1, 9.6 + Math.cos(a) * 1.1, -33.92));
  }
  // small side windows
  for (const s of [2.0, 14.0]) {
    fbox(ctx, F, MAT.stoneTrim, s - 0.5, s + 0.5, 8.4, 8.55, 0, 0.12);
    fquad(ctx, F, MAT.glass, s - 0.35, s + 0.35, 7.6, 9.6, 0.02);
    const arc = new THREE.CircleGeometry(0.35, 12, 0, Math.PI);
    const p = fw(F, s, 9.6, 0.02);
    G.geom(MAT.glass, arc, new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]));
  }
  // porch (protiro) with two columns
  for (const cx of [-1.75, 1.75]) {
    const col = new THREE.CylinderGeometry(0.2, 0.24, 3.4, 14);
    G.geom(MAT.marble, col, new THREE.Matrix4().makeTranslation(cx, SY + 0.2 + 1.7, -31.6), { worldUV: true });
    G.box(MAT.stoneTrim, cx - 0.35, SY, -31.95, cx + 0.35, SY + 0.2, -31.25);
    G.box(MAT.stoneTrim, cx - 0.32, SY + 3.6, -31.92, cx + 0.32, SY + 3.8, -31.28);
    ctx.solid(cx - 0.3, SY, -31.9, cx + 0.3, SY + 3.8, -31.3, 'stone');
  }
  ctx.block(MAT.stoneTrim, -2.3, SY + 3.8, -34, 2.3, SY + 4.15, -31.1);
  roofGable(ctx, -2.3, -34, 2.3, -31.1, SY + 4.15, 1.3, 'z', 0.2, MAT.stone);
  // side chapels
  house(ctx, { x0: -14, z0: -46, x1: -8, z1: -34, h: 7.6, color: 'crema', shutter: null, roof: 'gable-z', roofH: 1.6, skip: 'e', quoins: true, faces: { s: { cols: 1 }, n: { plain: true }, w: { cols: 3 } }, chimney: false });
  house(ctx, { x0: 8, z0: -41, x1: 14, z1: -34, h: 7.6, color: 'crema', shutter: null, roof: 'gable-z', roofH: 1.6, skip: 'wn', quoins: true, faces: { s: { cols: 1 }, e: { cols: 1 } }, chimney: false });
  // bell tower (brick)
  const tx0 = 8.4, tx1 = 13.6, tz0 = -46, tz1 = -40.8, th = 17;
  ctx.block(MAT.brick, tx0, 0, tz0, tx1, th, tz1, { skip: 'ny' });
  for (const side of ['s', 'e', 'w', 'n']) {
    const Ft = facade(tx0, tz0, tx1, tz1, side, 0);
    quoins(ctx, Ft, 0.5, th, MAT.stoneTrim);
    stringCourse(ctx, Ft, 7.6); stringCourse(ctx, Ft, 12.2);
    fbox(ctx, Ft, MAT.stoneTrim, -0.15, Ft.L + 0.15, th - 0.2, th, 0, 0.2);
  }
  // belfry: 4 piers + arches + bell
  const bh = 4.2, by = th;
  for (const [px, pz] of [[tx0, tz0], [tx1 - 0.9, tz0], [tx0, tz1 - 0.9], [tx1 - 0.9, tz1 - 0.9]]) G.box(MAT.brick, px, by, pz, px + 0.9, by + bh, pz + 0.9);
  for (const side of ['s', 'e', 'w', 'n']) {
    const Ft = facade(tx0, tz0, tx1, tz1, side, by);
    archPortal(ctx, Ft, 0.9, Ft.L - 0.9, 0, bh, Ft.L / 2, (Ft.L - 1.8) / 2 - 0.15, bh - 1.75, 0.05, MAT.brick);
  }
  G.box(MAT.stoneTrim, tx0 - 0.2, by + bh, tz0 - 0.2, tx1 + 0.2, by + bh + 0.35, tz1 + 0.2);
  const cone = new THREE.ConeGeometry(3.7, 4.2, 4, 1, true);
  cone.rotateY(Math.PI / 4);
  G.geom(MAT.roof, cone, new THREE.Matrix4().makeTranslation((tx0 + tx1) / 2, by + bh + 0.35 + 2.1, (tz0 + tz1) / 2), { uvScale: 3 });
  const bellPts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; bellPts.push(new THREE.Vector2(0.18 + 0.62 * Math.pow(1 - t, 2.2) + (t < 0.08 ? 0.05 : 0), 1.3 * t)); }
  const bell = new THREE.LatheGeometry(bellPts, 18);
  G.geom(MAT.brass, bell, new THREE.Matrix4().makeTranslation((tx0 + tx1) / 2, by + 1.2, (tz0 + tz1) / 2));
  G.box(MAT.woodDark, tx0 + 0.9, by + 2.55, (tz0 + tz1) / 2 - 0.1, tx1 - 0.9, by + 2.75, (tz0 + tz1) / 2 + 0.1);
  // clock
  const clk = new THREE.CircleGeometry(1.0, 32);
  const clockMat = new THREE.MeshStandardMaterial({ color: 0xf1ead8, roughness: 0.5 });
  G.geom(clockMat, clk, new THREE.Matrix4().makeTranslation((tx0 + tx1) / 2, 14.2, tz1 + 0.02));
  const ring = new THREE.TorusGeometry(1.02, 0.08, 6, 32);
  G.geom(MAT.iron, ring, new THREE.Matrix4().makeTranslation((tx0 + tx1) / 2, 14.2, tz1 + 0.04));
  G.box(MAT.iron, (tx0 + tx1) / 2 - 0.03, 14.2, tz1 + 0.05, (tx0 + tx1) / 2 + 0.03, 14.9, tz1 + 0.08);
  G.box(MAT.iron, (tx0 + tx1) / 2, 14.17, tz1 + 0.05, (tx0 + tx1) / 2 + 0.5, 14.23, tz1 + 0.08);
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; G.box(MAT.iron, (tx0 + tx1) / 2 + Math.sin(a) * 0.85 - 0.03, 14.2 + Math.cos(a) * 0.85 - 0.03, tz1 + 0.03, (tx0 + tx1) / 2 + Math.sin(a) * 0.85 + 0.03, 14.2 + Math.cos(a) * 0.85 + 0.03, tz1 + 0.06); }
  // collision behind church (map edge)
  ctx.solid(-14, 0, -46, 14, 30, -45.5, 'stone');
}

function buildPalazzo(ctx) {
  const G = ctx.G, SY = MAPDEF.sagratoY;
  const x0 = -11, x1 = 11, zf = 34, zb = 46, ph = 6.0, H = 15.2;
  // porch floor
  ctx.block(MAT.stone, x0, 0, zf, x1, SY, 37.6, { skip: 'ny,py,nz' });
  G.quad(MAT.cotto, [x0, SY + 0.005, 37.6], [x1, SY + 0.005, 37.6], [x1, SY + 0.005, zf], [x0, SY + 0.005, zf]);
  // back block of ground floor with doors
  ctx.block(MAT.plaster_rosa, x0, 0, 37.6, x1, ph, zb, { skip: 'ny,py' });
  const Fb = facade(x0, 37.6, x1, zb, 'n', SY);
  doorUnit(ctx, Fb, 11, { w: 2.2, h: 3.4, mat: MAT.woodDark, step: false });
  doorUnit(ctx, Fb, 4.5, { w: 1.3, h: 2.6, step: false }); doorUnit(ctx, Fb, 17.5, { w: 1.3, h: 2.6, step: false });
  // upper volume
  ctx.block(MAT.plaster_rosa, x0, ph, zf, x1, H, zb, { skip: 'py,ny' });
  // porch ceiling with beams
  G.quad(MAT.woodDark, [x0, ph - 0.01, zf], [x1, ph - 0.01, zf], [x1, ph - 0.01, 37.6], [x0, ph - 0.01, 37.6]);
  for (let x = x0 + 1.1; x < x1; x += 2.2) G.box(MAT.wood, x - 0.12, ph - 0.3, zf, x + 0.12, ph - 0.01, 37.6, { skip: 'py' });
  // loggia facade: 5 arches
  const Ff = facade(x0, zf, x1, zb, 'n', 0);
  const shape = new THREE.Shape();
  const L = x1 - x0;
  shape.moveTo(0, SY); shape.lineTo(L, SY); shape.lineTo(L, ph); shape.lineTo(0, ph); shape.lineTo(0, SY);
  const aw = 3.2, pier = (L - 5 * aw) / 6, spring = SY + 2.5;
  for (let i = 0; i < 5; i++) {
    const c = pier + aw / 2 + i * (aw + pier);
    const hole = new THREE.Path();
    hole.moveTo(c - aw / 2, SY); hole.lineTo(c + aw / 2, SY); hole.lineTo(c + aw / 2, spring); hole.absarc(c, spring, aw / 2, 0, Math.PI, false); hole.lineTo(c - aw / 2, SY);
    shape.holes.push(hole);
    // pier collisions (s measured along R=-X from x1)
    const sA = c - aw / 2 - pier, sB = c - aw / 2;
    const wx0 = x1 - sB, wx1 = x1 - sA;
    ctx.solid(wx0, SY, zf - 0.4, wx1, ph, zf, 'stone');
    if (i === 4) ctx.solid(x0, SY, zf - 0.4, x0 + pier, ph, zf, 'stone');
    ctx.solid(x1 - (c + aw / 2), spring + aw / 2 - 0.25, zf - 0.4, x1 - (c - aw / 2), ph, zf, 'stone');
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false, curveSegments: 18 });
  const m = new THREE.Matrix4().set(Ff.R[0], 0, Ff.N[0], Ff.O[0], 0, 1, 0, Ff.O[1], Ff.R[2], 0, Ff.N[2], Ff.O[2], 0, 0, 0, 1);
  G.geom(MAT.stone, g, m, { worldUV: true });
  // upper facade
  const Fu = facade(x0, zf, x1, zb, 'n', 0);
  fbox(ctx, Fu, MAT.stoneTrim, -0.2, L + 0.2, ph - 0.1, ph + 0.25, 0, 0.18);
  for (let i = 0; i < 6; i++) {
    const s = 1.8 + i * (L - 3.6) / 5;
    windowUnit(ctx, Fu, s, ph + 1.3, { shutter: MAT.shutter_verdescuro, h: 2.0, flowers: false, state: 'open' });
    windowUnit(ctx, Fu, s, ph + 5.0, { shutter: MAT.shutter_verdescuro, h: 1.6, flowers: i % 2 === 0 });
  }
  stringCourse(ctx, Fu, ph + 3.7);
  // clock & coat of arms
  const clk = new THREE.CircleGeometry(0.9, 32);
  G.geom(new THREE.MeshStandardMaterial({ color: 0xf1ead8, roughness: 0.5 }), clk, new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, H - 1.2, zf - 0.02));
  const ring = new THREE.TorusGeometry(0.95, 0.08, 6, 32);
  G.geom(MAT.iron, ring, new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, H - 1.2, zf - 0.04));
  G.box(MAT.iron, -0.03, H - 1.2, zf - 0.08, 0.03, H - 0.6, zf - 0.05);
  G.box(MAT.iron, -0.4, H - 1.23, zf - 0.08, 0, H - 1.17, zf - 0.05);
  // battlements (merlons) on top
  G.box(MAT.stoneTrim, x0 - 0.2, H, zf - 0.6, x1 + 0.2, H + 0.3, zb + 0.2);
  for (let x = x0; x < x1 - 0.1; x += 1.1) {
    G.box(MAT.plaster_rosa, x, H + 0.3, zf - 0.6, x + 0.6, H + 1.4, zf - 0.2);
    G.box(MAT.plaster_rosa, x, H + 0.3, zb - 0.2, x + 0.6, H + 1.4, zb + 0.2);
  }
  // flag pole with tricolore
  rod(ctx, MAT.iron, [3.5, H + 0.3, zf - 0.5], [3.5, H + 4.5, zf - 0.5], 0.04);
  const flagTex = CanvasTex.make(96, 64, (g2) => { g2.fillStyle = '#1f8a3e'; g2.fillRect(0, 0, 32, 64); g2.fillStyle = '#f2f0ea'; g2.fillRect(32, 0, 32, 64); g2.fillStyle = '#c8232c'; g2.fillRect(64, 0, 32, 64); });
  ctx.flag = { tex: flagTex, pos: [3.5, H + 4.4, zf - 0.5] };
  // side buildings closing the base
  house(ctx, { x0: -14, z0: 34, x1: -11, z1: 46, h: 9.4, color: 'bianco', shutter: 'verde', roof: 'gable-z', roofH: 1.4, skip: 'es', faces: { n: { cols: 1 }, w: { plain: true } }, chimney: false });
  house(ctx, { x0: 11, z0: 34, x1: 14, z1: 46, h: 9.4, color: 'bianco', shutter: 'verde', roof: 'gable-z', roofH: 1.4, skip: 'ws', faces: { n: { cols: 1 }, e: { plain: true } }, chimney: false });
  // roof of palazzo
  roofHip(ctx, x0 + 0.5, zf + 0.2, x1 - 0.5, zb - 0.5, H + 0.3, 2.2, 0.01);
  ctx.solid(-14, 0, 45.5, 14, 30, 46, 'stone');
}

function buildFountain(ctx) {
  const G = ctx.G;
  const R0 = 3.6, rimH = 0.62;
  const outer = new THREE.CylinderGeometry(R0, R0 + 0.12, rimH, 40, 1, true);
  G.geom(MAT.marble, outer, new THREE.Matrix4().makeTranslation(0, rimH / 2, 0), { worldUV: true });
  const inner = new THREE.CylinderGeometry(R0 - 0.35, R0 - 0.35, rimH, 40, 1, true);
  inner.scale(-1, 1, 1);
  G.geom(MAT.marble, inner, new THREE.Matrix4().makeTranslation(0, rimH / 2, 0), { worldUV: true });
  const top = new THREE.RingGeometry(R0 - 0.38, R0 + 0.06, 40, 1); top.rotateX(-Math.PI / 2);
  G.geom(MAT.marble, top, new THREE.Matrix4().makeTranslation(0, rimH + 0.001, 0), { worldUV: true });
  const lip = new THREE.TorusGeometry(R0 - 0.16, 0.2, 8, 48); lip.rotateX(Math.PI / 2);
  G.geom(MAT.marble, lip, new THREE.Matrix4().makeTranslation(0, rimH, 0), { worldUV: true });
  const floor = new THREE.CircleGeometry(R0 - 0.34, 40); floor.rotateX(-Math.PI / 2);
  G.geom(MAT.slabs, floor, new THREE.Matrix4().makeTranslation(0, 0.02, 0), { worldUV: true });
  // central pedestal + bowl + finial via lathe
  const prof = [[0.0, 0], [0.75, 0], [0.75, 0.25], [0.55, 0.35], [0.42, 0.5], [0.36, 1.2], [0.42, 1.35], [0.5, 1.45], [1.35, 1.62], [1.45, 1.75], [1.35, 1.85], [0.3, 1.9], [0.22, 2.3], [0.3, 2.45], [0.18, 2.6], [0.24, 2.8], [0.1, 3.05], [0.0, 3.1]];
  const lathe = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), 28);
  G.geom(MAT.marble, lathe, new THREE.Matrix4(), { worldUV: true });
  // collision: ring of boxes + pedestal
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a0 = i * TAU / N, a1 = (i + 1) * TAU / N;
    const pts = [[Math.cos(a0) * (R0 - 0.36), Math.sin(a0) * (R0 - 0.36)], [Math.cos(a1) * (R0 - 0.36), Math.sin(a1) * (R0 - 0.36)], [Math.cos(a0) * (R0 + 0.1), Math.sin(a0) * (R0 + 0.1)], [Math.cos(a1) * (R0 + 0.1), Math.sin(a1) * (R0 + 0.1)]];
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    ctx.solid(Math.min(...xs), 0, Math.min(...zs), Math.max(...xs), rimH + 0.1, Math.max(...zs), 'stone');
  }
  ctx.solid(-0.7, 0, -0.7, 0.7, 1.9, 0.7, 'stone');
  ctx.solid(-1.4, 1.55, -1.4, 1.4, 1.9, 1.4, 'stone');
  ctx.water = { y: 0.45, r: R0 - 0.36, bowlY: 1.82, bowlR: 1.3 };
}

// --------------------------------------------------------------------
// Map data: spawns & objectives (half A, mirrored with team swap)
const SPAWNS_A = [
  // team 1 (north)
  [-8, 1.2, -30.5, 1], [-3.5, 1.2, -29.0, 1], [3.5, 1.2, -29.0, 1], [8, 1.2, -30.5, 1], [0, 1.2, -32.5, 1],
  [-24, 0, -29.5, 1], [-20.2, 0, -34.5, 1], [-30.5, 0, -35.5, 1], [-28.0, 0, -42.5 + 0.8, 1],
  // team 2 (south side features defined in half A: SW corner)
  [-31.0, 2.3, 35.0, 2], [-21.0, 0, 32.6, 2], [-17.5, 0, 36.5, 2], [-25.5, 0, 29.0, 2], [-30.2, 0, 28.5, 2],
  // neutral (FFA only)
  [-30.5, 0, -18.0, 0], [-30.5, 0, -1.0, 0], [-30.8, 0, 12.0, 0], [-20.5, 0, -8.2, 0], [-22.0, TY_SAFE(), 6.0, 0],
  [-9.5, 0, -4.0, 0], [3.0, 0, -10.5, 0], [-20.0, 0, -23.0, 0], [0, 0, -16.5, 0],
];
function TY_SAFE() { return MAPDEF.terraceY + 0.02; }
const HARDPOINTS = [
  { name: 'Fontana', c: [0, 0, 0], r: 5.2, h: 3.5 },
  { name: 'Bar Centrale', box: [-26.6, -0.5, -13, -14.4, 3.7, -3.5] },
  { name: 'Terrazza Est', box: [14, 4.0, -14, 27, 7.5, 2.5] },
  { name: 'Bar dei Pini', box: [14.4, -0.5, 3.5, 26.6, 3.7, 13] },
  { name: 'Terrazza Ovest', box: [-27, 4.0, -2.5, -14, 7.5, 14] },
];
const FLAGS = [[0, 1.2, -30.6], [0, 1.2, 30.6]];
