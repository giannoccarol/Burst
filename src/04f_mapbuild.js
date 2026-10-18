// ===================================================================
// Assemble the whole map: half A + rotated copy + unique pieces + backdrop
// ===================================================================
function buildMap(scene) {
  makeSigns();
  SIGNS.ferramenta = CanvasTex.sign('FERRAMENTA', { bg: '#3a3a3a', fg: '#f0e8d0', font: 'Georgia, serif', size: 0.48 });
  const A = new MapCtx(mulberry32(1234));
  buildHalfA(A);
  // material swaps for the rotated half
  const SW = new Map();
  for (const [a, b] of Object.entries(PLASTER_SWAP)) { SW.set(MAT['plaster_' + a], MAT['plaster_' + b]); SW.set(MAT['plasterIn_' + a], MAT['plasterIn_' + b]); }
  for (const [a, b] of Object.entries(SHUTTER_SWAP)) SW.set(MAT['shutter_' + a], MAT['shutter_' + b]);
  SW.set(MAT.awningRed, MAT.awningGreen); SW.set(MAT.awningGreen, MAT.awningRed);
  const signPairs = [['farmacia', 'tabacchi'], ['bar', 'gelateria'], ['forno', 'pizzeria'], ['trattoria', 'alimentari'], ['alimentari', 'ferramenta'], ['via1', 'via3'], ['via3', 'via1']];
  for (const [a, b] of signPairs) SW.set(signMat(SIGNS[a]), signMat(SIGNS[b]));

  const F = new MapCtx(mulberry32(777));
  A.G.mirrorInto(F.G, (m) => SW.get(m));
  F.G.absorb(A.G);
  buildChurch(F); buildPalazzo(F); buildFountain(F);

  const W = new CollisionWorld();
  const addBox = (b) => W.add(b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7]);
  for (const b of A.boxes) { addBox(b); addBox([-b[3], b[1], -b[5], -b[0], b[4], -b[2], b[6], b[7]]); }
  for (const b of F.boxes) addBox(b);
  const mv = (p) => new THREE.Vector3(p[0], p[1], p[2]);
  const mm = (p) => new THREE.Vector3(-p[0], p[1], -p[2]);
  for (const t of A.tris) { W.addTri(mv(t[0]), mv(t[1]), mv(t[2]), t[3]); W.addTri(mm(t[0]), mm(t[1]), mm(t[2]), t[3]); }
  for (const t of F.tris) W.addTri(mv(t[0]), mv(t[1]), mv(t[2]), t[3]);
  // ground + clip walls around the playable area
  W.add(-200, -5, -200, 200, 0, 200, 'stone');
  const B = MAPDEF.bounds;
  W.add(B.x0 - 2, 0, B.z0 - 2, B.x0, 60, B.z1 + 2, 'stone', F_NORAY);
  W.add(B.x1, 0, B.z0 - 2, B.x1 + 2, 60, B.z1 + 2, 'stone', F_NORAY);
  W.add(B.x0 - 2, 0, B.z0 - 2, B.x1 + 2, 60, B.z0, 'stone', F_NORAY);
  W.add(B.x0 - 2, 0, B.z1, B.x1 + 2, 60, B.z1 + 2, 'stone', F_NORAY);
  W.add(B.x0 - 2, 40, B.z0 - 2, B.x1 + 2, 42, B.z1 + 2, 'stone', F_NORAY);
  W.add(-3.25, 0.0, -3.25, 3.25, F.water.y, 3.25, 'water', F_WATER);
  W.build();

  const group = new THREE.Group();
  group.name = 'map';
  F.G.build(group);
  scene.add(group);

  const lights = A.lights.concat(A.lights.map((l) => Object.assign({}, l, { pos: [-l.pos[0], l.pos[1], -l.pos[2]] })), F.lights);
  const spawns = [];
  for (const s of SPAWNS_A) { spawns.push({ x: s[0], y: s[1], z: s[2], team: s[3] }); spawns.push({ x: -s[0], y: s[1], z: -s[2], team: s[3] === 1 ? 2 : s[3] === 2 ? 1 : 0 }); }
  // yaw facing the map centre
  for (const s of spawns) s.yaw = Math.atan2(-(0 - s.x), -(0 - s.z));
  // GLB props: half A, its copy rotated like the geometry, then the unique pieces
  const props = A.glb.concat(MapProps.mirrored(A.glb), F.glb);
  return { group, world: W, lights, spawns, water: F.water, flag: F.flag, props };
}

