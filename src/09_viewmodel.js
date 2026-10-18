// ===================================================================
// First-person viewmodel: positioning, ADS, bob, sway, recoil, reload anims
// ===================================================================
const HIP_POSE = {
  ar: [0.15, -0.15, -0.36], dmr: [0.15, -0.15, -0.38], smg: [0.15, -0.145, -0.34], lmg: [0.16, -0.16, -0.36],
  shotgun: [0.15, -0.15, -0.37], revolver: [0.15, -0.14, -0.38], pistol: [0.15, -0.135, -0.38], sniper: [0.15, -0.15, -0.36],
  rocket: [0.2, -0.24, -0.4], knife: [0.17, -0.15, -0.36],
};
const easeIO = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const bump = (t, a, b) => (t <= a || t >= b) ? 0 : Math.sin(Math.PI * (t - a) / (b - a));
// time inside a clip segment: [a, b] or a list of [u, t] keys, for progress u in 0..1
function segTime(seg, u) {
  u = clamp(u, 0, 1);
  if (typeof seg[0] === 'number') return seg[0] + (seg[1] - seg[0]) * u;
  for (let i = 1; i < seg.length; i++) {
    const [u0, t0] = seg[i - 1], [u1, t1] = seg[i];
    if (u <= u1) return u1 > u0 ? t0 + (t1 - t0) * (u - u0) / (u1 - u0) : t1;
  }
  return seg[seg.length - 1][1];
}
const segLen = (seg) => typeof seg[0] === 'number' ? seg[1] - seg[0] : seg[seg.length - 1][1] - seg[0][1];

