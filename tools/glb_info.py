#!/usr/bin/env python3
"""Print the structure of a .glb (node tree with world-space boxes, skins, animations).

usage: python3 -I tools/glb_info.py model.glb [--anim] [--nodes REGEX]

Reads the JSON chunk and the accessor min/max only: nothing in the file is executed.
"""
import json, struct, sys, re
import numpy as np


def load(path):
    with open(path, 'rb') as f:
        data = f.read()
    magic, ver, length = struct.unpack_from('<4sII', data, 0)
    assert magic == b'glTF', 'not a glb'
    off, js, binc = 12, None, None
    while off < length:
        clen, ctype = struct.unpack_from('<I4s', data, off)
        chunk = data[off + 8: off + 8 + clen]
        if ctype == b'JSON':
            js = json.loads(chunk.decode('utf-8'))
        elif ctype == b'BIN\x00':
            binc = chunk
        off += 8 + clen
    return js, binc


def quat_mat(q):
    x, y, z, w = q
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def local(n):
    if 'matrix' in n:
        return np.array(n['matrix'], dtype=float).reshape(4, 4).T
    m = np.eye(4)
    s = n.get('scale', [1, 1, 1])
    r = quat_mat(n.get('rotation', [0, 0, 0, 1]))
    m[:3, :3] = r * np.array(s)
    m[:3, 3] = n.get('translation', [0, 0, 0])
    return m


def main():
    path = sys.argv[1]
    show_anim = '--anim' in sys.argv
    rx = sys.argv[sys.argv.index('--nodes') + 1] if '--nodes' in sys.argv else None
    js, binc = load(path)
    nodes = js.get('nodes', [])
    meshes = js.get('meshes', [])
    acc = js.get('accessors', [])
    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get('children', []):
            parent[c] = i
    world = {}

    def W(i):
        if i in world:
            return world[i]
        m = local(nodes[i])
        if i in parent:
            m = W(parent[i]) @ m
        world[i] = m
        return m

    joints = set()
    for s in js.get('skins', []):
        joints.update(s['joints'])

    def mesh_box(mi, M):
        lo, hi = np.full(3, 1e9), np.full(3, -1e9)
        tris = 0
        for p in meshes[mi]['primitives']:
            a = acc[p['attributes']['POSITION']]
            mn, mx = np.array(a['min']), np.array(a['max'])
            for cx in (mn[0], mx[0]):
                for cy in (mn[1], mx[1]):
                    for cz in (mn[2], mx[2]):
                        v = M @ np.array([cx, cy, cz, 1])
                        lo = np.minimum(lo, v[:3]); hi = np.maximum(hi, v[:3])
            if 'indices' in p:
                tris += acc[p['indices']]['count'] // 3
        return lo, hi, tris

    roots = js['scenes'][js.get('scene', 0)]['nodes']

    def fmt(v):
        return '(' + ', '.join('%.3f' % x for x in v) + ')'

    def walk(i, d):
        n = nodes[i]
        M = W(i)
        name = n.get('name', '')
        tag = ''
        if i in joints:
            tag += ' [joint]'
        if 'skin' in n:
            tag += ' [skin %d]' % n['skin']
        line = '  ' * d + '#%d %s%s pos=%s' % (i, name, tag, fmt(M[:3, 3]))
        if 'mesh' in n:
            lo, hi, tris = mesh_box(n['mesh'], M if 'skin' not in n else np.eye(4))
            mats = [p.get('material') for p in meshes[n['mesh']]['primitives']]
            line += ' mesh=%d tris=%d box=%s..%s mat=%s' % (n['mesh'], tris, fmt(lo), fmt(hi), mats)
        if rx is None or re.search(rx, name, re.I) or 'mesh' in n:
            print(line)
        for c in n.get('children', []):
            walk(c, d + 1)

    for r in roots:
        walk(r, 0)
    for k, m in enumerate(js.get('materials', [])):
        print('material', k, m.get('name'), json.dumps({x: m[x] for x in m if x not in ('name',)})[:300])
    for k, s in enumerate(js.get('skins', [])):
        print('skin', k, 'joints', len(s['joints']), 'skeleton', s.get('skeleton'))
    for k, a in enumerate(js.get('animations', [])):
        tmax = 0
        targets = {}
        for ch in a['channels']:
            smp = a['samplers'][ch['sampler']]
            inp = acc[smp['input']]
            tmax = max(tmax, inp.get('max', [0])[0])
            nd = ch['target'].get('node')
            targets.setdefault(nd, []).append(ch['target']['path'] + ':' + str(inp['count']))
        print('animation', k, a.get('name'), 'channels', len(a['channels']), 'duration %.3f' % tmax)
        if show_anim:
            for nd, paths in targets.items():
                print('   ', nd, nodes[nd].get('name') if nd is not None else None, paths)


if __name__ == '__main__':
    main()
