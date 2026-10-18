(() => {
  const G = window.RAFFICA.Game, P = window.__probe || {};
  const g = G.g;
  const r1 = (v) => Math.round(v * 10) / 10;
  return {
    simT: r1(G.time - (P.t0 || 0)), samples: P.n, map: G.mapId, maps: P.maps, phases: P.phases, gids: (P.gids || []).length,
    g: g && { m: window.RAFFICA.MODES[g.m].id, ph: g.ph, r: r1(g.r), sc: g.sc, w: g.w, vo: g.vo, hz: g.hz, fl: g.fl, inf: g.inf },
    stuckAt: Object.fromEntries(Object.entries(P.stuckAt || {}).filter((e) => e[1] >= 4)), zoneOwn: P.zoneOwn, zonesSeen: Object.keys(P.zoneIdx || {}), flagState: (P.flagState || []).slice(-30), flagTaken: P.flagTaken, infMax: P.infMax,
    infSeries: (P.infSeries || []).filter((_, i) => i % 5 === 0).join(','),
    bots: G.bots.map((b) => b.botName + ' t' + b.ent.team + ' ' + b.stats.k + '/' + b.stats.d + ' sc' + b.stats.sc + ' L' + (b.stats.lvl || 0) + ' dist' + Math.round((P.dist || {})[b.botName] || 0) + ' stuck' + ((P.stuck || {})[b.botName] || 0) + (b.ent.alive ? '' : ' (D)')),
    me: { alive: G.me.alive, team: G.me.team, k: G.me.stats.k, d: G.me.stats.d },
    nav: { nodes: window.RAFFICA.Nav.nodes.length, ms: Math.round(window.RAFFICA.Nav.buildMs || 0) },
    feed: [...document.querySelectorAll('#feed .fe')].map((e) => e.textContent).slice(-3),
    endOpen: window.RAFFICA.HUD.endOpen, winner: (document.querySelector('#winner') || {}).textContent,
    voteBtns: [...document.querySelectorAll('#votes button, #vote button, .vote')].map((b) => b.textContent.trim()).slice(0, 4),
    errs: (window.__errs || []).slice(0, 5), fps: r1(G.fps),
  };
})()
