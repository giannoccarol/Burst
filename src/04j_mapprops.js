// ===================================================================
// GLB props in the built-in maps (assets/p_<slug>.glb, see tools/build_assets.mjs)
// ===================================================================
// Map builders place props with MapProps.put / MapProps.add; collisions stay in the builders' code, so
// every client gets the same world whether or not a file has arrived. After the build, MapProps.attach
// merges all instances of a model into one mesh per material (few draw calls) under the map group.
//   put: the model replaces a procedural object; returns false when the file is not loaded yet and the
//        caller draws its procedural version instead (the map is rebuilt once the files are in)
//   add: a prop with no procedural version; drawn as soon as its file arrives
// PROP_GLB (merged from PROP_GLB_BORGO in 04d_props.js and PROP_GLB_VILLETTE in 04h_villette.js): id -> { file, fit: [axis 'x'|'y'|'z'|'max', metres] after `rot` (degrees about Y: makes
// local +x the front of vehicles and furniture), maps: where it is used (preloaded with the map) }
// Normalised models sit centred on the origin with their lowest point at y = 0.
const PROP_GLB = Object.assign({}, PROP_GLB_BORGO, PROP_GLB_VILLETTE);

const MapProps = {
  protos: new Map(), // id -> [{ mat, geo }] normalised geometry per material
  missed: new Set(), // ids that fell back to procedural geometry in the last build
  files(mapId) { return [...new Set(Object.values(PROP_GLB).filter((d) => !mapId || d.maps.includes(mapId)).map((d) => d.file))]; },
  preload(mapId, ms) { return Assets.preload(this.files(mapId), null, ms || 15000); },
  ready(id) { const d = PROP_GLB[id]; return !!(d && Assets.peek(d.file)); },
  // does a map rebuild now draw GLB props where the last build drew procedural ones?
  upgradable() { return [...this.missed].some((id) => this.ready(id)); },
  begin() { this.missed = new Set(); },
  _rec(ctx, id, x, y, z, rot, o) {
    const m = new THREE.Matrix4().makeRotationY(rot || 0).setPosition(x, y, z);
    if (o && o.s) m.multiply(new THREE.Matrix4().makeScale(o.s, o.s, o.s));
    if (o && o.m) m.premultiply(o.m);
    (ctx.glb || (ctx.glb = [])).push({ id, m });
  },
  put(ctx, id, x, y, z, rot, o) {
    if (!this.ready(id)) { this.missed.add(id); return false; }
    this._rec(ctx, id, x, y, z, rot, o);
    return true;
  },
  add(ctx, id, x, y, z, rot, o) { if (PROP_GLB[id]) this._rec(ctx, id, x, y, z, rot, o); },
  // placements of a half-map rotated 180 degrees about the map centre (central symmetry)
  mirrored(list) {
    const R = new THREE.Matrix4().makeRotationY(Math.PI);
    return (list || []).map((p) => ({ id: p.id, m: p.m.clone().premultiply(R) }));
  },
  proto(id) {
    if (this.protos.has(id)) return this.protos.get(id);
    const d = PROP_GLB[id], g = d && Assets.peek(d.file);
    if (!g) return null;
    const inner = g.scene.clone();
    const root = new THREE.Group(); root.add(inner);
    inner.rotation.y = (d.rot || 0) * Math.PI / 180;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner, true), size = box.getSize(new THREE.Vector3());
    const ax = d.fit[0], want = d.fit[1];
    const have = ax === 'max' ? Math.max(size.x, size.y, size.z) : size[ax];
    const s = have > 1e-6 ? want / have : 1;
    const norm = new THREE.Matrix4().makeScale(s, s, s).premultiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s));
    const byMat = new Map();
    inner.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !o.visible) return;
      const geo = GLBU.floatGeometry(o.geometry);
      for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
      if (!geo.index) geo.setIndex([...Array(geo.attributes.position.count).keys()]);
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(norm, o.matrixWorld));
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const mat = mats[0];
      if (mat.transparent && mat.opacity > 0.98 && !/glass|lens|vetro/i.test(mat.name || '')) mat.transparent = false;
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push(geo);
    });
    const parts = [];
    for (const [mat, geos] of byMat) { const geo = geos.length > 1 ? BufferGeometryUtils.mergeGeometries(geos, false) : geos[0]; if (geo) parts.push({ mat, geo }); }
    const out = { parts, size: new THREE.Vector3(size.x * s, size.y * s, size.z * s) };
    this.protos.set(id, out);
    return out;
  },
  // normalised size of a model (for writing collision boxes; null until its file is loaded)
  dims(id) { const p = this.proto(id); return p ? p.size.toArray().map((v) => +v.toFixed(3)) : null; },
  // draw the placements under `holder`, one merged mesh per (model, material); placements whose file
  // is still loading are drawn when it arrives (if the holder is still in the scene)
  attach(holder, list, o = {}) {
    const byId = new Map();
    for (const p of list || []) { if (!byId.has(p.id)) byId.set(p.id, []); byId.get(p.id).push(p); }
    const pending = new Map();
    const draw = (id, ps) => {
      const pr = this.proto(id);
      if (!pr) return false;
      for (const { mat, geo } of pr.parts) {
        const geos = ps.map((p) => geo.clone().applyMatrix4(p.m));
        const merged = geos.length > 1 ? BufferGeometryUtils.mergeGeometries(geos, false) : geos[0];
        if (!merged) continue;
        merged.computeBoundingSphere(); merged.computeBoundingBox();
        const mesh = new THREE.Mesh(merged, mat);
        mesh.name = 'prop:' + id;
        mesh.castShadow = o.shadow !== false; mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        holder.add(mesh);
      }
      return true;
    };
    for (const [id, ps] of byId) if (!draw(id, ps)) pending.set(PROP_GLB[id].file, [id, ps]);
    if (pending.size) {
      const fn = (file) => {
        const e = pending.get(file);
        if (e && holder.parent) { pending.delete(file); if (draw(e[0], e[1]) && typeof R !== 'undefined') R.staticDirty = true; }
        if (!pending.size || !holder.parent) { const i = Assets.listeners.indexOf(fn); if (i >= 0) Assets.listeners.splice(i, 1); }
      };
      Assets.listeners.push(fn);
      for (const f of pending.keys()) Assets.get(f);
    }
  },
};
