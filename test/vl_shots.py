"""Review screenshots of a built-in map from fixed cameras, using the real game page.

build:  python3 build.py test/shots.html --standalone --inject test/mock_claude.js,test/autostart_shots.js
usage:  python3 test/vl_shots.py "http://127.0.0.1:8765/test/shots.html" OUTDIR [map=villette] [views=all] [1280 720]
        views: comma list of names from VIEWS below (or 'all'); 'menu' is the menu with the map picker
env:    RAFFICA_CHROME, RAFFICA_GPU (see run.py)
"""
import asyncio, sys, json, time, os
from playwright.async_api import async_playwright

URL = sys.argv[1]
OUTDIR = sys.argv[2]
MAP = sys.argv[3] if len(sys.argv) > 3 else 'villette'
SEL = sys.argv[4] if len(sys.argv) > 4 else 'all'
W = int(sys.argv[5]) if len(sys.argv) > 5 else 1280
H = int(sys.argv[6]) if len(sys.argv) > 6 else 720
GL_ARGS = [] if os.environ.get('RAFFICA_GPU') == '1' else ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

# name: [camera position, look-at target, fov]
VIEWS = {
    'villette': {
        'overview_menu': None,  # the menu's own orbit camera, menu hidden
        'overview_high': [[-30, 26, 30], [0, 0, 0], 55],
        'houseA_front': [[-4, 1.7, 3.5], [-4, 3.2, -14], 70],
        'houseB_front': [[4, 1.7, -3.5], [4, 3.2, 14], 70],
        'backyardA': [[8, 1.7, -27], [-6, 1.6, -21], 70],
        'backyardB_west': [[-12, 1.7, 26], [2, 1.6, 21], 70],
        'interiorA_living': [[-9.4, 1.9, -12.6], [-1, 1.3, -18.5], 75],
        'interiorA_kitchen': [[1.4, 1.9, -12.6], [-3, 1.4, -19], 75],
        'upstairsA_front': [[-9.4, 5.0, -12.5], [1.5, 4.3, -15], 75],
        'upstairsA_back': [[1.5, 5.0, -19.5], [-8, 3.9, -18.6], 75],
        'stairsA': [[-3.6, 4.9, -18.9], [-9.5, 1.0, -19.1], 75],
        'bus_interior': [[-16.9, 2.45, 1.5], [-25, 2.0, 1.5], 75],
        'bus_outside': [[-14, 2.0, -3], [-22, 1.5, 2], 70],
        'truck_cargo': [[24.6, 2.6, -1.5], [19.5, 1.6, -1.5], 75],
        'pickup_street': [[7, 1.8, 2.5], [-3, 0.8, 0], 70],
        'military_yard': [[12, 2.2, -13], [24, 1.0, -24], 70],
        'military_high': [[13, 7, -9], [22, 0, -22], 60],
        'garageA_roof': [[8.2, 5.1, -11.9], [0, 3.5, -19], 75],
    },
    'borgo': {
        'overview_menu': None,
        'overview_high': [[-26, 22, 30], [0, 0, 0], 55],
    },
}


async def main():
    os.makedirs(OUTDIR, exist_ok=True)
    views = VIEWS.get(MAP, {})
    names = ['menu'] + list(views.keys()) if SEL == 'all' else SEL.split(',')
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('RAFFICA_CHROME') or None, args=GL_ARGS + ['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': W, 'height': H})
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        t0 = time.time()
        while time.time() - t0 < 300:
            await asyncio.sleep(1)
            if await pg.evaluate("!!(window.RAFFICA && window.RAFFICA.Game && window.RAFFICA.Game.state === 'menu')"):
                break
        print('menu after', round(time.time() - t0, 1), 's')
        t1 = time.time()
        await pg.evaluate(f"window.RAFFICA.HUD.pickMap('{MAP}')")
        while time.time() - t1 < 300:
            await asyncio.sleep(1)
            if await pg.evaluate(f"window.RAFFICA.Game.mapId === '{MAP}' && !window.RAFFICA.HUD._mapBusy"):
                break
        await asyncio.sleep(3)
        print('map', MAP, 'loaded after', round(time.time() - t1, 1), 's')
        for v in names:
            t2 = time.time()
            if v == 'menu':
                await pg.screenshot(path=f'{OUTDIR}/{MAP}_menu.png', timeout=240000)
                print('view menu', round(time.time() - t2, 1), 's')
                continue
            cam = views.get(v)
            js = """(cam) => {
              const { Game: G, R } = window.RAFFICA;
              document.querySelector('#menu').hidden = true;
              if (!G.__origMenu) G.__origMenu = G.updateMenu;
              if (cam) { G.updateMenu = function () {}; R.camera.position.set(...cam[0]); R.camera.lookAt(...cam[1]); R.camera.fov = cam[2]; R.camera.updateProjectionMatrix(); }
              else G.updateMenu = G.__origMenu;
              R.vmScene.visible = false;
              R.render(G.time);
              return R.camera.position.toArray().map((x) => +x.toFixed(1));
            }"""
            pos = await pg.evaluate(js, cam)
            await asyncio.sleep(1.5)
            await pg.screenshot(path=f'{OUTDIR}/{MAP}_{v}.png', timeout=240000)
            print('view', v, pos, round(time.time() - t2, 1), 's')
        print('errs', json.dumps(await pg.evaluate('window.__errs || []')))
        for l in logs[-30:]:
            if 'GL Driver' not in l:
                print(l[:300])
        await b.close()

asyncio.run(main())
