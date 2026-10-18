# writes views.json for test/shot.py: every weapon at the hip and fully aimed (offline page, no bots)
import json, sys, re
ids = re.findall(r"^  ([a-z0-9]+): \{ name:", open('src/08_weapons.js').read(), re.M)
pre = "const G = RAFFICA.Game, me = G.me; me.spawnProt = 1e9; document.querySelectorAll('#lockhint, .lockhint').forEach(e => e.style.display='none');"
v = []
for i in ids:
    if i in ('knife',): continue
    for ads in (0, 1):
        v.append([f"{i}_{'ads' if ads else 'hip'}", pre + f" me.inv = [{{ id: '{i}', ammo: RAFFICA.WEAPONS['{i}'].mag || 1 }}]; if (G._lastGun !== '{i}') {{ G._lastGun = '{i}'; G.equip(0, true); await new Promise(r => setTimeout(r, 1500)); }} me.mover.reset(-6, 0.02, 6); me.yaw = 0.6; me.pitch = 0.02; RAFFICA.Input.mouse.b2 = {str(bool(ads)).lower()}; await new Promise(r => setTimeout(r, 900)); return [me.inv[0].id, +me.adsT.toFixed(2)];"])
json.dump(v, sys.stdout)
