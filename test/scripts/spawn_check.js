// every spawn of the current map: does a standing player fit there? (and is there floor under it)
(() => {
  const G = RAFFICA.Game, W = G.world, hw = 0.27, h = 1.8, bad = [];
  for (const s of G.mapInfo.spawns) {
    const y = s.y + 0.02;
    const blocked = W.overlaps(s.x - hw, y + 1e-3, s.z - hw, s.x + hw, y + h, s.z + hw);
    const floor = W.overlaps(s.x - 0.05, y - 0.3, s.z - 0.05, s.x + 0.05, y - 0.01, s.z + 0.05);
    if (blocked || !floor) bad.push({ x: s.x, y: s.y, z: s.z, team: s.team, blocked, floor });
  }
  return { map: G.mapId, n: G.mapInfo.spawns.length, bad };
})()
