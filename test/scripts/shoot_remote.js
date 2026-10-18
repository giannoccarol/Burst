(()=>{const G=RAFFICA.Game; const e=[...G.ents.values()].find(x=>x.kind==='remote'); if(!e) return 'no remote';
 const p=e.pos; const m=G.me.mover; m.pos.set(p.x+2.5, p.y, p.z+0.3); m.vel.set(0,0,0);
 const dx=p.x-m.pos.x, dz=p.z-m.pos.z; G.me.yaw=Math.atan2(-dx,-dz); G.me.pitch=-0.12; G.me.spawnProt=0;
 G.updateCamera(0.016); RAFFICA.R.camera.updateMatrixWorld(); let n=0, hits=[];
 for(let i=0;i<8;i++){G.me.nextFire=0; G.me.bloom=0; G.cur().ammo=30; const before=window.__lastHit; G.fire(); n++;}
 return {fired:n, target:e.id, tAlive:e.alive, tpos:p.toArray(), mypos:m.pos.toArray(), events: RAFFICA.Net.events.map(x=>x.ev[1]).join(',')};})()
