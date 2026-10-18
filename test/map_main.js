// Map preview harness: builds the map and exposes camera presets
(async function () {
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0';
  document.body.appendChild(root);
  const q = +(new URLSearchParams(location.search).get('q') || 2);
  SETTINGS.quality = q;
  R.init(root);
  const t0 = performance.now();
  makeMaterials(R.q);
  const tMat = performance.now() - t0;
  R.setupSky();
  const map = buildMap(R.scene);
  const tMap = performance.now() - t0 - tMat;
  buildBackdrop(R.scene, R.q);
  const dyn = buildDynamic(R.scene, map);
  for (const l of map.lights) {
    if (l.type === 'point') { const pl = new THREE.PointLight(l.color, l.intensity, l.distance, 2); pl.position.set(...l.pos); R.scene.add(pl); }
  }
  R.buildPost();
  R.resize(true);
  dyn.update(1.0);
  const views = {
    overview: [[-26, 22, 30], [0, 0, 0]],
    piazza: [[6, 1.7, 6], [-8, 2.0, -9]],
    church: [[0, 1.7, -12], [0, 7, -34]],
    alley: [[-30.5, 1.7, 18], [-30.5, 3, -10]],
    terrace: [[-24, 6.3, 8], [5, 3, -2]],
    cafe: [[-25.5, 1.6, -5], [-16, 1.4, -11]],
    loggia: [[4, 2.9, 24], [-2, 4, 38]],
    sky: [[30, 30, 60], [-10, 5, -10]],
  };
  window.__setView = (name) => {
    const v = views[name];
    R.camera.position.set(...v[0]);
    R.camera.lookAt(...v[1]);
    R.render(1.0);
    return true;
  };
  let tris = 0, calls = 0;
  R.render(1.0);
  calls = R.renderer.info.render.calls; tris = R.renderer.info.render.triangles;
  window.__info = { matMs: Math.round(tMat), mapMs: Math.round(tMap), boxes: map.world.boxes.length, tris: map.world.tris.length, calls, triangles: tris, meshes: map.group.children.length, q: R.q };
  window.__done = true;
})().catch((e) => { console.error('ERR', e && e.stack || e); window.__done = true; });
