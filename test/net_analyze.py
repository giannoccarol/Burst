#!/usr/bin/env python3
"""Summarise a multiplayer run saved by `run.py --json` with test/scripts/net_probe.js installed
and test/scripts/net_report.js as --eval (and optionally net_track.js data).

usage: python3 test/net_analyze.py /tmp/x.json
prints: presence size per page, rejected/invalid presences, event loss per sender->receiver
(by event type), duplicates, host changes, net-code cost, interpolation metrics, page errors.
"""
import json, sys

EV = {1: 'SHOT', 2: 'HIT', 3: 'DIE', 4: 'ROCKET', 5: 'BOOM', 6: 'CHAT', 7: 'MELEE', 8: 'SPAWN', 9: 'RELOAD'}
data = json.load(open(sys.argv[1]))
pages = [e for e in data['evals'] if isinstance(e, dict) and e.get('peer')]
by_peer = {p['peer']: i for i, p in enumerate(pages)}
print('pages:', len(pages))
for i, p in enumerate(pages):
    m = p.get('mock') or {}
    print(f"p{i} {p['peer'][:6]} host={'Y' if p.get('amHost') else 'n'} state={p.get('state')} map={p.get('map')} g={p.get('g')} me={p.get('me')}")
    print(f"    presence: calls={m.get('calls')} max={m.get('maxBytes')}B avg={p.get('avgBytes')}B rejects={m.get('rejects')} keyBad={m.get('keyBad')} depthBad={m.get('depthBad')} exotic={m.get('exotic')} maxPerSec={m.get('maxPerSec')} hist(KiB)={m.get('hist')} dropped(sim)={m.get('dropped')}")
    print(f"    cost: {p.get('cost')}  dupes={p.get('dupes')} hostChanges={p.get('hostChanges')} hosts={[(t, (h or '')[:6]) for t, h in (p.get('hosts') or [])][:8]}")
    print(f"    bots={len(p.get('bots') or [])} ents={len(p.get('ents') or [])} errs={p.get('errs')}")
    if p.get('track'):
        print(f"    interp: {p['track']}")
tot = {}
for s in pages:
    sent = {int(k): v for k, v in (s.get('sentEv') or {}).items()}
    if not sent:
        continue
    for r in pages:
        if r is s:
            continue
        got = {int(k) for k in ((r.get('recvEv') or {}).get(s['peer']) or {}).keys()}
        if not got:
            print(f"  {s['peer'][:6]} -> {r['peer'][:6]}: nothing received")
            continue
        lo, hi = min(got), max(got)
        lost = {}
        n = 0
        for seq, typ in sent.items():
            if lo <= seq <= hi:
                n += 1
                if seq not in got:
                    lost[EV.get(typ, typ)] = lost.get(EV.get(typ, typ), 0) + 1
        nl = sum(lost.values())
        for k, v in lost.items():
            tot[k] = tot.get(k, 0) + v
        tot['_n'] = tot.get('_n', 0) + n
        print(f"  events {s['peer'][:6]} -> {r['peer'][:6]}: {n} sent in window, lost {nl} {lost}")
crit = sum(v for k, v in tot.items() if k in ('HIT', 'DIE', 'BOOM', 'SPAWN', 'CHAT'))
print(f"TOTAL events in window={tot.get('_n', 0)} lost={sum(v for k, v in tot.items() if k != '_n')} critical lost={crit} {dict((k, v) for k, v in tot.items() if k != '_n')}")
