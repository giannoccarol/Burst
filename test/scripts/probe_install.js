// installs a 1 s sampler of the match state into window.__probe (read it with probe_summary.js)
(() => {
  const G = window.RAFFICA.Game;
  if (window.__probe) return 'already';
  const P = window.__probe = { t0: G.time, n: 0, zoneOwn: {}, zoneIdx: {}, flagTaken: 0, flagDropped: 0, flagState: [], caps: 0, infMax: 0, infSeries: [], dist: {}, last: {}, stuck: {}, stuckAt: {}, kills: 0, maps: {}, phases: [], gids: [] };
  P.timer = setInterval(() => {
    try {
      const g = G.g; P.n++;
      P.maps[G.mapId] = (P.maps[G.mapId] || 0) + 1;
      if (!g) return;
      if (!P.gids.includes(g.id)) P.gids.push(g.id);
      const ph = g.m + ':' + g.ph; if (P.phases[P.phases.length - 1] !== ph) P.phases.push(ph);
      if (g.hz) { const k = g.hz[0] + '/' + g.hz[1]; P.zoneOwn[k] = (P.zoneOwn[k] || 0) + 1; P.zoneIdx[g.hz[0]] = 1; }
      if (g.fl) {
        const s = g.fl.map((f) => f[0]).join('');
        if (P.flagState[P.flagState.length - 1] !== s) { P.flagState.push(s); for (let i = 0; i < 2; i++) if (g.fl[i][0] === 1) P.flagTaken++; }
      }
      if (g.inf != null) { const inf = Object.values(g.t).filter((t) => t === 2).length; P.infMax = Math.max(P.infMax, inf); P.infSeries.push(inf); }
      for (const b of G.bots) {
        const p = b.ent.pos, l = P.last[b.botName];
        if (l && b.ent.alive) { const d = Math.hypot(p.x - l[0], p.z - l[2]); P.dist[b.botName] = (P.dist[b.botName] || 0) + d; if (d < 0.05) { P.stuck[b.botName] = (P.stuck[b.botName] || 0) + 1; const k = b.botName + '@' + p.x.toFixed(0) + ',' + p.y.toFixed(1) + ',' + p.z.toFixed(0); P.stuckAt[k] = (P.stuckAt[k] || 0) + 1; } }
        P.last[b.botName] = [p.x, p.y, p.z];
      }
    } catch (e) { (window.__errs = window.__errs || []).push('probe ' + e.message); }
  }, 1000);
  return 'installed t=' + G.time.toFixed(1);
})()
