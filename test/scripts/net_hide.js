// simulate a backgrounded tab: document.hidden + visibilitychange, game loop paused (rAF stops)
(() => {
  const G = RAFFICA.Game;
  if (!G.__loopWrapped) { const L = G.loop; G.__loopWrapped = true; G.loop = function (t) { if (window.__paused) { setTimeout(() => G.loop(performance.now()), 50); return; } return L.call(this, t); }; }
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  window.__paused = true;
  return 'hidden';
})()