class Viewmodel {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.models = {};
    this.id = null; this.m = null;
    this.bob = 0; this.swayX = 0; this.swayY = 0; this.kick = 0; this.kickRot = 0; this.kickSide = 0;
    this.equip = 1; this.equipTime = 0.4; this.land = 0; this.tilt = 0; this.flashT = 0; this.time = 0;
    this.teamHex = '#777777';
    // muzzle flash sprite group (re-parented to the active muzzle)
    this.flash = new THREE.Group();
    const ftex = FX.atlasSingle('flash');
    const fm = new THREE.MeshBasicMaterial({ map: ftex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, color: 0xffc77a, toneMapped: false, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fm);
      if (i === 0) p.rotation.set(0, 0, 0);
      if (i === 1) { p.rotation.set(0, Math.PI / 2, 0); p.scale.set(1.6, 0.7, 1); p.position.z = -0.25; }
      if (i === 2) { p.rotation.set(Math.PI / 2, 0, Math.PI / 2); p.scale.set(1.6, 0.7, 1); p.position.z = -0.25; }
      this.flash.add(p);
    }
    this.flash.visible = false;
    // ejected shells
    this.shells = [];
    const sg = new THREE.CylinderGeometry(0.0045, 0.0045, 0.022, 8); sg.rotateZ(Math.PI / 2);
    const brass = GUNMAT.brass.clone();
    for (let i = 0; i < 16; i++) { const s = new THREE.Mesh(sg, brass); s.visible = false; this.scene.add(s); this.shells.push({ m: s, v: new THREE.Vector3(), life: 0, spin: new THREE.Vector3() }); }
    this.shellIdx = 0;
    this.fireT = 9; this.meleeIdx = 0; this.lastMelee = -1; this.relVariant = null;
  }
  // GLB model when its file is loaded, else the procedural one as a placeholder (upgraded later)
  get(id) {
    let m = this.models[id];
    if (m && m.placeholder && GunModels.ready(id)) m = this.upgrade(id) || m;
    if (!m) {
      m = GunModels.buildFP(id);
      if (!m) { m = gunModel(id); addArms(m); m.placeholder = true; GunModels.request(id); }
      this.ownMaterials(m);
      if (m.bandMat) m.bandMat.color.set(this.teamHex);
      m.root.visible = false;
      this.root.add(m.root);
      this.models[id] = m;
    }
    return m;
  }
  // first-person copies of the materials. A material drawn both in the world scene (fog, map lights) and
  // in the viewmodel scene needs two programs: shared, three.js re-derived the program of every such draw
  // twice a frame. Copies are cached per source material, so all first-person models share them.
  ownMaterials(m) {
    const cache = this._mats || (this._mats = new Map());
    const own = (mt) => { if (!mt) return mt; let c = cache.get(mt); if (!c) { c = mt.clone(); cache.set(mt, c); cache.set(c, c); } return c; };
    m.root.traverse((o) => { if (o.isMesh || o.isSprite) o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material); });
    if (m.bandMat) m.bandMat = own(m.bandMat);
  }
  upgrade(id) {
    const old = this.models[id], m = GunModels.buildFP(id);
    if (!m) { if (old) old.placeholder = false; return null; } // broken file: keep the procedural model
    this.ownMaterials(m);
    if (old) { this.root.remove(old.root); old.root.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); }); }
    m.root.visible = false;
    this.root.add(m.root);
    this.models[id] = m;
    if (this.id === id) {
      this.m = m; m.root.visible = true;
      m.muzzle.add(this.flash); this.flash.visible = false;
    }
    return m;
  }
  setTeamColor(hex) { this.teamHex = hex; for (const k in this.models) if (this.models[k].bandMat) this.models[k].bandMat.color.set(hex); }
  setWeapon(id, swapTime) {
    if (this.m) this.m.root.visible = false;
    this.m = this.get(id); this.id = id;
    this.m.root.visible = true;
    this.equip = 0; this.equipTime = swapTime || 0.4;
    this.m.muzzle.add(this.flash);
    this.flash.visible = false;
    if (this.m.parts.rocketHead) this.m.parts.rocketHead.visible = true;
    this.fireT = 9; this.relVariant = null;
  }
  fire(kick = 1) {
    if (!this.m) return;
    this.kick = Math.min(1.6, this.kick + kick);
    this.kickSide = (Math.random() - 0.5) * 2;
    if ((WEAPONS[this.id] || {}).type !== 'melee') {
      this.flashT = 0.05;
      this.flash.visible = true;
      const s = this.m.flashSize != null ? this.m.flashSize : this.id === 'shotgun' || this.id === 'rocket' ? 0.22 : this.id === 'smg' || this.id === 'pistol' ? 0.1 : this.id === 'sniper' || this.id === 'lmg' ? 0.18 : 0.14;
      this.flash.scale.setScalar(s * (0.8 + Math.random() * 0.4));
      this.flash.rotation.z = Math.random() * TAU;
    }
    if (this.m.parts.cyl && !this.m.glb) this.m.parts.cyl.rotation.z += TAU / 6;
    this.fireT = 0;
    if (['ar', 'dmr', 'smg', 'lmg', 'pistol'].includes(procId(this.id)) && !this.m.noEject) this.ejectShell();
  }
  ejectShell() {
    const sh = this.shells[this.shellIdx++ % this.shells.length];
    this.m.eject.getWorldPosition(sh.m.position);
    const camQ = this.m.root.getWorldQuaternion(_q1);
    sh.v.set(0.9 + Math.random() * 0.5, 0.9 + Math.random() * 0.4, 0.2 + Math.random() * 0.3).applyQuaternion(camQ);
    sh.spin.set(Math.random() * 20, Math.random() * 20, Math.random() * 20);
    sh.life = 0.7; sh.m.visible = true;
  }
  // s: {ads, speed, grounded, sliding, dx, dy, reload:{t,kind}|null, melee, bolt, pump, visible, landed}
  update(dt, s) {
    this.time += dt;
    for (const sh of this.shells) {
      if (sh.life <= 0) continue;
      sh.life -= dt; sh.v.y -= 9 * dt;
      sh.m.position.addScaledVector(sh.v, dt);
      sh.m.rotation.x += sh.spin.x * dt; sh.m.rotation.y += sh.spin.y * dt;
      if (sh.life <= 0) sh.m.visible = false;
    }
    if (this.m && this.m.placeholder && GunModels.ready(this.id)) this.upgrade(this.id);
    const m = this.m;
    if (!m) return;
    this.fireT += dt;
    const A = m.anim, S = A ? A.segs : null;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flash.visible = false; }
    const a = easeIO(clamp(s.ads, 0, 1));
    const hip = m.hip || HIP_POSE[procId(this.id)] || [0.12, -0.13, -0.25];
    const ax = -(m.sightX || 0), ay = -m.sight.y, az = -m.eye - m.sight.z;
    let px = lerp(hip[0], ax, a), py = lerp(hip[1], ay, a), pz = lerp(hip[2], az, a);
    let rx = 0, ry = lerp(0.035, 0, a), rz = 0;
    // bob
    const moveAmt = clamp(s.speed / 8.2, 0, 1.5) * (s.grounded && !s.sliding ? 1 : 0.15);
    this.bob += dt * (3 + s.speed * 1.05) * (s.grounded ? 1 : 0.2);
    const bk = moveAmt * (1 - a * 0.88);
    px += Math.sin(this.bob) * 0.012 * bk;
    py += -Math.abs(Math.cos(this.bob)) * 0.014 * bk + Math.sin(this.time * 1.7) * 0.0015 * (1 - a);
    rz += Math.sin(this.bob) * 0.015 * bk;
    // sway
    // callers that pass no look delta (menu, death cam) must not poison the smoothed state with NaN
    this.swayX = damp(this.swayX, clamp(-(s.dx || 0) * 0.0011, -0.06, 0.06), 9, dt);
    this.swayY = damp(this.swayY, clamp((s.dy || 0) * 0.0011, -0.06, 0.06), 9, dt);
    if (!Number.isFinite(this.swayX)) this.swayX = 0;
    if (!Number.isFinite(this.swayY)) this.swayY = 0;
    const sk = 1 - a * 0.75;
    px += this.swayX * 0.35 * sk; py += this.swayY * 0.35 * sk;
    ry += this.swayX * 1.2 * sk; rx += -this.swayY * 0.9 * sk;
    // recoil
    this.kick = damp(this.kick, 0, 16, dt);
    const kk = this.kick * (this.id === 'shotgun' || this.id === 'rocket' || this.id === 'sniper' ? 1.6 : 1);
    pz += kk * 0.04 * (1 - a * 0.4); rx += kk * 0.07 * (1 - a * 0.5); ry += this.kickSide * kk * 0.01;
    // landing dip
    if (s.landed > 2) this.land = Math.min(1, this.land + s.landed / 22);
    this.land = damp(this.land, 0, 7, dt);
    py -= this.land * 0.04; rx -= this.land * 0.06;
    // slide tilt
    this.tilt = damp(this.tilt, s.sliding ? 1 : 0, 9, dt);
    rz += 0.32 * this.tilt * (1 - a); px -= 0.035 * this.tilt * (1 - a); py -= 0.025 * this.tilt;
    // equip
    if (this.equip < 1) this.equip = Math.min(1, this.equip + dt / this.equipTime);
    const e = (S && S.draw) ? 0 : 1 - easeIO(this.equip);
    py -= e * 0.28; rx -= e * 0.8; rz += e * 0.3;
    // reload
    if (m.mag) { m.mag.position.copy(m.magHome); m.mag.visible = true; }
    const magDrop = (d) => { if (!m.mag) return; if (m.axes && m.axes.magDown) m.mag.position.addScaledVector(m.axes.magDown, d); else m.mag.position.y -= d; };
    if (s.reload && S && S.reload) {
      if (!this.relVariant) this.relVariant = s.empty && S.reloadEmpty ? 'reloadEmpty' : 'reload';
    } else if (s.reload) {
      const t = s.reload.t, kind = s.reload.kind;
      if (kind === 'mag') {
        const env = bump(t, 0, 1);
        rz += 0.5 * env; rx += 0.18 * env; py -= 0.05 * env; px -= 0.03 * env;
        if (m.mag) {
          if (t > 0.18 && t < 0.42) magDrop(0.35 * easeIO((t - 0.18) / 0.24));
          else if (t >= 0.42 && t < 0.7) magDrop(0.35 * (1 - easeIO((t - 0.42) / 0.28)));
          if (t > 0.38 && t < 0.46) m.mag.visible = false;
        }
        if (t > 0.78 && t < 0.92) { pz += 0.02 * bump(t, 0.78, 0.92); rx += 0.06 * bump(t, 0.78, 0.92); }
      } else if (kind === 'shell') {
        const env = bump(t, 0, 1);
        rz -= 0.3 * env; rx += 0.25 * env; py -= 0.03 * env;
      } else if (kind === 'cyl') {
        const env = bump(t, 0, 1);
        rz += 0.9 * env; rx += 0.3 * env; px -= 0.04 * env; py -= 0.03 * env;
        if (m.parts.cyl && !m.glb) m.parts.cyl.rotation.z += dt * 18 * bump(t, 0.3, 0.8);
      } else if (kind === 'rocket') {
        const env = bump(t, 0, 1);
        py -= 0.25 * env; rx -= 0.5 * env;
        if (m.parts.rocketHead) m.parts.rocketHead.visible = t > 0.5;
      } else if (kind === 'belt') {
        const env = bump(t, 0, 1);
        rz += 0.35 * env; rx += 0.32 * env; py -= 0.06 * env;
        if (t > 0.15 && t < 0.4) magDrop(0.3 * easeIO((t - 0.15) / 0.25)); else if (t >= 0.4 && t < 0.75) magDrop(0.3 * (1 - easeIO((t - 0.4) / 0.35)));
      }
    } else if (m.parts.rocketHead && s.empty) m.parts.rocketHead.visible = false;
    else if (m.parts.rocketHead) m.parts.rocketHead.visible = true;
    if (!s.reload) this.relVariant = null;
    if (m.glb) this.glbParts(m, s);
    // bolt action
    if (m.parts.bolt && !m.glb) {
      const b = m.parts.bolt;
      b.rotation.z = 0; b.position.z = 0.05;
      if (s.bolt >= 0) {
        const t = s.bolt;
        b.rotation.z = 1.2 * (t < 0.25 ? t / 0.25 : t > 0.75 ? (1 - t) / 0.25 : 1);
        b.position.z = 0.05 + 0.075 * bump(t, 0.25, 0.75);
        rz += 0.12 * bump(t, 0, 1); rx += 0.05 * bump(t, 0, 1);
      }
    }
    if (m.parts.pump && !m.glb) {
      m.parts.pump.position.z = m.parts.pumpHome + (s.pump >= 0 ? 0.08 * bump(s.pump, 0, 1) : 0);
      if (s.pump >= 0) rx += 0.04 * bump(s.pump, 0, 1);
    }
    if (m.parts.slide && !m.glb) m.parts.slide.position.z = this.kick > 0.3 ? 0.025 * Math.min(1, this.kick) : 0;
    // knife swing / quick melee
    if (s.melee >= 0) {
      const t = s.melee;
      if (this.id === 'knife' && S && S.melee) {
        // swing comes from the clip
      } else if (procId(this.id) === 'knife') {
        const sw = t < 0.15 ? t / 0.15 : t < 0.45 ? 1 - (t - 0.15) / 0.3 * 2 : -1 + (t - 0.45) / 0.55;
        ry += sw * 0.9; px += -sw * 0.08; pz -= bump(t, 0.1, 0.5) * 0.12; rz += bump(t, 0.1, 0.5) * 0.6; rx -= bump(t, 0.1, 0.5) * 0.3;
      } else {
        py -= 0.18 * bump(t, 0, 1); rx -= 0.4 * bump(t, 0, 1);
      }
    }
    if (m.glb && s.bolt >= 0 && m.parts.boltSlide) { rz += 0.12 * bump(s.bolt, 0, 1); rx += 0.05 * bump(s.bolt, 0, 1); }
    if (m.glb && s.pump >= 0 && m.parts.pump) rx += 0.04 * bump(s.pump, 0, 1);
    if (A && A.mixer) {
      A.action.time = this.clipTime(m, s);
      A.mixer.update(0);
    }
    this.lastMelee = s.melee;
    m.root.position.set(px, py, pz);
    m.root.rotation.set(rx, ry, rz, 'YXZ');
    m.root.visible = s.visible !== false;
    const ge = typeof GUN_MODELS !== 'undefined' && m.glb ? GUN_MODELS[this.id] : null;
    if (ge && ge.adsHide) {
      if (!m.adsHideNodes) m.adsHideNodes = ge.adsHide.map((n) => m.root.getObjectByName(n)).filter(Boolean);
      for (const o of m.adsHideNodes) o.visible = a < 0.85;
    }
  }
  // which frame of the rig's single clip to show
  clipTime(m, s) {
    const S = m.anim.segs;
    if (s.reload && S.reload) return segTime(S[this.relVariant] || S.reload, s.reload.t);
    if (this.equip < 1 && S.draw) return segTime(S.draw, this.equip);
    if (s.melee >= 0 && S.melee && this.id === 'knife') {
      if (this.lastMelee < 0 || s.melee < this.lastMelee) this.meleeIdx = (this.meleeIdx + 1) % S.melee.length;
      return segTime(S.melee[this.meleeIdx], s.melee);
    }
    if (S.fire) { const d = segLen(S.fire) * 0.8; if (this.fireT < d) return segTime(S.fire, this.fireT / d); }
    if (S.idleLoop) return S.idleLoop[0] + (this.time % (S.idleLoop[1] - S.idleLoop[0]));
    return S.idle || 0;
  }
  // moving parts of static GLB guns (bolt, pump, slide, rocket), along axes measured in gun space
  glbParts(m, s) {
    const P = m.parts;
    const home = (n) => { n.position.copy(n.userData.home.p); n.quaternion.copy(n.userData.home.q); };
    for (const k of ['boltSlide', 'boltTurn', 'pump', 'slide']) if (P[k]) home(P[k]);
    if (s.bolt >= 0) {
      const t = s.bolt;
      if (P.boltTurn) P.boltTurn.quaternion.premultiply(_q1.setFromAxisAngle(P.boltTurn.userData.bore, -1.1 * (t < 0.25 ? t / 0.25 : t > 0.75 ? (1 - t) / 0.25 : 1)));
      if (P.boltSlide) P.boltSlide.position.addScaledVector(P.boltSlide.userData.back, 0.075 * bump(t, 0.25, 0.75));
    }
    if (P.pump && s.pump >= 0) P.pump.position.addScaledVector(P.pump.userData.back, 0.08 * bump(s.pump, 0, 1));
    if (P.slide && this.kick > 0.3) P.slide.position.addScaledVector(P.slide.userData.back, 0.025 * Math.min(1, this.kick));
  }
}
