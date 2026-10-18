(() => {
  const { Game: G, Nav } = window.RAFFICA;
  const mi = G.mapInfo;
  const T = mi.triggers;
  const me = G.me, mv = me.mover;
  const out = { state: G.state, map: mi.id, custom: mi.custom, spawns: mi.spawns.length, flags: mi.flags, zones: mi.zones.map(z => z.name), pads: T.pads.length, tin: T.teleIn.length, tout: T.teleOut.length, bots: G.bots.length, nav: Nav.nodes.length, alive: me.alive, mode: G.g && G.g.m };
  // jump pad test
  if (T.pads[0]) { const b = T.pads[0].box; mv.pos.set((b[0] + b[3]) / 2, b[1] + 0.15, (b[2] + b[5]) / 2); mv.vel.set(0, 0, 0); const r = G.mapTriggers(mv); out.pad = [r, mv.vel.y]; }
  // teleporter test
  if (T.teleIn[0]) { const b = T.teleIn[0].box; mv.pos.set((b[0] + b[3]) / 2, b[1] + 0.1, (b[2] + b[5]) / 2); const r = G.mapTriggers(mv); out.tele = r && r.tele ? [r.tele.ch, r.tele.x, r.tele.z] : r; }
  return out;
})()
