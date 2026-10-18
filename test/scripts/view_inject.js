// test-only (weapon/soldier screenshots): sharper rendering than autostart.js, same URL-hash driver
window.__RAF_TEST = Object.assign({ lowres: 0.75, noshadow: true }, window.__RAF_TEST_OVERRIDE || {});
if (/[#&]noassets\b/.test(location.hash)) window.__RAF_TEST.noassets = true;
if (/[#&]badassets\b/.test(location.hash)) window.__RAF_ASSET_BASE = 'nonexistent-folder/';
window.__autostart = function () {
  const q = Object.fromEntries(location.hash.slice(1).split('&').filter(Boolean).map((kv) => { const [k, v] = kv.split('='); return [k, v === undefined ? true : decodeURIComponent(v)]; }));
  window.__q = q;
  if (q.cls) RAFFICA.Game.chooseClass(+q.cls);
  if (q.offline) RAFFICA.Game.playOffline({ bots: +(q.bots || 0), diff: 1, mode: +(q.mode || 0) });
};
window.addEventListener('error', (e) => { (window.__errs = window.__errs || []).push(String(e.message) + ' @' + e.lineno); });
