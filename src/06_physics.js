// ===================================================================
// Movement physics (Quake-style acceleration, bhop, air strafe, slide)
// ===================================================================
const PHYS = {
  gravity: 25, jumpVel: 8.5, stepH: 0.52, hw: 0.27, // 0.54 m wide body: passes 1.2 m doors without snagging
  hStand: 1.8, hCrouch: 1.25, hSlide: 1.0,
  eyeStand: 1.62, eyeCrouch: 1.08, eyeSlide: 0.84,
  accel: 11, airAccel: 15, airCap: 1.1, airControl: 2.2, friction: 6.2, stopSpeed: 2.6,
  baseSpeed: 6.7, crouchMult: 0.5,
  slideBoost: 3.6, slideMinSpeed: 4.8, slideFriction: 0.85, slideTime: 0.78, slideCooldown: 0.85, maxSpeed: 14,
  coyote: 0.1, jumpBuffer: 0.12,
};

class Mover {
  constructor(world) {
    this.world = world;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.onGround = false; this.crouching = false;
    this.slideT = 0; this.slideCD = 0; this.jumpCD = 0;
    this.height = PHYS.hStand; this.eye = PHYS.eyeStand; this.stepSmooth = 0;
    this.coyoteT = 0; this.jumpBufT = 0;
    this.jumped = false; this.landedSpeed = 0; this.slideStarted = false;
    this.inWater = false; this.groundSurf = 'stone';
    this.airTime = 0;
    this._tmp = [];
  }
  reset(x, y, z) {
    this.pos.set(x, y, z); this.vel.set(0, 0, 0);
    this.onGround = false; this.crouching = false; this.slideT = 0; this.slideCD = 0; this.mantle = null; this.mantleCD = 0;
    this.height = PHYS.hStand; this.eye = PHYS.eyeStand; this.stepSmooth = 0;
  }
  get sliding() { return this.slideT > 0; }
  fits(x, y, z, h) {
    const hw = PHYS.hw - 1e-3;
    return !this.world.overlaps(x - hw, y + 1e-3, z - hw, x + hw, y + h, z + hw);
  }
  canStand() { return this.fits(this.pos.x, this.pos.y, this.pos.z, PHYS.hStand); }
  impulse(x, y, z) {
    this.vel.x += x; this.vel.y += y; this.vel.z += z;
    if (y > 1) { this.onGround = false; this.coyoteT = 0; }
  }
  accelerate(wx, wz, wishSpeed, accel, dt) {
    const cur = this.vel.x * wx + this.vel.z * wz;
    const add = wishSpeed - cur;
    if (add <= 0) return;
    let a = accel * dt * wishSpeed;
    if (a > add) a = add;
    this.vel.x += a * wx; this.vel.z += a * wz;
  }
  airAccelerate(wx, wz, wishSpeed, dt) {
    if (wishSpeed <= 0) return;
    // classic air-strafe acceleration: turning while strafing gains speed
    const ws = Math.min(wishSpeed, PHYS.airCap);
    const cur = this.vel.x * wx + this.vel.z * wz;
    const add = ws - cur;
    if (add > 0) {
      let a = PHYS.airAccel * wishSpeed * dt;
      if (a > add) a = add;
      this.vel.x += a * wx; this.vel.z += a * wz;
    }
    // gentle air control up to running speed (never beyond it)
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs < wishSpeed) {
      const cur2 = this.vel.x * wx + this.vel.z * wz;
      const room = Math.min(wishSpeed - cur2, wishSpeed - hs + 0.5);
      if (room > 0) {
        const a2 = Math.min(PHYS.airControl * wishSpeed * dt, room);
        this.vel.x += a2 * wx; this.vel.z += a2 * wz;
      }
    }
  }
  // inp: { mx, mz (-1..1 right/forward), jump (held), jumpPressed, crouch (held), yaw, speedMult }
  // push the player out of geometry it ended up inside (spawn overlaps, ledge corners)
  unstick() {
    const p = this.pos, hw = PHYS.hw - 2e-3;
    const boxes = this.world.query(p.x - hw, p.y + 0.01, p.z - hw, p.x + hw, p.y + this.height - 0.01, p.z + hw, this._tmp);
    if (!boxes.length) return;
    for (const b of boxes.slice()) {
      if (!(p.x + hw > b.x0 && p.x - hw < b.x1 && p.z + hw > b.z0 && p.z - hw < b.z1 && p.y + this.height > b.y0 && p.y < b.y1)) continue;
      const up = b.y1 - p.y;
      if (up > 0 && up <= PHYS.stepH + 0.25 && this.fits(p.x, b.y1 + 0.001, p.z, this.height)) { p.y = b.y1 + 0.001; continue; }
      const dxn = p.x + hw - b.x0, dxp = b.x1 - (p.x - hw), dzn = p.z + hw - b.z0, dzp = b.z1 - (p.z - hw);
      const m = Math.min(dxn, dxp, dzn, dzp);
      if (m > 1.5) continue;
      if (m === dxn) p.x -= dxn + 1e-3; else if (m === dxp) p.x += dxp + 1e-3; else if (m === dzn) p.z -= dzn + 1e-3; else p.z += dzp + 1e-3;
    }
  }
  step(dt, inp) {
    const P = PHYS;
    this.jumped = false; this.landedSpeed = 0; this.slideStarted = false; this.mantled = false;
    if (this.mantle) { this.stepMantle(dt); return; }
    if (this.mantleCD > 0) this.mantleCD -= dt;
    this.unstick();
    let wx = 0, wz = 0, len = Math.hypot(inp.mx, inp.mz);
    if (len > 1e-3) {
      const f = inp.mz / len, r = inp.mx / len;
      const s = Math.sin(inp.yaw), c = Math.cos(inp.yaw);
      wx = -s * f + c * r; wz = -c * f - s * r;
      len = Math.min(1, len);
    }
    if (this.slideCD > 0) this.slideCD -= dt;
    if (this.jumpCD > 0) this.jumpCD -= dt;
    if (inp.jumpPressed) this.jumpBufT = P.jumpBuffer; else this.jumpBufT = Math.max(0, this.jumpBufT - dt);
    if (this.onGround) { this.coyoteT = P.coyote; this.airTime = 0; } else { this.coyoteT = Math.max(0, this.coyoteT - dt); this.airTime += dt; }
    const hs = Math.hypot(this.vel.x, this.vel.z);
    // crouch / slide
    if (inp.crouch) {
      const fresh = !this.crouching || this.wantSlideOnLand;
      if (fresh && this.onGround && hs > P.slideMinSpeed && this.slideCD <= 0) {
        this.slideT = P.slideTime; this.slideCD = P.slideCooldown; this.slideStarted = true;
        const ns = Math.min(hs + P.slideBoost, P.maxSpeed), k = ns / hs;
        this.vel.x *= k; this.vel.z *= k;
        this.wantSlideOnLand = false;
      } else if (!this.onGround && !this.crouching) {
        this.wantSlideOnLand = true; // crouch pressed in the air: slide when landing
      }
      this.crouching = true;
    } else {
      this.wantSlideOnLand = false;
      if (this.crouching && this.canStand()) this.crouching = false;
      this.slideT = 0;
    }
    if (this.slideT > 0) { this.slideT -= dt; if (hs < 2.5) this.slideT = 0; }
    const sliding = this.slideT > 0;
    const targetH = sliding ? P.hSlide : this.crouching ? P.hCrouch : P.hStand;
    if (targetH > this.height) { if (this.fits(this.pos.x, this.pos.y, this.pos.z, targetH)) this.height = targetH; }
    else this.height = targetH;
    // jump (holding jump = auto bunny hop)
    if ((this.jumpBufT > 0 || inp.jump) && (this.onGround || this.coyoteT > 0) && this.jumpCD <= 0) {
      this.vel.y = P.jumpVel * (this.inWater ? 0.85 : 1);
      this.onGround = false; this.coyoteT = 0; this.jumpBufT = 0; this.jumped = true; this.jumpCD = 0.1;
      if (sliding) this.slideT = 0;
    }
    // friction
    if (this.onGround && !this.jumped) {
      const f = sliding ? P.slideFriction : P.friction;
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > 1e-4) {
        const drop = Math.max(sp, P.stopSpeed) * f * dt;
        const k = Math.max(sp - drop, 0) / sp;
        this.vel.x *= k; this.vel.z *= k;
      }
    }
    // acceleration
    let maxSp = P.baseSpeed * (inp.speedMult || 1);
    if (this.crouching && !sliding) maxSp *= P.crouchMult;
    if (this.inWater) maxSp *= 0.72;
    const wish = maxSp * len;
    if (this.onGround && !this.jumped) {
      if (sliding) this.accelerate(wx, wz, Math.min(wish, 1.6), 3.0, dt);
      else this.accelerate(wx, wz, wish, P.accel, dt);
    } else if (this.jumped) {
      // take-off frame: normal ground acceleration but no friction, so holding
      // jump keeps full running speed and bunny hops preserve momentum
      this.accelerate(wx, wz, wish, P.accel, dt);
    } else {
      this.airAccelerate(wx, wz, wish, dt);
    }
    this.vel.y -= P.gravity * dt;
    const sp2 = Math.hypot(this.vel.x, this.vel.z);
    if (sp2 > P.maxSpeed) { const k = P.maxSpeed / sp2; this.vel.x *= k; this.vel.z *= k; }
    if (this.vel.y < -42) this.vel.y = -42;
    const wasGround = this.onGround;
    const fallSpeed = -this.vel.y;
    this.move(dt, wasGround);
    if (!wasGround && this.onGround) this.landedSpeed = fallSpeed;
    // snap down stairs / slopes when walking off small ledges
    if (wasGround && !this.onGround && !this.jumped && this.vel.y <= 0) {
      const d = this.probeDown(P.stepH + 0.05);
      if (d !== null) { this.pos.y -= d; this.onGround = true; this.vel.y = 0; this.stepSmooth += d; }
    }
    // mantle / vault: holding jump while pushing into a ledge or a window sill we can't simply jump onto
    if (inp.jump && len > 0.3 && this.hitWall && this.vel.y < 3 && !(this.mantleCD > 0) && !this.inWater) this.tryMantle(wx, wz);
    this.inWater = !!this.world.inWater(this.pos.x, this.pos.y + 0.1, this.pos.z);
    const eyeT = sliding ? P.eyeSlide : this.crouching ? P.eyeCrouch : P.eyeStand;
    this.eye = damp(this.eye, eyeT, 13, dt);
    this.stepSmooth = damp(this.stepSmooth, 0, 11, dt);
  }
  // CoD-style mantle: climb a ledge up to ~2 m above the feet, or vault over a sill/low wall to the floor beyond
  tryMantle(wx, wz) {
    const P = PHYS, p = this.pos, W = this.world;
    const ox = p.x + wx * (P.hw + 0.04), oz = p.z + wz * (P.hw + 0.04);
    // first ledge in front of the body (scanning upwards) with room to crouch on it
    let top = -Infinity;
    for (let h = p.y - 0.35; h <= p.y + 2.06; h += 0.05) {
      const t = W.floorBelow(ox, oz, h + 0.001, 0.06);
      if (!isFinite(t) || t < p.y - 0.4) continue;
      if (!W.overlaps(ox - 0.06, t + 0.02, oz - 0.06, ox + 0.06, t + P.hCrouch, oz + 0.06)) { top = t; break; }
    }
    if (!isFinite(top)) return false;
    const rise = top - p.y;
    if (rise > 2.05) return false;
    if (!this.fits(p.x, p.y, p.z, Math.max(this.height, rise + P.hCrouch))) return false;
    let tx = p.x + wx * (P.hw + 0.4), tz = p.z + wz * (P.hw + 0.4), ty = top + 0.01;
    // stand on it only if the ledge is deep enough for the whole body (window sills are vaulted instead)
    const far = P.hw * 2 + 0.36;
    const onTop = Math.abs(W.floorBelow(tx, tz, top + 0.05, P.hw - 0.02) - top) < 0.04 && Math.abs(W.floorBelow(p.x + wx * far, p.z + wz * far, top + 0.05, 0.05) - top) < 0.04 && this.fits(tx, ty, tz, P.hCrouch);
    if (!onTop) {
      let found = false;
      for (let d = 0.2; d <= 1.3 && !found; d += 0.1) {
        const sx = p.x + wx * (P.hw + d), sz = p.z + wz * (P.hw + d);
        if (W.floorBelow(sx, sz, top + 0.05, 0.05) > top - 0.25) continue;
        // the obstacle ends here: land just past it
        const dd = P.hw * 2 + d + 0.05;
        tx = p.x + wx * dd; tz = p.z + wz * dd;
        const fl = W.floorBelow(tx, tz, top + 0.05, P.hw - 0.02);
        if (!isFinite(fl) || top - fl > 2.6) return false;
        ty = fl + 0.01;
        if (!this.fits(tx, ty, tz, P.hCrouch)) return false;
        const mx = p.x + wx * (P.hw + d * 0.5), mz = p.z + wz * (P.hw + d * 0.5);
        if (!this.fits(mx, top + 0.02, mz, P.hCrouch)) return false;
        found = true;
      }
      if (!found) return false;
    }
    this.mantle = { t: 0, dur: 0.2 + rise * 0.1 + (onTop ? 0 : 0.1), x0: p.x, y0: p.y, z0: p.z, x1: tx, y1: ty, z1: tz, top: top + 0.02, sp: Math.hypot(this.vel.x, this.vel.z), wx, wz };
    this.mantled = true; this.vel.set(0, 0, 0);
    this.height = P.hCrouch; this.crouching = true; this.slideT = 0; this.onGround = false;
    return true;
  }
  stepMantle(dt) {
    const m = this.mantle, P = PHYS, p = this.pos;
    m.t += dt;
    const k = Math.min(1, m.t / m.dur);
    const up = Math.min(1, k / 0.55);
    const y = k < 0.55 ? lerp(m.y0, m.top, 1 - (1 - up) * (1 - up)) : lerp(m.top, m.y1, smoothstep(0.55, 1, k));
    const fw = smoothstep(0.45, 1, k);
    p.set(lerp(m.x0, m.x1, fw), y, lerp(m.z0, m.z1, fw));
    this.eye = damp(this.eye, P.eyeCrouch, 13, dt);
    if (k >= 1) {
      this.mantle = null; this.mantleCD = 0.3;
      const keep = clamp(m.sp, 3, 6);
      this.vel.set(m.wx * keep, 0, m.wz * keep);
      this.onGround = true; this.coyoteT = PHYS.coyote; this.jumpCD = 0.15;
      if (this.canStand()) { this.crouching = false; this.height = P.hStand; }
    }
  }
  move(dt, canStep) {
    const v = this.vel;
    const maxComp = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) * dt;
    const steps = Math.min(12, Math.max(1, Math.ceil(maxComp / 0.12)));
    const sdt = dt / steps;
    this.onGround = false;
    this.hitWall = false;
    for (let i = 0; i < steps; i++) {
      this.canStep = canStep || this.onGround;
      this.moveAxis(0, v.x * sdt);
      this.moveAxis(2, v.z * sdt);
      this.moveY(v.y * sdt);
    }
  }
  moveAxis(ax, d) {
    if (d === 0) return;
    const p = this.pos, hw = PHYS.hw;
    const old = ax === 0 ? p.x : p.z;
    if (ax === 0) p.x += d; else p.z += d;
    const boxes = this.world.query(p.x - hw, p.y + 0.002, p.z - hw, p.x + hw, p.y + this.height, p.z + hw, this._tmp);
    if (!boxes.length) return;
    // lowest first so steps resolve before walls
    if (boxes.length > 1) boxes.sort((a, b) => a.y1 - b.y1);
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      // still overlapping with the current position?
      if (!(p.x + hw > b.x0 && p.x - hw < b.x1 && p.z + hw > b.z0 && p.z - hw < b.z1 && p.y + this.height > b.y0 && p.y + 0.002 < b.y1)) continue;
      const bMin = ax === 0 ? b.x0 : b.z0, bMax = ax === 0 ? b.x1 : b.z1;
      if (old + hw > bMin + 1e-4 && old - hw < bMax - 1e-4) continue; // was already inside on this axis
      const rise = b.y1 - p.y;
      if (this.canStep && rise > 0 && rise <= PHYS.stepH && this.fits(p.x, b.y1 + 0.001, p.z, this.height)) {
        p.y = b.y1 + 0.001; this.stepSmooth -= rise; if (this.vel.y < 0) this.vel.y = 0;
        continue;
      }
      if (d > 0) { if (ax === 0) p.x = b.x0 - hw - 1e-4; else p.z = b.z0 - hw - 1e-4; }
      else { if (ax === 0) p.x = b.x1 + hw + 1e-4; else p.z = b.z1 + hw + 1e-4; }
      if (ax === 0) this.vel.x = 0; else this.vel.z = 0;
      this.hitWall = true;
    }
  }
  moveY(d) {
    if (d === 0) return;
    const p = this.pos, hw = PHYS.hw - 2e-4;
    const old = p.y;
    p.y += d;
    const boxes = this.world.query(p.x - hw, p.y, p.z - hw, p.x + hw, p.y + this.height, p.z + hw, this._tmp);
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (!(p.y < b.y1 && p.y + this.height > b.y0)) continue;
      if (d < 0) {
        if (old >= b.y1 - 0.02) { p.y = b.y1; this.vel.y = 0; this.onGround = true; this.groundSurf = b.surf; }
      } else if (old + this.height <= b.y0 + 0.02) {
        p.y = b.y0 - this.height - 1e-4; if (this.vel.y > 0) this.vel.y = 0;
      }
    }
  }
  probeDown(maxd) {
    const p = this.pos, hw = PHYS.hw - 2e-4;
    const boxes = this.world.query(p.x - hw, p.y - maxd, p.z - hw, p.x + hw, p.y + 0.01, p.z + hw, this._tmp);
    let best = -Infinity;
    for (const b of boxes) if (b.y1 <= p.y + 0.01 && b.y1 > best) best = b.y1;
    if (best === -Infinity) return null;
    const d = p.y - best;
    return d >= 0 && d <= maxd ? d : null;
  }
}
