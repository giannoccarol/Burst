// All GLB map props normalised (front = local +x, red arrow) in a grid at the map centre, map hidden.
// Usage with test/shot.py --js @test/scripts/props_lineup.js on a menu page (#lineup=villette|borgo|all)
const G = RAFFICA.Game, R = RAFFICA.R, MP = RAFFICA.MapProps, PG = RAFFICA.PROP_GLB;
const which = (location.hash.match(/lineup=(\w+)/) || [])[1] || 'all';
const ids = Object.keys(PG).filter((id) => which === 'all' || PG[id].maps.includes(which));
await Promise.all(ids.map((id) => RAFFICA.Assets.get(PG[id].file)));
G.mapGroup.visible = false; if (G.backdrop) G.backdrop.group.visible = false;
const grp = new RAFFICA.THREE.Group(), T = RAFFICA.THREE; R.scene.add(grp);
const cols = 6, cell = 7, out = {};
ids.forEach((id, i) => {
  const x = (i % cols - (cols - 1) / 2) * cell, z = Math.floor(i / cols) * cell;
  MP.attach(grp, [{ id, m: new T.Matrix4().makeTranslation(x, 0, z) }]);
  const ar = new T.Mesh(new T.ConeGeometry(0.25, 0.8, 8).rotateZ(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xff2020 })); ar.position.set(x + 2.6, 0.3, z); grp.add(ar);
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#000a'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.fillText(id, 8, 42);
  const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false })); sp.scale.set(3, 0.75, 1); sp.position.set(x, -0.6 + 0.0, z + 2.8); grp.add(sp);
  out[id] = MP.dims(id);
});
const ground = new T.Mesh(new T.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x9a9080 })); ground.position.y = -0.01; grp.add(ground);
G.updateMenu = () => {}; // freeze the menu camera
const rows = Math.ceil(ids.length / cols);
R.camera.position.set(0, 26, rows * cell + 16); R.camera.lookAt(0, 0, rows * cell / 2 - 3);
R.staticDirty = true;
document.querySelectorAll('#menu, .menu, #hud').forEach((e) => { e.style.display = 'none'; });
return out;
