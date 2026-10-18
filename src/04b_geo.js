// ===================================================================
// GeoBuilder: accumulates static geometry per material, merged at the end
// ===================================================================
const FACES = {
  px: { n: [1, 0, 0], v: (b) => [[b[3], b[1], b[5]], [b[3], b[1], b[2]], [b[3], b[4], b[2]], [b[3], b[4], b[5]]], uv: (p) => [-p[2], p[1]] },
  nx: { n: [-1, 0, 0], v: (b) => [[b[0], b[1], b[2]], [b[0], b[1], b[5]], [b[0], b[4], b[5]], [b[0], b[4], b[2]]], uv: (p) => [p[2], p[1]] },
  pz: { n: [0, 0, 1], v: (b) => [[b[0], b[1], b[5]], [b[3], b[1], b[5]], [b[3], b[4], b[5]], [b[0], b[4], b[5]]], uv: (p) => [p[0], p[1]] },
  nz: { n: [0, 0, -1], v: (b) => [[b[3], b[1], b[2]], [b[0], b[1], b[2]], [b[0], b[4], b[2]], [b[3], b[4], b[2]]], uv: (p) => [-p[0], p[1]] },
  py: { n: [0, 1, 0], v: (b) => [[b[0], b[4], b[5]], [b[3], b[4], b[5]], [b[3], b[4], b[2]], [b[0], b[4], b[2]]], uv: (p) => [p[0], -p[2]] },
  ny: { n: [0, -1, 0], v: (b) => [[b[0], b[1], b[2]], [b[3], b[1], b[2]], [b[3], b[1], b[5]], [b[0], b[1], b[5]]], uv: (p) => [p[0], p[2]] },
};
const FACE_KEYS = ['px', 'nx', 'pz', 'nz', 'py', 'ny'];

