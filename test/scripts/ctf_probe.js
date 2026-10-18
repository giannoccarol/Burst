// CTF sampler: logs flag state changes, carrier positions and captures into window.__ctf
(() => {
  const G = window.RAFFICA.Game;
  if (window.__ctf) return 'already';
  const C = window.__ctf = { log: [], caps: 0, picks: 0, drops: 0, returns: 0, carry: {}, prev: null, sc: '0,0' };
  const nm = (id) => { const b = G.bots.find((x) => x.ent.id === id); return b ? b.botName : id === G.myId() ? 'ME' : id; };
  setInterval(() => {
    const g = G.g; if (!g || !g.fl) return;
    const s = g.fl.map((f) => f[0]).join('');
    const sc = g.sc.join(',');
    if (sc !== C.sc) { C.caps++; C.log.push(Math.round(G.time) + 's CAP ' + sc + (g.cap ? ' by ' + nm(g.cap[0]) : '')); C.sc = sc; }
    if (C.prev && s !== C.prev) {
      for (let i = 0; i < 2; i++) { const a = C.prev[i], b = s[i]; if (a === b) continue; if (b === '1') C.picks++; if (b === '2') C.drops++; if (a === '2' && b === '0') C.returns++; C.log.push(Math.round(G.time) + 's F' + (i + 1) + ' ' + a + '->' + b + ' ' + (b === '1' ? nm(g.fl[i][4]) : '') + ' @' + g.fl[i].slice(1, 4).map((v) => (+v).toFixed(1)).join(',')); }
    }
    for (let i = 0; i < 2; i++) if (g.fl[i][0] === 1) { const k = nm(g.fl[i][4]) + '@' + (+g.fl[i][1]).toFixed(0) + ',' + (+g.fl[i][2]).toFixed(1) + ',' + (+g.fl[i][3]).toFixed(0); C.carry[k] = (C.carry[k] || 0) + 1; }
    C.prev = s;
  }, 1000);
  return 'ctf probe on, myId=' + G.myId();
})()
