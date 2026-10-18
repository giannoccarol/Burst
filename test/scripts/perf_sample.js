// samples Game.fps / Game.prof for N seconds and measures one main-scene render (calls/triangles) from the player camera
(() => new Promise((res) => {
  const { Game: G, R } = window.RAFFICA;
  const N = 20, fps = [], upd = [], ren = [];
  let k = 0;
  const id = setInterval(() => {
    fps.push(G.fps); upd.push(G.prof ? G.prof.upd : 0); ren.push(G.prof ? G.prof.ren : 0);
    if (++k < N) return;
    clearInterval(id);
    const r = R.renderer, avg = (a) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
    r.info.autoReset = false; r.info.reset();
    const t0 = performance.now(); r.render(R.scene, R.camera); const gl = r.getContext(); gl.finish(); const one = performance.now() - t0;
    const info = { calls: r.info.render.calls, tris: r.info.render.triangles, geoms: r.info.memory.geometries, textures: r.info.memory.textures, programs: (r.info.programs || []).length };
    // same fixed overview camera on every map
    const cam = R.camera.clone(); cam.position.set(-30, 26, 30); cam.lookAt(0, 0, 0); cam.fov = 55; cam.updateProjectionMatrix();
    r.info.reset(); r.render(R.scene, cam); info.overviewCalls = r.info.render.calls; info.overviewTris = r.info.render.triangles;
    r.info.autoReset = true;
    let meshes = 0; R.scene.traverse((o) => { if (o.isMesh) meshes++; });
    res({ map: G.mapId, state: G.state, fps: avg(fps), frameMs: +(1000 / avg(fps)).toFixed(1), upd: avg(upd), ren: avg(ren), oneSceneRenderMs: Math.round(one), ...info, meshes, dpr: R.dpr, size: [r.domElement.width, r.domElement.height], bots: G.bots.length, nav: window.RAFFICA.Nav.nodes.length, navMs: Math.round(window.RAFFICA.Nav.buildMs || 0), errs: (window.__errs || []).length });
  }, 1000);
}))()
