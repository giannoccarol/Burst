// review screenshots: full resolution, shadows on (test/vl_shots.py)
window.__RAF_TEST = { lowres: 0.75 };
window.__autostart = function () {};
window.addEventListener('error', (e) => { (window.__errs = window.__errs || []).push(String(e.message) + ' @' + e.lineno); });
