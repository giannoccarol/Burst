// Villette house stairs with the real Mover: mount the low steps from the living room side, then climb along +x
(() => {
  const G = RAFFICA.Game, W = G.world;
  const M = (x, y, z) => { const m = new G.me.mover.constructor(W); m.reset(x, y, z); return m; };
  const run = (m, secs, inp) => { const dt = 1 / 125; let t = 0, maxY = -1e9; const n = Math.round(secs / dt);
    for (let i = 0; i < n; i++) { m.step(dt, Object.assign({ mx: 0, mz: 0, jump: false, jumpPressed: false, crouch: false, yaw: 0, speedMult: 1 }, inp(t, m))); t += dt; maxY = Math.max(maxY, m.pos.y); }
    return [m.pos.x, m.pos.y, m.pos.z].map((v) => v.toFixed(2)).join(',') + ' maxY ' + maxY.toFixed(2); };
  const Y = (dx, dz) => Math.atan2(-dx, -dz);
  const out = {};
  for (const x of [-9.3, -9.0, -8.6]) out['A_x' + x] = run(M(x, 0.3, -17.4), 5, (t) => (t < 1.0 ? { mz: 1, yaw: Y(0, -1) } : { mz: 1, yaw: Y(1, 0) }));
  for (const x of [9.3, 9.0]) out['B_x' + x] = run(M(x, 0.3, 17.4), 5, (t) => (t < 1.0 ? { mz: 1, yaw: Y(0, 1) } : { mz: 1, yaw: Y(-1, 0) }));
  out.A_jumpOn = run(M(-9.0, 0.3, -17.4), 5, (t) => (t < 1.0 ? { mz: 1, yaw: Y(0, -1), jump: t > 0.2 && t < 0.5 } : { mz: 1, yaw: Y(1, 0) }));
  const tmp = []; W.query(-9.75, 0, -18.6, -9.0, 1, -18.3, tmp); out.lowSteps = tmp.map((b) => [b.x0, b.y0, b.z0, b.x1, b.y1, b.z1].map((v) => +v.toFixed(2)).join(',') + ' f' + b.flags);
  // spawn floors with a tight probe
  out.spawnFloor = G.mapInfo.spawns.map((s, i) => { const f = W.floorBelow(s.x, s.z, s.y + 0.6, 0.3); return Math.abs(f - s.y) > 0.05 ? i + ':' + [s.x, s.y, s.z].join(',') + '->' + f.toFixed(2) : null; }).filter(Boolean);
  return out;
})()
