// ===================================================================
// Bots: navigation grid (multi-level), A*, combat AI. Simulated by the host.
// ===================================================================
const Nav = {
  built: false, cell: 1.0, nodes: [], cols: new Map(),
  key(ix, iz) { return (ix + 512) * 1024 + (iz + 512); },
  build(world, b) {
    const t0 = performance.now();
    this.nodes = []; this.cols.clear();
    const hw = 0.3, H = 1.75, c = this.cell, tmp = [];
    const kills = Game.mapInfo && Game.mapInfo.triggers ? Game.mapInfo.triggers.kills : null;
    for (let ix = Math.floor(b.x0); ix < Math.ceil(b.x1); ix++) {
      for (let iz = Math.floor(b.z0); iz < Math.ceil(b.z1); iz++) {
        const x = ix * c + c / 2, z = iz * c + c / 2;
        world.query(x - hw, -1, z - hw, x + hw, 100, z + hw, tmp);
        const tops = [];
        // skip the clip ceiling over the map and anything that high
        // (thin tops like fences, rails and posts are not floors either)
        for (const bx of tmp) if (bx.y1 < 36 && !(bx.flags & F_WATER) && Math.min(bx.x1 - bx.x0, bx.z1 - bx.z0) >= 0.25) tops.push(bx.y1);
        tops.push(0);
        tops.sort((p, q) => p - q);
        const col = [];
        let prev = -99;
        for (const y of tops) {
          if (y - prev < 0.05) continue;
          prev = y;
          if (world.overlaps(x - hw, y + 0.05, z - hw, x + hw, y + H, z + hw)) continue;
          // must actually stand on something
          const fl = world.floorBelow(x, z, y + 0.01, 0.25);
          // on stairs the inner footprint may sit one step lower than the body: still a valid spot
          if (Math.abs(fl - y) > 0.06 && !(fl < y && y - fl <= 0.5)) continue;
          if (kills && kills.some((k) => inBox(k, { x, y: y + 0.3, z }, 0.6))) continue;
          const n = { i: this.nodes.length, x, y, z, ix, iz, links: [] };
          this.nodes.push(n); col.push(n);
        }
        if (col.length) this.cols.set(this.key(ix, iz), col);
      }
    }
    // links
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const n of this.nodes) {
      for (const [dx, dz] of dirs) {
        const col = this.cols.get(this.key(n.ix + dx, n.iz + dz));
        if (!col) continue;
        for (const m of col) {
          const dy = m.y - n.y;
          const flat = Math.hypot(dx, dz) * c;
          if (dy > 1.3 || dy < -4.5) continue;
          const yTop = Math.max(n.y, m.y);
          const mx = (n.x + m.x) / 2, mz = (n.z + m.z) / 2;
          if (world.overlaps(mx - 0.28, yTop + 0.35, mz - 0.28, mx + 0.28, yTop + 1.7, mz + 0.28)) continue;
          if (dx && dz) {
            // no corner cutting
            if (world.overlaps(n.x + dx * c - 0.28, n.y + 0.35, n.z - 0.28, n.x + dx * c + 0.28, n.y + 1.7, n.z + 0.28) ||
                world.overlaps(n.x - 0.28, n.y + 0.35, n.z + dz * c - 0.28, n.x + 0.28, n.y + 1.7, n.z + dz * c + 0.28)) continue;
          }
          let jump = dy > 0.5;
          if (jump && dy <= 1.05) {
            // stairs: walkable when the floor between the two cells rises in steps the mover can climb
            let prev = n.y, ok = true;
            for (let k = 1; k <= 5 && ok; k++) {
              const t = k / 6, fy = world.floorBelow(lerp(n.x, m.x, t), lerp(n.z, m.z, t), m.y + 0.05, 0.05);
              if (!(fy - prev <= 0.5 && fy >= prev - 0.05)) ok = false; else prev = fy;
            }
            if (ok && m.y - prev <= 0.5) jump = false;
          }
          if (jump && world.overlaps(n.x - 0.28, n.y + 1.7, n.z - 0.28, n.x + 0.28, n.y + 3.2, n.z + 0.28)) continue;
          // dropping down: the column above the landing spot must be open up to where we start (no roofs in between)
          if (dy < -0.6 && world.overlaps(m.x - 0.25, m.y + 1.75, m.z - 0.25, m.x + 0.25, n.y + 0.3, m.z + 0.25)) continue;
          n.links.push({ n: m, cost: flat + (jump ? 2.5 : 0) + (dy < -1 ? 1.5 : 0), jump });
        }
      }
    }
    // keep track of what can actually be reached from the spawns, so random goals are never islands
    const reach = new Uint8Array(this.nodes.length), queue = [];
    for (const sp of (Game.mapInfo && Game.mapInfo.spawns) || []) { const n = this.nearest(sp.x, sp.y, sp.z, true); if (n && !reach[n.i]) { reach[n.i] = 1; queue.push(n); } }
    while (queue.length) { const n = queue.pop(); for (const L of n.links) if (!reach[L.n.i]) { reach[L.n.i] = 1; queue.push(L.n); } }
    this.reach = this.nodes.filter((n) => reach[n.i]);
    if (this.reach.length < 20) this.reach = this.nodes;
    this.built = true;
    this.buildMs = performance.now() - t0;
  },
  // closest node that is actually in sight (not behind a wall or on another floor); falls back to the plain closest
  nearest(x, y, z, plain) {
    const ix = Math.floor(x / this.cell), iz = Math.floor(z / this.cell);
    let best = null, bd = 1e9, any = null, ad = 1e9;
    const W = Game.world;
    for (let r = 0; r <= 3 && !best; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        const col = this.cols.get(this.key(ix + dx, iz + dz));
        if (!col) continue;
        for (const n of col) {
          const d = Math.hypot(n.x - x, n.z - z) + Math.abs(n.y - y) * 3;
          if (d < ad) { ad = d; any = n; }
          if (d < bd && (plain || !W || (n.y < y + 0.9 && W.clear(x, y + 0.6, z, n.x, n.y + 0.6, n.z)))) { bd = d; best = n; }
        }
      }
    }
    return best || any;
  },
  path(from, to, maxIter = 6000) {
    if (!from || !to) return null;
    if (from === to) return [to];
    const open = [from], g = new Map([[from.i, 0]]), came = new Map(), closed = new Set();
    const h = (n) => Math.hypot(n.x - to.x, n.z - to.z) + Math.abs(n.y - to.y);
    const f = new Map([[from.i, h(from)]]);
    let it = 0;
    while (open.length && it++ < maxIter) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f.get(open[i].i) < f.get(open[bi].i)) bi = i;
      const cur = open[bi];
      if (cur === to) {
        const p = [cur];
        let k = cur;
        while (came.has(k.i)) { k = came.get(k.i); p.push(k); }
        return p.reverse();
      }
      open.splice(bi, 1);
      closed.add(cur.i);
      for (const L of cur.links) {
        if (closed.has(L.n.i)) continue;
        const ng = g.get(cur.i) + L.cost;
        if (ng < (g.has(L.n.i) ? g.get(L.n.i) : Infinity)) {
          came.set(L.n.i, cur); g.set(L.n.i, ng); f.set(L.n.i, ng + h(L.n));
          if (!open.includes(L.n)) open.push(L.n);
        }
      }
    }
    return null;
  },
  random() { const a = this.reach && this.reach.length ? this.reach : this.nodes; return a[Math.floor(Math.random() * a.length)]; },
};

