"""Screenshots of the Borgo map from preset cameras (test/map_main.js harness).

build:  python3 build.py test/map.html --standalone --template test/tpl.html --main test/map_main.js \
            --files 00_head.js,01_util.js,02_textures.js,03_world.js,04a_materials.js,04b_geo.js,04c_build.js,04d_props.js,04e_map.js,04f_mapbuild.js,05_render.js
usage:  python3 test/views.py "http://127.0.0.1:8765/test/map.html?q=2" /tmp/views overview,piazza,church [1280 720]
views:  overview, piazza, church, alley, terrace, cafe, loggia, sky
env:    RAFFICA_CHROME, RAFFICA_GPU (see run.py)
"""
import asyncio, sys, json, time, os
from playwright.async_api import async_playwright

URL = sys.argv[1]
OUTDIR = sys.argv[2]
VIEWS = sys.argv[3].split(',')
W = int(sys.argv[4]) if len(sys.argv) > 4 else 1280
H = int(sys.argv[5]) if len(sys.argv) > 5 else 720
GL_ARGS = [] if os.environ.get('RAFFICA_GPU') == '1' else ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']


async def main():
    os.makedirs(OUTDIR, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('RAFFICA_CHROME') or None, args=GL_ARGS)
        pg = await b.new_page(viewport={'width': W, 'height': H})
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        t0 = time.time()
        while time.time() - t0 < 600:
            await asyncio.sleep(1)
            if await pg.evaluate('window.__done === true'):
                break
        info = await pg.evaluate('window.__info || null')
        print('INFO', json.dumps(info), 'load', round(time.time() - t0, 1), 's')
        for v in VIEWS:
            if not v:
                continue
            t1 = time.time()
            await pg.evaluate(f"window.__setView && window.__setView('{v}')")
            await pg.screenshot(path=f'{OUTDIR}/{v}.png')
            print('view', v, round(time.time() - t1, 1), 's')
        for l in logs[-40:]:
            print(l)
        await b.close()

asyncio.run(main())
