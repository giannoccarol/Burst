// low resolution and no shadows only under automation (Playwright); opened by hand the page plays at full quality
if (navigator.webdriver) window.__RAF_TEST = { lowres: 0.3, noshadow: true };
// test-only: drive the game from the URL hash, e.g. #offline or #room=test
window.__autostart = function () {
  const h = location.hash.slice(1);
  const q = Object.fromEntries(h.split('&').filter(Boolean).map((kv) => { const [k, v] = kv.split('='); return [k, v === undefined ? true : decodeURIComponent(v)]; }));
  window.__q = q;
  if (q.cls) RAFFICA.Game.chooseClass(+q.cls);
  if (q.map) RAFFICA.Game.pendingMap = q.map;
  // &menu=N: stay N seconds in the menu first (background warmup, like a real player)
  if (q.menu && !window.__menuDone) { window.__menuDone = true; setTimeout(window.__autostart, +q.menu * 1000); return; }
  if (q.offline) RAFFICA.Game.playOffline({ bots: +(q.bots || 4), diff: 1, mode: +(q.mode || 0) });
  else if (q.room) RAFFICA.Game.play(q.room, { bots: +(q.bots || 0), diff: 1, mode: +(q.mode || 0) });
};
window.addEventListener('error', (e) => { (window.__errs = window.__errs || []).push(String(e.message) + ' @' + e.lineno); });
