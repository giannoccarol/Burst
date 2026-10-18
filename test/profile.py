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
ap.add_argument('--gfx', default='', help='JSON of custom graphics values (implies quality custom)')
ap.add_argument('--bench', action='store_true', help='deterministic: bots frozen, player teleported to a fixed spot, fixed starting yaw')
ap.add_argument('--callers', default='texSubImage2D,getProgramParameter,texImage2D,readPixels,getParameter', help='comma list of functions whose callers to print')
ap.add_argument('--shot', default='', help='save a screenshot here at the end')
ap.add_argument('--quality', default='', help='graphics preset to force (minimo, basso, medio, alto, ultra, estremo)')
args = ap.parse_args()

GPU_ARGS = ['--disable-blink-features=AutomationControlled', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required']

START = """([secs, bench]) => new Promise((resolve) => {
  const G = RAFFICA.Game, R = RAFFICA.R, me = G.me;
  if (bench) { G.updateBotsHost = () => {}; const bt = window.__benchSpot || [0, 6, 0]; me.mover.reset(bt[0], bt[1], bt[2]); me.yaw = 0; me.pitch = -0.05; }
  try { me.spawnProt = 1e9; } catch (e) {}
  const ft = [], t0 = performance.now(), info0 = performance.memory ? performance.memory.usedJSHeapSize : 0;
  let last = t0, calls = 0, tris = 0, n = 0, upd = 0, ren = 0, heapDrops = 0, lastHeap = info0;
  const prog0 = R.renderer.info.programs ? R.renderer.info.programs.length : 0; R.renderer.info.autoReset = false;
  // GPU time per frame with EXT_disjoint_timer_query_webgl2 around R.render
  const gl0 = R.renderer.getContext(), tq = gl0.getExtension('EXT_disjoint_timer_query_webgl2'), gpu = [], pend = [];
  const orig = R.render.bind(R);
  // program churn: programs created/deleted during the sample and where the creations come from
  const spikes = [];
  let pc = 0, pd = 0; const pstk = {}; let gppN = 0, gppMs = 0, gppMax = 0; const gPP = gl0.getProgramParameter.bind(gl0); gl0.getProgramParameter = function (p, n) { const t = performance.now(); const r = gPP(p, n); const d = performance.now() - t; gppN++; gppMs += d; if (d > gppMax) gppMax = d; return r; }; const progSet = new Set(R.renderer.info.programs || []);
  const cP = gl0.createProgram.bind(gl0), dP = gl0.deleteProgram.bind(gl0);
  gl0.createProgram = function () { pc++; const st = (new Error().stack || '').split(String.fromCharCode(10)).slice(3, 14).map((l) => l.trim().split('/').pop()).filter((l) => l.indexOf('three.module') < 0).slice(0, 4).join(' < '); pstk[st] = (pstk[st] || 0) + 1; return cP(); };
  gl0.deleteProgram = function (p) { pd++; return dP(p); };
  if (tq) R.render = function (t) { const q = gl0.createQuery(); gl0.beginQuery(tq.TIME_ELAPSED_EXT, q); orig(t); gl0.endQuery(tq.TIME_ELAPSED_EXT); pend.push(q); };
  const poll = () => { while (pend.length && gl0.getQueryParameter(pend[0], gl0.QUERY_RESULT_AVAILABLE)) { const q = pend.shift(); if (!gl0.getParameter(tq.GPU_DISJOINT_EXT)) gpu.push(gl0.getQueryParameter(q, gl0.QUERY_RESULT) / 1e6); gl0.deleteQuery(q); } };
  const tick = (t) => {
    if (t - last > 40 && G.prof) spikes.push([+(t - last).toFixed(0), +G.prof.u.toFixed(1), +G.prof.r.toFixed(1)]);
    ft.push(t - last); last = t; me.yaw += 0.012; if (tq) poll();
    const ri = R.renderer.info.render; calls += ri.calls; tris += ri.triangles; n++; R.renderer.info.reset();
    if (G.prof) { upd += G.prof.upd; ren += G.prof.ren; }
    if (performance.memory) { const h = performance.memory.usedJSHeapSize; if (h < lastHeap - 1e6) heapDrops++; lastHeap = h; }
    if (t - t0 < secs * 1000) requestAnimationFrame(tick);
    else {
      if (tq) R.render = orig; gl0.createProgram = cP; gl0.deleteProgram = dP; gl0.getProgramParameter = gPP;
      const gs = gpu.slice(5).sort((a, b) => a - b), gq = (p) => gs[Math.min(gs.length - 1, Math.floor(gs.length * p))] || 0;
      const s = ft.slice(5).sort((a, b) => a - b), q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))] || 0;
      const gl = R.renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
      resolve({ frames: s.length, fps: +(1000 / (s.reduce((a, b) => a + b, 0) / s.length)).toFixed(1), med: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +q(1).toFixed(2),
        over33: s.filter((x) => x > 33.4).length, gpuMed: tq ? +gq(0.5).toFixed(2) : null, gpuP95: tq ? +gq(0.95).toFixed(2) : null, calls: Math.round(calls / n), tris: Math.round(tris / n), updMs: +(upd / n).toFixed(2), renCpuMs: +(ren / n).toFixed(2),
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, gcDrops: heapDrops, programs: R.renderer.info.programs ? R.renderer.info.programs.length : null, progNew: (R.renderer.info.programs || []).filter((p) => !progSet.has(p)).map((p) => { const k = String(p.cacheKey).split(','); const o = [...progSet].filter((q) => q.name === p.name).map((q) => String(q.cacheKey).split(',')); const d = o.map((ok) => k.map((v, i) => v !== ok[i] ? i + ':' + ok[i] + '>' + v : null).filter(Boolean)).sort((a, b) => a.length - b.length)[0]; return p.name + ' diff ' + JSON.stringify(d || 'none-same-name'); }), spikes: spikes.slice(0, 40), gpp: [gppN, +gppMs.toFixed(1), +gppMax.toFixed(1)], progCreated: pc, progDeleted: pd, progFrom: Object.entries(pstk).sort((a, b) => b[1] - a[1]).slice(0, 6), newPrograms: (R.renderer.info.programs ? R.renderer.info.programs.length : 0) - prog0,
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
            await pg.add_init_script("try { const s = JSON.parse(localStorage.getItem('raffica.settings') || '{}'); s.quality = %s; if (%s) s.gfx = %s; localStorage.setItem('raffica.settings', JSON.stringify(s)); } catch (e) {}" % (json.dumps(args.quality), 'true' if args.gfx else 'false', args.gfx or 'null'))
        await pg.goto(args.url)
        await asyncio.sleep(args.warm)
        cdp = await pg.context.new_cdp_session(pg)
        await cdp.send('Profiler.enable')
        await cdp.send('Profiler.setSamplingInterval', {'interval': 250})
        await cdp.send('Profiler.start')
        stats = await pg.evaluate(START, [args.secs, args.bench])
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
            if fn in args.callers.split(','):
                chain, k = [], parent.get(nid)
                while k is not None and len(chain) < 6:
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
        if args.shot: await pg.screenshot(path=args.shot)
        if args.out:
            with open(args.out, 'w') as fh: json.dump(out, fh, indent=1)
        await b.close()

asyncio.run(main())
