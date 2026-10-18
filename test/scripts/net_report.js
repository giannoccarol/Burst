// read back net_probe.js data + match state of this page
(() => {
  const N = RAFFICA.Net, G = RAFFICA.Game, P = window.__np || {};
  const g = G.g;
  const ms = window.__mock ? window.__mock.stats : {};
  return {
    peer: N.myPeer, host: N.hostPeer(), amHost: G.isHost(), state: G.state, map: G.mapId,
    g: g && { id: g.id, m: g.m, ph: g.ph, r: Math.round(g.r), sc: g.sc, mp: g.mp },
    me: { alive: G.me.alive, team: G.me.team, k: G.me.stats.k, d: G.me.stats.d },
    bots: G.bots.map((b) => b.ent.id), ents: [...G.ents.values()].map((e) => e.id + ':' + e.kind + ':' + (e.alive ? 'A' : 'D')),
    mock: ms, avgBytes: ms.calls ? Math.round(ms.sumBytes / ms.calls) : 0,
    sentEv: P.sentEv, recvEv: P.recvEv, dupes: P.dupes, hosts: P.hosts, hostChanges: P.hostChanges,
    cost: { ingests: P.ingests, ingestUs: P.ingests ? Math.round(P.ingestMs / P.ingests * 1000) : 0, sends: P.sends, sendUs: P.sends ? Math.round(P.sendMs / P.sends * 1000) : 0, urUs: P.frames ? Math.round(P.urMs / P.frames * 1000) : 0 },
    errs: (window.__errs || []).slice(0, 10),
  };
})()
