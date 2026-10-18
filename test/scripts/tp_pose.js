// test-only: freeze the bots in front of the local player in a given pose
// usage: window.__tpPose({ state: 'stand'|'run'|'crouch'|'slide'|'air'|'dead', weapon: 'ar', dist: 4 })
window.__tpPose = function (o) {
  const { Game: G, WEAPONS } = RAFFICA;
  const bs = G.bots;
  if (!bs.length) return 'no bots';
  const me = G.me, m = me.mover;
  if (o.at) m.pos.set(o.at[0], o.at[1], o.at[2]);
  m.vel.set(0, 0, 0); me.spawnProt = 0; G.vm.root.visible = !o.novm;
  if (o.yaw != null) me.yaw = o.yaw; if (o.mpitch != null) me.pitch = o.mpitch;
  document.getElementById('hud').style.visibility = 'hidden';
  const fwd = { x: -Math.sin(me.yaw), z: -Math.cos(me.yaw) }, right = { x: Math.cos(me.yaw), z: -Math.sin(me.yaw) };
  const out = [];
  bs.forEach((b, i) => {
    b.update = function () {};
    const e = b.ent, d = o.dist || 4, off = (i - (bs.length - 1) / 2) * 1.6;
    e.pos.set(m.pos.x + fwd.x * d + right.x * off, m.pos.y, m.pos.z + fwd.z * d + right.z * off);
    if (b.mover) { b.mover.pos.copy(e.pos); b.mover.vel.set(0, 0, 0); }
    e.yaw = me.yaw + Math.PI + (o.turn || 0); e.pitch = o.pitch || 0;
    const sp = o.state === 'run' ? 7 : o.state === 'slide' ? 9 : 0;
    e.vel.set(-Math.sin(e.yaw) * sp, 0, -Math.cos(e.yaw) * sp);
    e.flags = 1 | (o.state === 'air' ? 0 : 8) | (o.state === 'crouch' ? 2 : 0) | (o.state === 'slide' ? 6 : 0);
    e.alive = o.state !== 'dead';
    if (o.weapon) { b.weapon = o.weapon; e.w = Object.keys(WEAPONS).indexOf(o.weapon); }
    const av = e.avatar;
    out.push({ n: b.botName, team: e.team, look: av && av.look && av.look.variant, proc: av ? !!av.body.proc : null, gun: av && av.gun && av.gun.userData.glb });
  });
  return out;
};
