// ===================================================================
// Collision world: axis-aligned boxes + ray-only triangles
// ===================================================================
const F_NORAY = 1;      // blocks movement, ignored by bullets (stair steps, clip walls)
const F_NOCOLLIDE = 2;  // bullets only (decor)
const F_WATER = 4;      // trigger volume (not solid)

class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.tris = [];
    this.cell = 4;
    this.grid = new Map();
    this.stamp = 1;
    this.waters = [];
  }
  add(x0, y0, z0, x1, y1, z1, surf = 'stone', flags = 0) {
    const b = {
      x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1),
      x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1),
      surf, flags, s: 0, id: this.boxes.length,
    };
    if (flags & F_WATER) { this.waters.push(b); return b; }
    this.boxes.push(b);
    return b;
  }
  addTri(a, b, c, surf = 'stone') {
    const e1 = new THREE.Vector3().subVectors(b, a), e2 = new THREE.Vector3().subVectors(c, a);
    const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
    this.tris.push({ a: a.clone(), e1, e2, n, surf });
  }
  build() {
    this.grid.clear();
    const c = this.cell;
    for (const b of this.boxes) {
      if (b.flags & F_NOCOLLIDE) continue;
      const ix0 = Math.floor(b.x0 / c), ix1 = Math.floor(b.x1 / c);
      const iz0 = Math.floor(b.z0 / c), iz1 = Math.floor(b.z1 / c);
      for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
        const k = (ix + 512) * 1024 + (iz + 512);
        let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); }
        a.push(b);
      }
    }
    this.rayBoxes = this.boxes.filter((b) => !(b.flags & F_NORAY));
  }
  // collidable boxes overlapping region
  query(x0, y0, z0, x1, y1, z1, out) {
    out.length = 0;
    const c = this.cell, st = ++this.stamp;
    const ix0 = Math.floor(x0 / c), ix1 = Math.floor(x1 / c);
    const iz0 = Math.floor(z0 / c), iz1 = Math.floor(z1 / c);
    for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
      const a = this.grid.get((ix + 512) * 1024 + (iz + 512));
      if (!a) continue;
      for (let i = 0; i < a.length; i++) {
        const b = a[i];
        if (b.s === st) continue;
        b.s = st;
        if (b.x1 <= x0 || b.x0 >= x1 || b.y1 <= y0 || b.y0 >= y1 || b.z1 <= z0 || b.z0 >= z1) continue;
        out.push(b);
      }
    }
    return out;
  }
  overlaps(x0, y0, z0, x1, y1, z1) {
    const tmp = this._tmp || (this._tmp = []);
    this.query(x0, y0, z0, x1, y1, z1, tmp);
    return tmp.length > 0;
  }
  inWater(x, y, z) {
    for (const w of this.waters) if (x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && y > w.y0 - 0.05 && y < w.y1) return w;
    return null;
  }
  // Ray cast against the static world. Returns {t, x,y,z, nx,ny,nz, surf} or null.
  raycast(ox, oy, oz, dx, dy, dz, maxT, out) {
    let best = maxT, hit = null, bnx = 0, bny = 0, bnz = 0;
    const idx = 1 / (dx || 1e-12), idy = 1 / (dy || 1e-12), idz = 1 / (dz || 1e-12);
    const bx = this.rayBoxes;
    for (let i = 0; i < bx.length; i++) {
      const b = bx[i];
      let t1 = (b.x0 - ox) * idx, t2 = (b.x1 - ox) * idx;
      let tmin, tmax, ax = 0;
      if (t1 < t2) { tmin = t1; tmax = t2; } else { tmin = t2; tmax = t1; }
      t1 = (b.y0 - oy) * idy; t2 = (b.y1 - oy) * idy;
      let a = t1 < t2 ? t1 : t2, c = t1 < t2 ? t2 : t1;
      if (a > tmin) { tmin = a; ax = 1; }
      if (c < tmax) tmax = c;
      if (tmin > tmax) continue;
      t1 = (b.z0 - oz) * idz; t2 = (b.z1 - oz) * idz;
      a = t1 < t2 ? t1 : t2; c = t1 < t2 ? t2 : t1;
      if (a > tmin) { tmin = a; ax = 2; }
      if (c < tmax) tmax = c;
      if (tmin > tmax || tmin < 0 || tmin >= best) continue;
      best = tmin; hit = b;
      bnx = ax === 0 ? -Math.sign(dx) : 0; bny = ax === 1 ? -Math.sign(dy) : 0; bnz = ax === 2 ? -Math.sign(dz) : 0;
    }
    let surf = hit ? hit.surf : null;
    // triangles
    for (let i = 0; i < this.tris.length; i++) {
      const tr = this.tris[i];
      const px = dy * tr.e2.z - dz * tr.e2.y, py = dz * tr.e2.x - dx * tr.e2.z, pz = dx * tr.e2.y - dy * tr.e2.x;
      const det = tr.e1.x * px + tr.e1.y * py + tr.e1.z * pz;
      if (Math.abs(det) < 1e-9) continue;
      const inv = 1 / det;
      const sx = ox - tr.a.x, sy = oy - tr.a.y, sz = oz - tr.a.z;
      const u = (sx * px + sy * py + sz * pz) * inv;
      if (u < 0 || u > 1) continue;
      const qx = sy * tr.e1.z - sz * tr.e1.y, qy = sz * tr.e1.x - sx * tr.e1.z, qz = sx * tr.e1.y - sy * tr.e1.x;
      const v = (dx * qx + dy * qy + dz * qz) * inv;
      if (v < 0 || u + v > 1) continue;
      const t = (tr.e2.x * qx + tr.e2.y * qy + tr.e2.z * qz) * inv;
      if (t > 1e-4 && t < best) {
        best = t; hit = tr; surf = tr.surf;
        const s = (tr.n.x * dx + tr.n.y * dy + tr.n.z * dz) > 0 ? -1 : 1;
        bnx = tr.n.x * s; bny = tr.n.y * s; bnz = tr.n.z * s;
      }
    }
    if (!hit) return null;
    out = out || {};
    out.t = best; out.x = ox + dx * best; out.y = oy + dy * best; out.z = oz + dz * best;
    out.nx = bnx; out.ny = bny; out.nz = bnz; out.surf = surf;
    return out;
  }
  // Is the segment a->b free of world geometry?
  clear(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const L = Math.hypot(dx, dy, dz);
    if (L < 1e-4) return true;
    return !this.raycast(ax, ay, az, dx / L, dy / L, dz / L, L - 0.05);
  }
  // Highest walkable surface under (x,z) below y (for spawn / drops)
  floorBelow(x, z, y, hw = 0.3) {
    let best = -Infinity;
    const tmp = [];
    this.query(x - hw, -50, z - hw, x + hw, y, z + hw, tmp);
    for (const b of tmp) if (b.y1 <= y + 0.01 && b.y1 > best) best = b.y1;
    return best;
  }
}
