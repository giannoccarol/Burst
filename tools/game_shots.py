#!/usr/bin/env python3
"""Drive a game page through scripted scenes and screenshot each one.

usage: python3 tools/game_shots.py URL OUT_DIR SCENES.json [--w 960 --h 540] [--gpu] [--boot 60]
SCENES.json: [{"name": "ar_hip", "js": "...expression...", "wait": 1.5, "shot": true}, ...]
Waits for RAFFICA.Game.state == 'playing' (or 'menu' with "state": "menu" as first scene key),
prints each scene's JS result, then window.__errs and console errors.
"""
import asyncio, json, os, sys, time
from playwright.async_api import async_playwright

args = sys.argv[1:]
def opt(n, d):
    if n in args:
        i = args.index(n); v = args[i + 1]; del args[i:i + 2]; return v
    return d
W = int(opt('--w', 960)); H = int(opt('--h', 540)); boot = float(opt('--boot', 90))
gpu = '--gpu' in args
if gpu: args.remove('--gpu')
url, out, spec = args[0], args[1], json.load(open(args[2]))
os.makedirs(out, exist_ok=True)
GL = [] if gpu else ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
BG = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows']

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GL + BG)
        pg = await (await b.new_context(viewport={'width': W, 'height': H})).new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        t0 = time.time()
        await pg.goto(url)
        want = spec[0].get('state', 'playing') if spec else 'playing'
        try:
            await pg.wait_for_function(f"window.RAFFICA && RAFFICA.Game.state === '{want}'", timeout=boot * 1000)
        except Exception:
            print('boot timeout')
        print('booted in %.1fs' % (time.time() - t0))
        for sc in spec:
            if 'js' in sc:
                try:
                    r = await pg.evaluate(sc['js'])
                    print(sc['name'], json.dumps(r)[:1500])
                except Exception as e:
                    print(sc['name'], 'ERR', str(e)[:400])
            await asyncio.sleep(sc.get('wait', 1.0))
            if sc.get('shot', True):
                await pg.screenshot(path=os.path.join(out, sc['name'] + '.png'))
        errs = await pg.evaluate('window.__errs || []')
        print('ERRS', json.dumps(errs)[:2000])
        for l in dict.fromkeys(logs):
            if 'GPU stall' in l or 'GL Driver' in l: continue
            print(l[:300])
        await b.close()
asyncio.run(main())
