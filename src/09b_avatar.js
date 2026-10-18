// ===================================================================
// Third-person soldier avatar: skinned GLB soldiers (procedural rig as placeholder), IK arms, locomotion
// ===================================================================
const TEAM_COLORS = { 0: '#c9a14a', 1: '#d8463c', 2: '#3d8ad8' };
const FFA_COLORS = ['#d8463c', '#3d8ad8', '#3fa45b', '#d89a2c', '#9a52c8', '#d65f9b', '#4cb3b0', '#c8c84a', '#e06a3a', '#7a8ad8'];
const AV_MAT = {};
function avatarMaterials() {
  if (AV_MAT.uniform) return;
  const fab = TexGen.cache.fabric;
  const S = (c, r = 0.85, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: 0, map: fab ? fab.map : null, normalMap: fab ? fab.normal : null }, extra));
  AV_MAT.uniform = S(0x5d5e44);
  AV_MAT.pants = S(0x4f5139);
  AV_MAT.vest = S(0x34362a, 0.75);
  AV_MAT.gear = new THREE.MeshStandardMaterial({ color: 0x24251f, roughness: 0.7, metalness: 0.1 });
  AV_MAT.boot = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.6, metalness: 0 });
  AV_MAT.glove = new THREE.MeshStandardMaterial({ color: 0x252320, roughness: 0.8, metalness: 0 });
  AV_MAT.face = new THREE.MeshStandardMaterial({ color: 0x2b2a27, roughness: 0.9, metalness: 0 });
  AV_MAT.skin = new THREE.MeshStandardMaterial({ color: 0xc08a6a, roughness: 0.7, metalness: 0 });
  AV_MAT.helmet = S(0x585a40, 0.7);
  AV_MAT.goggle = new THREE.MeshPhysicalMaterial({ color: 0x111418, roughness: 0.05, metalness: 0.3, clearcoat: 1 });
  AV_MAT.zombie = new THREE.MeshStandardMaterial({ color: 0x6f8a4f, roughness: 0.8, metalness: 0 });
}

