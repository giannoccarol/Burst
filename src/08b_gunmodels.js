// ===================================================================
// Weapon models from GLB files: one data entry per weapon, loaded lazily by id
// ===================================================================
// Adding a weapon = one GUN_MODELS entry + one assets/<file>.glb. Until the file is loaded (or
// if it never loads) the procedural gunModel(id) stays in place.
//
// Calibration is expressed in the model's own frame and units ("model space": the glTF scene,
// or the `node` subtree for animated first-person rigs) and maps it to "gun space" G:
// metres, origin at the centre of the right-hand pistol grip, -Z forward along the bore, +Y up.
//   file     GLB in assets/                 node   gun node of an animated rig (its idle frame)
//   rot      [x,y,z] degrees, model -> G    scale  model units -> metres
//   grip     model-space point mapped to the G origin
//   muzzle / sight / fore / eject           model-space points (sight = rear of the sight line)
//   eye      ADS distance eye -> sight (m)  hip    first-person hip position of the G origin
//   rig      true: the file contains first-person arms + one animation clip (segs below)
//   arms     id of an entry whose rig lends its arms (posed at idle; left hand IK'd to `fore`)
//   parts    node names (or /regex/) of moving parts: mag, boltSlide, boltTurn, pump, slide,
//            cyl, rocketHead
//   segs     clip time ranges in seconds: idle (time) or idleLoop [a,b], fire, reload,
//            reloadEmpty, draw, melee [[a,b],...]; a range may be a list of [u,t] keys (u in 0..1)
//   tp       third-person hold: offset of the grip from the chest in aim space [right, up, fwd]
//   flash    muzzle flash size
//   adsHide  node names hidden at full ADS (optic tubes), so only the reticle floats in view
const GUN_MODELS = {
  ar: {
    file: 'w_ar.glb', rig: true, node: 'carbine', rot: [0, 180, 0], scale: 0.0084,
    grip: [0, -1.73, -1.51], muzzle: [0, 9.57, 66.9], sight: [0, 16.6, 6.4], fore: [0, 5.24, 35.3], eject: [-2.2, 8.6, 8.8],
    eye: 0.085, hip: [0.15, -0.21, -0.35], flash: 0.14,
    adsHide: ['scope_carbine_0', 'lid_carbine_0'], // the long optic tube hides the target: at full ADS only the reticle stays
    segs: { idle: 0.25, fire: [0, 0.2], reload: [0.3, 2.27], reloadEmpty: [2.27, 4.47], draw: [4.85, 5.9] },
    tp: [0.14, 0.03, 0.24],
  },
  smg: {
    file: 'w_smg.glb', rig: true, node: 'smg45', rot: [0, 180, 0], scale: 0.0084,
    grip: [0, -2.5, 0.4], muzzle: [0, 7.9, 40.6], sight: [0, 14.0, -1], fore: [0, -1, 29.8], eject: [-2.2, 7, 15],
    eye: 0.19, hip: [0.15, -0.21, -0.35], flash: 0.1,
    segs: { idle: 0.24, fire: [0, 0.2], reload: [2.7, 4.3], reloadEmpty: [0.27, 2.68], draw: [4.7, 5.87] },
    tp: [0.14, 0.03, 0.24],
  },
  revolver: {
    file: 'w_revolver.glb', rig: true, node: 'revolver', rot: [0, 180, 0], scale: 0.0084,
    grip: [0, -2, -2], muzzle: [0, 7.1, 32.8], sight: [0, 12.2, 5], fore: null, eject: [0, 7, 8],
    eye: 0.3, hip: [0.13, -0.17, -0.36], flash: 0.14, noEject: true,
    segs: { idle: 0.47, fire: [0, 0.47], reload: [[0, 0.47], [0.42, 1.8], [0.4201, 6.25], [1, 7.4]], draw: [7.8, 8.9] },
    tp: [0.05, 0.1, 0.42],
  },
  knife: {
    file: 'w_knife.glb', rig: true, node: null, rot: [0, 180, 0], scale: 0.0084,
    grip: [-19.08, 5.55, 11.96], muzzle: [-19, 8, 30], sight: [-19.08, 5.55, 11.96], fore: null, eject: [-19, 5.5, 12],
    eye: 0.3, hip: [0.12, -0.2, -0.3], flash: 0,
    segs: { idleLoop: [0, 1.33], melee: [[1.37, 2.0], [2.03, 2.68]], draw: [4.35, 4.83] },
    tp: [0.16, -0.08, 0.3],
  },
  sniper: {
    file: 'w_sniper.glb', arms: 'ar', rot: [0, 180, 0], scale: 0.00715,
    grip: [0, -3, 1], muzzle: [0, 11, 127], sight: [0, 20, 0], fore: [0, 4, 60], eject: [-3, 12, 20],
    eye: 0.1, hip: [0.15, -0.21, -0.35], flash: 0.18,
    parts: { mag: 'mag', boltSlide: 'boltback', boltTurn: 'bolt' },
    tp: [0.14, 0.04, 0.22],
  },
  dmr: {
    file: 'w_dmr.glb', arms: 'ar', rot: [0, 90, 0], scale: 0.095,
    grip: [-1.75, -0.75, 0], muzzle: [5.35, 0.22, 0], sight: [-1.85, 1.0, 0], fore: [1.2, -0.02, 0], eject: [-0.5, 0.22, 0.2],
    eye: 0.09, hip: [0.15, -0.21, -0.35], flash: 0.14,
    parts: { mag: /20rnd_mag/ },
    tp: [0.14, 0.04, 0.22],
  },
  lmg: {
    file: 'w_lmg.glb', arms: 'ar', rot: [0, 180, 0], scale: 1.0,
    grip: [0, -0.045, -0.035], muzzle: [0, 0.083, 0.69], sight: [0, 0.14, 0], fore: [0, 0.025, 0.32], eject: [-0.03, 0.05, 0.1],
    eye: 0.12, hip: [0.15, -0.21, -0.35], flash: 0.18,
    parts: { mag: 'mag' },
    tp: [0.15, 0.0, 0.22],
  },
  shotgun: {
    file: 'w_shotgun.glb', arms: 'ar', rot: [0, 180, 0], scale: 0.006,
    grip: [0, -4, -1], muzzle: [0, 15, 128.8], sight: [0, 18.3, 10], fore: [0, 4, 68], eject: [-3, 13, 35],
    eye: 0.14, hip: [0.15, -0.21, -0.35], flash: 0.22,
    parts: { pump: 'pump' },
    tp: [0.14, 0.03, 0.24],
  },
  pistol: {
    file: 'w_pistol.glb', arms: 'revolver', rot: [0, 180, 0], scale: 0.0131,
    grip: [0, -1, -0.6], muzzle: [0, 4.5, 13.3], sight: [0, 6.15, 0.2], fore: null, eject: [-1, 5.5, 3.5],
    eye: 0.3, hip: [0.13, -0.17, -0.36], flash: 0.1,
    parts: { slide: 'slide', mag: 'mag' },
    tp: [0.05, 0.1, 0.42],
  },
  rocket: {
    file: 'w_rocket.glb', arms: 'ar', rot: [0, 90, 0], scale: 0.64,
    grip: [0.27, -0.11, 0], muzzle: [0.5, 0.05, 0], sight: [0.07, 0.15, -0.07], fore: [0.42, -0.005, 0], eject: [0, 0.05, 0],
    eye: 0.22, hip: [0.17, -0.24, -0.3], flash: 0.22, noEject: true,
    parts: { rocketHead: 'Cylinder000' },
    tp: [0.15, 0.08, 0.1],
  },
  // ---- extra roster (more entries can follow the same pattern)
  mp5: {
    file: 'w_mp5.glb', arms: 'ar', rot: [0, 180, 0], scale: 1.0,
    grip: [0, -0.045, -0.03], muzzle: [0, 0.033, 0.326], sight: [0, 0.11, -0.04], fore: [0, 0.025, 0.2], eject: [-0.02, 0.07, 0.06],
    eye: 0.11, hip: [0.15, -0.21, -0.35], flash: 0.1,
    parts: { mag: 'Mag_low' },
    tp: [0.14, 0.03, 0.24],
  },
  m1911: {
    file: 'w_m1911.glb', arms: 'revolver', rot: [0, 180, 0], scale: 0.0072,
    grip: [0, -4.5, -2.5], muzzle: [0, 7.7, 22], sight: [0, 9.9, -2], fore: null, eject: [-1, 8, 6],
    eye: 0.3, hip: [0.13, -0.17, -0.36], flash: 0.1,
    parts: { slide: 'slide', mag: 'mag' },
    tp: [0.05, 0.1, 0.42],
  },
};

