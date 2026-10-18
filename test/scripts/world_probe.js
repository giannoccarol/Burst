// lists collision boxes around a few suspicious nav links on villette
(() => {
  const { Game: G, Nav } = window.RAFFICA;
  if (!Nav.built) Nav.build(G.world, G.mapInfo.bounds);
  const W = G.world, tmp = [];
  const q = (x0, y0, z0, x1, y1, z1) => { W.query(x0, y0, z0, x1, y1, z1, tmp); return tmp.map((b) => [b.x0, b.y0, b.z0, b.x1, b.y1, b.z1].map((v) => +v.toFixed(2)).join(',') + ' f' + b.flags); };
  const link = (a, b) => { const n = (Nav.cols.get(Nav.key(Math.floor(a[0]), Math.floor(a[2]))) || []).find((n) => Math.abs(n.y - a[1]) < 0.1); if (!n) return 'no node at ' + a; const L = n.links.find((L) => L.n.x === b[0] && L.n.z === b[2] && Math.abs(L.n.y - b[1]) < 0.1); return L ? 'LINK ' + (L.jump ? 'jump' : '') : 'no link'; };
  return {
    l1: link([1.5, 3.4, -18.5], [2.5, 3.45, -18.5]),
    wallE: q(1.72, 3.8, -18.78, 2.28, 5.15, -18.22),
    l2: link([-1.5, 3.4, -12.5], [-1.5, 3.15, -11.5]),
    wallF: q(-1.78, 3.5, -12.28, -1.22, 5.1, -11.72),
    l2b: link([-8.5, 3.4, -12.5], [-8.5, 3.15, -11.5]),
  };
})()
