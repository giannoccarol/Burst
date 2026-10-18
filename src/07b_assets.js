// ===================================================================
// External 3D models (GLB files published next to the page, loaded on demand)
// ===================================================================
// Every consumer keeps a procedural placeholder (gunModel, the procedural Avatar) and swaps the
// real model in when its file arrives; a missing, slow or broken file simply never arrives.
// The page must keep working with no files at all (offline tests, CSP problems, old browsers).
const ASSET_BASE = (() => {
  try { if (typeof window.__RAF_ASSET_BASE === 'string') return window.__RAF_ASSET_BASE; } catch (e) { /* no window */ }
  const b = '__RAFFICA_ASSET_BASE__'; // replaced by build.py (--assets / --no-assets)
  return b.indexOf('RAFFICA_ASSET') >= 0 ? 'assets/' : b;
})();
// artifact builds ship each GLB as base64 text (<file>.txt): artifacts don't serve .glb files
const ASSET_B64 = '__RAFFICA_ASSET_ENC__' === 'b64';
// [{ id, use, title, author, authorUrl, url, license, licenseUrl, modified, basedOn? }] from assets/CREDITS.json
const ASSET_CREDITS = /*__RAFFICA_CREDITS__*/[];

// Decode embedded textures with createImageBitmap(Blob): no blob:/data: URLs, so the page CSP
// never gets in the way. Also takes over EXT_texture_webp without the data:-URL support probe.
class GLTFBitmapImages {
  constructor(parser) {
    this.parser = parser;
    this.name = 'EXT_texture_webp';
    if (typeof createImageBitmap !== 'function') return;
    const orig = parser.loadImageSource.bind(parser);
    parser.loadImageSource = function (sourceIndex, loader) {
      const def = this.json.images[sourceIndex];
      if (def.bufferView === undefined) return orig(sourceIndex, loader);
      if (this.sourceCache[sourceIndex] !== undefined) return this.sourceCache[sourceIndex].then((t) => t.clone());
      const p = this.getDependency('bufferView', def.bufferView)
        .then((bv) => createImageBitmap(new Blob([bv], { type: def.mimeType }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
        .then((bmp) => { const t = new THREE.Texture(bmp); t.needsUpdate = true; t.userData.mimeType = def.mimeType; return t; });
      this.sourceCache[sourceIndex] = p;
      return p;
    };
  }
  loadTexture(textureIndex) {
    const p = this.parser, def = p.json.textures[textureIndex];
    if (!def.extensions || !def.extensions[this.name]) return null;
    return p.loadTextureImage(textureIndex, def.extensions[this.name].source, p.textureLoader);
  }
}

const Assets = {
  base: ASSET_BASE,
  cache: new Map(), // file -> { p: Promise, gltf, err }
  listeners: [],
  loader: null,
  timeout: 30000,
  enabled() {
    if (!this.base) return false;
    try { if (window.__RAF_TEST && window.__RAF_TEST.noassets) return false; } catch (e) { /* ignore */ }
    return typeof fetch === 'function';
  },
  getLoader() {
    if (!this.loader) {
      this.loader = new GLTFLoader();
      this.loader.setMeshoptDecoder(MeshoptDecoder);
      this.loader.register((parser) => new GLTFBitmapImages(parser));
    }
    return this.loader;
  },
  // loaded glTF or null (never throws)
  peek(file) { const e = this.cache.get(file); return e && e.gltf ? e.gltf : null; },
  failed(file) { const e = this.cache.get(file); return !!(e && e.err); },
  // Promise<gltf|null>; each file is requested once
  get(file) {
    let e = this.cache.get(file);
    if (e) return e.p;
    e = { p: null, gltf: null, err: null };
    this.cache.set(file, e);
    if (!this.enabled()) { e.err = 'disabled'; e.p = Promise.resolve(null); return e.p; }
    e.p = new Promise((resolve) => {
      let done = false;
      const fin = (g, err) => {
        if (done) return; done = true;
        if (g) e.gltf = g; else { e.err = String((err && err.message) || err || 'error'); console.warn('[assets] ' + file + ': ' + e.err); }
        resolve(e.gltf);
        if (g) for (const fn of this.listeners) { try { fn(file, g); } catch (x) { console.error(x); } }
      };
      const tm = setTimeout(() => fin(null, 'timeout'), this.timeout);
      try {
        if (ASSET_B64) {
          fetch(this.base + file + '.txt').then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))).then((t) => {
            const bin = atob(t.trim()), buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            this.getLoader().parse(buf.buffer, this.base, (g) => { clearTimeout(tm); fin(g); }, (err) => { clearTimeout(tm); fin(null, err); });
          }).catch((err) => { clearTimeout(tm); fin(null, err); });
        } else this.getLoader().load(this.base + file, (g) => { clearTimeout(tm); fin(g); }, undefined, (err) => { clearTimeout(tm); fin(null, err); });
      } catch (err) { clearTimeout(tm); fin(null, err); }
    });
    return e.p;
  },
  onLoad(fn) { this.listeners.push(fn); },
  // wait for some files (with a progress callback and an overall time limit)
  async preload(files, onProgress, limitMs) {
    files = [...new Set(files.filter(Boolean))];
    if (!files.length || !this.enabled()) return;
    let n = 0;
    const all = Promise.all(files.map((f) => this.get(f).then(() => { n++; if (onProgress) onProgress(n / files.length); })));
    await Promise.race([all, new Promise((r) => setTimeout(r, limitMs || 15000))]);
  },
};

