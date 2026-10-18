(() => {
  const { Editor: E } = window.RAFFICA;
  const out = {};
  E.setTool('box'); E.mouse.set(0.1, -0.35); E.mouseIn = true; E.updateGhost();
  out.ghost = E.ghostPos && E.ghostPos.toArray();
  const n0 = E.objs.length; E.place(); out.placed = E.objs.length - n0;
  E.setTool(null);
  const o = E.objs[E.objs.length - 1];
  E.select(o);
  out.sel = o.k; out.insp = document.querySelector('#ed-insp').innerText.slice(0, 120);
  o.m = 'neon_cyan'; E.rebuild(o); E.commit();
  out.m1 = o.m;
  E.undo(); out.afterUndo = E.objs[E.objs.length - 1].m;
  E.redo(); out.afterRedo = E.objs[E.objs.length - 1].m;
  E.select(E.objs[E.objs.length - 1]);
  E.duplicate(); out.dup = E.objs.length;
  E.remove(); out.afterRemove = E.objs.length;
  E.setMode('scale'); out.mode = E.tc.mode;
  E.undoS.length && (out.undoDepth = E.undoS.length);
  return out;
})()
