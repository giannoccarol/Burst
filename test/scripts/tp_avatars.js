// test-only: standalone third-person avatars in front of the camera (no bots), animated by a timer
// window.__tpShow([{ ap: {v:0}, weapon: 'ar', state: 'stand'|'run'|'crouch'|'slide'|'air'|'dead', turn: 0, pitch: 0 }], { dist: 3 })
window.__tpShow = function (list, o) {
  o = o || {};
  const { Game: G, R } = RAFFICA, M = window.RAFFICA_MODELS;
  document.getElementById('hud').style.visibility = 'hidden';
  G.vm.root.visible = false;
  for (const a of window.__tpAv || []) { R.scene.remove(a.av.root); a.av.dispose(); }
  clearInterval(window.__tpTimer);
  const me = G.me, cam = R.camera;
  const fwd = new cam.position.constructor(0, 0, -1).applyQuaternion(cam.quaternion); fwd.y = 0; fwd.normalize();
  const right = new cam.position.constructor(-fwd.z, 0, fwd.x);
  const yaw = Math.atan2(-fwd.x, -fwd.z);
  window.__tpAv = list.map((s, i) => {
    const av = new M.Avatar({ appearance: s.ap || { v: 0 } });
    av.setColor(s.color || (i % 2 ? '#3d8ad8' : '#d8463c'));
    av.setWeapon(s.weapon || 'ar');
    const off = (i - (list.length - 1) / 2) * (o.gap || 1.3), d = o.dist || 3;
    av.root.position.set(me.mover.pos.x + fwd.x * d + right.x * off, me.mover.pos.y, me.mover.pos.z + fwd.z * d + right.z * off);
    R.scene.add(av.root);
    if (s.state === 'dead') av.kill(1);
    return { av, s, yaw: yaw + Math.PI + (s.turn || 0) };
  });
  const step = () => {
    for (const a of window.__tpAv) {
      const s = a.s, sp = s.state === 'run' ? 7 : s.state === 'slide' ? 9 : 0;
      a.av.update(0.05, { yaw: a.yaw, pitch: s.pitch || 0, vx: -Math.sin(a.yaw) * sp, vz: -Math.cos(a.yaw) * sp, crouch: s.state === 'crouch' || s.state === 'slide', slide: s.state === 'slide', grounded: s.state !== 'air' });
    }
  };
  step();
  window.__tpTimer = setInterval(step, 50);
  return window.__tpAv.map((a) => ({ look: a.av.look && a.av.look.variant, proc: a.av.body.proc, glb: a.av.gun && a.av.gun.userData.glb }));
};
