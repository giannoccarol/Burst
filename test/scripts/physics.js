(()=>{
  const G = RAFFICA.Game; const W = G.world;
  const M = (x,y,z) => { const m = new G.me.mover.constructor(W); m.reset(x,y,z); return m; };
  const run = (m, secs, inp, every) => { const dt = 1/125; let t = 0, maxY = -1e9, maxV = 0, log = []; const n = Math.round(secs/dt);
    for (let i=0;i<n;i++){ const ii = typeof inp === 'function' ? inp(t, m) : inp; m.step(dt, Object.assign({mx:0,mz:0,jump:false,jumpPressed:false,crouch:false,yaw:0,speedMult:1}, ii)); t+=dt; maxY=Math.max(maxY,m.pos.y); maxV=Math.max(maxV,Math.hypot(m.vel.x,m.vel.z)); if (every && i % Math.round(every/dt)===0) log.push([+t.toFixed(2), +m.pos.x.toFixed(2), +m.pos.y.toFixed(2), +m.pos.z.toFixed(2), +Math.hypot(m.vel.x,m.vel.z).toFixed(2)]); }
    return { pos: m.pos.toArray().map(v=>+v.toFixed(2)), v: +Math.hypot(m.vel.x,m.vel.z).toFixed(2), maxY: +maxY.toFixed(2), maxV: +maxV.toFixed(2), ground: m.onGround, log }; };
  const out = {};
  // 1 walk in piazza from (-8,0,8) toward -z
  let m = M(-8, 0, 8); out.walk = run(m, 1.5, {mz:1});
  // 2 jump in place
  m = M(-8, 0, 8); run(m, 0.2, {}); out.jump = run(m, 1.2, (t)=>({jumpPressed: t<0.01}));
  // 3 slide: run 1s then crouch
  m = M(6, 0, 10); run(m, 1.0, {mz:1}); out.slideStart = +Math.hypot(m.vel.x,m.vel.z).toFixed(2); out.slide = run(m, 1.0, {mz:1, crouch:true}, 0.1);
  // 4 bhop straight holding jump
  m = M(-12, 0, -11); m.vel.set(0,0,0); out.bhopStraight = run(m, 3.0, {mz:1, jump:true});
  // 5 bhop with strafe + turning (air strafing) along +x direction in the north street
  m = M(-25, 0, -23); let yaw = -Math.PI/2; 
  out.bhopStrafe = run(m, 4.0, (t, mm) => { const s = Math.sin(t*4.0); const ground = mm.onGround; yaw += (s>0?1:-1) * 0.9 * (1/125) * (ground?0:1); return { mz: 1, mx: s>0? 1:-1, jump: true, yaw }; }, 0.5);
  // 6 sagrato steps: from (0,0,-22) walk to -z
  m = M(0, 0, -22); out.steps = run(m, 1.5, {mz:1}, 0.25);
  // 7 terrace stairs: from (-27.8, 0, 19.2) walk toward -z
  m = M(-27.8, 0, 19.2); out.terraceStairs = run(m, 2.2, {mz:1}, 0.3);
  // 8 crouch walk speed
  m = M(-8, 0, 8); out.crouch = run(m, 1.5, {mz:1, crouch:true});
  // 9 jump onto a crate (1.1m) in the alley at (-31.4, 0, -11.2)? walk into crate stack from z=-8
  m = M(-31.4, 0, -8.5); out.crateJump = run(m, 1.2, (t)=>({mz:1, jumpPressed: t>0.18 && t<0.2}), 0.2);
  return out;
})()
