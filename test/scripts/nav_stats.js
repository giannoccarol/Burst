// nav graph stats: nodes on the world's ceiling cap (y >= 40), cost of a failed A*, links into/out of the bus
(() => {
  const { Game: G, Nav } = window.RAFFICA;
  if (!Nav.built) Nav.build(G.world, G.mapInfo.bounds);
  const N = Nav.nodes, top = N.filter((n) => n.y >= 39);
  const s = G.mapInfo.spawns[0], a = Nav.nearest(s.x, s.y, s.z);
  let ms = 0, fails = 0;
  for (let i = 0; i < 10; i++) { const b = top[Math.floor(Math.random() * top.length)]; if (!b) break; const t0 = performance.now(); const p = Nav.path(a, b); ms += performance.now() - t0; if (!p) fails++; }
  const out = { map: G.mapId, nodes: N.length, ceilingNodes: top.length, ceilingShare: +(top.length / N.length).toFixed(2), failedAstarAvgMs: top.length ? +(ms / 10).toFixed(1) : null, fails };
  if (G.mapId === 'villette') {
    const bus = N.filter((n) => n.x > -25.3 && n.x < -16.2 && n.z > 0.2 && n.z < 2.8 && n.y > 0.8 && n.y < 1.5);
    const set = new Set(bus.map((n) => n.i));
    out.busNodes = bus.map((n) => [n.x, n.y, n.z, n.links.map((L) => [L.n.x, +L.n.y.toFixed(2), L.n.z].join(',')).join(' ')]);
    out.into = []; for (const n of N) if (!set.has(n.i)) for (const L of n.links) if (set.has(L.n.i)) out.into.push([n.x, +n.y.toFixed(2), n.z].join(',') + ' -> ' + [L.n.x, L.n.y, L.n.z].join(',') + (L.jump ? ' J' : ''));
    const W = G.world, near = (x, z) => (Nav.cols.get(Nav.key(Math.floor(x), Math.floor(z))) || []).map((n) => n.y.toFixed(2)).join('/');
    out.around = {}; for (const x of [-26.5, -25.5, -24.5, -16.5, -15.5, -14.5]) for (const z of [-0.5, 0.5, 1.5, 2.5, 3.5]) out.around[x + ',' + z] = near(x, z);
  }
  return out;
})()
