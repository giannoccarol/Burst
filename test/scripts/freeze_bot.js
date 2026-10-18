(()=>{const G=RAFFICA.Game; const bs=G.bots.filter(b=>b.ent.alive); if(!bs.length) return 'no bots';
 G.bots.forEach(b=>{ b.update=function(){}; });
 const b=bs[0]; const p=b.ent.pos; const m=G.me.mover;
 m.pos.set(p.x+4.5, p.y, p.z+1.5); m.vel.set(0,0,0);
 const dx=p.x-m.pos.x, dz=p.z-m.pos.z; G.me.yaw=Math.atan2(-dx,-dz); G.me.pitch=-0.05;
 return {bot:b.botName, w:b.weapon, p:p.toArray()};})()
