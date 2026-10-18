(() => {
  const R = window.__trk; if (!R) return null;
  const f = (M) => ({ frames: M.n, rmsCm: M.n ? Math.round(Math.sqrt(M.se / M.n) * 1000) / 10 : null, maxCm: Math.round(M.max * 100), over1m: M.big, stutter: M.stut, stutterPct: M.n ? Math.round(M.stut / M.n * 1000) / 10 : null, frozen: M.frz, streak: M.streak || 0, delayMs: M.n ? Math.round(M.lat / M.n) : null });
  const info = RAFFICA.Net.peers.get(JSON.parse(localStorage.getItem('__drv')).peer);
  return { new: f(R.nw), old: f(R.od), jit: info && Math.round(info.jit), iv: info && Math.round(info.iv), pb: info && Math.round(info.pb - info.dmin), lostEv: info && info.lostEv, dropped: window.__mock.stats.dropped };
})()
