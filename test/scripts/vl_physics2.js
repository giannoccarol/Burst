// Villette: stairs approached from the side, jumps onto the pickup bed, crate -> garage roof, crates -> bus roof
(() => {
  const G = RAFFICA.Game, W = G.world;
  const M = (x, y, z) => { const m = new G.me.mover.constructor(W); m.reset(x, y, z); return m; };
  const run = (m, secs, inp) => { const dt = 1 / 125; let t = 0, maxY = -1e9; const n = Math.round(secs / dt);
    for (let i = 0; i < n; i++) { const ii = inp(t, m); m.step(dt, Object.assign({ mx: 0, mz: 0, jump: false, jumpPressed: false, crouch: false, yaw: 0, speedMult: 1 }, ii)); t += dt; maxY = Math.max(maxY, m.pos.y); }
    return { pos: m.pos.toArray().map((v) => +v.toFixed(2)), maxY: +maxY.toFixed(2), ground: m.onGround }; };
  const Y = (dx, dz) => Math.atan2(-dx, -dz);
  const out = {};
  out.stairsA = run(M(-9.1, 0.3, -17.5), 4.5, (t) => (t < 0.35 ? { mz: 1, yaw: Y(0, -1) } : { mz: 1, yaw: Y(1, 0) }));
  out.stairsB = run(M(9.1, 0.3, 17.5), 4.5, (t) => (t < 0.35 ? { mz: 1, yaw: Y(0, 1) } : { mz: 1, yaw: Y(-1, 0) }));
  out.pickup = [0.1, 0.2, 0.3, 0.4, 0.5].map((tj) => run(M(-4.6, 0, 0.0), 1.6, (t) => ({ mz: 1, yaw: Y(1, 0), jump: t > tj && t < tj + 0.4 })).pos.join(','));
  out.pickupSide = [0.1, 0.2, 0.3].map((tj) => run(M(-1.7, 0, 2.6), 1.6, (t) => ({ mz: 1, yaw: Y(0, -1), jump: t > tj && t < tj + 0.4 })).pos.join(','));
  out.crateToGarageRoof = [0.0, 0.05, 0.1, 0.15].map((tj) => run(M(9.2, 2.16, -14.1), 1.6, (t) => ({ mz: 1, yaw: Y(-1, 0), jump: t > tj && t < tj + 0.3 })).pos.join(','));
  out.crateToBusRoof = [0.0, 0.05, 0.1].map((tj) => run(M(-17.6, 2.11, 3.6), 1.6, (t) => ({ mz: 1, yaw: Y(0, -1), jump: t > tj && t < tj + 0.3 })).pos.join(','));
  return out;
})()