function solveIK2(S, T, a, b, pole, outE) {
  // shoulder S, target T, lengths a (upper), b (lower); returns elbow position into outE
  const d = _v1.subVectors(T, S);
  let L = d.length();
  L = clamp(L, Math.abs(a - b) + 1e-3, a + b - 1e-3);
  d.normalize();
  const x = (a * a - b * b + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  const pp = _v2.copy(pole).addScaledVector(d, -pole.dot(d)).normalize();
  outE.copy(S).addScaledVector(d, x).addScaledVector(pp, h);
  return outE;
}

// ---------------------------------------------------------------------
// Soldier models (assets/soldier_<variant>.glb): Adobe Fuse characters on the same Mixamo
// skeleton (Hips, Spine, Spine1, Spine2, Neck, Head, [Left|Right]Shoulder/Arm/ForeArm/Hand,
// fingers, [Left|Right]UpLeg/Leg/Foot/ToeBase). Each skinned mesh is named after its part:
// Body (skin + whatever is under the clothes), Eyes, Lashes, Tops, Bottoms, Shoes, Gloves, Hats,
// Masks, Eyewear (not every variant has every part). Appearance = { variant, tint: {part: '#hex'},
// hide: [part], accent: '#hex' (team colour, default), zombie: bool }.
const SOLDIERS = {
  ru: { file: 'soldier_ru.glb', name: 'Bosco digitale' },
  uk: { file: 'soldier_uk.glb', name: 'Deserto DPM' },
  ua: { file: 'soldier_ua.glb', name: 'Pixel chiaro' },
  ua2: { file: 'soldier_ua2.glb', name: 'Pixel chiaro, senza maschera' },
  marine_wood: { file: 'soldier_marine_wood.glb', name: 'Bosco MARPAT' },
  marine_desert: { file: 'soldier_marine_desert.glb', name: 'Deserto MARPAT' },
  sniper: { file: 'soldier_sniper.glb', name: 'Tiratore scelto' },
  desert: { file: 'soldier_desert.glb', name: 'Deserto pesante' },
  snow: { file: 'soldier_snow.glb', name: 'Neve' },
  marine: { file: 'soldier_marine.glb', name: 'Mimetica da campo' },
  navy: { file: 'soldier_navy.glb', name: 'Blu marina' },
  mechanic: { file: 'soldier_mechanic.glb', name: 'Tecnico' },
  swat: { file: 'soldier_swat.glb', name: 'Squadra speciale' },
};
const SOLDIER_HEIGHT = 1.8;
// for the customisation UI: variants and the options addressed by small indices
// ap = { v: variant, t: tint, h: headgear, a: accent } (out-of-range values -> defaults)
const SOLDIER_VARIANTS = Object.keys(SOLDIERS).map((id) => ({ id, name: SOLDIERS[id].name }));
const AVATAR_OPTIONS = {
  variants: SOLDIER_VARIANTS,
  // multiplied onto the uniform textures (Tops, Bottoms, Hats); null = original colours
  tints: [
    { name: 'Originale', hex: null }, { name: 'Oliva', hex: '#9aa37a' }, { name: 'Sabbia', hex: '#d8c49a' }, { name: 'Grigio', hex: '#a8a8a8' },
    { name: 'Notte', hex: '#68708a' }, { name: 'Bosco', hex: '#7f9a68' }, { name: 'Neve', hex: '#f2f2f2' }, { name: 'Terra', hex: '#b08a6a' },
  ],
  tintParts: ['Tops', 'Bottoms', 'Hats'],
  headgear: [
    { name: 'Completo', hide: [] }, { name: 'Senza copricapo', hide: ['Hats'] }, { name: 'Senza maschera', hide: ['Masks'] },
    { name: 'Senza occhiali', hide: ['Eyewear'] }, { name: 'Volto scoperto', hide: ['Hats', 'Masks', 'Eyewear'] },
  ],
  // colour of armbands and helmet band when the mode has no teams (team modes always use the team colour)
  accents: [
    { name: 'Automatico', hex: null }, { name: 'Rosso', hex: '#e8384c' }, { name: 'Blu', hex: '#3d8bff' }, { name: 'Verde', hex: '#3fb45b' },
    { name: 'Ambra', hex: '#ffb22e' }, { name: 'Viola', hex: '#a35cff' }, { name: 'Rosa', hex: '#ff6fb1' }, { name: 'Ciano', hex: '#3fd0d0' }, { name: 'Bianco', hex: '#f4f4f4' },
  ],
};

const Soldiers = {
  teamDefault: { 0: 'ru', 1: 'ru', 2: 'uk' },
  ffa: ['ru', 'uk'],
  templates: {}, looks: new Map(),
  bootFiles() { return [...new Set([...Object.values(this.teamDefault), ...this.ffa])].map((v) => SOLDIERS[v].file); },
  ready(v) { return !!(SOLDIERS[v] && Assets.peek(SOLDIERS[v].file)); },
  request(v) { if (SOLDIERS[v]) Assets.get(SOLDIERS[v].file); },
  // default look for an entity (shared, cached objects)
  lookFor(id, team, zombie) {
    const v = team > 0 ? (this.teamDefault[team] || 'ru') : this.ffa[hashStr(String(id)) % this.ffa.length];
    const k = v + (zombie ? '|z' : '');
    if (!this.looks.has(k)) this.looks.set(k, { variant: v, zombie: !!zombie, tint: zombie ? { Body: '#8fbf6a' } : null });
    return this.looks.get(k);
  },
  // look object from either form: { variant, tint, hide, accent, zombie } or indices { v, t, h, a }
  resolve(ap) {
    if (!ap) return null;
    if (typeof ap.variant === 'string') return SOLDIERS[ap.variant] ? ap : null;
    const O = AVATAR_OPTIONS, ix = (x, n) => (Number.isInteger(x) && x >= 0 && x < n ? x : 0);
    const v = ix(ap.v, O.variants.length), t = ix(ap.t, O.tints.length), h = ix(ap.h, O.headgear.length), a = ix(ap.a, O.accents.length);
    const k = 'i' + v + '.' + t + '.' + h + '.' + a + (ap.zombie ? 'z' : '');
    if (!this.looks.has(k)) {
      const hex = O.tints[t].hex, tint = {};
      if (hex) for (const p of O.tintParts) tint[p] = hex;
      if (ap.zombie) tint.Body = '#8fbf6a';
      this.looks.set(k, { variant: O.variants[v].id, tint: Object.keys(tint).length ? tint : null, hide: O.headgear[h].hide.length ? O.headgear[h].hide : null, accent: O.accents[a].hex, zombie: !!ap.zombie, idx: [v, t, h, a] });
    }
    return this.looks.get(k);
  },
  norm(name) { return name.replace(/^mixamorig/, '').replace(/_\d+$/, ''); },
  // per variant: rest pose data shared by every clone
  template(v) {
    if (this.templates[v]) return this.templates[v];
    const g = SOLDIERS[v] && Assets.peek(SOLDIERS[v].file);
    if (!g) return null;
    const scene = g.scene;
    scene.updateMatrixWorld(true);
    const bones = {}, rest = {};
    scene.traverse((o) => { if (o.isBone) bones[this.norm(o.name)] = o; });
    if (!bones.Hips || !bones.Spine2 || !bones.Head || !bones.LeftArm || !bones.RightUpLeg) { this.templates[v] = null; return null; }
    const inv = new THREE.Matrix4().copy(scene.matrixWorld).invert();
    const top = bones.HeadTop_End || bones.Head;
    const s = SOLDIER_HEIGHT / Math.max(1e-3, top.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv).y * 1.0);
    for (const [k, b] of Object.entries(bones)) {
      const m = new THREE.Matrix4().multiplyMatrices(inv, b.matrixWorld);
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
      m.decompose(p, q, sc);
      const qi = q.clone().invert();
      rest[k] = {
        lq: b.quaternion.clone(), lp: b.position.clone(), mq: q, mp: p.multiplyScalar(s),
        ax: [new THREE.Vector3(1, 0, 0).applyQuaternion(qi), new THREE.Vector3(0, 1, 0).applyQuaternion(qi), new THREE.Vector3(0, 0, 1).applyQuaternion(qi)],
      };
    }
    // hips: model-space "up one metre" expressed in the hips' parent space
    const pm = new THREE.Matrix4().multiplyMatrices(inv, bones.Hips.parent.matrixWorld).invert();
    const hipsUp = new THREE.Vector3(0, 1 / s, 0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(pm));
    const parts = [];
    scene.traverse((o) => { if (o.isSkinnedMesh) parts.push(o.name); });
    const t = { v, scene, scale: s, rest, hipsUp, parts, mats: new Map() };
    this.templates[v] = t;
    return t;
  },
  // shared tinted copies of the part materials
  material(t, part, base, hex) {
    const k = part + '|' + base.uuid + '|' + hex;
    if (!t.mats.has(k)) { const m = base.clone(); m.color.multiply(new THREE.Color(hex)); t.mats.set(k, m); }
    return t.mats.get(k);
  },
};

