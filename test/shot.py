"""Single screenshot of a test harness page that sets window.__done / window.__info
(for example the material swatch sheet, test/swatch_main.js).

build:  python3 build.py test/swatch.html --standalone --template test/tpl.html --main test/swatch_main.js \
            --files 00_head.js,01_util.js,02_textures.js,02b_textures_extra.js,04a_materials.js
usage:  python3 test/shot.py http://127.0.0.1:8765/test/swatch.html /tmp/swatch.png [wait=30] [1280 720]
env:    RAFFICA_CHROME, RAFFICA_GPU (see run.py)
"""
import asyncio, sys, json, time, os
from playwright.async_api import async_playwright

URL = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/shot.png'
WAIT = float(sys.argv[3]) if len(sys.argv) > 3 else 30
W = int(sys.argv[4]) if len(sys.argv) > 4 else 1280
H = int(sys.argv[5]) if len(sys.argv) > 5 else 720
GL_ARGS = [] if os.environ.get('RAFFICA_GPU') == '1' else ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('RAFFICA_CHROME') or None, args=GL_ARGS + ['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': W, 'height': H})
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        t0 = time.time()
        while time.time() - t0 < WAIT:
            await asyncio.sleep(0.5)
            if await pg.evaluate('window.__done === true'):
                break
        info = await pg.evaluate('window.__info || null')
        await pg.screenshot(path=OUT)
        print('INFO', json.dumps(info))
        for l in logs[-60:]:
            print(l)
        await b.close()

asyncio.run(main())
