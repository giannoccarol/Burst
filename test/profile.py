"""Performance profile of a running match on the real GPU: frame times, CPU self-time by function
(Chrome sampling profiler over CDP), draw calls / triangles, JS heap growth.

usage: .venv/bin/python test/profile.py URL [--warm 20] [--secs 10] [--w 1280 --h 720] [--top 30] [--out file.json]
  URL e.g. http://127.0.0.1:8765/test/game.html#offline&bots=8&mode=0&map=villette
The page turns the camera slowly during the sample so frustum culling and shadows behave like real play.
"""
import asyncio, argparse, json, time, os, collections
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser()
ap.add_argument('url')
ap.add_argument('--warm', type=float, default=20)
ap.add_argument('--secs', type=float, default=10)
ap.add_argument('--w', type=int, default=1280)
ap.add_argument('--h', type=int, default=720)
ap.add_argument('--top', type=int, default=30)
ap.add_argument('--out', default='')
ap.add_argument('--quality', default='', help='graphics preset to force (minimo, basso, medio, alto, ultra, estremo)')
args = ap.parse_args()

GPU_ARGS = ['--disable-blink-features=AutomationControlled', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required']

START = """(secs) => new Promise((resolve) => {
  const G = RAFFICA.Game, R = RAFFICA.R, me = G.me;
  try { me.spawnProt = 1e9; } catch (e) {}
  const ft = [], t0 = performance.now(), info0 = performance.memory ? performance.memory.usedJSHeapSize : 0;
  let last = t0, calls = 0, tris = 0, n = 0, upd = 0, ren = 0, heapDrops = 0, lastHeap = info0;
  const prog0 = R.renderer.info.programs ? R.renderer.info.programs.length : 0; R.renderer.info.autoReset = false;
  const tick = (t) => {
    ft.push(t - last); last = t; me.yaw += 0.012;
    const ri = R.renderer.info.render; calls += ri.calls; tris += ri.triangles; n++; R.renderer.info.reset();
    if (G.prof) { upd += G.prof.upd; ren += G.prof.ren; }
    if (performance.memory) { const h = performance.memory.usedJSHeapSize; if (h < lastHeap - 1e6) heapDrops++; lastHeap = h; }
    if (t - t0 < secs * 1000) requestAnimationFrame(tick);
    else {
      const s = ft.slice(5).sort((a, b) => a - b), q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))] || 0;
      const gl = R.renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
      resolve({ frames: s.length, fps: +(1000 / (s.reduce((a, b) => a + b, 0) / s.length)).toFixed(1), med: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +q(1).toFixed(2),
        over33: s.filter((x) => x > 33.4).length, calls: Math.round(calls / n), tris: Math.round(tris / n), updMs: +(upd / n).toFixed(2), renCpuMs: +(ren / n).toFixed(2),
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, gcDrops: heapDrops, programs: R.renderer.info.programs ? R.renderer.info.programs.length : null, newPrograms: (R.renderer.info.programs ? R.renderer.info.programs.length : 0) - prog0,
        textures: R.renderer.info.memory.textures, geometries: R.renderer.info.memory.geometries, gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '?',
        preset: (typeof SETTINGS !== 'undefined' ? SETTINGS.quality : '?'), dpr: R.dpr, bots: G.bots.length, ents: G.ents.size, errs: (window.__errs || []).slice(0, 3) });
    }
  };
  requestAnimationFrame(tick);
})"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('RAFFICA_CHROME') or None, args=GPU_ARGS)
        pg = await b.new_page(viewport={'width': args.w, 'height': args.h})
        logs = []
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        if args.quality:
            await pg.add_init_script("try { const s = JSON.parse(localStorage.getItem('raffica.settings') || '{}'); s.quality = %s; localStorage.setItem('raffica.settings', JSON.stringify(s)); } catch (e) {}" % json.dumps(args.quality))
        await pg.goto(args.url)
        await asyncio.sleep(args.warm)
        cdp = await pg.context.new_cdp_session(pg)
        await cdp.send('Profiler.enable')
        await cdp.send('Profiler.setSamplingInterval', {'interval': 250})
        await cdp.send('Profiler.start')
        stats = await pg.evaluate(START, args.secs)
        prof = (await cdp.send('Profiler.stop'))['profile']
        # self time per function (sample counts * interval)
        nodes = {n['id']: n for n in prof['nodes']}
        counts = collections.Counter(prof.get('samples', []))
        dt = (prof['endTime'] - prof['startTime']) / max(1, len(prof.get('samples', []))) / 1000.0  # ms per sample
        selfms = collections.Counter()
        for nid, c in counts.items():
            cf = nodes[nid]['callFrame']
            name = cf['functionName'] or '(anon)'
            url = cf['url'].rsplit('/', 1)[-1]
            selfms[f"{name} {url}:{cf['lineNumber'] + 1}"] += c * dt
        # who calls the expensive native GL entry points
        parent = {}
        for n in prof['nodes']:
            for c in n.get('children', []): parent[c] = n['id']
        callers = collections.defaultdict(collections.Counter)
        for nid, c in counts.items():
            fn = nodes[nid]['callFrame']['functionName']
            if fn in ('texSubImage2D', 'getProgramParameter', 'texImage2D', 'readPixels', 'getParameter'):
                chain, k = [], parent.get(nid)
                while k is not None and len(chain) < 4:
                    cf = nodes[k]['callFrame']; chain.append(f"{cf['functionName'] or '(anon)'}:{cf['lineNumber'] + 1}"); k = parent.get(k)
                callers[fn][' < '.join(chain)] += c * dt
        total = sum(selfms.values()) or 1
        top = [{'fn': k, 'ms': round(v, 1), 'pct': round(100 * v / total, 1)} for k, v in selfms.most_common(args.top)]
        out = {'url': args.url, 'stats': stats, 'cpuTotalMs': round(total, 1), 'top': top, 'logs': logs[:5]}
        print(json.dumps(stats))
        for t in top: print(f"{t['pct']:5.1f}%  {t['ms']:8.1f} ms  {t['fn']}")
        for fn, cs in callers.items():
            print('callers of', fn)
            for k, v in cs.most_common(4): print(f'   {v:7.1f} ms  {k}')
        if args.out:
            with open(args.out, 'w') as fh: json.dump(out, fh, indent=1)
        await b.close()

asyncio.run(main())