// ---------------------------------------------------------------------
// Procedural soldier (placeholder until the GLB arrives, fallback without assets)
class ProcBody {
  constructor(av) {
    this.proc = true;
    const { rb } = GB;
    this.group = new THREE.Group();
    const add = (p, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
    this.hips = new THREE.Group(); this.hips.position.y = 0.95; this.group.add(this.hips);
    this.lower = new THREE.Group(); this.hips.add(this.lower);
    add(this.lower, rb(0.34, 0.2, 0.22, 0.06), AV_MAT.pants, 0, 0.02, 0);
    add(this.lower, rb(0.36, 0.06, 0.24, 0.02), AV_MAT.gear, 0, 0.1, 0);
    this.legs = [];
    for (const side of [-1, 1]) {
      const thigh = new THREE.Group(); thigh.position.set(side * 0.1, -0.02, 0); this.lower.add(thigh);
      add(thigh, cap(0.075, 0.3), AV_MAT.pants, 0, -0.2, 0);
      add(thigh, rb(0.06, 0.12, 0.06, 0.02), AV_MAT.gear, side * 0.08, -0.18, 0);
      const knee = new THREE.Group(); knee.position.y = -0.42; thigh.add(knee);
      add(knee, rb(0.1, 0.1, 0.06, 0.03), AV_MAT.gear, 0, 0.0, -0.06);
      add(knee, cap(0.062, 0.3), AV_MAT.pants, 0, -0.19, 0);
      const foot = new THREE.Group(); foot.position.y = -0.41; knee.add(foot);
      add(foot, rb(0.11, 0.11, 0.27, 0.035), AV_MAT.boot, 0, -0.04, -0.045);
      this.legs.push({ thigh, knee, foot, side });
    }
    this.spine = new THREE.Group(); this.spine.position.y = 0.08; this.hips.add(this.spine);
    this.chest = new THREE.Group(); this.spine.add(this.chest);
    add(this.chest, rb(0.38, 0.5, 0.24, 0.08), AV_MAT.uniform, 0, 0.27, 0);
    add(this.chest, rb(0.41, 0.36, 0.29, 0.05), AV_MAT.vest, 0, 0.3, -0.005);
    for (let i = 0; i < 3; i++) add(this.chest, rb(0.1, 0.12, 0.05, 0.02), AV_MAT.gear, -0.12 + i * 0.12, 0.2, -0.16);
    add(this.chest, rb(0.16, 0.06, 0.02, 0.01), av.teamMat, 0.0, 0.42, -0.155);
    add(this.chest, rb(0.3, 0.36, 0.13, 0.04), AV_MAT.vest, 0, 0.3, 0.2);
    add(this.chest, rb(0.06, 0.2, 0.04, 0.02), AV_MAT.gear, 0.12, 0.42, 0.28);
    this.neck = new THREE.Group(); this.neck.position.y = 0.55; this.chest.add(this.neck);
    add(this.neck, new THREE.CylinderGeometry(0.055, 0.06, 0.1, 10), AV_MAT.face, 0, 0.04, 0);
    this.head = new THREE.Group(); this.head.position.y = 0.1; this.neck.add(this.head);
    const headM = add(this.head, new THREE.SphereGeometry(0.11, 16, 12), AV_MAT.face, 0, 0.07, 0);
    headM.scale.set(0.92, 1.05, 1.0);
    add(this.head, rb(0.14, 0.04, 0.05, 0.015), AV_MAT.goggle, 0, 0.1, -0.085);
    const helm = new THREE.SphereGeometry(0.138, 18, 10, 0, TAU, 0, Math.PI * 0.55);
    add(this.head, helm, AV_MAT.helmet, 0, 0.1, 0.01);
    add(this.head, new THREE.TorusGeometry(0.135, 0.012, 6, 20), AV_MAT.helmet, 0, 0.085, 0.01).rotation.x = Math.PI / 2;
    add(this.head, rb(0.03, 0.18, 0.012, 0.005), av.teamMat, 0, 0.19, 0.0).rotation.x = Math.PI / 2;
    add(this.head, rb(0.05, 0.035, 0.035, 0.01), AV_MAT.gear, 0, 0.18, -0.12);
    this.arms = [];
    for (const side of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(side * 0.235, 0.47, -0.02); this.chest.add(sh);
      add(sh, new THREE.SphereGeometry(0.075, 10, 8), AV_MAT.uniform, 0, 0, 0);
      const up = add(this.chest, cap(0.055, 0.17), AV_MAT.uniform);
      const lo = add(this.chest, cap(0.047, 0.16), AV_MAT.uniform);
      const band = add(this.chest, new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), av.teamMat);
      const hand = add(this.chest, rb(0.07, 0.09, 0.05, 0.02), AV_MAT.glove);
      this.arms.push({ sh, up, lo, band, hand, side, e: new THREE.Vector3() });
    }
    this.gunMount = new THREE.Group(); this.gunMount.position.set(0.1, 0.38, -0.22); this.chest.add(this.gunMount);
    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  mountGun(gun, id) {
    id = procId(id);
    const offs = { knife: [0.04, -0.12, 0.08], pistol: [0.0, 0.0, -0.06], revolver: [0.0, 0.0, -0.06], rocket: [0.03, -0.06, 0.12], sniper: [0, -0.02, 0.05], lmg: [0, -0.02, 0.05] };
    const o = offs[id] || [0, -0.01, 0.03];
    gun.position.set(o[0], o[1], o[2]);
    if (id === 'rocket') gun.position.x = 0.05;
    gun.rotation.set(0, 0, 0);
    this.gunMount.add(gun);
  }
  poseDead(av, dt) {
    this.hips.position.y = lerp(this.hips.position.y, 0.25, dt * 6);
    for (const L of this.legs) { L.thigh.rotation.x = damp(L.thigh.rotation.x, -0.3 * L.side, 5, dt); L.knee.rotation.x = damp(L.knee.rotation.x, 0.4, 5, dt); }
  }
  pose(av, dt, st) {
    this.lower.rotation.y = av.lowerYaw;
    const run = av.run, amp = av.amp;
    for (const L of this.legs) {
      const ph = av.phase + (L.side > 0 ? Math.PI : 0);
      let tx = Math.sin(ph) * amp;
      let kx = Math.max(0, -Math.sin(ph + 0.9)) * amp * 1.5 + 0.08;
      tx = lerp(tx, -1.15 + Math.sin(ph) * amp * 0.5, av.crouchT);
      kx = lerp(kx, 1.75 + Math.max(0, -Math.sin(ph + 0.9)) * amp * 0.5, av.crouchT);
      tx = lerp(tx, L.side > 0 ? -0.75 : -0.25, av.airT);
      kx = lerp(kx, L.side > 0 ? 1.3 : 0.5, av.airT);
      tx = lerp(tx, L.side > 0 ? -1.45 : -0.6, av.slideT);
      kx = lerp(kx, L.side > 0 ? 0.15 : 1.6, av.slideT);
      L.thigh.rotation.x = tx; L.knee.rotation.x = kx; L.foot.rotation.x = -(tx + kx) * 0.4;
    }
    const bob = Math.abs(Math.sin(av.phase)) * 0.045 * Math.min(1, run) * (1 - av.airT);
    this.hips.position.y = lerp(0.95 + bob, 0.6, av.crouchT);
    this.hips.position.y = lerp(this.hips.position.y, 0.42, av.slideT);
    this.spine.rotation.set(st.pitch * 0.55 + av.slideT * 0.55 - av.kick * 0.06 + av.crouchT * 0.12, 0, 0, 'YXZ');
    this.chest.rotation.set(st.pitch * 0.35, 0, Math.sin(av.phase) * 0.04 * run * (1 - av.airT), 'YXZ');
    this.head.rotation.x = st.pitch * 0.1;
    av.root.updateMatrixWorld(true);
    const gun = av.gun;
    if (!gun) return;
    const ud = gun.userData;
    const toChest = (p) => { const v = new THREE.Vector3(p[0], p[1], p[2]); gun.localToWorld(v); this.chest.worldToLocal(v); return v; };
    const gripR = ud.grip ? toChest(ud.grip) : null;
    const gripL = ud.fore ? toChest(ud.fore) : (gripR ? gripR.clone().add(new THREE.Vector3(-0.06, -0.02, 0.02)) : null);
    for (const A of this.arms) {
      const target = A.side > 0 ? gripR : gripL;
      if (!target) continue;
      const S = A.sh.position;
      solveIK2(S, target, 0.29, 0.27, new THREE.Vector3(A.side * 0.8, -1, 0.3), A.e);
      this.placeLimb(A.up, S, A.e);
      this.placeLimb(A.lo, A.e, target);
      A.band.position.copy(S).lerp(A.e, 0.45); A.band.quaternion.copy(A.up.quaternion);
      A.hand.position.copy(target); A.hand.quaternion.copy(A.lo.quaternion);
    }
  }
  placeLimb(mesh, a, b) {
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    _v3.subVectors(b, a).normalize();
    mesh.quaternion.setFromUnitVectors(UP, _v3);
  }
  dispose() { this.group.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); }
}

