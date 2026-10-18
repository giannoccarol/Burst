// Villette nav coverage: graph reachability (BFS over directed links) and A* (what bots use)
// from both backyard spawns to the interesting areas, plus a check of every spawn.
(() => {
  const { Game: G, Nav } = window.RAFFICA;
  if (!Nav.built) Nav.build(G.world, G.mapInfo.bounds);
  const N = Nav.nodes;
  const bfs = (start, rev) => {
    const seen = new Uint8Array(N.length); const q = [start.i]; seen[start.i] = 1;
    let radj = null;
    if (rev) { radj = N.map(() => []); for (const n of N) for (const L of n.links) radj[L.n.i].push(n.i); }
    while (q.length) { const i = q.pop(); const nb = rev ? radj[i] : N[i].links.map((L) => L.n.i); for (const j of nb) if (!seen[j]) { seen[j] = 1; q.push(j); } }
    return seen;
  };
  const inR = (n, r) => n.x >= r.x[0] && n.x <= r.x[1] && n.z >= r.z[0] && n.z <= r.z[1] && n.y >= r.y[0] && n.y <= r.y[1];
  const regions = {
    houseA_up: { x: [-10, 2], z: [-20, -12], y: [3.25, 3.6] },
    houseB_up: { x: [-2, 10], z: [12, 20], y: [3.25, 3.6] },
    houseA_gf: { x: [-10, 2], z: [-20, -12], y: [0.2, 0.45] },
    houseB_gf: { x: [-2, 10], z: [12, 20], y: [0.2, 0.45] },
    bus_in: { x: [-25.3, -16.2], z: [0.2, 2.8], y: [0.85, 1.45] },
    pickup_bed: { x: [-2.8, -0.5], z: [-1.0, 1.0], y: [0.85, 1.6] },
    truck_cargo: { x: [19.0, 25.2], z: [-2.8, -0.2], y: [0.9, 1.7] },
    garageA_roof: { x: [1.9, 8.5], z: [-19.3, -11.7], y: [3.3, 3.6] },
    garageB_roof: { x: [-8.5, -1.9], z: [11.7, 19.3], y: [3.3, 3.6] },
    containerA_top: { x: [17, 29], z: [-28, -14], y: [2.3, 2.8] },
  };
  const spA = G.mapInfo.spawns.find((s) => s.team === 1 && Math.abs(s.x + 6.5) < 0.1);
  const spB = G.mapInfo.spawns.find((s) => s.team === 2 && Math.abs(s.x - 6.5) < 0.1);
  const out = { nodes: N.length, links: N.reduce((a, n) => a + n.links.length, 0), buildMs: Math.round(Nav.buildMs), from: {}, regions: {} };
  const starts = { A: Nav.nearest(spA.x, spA.y, spA.z), B: Nav.nearest(spB.x, spB.y, spB.z) };
  const fw = {}, bw = {};
  for (const k in starts) { fw[k] = bfs(starts[k]); bw[k] = bfs(starts[k], true); out.from[k] = { start: [starts[k].x, +starts[k].y.toFixed(2), starts[k].z], reach: fw[k].reduce((a, v) => a + v, 0) }; }
  for (const [name, r] of Object.entries(regions)) {
    const ns = N.filter((n) => inR(n, r));
    const res = { nodes: ns.length };
    if (ns.length) {
      const cx = (r.x[0] + r.x[1]) / 2, cz = (r.z[0] + r.z[1]) / 2;
      ns.sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
      for (const k in starts) {
        const reach = ns.filter((n) => fw[k][n.i]).length, back = ns.filter((n) => bw[k][n.i]).length;
        const tgt = ns.find((n) => fw[k][n.i]) || ns[0];
        const t0 = performance.now(); const p = Nav.path(starts[k], tgt); const ms = performance.now() - t0;
        res[k] = { reach, canReturn: back, astar: p ? p.length : null, astarMs: Math.round(ms) };
      }
      res.ys = [...new Set(ns.map((n) => n.y.toFixed(2)))].slice(0, 6);
    }
    out.regions[name] = res;
  }
  // unreachable islands from A (grouped by 4 m cell)
  const isl = {};
  for (const n of N) if (!fw.A[n.i] && n.y < 39) { const k = Math.round(n.x / 4) * 4 + ',' + n.y.toFixed(1) + ',' + Math.round(n.z / 4) * 4; isl[k] = (isl[k] || 0) + 1; }
  out.unreachFromA = Object.entries(isl).sort((a, b) => b[1] - a[1]).slice(0, 30).map((e) => e[0] + ' x' + e[1]);
  out.unreachCount = N.length - out.from.A.reach; out.ceilingNodes = N.filter((n) => n.y >= 39).length;
  // nodes reachable but with no way back (traps)
  const trap = {};
  for (const n of N) if (fw.A[n.i] && !bw.A[n.i]) { const k = Math.round(n.x) + ',' + n.y.toFixed(1) + ',' + Math.round(n.z); trap[k] = 1; }
  out.traps = Object.keys(trap).slice(0, 30);
  // spawns
  const W = G.world;
  out.spawns = G.mapInfo.spawns.map((s, i) => {
    const inside = W.overlaps(s.x - 0.3, s.y + 0.05, s.z - 0.3, s.x + 0.3, s.y + 1.75, s.z + 0.3);
    const fl = W.floorBelow(s.x, s.z, s.y + 0.5, 3);
    const n = Nav.nearest(s.x, s.y, s.z);
    const d = n ? +(Math.hypot(n.x - s.x, n.z - s.z) + Math.abs(n.y - s.y)).toFixed(2) : null;
    const ok = !inside && n && d < 1.2 && fw.A[n.i] && bw.A[n.i] && Math.abs(fl - s.y) < 0.1;
    return ok ? null : [i, [s.x, s.y, s.z, s.team].join(','), inside ? 'INSIDE' : '', 'floor' + fl.toFixed(2), n ? 'nav' + [n.x, n.y.toFixed(2), n.z].join(',') + ' d' + d : 'no-nav', n && fw.A[n.i] ? 'reach' : 'UNREACH', n && bw.A[n.i] ? 'back' : 'NOBACK'].join(' ');
  }).filter(Boolean);
  out.spawnCount = G.mapInfo.spawns.length;
  // stair column of house A (x -9.75..-3.35, z -19.75..-18.35)
  out.stairCols = {}; for (let x = -9.5; x <= -3.5; x += 1) for (const z of [-19.5, -18.5]) out.stairCols[x + ',' + z] = (Nav.cols.get(Nav.key(Math.floor(x), Math.floor(z))) || []).map((n) => n.y.toFixed(2)).join('/');
  return out;
})()
