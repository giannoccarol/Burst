#!/usr/bin/env python3
"""Print how much animated nodes move over time, to find sub-clips inside one long clip.

usage: python3 -I tools/glb_anim.py model.glb [NODE_REGEX] [--step 0.1]
For every animated node matching NODE_REGEX: per time step, the distance of its translation
from the value at t=0 and the rotation angle (degrees) from the rotation at t=0.
"""
import sys, re, struct, json
import numpy as np
sys.path.insert(0, __import__('os').path.dirname(__file__))
from glb_info import load

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def read(js, binc, ai):
    a = js['accessors'][ai]
    bv = js['bufferViews'][a['bufferView']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    n = NC[a['type']]
    dt = CT[a['componentType']]
    arr = np.frombuffer(binc, dtype=dt, count=a['count'] * n, offset=off).reshape(a['count'], n).astype(float)
    if a.get('normalized'):
        arr = arr / np.iinfo(dt).max
    return arr


def main():
    path = sys.argv[1]
    rx = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else '.'
    step = float(sys.argv[sys.argv.index('--step') + 1]) if '--step' in sys.argv else 0.1
    js, binc = load(path)
    nodes = js['nodes']
    for an in js.get('animations', []):
        rows = {}
        tmax = 0
        for ch in an['channels']:
            nd = ch['target'].get('node')
            name = nodes[nd].get('name', str(nd))
            if not re.search(rx, name, re.I):
                continue
            s = an['samplers'][ch['sampler']]
            t = read(js, binc, s['input'])[:, 0]
            v = read(js, binc, s['output'])
            tmax = max(tmax, t[-1])
            rows[(name, ch['target']['path'])] = (t, v)
        ts = np.arange(0, tmax + 1e-6, step)
        print('time   ' + ' '.join('%5.1f' % x for x in ts))
        for (name, path), (t, v) in sorted(rows.items()):
            if path not in ('translation', 'rotation'):
                continue
            out = []
            for x in ts:
                i = min(np.searchsorted(t, x), len(t) - 1)
                cur, ref = v[i], v[0]
                if path == 'translation':
                    out.append(np.linalg.norm(cur - ref))
                else:
                    d = abs(float(np.dot(cur, ref)))
                    out.append(np.degrees(2 * np.arccos(min(1.0, d))))
            scale = max(out) or 1
            print('%-22s %s max=%.3g' % ((name[:16] + ' ' + path[0]), ''.join(' %5d' % round(o / scale * 99) if path == 'translation' else ' %5d' % round(o) for o in out), scale))


if __name__ == '__main__' and '--rest' not in sys.argv:
    main()


def rest_profile(path, step=1 / 30):
    """Print, per time step, how far the whole pose is from the pose at t=0 (0 = identical)."""
    js, binc = load(path)
    out = None
    for an in js.get('animations', []):
        chans = []
        tmax = 0
        for ch in an['channels']:
            if ch['target']['path'] not in ('translation', 'rotation'):
                continue
            s = an['samplers'][ch['sampler']]
            t = read(js, binc, s['input'])[:, 0]
            v = read(js, binc, s['output'])
            tmax = max(tmax, t[-1])
            chans.append((ch['target']['path'], t, v))
        ts = np.arange(0, tmax + 1e-6, step)
        prof = []
        for x in ts:
            d = 0
            for p, t, v in chans:
                i = min(np.searchsorted(t, x), len(t) - 1)
                if p == 'rotation':
                    d += np.degrees(2 * np.arccos(min(1.0, abs(float(np.dot(v[i], v[0])))))) / 10
                else:
                    sc = max(np.ptp(v, axis=0).max(), 1e-9)
                    d += np.linalg.norm(v[i] - v[0]) / sc
            prof.append(d)
        out = list(zip(ts, prof))
    return out


if __name__ == '__main__' and '--rest' in sys.argv:
    prof = rest_profile(sys.argv[1])
    print(' '.join('%.2f:%d' % (t, round(d)) for t, d in prof))
