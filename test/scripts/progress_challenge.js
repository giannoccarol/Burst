(() => {
  const { Progress: P } = window.RAFFICA;
  const ch = P.daily().map((c) => c.t + ':' + c.p + '/' + c.n);
  for (let i = 0; i < 3; i++) P.onKill({ head: true, wid: 'ar', air: true, slide: false, streak: i + 1, cls: 5, clsOk: true });
  return { ch, after: P.daily().map((c) => c.t + ':' + c.p + '/' + c.n + (c.d ? ' done' : '')), xp: P.data.xp, lvl: P.level(), banner: document.querySelector('#bannerT').textContent + ' | ' + document.querySelector('#bannerB').textContent, q: window.RAFFICA.HUD._banQ.length };
})()