// ---------------------------------------------------------------------
// Skinned soldier driven procedurally (no clips): FK for legs/spine/head, 2-bone IK for the arms
const SB_GEO = {};
function soldierAccentGeo() {
  if (!SB_GEO.band) {
    SB_GEO.band = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true); SB_GEO.band.userData.shared = true;
    SB_GEO.ring = new THREE.TorusGeometry(1, 0.09, 6, 22); SB_GEO.ring.userData.shared = true;
  }
  return SB_GEO;
}
const SB_TMP = { v: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3()), q: [0, 1, 2, 3].map(() => new THREE.Quaternion()), m: new THREE.Matrix4(), m3: new THREE.Matrix3() };

class SoldierBody {
  constructor(av, look) {
    const t = Soldiers.template(look.variant);
    this.proc = false; this.t = t; this.look = look;
    this.group = new THREE.Group();
    this.model = SkeletonUtils.clone(t.scene);
    this.model.scale.setScalar(t.scale);
    this.model.rotation.y = Math.PI; // the soldier faces +Z, the avatar faces -Z
    this.group.add(this.model);
    this.b = {};
    this.model.traverse((o) => {
      if (o.isBone) this.b[Soldiers.norm(o.name)] = o;
      if (o.isSkinnedMesh) {
        o.castShadow = /^(Body|Tops|Bottoms|Hats)$/.test(o.name);
        // receive shadows so soldiers don't glow when standing in shade or indoors
        o.receiveShadow = true;
        if (look.hide && look.hide.includes(o.name)) o.visible = false;
        const hex = look.tint && look.tint[o.name];
        if (hex) o.material = Soldiers.material(t, o.name, o.material, hex);
      }
    });
    // fingers curled once (they follow the hands)
    for (const side of ['Left', 'Right']) for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let i = 1; i <= 3; i++) {
      const n = side + 'Hand' + f + i, b = this.b[n];
      if (!b) continue;
      const curl = f === 'Thumb' ? 0.35 : 0.95 + i * 0.12;
      this.rot(b, n, 2, side === 'Left' ? -curl : curl, true);
      if (f === 'Thumb') this.rot(b, n, 1, side === 'Left' ? 0.5 : -0.5);
    }
    // team colour: armbands on both upper arms and a band round the head gear
    const G = soldierAccentGeo();
    this.accents = [];
    const accent = (bone, name, geo, radius, height, along, axisModel) => {
      const r = t.rest[name];
      if (!bone || !r) return;
      const m = new THREE.Mesh(geo, av.teamMat);
      m.castShadow = false;
      const s = 1 / t.scale;
      // place in bone space from model-space data at rest
      const child = this.childRest(name);
      const pos = child ? r.mp.clone().lerp(child, along) : r.mp.clone();
      const qi = r.mq.clone().invert();
      m.position.copy(pos.sub(r.mp).applyQuaternion(qi)).multiplyScalar(s / this.boneScale(name));
      m.quaternion.copy(qi).multiply(new THREE.Quaternion().setFromUnitVectors(UP, axisModel));
      m.scale.set(radius, height, radius).multiplyScalar(s / this.boneScale(name));
      bone.add(m); this.accents.push(m);
    };
    accent(this.b.LeftArm, 'LeftArm', G.band, 0.062, 0.06, 0.4, new THREE.Vector3(1, 0, 0));
    accent(this.b.RightArm, 'RightArm', G.band, 0.062, 0.06, 0.4, new THREE.Vector3(-1, 0, 0));
    const hatTop = t.rest.HeadTop_End ? t.rest.HeadTop_End.mp : null;
    const bareHead = look.hide && look.hide.includes('Hats');
    if (hatTop && this.b.Head && !bareHead) {
      const r = t.rest.Head, m = new THREE.Mesh(G.ring, av.teamMat), s = 1 / t.scale / this.boneScale('Head');
      const p = hatTop.clone().lerp(r.mp, 0.3); p.z -= 0.01;
      m.position.copy(p.sub(r.mp).applyQuaternion(r.mq.clone().invert())).multiplyScalar(s);
      m.quaternion.copy(r.mq.clone().invert()).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), UP));
      m.scale.setScalar(0.135 * s); m.scale.z = 0.12 * s;
      this.b.Head.add(m); this.accents.push(m);
    }
    this.gunMount = new THREE.Group();
    this.group.add(this.gunMount);
    this.hipsHome = this.b.Hips.position.clone();
  }
  // world scale of a bone relative to the model wrapper (Fuse rigs may carry 0.01 scales)
  boneScale(name) {
    const b = this.b[name];
    this.model.updateMatrixWorld(true);
    const m = SB_TMP.m.copy(this.model.matrixWorld).invert().multiply(b.matrixWorld);
    return new THREE.Vector3().setFromMatrixScale(m).x;
  }
  childRest(name) {
    const b = this.b[name];
    const c = b && b.children.find((o) => o.isBone);
    return c ? this.t.rest[Soldiers.norm(c.name)].mp.clone() : null;
  }
  // rotate a bone about a model-space axis (0 x, 1 y, 2 z) by angle a, on top of its current pose
  rot(b, name, axis, a, fromRest) {
    const r = this.t.rest[name];
    if (!b || !r) return;
    if (fromRest) b.quaternion.copy(r.lq);
    b.quaternion.multiply(SB_TMP.q[0].setFromAxisAngle(r.ax[axis], a));
  }
  reset(name) { const b = this.b[name], r = this.t.rest[name]; if (b && r) b.quaternion.copy(r.lq); }
  mountGun(gun) { gun.position.set(0, 0, 0); gun.rotation.set(0, 0, 0); this.gunMount.add(gun); }
  poseDead(av, dt) {
    const k = Math.min(1, av.deadT / 0.6);
    for (const n of ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot']) this.reset(n);
    this.b.Hips.position.copy(this.hipsHome).addScaledVector(this.t.hipsUp, -0.15 * k);
    this.rot(this.b.LeftUpLeg, 'LeftUpLeg', 0, -0.5 * k); this.rot(this.b.LeftLeg, 'LeftLeg', 0, 0.9 * k);
    this.rot(this.b.RightUpLeg, 'RightUpLeg', 0, -0.2 * k); this.rot(this.b.RightLeg, 'RightLeg', 0, 0.4 * k);
    this.rot(this.b.Spine1, 'Spine1', 0, 0.25 * k); this.rot(this.b.Neck, 'Neck', 0, 0.35 * k);
    // arms fall away from the body
    for (const [side, sg] of [['Left', 1], ['Right', -1]]) {
      this.reset(side + 'Arm'); this.reset(side + 'ForeArm'); this.reset(side + 'Hand');
      this.rot(this.b[side + 'Arm'], side + 'Arm', 2, -sg * 1.1 * k); this.rot(this.b[side + 'Arm'], side + 'Arm', 1, sg * 0.5 * k);
      this.rot(this.b[side + 'ForeArm'], side + 'ForeArm', 1, sg * 0.6 * k);
    }
    if (av.gun) av.gun.visible = av.deadT < 0.25;
  }
  pose(av, dt, st) {
    const B = this.b, run = av.run, amp = av.amp;
    for (const n of ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand']) this.reset(n);
    if (av.gun) av.gun.visible = true;
    // pelvis height and lower-body yaw (model axes: +x left, +y up, +z forward)
    const bob = Math.abs(Math.sin(av.phase)) * 0.04 * Math.min(1, run) * (1 - av.airT);
    const drop = lerp(lerp(-bob, 0.36, av.crouchT), 0.5, av.slideT);
    B.Hips.position.copy(this.hipsHome).addScaledVector(this.t.hipsUp, -drop);
    this.rot(B.Hips, 'Hips', 1, av.lowerYaw);
    this.rot(B.Hips, 'Hips', 0, -0.25 * av.slideT);
    // legs: flex > 0 swings the thigh forward, knee > 0 bends the knee
    for (const [side, sg] of [['Left', 1], ['Right', -1]]) {
      const ph = av.phase + (sg < 0 ? Math.PI : 0);
      let fl = Math.sin(ph) * amp * 0.85;
      let kn = Math.max(0, -Math.sin(ph + 0.9)) * amp * 1.4 + 0.06;
      fl = lerp(fl, 1.25 + Math.sin(ph) * amp * 0.3, av.crouchT);
      kn = lerp(kn, 2.0 + Math.max(0, -Math.sin(ph + 0.9)) * amp * 0.3, av.crouchT);
      fl = lerp(fl, sg > 0 ? 0.9 : 0.35, av.airT);
      kn = lerp(kn, sg > 0 ? 1.3 : 0.6, av.airT);
      fl = lerp(fl, sg > 0 ? 1.5 : 0.7, av.slideT);
      kn = lerp(kn, sg > 0 ? 0.1 : 1.7, av.slideT);
      this.rot(B[side + 'UpLeg'], side + 'UpLeg', 0, -fl);
      this.rot(B[side + 'UpLeg'], side + 'UpLeg', 2, sg * 0.04);
      this.rot(B[side + 'Leg'], side + 'Leg', 0, kn);
      this.rot(B[side + 'Foot'], side + 'Foot', 0, -(kn - fl) * 0.5 - fl * 0.2);
    }
    // upper body faces the aim: undo the hips yaw, lean with pitch, crouch and slide
    const lean = av.crouchT * 0.25 + av.slideT * 0.15 + (this.look.zombie ? 0.3 : 0);
    const pitch = -st.pitch;
    for (const [n, k] of [['Spine', 0.35], ['Spine1', 0.35], ['Spine2', 0.3]]) {
      this.rot(B[n], n, 1, -av.lowerYaw * k);
      this.rot(B[n], n, 0, (pitch * 0.55 + lean - av.kick * 0.05) * k);
    }
    this.rot(B.Spine1, 'Spine1', 2, Math.sin(av.phase) * 0.04 * run * (1 - av.airT));
    this.rot(B.Neck, 'Neck', 0, pitch * 0.2 - lean * 0.5);
    this.rot(B.Head, 'Head', 0, pitch * 0.25);
    this.rot(B.LeftShoulder, 'LeftShoulder', 2, -0.15); this.rot(B.RightShoulder, 'RightShoulder', 2, 0.15);
    this.model.updateMatrixWorld(true);
    // weapon in front of the chest, along the aim
    const gun = av.gun, mount = this.gunMount;
    const V = SB_TMP.v;
    const chest = B.Spine2.getWorldPosition(V[0]);
    av.root.worldToLocal(chest);
    const hold = (gun && gun.userData.hold) || [0.14, 0.02, 0.24];
    mount.rotation.set(st.pitch, 0, 0, 'YXZ');
    mount.position.copy(chest).add(V[1].set(hold[0], hold[1], -hold[2] + av.kick * 0.04).applyEuler(mount.rotation));
    mount.updateMatrixWorld(true);
    if (!gun) { this.relaxArms(); return; }
    const ud = gun.userData;
    const R = ud.grip ? gun.localToWorld(V[2].set(ud.grip[0], ud.grip[1], ud.grip[2])) : null;
    let L = null;
    if (ud.fore) L = gun.localToWorld(V[3].set(ud.fore[0], ud.fore[1], ud.fore[2]));
    else if (R && av.gunId !== 'knife') L = gun.localToWorld(V[3].set(-0.035, -0.03, 0.03)); // two-handed pistol grip
    if (R) this.ikArm('Right', R, -1, gun, 'grip');
    if (L) this.ikArm('Left', L, 1, gun, ud.fore ? 'fore' : 'cup'); else this.guardArm();
  }
  relaxArms() {
    for (const [side, sg] of [['Left', 1], ['Right', -1]]) { this.rot(this.b[side + 'Arm'], side + 'Arm', 2, -sg * 1.2); this.rot(this.b[side + 'ForeArm'], side + 'ForeArm', 1, sg * 0.3); }
  }
  guardArm() { // free left arm (knife): fist up in front
    this.rot(this.b.LeftArm, 'LeftArm', 2, -0.9); this.rot(this.b.LeftArm, 'LeftArm', 1, 0.9);
    this.rot(this.b.LeftForeArm, 'LeftForeArm', 1, 1.9);
  }
  // 2-bone IK (world space) from the upper arm to target T, elbow pushed out/down; then orient the hand on the gun
  ikArm(side, T, sg, gun, kind) {
    const B = this.b, S = B[side + 'Arm'], E = B[side + 'ForeArm'], H = B[side + 'Hand'];
    if (!S || !E || !H) return;
    const V = SB_TMP.v, Q = SB_TMP.q;
    const pS = S.getWorldPosition(V[4]).clone(), pE = E.getWorldPosition(new THREE.Vector3()), pH = H.getWorldPosition(new THREE.Vector3());
    const a = pS.distanceTo(pE), b = pE.distanceTo(pH);
    const rootQ = this.group.parent.getWorldQuaternion(Q[1]);
    const pole = new THREE.Vector3(-sg * 0.7, -1, 0.25).applyQuaternion(rootQ);
    const nE = solveIK2(pS, T, a, b, pole, new THREE.Vector3()).clone();
    GunModels.aimBone(S, pE.clone().sub(pS), nE.clone().sub(pS));
    S.updateMatrixWorld(true);
    const pE2 = E.getWorldPosition(new THREE.Vector3()), pH2 = H.getWorldPosition(new THREE.Vector3());
    GunModels.aimBone(E, pH2.sub(pE2), T.clone().sub(pE2));
    E.updateMatrixWorld(true);
    // hand frame: rest (T-pose) "along" = outward along the arm, palm down; target from the gun axes
    const gq = gun.getWorldQuaternion(Q[2]);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(gq), up = new THREE.Vector3(0, 1, 0).applyQuaternion(gq), right = new THREE.Vector3(1, 0, 0).applyQuaternion(gq);
    let along, palm;
    if (kind === 'grip') { along = fwd.clone().multiplyScalar(0.55).addScaledVector(up, -0.8).normalize(); palm = right.clone().negate(); }
    else if (kind === 'fore') { along = fwd.clone().multiplyScalar(0.55).addScaledVector(right, 0.8).normalize(); palm = up.clone(); }
    else { along = fwd.clone().multiplyScalar(0.3).addScaledVector(up, -0.6).addScaledVector(right, 0.6).normalize(); palm = right.clone(); }
    palm.addScaledVector(along, -palm.dot(along)).normalize();
    const modelQ = this.model.getWorldQuaternion(Q[3]);
    const rAlong = new THREE.Vector3(sg, 0, 0).applyQuaternion(modelQ), rPalm = new THREE.Vector3(0, -1, 0).applyQuaternion(modelQ);
    const basis = (x, y) => new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y));
    const qT = new THREE.Quaternion().setFromRotationMatrix(basis(along, palm));
    const qR = new THREE.Quaternion().setFromRotationMatrix(basis(rAlong, rPalm));
    const restW = modelQ.clone().multiply(this.t.rest[side + 'Hand'].mq);
    const want = qT.multiply(qR.invert()).multiply(restW);
    const pq = H.parent.getWorldQuaternion(new THREE.Quaternion());
    H.quaternion.copy(pq.invert().multiply(want));
  }
  dispose() { /* geometries, materials and textures are shared by every clone of the variant */ }
}

