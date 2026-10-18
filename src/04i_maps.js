// ===================================================================
// Built-in maps: id -> name, menu tagline, environment and loader.
// Custom maps (editor) are handled separately by buildCustomMap.
// ===================================================================
const BUILTIN_MAPS = {
  borgo: {
    name: 'Borgo', tag: 'Piazza italiana · ore 17:40', env: 'borgo', shadow: 62,
    load(holder) {
      const map = buildMap(holder);
      const backdrop = buildBackdrop(R.scene, R.q);
      return { map, backdrop, info: { id: 'borgo', name: 'Borgo', spawns: map.spawns, flags: FLAGS, zones: HARDPOINTS, bounds: MAPDEF.bounds, water: map.water, menuCam: { c: [0, 2, 0], r: 28, h: 16 } } };
    },
  },
  villette: {
    name: 'Villette', tag: 'Villaggio di prova nel deserto · anni \'50', env: 'deserto', shadow: 44,
    load(holder) {
      const map = buildVillette(holder);
      const backdrop = buildDesert(R.scene, R.q);
      return { map, backdrop, info: { id: 'villette', name: 'Villette', spawns: map.spawns, flags: VL_FLAGS, zones: VL_ZONES, bounds: VL.bounds, water: null, menuCam: { c: [0, 2.5, 0], r: 34, h: 15 } } };
    },
  },
};
const BUILTIN_IDS = Object.keys(BUILTIN_MAPS);
function builtinMap(id) { return Object.prototype.hasOwnProperty.call(BUILTIN_MAPS, id) ? BUILTIN_MAPS[id] : null; }
// display name of any map key (built-in, shared custom, local test)
function mapLabel(id) {
  if (!id) return 'Borgo';
  const b = builtinMap(id);
  if (b) return b.name;
  return (typeof Editor !== 'undefined' && Editor.sharedName(id)) || 'Mappa personalizzata';
}