const BOT_DIFF = [
  { react: 0.6, turn: 3.0, err: 0.075, fireTol: 0.08, strafe: 0.4 },
  { react: 0.38, turn: 5.5, err: 0.045, fireTol: 0.05, strafe: 0.7 },
  { react: 0.22, turn: 9.0, err: 0.025, fireTol: 0.035, strafe: 1.0 },
];

class Bot {
  constructor(id, name, cls) {
    this.ent = new Ent(id, 'bot');
    this.ent.name = 'BOT ' + name; this.botName = name;
    this.cls = cls; this.ent.cls = cls;
    this.mover = new Mover(Game.world);
    this.stats = { k: 0, d: 0, a: 0, sc: 0, lvl: 0 };
    this.respawnT = rnd(0.5, 2); this.ammo = 0; this.nextFire = 0; this.reloadT = 0;
    this.target = null; this.reactT = 0; this.aimErr = new THREE.Vector2(); this.path = null; this.pathI = 0; this.repathT = 0; this.goal = null;
    this.strafeT = 0; this.strafeDir = 1; this.jumpT = rnd(1, 4); this.stuckT = 0; this.lastPos = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.dmgFrom = new Map(); this.hp = 100; this.weapon = 'ar'; this.vote = rndi(0, 2);
    this.thinkT = 0; this.crouchT = 0; this.slideWant = false; this.spawnProt = 0; this.regenT = 0;
  }
  get diff() { return BOT_DIFF[clamp(Game.roomCfg.diff | 0, 0, 2)]; }
  loadout() {
    const mode = Game.mode();
    const c = CLASSES[this.cls];
    if (mode.id === 'gun') this.weapon = GUNGAME_LIST[Math.min(this.stats.lvl, GUNGAME_LIST.length - 1)];
    else if (mode.id === 'inf' && this.ent.team === 2) this.weapon = 'knife';
    else this.weapon = c.primary;
    this.maxHp = mode.id === 'inf' && this.ent.team === 2 ? 150 : mode.id === 'gun' ? 100 : c.hp;
    this.speed = (mode.id === 'gun' ? 1.05 : c.speed) * (mode.id === 'inf' && this.ent.team === 2 ? 1.12 : 1) * 0.94;
    this.ammo = WEAPONS[this.weapon].mag || 0;
  }
  spawn() {
    this.loadout();
    const sp = Game.pickSpawn(this.ent.team, this.ent.id);
    this.mover.world = Game.world;
    this.mover.reset(sp.x, sp.y + 0.02, sp.z);
    this.yaw = sp.yaw; this.pitch = 0;
    this.hp = this.maxHp; this.ent.alive = true; this.spawnProt = 1.5; this.regenT = 0;
    this.target = null; this.path = null; this.dmgFrom.clear(); this.reloadT = 0;
    Net.pushEvent(EV.SPAWN, this.ent.id, r2(sp.x), r2(sp.y), r2(sp.z));
    if (this.ent.avatar) this.ent.avatar.revive();
  }
  die(killer, silent, wIdx = 0, head = false) {
    if (!this.ent.alive) return;
    this.ent.alive = false;
    this.respawnT = (RESPAWN[Game.mode().id] || 3) + rnd(0.2, 1.2);
    if (silent) return;
    this.stats.d++;
    let assist = '', best = 0;
    const now = performance.now();
    for (const [id, d] of this.dmgFrom) if (id !== killer && now - d.t < 8000 && d.dmg > best && d.dmg >= 25) { best = d.dmg; assist = id; }
    const mode = Game.mode();
    if (mode.id === 'gun' && wIdx === WIDX.knife && killer !== this.ent.id) this.stats.lvl = Math.max(0, this.stats.lvl - 1);
    Net.pushEvent(EV.DIE, this.ent.id, killer || '', wIdx, head ? 1 : 0, assist, 0);
    Game.handleDeath(this.ent.id, killer, wIdx, head, assist, 0);
  }
  damage(attacker, dmg, head, wIdx) {
    if (!this.ent.alive || this.spawnProt > 0) return;
    if (attacker !== this.ent.id && Game.mode().teams && Game.teamOf(attacker) === this.ent.team && this.ent.team) return;
    this.hp -= dmg; this.regenT = 0;
    const d = this.dmgFrom.get(attacker) || { dmg: 0, t: 0 }; d.dmg += dmg; d.t = performance.now(); this.dmgFrom.set(attacker, d);
    // react to being shot
    if (!this.target || Math.random() < 0.5) { const p = Game.posOf(attacker); if (p && attacker !== this.ent.id) { this.alertPos = p.clone(); this.reactT = Math.min(this.reactT, this.diff.react * 0.6); } }
    if (this.hp <= 0) this.die(attacker, false, wIdx, head);
  }
  splash(p, owner) {
    if (!this.ent.alive) return;
    const def = WEAPONS.rocket;
    const c = this.mover.pos.clone(); c.y += 0.9;
    const d = c.distanceTo(p);
    if (d >= def.radius || !Game.world.clear(p.x, p.y + 0.2, p.z, c.x, c.y, c.z)) return;
    const f = 1 - d / def.radius;
    const dir = c.clone().sub(p).normalize(); dir.y = Math.max(dir.y, 0.35);
    this.mover.impulse(dir.x * def.knock * f, dir.y * def.knock * f, dir.z * def.knock * f);
    const self = owner === this.ent.id;
    this.damage(owner, Math.round(def.dmg * f * (self ? def.selfMult : 1)), false, WIDX.rocket);
  }
  snapshot() {
    const m = this.mover, e = this.ent;
    const flags = (e.alive ? F_ALIVE : 0) | (m.crouching ? F_CROUCH : 0) | (m.sliding ? F_SLIDE : 0) | (m.onGround ? F_GROUND : 0) | (this.spawnProt > 0 ? F_PROT : 0);
    return [e.id, this.botName, this.cls, e.team, r2(m.pos.x), r2(m.pos.y), r2(m.pos.z), r3(this.yaw), r3(this.pitch), flags, WIDX[this.weapon], Math.max(0, Math.round(this.hp)), this.stats.k, this.stats.d, this.stats.sc, this.stats.lvl];
  }
  eye() { return new THREE.Vector3(this.mover.pos.x, this.mover.pos.y + this.mover.eye, this.mover.pos.z); }
  canSee(p, fromEye) {
    const e = fromEye || this.eye();
    return Game.world.clear(e.x, e.y, e.z, p.x, p.y, p.z);
  }
  pickTarget() {
    const mode = Game.mode();
    const eye = this.eye();
    let best = null, bd = 1e9;
    for (const c of Game.combatants()) {
      if (!c.alive || c.id === this.ent.id) continue;
      if (mode.teams && Game.teamOf(c.id) === this.ent.team && this.ent.team) continue;
      const d = c.pos.distanceTo(this.mover.pos);
      if (d > 70) continue;
      // field of view (wide) unless very close
      const to = new THREE.Vector3(c.pos.x - eye.x, 0, c.pos.z - eye.z).normalize();
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      if (to.dot(fwd) < -0.2 && d > 6) continue;
      const head = new THREE.Vector3(c.pos.x, c.pos.y + 1.4, c.pos.z);
      if (!this.canSee(head, eye)) continue;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  goalFor() {
    const mode = Game.mode(), g = Game.g;
    if (mode.id === 'hp' && g && g.hz && ZONES()[g.hz[0]]) { const z = ZONES()[g.hz[0]]; const c = zoneCenter(z); return new THREE.Vector3(c[0] + rnd(-2, 2), c[1], c[2] + rnd(-2, 2)); }
    if (mode.id === 'ctf' && g && g.fl) {
      const my = this.ent.team, enemyFlag = g.fl[my === 1 ? 1 : 0], ownFlag = g.fl[my === 1 ? 0 : 1];
      const base = FLAGS_POS()[my - 1];
      if (enemyFlag[4] === this.ent.id) return new THREE.Vector3(base[0], base[1], base[2]);
      if (ownFlag[0] !== 0 && Math.random() < 0.6) return new THREE.Vector3(ownFlag[1], ownFlag[2], ownFlag[3]);
      if (Math.random() < 0.65) return new THREE.Vector3(enemyFlag[1], enemyFlag[2], enemyFlag[3]);
    }
    // hunt: head toward the nearest enemy loosely, otherwise roam
    const mode2 = Game.mode();
    let best = null, bd = 1e9;
    for (const c of Game.combatants()) {
      if (!c.alive || c.id === this.ent.id) continue;
      if (mode2.teams && Game.teamOf(c.id) === this.ent.team && this.ent.team) continue;
      const d = c.pos.distanceTo(this.mover.pos);
      if (d < bd) { bd = d; best = c; }
    }
    if (best && (Math.random() < 0.55 || (mode.id === 'inf' && this.ent.team === 2))) return best.pos.clone().add(new THREE.Vector3(rnd(-3, 3), 0, rnd(-3, 3)));
    const n = Nav.random();
    return n ? new THREE.Vector3(n.x, n.y, n.z) : null;
  }
  update(dt, now) {
    const e = this.ent, m = this.mover;
    if (!e.alive) {
      if (Game.g && Game.g.ph === 1) return;
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.spawn();
      return;
    }
    if (this.spawnProt > 0) this.spawnProt -= dt;
    this.regenT += dt;
    if (this.regenT > 5 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 20 * dt);
    const D = this.diff;
    const def = WEAPONS[this.weapon];
    // perception (throttled)
    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.12 + Math.random() * 0.08;
      const t = this.pickTarget();
      if (t && (!this.target || t.id !== this.target.id)) { this.reactT = D.react * rnd(0.8, 1.3); this.aimErr.set(gauss() * D.err * 2.2, gauss() * D.err * 1.6); }
      this.target = t;
    }
    let mx = 0, mz = 0, jump = false, crouch = false;
    let wantYaw = this.yaw, wantPitch = 0;
    const eye = this.eye();
    const melee = def.type === 'melee';
    if (this.target) {
      const tp = this.target.pos;
      const aimH = melee ? 1.0 : (Math.random() < 0.3 ? 1.55 : 1.2);
      const aim = new THREE.Vector3(tp.x, tp.y + aimH, tp.z);
      const dx = aim.x - eye.x, dy = aim.y - eye.y, dz = aim.z - eye.z;
      const dist = Math.hypot(dx, dz);
      wantYaw = Math.atan2(-dx, -dz) + this.aimErr.x;
      wantPitch = Math.atan2(dy, dist) + this.aimErr.y;
      this.aimErr.multiplyScalar(Math.pow(0.25, dt));
      // movement while fighting
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeT = rnd(0.6, 1.6); this.strafeDir = Math.random() < 0.5 ? -1 : 1; if (Math.random() < 0.12 * D.strafe) this.jumpWant = true; }
      if (melee || (this.ent.team === 2 && Game.mode().id === 'inf')) {
        mz = 1; mx = this.strafeDir * 0.3;
        if (dist > 6 && m.onGround && Math.random() < 0.02) crouch = true;
      } else {
        const ideal = this.weapon === 'sniper' ? 30 : this.weapon === 'shotgun' ? 6 : this.weapon === 'smg' ? 10 : 16;
        mz = dist > ideal + 6 ? 1 : dist < ideal - 6 ? -0.6 : 0;
        mx = this.strafeDir * D.strafe;
      }
      if (this.jumpWant && m.onGround) { jump = true; this.jumpWant = false; }
      this.path = null;
      // fire
      this.reactT -= dt;
      const yawErr = Math.abs(angleDiff(this.yaw, wantYaw)), pitchErr = Math.abs(this.pitch - wantPitch);
      const tol = D.fireTol + (def.spread ? def.spread.hip * 0.5 : 0) + 0.4 / Math.max(dist, 1);
      if (this.reactT <= 0 && yawErr < tol && pitchErr < tol) {
        if (melee) { if (dist < 2.3) this.tryFire(now, true); }
        else this.tryFire(now, false);
      }
    } else {
      // navigation
      if (!Nav.built) Nav.build(Game.world, Game.mapInfo.bounds);
      this.repathT -= dt;
      if (this.alertPos && (!this.path || this.repathT <= 0)) { this.goal = this.alertPos; this.alertPos = null; this.path = null; }
      if (!this.path || this.repathT <= 0 || this.pathI >= this.path.length) {
        this.repathT = rnd(3, 6);
        if (!this.goal || Math.random() < 0.6 || m.pos.distanceTo(this.goal) < 2) this.goal = this.goalFor();
        const a = Nav.nearest(m.pos.x, m.pos.y, m.pos.z), b = this.goal ? Nav.nearest(this.goal.x, this.goal.y, this.goal.z) : null;
        this.path = Nav.path(a, b);
        this.pathI = 1;
      }
      if (this.path && this.pathI < this.path.length) {
        let wp = this.path[this.pathI];
        // skip ahead when the next waypoint is reachable directly
        if (this.pathI + 1 < this.path.length) {
          const nx = this.path[this.pathI + 1];
          if (Math.abs(nx.y - m.pos.y) < 0.4 && Game.world.clear(m.pos.x, m.pos.y + 0.6, m.pos.z, nx.x, nx.y + 0.6, nx.z)) { this.pathI++; wp = nx; }
        }
        const dx = wp.x - m.pos.x, dz = wp.z - m.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.6 && Math.abs(wp.y - m.pos.y) < 1.2) this.pathI++;
        wantYaw = Math.atan2(-dx, -dz);
        mz = 1;
        if (wp.y - m.pos.y > 0.55 && d < 1.6) jump = true;
        // occasional slide-hop on long straight runs
        const hs = Math.hypot(m.vel.x, m.vel.z);
        if (hs > 7.5 && m.onGround && Math.random() < 0.015) { crouch = true; this.crouchT = 0.35; }
        this.jumpT -= dt;
        if (this.jumpT <= 0) { this.jumpT = rnd(2, 6); if (Math.random() < 0.35) jump = true; }
        wantPitch = 0;
      }
      // stuck detection
      this.stuckT += dt;
      if (this.stuckT > 0.8) {
        if (this.lastPos.distanceTo(m.pos) < 0.4 && mz) { jump = true; this.repathT = 0; if (Math.random() < 0.5) this.goal = null; }
        this.lastPos.copy(m.pos); this.stuckT = 0;
      }
      // reload while walking
      if (def.mag && this.ammo < def.mag * 0.5 && this.reloadT <= 0) this.reloadT = def.reload * (def.shells ? def.mag - this.ammo : 1);
    }
    if (this.crouchT > 0) { this.crouchT -= dt; crouch = true; }
    // turn toward wanted direction at limited speed
    const turn = D.turn * dt;
    this.yaw += clamp(angleDiff(this.yaw, wantYaw), -turn, turn);
    this.pitch += clamp(wantPitch - this.pitch, -turn, turn);
    // reload timer
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.ammo = def.mag; }
    // move relative to facing
    m.step(dt, { mx, mz, jump, jumpPressed: jump, crouch, yaw: this.yaw, speedMult: this.speed * (def.speed || 1) });
    if (m.pos.y < -30) this.die(this.ent.id, false, 0, false);
    const trg = Game.mapTriggers(m);
    if (trg === 'kill') this.die(this.ent.id, false, 0, false);
    else if (trg && trg.tele && now > (this.teleT || 0)) { m.pos.set(trg.tele.x, trg.tele.y, trg.tele.z); this.yaw = trg.tele.yaw; this.path = null; this.teleT = now + 700; }
    e.pos.copy(m.pos); e.yaw = this.yaw; e.pitch = this.pitch; e.vel.copy(m.vel);
    e.flags = (e.alive ? F_ALIVE : 0) | (m.crouching ? F_CROUCH : 0) | (m.sliding ? F_SLIDE : 0) | (m.onGround ? F_GROUND : 0) | (this.spawnProt > 0 ? F_PROT : 0);
    e.w = WIDX[this.weapon]; e.hp = this.hp; e.k = [this.stats.k, this.stats.d, 0, this.stats.sc, 0, this.stats.lvl, 0];
  }
  tryFire(now, melee) {
    const def = WEAPONS[this.weapon];
    if (now < this.nextFire || this.reloadT > 0) return;
    if (!melee && def.mag && this.ammo <= 0) { this.reloadT = def.reload * (def.shells ? def.mag : 1); return; }
    this.nextFire = now + 60000 / def.rpm * (melee ? 1 : rnd(1.0, 1.25));
    this.spawnProt = 0;
    const eye = this.eye();
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    const wIdx = WIDX[this.weapon];
    if (melee) {
      Net.pushEvent(EV.MELEE, this.ent.id);
      SFX.swing(this.mover.pos);
      if (this.ent.avatar) this.ent.avatar.fire();
      const t = this.target;
      if (t && t.pos.distanceTo(this.mover.pos) < 2.4) this.hitTarget(t.id, def.dmg, false, wIdx);
      return;
    }
    this.ammo--;
    if (def.type === 'rocket') {
      const o = eye.clone().addScaledVector(dir, 0.6);
      Game.launchRocket(this.ent.id, o, dir, false).waitBoom = false;
      Net.pushEvent(EV.ROCKET, this.ent.id, r2(o.x), r2(o.y), r2(o.z), r3(dir.x), r3(dir.y), r3(dir.z));
      if (this.ent.avatar) this.ent.avatar.fire();
      return;
    }
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    const hs = Math.hypot(this.mover.vel.x, this.mover.vel.z);
    const spread = def.spread.hip * 0.8 + def.spread.move * clamp(hs / 8, 0, 1) * 0.5 + (this.mover.onGround ? 0 : def.spread.air * 0.5);
    const pellets = def.pellets || 1;
    const hits = new Map();
    let first = null, firstSurf = 0;
    for (let i = 0; i < pellets; i++) {
      const d = Game.applySpread(dir, spread, right, up);
      const tr = Game.trace(eye, d, 250, this.ent.id);
      const end = eye.clone().addScaledVector(d, tr.t);
      if (tr.ent) {
        const r = def.range || [999, 999, 1];
        const fall = tr.t <= r[0] ? 1 : tr.t >= r[1] ? r[2] : lerp(1, r[2], (tr.t - r[0]) / (r[1] - r[0]));
        const mult = tr.part === 'head' ? def.head : tr.part === 'legs' ? 0.85 : 1;
        const h = hits.get(tr.ent.id) || { id: tr.ent.id, dmg: 0, head: false };
        h.dmg += def.dmg * mult * fall; h.head = h.head || tr.part === 'head';
        hits.set(tr.ent.id, h);
        FX.impact(end.x, end.y, end.z, -d.x, -d.y, -d.z, 'flesh');
      } else if (tr.hit) {
        FX.impact(tr.hit.x, tr.hit.y, tr.hit.z, tr.hit.nx, tr.hit.ny, tr.hit.nz, tr.hit.surf, 0.7);
        if (tr.hit.surf !== 'water') FX.decal(tr.hit.x, tr.hit.y, tr.hit.z, tr.hit.nx, tr.hit.ny, tr.hit.nz, 0.1);
      }
      if (!first) { first = end; firstSurf = tr.ent ? 6 : tr.hit ? Math.max(1, SURF_IDS.indexOf(tr.hit.surf)) : 0; }
    }
    // visuals on the host
    const av = this.ent.avatar;
    const mz = av && av.gun ? av.gun.localToWorld(av.gun.userData.muzzle.clone()) : eye;
    FX.muzzle(mz.x, mz.y, mz.z, dir.x, dir.y, dir.z, this.weapon === 'shotgun' ? 1.3 : 1);
    FX.tracer(mz.x, mz.y, mz.z, first.x, first.y, first.z, [1, 0.8, 0.5], 380, 0.022);
    SFX.shot(this.weapon, mz);
    if (av) av.fire();
    Net.pushEvent(EV.SHOT, this.ent.id, wIdx, r2(eye.x), r2(eye.y - 0.15), r2(eye.z), r2(first.x), r2(first.y), r2(first.z), firstSurf);
    for (const h of hits.values()) this.hitTarget(h.id, Math.round(h.dmg), h.head, wIdx);
  }
  hitTarget(id, dmg, head, wIdx) {
    if (id === Game.myId()) Game.damageMe(this.ent.id, dmg, head, wIdx, this.eye());
    else { const b = Game.botById(id); if (b) b.damage(this.ent.id, dmg, head, wIdx); else Net.pushEvent(EV.HIT, this.ent.id, id, dmg, head ? 1 : 0, wIdx); }
  }
}