// ---------------------------------------------------------------------
// Helpers shared by the weapon and soldier code
const GLBU = {
  // node lookup by exact name inside a subtree
  find(root, name) { let f = null; root.traverse((o) => { if (!f && o.name === name) f = o; }); return f; },
  // matrix of `obj` expressed in the space of `ancestor`
  relMatrix(obj, ancestor, out) {
    out = out || new THREE.Matrix4();
    out.identity();
    for (let o = obj; o && o !== ancestor; o = o.parent) { if (o.matrixAutoUpdate) o.updateMatrix(); out.premultiply(o.matrix); }
    return out;
  },
  // copy of a (possibly quantized / interleaved) geometry with float position/normal/uv only
  floatGeometry(geo) {
    const g = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) {
      const a = geo.attributes[k];
      if (!a) continue;
      const n = a.itemSize, arr = new Float32Array(a.count * n);
      for (let i = 0; i < a.count; i++) { arr[i * n] = a.getX(i); if (n > 1) arr[i * n + 1] = a.getY(i); if (n > 2) arr[i * n + 2] = a.getZ(i); }
      g.setAttribute(k, new THREE.BufferAttribute(arr, n));
    }
    if (geo.index) g.setIndex(Array.from(geo.index.array));
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    return g;
  },
  // merge every (non-skinned, visible) mesh under `root` into one mesh per material, in root space
  mergeByMaterial(root, skip) {
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const byMat = new Map();
    root.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !o.visible || (skip && skip(o))) return;
      for (let p = o.parent; p && p !== root; p = p.parent) if (!p.visible) return;
      const g = this.floatGeometry(o.geometry);
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      const ng = g.index ? g.toNonIndexed() : g;
      const k = o.material.uuid;
      if (!byMat.has(k)) byMat.set(k, { mat: o.material, geos: [] });
      byMat.get(k).geos.push(ng);
    });
    const out = new THREE.Group();
    for (const { mat, geos } of byMat.values()) {
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      if (!merged) continue;
      const m = new THREE.Mesh(merged, mat);
      merged.userData.shared = true;
      out.add(m);
    }
    return out;
  },
  v3(a) { return new THREE.Vector3(a[0], a[1], a[2]); },
};

// "Crediti" list in the help page, generated from ASSET_CREDITS (assets/CREDITS.json)
function renderCredits(ul) {
  if (!ul) return;
  ul.textContent = '';
  const safe = (u) => (typeof u === 'string' && /^https?:\/\/([a-z0-9-]+\.)*(sketchfab\.com|creativecommons\.org)\//i.test(u) ? u : null);
  const link = (text, href) => {
    const h = safe(href);
    if (!h) return document.createTextNode(text);
    const a = document.createElement('a'); a.href = h; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = text;
    a.style.color = 'var(--ink)';
    return a;
  };
  const lic = (l) => (/attribution/i.test(l || '') ? 'CC BY 4.0' : /cc0|public/i.test(l || '') ? 'CC0' : String(l || ''));
  for (const c of ASSET_CREDITS) {
    if (!c || typeof c.title !== 'string') continue;
    const li = document.createElement('li');
    li.style.cssText = 'break-inside:avoid;margin-bottom:6px';
    li.appendChild(link('«' + c.title + '»', c.url));
    li.appendChild(document.createTextNode(' di '));
    li.appendChild(link(String(c.author || '?'), c.authorUrl));
    li.appendChild(document.createTextNode(' · '));
    li.appendChild(link(lic(c.license), c.licenseUrl));
    if (c.basedOn && c.basedOn.title) {
      li.appendChild(document.createTextNode(' (basato su '));
      li.appendChild(link('«' + c.basedOn.title + '»', c.basedOn.url));
      li.appendChild(document.createTextNode(' di ' + String(c.basedOn.author || '?') + ', ' + lic(c.basedOn.license) + ')'));
    }
    if (c.use) li.appendChild(document.createTextNode(' — ' + c.use));
    ul.appendChild(li);
  }
  if (!ul.children.length) ul.appendChild(el('li', '', 'Nessun modello esterno in questa versione.'));
}
