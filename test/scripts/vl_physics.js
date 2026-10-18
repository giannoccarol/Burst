// Villette walk-through checks with the real Mover: house doors and stairs, bus doors, truck steps, pickup bed
(() => {
  const G = RAFFICA.Game, W = G.world;
  const M = (x, y, z) => { const m = new G.me.mover.constructor(W); m.reset(x, y, z); return m; };
  const run = (m, secs, inp) => { const dt = 1 / 125; let t = 0, maxY = -1e9; const n = Math.round(secs / dt);
    for (let i = 0; i < n; i++) { const ii = typeof inp === 'function' ? inp(t, m) : inp; m.step(dt, Object.assign({ mx: 0, mz: 0, jump: false, jumpPressed: false, crouch: false, yaw: 0, speedMult: 1 }, ii)); t += dt; maxY = Math.max(maxY, m.pos.y); }
    return { pos: m.pos.toArray().map((v) => +v.toFixed(2)), maxY: +maxY.toFixed(2), ground: m.onGround }; };
  const Y = (dx, dz) => Math.atan2(-dx, -dz);
  const out = {};
  out.frontDoorA = run(M(-4.5, 0.14, -7.5), 2.0, { mz: 1, yaw: Y(0, -1) });            // into the yellow house (z < -12.25 = inside)
  out.frontDoorB = run(M(4.5, 0.14, 7.5), 2.0, { mz: 1, yaw: Y(0, 1) });
  out.backDoorA = run(M(-0.5, 0, -22.5), 2.0, { mz: 1, yaw: Y(0, 1) });               // kitchen back door, inside z > -19.75
  out.stairsA = run(M(-9.4, 0.3, -19.05), 3.5, { mz: 1, yaw: Y(1, 0) });              // should end at y 3.4
  out.stairsB = run(M(9.4, 0.3, 19.05), 3.5, { mz: 1, yaw: Y(-1, 0) });
  out.busRearStand = run(M(-15.0, 0, 1.5), 2.0, { mz: 1, yaw: Y(-1, 0) });           // inside = x < -16.4, y 0.95
  out.busRearCrouch = run(M(-15.0, 0, 1.5), 3.0, { mz: 1, crouch: true, yaw: Y(-1, 0) });
  out.busSideStand = run(M(-24.5, 0, -1.2), 2.0, { mz: 1, yaw: Y(0, 1) });           // inside = z > 0.35
  out.busSideCrouch = run(M(-24.5, 0, -1.2), 3.0, { mz: 1, crouch: true, yaw: Y(0, 1) });
  out.truckRear = run(M(26.8, 0, -1.5), 2.0, { mz: 1, yaw: Y(-1, 0) });              // cargo floor y 1.0, x < 25
  out.pickupBed = run(M(-4.2, 0, 0.0), 1.5, (t) => ({ mz: 1, yaw: Y(1, 0), jumpPressed: t > 0.3 && t < 0.32 })); // jump into the bed from behind
  out.garageCrates = run(M(10.6, 0, -12.6), 3.0, (t) => ({ mz: 1, yaw: Y(-0.6, -1), jumpPressed: (t > 0.25 && t < 0.27) || (t > 0.9 && t < 0.92) || (t > 1.6 && t < 1.62) }));
  return out;
})()