// ---------------------------------------------------------------------
// Third-person avatar (same API whatever the body): root, gun, setColor, setAppearance,
// setWeapon, setNameTag, fire, kill, revive, update, dispose, dead
class Avatar {
  constructor(opts = {}) {
    avatarMaterials();
    this.root = new THREE.Group();
    this.color = new THREE.Color(opts.color || '#d8463c');
    this.teamMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.6, metalness: 0.05, emissive: this.color, emissiveIntensity: 0.18 });
    this.gun = null; this.gunId = null;
    this.phase = 0; this.lowerYaw = 0; this.crouchT = 0; this.slideT = 0; this.airT = 0; this.kick = 0; this.run = 0; this.amp = 0;
    this.dead = false; this.deadT = 0; this.deadDir = 1;
    this.nameTag = null;
    this.look = null; this.wantLook = null;
    this.body = new ProcBody(this);
    this.root.add(this.body.group);
    const ap = opts.appearance || (opts.variant || opts.v != null ? opts : null);
    if (ap) this.setAppearance(ap);
  }
  setColor(hex) {
    this.color.set(hex); this.teamMat.color.set(hex); this.teamMat.emissive.set(hex);
  }
  // look object or index form { v, t, h, a } (see AVATAR_OPTIONS); swaps in when the variant is loaded
  setAppearance(ap) {
    const look = Soldiers.resolve(ap);
    if (!look || look === this.look) return;
    this.wantLook = look;
    if (!Soldiers.ready(look.variant)) { Soldiers.request(look.variant); return; }
    if (!Soldiers.template(look.variant)) return;
    this.swapBody(new SoldierBody(this, look));
    this.look = look;
  }
  swapBody(nb) {
    const gun = this.gun;
    if (gun && gun.parent) gun.parent.remove(gun);
    this.root.remove(this.body.group); this.body.dispose();
    this.body = nb; this.root.add(nb.group);
    if (gun) nb.mountGun(gun, this.gunId);
  }
  setWeapon(id) {
    if (id === this.gunId && !(this.gun && !this.gun.userData.glb && GunModels.buildTP(id))) return;
    if (this.gun && this.gun.parent) this.gun.parent.remove(this.gun);
    this.gun = TPGuns.get(id);
    this.gunId = id;
    this.body.mountGun(this.gun, id);
  }
  setNameTag(text, colorHex, show = true) {
    if (!this.nameTag) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64;
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: true, depthWrite: false, transparent: true, toneMapped: false });
      this.nameTag = new THREE.Sprite(mat); this.nameTag.scale.set(1.2, 0.3, 1); this.nameTag.position.y = 2.15;
      this.nameTag.userData = { c, tex, text: null };
      this.root.add(this.nameTag);
    }
    const u = this.nameTag.userData;
    if (u.text !== text + colorHex) {
      u.text = text + colorHex;
      const g = u.c.getContext('2d');
      g.clearRect(0, 0, 256, 64);
      g.font = '600 34px "Barlow Semi Condensed", "Arial Narrow", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.strokeText(text, 128, 34);
      g.fillStyle = colorHex; g.fillText(text, 128, 34);
      u.tex.needsUpdate = true;
    }
    this.nameTag.visible = show;
  }
  fire() { this.kick = 1; }
  kill(dir) { this.dead = true; this.deadT = 0; this.deadDir = dir || (Math.random() < 0.5 ? 1 : -1); }
  revive() { this.dead = false; this.deadT = 0; this.root.rotation.set(0, this.root.rotation.y, 0); this.root.visible = true; if (this.gun) this.gun.visible = true; }
  // st: { yaw, pitch, vx, vz, crouch, slide, grounded, ads }
  update(dt, st) {
    // late upgrades: soldier model and weapon model arrive after the avatar was created
    if (this.body.proc && this.wantLook && Soldiers.ready(this.wantLook.variant)) this.setAppearance(this.wantLook);
    if (this.gunId && !this.gun.userData.glb && GunModels.buildTP(this.gunId)) this.setWeapon(this.gunId);
    const r = this.root;
    if (this.dead) {
      this.deadT += dt;
      const t = Math.min(1, this.deadT / 0.45);
      const e = t * t;
      r.rotation.set(this.deadDir * e * 1.45, st.yaw, 0, 'YXZ');
      this.body.poseDead(this, dt);
      if (this.deadT > 3) r.position.y -= dt * 0.6;
      if (this.deadT > 4.5) r.visible = false;
      return;
    }
    r.rotation.set(0, st.yaw, 0, 'YXZ');
    const sp = Math.hypot(st.vx, st.vz);
    const s = Math.sin(st.yaw), c = Math.cos(st.yaw);
    const fwd = -(st.vx * s + st.vz * c);
    const side = st.vx * c - st.vz * s;
    this.crouchT = damp(this.crouchT, st.crouch && !st.slide ? 1 : 0, 10, dt);
    this.slideT = damp(this.slideT, st.slide ? 1 : 0, 12, dt);
    this.airT = damp(this.airT, st.grounded ? 0 : 1, 8, dt);
    let targetLower = 0;
    if (sp > 0.6 && st.grounded) {
      let ang = Math.atan2(-side, fwd);
      if (fwd < -0.3) ang = Math.atan2(side, -fwd);
      targetLower = clamp(ang, -1.1, 1.1);
    }
    this.lowerYaw = damp(this.lowerYaw, targetLower, 8, dt);
    const dirSign = fwd < -0.3 ? -1 : 1;
    this.run = clamp(sp / 8, 0, 1.5);
    this.phase += dt * (sp * 1.25) * dirSign * (st.grounded ? 1 : 0);
    this.amp = 0.75 * Math.min(1, this.run) * (1 - this.crouchT * 0.5) * (1 - this.airT) * (1 - this.slideT);
    this.kick = damp(this.kick, 0, 14, dt);
    this.body.pose(this, dt, st);
  }
  dispose() {
    this.body.dispose();
    if (this.nameTag) { this.nameTag.material.map.dispose(); this.nameTag.material.dispose(); }
    this.teamMat.dispose();
  }
}