class GeoBuilder {
  constructor() { this.parts = new Map(); }
  _p(mat) {
    let p = this.parts.get(mat);
    if (!p) { p = { pos: [], nrm: [], uv: [] }; this.parts.set(mat, p); }
    return p;
  }
  // 4 points CCW seen from the front; uvs optional
  quad(mat, a, b, c, d, uvs) {
    const p = this._p(mat);
    const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
    const e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    const s = mat.userData.uvScale || 2;
    if (!uvs) {
      // planar projection along dominant axis
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      const f = ax >= ay && ax >= az ? (nx > 0 ? FACES.px : FACES.nx) : ay >= az ? (ny > 0 ? FACES.py : FACES.ny) : (nz > 0 ? FACES.pz : FACES.nz);
      uvs = [a, b, c, d].map((q) => f.uv(q).map((x) => x / s));
    }
    const P = [a, b, c, a, c, d], U = [uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]];
    for (let i = 0; i < 6; i++) { p.pos.push(P[i][0], P[i][1], P[i][2]); p.nrm.push(nx, ny, nz); p.uv.push(U[i][0], U[i][1]); }
  }
  tri(mat, a, b, c, uvs) {
    const p = this._p(mat);
    const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
    const e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    const s = mat.userData.uvScale || 2;
    if (!uvs) {
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      const f = ax >= ay && ax >= az ? (nx > 0 ? FACES.px : FACES.nx) : ay >= az ? (ny > 0 ? FACES.py : FACES.ny) : (nz > 0 ? FACES.pz : FACES.nz);
      uvs = [a, b, c].map((q) => f.uv(q).map((x) => x / s));
    }
    const P = [a, b, c];
    for (let i = 0; i < 3; i++) { p.pos.push(P[i][0], P[i][1], P[i][2]); p.nrm.push(nx, ny, nz); p.uv.push(uvs[i][0], uvs[i][1]); }
  }
  // axis-aligned box; o.skip = 'py,ny' ; o.local = per-face 0..1 uvs ; o.uo = [du,dv] offset ; o.rot = swap uv
  box(mat, x0, y0, z0, x1, y1, z1, o = {}) {
    const b = [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)];
    const p = this._p(mat);
    const s = o.scale || mat.userData.uvScale || 2;
    const skip = o.skip || '';
    for (const k of FACE_KEYS) {
      if (skip && skip.indexOf(k) >= 0) continue;
      const f = FACES[k];
      const vs = f.v(b);
      let uvs;
      if (o.local) uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
      else {
        uvs = vs.map((q) => { const u = f.uv(q); return [u[0] / s + (o.uo ? o.uo[0] : 0), u[1] / s + (o.uo ? o.uo[1] : 0)]; });
      }
      if (o.rot) uvs = uvs.map((u) => [u[1], u[0]]);
      const P = [vs[0], vs[1], vs[2], vs[0], vs[2], vs[3]], U = [uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]];
      for (let i = 0; i < 6; i++) { p.pos.push(P[i][0], P[i][1], P[i][2]); p.nrm.push(f.n[0], f.n[1], f.n[2]); p.uv.push(U[i][0], U[i][1]); }
    }
  }
  // merge an arbitrary BufferGeometry with a matrix (uvs kept, or world-projected if o.worldUV)
  geom(mat, g, matrix, o = {}) {
    const gg = g.index ? g.toNonIndexed() : g;
    const pos = gg.attributes.position, nrm = gg.attributes.normal, uv = gg.attributes.uv;
    const p = this._p(mat);
    const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    const s = mat.userData.uvScale || 2;
    const us = o.uvScale || 1;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
      n.fromBufferAttribute(nrm, i).applyMatrix3(nm).normalize();
      p.pos.push(v.x, v.y, v.z); p.nrm.push(n.x, n.y, n.z);
      if (o.worldUV) {
        const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
        if (ay >= ax && ay >= az) p.uv.push(v.x / s, -v.z / s); else if (ax >= az) p.uv.push(v.z / s, v.y / s); else p.uv.push(v.x / s, v.y / s);
      } else if (uv) p.uv.push(uv.getX(i) * us, uv.getY(i) * us);
      else p.uv.push(0, 0);
    }
    if (gg !== g) gg.dispose();
  }
  // copy everything rotated 180 deg about Y, swapping materials via fn
  mirrorInto(target, swap) {
    for (const [mat, p] of this.parts) {
      const m2 = swap(mat) || mat;
      const q = target._p(m2);
      for (let i = 0; i < p.pos.length; i += 3) { q.pos.push(-p.pos[i], p.pos[i + 1], -p.pos[i + 2]); q.nrm.push(-p.nrm[i], p.nrm[i + 1], -p.nrm[i + 2]); }
      for (let i = 0; i < p.uv.length; i++) q.uv.push(p.uv[i]);
    }
  }
  // copy another builder's geometry transformed by a Matrix4 (editor objects -> one merged map)
  absorbXf(other, m) {
    const e = m.elements, n = new THREE.Matrix3().getNormalMatrix(m).elements;
    for (const [mat, p] of other.parts) {
      const q = this._p(mat);
      for (let i = 0; i < p.pos.length; i += 3) {
        const x = p.pos[i], y = p.pos[i + 1], z = p.pos[i + 2];
        q.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
        const a = p.nrm[i], b = p.nrm[i + 1], c = p.nrm[i + 2];
        const nx = n[0] * a + n[3] * b + n[6] * c, ny = n[1] * a + n[4] * b + n[7] * c, nz = n[2] * a + n[5] * b + n[8] * c;
        const L = Math.hypot(nx, ny, nz) || 1;
        q.nrm.push(nx / L, ny / L, nz / L);
      }
      for (let i = 0; i < p.uv.length; i++) q.uv.push(p.uv[i]);
    }
  }
  absorb(other) {
    for (const [mat, p] of other.parts) {
      const q = this._p(mat);
      for (let i = 0; i < p.pos.length; i++) { q.pos.push(p.pos[i]); q.nrm.push(p.nrm[i]); }
      for (let i = 0; i < p.uv.length; i++) q.uv.push(p.uv[i]);
    }
  }
  build(parent, opts = {}) {
    const meshes = [];
    for (const [mat, p] of this.parts) {
      if (!p.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2));
      g.computeBoundingSphere(); g.computeBoundingBox();
      const m = new THREE.Mesh(g, mat);
      m.castShadow = opts.cast !== false && !mat.transparent;
      m.receiveShadow = true;
      m.matrixAutoUpdate = false; m.updateMatrix();
      parent.add(m);
      meshes.push(m);
    }
    return meshes;
  }
}
