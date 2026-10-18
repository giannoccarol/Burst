// compact multiplayer status of this page (host, match, bots, map, errors)
(() => {
  const G = RAFFICA.Game, N = RAFFICA.Net, g = G.g;
  return { me: (N.myPeer || '').slice(0, 5), host: (N.hostPeer() || '').slice(0, 5), amHost: G.isHost(), st: G.state, map: G.mapId,
    g: g && { id: g.id, m: g.m, ph: g.ph, r: Math.round(g.r), sc: g.sc.map(Math.floor), mp: g.mp, he: g.he },
    bots: G.bots.map((b) => b.ent.id + ':' + b.stats.k).join(' '), rbots: [...G.ents.values()].filter((e) => e.kind === 'rbot').map((e) => e.id).sort().join(' '),
    humans: [...G.ents.values()].filter((e) => e.kind === 'remote').length, errs: (window.__errs || []).length };
})()
