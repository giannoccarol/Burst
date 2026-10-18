"""Headless test runner: opens one or more pages in the same Chromium (pages talk to
each other through the BroadcastChannel mock in mock_claude.js), runs JS steps at
given times, takes screenshots and prints console output / page errors.

usage:
  python3 test/run.py --pages "URL1|URL2" [--wait 60] [--out /tmp/x] [--w 960 --h 540]
                      [--steps "T:PAGE:JS;;T:PAGE:@file.js"] [--shots 20,40 | end] [--eval @file.js]

env:
  RAFFICA_CHROME=/path/to/chrome   use a specific Chromium (default: Playwright's own)
  RAFFICA_GPU=1                    use the real GPU instead of SwiftShader (faster, machine-dependent)
"""
import asyncio, json, time, argparse, os
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser()
ap.add_argument('--pages', required=True, help='urls separated by |')
ap.add_argument('--wait', type=float, default=10)
ap.add_argument('--out', default='/tmp/raffica')
ap.add_argument('--eval', default='')
ap.add_argument('--w', type=int, default=960)
ap.add_argument('--h', type=int, default=540)
ap.add_argument('--steps', default='', help='js to run on page i at time t: "t:i:js;;t:i:@file.js"')
ap.add_argument('--shots', default='end', help='comma list of times to screenshot (or end, or none)')
ap.add_argument('--json', default='', help='also write step/eval results (parsed) to this JSON file')
ap.add_argument('--stagger', type=float, default=0.5, help='seconds between opening pages')
args = ap.parse_args()

GL_ARGS = [] if os.environ.get('RAFFICA_GPU') == '1' else ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
BG_ARGS = ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
           '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling']


def load_js(s):
    s = s.strip()
    return open(s[1:], encoding='utf-8').read() if s.startswith('@') else s


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('RAFFICA_CHROME') or None, args=GL_ARGS + BG_ARGS)
        ctx = await b.new_context(viewport={'width': args.w, 'height': args.h})
        pages, logs = [], []
        for i, url in enumerate(args.pages.split('|')):
            pg = await ctx.new_page()
            pg.on('console', lambda m, i=i: logs.append(f'[{i}][{m.type}] {m.text}'))
            pg.on('pageerror', lambda e, i=i: logs.append(f'[{i}][pageerror] {e}'))
            await pg.goto(url)
            pages.append(pg)
            await asyncio.sleep(args.stagger)
        steps = []
        for s in [x for x in args.steps.split(';;') if x.strip()]:
            t, i, js = s.split(':', 2)
            steps.append((float(t), int(i), load_js(js)))
        shots = [] if args.shots in ('end', 'none') else [float(x) for x in args.shots.split(',')]
        results = {'steps': [], 'evals': []}
        t0 = time.time()
        done_steps, done_shots = set(), set()
        while True:
            el = time.time() - t0
            for k, (t, i, js) in enumerate(steps):
                if k not in done_steps and el >= t:
                    done_steps.add(k)
                    try:
                        r = await pages[i].evaluate(js)
                        results['steps'].append({'t': t, 'page': i, 'result': r})
                        print(f'step {t}s p{i}:', json.dumps(r)[:20000])
                    except Exception as e:
                        print(f'step {t}s p{i} ERR', str(e)[:300])
            for st in shots:
                if st not in done_shots and el >= st:
                    done_shots.add(st)
                    for i, pg in enumerate(pages):
                        await pg.screenshot(path=f'{args.out}_{int(st)}_{i}.png')
            if el >= args.wait:
                break
            await asyncio.sleep(0.25)
        for i, pg in enumerate(pages):
            if args.eval:
                try:
                    r = await pg.evaluate(load_js(args.eval))
                    results['evals'].append(r)
                    print(f'EVAL p{i}:', json.dumps(r)[:3000])
                except Exception as e:
                    print(f'EVAL p{i} ERR', str(e)[:500])
            if args.shots == 'end':
                await pg.screenshot(path=f'{args.out}_{i}.png')
        if args.json:
            with open(args.json, 'w', encoding='utf-8') as fh:
                json.dump(results, fh)
        seen = set()
        for l in logs:
            if l in seen:
                continue
            seen.add(l)
            print(l[:400])
        await b.close()

asyncio.run(main())