// host: keep the right number of bots and simulate them
Game.updateBotsHost = function (dt, now) {
  const want = this.desiredBots();
  if (this.bots.length < want) {
    if (!Nav.built && this.world) Nav.build(this.world, this.mapInfo.bounds);
    const used = new Set(this.bots.map((b) => b.botName));
    const name = BOT_NAMES.find((n) => !used.has(n)) || ('Bot' + rndi(10, 99));
    const id = 'b' + Math.random().toString(36).slice(2, 7);
    const b = new Bot(id, name, rndi(0, CLASSES.length - 1));
    this.bots.push(b);
  } else if (this.bots.length > want) {
    const b = this.bots.pop();
    b.ent.disposeAvatar(R.scene);
  }
  const g = this.g;
  for (const b of this.bots) {
    if (g && g.t && g.t[b.ent.id] != null) b.ent.team = g.t[b.ent.id];
    const mode = this.mode();
    if (mode.id === 'gun' && b.ent.alive && b.weapon !== GUNGAME_LIST[Math.min(b.stats.lvl, GUNGAME_LIST.length - 1)]) b.loadout();
    if (mode.id === 'inf' && b.ent.alive && b.ent.team === 2 && b.weapon !== 'knife') b.loadout();
    b.update(dt, now);
  }
};
Game.desiredBots = function () {
  const humans = 1 + Array.from(Net.peers.values()).filter((p) => p.valid).length;
  const cfg = this.roomCfg.bots | 0;
  return Math.max(0, Math.min(cfg, 10 - humans));
};
// credit bots for kills (host)
const _handleDeath = Game.handleDeath;
Game.handleDeath = function (victim, killer, wIdx, head, assist, streak) {
  _handleDeath.call(this, victim, killer, wIdx, head, assist, streak);
  if (!this.isHost()) return;
  const kb = this.botById(killer);
  if (kb && killer !== victim) {
    kb.stats.k++; kb.stats.sc += 100 + (head ? 25 : 0);
    if (this.mode().id === 'gun') { kb.stats.lvl++; if (kb.ent.alive) kb.loadout(); }
    if (kb.target && kb.target.id === victim) kb.target = null;
  }
  const ab = this.botById(assist);
  if (ab) { ab.stats.a++; ab.stats.sc += 50; }
};
