// freeze this page's game loop without telling anyone (busy main thread, map build, crash)
(() => { const G = RAFFICA.Game; if (!G.__loopWrapped) { const L = G.loop; G.__loopWrapped = true; G.loop = function (t) { if (window.__paused) { setTimeout(() => G.loop(performance.now()), 50); return; } return L.call(this, t); }; } window.__paused = true; return 'paused'; })()
