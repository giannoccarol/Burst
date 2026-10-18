#!/usr/bin/env python3
"""Summarise soldier GLBs: parts (meshes), material slots, bones, size.

usage: python3 -I tools/soldier_report.py a.glb [b.glb ...] [--md]
Reads the JSON chunk only.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from glb_info import load


def part_name(js, node):
    mi = node.get('mesh')
    mn = js['meshes'][mi].get('name', '') if mi is not None else ''
    return re.sub(r'_PackedMaterial\d+mat.*$', '', mn) or node.get('name', '')


def main():
    files = [a for a in sys.argv[1:] if not a.startswith('--')]
    for f in files:
        js, _ = load(f)
        nodes = js['nodes']
        acc = js['accessors']
        parts = []
        for n in nodes:
            if 'mesh' in n and 'skin' in n:
                m = js['meshes'][n['mesh']]
                tris = sum(acc[p['indices']]['count'] // 3 for p in m['primitives'] if 'indices' in p)
                mats = [js['materials'][p['material']].get('name', '?') for p in m['primitives'] if 'material' in p]
                parts.append((n.get('name', ''), part_name(js, n), tris, mats))
        bones = []
        for s in js.get('skins', []):
            bones = [re.sub(r'_\d+$', '', nodes[j].get('name', '').replace('mixamorig:', '')) for j in s['joints']]
        mats = []
        for m in js.get('materials', []):
            tex = [k for k in ('baseColorTexture', 'metallicRoughnessTexture') if k in m.get('pbrMetallicRoughness', {})] + [k for k in ('normalTexture', 'occlusionTexture', 'emissiveTexture') if k in m]
            mats.append('%s[%s]' % (m.get('name'), ','.join(t.replace('Texture', '') for t in tex)))
        fingers = sorted({re.sub(r'^(Left|Right)Hand|\d+$', '', b) for b in bones if 'Hand' in b and b not in ('LeftHand', 'RightHand')})
        print('==', os.path.basename(os.path.dirname(f)) or f, os.path.basename(f), '%.1f MB' % (os.path.getsize(f) / 1048576))
        print('   parts:', ', '.join('%s(%d)%s' % (p[1], p[2], '/' + '+'.join(p[3])) for p in parts), '| total tris', sum(p[2] for p in parts))
        print('   materials:', '; '.join(mats))
        print('   bones:', len(bones), 'fingers:', ','.join(fingers) or '-')
        print('   bone names:', ' '.join(b for b in bones if 'Hand' not in b or b in ('LeftHand', 'RightHand')))


if __name__ == '__main__':
    main()
