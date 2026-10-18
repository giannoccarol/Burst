// ===================================================================
// Effects: particles, tracers, decals, flashes, explosions
// ===================================================================
const SURF_COLORS = {
  stone: [0.62, 0.58, 0.52], plaster: [0.8, 0.72, 0.62], wood: [0.45, 0.32, 0.2], metal: [0.6, 0.6, 0.6],
  dirt: [0.42, 0.34, 0.25], water: [0.85, 0.9, 0.95], cloth: [0.8, 0.78, 0.72], glass: [0.8, 0.85, 0.9], flesh: [0.5, 0.05, 0.04],
};
const SURF_IDS = ['none', 'stone', 'wood', 'metal', 'dirt', 'water', 'flesh', 'cloth', 'glass'];

class Particles {
  constructor(scene, max, additive, atlas) {
    this.max = max; this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max); this.rot = new Float32Array(max); this.tex = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('psize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('prot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('ptex', new THREE.BufferAttribute(this.tex, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.geo = g;
    this.v = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.a0 = new Float32Array(max); this.a1 = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.spin = new Float32Array(max); this.rgb = new Float32Array(max * 3);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: atlas }, uScale: { value: 400 } },
      vertexShader: /* glsl */`
        attribute vec4 pcolor; attribute float psize; attribute float prot; attribute float ptex;
        uniform float uScale; varying vec4 vColor; varying float vRot; varying float vTex;
        void main(){ vColor = pcolor; vRot = prot; vTex = ptex;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(psize * uScale / max(0.05, -mv.z), 0.0, 512.0); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D map; varying vec4 vColor; varying float vRot; varying float vTex;
        void main(){ vec2 c = gl_PointCoord - 0.5; float s = sin(vRot), co = cos(vRot);
          c = mat2(co, -s, s, co) * c + 0.5;
          if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) discard;
          vec4 t = texture2D(map, vec2((vTex + c.x) / 4.0, 1.0 - c.y));
          gl_FragColor = vec4(vColor.rgb * t.rgb, vColor.a * t.a); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
    scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, o) {
    let i = this.n;
    const cap = this.cap || this.max;
    if (i >= cap) { i = Math.floor(Math.random() * Math.min(cap, this.n)); } else this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.life[i] = 0; this.maxLife[i] = o.life || 1;
    this.s0[i] = o.s0 != null ? o.s0 : 0.2; this.s1[i] = o.s1 != null ? o.s1 : this.s0[i];
    this.a0[i] = o.a0 != null ? o.a0 : 1; this.a1[i] = o.a1 != null ? o.a1 : 0;
    this.grav[i] = o.g || 0; this.drag[i] = o.drag || 0; this.spin[i] = o.spin || 0;
    this.rot[i] = o.rot != null ? o.rot : Math.random() * TAU; this.tex[i] = o.tex || 0;
    const c = o.c || [1, 1, 1];
    this.rgb[i * 3] = c[0]; this.rgb[i * 3 + 1] = c[1]; this.rgb[i * 3 + 2] = c[2];
  }
  update(dt) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] += dt;
      if (this.life[i] >= this.maxLife[i]) {
        n--;
        if (i !== n) this.copy(n, i);
        i--; continue;
      }
      const k = this.life[i] / this.maxLife[i];
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.v[i * 3] *= dr; this.v[i * 3 + 1] = this.v[i * 3 + 1] * dr - this.grav[i] * dt; this.v[i * 3 + 2] *= dr;
      this.pos[i * 3] += this.v[i * 3] * dt; this.pos[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      this.size[i] = lerp(this.s0[i], this.s1[i], k);
      this.rot[i] += this.spin[i] * dt;
      const a = lerp(this.a0[i], this.a1[i], k);
      this.col[i * 4] = this.rgb[i * 3]; this.col[i * 4 + 1] = this.rgb[i * 3 + 1]; this.col[i * 4 + 2] = this.rgb[i * 3 + 2]; this.col[i * 4 + 3] = a;
    }
    this.n = n;
    const g = this.geo;
    g.setDrawRange(0, n);
    for (const k of ['position', 'pcolor', 'psize', 'prot', 'ptex']) g.attributes[k].needsUpdate = true;
  }
  copy(from, to) {
    for (let j = 0; j < 3; j++) { this.pos[to * 3 + j] = this.pos[from * 3 + j]; this.v[to * 3 + j] = this.v[from * 3 + j]; this.rgb[to * 3 + j] = this.rgb[from * 3 + j]; }
    for (let j = 0; j < 4; j++) this.col[to * 4 + j] = this.col[from * 4 + j];
    this.life[to] = this.life[from]; this.maxLife[to] = this.maxLife[from]; this.s0[to] = this.s0[from]; this.s1[to] = this.s1[from];
    this.a0[to] = this.a0[from]; this.a1[to] = this.a1[from]; this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from];
    this.spin[to] = this.spin[from]; this.rot[to] = this.rot[from]; this.tex[to] = this.tex[from]; this.size[to] = this.size[from];
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
}

const FX = {
  scene: null, add: null, alpha: null, tracers: [], decals: null, scorch: null, lights: [], rockets: [],
  atlas: null, singles: {},
  makeAtlas() {
    if (this.atlas) return this.atlas;
    const S = 128;
    const c = document.createElement('canvas'); c.width = S * 4; c.height = S;
    const g = c.getContext('2d');
    // 0: soft round
    let grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    // 1: spark (hard core)
    grd = g.createRadialGradient(S * 1.5, S / 2, 0, S * 1.5, S / 2, S / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.15, 'rgba(255,255,255,0.9)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.15)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(S, 0, S, S);
    // 2: smoke puff (noisy blobs)
    const rng = mulberry32(7);
    for (let i = 0; i < 26; i++) {
      const x = S * 2.5 + (rng() - 0.5) * S * 0.45, y = S / 2 + (rng() - 0.5) * S * 0.45, r = S * (0.14 + rng() * 0.18);
      grd = g.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.18 + rng() * 0.2;
      grd.addColorStop(0, `rgba(255,255,255,${a})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    // 3: flash star
    g.save(); g.translate(S * 3.5, S / 2);
    grd = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,240,200,0.8)'); grd.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, S / 2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,245,220,0.9)';
    for (let i = 0; i < 6; i++) { g.rotate(TAU / 6); g.beginPath(); g.moveTo(0, -4); g.lineTo(S * 0.48, 0); g.lineTo(0, 4); g.fill(); }
    g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    this.atlas = t;
    return t;
  },
  atlasSingle(kind) {
    if (this.singles[kind]) return this.singles[kind];
    const S = 128, c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d');
    if (kind === 'flash') {
      g.translate(S / 2, S / 2);
      let grd = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
      grd.addColorStop(0, 'rgba(255,255,240,1)'); grd.addColorStop(0.2, 'rgba(255,220,150,0.9)'); grd.addColorStop(0.6, 'rgba(255,150,60,0.25)'); grd.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, S / 2, 0, TAU); g.fill();
      for (let i = 0; i < 7; i++) {
        g.rotate(TAU / 7 + Math.random() * 0.3);
        grd = g.createLinearGradient(0, 0, S / 2, 0); grd.addColorStop(0, 'rgba(255,240,200,0.95)'); grd.addColorStop(1, 'rgba(255,160,60,0)');
        g.fillStyle = grd; g.beginPath(); g.moveTo(0, -5); g.lineTo(S * (0.35 + Math.random() * 0.15), 0); g.lineTo(0, 5); g.fill();
      }
    } else if (kind === 'hole') {
      g.translate(S / 2, S / 2);
      let grd = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
      grd.addColorStop(0, 'rgba(10,8,6,1)'); grd.addColorStop(0.18, 'rgba(20,16,12,0.95)'); grd.addColorStop(0.3, 'rgba(60,50,40,0.6)'); grd.addColorStop(0.55, 'rgba(90,80,70,0.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, S / 2, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(25,20,15,0.6)'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); g.lineTo(Math.cos(a) * (20 + Math.random() * 25), Math.sin(a) * (20 + Math.random() * 25)); g.stroke(); }
    } else if (kind === 'scorch') {
      g.translate(S / 2, S / 2);
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * TAU, r = Math.random() * S * 0.3, rr = 10 + Math.random() * 30;
        const grd = g.createRadialGradient(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * r, Math.sin(a) * r, rr);
        grd.addColorStop(0, 'rgba(10,8,6,0.35)'); grd.addColorStop(1, 'rgba(10,8,6,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, rr, 0, TAU); g.fill();
      }
    } else if (kind === 'tracer') {
      const grd = g.createLinearGradient(0, 0, 0, S);
      grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.5, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, S, S);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    this.singles[kind] = t;
    return t;
  },
  init(scene) {
    this.scene = scene;
    const atlas = this.makeAtlas();
    this.add = new Particles(scene, 1500, true, atlas);
    this.alpha = new Particles(scene, 1500, false, atlas);
    // tracers: a dynamic set of camera-facing quads
    const NT = 48;
    this.trMax = NT;
    const tg = new THREE.BufferGeometry();
    this.trPos = new Float32Array(NT * 4 * 3); this.trCol = new Float32Array(NT * 4 * 3); this.trUV = new Float32Array(NT * 4 * 2);
    const idx = [];
    for (let i = 0; i < NT; i++) { const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); this.trUV.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8); }
    tg.setIndex(idx);
    tg.setAttribute('position', new THREE.BufferAttribute(this.trPos, 3).setUsage(THREE.DynamicDrawUsage));
    tg.setAttribute('color', new THREE.BufferAttribute(this.trCol, 3).setUsage(THREE.DynamicDrawUsage));
    tg.setAttribute('uv', new THREE.BufferAttribute(this.trUV, 2));
    this.trMesh = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ map: this.atlasSingle('tracer'), vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    this.trMesh.frustumCulled = false; this.trMesh.renderOrder = 4;
    scene.add(this.trMesh);
    this.tracers = [];
    // decals
    const dg = new THREE.PlaneGeometry(1, 1);
    const holeMat = new THREE.MeshStandardMaterial({ map: this.atlasSingle('hole'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 1, metalness: 0 });
    this.decals = new THREE.InstancedMesh(dg, holeMat, 160); this.decals.count = 0; this.decals.frustumCulled = false; this.decals.renderOrder = 1;
    this.decalIdx = 0; scene.add(this.decals);
    const scMat = new THREE.MeshStandardMaterial({ map: this.atlasSingle('scorch'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, roughness: 1, metalness: 0 });
    this.scorch = new THREE.InstancedMesh(dg, scMat, 24); this.scorch.count = 0; this.scorch.frustumCulled = false; this.scorchIdx = 0; scene.add(this.scorch);
    // pooled flash lights
    for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xffb060, 0, 10, 2); l.userData.t = 0; l.userData.dur = 0.05; l.userData.i0 = 0; scene.add(l); this.lights.push(l); }
    // rockets (visual)
    this.rocketGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 10); this.rocketGeo.rotateX(Math.PI / 2);
    if (typeof R !== 'undefined' && R.cfg) this.setDensity([0.35, 0.65, 1][R.cfg.fx]);
  },
  // particles/decals budget from the graphics settings (0.35 low .. 1 high)
  setDensity(f) {
    this.density = f;
    if (!this.add) return;
    for (const p of [this.add, this.alpha]) p.cap = Math.max(64, Math.round(p.max * f));
    this.decalCap = Math.max(24, Math.round(this.decals.instanceMatrix.count * f));
  },
  setScale(cam, h) { const s = h / (2 * Math.tan(cam.fov * DEG / 2)); this.add.mat.uniforms.uScale.value = s; this.alpha.mat.uniforms.uScale.value = s; },
  flashLight(x, y, z, color, intensity, dur, dist = 10) {
    let l = this.lights.find((q) => q.userData.t <= 0) || this.lights.reduce((a, b) => (a.userData.t < b.userData.t ? a : b));
    l.position.set(x, y, z); l.color.set(color); l.distance = dist; l.userData.t = dur; l.userData.dur = dur; l.userData.i0 = intensity; l.intensity = intensity;
  },
  tracer(ax, ay, az, bx, by, bz, color = [1, 0.85, 0.55], speed = 380, width = 0.025) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
    if (L < 1.5) return;
    if (this.tracers.length >= this.trMax) this.tracers.shift();
    this.tracers.push({ a: [ax, ay, az], d: [dx / L, dy / L, dz / L], L, t: 0, speed, len: Math.min(6, L * 0.25 + 1.5), width, color });
  },
  decal(x, y, z, nx, ny, nz, s = 0.1, scorch = false) {
    const im = scorch ? this.scorch : this.decals;
    const idx = scorch ? this.scorchIdx++ % im.instanceMatrix.count : this.decalIdx++ % (this.decalCap || im.instanceMatrix.count);
    const n = _v1.set(nx, ny, nz);
    const q = _q1.setFromUnitVectors(_v2.set(0, 0, 1), n);
    const roll = new THREE.Quaternion().setFromAxisAngle(n, Math.random() * TAU);
    q.premultiply(roll);
    _m1.compose(_v3.set(x + nx * 0.006, y + ny * 0.006, z + nz * 0.006), q, new THREE.Vector3(s, s, s));
    im.setMatrixAt(idx, _m1);
    im.count = Math.min(im.instanceMatrix.count, Math.max(im.count, idx + 1));
    im.instanceMatrix.needsUpdate = true;
  },
  impact(x, y, z, nx, ny, nz, surf, big = 1) {
    const c = SURF_COLORS[surf] || SURF_COLORS.stone;
    if (surf === 'flesh') {
      for (let i = 0; i < 7; i++) this.alpha.spawn(x, y, z, nx * rnd(0.3, 1.5) + rnd(-1, 1), ny * rnd(0.3, 1.5) + rnd(-0.3, 1.2), nz * rnd(0.3, 1.5) + rnd(-1, 1), { life: rnd(0.25, 0.5), s0: 0.06, s1: rnd(0.2, 0.35), a0: 0.85, a1: 0, g: 3, drag: 2, tex: 2, c: [0.45, 0.04, 0.03] });
      return;
    }
    if (surf === 'water') {
      for (let i = 0; i < 12; i++) this.alpha.spawn(x, y, z, rnd(-0.8, 0.8), rnd(2, 4.5), rnd(-0.8, 0.8), { life: rnd(0.4, 0.8), s0: 0.05, s1: 0.12, a0: 0.8, a1: 0, g: 12, tex: 0, c: [0.85, 0.92, 1] });
      return;
    }
    const n = Math.round(5 * big);
    for (let i = 0; i < n; i++) {
      this.alpha.spawn(x + nx * 0.03, y + ny * 0.03, z + nz * 0.03, nx * rnd(0.4, 1.6) + rnd(-0.5, 0.5), ny * rnd(0.4, 1.6) + rnd(0, 0.8), nz * rnd(0.4, 1.6) + rnd(-0.5, 0.5),
        { life: rnd(0.5, 1.1), s0: 0.08, s1: rnd(0.35, 0.7) * big, a0: 0.55, a1: 0, g: -0.2, drag: 3, tex: 2, spin: rnd(-1, 1), c });
    }
    for (let i = 0; i < 4; i++) {
      this.alpha.spawn(x, y, z, nx * rnd(1, 3) + rnd(-1.5, 1.5), ny * rnd(1, 3) + rnd(0.5, 2.5), nz * rnd(1, 3) + rnd(-1.5, 1.5), { life: rnd(0.4, 0.8), s0: 0.03, s1: 0.03, a0: 1, a1: 1, g: 12, tex: 1, c: c.map((v) => v * 0.5) });
    }
    if (surf === 'metal' || Math.random() < 0.15) {
      const k = surf === 'metal' ? 9 : 3;
      for (let i = 0; i < k; i++) this.add.spawn(x, y, z, nx * rnd(1, 4) + rnd(-2, 2), ny * rnd(1, 4) + rnd(0, 3), nz * rnd(1, 4) + rnd(-2, 2), { life: rnd(0.15, 0.35), s0: 0.035, s1: 0.01, a0: 1, a1: 0.3, g: 9, tex: 1, c: [1, 0.75, 0.35] });
    }
  },
  muzzle(x, y, z, dx, dy, dz, size = 1) {
    this.add.spawn(x, y, z, 0, 0, 0, { life: 0.05, s0: 0.5 * size, s1: 0.65 * size, a0: 1, a1: 0, tex: 3, c: [1, 0.78, 0.45] });
    for (let i = 0; i < 2; i++) this.alpha.spawn(x + dx * 0.1, y + dy * 0.1, z + dz * 0.1, dx * rnd(0.5, 1.5) + rnd(-0.2, 0.2), dy * rnd(0.5, 1.5) + rnd(0, 0.3), dz * rnd(0.5, 1.5) + rnd(-0.2, 0.2), { life: rnd(0.4, 0.8), s0: 0.1, s1: 0.5, a0: 0.25, a1: 0, drag: 2, tex: 2, c: [0.8, 0.78, 0.75] });
  },
  explosion(x, y, z, r = 5) {
    for (let i = 0; i < 26; i++) {
      const v = new THREE.Vector3(rnd(-1, 1), rnd(-0.3, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(2, 9));
      this.add.spawn(x, y, z, v.x, v.y, v.z, { life: rnd(0.25, 0.55), s0: rnd(0.8, 1.4), s1: rnd(2.2, 3.6), a0: 1, a1: 0, drag: 5, tex: 2, spin: rnd(-2, 2), c: [1, rnd(0.45, 0.65), rnd(0.15, 0.3)] });
    }
    this.add.spawn(x, y, z, 0, 0, 0, { life: 0.12, s0: 4, s1: 7, a0: 1, a1: 0, tex: 3, c: [1, 0.85, 0.6] });
    for (let i = 0; i < 18; i++) {
      const v = new THREE.Vector3(rnd(-1, 1), rnd(0, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(0.5, 3));
      this.alpha.spawn(x, y, z, v.x, v.y + 0.8, v.z, { life: rnd(1.5, 3.2), s0: rnd(1, 1.8), s1: rnd(3.5, 6), a0: 0.55, a1: 0, drag: 1.5, g: -0.4, tex: 2, spin: rnd(-0.5, 0.5), c: [0.22, 0.2, 0.19] });
    }
    for (let i = 0; i < 24; i++) {
      const v = new THREE.Vector3(rnd(-1, 1), rnd(0.2, 1.2), rnd(-1, 1)).normalize().multiplyScalar(rnd(5, 16));
      this.add.spawn(x, y, z, v.x, v.y, v.z, { life: rnd(0.3, 0.9), s0: 0.06, s1: 0.02, a0: 1, a1: 0.2, g: 14, drag: 0.5, tex: 1, c: [1, 0.7, 0.3] });
    }
    for (let i = 0; i < 12; i++) {
      const v = new THREE.Vector3(rnd(-1, 1), rnd(0.3, 1.2), rnd(-1, 1)).normalize().multiplyScalar(rnd(4, 10));
      this.alpha.spawn(x, y, z, v.x, v.y, v.z, { life: rnd(0.8, 1.4), s0: 0.08, s1: 0.06, a0: 1, a1: 1, g: 16, tex: 1, c: [0.15, 0.13, 0.12] });
    }
    this.flashLight(x, y + 0.5, z, 0xffa040, 60, 0.35, r * 4);
  },
  // simple visual rocket with smoke trail
  spawnRocket(x, y, z, dx, dy, dz, speed) {
    const m = new THREE.Mesh(this.rocketGeo, GUNMAT.warhead);
    m.position.set(x, y, z);
    m.lookAt(x + dx, y + dy, z + dz);
    this.scene.add(m);
    const r = { m, d: new THREE.Vector3(dx, dy, dz), speed, life: 6 };
    this.rockets.push(r);
    return r;
  },
  removeRocket(r) { const i = this.rockets.indexOf(r); if (i >= 0) this.rockets.splice(i, 1); this.scene.remove(r.m); },
  update(dt, camera) {
    this.add.update(dt); this.alpha.update(dt);
    for (const l of this.lights) {
      if (l.userData.t > 0) { l.userData.t -= dt; l.intensity = Math.max(0, l.userData.i0 * (l.userData.t / l.userData.dur)); if (l.userData.t <= 0) l.intensity = 0; }
    }
    for (const r of this.rockets) {
      r.life -= dt;
      const p = r.m.position;
      this.alpha.spawn(p.x - r.d.x * 0.3, p.y - r.d.y * 0.3, p.z - r.d.z * 0.3, rnd(-0.2, 0.2), rnd(0, 0.3), rnd(-0.2, 0.2), { life: rnd(0.8, 1.4), s0: 0.15, s1: 0.8, a0: 0.4, a1: 0, drag: 1, tex: 2, c: [0.75, 0.73, 0.7] });
      this.add.spawn(p.x - r.d.x * 0.3, p.y - r.d.y * 0.3, p.z - r.d.z * 0.3, 0, 0, 0, { life: 0.06, s0: 0.35, s1: 0.2, a0: 1, a1: 0, tex: 3, c: [1, 0.7, 0.35] });
    }
    // tracers
    const cp = camera.getWorldPosition(_v1);
    const P = this.trPos, C = this.trCol;
    let k = 0;
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.t += dt;
      const head = Math.min(t.L, t.t * t.speed), tail = Math.max(0, head - t.len);
      if (tail >= t.L - 0.01) { this.tracers.splice(i, 1); continue; }
      const hx = t.a[0] + t.d[0] * head, hy = t.a[1] + t.d[1] * head, hz = t.a[2] + t.d[2] * head;
      const tx = t.a[0] + t.d[0] * tail, ty = t.a[1] + t.d[1] * tail, tz = t.a[2] + t.d[2] * tail;
      const mx = (hx + tx) / 2 - cp.x, my = (hy + ty) / 2 - cp.y, mz = (hz + tz) / 2 - cp.z;
      let sx = t.d[1] * mz - t.d[2] * my, sy = t.d[2] * mx - t.d[0] * mz, sz = t.d[0] * my - t.d[1] * mx;
      const sl = Math.hypot(sx, sy, sz) || 1; const w = t.width * (1 + Math.hypot(mx, my, mz) * 0.012);
      sx = sx / sl * w; sy = sy / sl * w; sz = sz / sl * w;
      const b = k * 12;
      P[b] = tx - sx; P[b + 1] = ty - sy; P[b + 2] = tz - sz; P[b + 3] = hx - sx; P[b + 4] = hy - sy; P[b + 5] = hz - sz;
      P[b + 6] = hx + sx; P[b + 7] = hy + sy; P[b + 8] = hz + sz; P[b + 9] = tx + sx; P[b + 10] = ty + sy; P[b + 11] = tz + sz;
      const c = t.color;
      for (let j = 0; j < 4; j++) { const f = (j === 1 || j === 2) ? 1 : 0.0; C[b + j * 3] = c[0] * f; C[b + j * 3 + 1] = c[1] * f; C[b + j * 3 + 2] = c[2] * f; }
      k++;
      if (k >= this.trMax) break;
    }
    const tg = this.trMesh.geometry;
    tg.setDrawRange(0, k * 6);
    tg.attributes.position.needsUpdate = true; tg.attributes.color.needsUpdate = true;
  },
  clear() {
    this.add.clear(); this.alpha.clear(); this.tracers.length = 0;
    this.decals.count = 0; this.scorch.count = 0;
    for (const r of this.rockets.slice()) this.removeRocket(r);
  },
};
