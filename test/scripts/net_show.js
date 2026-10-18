// back to the foreground after net_hide.js
(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
  window.__paused = false;
  return 'visible';
})()