const GunModels = {
  fpCache: {}, tpCache: {}, readyHooks: [], requested: new Set(), hooked: false,
  entry(id) { return GUN_MODELS[id] || null; },
  filesFor(id) {
    const e = this.entry(id);
    if (!e) return [];
    const f = [e.file];
    if (e.arms && GUN_MODELS[e.arms]) f.push(GUN_MODELS[e.arms].file);
    return f;
  },
  ready(id) { const fs = this.filesFor(id); return fs.length > 0 && fs.every((f) => Assets.peek(f)); },
  // start loading the files of a weapon (idempotent); resolves true when usable
  request(id) {
    if (!this.hooked) { this.hooked = true; Assets.onLoad(() => this.checkReady()); }
    const fs = this.filesFor(id);
    if (!fs.length) return Promise.resolve(false);
    this.requested.add(id);
    return Promise.all(fs.map((f) => Assets.get(f))).then(() => this.ready(id));
  },
  onReady(fn) { this.readyHooks.push(fn); },
  notified: new Set(),
  checkReady() {
    for (const id of this.requested) {
      if (this.notified.has(id) || !this.ready(id)) continue;
      this.notified.add(id);
      for (const fn of this.readyHooks) { try { fn(id); } catch (e) { console.error(e); } }
    }
  },
  // Wait (bounded) for the weapons and soldiers needed right away, with a progress callback
  async preloadBoot(onProgress) {
    // the classes' default weapons; every other weapon is loaded when first equipped or seen
    const ids = [...new Set(CLASSES.flatMap((c) => [c.primary, c.secondary]).concat(['knife']))].filter((id) => id && GUN_MODELS[id]);
    for (const id of ids) this.request(id);
    const files = ids.flatMap((id) => this.filesFor(id)).concat(Soldiers.bootFiles());
    for (const f of Soldiers.bootFiles()) Assets.get(f);
    await Assets.preload(files, onProgress, 15000);
  },

  // model space -> G
  calMatrix(e) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(e.rot[0] * DEG, e.rot[1] * DEG, e.rot[2] * DEG, 'XYZ'));
    m.multiply(new THREE.Matrix4().makeScale(e.scale, e.scale, e.scale));
    m.multiply(new THREE.Matrix4().makeTranslation(-e.grip[0], -e.grip[1], -e.grip[2]));
    return m;
  },
  toG(e, p) { return p ? GLBU.v3(p).applyMatrix4(this.calMatrix(e)) : null; },
  findPart(root, spec) {
    if (!spec) return null;
    let f = null;
    root.traverse((o) => { if (!f && (spec instanceof RegExp ? spec.test(o.name) : o.name === spec)) f = o; });
    return f;
  },
  // A posed copy of a rig: { scene (clone), mixer, action, gunNode, rigToG (Matrix4) }
  instRig(id) {
    const e = GUN_MODELS[id], g = Assets.peek(e.file);
    if (!g) return null;
    const scene = SkeletonUtils.clone(g.scene);
    const clip = g.animations[0];
    let mixer = null, action = null;
    if (clip) {
      mixer = new THREE.AnimationMixer(scene);
      action = mixer.clipAction(clip); action.play();
      action.time = e.segs.idle != null ? e.segs.idle : e.segs.idleLoop ? e.segs.idleLoop[0] : 0;
      mixer.update(0);
    }
    scene.updateMatrixWorld(true);
    const gunNode = e.node ? GLBU.find(scene, e.node) : null;
    const gunM = gunNode ? GLBU.relMatrix(gunNode, null) : new THREE.Matrix4();
    // root (scene) space -> G: calibration in the gun node's idle frame
    const rigToG = this.calMatrix(e).multiply(gunM.clone().invert());
    return { scene, mixer, action, clip, gunNode, rigToG };
  },

  // ------------------------------------------------------------ first person
  // Same shape as gunModel(id) plus arms; null if the files are not loaded yet
  buildFP(id) {
    const e = this.entry(id);
    if (!e || !this.ready(id)) return null;
    try { return this._buildFP(id, e); } catch (err) { console.error('[guns] ' + id, err); return null; }
  },
  _buildFP(id, e) {
    const root = new THREE.Group();
    const out = { root, muzzle: new THREE.Object3D(), eject: new THREE.Object3D(), mag: null, magHome: null, parts: {}, axes: {}, glb: true, flashSize: e.flash, noEject: !!e.noEject };
    const sight = this.toG(e, e.sight);
    out.sight = { y: sight.y, z: sight.z }; out.sightX = sight.x; out.eye = e.eye; out.hip = e.hip;
    out.grip = [0, 0, 0]; out.fore = e.fore ? this.toG(e, e.fore).toArray() : null;
    let gunRoot; // object whose subtree holds the gun meshes
    if (e.rig) {
      const R = this.instRig(id);
      const frame = new THREE.Group(); frame.matrixAutoUpdate = false; frame.matrix.copy(R.rigToG);
      frame.add(R.scene); root.add(frame);
      gunRoot = R.gunNode || R.scene;
      out.anim = { mixer: R.mixer, action: R.action, segs: e.segs, dur: R.clip ? R.clip.duration : 0 };
      // muzzle and ejection port follow the animated gun node
      const attach = (obj, p) => {
        const host = R.gunNode || R.scene;
        host.add(obj);
        obj.position.copy(GLBU.v3(p));
      };
      attach(out.muzzle, e.muzzle); attach(out.eject, e.eject);
      root.updateMatrixWorld(true);
      for (const o of [out.muzzle, out.eject]) this.alignToRoot(o, root);
    } else {
      // borrowed arms, posed at the donor's idle frame
      const A = this.instRig(e.arms), de = GUN_MODELS[e.arms];
      const af = new THREE.Group(); af.matrixAutoUpdate = false; af.matrix.copy(A.rigToG);
      af.add(A.scene); root.add(af);
      A.scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh) o.visible = false; });
      const gf = new THREE.Group(); gf.matrixAutoUpdate = false; gf.matrix.copy(this.calMatrix(e));
      const g = Assets.peek(e.file).scene.clone();
      gf.add(g); root.add(gf);
      gunRoot = g;
      root.add(out.muzzle, out.eject);
      out.muzzle.position.copy(this.toG(e, e.muzzle)); out.eject.position.copy(this.toG(e, e.eject));
      root.updateMatrixWorld(true);
      // move the support hand to this gun's fore grip
      if (e.fore && de.fore) {
        const delta = this.toG(e, e.fore).sub(this.toG(de, de.fore));
        this.ikWrist(A.scene, 'L', delta, root);
      }
    }
    root.updateMatrixWorld(true);
    // moving parts and the G-space axes they slide/turn along (expressed in each part's parent space)
    const P = e.parts || {};
    const axis = (node, v) => {
      const m = GLBU.relMatrix(node.parent, root).invert();
      return v.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(m));
    };
    const part = (k) => this.findPart(gunRoot, P[k]);
    const mag = part('mag');
    if (mag) { out.mag = mag; out.magHome = mag.position.clone(); out.axes.magDown = axis(mag, new THREE.Vector3(0, -1, 0)); }
    for (const k of ['boltSlide', 'boltTurn', 'pump', 'slide', 'cyl', 'rocketHead']) {
      const n = part(k);
      if (!n) continue;
      out.parts[k] = n;
      n.userData.home = { p: n.position.clone(), q: n.quaternion.clone() };
      n.userData.back = axis(n, new THREE.Vector3(0, 0, 1));
      n.userData.bore = axis(n, new THREE.Vector3(0, 0, 1)).normalize();
    }
    root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
    return out;
  },
  // give `obj` the orientation and unit scale of `root` (flash planes and shells are authored in G)
  alignToRoot(obj, root) {
    const pm = GLBU.relMatrix(obj.parent, root);
    const pq = new THREE.Quaternion(), ps = new THREE.Vector3(), pp = new THREE.Vector3();
    pm.decompose(pp, pq, ps);
    obj.quaternion.copy(pq.invert());
    obj.scale.setScalar(1 / ps.x);
  },
  // 2-bone IK on a first-person arm (side 'L'|'R'): move the wrist by `delta` (G metres), keep the hand's orientation
  ikWrist(scene, side, delta, root) {
    const bone = (re) => { let f = null; scene.traverse((o) => { if (!f && o.isBone && re.test(o.name)) f = o; }); return f; };
    const S = bone(new RegExp('^' + side + '_arm')), E = bone(new RegExp('^' + side + '_elbow')), W = bone(new RegExp('^' + side + '_wrist_'));
    if (!S || !E || !W) return;
    root.updateMatrixWorld(true);
    const ws = (o) => o.getWorldPosition(new THREE.Vector3());
    const pS = ws(S), pE = ws(E), pW = ws(W);
    const wq = W.getWorldQuaternion(new THREE.Quaternion());
    const T = pW.clone().add(delta.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(root.matrixWorld)));
    const a = pS.distanceTo(pE), b = pE.distanceTo(pW);
    const mid = pS.clone().lerp(pW, 0.5), pole = pE.clone().sub(mid);
    const nE = solveIK2(pS, T, a, b, pole, new THREE.Vector3()).clone();
    this.aimBone(S, pE.clone().sub(pS), nE.clone().sub(pS));
    root.updateMatrixWorld(true);
    const pE2 = ws(E), pW2 = ws(W);
    this.aimBone(E, pW2.clone().sub(pE2), T.clone().sub(pE2));
    root.updateMatrixWorld(true);
    const parentQ = W.parent.getWorldQuaternion(new THREE.Quaternion());
    W.quaternion.copy(parentQ.invert().multiply(wq));
    root.updateMatrixWorld(true);
  },
  // rotate `bone` (world space) so that direction `from` becomes `to`
  aimBone(bone, from, to) {
    const q = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
    const wq = bone.getWorldQuaternion(new THREE.Quaternion());
    const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));
  },

  // ------------------------------------------------------------ third person / icons
  // Merged gun-only meshes in G space (cached); userData like TPGuns: muzzle, grip, fore, hold
  buildTP(id) {
    if (this.tpCache[id] !== undefined) return this.tpCache[id];
    const e = this.entry(id);
    if (!e || !Assets.peek(e.file)) return null;
    let grp = null;
    try {
      const g = Assets.peek(e.file);
      const outer = new THREE.Group(), frame = new THREE.Group();
      frame.matrixAutoUpdate = false;
      outer.add(frame);
      let src;
      if (e.rig) {
        const R = this.instRig(id);
        if (R.gunNode) {
          src = R.gunNode.clone(); src.position.set(0, 0, 0); src.quaternion.identity(); src.scale.set(1, 1, 1);
          frame.matrix.copy(this.calMatrix(e));
        } else {
          src = R.scene; frame.matrix.copy(R.rigToG);
        }
      } else { src = g.scene.clone(); frame.matrix.copy(this.calMatrix(e)); }
      frame.add(src);
      grp = GLBU.mergeByMaterial(outer, (o) => o.isSkinnedMesh || (o.material && o.material.transparent));
      grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
      grp.userData = { muzzle: this.toG(e, e.muzzle), grip: [0, 0, 0], fore: e.fore ? this.toG(e, e.fore).toArray() : null, hold: e.tp, glb: true };
    } catch (err) { console.error('[guns] tp ' + id, err); grp = null; }
    this.tpCache[id] = grp;
    return grp;
  },
};
