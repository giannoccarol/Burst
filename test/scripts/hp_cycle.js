// Hardpoint: every 25 s of sim time force the next zone and record who held each zone (window.__hp)
(() => {
  const G = window.RAFFICA.Game;
  if (window.__hp) return 'already';
  const H = window.__hp = { own: {}, last: G.time, names: (G.mapInfo.zones || []).map((z) => z.name) };
  setInterval(() => {
    const g = G.g; if (!g || !g.hz || g.ph !== 0) return;
    const k = H.names[g.hz[0]] + ':' + g.hz[1]; H.own[k] = (H.own[k] || 0) + 1;
    if (G.time - H.last > 25) { H.last = G.time; g.hz[2] = 0.05; }
  }, 1000);
  return 'hp cycle on ' + H.names.join('|');
})()
