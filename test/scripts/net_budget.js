// worst-case presence budget on the HOST page: 20 team entries (16-char ids), its bots, a burst
// of 40 shots, 6 hits, 2 deaths and 4 chat lines of 120 two-byte characters; reports the merged
// UTF-8 size and which events made it into this tick
(() => {
  const G = RAFFICA.Game, N = RAFFICA.Net;
  if (!G.g) return 'no match';
  for (let i = 0; i < 20; i++) G.g.t['p' + (1e15 + i * 7919).toString(36).slice(0, 15)] = 1 + (i % 2);
  for (let i = 0; i < 40; i++) N.pushEvent(EV_SHOT_T = 1, 'bxxxxx', 3, 12.34, 1.56, -23.45, 45.67, 2.34, -67.89, 3);
  for (let i = 0; i < 6; i++) N.pushEvent(2, '', 'k3v6q2rt7wacd4fn', 42, 1, 3);
  for (let i = 0; i < 2; i++) N.pushEvent(3, '', 'k3v6q2rt7wacd4fn', 3, 1, 'abcdefghijklmnop', 4);
  for (let i = 0; i < 4; i++) N.pushEvent(6, '', 'è'.repeat(120));
  N.nextSend = 0;
  G.sendState(performance.now());
  const pr = N.game.peers().find((p) => p.sameTab).presence;
  const types = {}; for (const e of pr.e || []) types[e[1]] = (types[e[1]] || 0) + 1;
  return { bytes: new TextEncoder().encode(JSON.stringify(pr)).length, mockLast: window.__mock.stats.lastBytes, rejects: window.__mock.stats.rejects, bots: (pr.b || []).length, teamEntries: pr.g && pr.g.t.length, eventsSent: (pr.e || []).length, byType: types, queued: N.events.length };
})()