// Hitboxes for a player/bot at feet position p with flags
function hitboxesFor(p, yaw, crouch, slide, out) {
  // sized to the GLB soldiers (shoulders ~0.6 m wide): thinner capsules made hits feel unfair
  out = out || { head: { c: new THREE.Vector3(), r: 0.19 }, body: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.33 }, legs: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.21 } };
  const hy = slide ? 0.98 : crouch ? 1.2 : 1.66;
  const s = Math.sin(yaw), c = Math.cos(yaw);
  const lean = slide ? 0.28 : 0;
  out.head.c.set(p.x + s * lean, p.y + hy, p.z + c * lean);
  const b0 = slide ? 0.45 : crouch ? 0.62 : 0.95, b1 = slide ? 0.78 : crouch ? 1.02 : 1.42;
  out.body.a.set(p.x, p.y + b0, p.z); out.body.b.set(p.x + s * lean * 0.7, p.y + b1, p.z + c * lean * 0.7);
  out.legs.a.set(p.x, p.y + 0.12, p.z); out.legs.b.set(p.x, p.y + (slide ? 0.4 : crouch ? 0.58 : 0.92), p.z);
  if (slide) { out.legs.a.set(p.x - s * 0.55, p.y + 0.2, p.z - c * 0.55); }
  return out;
}
// ray vs sphere / capsule (returns t or -1)
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const h = b * b - cc;
  if (h < 0) return -1;
  const t = -b - Math.sqrt(h);
  return t >= 0 ? t : (cc < 0 ? 0 : -1);
}
function rayCapsule(o, d, a, b, r) {
  // iquilezles capsule intersection
  const bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z;
  const oax = o.x - a.x, oay = o.y - a.y, oaz = o.z - a.z;
  const baba = bax * bax + bay * bay + baz * baz;
  const bard = bax * d.x + bay * d.y + baz * d.z;
  const baoa = bax * oax + bay * oay + baz * oaz;
  const rdoa = d.x * oax + d.y * oay + d.z * oaz;
  const oaoa = oax * oax + oay * oay + oaz * oaz;
  const A = baba - bard * bard;
  const B = baba * rdoa - baoa * bard;
  const C = baba * oaoa - baoa * baoa - r * r * baba;
  const h = B * B - A * C;
  if (h >= 0) {
    const t = (-B - Math.sqrt(h)) / A;
    const y = baoa + t * bard;
    if (y > 0 && y < baba && t >= 0) return t;
    const ocx = y <= 0 ? oax : o.x - b.x, ocy = y <= 0 ? oay : o.y - b.y, ocz = y <= 0 ? oaz : o.z - b.z;
    const Bc = d.x * ocx + d.y * ocy + d.z * ocz;
    const Cc = ocx * ocx + ocy * ocy + ocz * ocz - r * r;
    const hc = Bc * Bc - Cc;
    if (hc > 0) { const tc = -Bc - Math.sqrt(hc); if (tc >= 0) return tc; }
  }
  return -1;
}

// handles for tests and tools (the game itself uses the globals directly)
window.RAFFICA_MODELS = { Avatar, Soldiers, SOLDIERS, SOLDIER_VARIANTS, AVATAR_OPTIONS, GunModels, GUN_MODELS, Assets, TPGuns };
