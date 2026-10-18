// install network instrumentation on a page (idempotent): sent/received event seqs, ingest/send
// cost, host changes. Read it back with net_report.js.
(() => {
  if (window.__np) return 'already';
  const N = RAFFICA.Net, G = RAFFICA.Game;
  const P = window.__np = { t0: performance.now(), sentEv: {}, recvEv: {}, dupes: 0, ingests: 0, ingestMs: 0, sends: 0, sendMs: 0, urMs: 0, frames: 0, hostChanges: 0, hosts: [], gDiff: 0 };
  const push = N.pushEvent;
  N.pushEvent = function (type, ...a) { const ev = push.call(this, type, ...a); P.sentEv[ev[0]] = type; return ev; };
  N.emitter.on('event', (info, ev) => { const r = P.recvEv[info.peer] || (P.recvEv[info.peer] = {}); if (r[ev[0]]) P.dupes++; r[ev[0]] = ev[1]; });
  const ing = N.ingest; N.ingest = function (...a) { const t = performance.now(); try { return ing.apply(this, a); } finally { P.ingests++; P.ingestMs += performance.now() - t; } };
  const snd = N.send; N.send = function (...a) { const t = performance.now(); try { return snd.apply(this, a); } finally { P.sends++; P.sendMs += performance.now() - t; } };
  const ur = G.updateRemote; G.updateRemote = function (...a) { const t = performance.now(); try { return ur.apply(this, a); } finally { P.frames++; P.urMs += performance.now() - t; } };
  let lastHost = null;
  setInterval(() => { if (G.state !== 'playing') return; const h = N.hostPeer(); if (h !== lastHost) { P.hostChanges++; P.hosts.push([Math.round(performance.now() - P.t0), h]); lastHost = h; } }, 100);
  return 'ok ' + N.myPeer;
})()
