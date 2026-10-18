// RECEIVER page of the interpolation test (see net_drive.js): every frame compares the rendered
// remote player with the true path at the displayed sender time; also replays the OLD
// algorithm (min offset over 40 samples + fixed 110 ms, 150 ms extrapolation) on the same
// snapshots for an A/B. Read results with net_track_report.js.
(() => {
  const G = RAFFICA.Game, N = RAFFICA.Net;
  const D = JSON.parse(localStorage.getItem('__drv') || 'null');
  if (!D) return 'no driver';
  window.__drvBase = D.base;
  // same path as net_drive.js
  const truth = function (W) {
    const T = W / 1000, c = T % 10, base = window.__drvBase;
    let x, z, vx, vz, alive = true;
    if (c < 4) { const a = c * 1.6; x = base.x + 5 * Math.cos(a); z = base.z + 5 * Math.sin(a); vx = -8 * Math.sin(a); vz = 8 * Math.cos(a); }
    else if (c < 8.5) { const u = c - 4, seg = Math.floor(u / 0.5), f = u - seg * 0.5, dir = seg % 2 ? -1 : 1; let px = 0; for (let i = 0; i < seg; i++) px += (i % 2 ? -1 : 1) * 3.5; x = base.x + 5 + px + dir * 7 * f; z = base.z + (u * 2); vx = dir * 7; vz = 2; }
    else { x = base.x + 20; z = base.z + 20; vx = 0; vz = 0; alive = c >= 9.5; if (!alive) { x = base.x + 5; z = base.z + 9; } }
    const jp = T % 1.5;
    const y = base.y + (jp < 0.6 && c < 8.5 ? 1.2 - Math.pow((jp - 0.3) / 0.3, 2) * 1.2 : 0);
    return { x, y, z, vx, vz, alive, speed: Math.hypot(vx, vz) };
  };
  const oldSample = (snaps, rt) => {
    let a = null, b = null;
    for (let i = snaps.length - 1; i >= 0; i--) { if (snaps[i].t <= rt) { a = snaps[i]; b = snaps[i + 1] || null; break; } }
    if (!a) return { x: snaps[0].x, y: snaps[0].y, z: snaps[0].z };
    if (!b) { const ex = Math.min(Math.max((rt - a.t) / 1000, 0), 0.15); return { x: a.x + a.vx * ex, y: a.y + (a.f & 8 ? 0 : a.vy * ex), z: a.z + a.vz * ex }; }
    const k = Math.min(Math.max((rt - a.t) / Math.max(1, b.t - a.t), 0), 1);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
  };
  const mk = () => ({ n: 0, se: 0, max: 0, stut: 0, frz: 0, lat: 0, big: 0, prev: null });
  const R = window.__trk = { nw: mk(), od: mk(), offs: [], frames: 0 };
  const acc = (M, p, rt, now, dt) => {
    const W = D.origin + rt, tr = truth(W);
    const cyc = (W / 1000) % 10, nearTele = cyc > 8.3 || cyc < 0.2;
    // respawn/teleport streak: drawn somewhere between the two ends of a jump
    if (cyc < 0.25) { const b = window.__drvBase; const d1 = Math.hypot(p.x - tr.x, p.z - tr.z), d2 = Math.hypot(p.x - b.x - 20, p.z - b.z - 20); if (Math.min(d1, d2) > 1.5) M.streak = (M.streak || 0) + 1; }
    if (tr.alive && !nearTele) {
      const e = Math.hypot(p.x - tr.x, p.y - tr.y, p.z - tr.z);
      M.n++; M.se += e * e; if (e > M.max) M.max = e; if (e > 1) M.big++;
      M.lat += (performance.timeOrigin + now) - W;
      if (M.prev && dt > 0.004) {
        const moved = Math.hypot(p.x - M.prev.x, p.z - M.prev.z), ideal = tr.speed * dt;
        if (ideal > 0.05 && (moved < ideal * 0.5 || moved > ideal * 1.6 + 0.03)) M.stut++;
        if (ideal > 0.05 && moved < 0.002) M.frz++;
      }
    }
    M.prev = { x: p.x, z: p.z };
  };
  const ur = G.updateRemote;
  let lastNow = 0;
  G.updateRemote = function (dt, now) {
    ur.call(this, dt, now);
    const info = N.peers.get(D.peer), e = this.ents.get(D.peer);
    if (!info || !e || !info.snaps.length) return;
    const fdt = lastNow ? (now - lastNow) / 1000 : 0; lastNow = now;
    R.frames++;
    acc(R.nw, e.pos, info.rt, now, fdt);
    // old algorithm on the same data
    const offs = info.__offs || (info.__offs = []);
    const last = info.snaps[info.snaps.length - 1];
    if (info.__lt !== last.t) { info.__lt = last.t; offs.push(info.seen - last.t); if (offs.length > 40) offs.shift(); }
    const off = Math.min(...offs), rtOld = now - off - 110;
    acc(R.od, oldSample(info.snaps, rtOld), rtOld, now, fdt);
  };
  return 'tracking ' + D.peer;
})()
