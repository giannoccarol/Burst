// ===================================================================
// Boot (with the viewer's hot-reload hook when present)
// ===================================================================
(function () {
  window.RAFFICA = { Game, Net, R, HUD, SFX, FX, Input, Nav, MODES, WEAPONS, CLASSES, Progress, Editor, CATALOG, EDIT_MATS, BUILTIN_MAPS, buildCustomMap, exampleMapDef, emat, MapProps, PROP_GLB, Assets, THREE };
  const hot = window.claude && window.claude.hot;
  try { if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ room: Net.roomName, cls: Game.cls, nick: Game.nick, mode: Game.roomCfg.mode })); } catch (e) { /* optional */ }
  const start = (data) => {
    Game.hotData = data || {};
    Game.boot().then(() => {
      const d = Game.hotData;
      if (d && d.room && Net.online()) Game.play(d.room);
      if (window.__autostart) window.__autostart();
    }).catch((e) => {
      console.error(e);
      HUD.loading('Qualcosa è andato storto: ' + (e && e.message ? e.message : e) + '. Ricarica la pagina.', 1);
    });
  };
  if (hot && typeof hot.ready === 'function') hot.ready(start);
  else start((hot && hot.data) || {});
})();
