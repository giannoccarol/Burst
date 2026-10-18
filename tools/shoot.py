#!/usr/bin/env python3
"""Screenshot pages that set window.__done (tools/view.html, test harnesses).

usage: python3 tools/shoot.py OUT_DIR "name|url" ["name|url" ...] [--w 900 --h 500] [--gpu]
Prints window.__info of every page as JSON.
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

args = sys.argv[1:]


def opt(n, d):
    if n in args:
        i = args.index(n); v = args[i + 1]; del args[i:i + 2]; return v
    return d


W = int(opt('--w', 900)); H = int(opt('--h', 500))
gpu = '--gpu' in args
if gpu:
    args.remove('--gpu')
out = args[0]
os.makedirs(out, exist_ok=True)
GL = [] if gpu else ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GL)
        ctx = await b.new_context(viewport={'width': W, 'height': H})
        for spec in args[1:]:
            name, url = spec.split('|', 1)
            pg = await ctx.new_page()
            logs = []
            pg.on('console', lambda m: logs.append(m.text))
            pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
            await pg.goto(url)
            try:
                await pg.wait_for_function('window.__done === true', timeout=60000)
            except Exception as e:
                logs.append('timeout')
            info = await pg.evaluate('window.__info || null')
            await pg.screenshot(path=os.path.join(out, name + '.png'))
            print(name, json.dumps(info), ' | '.join(l for l in logs if 'GPU stall' not in l)[:600])
            await pg.close()
        await b.close()

asyncio.run(main())
