// SOURCE page of the interpolation test: the local player follows a known path of wall-clock
// time (circle with yaw wrap-around, zig-zag strafes, jumps, death + respawn teleport every 10 s).
// Pair with net_track.js on another page.
(() => {
  const G = RAFFICA.Game, N = RAFFICA.Net;
  window.__truth = function (W) {
    const T = W / 1000, c = T % 10, base = window.__drvBase;
    let x, z, vx, vz, alive = true;
    if (c < 4) { const a = c * 1.6; x = base.x + 5 * Math.cos(a); z = base.z + 5 * Math.sin(a); vx = -8 * Math.sin(a); vz = 8 * Math.cos(a); }
    else if (c < 8.5) { const u = c - 4, seg = Math.floor(u / 0.5), f = u - seg * 0.5, dir = seg % 2 ? -1 : 1; let px = 0; for (let i = 0; i < seg; i++) px += (i % 2 ? -1 : 1) * 3.5; x = base.x + 5 + px + dir * 7 * f; z = base.z + (u * 2); vx = dir * 7; vz = 2; }
    else { x = base.x + 20; z = base.z + 20; vx = 0; vz = 0; alive = c >= 9.5; if (!alive) { x = base.x + 5 + 3.5 * 0; z = base.z + 9; } }
    const jp = T % 1.5;
    const y = base.y + (jp < 0.6 && c < 8.5 ? 1.2 - Math.pow((jp - 0.3) / 0.3, 2) * 1.2 : 0);
    const vy = jp < 0.6 && c < 8.5 ? -2 * 1.2 * (jp - 0.3) / 0.09 : 0;
    const yaw = Math.atan2(-vx, -vz) + Math.floor(T / 10) * Math.PI * 2;
    return { x, y, z, vx, vy, vz, yaw, alive, ground: !(jp < 0.6 && c < 8.5) };
  };
  const me = G.me;
  window.__drvBase = { x: me.mover.pos.x, y: me.mover.pos.y, z: me.mover.pos.z };
  localStorage.setItem('__drv', JSON.stringify({ peer: N.myPeer, origin: performance.timeOrigin, base: window.__drvBase }));
  const follow = function () {
    const m = this.me, mv = m.mover, t = window.__truth(performance.timeOrigin + performance.now());
    mv.pos.set(t.x, t.y, t.z); mv.vel.set(t.vx, t.vy, t.vz); mv.onGround = t.ground; m.yaw = t.yaw; m.pitch = 0;
    m.alive = t.alive; m.hp = 100; m.spawnProt = 0;
  };
  G.updateLocal = follow; G.updateDead = follow;
  return 'driving ' + N.myPeer;
})()