// Animated pieces that are not static geometry: fountain water, flag, lamps glow
function buildDynamic(scene, map) {
  const dyn = { update: () => {} };
  const w = map.water;
  const waterGeo = new THREE.CircleGeometry(w.r + 0.02, 48); waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, MAT.water);
  water.position.y = w.y; water.receiveShadow = true; scene.add(water);
  const bowlGeo = new THREE.CircleGeometry(w.bowlR, 32); bowlGeo.rotateX(-Math.PI / 2);
  const bowl = new THREE.Mesh(bowlGeo, MAT.water);
  bowl.position.y = w.bowlY; scene.add(bowl);
  // falling water sheet from the upper bowl
  const sheetMat = new THREE.MeshPhysicalMaterial({ color: 0xbfd8d8, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, normalMap: MAT.waterTex, depthWrite: false, clearcoat: 1 });
  const sheet = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.62, w.bowlY - w.y, 36, 1, true), sheetMat);
  sheet.position.y = (w.bowlY + w.y) / 2 - 0.02; scene.add(sheet);
  // jet from the finial
  const jetMat = sheetMat.clone(); jetMat.opacity = 0.45;
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.6, 8, 1, true), jetMat);
  jet.position.y = 3.35; scene.add(jet);
  // flag
  let flag = null;
  if (map.flag) {
    const fg = new THREE.PlaneGeometry(1.5, 1.0, 12, 6); fg.translate(0.75, -0.5, 0);
    const fm = new THREE.MeshStandardMaterial({ map: map.flag.tex, side: THREE.DoubleSide, roughness: 0.9 });
    flag = new THREE.Mesh(fg, fm); flag.position.set(...map.flag.pos); flag.castShadow = true; scene.add(flag);
    flag.userData.base = fg.attributes.position.array.slice();
  }
  dyn.update = (t) => {
    MAT.water.normalMap.offset.set(t * 0.02, t * 0.013);
    sheetMat.normalMap = MAT.waterTex;
    if (flag) {
      const p = flag.geometry.attributes.position, b = flag.userData.base;
      for (let i = 0; i < p.count; i++) {
        const x = b[i * 3];
        p.setZ(i, Math.sin(x * 3.2 - t * 5.5) * 0.12 * x + Math.sin(x * 7 - t * 9) * 0.02 * x);
      }
      p.needsUpdate = true; flag.geometry.computeVertexNormals();
    }
  };
  return dyn;
}

