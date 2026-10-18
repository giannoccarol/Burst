"""Screenshots of the real game on the GPU (no test flags: full quality), optionally after running JS.

usage: .venv/bin/python test/shot.py URL --out shot.png [--wait 25] [--js @file.js | --js "code"] [--after 2]
       [--w 1600 --h 900] [--quality ultra] [--views @views.json]   (views: [[name, js], ...] one shot each)
The JS runs in the page after --wait seconds (it may return a promise); shots are taken --after seconds later.
"""
import asyncio, argparse, json, os
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser()
ap.add_argument('url'); ap.add_argument('--out', default='shot.png')
ap.add_argument('--wait', type=float, default=25); ap.add_argument('--after', type=float, default=2)
ap.add_argument('--js', default=''); ap.add_argument('--views', default='')
ap.add_argument('--w', type=int, default=1600); ap.add_argument('--h', type=int, default=900)
ap.add_argument('--quality', default='')
a = ap.parse_args()
src = lambda s: open(s[1:]).read() if s.startswith('@') else s
GPU = ['--disable-blink-features=AutomationControlled', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling',
       '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required']

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('RAFFICA_CHROME') or None, args=GPU)
        pg = await b.new_page(viewport={'width': a.w, 'height': a.h})
        pg.on('pageerror', lambda e: print('[pageerror]', e))
        pg.on('console', lambda m: m.type in ('error', 'warning') and print('[' + m.type + ']', m.text[:300]))
        if a.quality:
            await pg.add_init_script("try { const s = JSON.parse(localStorage.getItem('raffica.settings') || '{}'); s.quality = %s; localStorage.setItem('raffica.settings', JSON.stringify(s)); } catch (e) {}" % json.dumps(a.quality))
        await pg.goto(a.url)
        await asyncio.sleep(a.wait)
        if a.js:
            r = await pg.evaluate('async () => { ' + src(a.js) + ' }')
            if r is not None: print(json.dumps(r)[:4000])
        if a.views:
            base, ext = os.path.splitext(a.out)
            for name, js in json.loads(src(a.views)):
                r = await pg.evaluate('async () => { ' + js + ' }')
                if r is not None: print(name, json.dumps(r)[:1000])
                await asyncio.sleep(a.after)
                await pg.screenshot(path=f'{base}_{name}{ext}'); print('shot', f'{base}_{name}{ext}')
        else:
            await asyncio.sleep(a.after)
            await pg.screenshot(path=a.out); print('shot', a.out)
        await b.close()

asyncio.run(main())
