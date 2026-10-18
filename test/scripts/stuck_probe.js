// records bots that do not move for >= 5 s while they have no target: position, goal, path state (window.__stk)
(() => {
  const G = window.RAFFICA.Game;
  if (window.__stk) return 'already';
  const S = window.__stk = { ep: [], cur: {}, nullPath: 0, samples: 0, roofGoals: 0 };
  setInterval(() => {
    for (const b of G.bots) {
      if (!b.ent.alive) { delete S.cur[b.botName]; continue; }
      const p = b.mover.pos; S.samples++;
      if (!b.path && !b.target) S.nullPath++;
      if (b.goal && b.goal.y > 39) S.roofGoals++;
      const c = S.cur[b.botName];
      if (c && Math.hypot(p.x - c.x, p.z - c.z) < 0.3 && !b.target) {
        c.n++;
        if (c.n === 5) S.ep.push({ bot: b.botName, at: [p.x, p.y, p.z].map((v) => +v.toFixed(2)), t: Math.round(G.time), goal: b.goal && [b.goal.x, b.goal.y, b.goal.z].map((v) => +v.toFixed(1)), path: b.path ? b.path.length + ' i' + b.pathI + ' next ' + (b.path[b.pathI] ? [b.path[b.pathI].x, +b.path[b.pathI].y.toFixed(2), b.path[b.pathI].z].join(',') : '-') : null, vel: +Math.hypot(b.mover.vel.x, b.mover.vel.z).toFixed(2), ground: b.mover.onGround, flag: G.g && G.g.fl ? G.g.fl.map((f) => f[4] === b.ent.id ? 'C' : '-').join('') : '' });
      } else S.cur[b.botName] = { x: p.x, z: p.z, n: 0 };
    }
  }, 1000);
  return 'stuck probe on';
})()