// ---------------------------------------------------------------------
// Backdrop: rolling Tuscan hills, cypresses, olive groves, a distant hill town
function buildBackdrop(scene, q) {
  const group = new THREE.Group(); group.name = 'backdrop';
  const rng = mulberry32(4321);
  const seg = q >= 2 ? 200 : 120;
  const size = 3600;
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const vn = (x, z) => { // simple value noise
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const h = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
  };
  const fbm2 = (x, z) => vn(x, z) * 0.5 + vn(x * 2.1, z * 2.1) * 0.25 + vn(x * 4.3, z * 4.3) * 0.125 + vn(x * 8.7, z * 8.7) * 0.0625;
  const heightAt = (x, z) => {
    const d = Math.max(0, Math.max(Math.abs(x) - 66, Math.abs(z) - 74));
    const rr = Math.hypot(x, z);
    const hills = smoothstep(10, 260, d) * (18 + 70 * fbm2(x / 380, z / 380));
    const mountains = smoothstep(900, 1600, rr) * 260 * fbm2(x / 700 + 3, z / 700 + 7);
    return hills + mountains - 0.15 + (d > 0 ? 0 : -0.3);
  };
  const palette = [[0.56, 0.50, 0.30], [0.42, 0.45, 0.24], [0.62, 0.53, 0.32], [0.45, 0.36, 0.25], [0.36, 0.42, 0.22], [0.66, 0.60, 0.38]];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    const cx = Math.floor((x + 13 * Math.sin(z * 0.01)) / 70), cz = Math.floor((z + 13 * Math.sin(x * 0.012)) / 55);
    const k = Math.floor(vn(cx * 7.3, cz * 3.1) * palette.length) % palette.length;
    const c = palette[k];
    const n = 0.85 + 0.3 * fbm2(x / 30, z / 30);
    cols[i * 3] = c[0] * n; cols[i * 3 + 1] = c[1] * n; cols[i * 3 + 2] = c[2] * n;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * size / 14, uv.getY(i) * size / 14);
  g.computeVertexNormals();
  const terrain = new THREE.Mesh(g, MAT.terrainFar);
  terrain.receiveShadow = true;
  group.add(terrain);
  // cypresses
  const cyp = cypressGeometry();
  const nC = q >= 2 ? 420 : 220;
  const cm = new THREE.InstancedMesh(cyp, MAT.cypress, nC);
  const m4 = new THREE.Matrix4();
  let n = 0;
  const placeAlong = (x0, z0, x1, z1, count) => {
    for (let i = 0; i < count && n < nC; i++) {
      const t = i / Math.max(1, count - 1);
      const x = lerp(x0, x1, t) + (rng() - 0.5) * 2, z = lerp(z0, z1, t) + (rng() - 0.5) * 2;
      const h = 9 + rng() * 7;
      m4.compose(new THREE.Vector3(x, heightAt(x, z) - 0.3, z), new THREE.Quaternion().setFromAxisAngle(UP, rng() * TAU), new THREE.Vector3(h * 0.24, h, h * 0.24));
      cm.setMatrixAt(n++, m4);
    }
  };
  // avenue of cypresses on a hill road, plus scattered ones
  placeAlong(-90, -150, -260, -420, 26);
  placeAlong(110, 120, 300, 380, 22);
  placeAlong(-140, 160, -380, 260, 20);
  placeAlong(160, -120, 420, -230, 22);
  while (n < nC) {
    const a = rng() * TAU, r = 80 + Math.pow(rng(), 0.7) * 650;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 70 && Math.abs(z) < 80) continue;
    const h = 8 + rng() * 8;
    m4.compose(new THREE.Vector3(x, heightAt(x, z) - 0.3, z), new THREE.Quaternion().setFromAxisAngle(UP, rng() * TAU), new THREE.Vector3(h * 0.24, h, h * 0.24));
    cm.setMatrixAt(n++, m4);
  }
  cm.castShadow = false; cm.receiveShadow = true;
  group.add(cm);
  // olive groves: low round trees in rows
  const ol = new THREE.IcosahedronGeometry(1, 1);
  const op = ol.attributes.position;
  for (let i = 0; i < op.count; i++) { const f = 0.8 + rng() * 0.35; op.setXYZ(i, op.getX(i) * f, op.getY(i) * f * 0.75, op.getZ(i) * f); }
  ol.computeVertexNormals();
  const oliveMat = new THREE.MeshStandardMaterial({ color: 0x55603c, roughness: 0.95, metalness: 0 });
  const nO = q >= 2 ? 1400 : 700;
  const om = new THREE.InstancedMesh(ol, oliveMat, nO);
  let k2 = 0;
  const groves = [[-220, 140, 0.3], [260, -60, -0.2], [-160, -260, 0.6], [320, 260, 0.1], [-420, -40, -0.4], [80, -330, 0.25]];
  for (const [gx, gz, ga] of groves) {
    for (let i = 0; i < 14 && k2 < nO; i++) for (let j = 0; j < 16 && k2 < nO; j++) {
      const lx = (i - 7) * 9 + (rng() - 0.5) * 2, lz = (j - 8) * 9 + (rng() - 0.5) * 2;
      const x = gx + lx * Math.cos(ga) - lz * Math.sin(ga), z = gz + lx * Math.sin(ga) + lz * Math.cos(ga);
      const s = 2.0 + rng() * 1.2;
      m4.compose(new THREE.Vector3(x, heightAt(x, z) + s * 0.6, z), new THREE.Quaternion().setFromAxisAngle(UP, rng() * TAU), new THREE.Vector3(s, s, s));
      om.setMatrixAt(k2++, m4);
    }
  }
  om.count = k2; om.receiveShadow = true;
  group.add(om);
  // distant hill town
  const townX = -560, townZ = -520;
  const houseG = new THREE.BoxGeometry(1, 1, 1); houseG.translate(0, 0.5, 0);
  const roofG = new THREE.ConeGeometry(0.75, 0.4, 4); roofG.rotateY(Math.PI / 4); roofG.translate(0, 0.2, 0);
  const tm = new THREE.InstancedMesh(houseG, new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }), 90);
  const rm = new THREE.InstancedMesh(roofG, new THREE.MeshStandardMaterial({ color: 0x9a5a3e, roughness: 0.9 }), 90);
  const pal = Object.values(PLASTER_COLORS);
  for (let i = 0; i < 90; i++) {
    const a = rng() * TAU, r = Math.sqrt(rng()) * 70;
    const x = townX + Math.cos(a) * r, z = townZ + Math.sin(a) * r * 0.7;
    const w = 8 + rng() * 8, d = 7 + rng() * 6, h = 7 + rng() * 9 + (70 - r) * 0.15;
    const base = heightAt(x, z) - 1;
    const rot = new THREE.Quaternion().setFromAxisAngle(UP, (rng() - 0.5) * 0.4);
    m4.compose(new THREE.Vector3(x, base, z), rot, new THREE.Vector3(w, h, d));
    tm.setMatrixAt(i, m4);
    tm.setColorAt(i, new THREE.Color(pal[i % pal.length]).multiplyScalar(0.85));
    m4.compose(new THREE.Vector3(x, base + h, z), rot, new THREE.Vector3(w * 1.1, 4 + rng() * 2, d * 1.1));
    rm.setMatrixAt(i, m4);
  }
  group.add(tm, rm);
  const towerH = 48, tb = heightAt(townX, townZ);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(7, towerH, 7), new THREE.MeshStandardMaterial({ color: 0xb59474, roughness: 0.9 }));
  tower.position.set(townX + 5, tb + towerH / 2, townZ - 4);
  group.add(tower);
  // a few modelled cypresses (GLB, no shadows) along the lanes just outside the village; the rest stay instanced
  const props = { glb: [] };
  for (const [x0, z0, x1, z1, k] of [[-70, -84, -86, -100, 3], [74, 80, 90, 96, 3]]) {
    for (let i = 0; i < k; i++) {
      const t = i / (k - 1), x = lerp(x0, x1, t), z = lerp(z0, z1, t);
      MapProps.add(props, 'cypress', x, heightAt(x, z) - 0.3, z, i * 2.1, { s: 1.15 + 0.2 * Math.sin(i * 1.7) });
    }
  }
  scene.add(group);
  return { group, heightAt, props: props.glb };
}
